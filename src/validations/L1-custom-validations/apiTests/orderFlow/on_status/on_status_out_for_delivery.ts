/* eslint-disable no-prototype-builtins */
import _ from "lodash";
import { RedisService } from "ondc-automation-cache-lib";
import constants, {
  ApiSequence,
  ROUTING_ENUMS,
  PAYMENT_STATUS,
} from "../../../../../utils/constants";
import {
  isObjectEmpty,
  checkContext,
  areTimestampsLessThanOrEqualTo,
  compareTimeRanges,
  compareFulfillmentObject,
  addActionToRedisSet,
  addMsgIdToRedisSet,
} from "../../../../../utils/helper";
import { FLOW } from "../../../../../utils/enums";

// Minimal interface for validation error
interface ValidationError {
  valid: boolean;
  code: number;
  description: string;
}

// Error codes based on provided table
const ERROR_CODES = {
  INVALID_RESPONSE: 20006, // Invalid response (API contract violations)
  INVALID_ORDER_STATE: 20007, // Invalid or stale order/fulfillment state
  OUT_OF_SEQUENCE: 20008, // Callback out of sequence
  TIMEOUT: 20009, // Callback received late
  INTERNAL_ERROR: 23001, // Internal processing error (retryable)
  ORDER_VALIDATION_FAILURE: 23002, // Order validation failed
};

