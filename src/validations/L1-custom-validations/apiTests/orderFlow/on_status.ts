/* eslint-disable no-prototype-builtins */
import _ from "lodash";
import { RedisService } from "ondc-automation-cache-lib";
import {
  checkContext,
  isObjectEmpty,
  areTimestampsLessThanOrEqualTo,
  compareTimeRanges,
  compareFulfillmentObject,
  payment_status,
  addMsgIdToRedisSet,
} from "../../../../utils/helper";
import constants, {
  ApiSequence,
  PAYMENT_STATUS,
  ROUTING_ENUMS,
} from "../../../../utils/constants";
import { FLOW } from "../../../../utils/enums";

// Minimal interface for validation error
interface ValidationError {
  valid: boolean;
  code: number;
  description: string;
}

// Error codes based on provided table
const ERROR_CODES = {
  INVALID_RESPONSE: 20006, // Invalid response - The response received from the SNP does not meet the API contract specifications
  INVALID_ORDER_STATE: 20007, // Invalid order state - The order or fulfillment state is stale or invalid
  OUT_OF_SEQUENCE: 20008, // Response out of sequence - The callback was received prior to the acknowledgment (ACK) for the request or out of sequence
  TIMEOUT: 20009, // Timeout - The callback was received late and the session has timed out
  INTERNAL_ERROR: 23001, // Internal Error - The response could not be processed due to an internal error. The SNP should retry the request
  ORDER_VALIDATION_FAILURE: 23002, // Order validation failed
};

// Utility function to create error objects
const createError = (description: string, code: number): ValidationError => ({
  valid: false,
  code,
  description,
});