const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;

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

  const domain = await RedisService.getKey(`${transaction_id}_domain`);
  if (!_.isEqual(context.domain?.split(":")[1], domain)) {
    result.push(
      createError(
        "Domain should be same in each action",
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
  result: ValidationError[]
): Promise<void> {
  try {
    try {
      console.info(`Adding Message Id /${constants.ON_STATUS}_out_for_delivery`);
      const isMsgIdNotPresent = await addMsgIdToRedisSet(
        context.transaction_id,
        context.message_id,
        ApiSequence.ON_STATUS_OUT_FOR_DELIVERY
      );
      if (!isMsgIdNotPresent) {
        result.push({
          valid: false,
          code: 20000,
          description: `Message id should not be same with previous calls`,
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while checking message id for /${constants.ON_STATUS_OUT_FOR_DELIVERY}, ${error.stack}`
      );
    }

    const pickedMessageIdRaw = await RedisService.getKey(
      `${transaction_id}_picked_message_id`
    );
    const pickedMessageId = pickedMessageIdRaw
      ? JSON.parse(pickedMessageIdRaw)
      : null;
    if (pickedMessageId === context.message_id) {
      result.push(
        createError(
          `Message_id cannot be the same for ${constants.ON_STATUS}.picked and ${constants.ON_STATUS}.outForDelivery`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

   

    await RedisService.setKey(
      `${transaction_id}_out_for_delivery_message_id`,
      JSON.stringify(context.message_id),
      TTL_IN_SECONDS
    );
  } catch (error: any) {
    console.error(
      `!!Error while checking message id for /${constants.ON_STATUS_OUT_FOR_DELIVERY}, ${error.stack}`
    );
    result.push(
      createError(
        "Internal error while checking message ID",
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
    const txnId = await RedisService.getKey(`${transaction_id}_txnId`);
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
      `!!Error while comparing transaction ids for /${constants.SELECT} and /${constants.ON_STATUS}, ${error.stack}`
    );
    result.push(
      createError(
        "Internal error while checking transaction ID",
        ERROR_CODES.INTERNAL_ERROR
      )
    );
  }
}

async function validateOrder(
  order: any,
  transaction_id: string,
  state: string,
  result: ValidationError[]
): Promise<void> {
  const cnfrmOrdrIdRaw = await RedisService.getKey(
    `${transaction_id}_cnfrmOrdrId`
  );
  const cnfrmOrdrId = cnfrmOrdrIdRaw ? JSON.parse(cnfrmOrdrIdRaw) : null;
  if (cnfrmOrdrId && order.id !== cnfrmOrdrId) {
    result.push(
      createError(
        `Order id in /${constants.CONFIRM} and /${constants.ON_STATUS}_${state} do not match`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  if (order.state !== "In-progress") {
    result.push(
      createError(
        `order/state should be "In-progress" for /${constants.ON_STATUS}_${state}`,
        ERROR_CODES.INVALID_ORDER_STATE
      )
    );
  }

  await RedisService.setKey(
    `${transaction_id}_PreviousUpdatedTimestamp`,
    JSON.stringify(order.updated_at),
    TTL_IN_SECONDS
  );
}

async function validateFulfillments(
  order: any,
  transaction_id: string,
  state: string,
  fulfillmentsItemsSet: Set<any>,
  result: ValidationError[]
): Promise<void> {
  const deliveryObjArr = order.fulfillments.filter(
    (f: any) => f.type === "Delivery"
  );
  if (!deliveryObjArr.length) {
    result.push(
      createError(
        `Delivery object is mandatory for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`,
        ERROR_CODES.ORDER_VALIDATION_FAILURE
      )
    );
  } else {
    const deliveryObj = deliveryObjArr[0];
    await RedisService.setKey(
      `${transaction_id}_ffIdPrecancel`,
      JSON.stringify(deliveryObj?.state?.descriptor?.code),
      TTL_IN_SECONDS
    );

    if (!deliveryObj.tags) {
      result.push(
        createError(
          `Tags are mandatory in Delivery Fulfillment for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    } else {
      const routingTagArr = deliveryObj.tags.filter(
        (tag: any) => tag.code === "routing"
      );
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
          const routingTagTypeArr = routingTagList.filter(
            (item: any) => item.code === "type"
          );
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

  for (const ff of order.fulfillments || []) {
    if (!ff.id) {
      result.push(
        createError(
          `Fulfillment Id must be present`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

    if (ff.type !== "Cancel") {
      const ffTrackingRaw = await RedisService.getKey(
        `${transaction_id}_${ff.id}_tracking`
      );
      const ffTracking = ffTrackingRaw ? JSON.parse(ffTrackingRaw) : null;
      if (ffTracking !== null) {
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
  }

  const storedFulfillmentRaw = await RedisService.getKey(
    `${transaction_id}_deliveryFulfillment`
  );
  const storedFulfillment = storedFulfillmentRaw
    ? JSON.parse(storedFulfillmentRaw)
    : null;
  const deliveryFulfillment = order.fulfillments.filter(
    (f: any) => f.type === "Delivery"
  );
  const storedFulfillmentActionRaw = await RedisService.getKey(
    `${transaction_id}_deliveryFulfillmentAction`
  );
  const storedFulfillmentAction = storedFulfillmentActionRaw
    ? JSON.parse(storedFulfillmentActionRaw)
    : null;

  const fulfillmentRangeErrors = compareTimeRanges(
    storedFulfillment,
    storedFulfillmentAction,
    deliveryFulfillment[0],
    ApiSequence.ON_STATUS_OUT_FOR_DELIVERY
  );
  if (fulfillmentRangeErrors) {
    fulfillmentRangeErrors.forEach((error: string, index: number) => {
      result.push(createError(`${error}`, ERROR_CODES.INVALID_RESPONSE));
    });
  }

  if (["6", "2", "3", "5"].includes(state)) {
    if (!order.fulfillments?.length) {
      result.push(
        createError(
          `missingFulfillments is mandatory for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`,
          ERROR_CODES.ORDER_VALIDATION_FAILURE
        )
      );
    } else {
      order.fulfillments.forEach((ff: any, i: number) => {
        const deliveryTmpStmpRaw: any = RedisService.getKey(
          `${transaction_id}_deliveryTmpStmp`
        );
        const deliveryTmpStmp = deliveryTmpStmpRaw
          ? JSON.parse(deliveryTmpStmpRaw)
          : null;
        if (
          ff.type === "Delivery" &&
          !_.isEqual(ff?.start?.time?.timestamp, deliveryTmpStmp)
        ) {
          result.push(
            createError(
              `Mismatch occur while comparing ${ff.type} fulfillment start timestamp with the ${ApiSequence.ON_STATUS_PICKED}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      });

      let i = 0;
      for (const obj1 of fulfillmentsItemsSet) {
        const keys = Object.keys(obj1);
        let obj2 = order.fulfillments.filter((f: any) => f.type === obj1.type);
        let apiSeq =
          obj1.type === "Cancel"
            ? ApiSequence.ON_UPDATE_PART_CANCEL
            : (await RedisService.getKey(`${transaction_id}_onCnfrmState`)) ===
              "Accepted"
            ? ApiSequence.ON_CONFIRM
            : ApiSequence.ON_STATUS_PENDING;

        if (obj2.length > 0) {
          obj2 = obj2[0];
          if (obj2.type === "Delivery") {
            delete obj2?.tags;
            delete obj2?.agent;
            delete obj2?.start?.instructions;
            delete obj2?.end?.instructions;
            delete obj2?.start?.time?.timestamp;
            delete obj2?.state;
          }
          apiSeq =
            obj2.type === "Cancel"
              ? ApiSequence.ON_UPDATE_PART_CANCEL
              : (await RedisService.getKey(
                  `${transaction_id}_onCnfrmState`
                )) === "Accepted"
              ? ApiSequence.ON_CONFIRM
              : ApiSequence.ON_STATUS_PENDING;
          const errors = compareFulfillmentObject(obj1, obj2, keys, i, apiSeq);
          errors.forEach((item: any) => {
            result.push(createError(item.errMsg, ERROR_CODES.INVALID_RESPONSE));
          });
        } else {
          result.push(
            createError(
              `Missing fulfillment type '${obj1.type}' in ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY} as compared to ${apiSeq}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
        i++;
      }
    }
  }
}

async function validateTimestamps(
  order: any,
  context: any,
  transaction_id: string,
  state: string,
  result: ValidationError[]
): Promise<void> {
  const cnfrmTmpstmpRaw = await RedisService.getKey(
    `${transaction_id}_cnfrmTmpstmp`
  );
  const cnfrmTmpstmp = cnfrmTmpstmpRaw ? JSON.parse(cnfrmTmpstmpRaw) : null;
  if (cnfrmTmpstmp && !_.isEqual(cnfrmTmpstmp, order.created_at)) {
    result.push(
      createError(
        `Created At timestamp for /${constants.ON_STATUS}_${state} should be equal to context timestamp at ${constants.CONFIRM}`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  const onCnfrmTmpstmpRaw = await RedisService.getKey(
    `${transaction_id}_onCnfrmtmpstmp`
  );
  const onCnfrmTmpstmp = onCnfrmTmpstmpRaw
    ? JSON.parse(onCnfrmTmpstmpRaw)
    : null;
  if (onCnfrmTmpstmp && _.gte(onCnfrmTmpstmp, context.timestamp)) {
    result.push(
      createError(
        `Timestamp for /${constants.ON_CONFIRM} api cannot be greater than or equal to /${constants.ON_STATUS}_${state} api`,
        ERROR_CODES.OUT_OF_SEQUENCE
      )
    );
  }

  const prevTmpstmpRaw = await RedisService.getKey(`${transaction_id}_tmpstmp`);
  const prevTmpstmp = prevTmpstmpRaw ? JSON.parse(prevTmpstmpRaw) : null;
  if (prevTmpstmp && _.gte(prevTmpstmp, context.timestamp)) {
    result.push(
      createError(
        `Timestamp for /${constants.ON_STATUS}_order_picked api cannot be greater than or equal to /${constants.ON_STATUS}_${state} api`,
        ERROR_CODES.OUT_OF_SEQUENCE
      )
    );
  }

  if (!areTimestampsLessThanOrEqualTo(order.updated_at, context.timestamp)) {
    result.push(
      createError(
        `order.updated_at timestamp should be less than or equal to context timestamp for /${constants.ON_STATUS}_${state} api`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  await RedisService.setKey(
    `${transaction_id}_tmpstmp`,
    JSON.stringify(context.timestamp),
    TTL_IN_SECONDS
  );
}

async function validateOutForDeliveryTimestamps(
  order: any,
  context: any,
  transaction_id: string,
  state: string,
  result: ValidationError[]
): Promise<void> {
  let orderOutForDelivery = false;
  const outforDeliveryTimestamps: any = {};

  for (const fulfillment of order.fulfillments || []) {
    if (fulfillment.type !== "Delivery") continue;

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

        if (!_.gte(context.timestamp, order.updated_at)) {
          result.push(
            createError(
              `order/updated_at timestamp can't be future dated (should match context/timestamp)`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      }
    }
  }

  await RedisService.setKey(
    `${transaction_id}_outforDeliveryTimestamps`,
    JSON.stringify(outforDeliveryTimestamps),
    TTL_IN_SECONDS
  );

  if (!orderOutForDelivery) {
    result.push(
      createError(
        `fulfillments/state Should be ${state} for /${constants.ON_STATUS}_${constants.ORDER_OUT_FOR_DELIVERY}`,
        ERROR_CODES.INVALID_ORDER_STATE
      )
    );
  }
}

async function validatePayment(
  order: any,
  flow: string,
  result: ValidationError[]
): Promise<void> {
  if (
    flow === FLOW.FLOW2A &&
    order.payment?.status !== PAYMENT_STATUS.NOT_PAID
  ) {
    result.push(
      createError(
        `Payment status should be ${PAYMENT_STATUS.NOT_PAID} for ${FLOW.FLOW2A} flow (Cash on Delivery)`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }
}

const checkOnStatusOutForDelivery = async (
  data: any,
  state: string,
  fulfillmentsItemsSet: Set<any>
): Promise<ValidationError[]> => {
  const result: ValidationError[] = [];
  try {
    if (!data || isObjectEmpty(data)) {
      result.push(
        createError("JSON cannot be empty", ERROR_CODES.INVALID_RESPONSE)
      );
      return result;
    }

    const { context, message } = data;
    if (!message || !context || !message.order || isObjectEmpty(message)) {
      result.push(
        createError(
          "/context, /message, /order or /message/order is missing or empty",
          ERROR_CODES.INVALID_RESPONSE
        )
      );
      return result;
    }

    const flow = (await RedisService.getKey("flow")) || "2";
    const { transaction_id } = context;
    const order = message.order;

    try {
      const previousCallPresent = await addActionToRedisSet(
        transaction_id,
        ApiSequence.ON_STATUS_PICKED,
        ApiSequence.ON_STATUS_OUT_FOR_DELIVERY
      );
      if (!previousCallPresent) {
        result.push({
          valid: false,
          code: 20000,
          description: `Previous call doesn't exist`,
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while checking previous action call /${constants.ON_STATUS_OUT_FOR_DELIVERY}, ${error.stack}`
      );
    }

    await Promise.all([
      validateContext(context, transaction_id, result),
      validateMessageId(context, transaction_id, result),
      validateTransactionId(context, transaction_id, result),
      validateOrder(order, transaction_id, state, result),
      validateFulfillments(
        order,
        transaction_id,
        state,
        fulfillmentsItemsSet,
        result
      ),
      validateTimestamps(order, context, transaction_id, state, result),
      validateOutForDeliveryTimestamps(
        order,
        context,
        transaction_id,
        state,
        result
      ),
      validatePayment(order, flow, result),
      RedisService.setKey(
        `${transaction_id}_${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`,
        JSON.stringify(data),
        TTL_IN_SECONDS
      ),
    ]);

    return result;
  } catch (err: any) {
    console.error(
      `!!Some error occurred while checking /${constants.ON_STATUS} API`,
      err
    );
    result.push(
      createError(
        "Internal error processing /on_status_out_for_delivery request",
        ERROR_CODES.INTERNAL_ERROR
      )
    );
    return result;
  }
};

export default checkOnStatusOutForDelivery;