// Validation functions
async function validateContext(
  context: any,
  transaction_id: string,
  result: ValidationError[]
): Promise<void> {
  const contextRes = checkContext(context, constants.ON_STATUS);
  if (!contextRes?.valid) {
    contextRes?.ERRORS.forEach((error: string) =>
      result.push(createError(error, ERROR_CODES.INVALID_RESPONSE))
    );
  }

  const domainRaw = await RedisService.getKey(`${transaction_id}_domain`);
  const domain = domainRaw ? JSON.parse(domainRaw) : null;
  if (!_.isEqual(context.domain?.split(":")[1], domain)) {
    result.push(
      createError(
        `Domain should be same in each action`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  const searchContextRaw = await RedisService.getKey(
    `${transaction_id}_${ApiSequence.SEARCH}_context`
  );
  const searchContext = searchContextRaw ? JSON.parse(searchContextRaw) : null;
  if (searchContext && !_.isEqual(searchContext.city, context.city)) {
    result.push(
      createError(
        `City code mismatch in /${constants.SEARCH} and /${constants.ON_STATUS}`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }
}

async function validateMessageId(
  context: any,
  transaction_id: string,
  state: string,

  result: ValidationError[]
): Promise<void> {
  try {
    const isMsgIdNotPresent = await addMsgIdToRedisSet(
      context.transaction_id,
      context.message_id,
      `on_status_${state}`
    );
    if (isMsgIdNotPresent) {
      result.push({
        valid: false,
        code: 20000,
        description: `Message id should not be same with previous calls`,
      });
    }

    // Check message ID uniqueness across phases
    const prevMsgIdKeys = {
      [ApiSequence.ON_STATUS_PENDING]: `${transaction_id}_pending_message_id`,
      [ApiSequence.ON_STATUS_PACKED]: `${transaction_id}_pending_message_id`,
      [ApiSequence.ON_STATUS_PICKED]: `${transaction_id}_packed_message_id`,
      [ApiSequence.ON_STATUS_OUT_FOR_DELIVERY]: `${transaction_id}_picked_message_id`,
      [ApiSequence.ON_STATUS_DELIVERED]: `${transaction_id}_out_for_delivery_message_id`,
    };

    if (state !== ApiSequence.ON_STATUS_PENDING) {
      const prevMsgIdKey = prevMsgIdKeys[state];
      if (prevMsgIdKey) {
        const prevMsgIdRaw = await RedisService.getKey(prevMsgIdKey);
        const prevMsgId = prevMsgIdRaw ? JSON.parse(prevMsgIdRaw) : null;
        if (prevMsgId && prevMsgId === context.message_id) {
          result.push(
            createError(
              `Message_id cannot be same for ${
                prevMsgIdKey.split("_")[1]
              } and ${state}`,
              ERROR_CODES.OUT_OF_SEQUENCE
            )
          );
        }
      }
    }

    // Store current message ID
    const stateMsgIdKey = {
      [ApiSequence.ON_STATUS_PENDING]: `${transaction_id}_pending_message_id`,
      [ApiSequence.ON_STATUS_PACKED]: `${transaction_id}_packed_message_id`,
      [ApiSequence.ON_STATUS_PICKED]: `${transaction_id}_picked_message_id`,
      [ApiSequence.ON_STATUS_OUT_FOR_DELIVERY]: `${transaction_id}_out_for_delivery_message_id`,
      [ApiSequence.ON_STATUS_DELIVERED]: `${transaction_id}_delivered_message_id`,
    }[state];

    if (stateMsgIdKey) {
      await RedisService.setKey(
        stateMsgIdKey,
        JSON.stringify(context.message_id),
        300
      );
    }
  } catch (error: any) {
    console.error(
      `!!Error while checking message id for /${constants.ON_STATUS}_${state}, ${error.stack}`
    );
    result.push(
      createError(
        `Internal error while checking message ID`,
        ERROR_CODES.INTERNAL_ERROR
      )
    );
  }
}

async function validateTimestamp(
  context: any,
  transaction_id: string,
  state: string,
  result: ValidationError[]
): Promise<void> {
  try {
    const prevStateKey = {
      [ApiSequence.ON_STATUS_PENDING]: `${transaction_id}_onCnfrmtmpstmp`,
      [ApiSequence.ON_STATUS_PACKED]: `${transaction_id}_tmpstmp`,
      [ApiSequence.ON_STATUS_PICKED]: `${transaction_id}_tmpstmp`,
      [ApiSequence.ON_STATUS_OUT_FOR_DELIVERY]: `${transaction_id}_tmpstmp`,
      [ApiSequence.ON_STATUS_DELIVERED]: `${transaction_id}_tmpstmp`,
    }[state];

    if (prevStateKey) {
      const prevTimestampRaw = await RedisService.getKey(prevStateKey);
      const prevTimestamp = prevTimestampRaw
        ? JSON.parse(prevTimestampRaw)
        : null;
      if (prevTimestamp && _.gte(prevTimestamp, context.timestamp)) {
        result.push(
          createError(
            `Timestamp for previous action cannot be greater than or equal to /${constants.ON_STATUS}_${state} api`,
            ERROR_CODES.OUT_OF_SEQUENCE
          )
        );
      }
    }

    await RedisService.setKey(
      `${transaction_id}_tmpstmp`,
      JSON.stringify(context.timestamp),
      300
    );
  } catch (error: any) {
    console.error(
      `!!Error while checking timestamp for /${constants.ON_STATUS}_${state}, ${error.stack}`
    );
    result.push(
      createError(
        `Internal error while checking timestamp`,
        ERROR_CODES.INTERNAL_ERROR
      )
    );
  }
}

async function validateTransactionId(
  context: any,
  transaction_id: string,
  result: ValidationError[]
): Promise<void> {
  try {
    const txnIdRaw = await RedisService.getKey(`${transaction_id}_txnId`);
    const txnId = txnIdRaw ? JSON.parse(txnIdRaw) : null;
    if (!_.isEqual(txnId, context.transaction_id)) {
      result.push(
        createError(
          `Transaction Id should be same from /${constants.SELECT} onwards`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }
  } catch (error: any) {
    console.error(
      `!!Error while checking transaction id for /${constants.ON_STATUS}, ${error.stack}`
    );
    result.push(
      createError(
        `Internal error while checking transaction ID`,
        ERROR_CODES.INTERNAL_ERROR
      )
    );
  }
}

async function validateOrder(
  order: any,
  transaction_id: string,
  context: any,
  result: ValidationError[]
): Promise<void> {
  try {
    const cnfrmOrdrIdRaw = await RedisService.getKey(
      `${transaction_id}_cnfrmOrdrId`
    );
    const cnfrmOrdrId = cnfrmOrdrIdRaw ? JSON.parse(cnfrmOrdrIdRaw) : null;
    if (cnfrmOrdrId && cnfrmOrdrId !== order.id) {
      result.push(
        createError(
          `Order id in /${constants.CONFIRM} and /${constants.ON_STATUS} do not match`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

    const cnfrmTmpstmpRaw = await RedisService.getKey(
      `${transaction_id}_cnfrmTmpstmp`
    );
    const cnfrmTmpstmp = cnfrmTmpstmpRaw ? JSON.parse(cnfrmTmpstmpRaw) : null;
    if (cnfrmTmpstmp && !_.isEqual(cnfrmTmpstmp, order.created_at)) {
      result.push(
        createError(
          `Created At timestamp for /${constants.ON_STATUS} should be equal to context timestamp at ${constants.CONFIRM}`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

    if (!areTimestampsLessThanOrEqualTo(order.updated_at, context.timestamp)) {
      result.push(
        createError(
          `order.updated_at timestamp should be less than or equal to context timestamp for /${constants.ON_STATUS}`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

    if (!_.isEqual(context.timestamp, order.updated_at)) {
      result.push(
        createError(
          `updated_at timestamp should be equal to context timestamp for /${constants.ON_STATUS}`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

    if (order.updated_at) {
      await RedisService.setKey(
        `${transaction_id}_PreviousUpdatedTimestamp`,
        JSON.stringify(order.updated_at),
        300
      );
    }
  } catch (error: any) {
    console.error(
      `!!Error while checking order for /${constants.ON_STATUS}, ${error.stack}`
    );
    result.push(
      createError(
        `Internal error while checking order`,
        ERROR_CODES.INTERNAL_ERROR
      )
    );
  }
}

async function validateOrderState(
  order: any,
  transaction_id: string,
  state: string,
  fulfillmentsItemsSet: Set<any>,
  result: ValidationError[],
  context: any
): Promise<void> {
  try {
    const onCnfrmStateRaw = await RedisService.getKey(
      `${transaction_id}_onCnfrmState`
    );
    const onCnfrmState = onCnfrmStateRaw;

    switch (state) {
      case ApiSequence.ON_STATUS_PENDING: {
        if (onCnfrmState === "Accepted") {
          result.push(
            createError(
              `When the onConfirm Order State is 'Accepted', the on_status_pending is not required!`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
          return;
        }

        if (order.state !== "Accepted") {
          result.push(
            createError(
              `Order state should be 'Accepted' for /${constants.ON_STATUS}_${state}. Current state: ${order.state}`,
              ERROR_CODES.INVALID_ORDER_STATE
            )
          );
        }

        await RedisService.setKey(
          `${transaction_id}_orderState`,
          order.state,
          300
        );
        break;
      }

      case ApiSequence.ON_STATUS_PACKED: {
        if (order.state !== "In-progress") {
          result.push(
            createError(
              `order/state should be "In-progress" for /${constants.ON_STATUS}_${state}`,
              ERROR_CODES.INVALID_ORDER_STATE
            )
          );
        }
        break;
      }

      case ApiSequence.ON_STATUS_PICKED: {
        if (order.state !== "In-progress") {
          result.push(
            createError(
              `order/state should be "In-progress" for /${constants.ON_STATUS}_${state}`,
              ERROR_CODES.INVALID_ORDER_STATE
            )
          );
        }

        let orderPicked = false;
        const pickupTimestamps: any = {};
        order.fulfillments.forEach((fulfillment: any) => {
          if (fulfillment.type !== "Delivery") return;
          const ffState = fulfillment.state?.descriptor?.code;
          if (ffState === constants.ORDER_PICKED) {
            orderPicked = true;
            const pickUpTime = fulfillment.start?.time?.timestamp;
            pickupTimestamps[fulfillment.id] = pickUpTime;
            if (!pickUpTime) {
              result.push(
                createError(
                  `picked timestamp is missing`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            } else {
              if (!_.lte(pickUpTime, context.timestamp)) {
                result.push(
                  createError(
                    `pickup timestamp should match context/timestamp and can't be future dated`,
                    ERROR_CODES.INVALID_RESPONSE
                  )
                );
              }
              if (!_.gte(order.updated_at, pickUpTime)) {
                result.push(
                  createError(
                    `order/updated_at timestamp can't be less than the pickup time`,
                    ERROR_CODES.INVALID_RESPONSE
                  )
                );
              }
            }
          }
        });

        if (!orderPicked) {
          result.push(
            createError(
              `fulfillments/state should be ${constants.ORDER_PICKED} for /${constants.ON_STATUS}_${constants.ORDER_PICKED}`,
              ERROR_CODES.INVALID_ORDER_STATE
            )
          );
        }

        await RedisService.setKey(
          `${transaction_id}_pickupTimestamps`,
          pickupTimestamps,
          300
        );

        order.fulfillments.forEach((ff: any) => {
          if (ff.type === "Delivery") {
            RedisService.setKey(
              `${transaction_id}_deliveryTmpStmp`,
              ff?.start?.time?.timestamp,
              300
            );
          }
        });

        // Routing tags validation
        const DELobj = _.filter(order.fulfillments, { type: "Delivery" });
        if (!DELobj.length) {
          result.push(
            createError(
              `Delivery object is mandatory for ${ApiSequence.ON_STATUS_PICKED}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else {
          const deliveryObj = DELobj[0];
          if (!deliveryObj.tags) {
            result.push(
              createError(
                `Tags are mandatory in Delivery Fulfillment for ${ApiSequence.ON_STATUS_PICKED}`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else {
            const tags = deliveryObj.tags;
            const routingTagArr = _.filter(tags, { code: "routing" });
            if (!routingTagArr.length) {
              result.push(
                createError(
                  `RoutingTag object is mandatory in Tags of Delivery Object for ${ApiSequence.ON_STATUS_PICKED}`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            } else {
              const routingTag = routingTagArr[0];
              const routingTagList = routingTag.list;
              if (!routingTagList) {
                result.push(
                  createError(
                    `RoutingTagList is mandatory in RoutingTag of Delivery Object for ${ApiSequence.ON_STATUS_PICKED}`,
                    ERROR_CODES.INVALID_RESPONSE
                  )
                );
              } else {
                const routingTagTypeArr = _.filter(routingTagList, {
                  code: "type",
                });
                if (!routingTagTypeArr.length) {
                  result.push(
                    createError(
                      `RoutingTagListType object is mandatory in RoutingTag/List of Delivery Object for ${ApiSequence.ON_STATUS_PICKED}`,
                      ERROR_CODES.INVALID_RESPONSE
                    )
                  );
                } else {
                  const routingTagType = routingTagTypeArr[0];
                  if (!ROUTING_ENUMS.includes(routingTagType.value)) {
                    result.push(
                      createError(
                        `RoutingTagListType Value is mandatory in RoutingTag of Delivery Object for ${ApiSequence.ON_STATUS_PICKED} and should be equal to 'P2P' or 'P2H2P'`,
                        ERROR_CODES.INVALID_RESPONSE
                      )
                    );
                  }
                }
              }
            }
          }
        }
        break;
      }

      case ApiSequence.ON_STATUS_OUT_FOR_DELIVERY: {
        if (order.state !== "In-progress") {
          result.push(
            createError(
              `order/state should be "In-progress" for /${constants.ON_STATUS}_${state}`,
              ERROR_CODES.INVALID_ORDER_STATE
            )
          );
        }

        let orderOutForDelivery = false;
        const outforDeliveryTimestamps: any = {};
        order.fulfillments.forEach((fulfillment: any) => {
          if (fulfillment.type !== "Delivery") return;
          const ffState = fulfillment.state?.descriptor?.code;
          if (ffState === constants.ORDER_OUT_FOR_DELIVERY) {
            orderOutForDelivery = true;
            const outForDeliveryTime = fulfillment.start?.time?.timestamp;
            outforDeliveryTimestamps[fulfillment.id] = outForDeliveryTime;
            if (!outForDeliveryTime) {
              result.push(
                createError(
                  `Out_for_delivery timestamp is missing`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            } else {
              if (!_.lte(outForDeliveryTime, context.timestamp)) {
                result.push(
                  createError(
                    `Fulfillments start timestamp should match context/timestamp and can't be future dated`,
                    ERROR_CODES.INVALID_RESPONSE
                  )
                );
              }
              if (!_.gte(order.updated_at, outForDeliveryTime)) {
                result.push(
                  createError(
                    `order/updated_at timestamp can't be less than the Out_for_delivery time`,
                    ERROR_CODES.INVALID_RESPONSE
                  )
                );
              }
            }
          }
        });

        if (!orderOutForDelivery) {
          result.push(
            createError(
              `fulfillments/state should be ${constants.ORDER_OUT_FOR_DELIVERY} for /${constants.ON_STATUS}_${constants.ORDER_OUT_FOR_DELIVERY}`,
              ERROR_CODES.INVALID_ORDER_STATE
            )
          );
        }

        await RedisService.setKey(
          `${transaction_id}_outforDeliveryTimestamps`,
          outforDeliveryTimestamps,
          300
        );

        const DELobj = _.filter(order.fulfillments, { type: "Delivery" });
        if (!DELobj.length) {
          result.push(
            createError(
              `Delivery object is mandatory for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else {
          const deliveryObj = DELobj[0];
          await RedisService.setKey(
            `${transaction_id}_ffIdPrecancel`,
            deliveryObj?.state?.descriptor?.code,
            300
          );
          if (!deliveryObj.tags) {
            result.push(
              createError(
                `Tags are mandatory in Delivery Fulfillment for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else {
            const tags = deliveryObj.tags;
            const routingTagArr = _.filter(tags, { code: "routing" });
            if (!routingTagArr.length) {
              result.push(
                createError(
                  `RoutingTag object is mandatory in Tags of Delivery Object for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            } else {
              const routingTag = routingTagArr[0];
              const routingTagList = routingTag.list;
              if (!routingTagList) {
                result.push(
                  createError(
                    `RoutingTagList is mandatory in RoutingTag of Delivery Object for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`,
                    ERROR_CODES.INVALID_RESPONSE
                  )
                );
              } else {
                const routingTagTypeArr = _.filter(routingTagList, {
                  code: "type",
                });
                if (!routingTagTypeArr.length) {
                  result.push(
                    createError(
                      `RoutingTagListType object is mandatory in RoutingTag/List of Delivery Object for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`,
                      ERROR_CODES.INVALID_RESPONSE
                    )
                  );
                } else {
                  const routingTagType = routingTagTypeArr[0];
                  if (!ROUTING_ENUMS.includes(routingTagType.value)) {
                    result.push(
                      createError(
                        `RoutingTagListType Value is mandatory in RoutingTag of Delivery Object for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY} and should be equal to 'P2P' or 'P2H2P'`,
                        ERROR_CODES.INVALID_RESPONSE
                      )
                    );
                  }
                }
              }
            }
          }
        }
        break;
      }

      case ApiSequence.ON_STATUS_DELIVERED: {
        if (order.state !== "Completed") {
          result.push(
            createError(
              `order/state should be "Completed" for /${constants.ON_STATUS}_${state}`,
              ERROR_CODES.INVALID_ORDER_STATE
            )
          );
        }

        let orderDelivered = false;
        const deliveryTimestamps: any = {};
        order.fulfillments.forEach((fulfillment: any) => {
          if (fulfillment.type !== "Delivery") return;
          const ffState = fulfillment.state?.descriptor?.code;
          if (ffState === constants.ORDER_DELIVERED) {
            orderDelivered = true;
            const pickUpTime = fulfillment.start?.time?.timestamp;
            const deliveryTime = fulfillment.end?.time?.timestamp;
            deliveryTimestamps[fulfillment.id] = deliveryTime;
            if (!deliveryTime) {
              result.push(
                createError(
                  `delivery timestamp is missing`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            } else {
              if (!_.lte(deliveryTime, context.timestamp)) {
                result.push(
                  createError(
                    `delivery timestamp should be less than or equal to context/timestamp and can't be future dated`,
                    ERROR_CODES.INVALID_RESPONSE
                  )
                );
              }
              if (_.gte(pickUpTime, deliveryTime)) {
                result.push(
                  createError(
                    `delivery timestamp (/end/time/timestamp) can't be less than or equal to the pickup timestamp (start/time/timestamp)`,
                    ERROR_CODES.INVALID_RESPONSE
                  )
                );
              }
              if (!_.gte(order.updated_at, deliveryTime)) {
                result.push(
                  createError(
                    `order/updated_at timestamp can't be less than the delivery time`,
                    ERROR_CODES.INVALID_RESPONSE
                  )
                );
              }
            }
          }
        });

        if (!orderDelivered) {
          result.push(
            createError(
              `fulfillments/state should be ${constants.ORDER_DELIVERED} for /${constants.ON_STATUS}_${constants.ORDER_DELIVERED}`,
              ERROR_CODES.INVALID_ORDER_STATE
            )
          );
        }

        await RedisService.setKey(
          `${transaction_id}_deliveryTimestamps`,
          deliveryTimestamps,
          300
        );

        const DELobj = _.filter(order.fulfillments, { type: "Delivery" });
        if (!DELobj.length) {
          result.push(
            createError(
              `Delivery object is mandatory for ${ApiSequence.ON_STATUS_DELIVERED}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else {
          const deliveryObj = DELobj[0];
          if (!deliveryObj.tags) {
            result.push(
              createError(
                `Tags are mandatory in Delivery Fulfillment for ${ApiSequence.ON_STATUS_DELIVERED}`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else {
            const tags = deliveryObj.tags;
            const routingTagArr = _.filter(tags, { code: "routing" });
            if (!routingTagArr.length) {
              result.push(
                createError(
                  `RoutingTag object is mandatory in Tags of Delivery Object for ${ApiSequence.ON_STATUS_DELIVERED}`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            } else {
              const routingTag = routingTagArr[0];
              const routingTagList = routingTag.list;
              if (!routingTagList) {
                result.push(
                  createError(
                    `RoutingTagList is mandatory in RoutingTag of Delivery Object for ${ApiSequence.ON_STATUS_DELIVERED}`,
                    ERROR_CODES.INVALID_RESPONSE
                  )
                );
              } else {
                const routingTagTypeArr = _.filter(routingTagList, {
                  code: "type",
                });
                if (!routingTagTypeArr.length) {
                  result.push(
                    createError(
                      `RoutingTagListType object is mandatory in RoutingTag/List of Delivery Object for ${ApiSequence.ON_STATUS_DELIVERED}`,
                      ERROR_CODES.INVALID_RESPONSE
                    )
                  );
                } else {
                  const routingTagType = routingTagTypeArr[0];
                  if (!ROUTING_ENUMS.includes(routingTagType.value)) {
                    result.push(
                      createError(
                        `RoutingTagListType Value is mandatory in RoutingTag of Delivery Object for ${ApiSequence.ON_STATUS_DELIVERED} and should be equal to 'P2P' or 'P2H2P'`,
                        ERROR_CODES.INVALID_RESPONSE
                      )
                    );
                  }
                }
              }
            }
          }
        }
        break;
      }

      default:
        result.push(
          createError(`Invalid state: ${state}`, ERROR_CODES.INVALID_RESPONSE)
        );
    }
  } catch (error: any) {
    console.error(
      `!!Error while checking order state for /${constants.ON_STATUS}_${state}, ${error.stack}`
    );
    result.push(
      createError(
        `Internal error while checking order state`,
        ERROR_CODES.INTERNAL_ERROR
      )
    );
  }
}

async function validateFulfillments(
  order: any,
  transaction_id: string,
  state: string,
  fulfillmentsItemsSet: Set<any>,
  result: ValidationError[]
): Promise<void> {
  try {
    order.fulfillments.forEach((ff: any) => {
      if (!ff.id) {
        result.push(
          createError(
            `Fulfillment Id must be present`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }
      if (ff.type !== "Cancel") {
        const ffTrackingRaw = RedisService.getKey(
          `${transaction_id}_${ff.id}_tracking`
        );
        const ffTracking = ffTrackingRaw;
        if (ffTracking) {
          if (typeof ff.tracking !== "boolean") {
            result.push(
              createError(
                `Tracking must be present for fulfillment ID: ${ff.id} in boolean form`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else if (ffTracking !== ff.tracking) {
            result.push(
              createError(
                `Fulfillment Tracking mismatch with the ${constants.ON_SELECT} call`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          }
        }
      }
    });

    const deliveryFulfillment = _.filter(order.fulfillments, {
      type: "Delivery",
    });
    if (deliveryFulfillment.length) {
      const storedFulfillmentRaw = await RedisService.getKey(
        `${transaction_id}_deliveryFulfillment`
      );
      const storedFulfillment = storedFulfillmentRaw;
      if (!storedFulfillment) {
        await Promise.all([
          RedisService.setKey(
            `${transaction_id}_deliveryFulfillment`,
            JSON.stringify(deliveryFulfillment[0]),
            300
          ),
          RedisService.setKey(
            `${transaction_id}_deliveryFulfillmentAction`,
            state,
            300
          ),
        ]);
      } else {
        const storedFulfillmentActionRaw = await RedisService.getKey(
          `${transaction_id}_deliveryFulfillmentAction`
        );
        const storedFulfillmentAction = storedFulfillmentActionRaw;
        const fulfillmentRangeErrors = compareTimeRanges(
          storedFulfillment,
          storedFulfillmentAction,
          deliveryFulfillment[0],
          state
        );
        if (fulfillmentRangeErrors) {
          fulfillmentRangeErrors.forEach((error: string, i: number) => {
            result.push(
              createError(
                `Fulfillment range error ${i}: ${error}`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          });
        }
      }
    }

    const flowRaw = await RedisService.getKey(`${transaction_id}_flow`);
    const flow: any = flowRaw;
    if (["2", "3", "5", "6"].includes(flow)) {
      const fulfillments = order.fulfillments;
      if (!fulfillments.length) {
        result.push(
          createError(
            `missingFulfillments is mandatory for ${state}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      } else {
        if (state === ApiSequence.ON_STATUS_DELIVERED) {
          const fulfillmentsItemsStatusSet = new Set();
          fulfillments.forEach((ff: any, i: number) => {
            const deliveryTmpStmpRaw = RedisService.getKey(
              `${transaction_id}_deliveryTmpStmp`
            );
            const deliveryTmpStmp = deliveryTmpStmpRaw;
            if (
              ff.type === "Delivery" &&
              !_.isEqual(ff?.start?.time?.timestamp, deliveryTmpStmp)
            ) {
              result.push(
                createError(
                  `Mismatch in ${ff.type} fulfillment start timestamp with ${ApiSequence.ON_STATUS_PICKED} at index ${i}`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            }
            fulfillmentsItemsStatusSet.add(JSON.stringify(ff));
          });
          fulfillmentsItemsSet.clear();
          fulfillmentsItemsStatusSet.forEach((ff: any) => {
            const obj = JSON.parse(ff);
            delete obj?.state;
            delete obj?.start?.time;
            delete obj?.end?.time;
            fulfillmentsItemsSet.add(obj);
          });
        } else {
          if (!_.filter(fulfillments, { type: "Delivery" }).length) {
            result.push(
              createError(
                `Delivery fulfillment must be present in ${state}`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          }
          const deliveryTmpStmpRaw = await RedisService.getKey(
            `${transaction_id}_deliveryTmpStmp`
          );
          const deliveryTmpStmp = deliveryTmpStmpRaw;
          fulfillments.forEach((ff: any, i: number) => {
            if (
              ff.type === "Delivery" &&
              !_.isEqual(ff?.start?.time?.timestamp, deliveryTmpStmp)
            ) {
              result.push(
                createError(
                  `Mismatch in ${ff.type} fulfillment start timestamp with ${ApiSequence.ON_STATUS_PICKED} at index ${i}`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            }
          });
          let i = 0;
          const onCnfrmStateRaw = await RedisService.getKey(
            `${transaction_id}_onCnfrmState`
          );
          const onCnfrmState = onCnfrmStateRaw;
          fulfillmentsItemsSet.forEach((obj1: any) => {
            const keys = Object.keys(obj1);
            let obj2: any = _.filter(fulfillments, { type: obj1.type });
            let apiSeq =
              obj1.type === "Cancel"
                ? ApiSequence.ON_UPDATE_PART_CANCEL
                : onCnfrmState === "Accepted"
                ? ApiSequence.ON_CONFIRM
                : ApiSequence.ON_STATUS_PENDING;
            if (obj2.length > 0) {
              obj2 = obj2[0];
              if (obj2.type === "Delivery") {
                delete obj2?.start?.instructions;
                delete obj2?.end?.instructions;
                delete obj2?.tags;
                delete obj2?.state;
                if (state !== ApiSequence.ON_STATUS_PENDING) {
                  delete obj2?.agent;
                  delete obj2?.start?.time?.timestamp;
                }
                if (state === ApiSequence.ON_STATUS_DELIVERED) {
                  delete obj2?.end?.time?.timestamp;
                }
              }
              const errors = compareFulfillmentObject(
                obj1,
                obj2,
                keys,
                i,
                apiSeq
              );
              if (errors.length > 0) {
                errors.forEach((item: any) => {
                  result.push(
                    createError(item.errMsg, ERROR_CODES.INVALID_RESPONSE)
                  );
                });
              }
            } else {
              result.push(
                createError(
                  `Missing fulfillment type '${obj1.type}' in ${state} as compared to ${apiSeq}`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            }
            i++;
          });
          if (state === ApiSequence.ON_STATUS_PENDING) {
            const deliveryObj = _.filter(fulfillments, { type: "Delivery" })[0];
            if (deliveryObj) {
              delete deliveryObj?.state;
              delete deliveryObj?.tags;
              delete deliveryObj?.start?.instructions;
              delete deliveryObj?.end?.instructions;
              fulfillmentsItemsSet.add(deliveryObj);
            }
          }
        }
      }
    }
  } catch (error: any) {
    console.error(
      `!!Error while checking fulfillments for /${constants.ON_STATUS}_${state}, ${error.stack}`
    );
    result.push(
      createError(
        `Internal error while checking fulfillments`,
        ERROR_CODES.INTERNAL_ERROR
      )
    );
  }
}

async function validatePayment(
  order: any,
  transaction_id: string,
  state: string,
  result: ValidationError[]
): Promise<void> {
  try {
    const flowRaw = await RedisService.getKey(`${transaction_id}_flow`);
    const flow: any = flowRaw;
    if (flow === FLOW.FLOW2A) {
      const payment = order.payment;
      if (state === ApiSequence.ON_STATUS_DELIVERED) {
        if (payment.status !== PAYMENT_STATUS.PAID) {
          result.push(
            createError(
              `Payment status should be ${PAYMENT_STATUS.PAID} for ${FLOW.FLOW2A} flow since Item has been delivered in this state (Cash on Delivery)`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      } else {
        if (payment.status !== PAYMENT_STATUS.NOT_PAID) {
          result.push(
            createError(
              `Payment status should be ${PAYMENT_STATUS.NOT_PAID} for ${FLOW.FLOW2A} flow (Cash on Delivery)`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      }
    }

    if (flow !== FLOW.FLOW2A) {
      const status = payment_status(order.payment, flow);
      if (!status) {
        result.push(
          createError(
            `Transaction_id missing in message/order/payment`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }
    }
  } catch (error: any) {
    console.error(
      `!!Error while checking payment for /${constants.ON_STATUS}_${state}, ${error.stack}`
    );
    result.push(
      createError(
        `Internal error while checking payment`,
        ERROR_CODES.INTERNAL_ERROR
      )
    );
  }
}

const onStatus = async (
  data: any,
  fulfillmentsItemsSet: Set<any>
): Promise<ValidationError[]> => {
  const result: ValidationError[] = [];
  try {
    if (!data || isObjectEmpty(data)) {
      result.push(
        createError(`JSON cannot be empty`, ERROR_CODES.INVALID_RESPONSE)
      );
      return result;
    }

    const { context, message } = data;
    if (
      !message ||
      !context ||
      !message.order ||
      isObjectEmpty(message) ||
      isObjectEmpty(message.order)
    ) {
      const onCnfrmStateRaw = await RedisService.getKey(
        `${context.transaction_id}_onCnfrmState`
      );
      const onCnfrmState = onCnfrmStateRaw;
      if (
        message?.order?.state === ApiSequence.ON_STATUS_PENDING &&
        onCnfrmState === "Accepted"
      ) {
        result.push(
          createError(
            `When the onConfirm Order State is 'Accepted', the on_status_pending is not required!`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
        return result;
      }
      result.push(
        createError(
          `/context, /message, /order or /message/order is missing or empty`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
      return result;
    }

    const { transaction_id } = context;
    const order = message.order;
    const state = order.state;

    await Promise.all([
      validateContext(context, transaction_id, result),
      validateMessageId(context, transaction_id, state, result),
      validateTimestamp(context, transaction_id, state, result),
      validateTransactionId(context, transaction_id, result),
      validateOrderState(
        order,
        transaction_id,
        state,
        fulfillmentsItemsSet,
        result,
        context
      ),
      validateOrderState(
        order,
        transaction_id,
        state,
        fulfillmentsItemsSet,
        result,
        context
      ),
      validateFulfillments(
        order,
        transaction_id,
        state,
        fulfillmentsItemsSet,
        result
      ),
      validatePayment(order, transaction_id, state, result),
      RedisService.setKey(`${transaction_id}_on_status_${state}`, data, 300),
    ]);

    if (result.length > 0) {
      result.push(
        createError(
          `Order status validation failed due to multiple errors`,
          ERROR_CODES.ORDER_VALIDATION_FAILURE
        )
      );
    }

    return result;
  } catch (err: any) {
    console.error(
      `!!Some error occurred while checking /${constants.ON_STATUS} API`,
      err
    );
    result.push(
      createError(
        `Internal error processing /${constants.ON_STATUS} request`,
        ERROR_CODES.INTERNAL_ERROR
      )
    );
    return result;
  }
};

export default onStatus;
