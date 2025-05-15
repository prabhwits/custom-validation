import { RedisService } from "ondc-automation-cache-lib";
import checkOnStatusRTODelivered from "./on_status_rto_delivered";
import _ from "lodash";

import {
  isObjectEmpty,
  checkContext,
  checkBppIdOrBapId,
  areTimestampsLessThanOrEqualTo,
  compareTimeRanges,
  compareObjects,
  compareQuoteObjects,
  sumQuoteBreakUp,
  areGSTNumbersMatching,
  addActionToRedisSet,
  addMsgIdToRedisSet,
  compareCoordinates,
  checkItemTag,
  tagFinder,
  isoDurToSec,
  compareFulfillmentObject,
} from "../../../../utils/helper";
import constants, {
  ApiSequence,
  ROUTING_ENUMS,
} from "../../../../utils/constants";

const ERROR_CODES = {
  INVALID_RESPONSE: 20006,
  INVALID_ORDER_STATE: 20007,
  OUT_OF_SEQUENCE: 20008,
  TIMEOUT: 20009,
  INVALID_CANCELLATION_TERMS: 22505,
  INTERNAL_ERROR: 23001,
  ORDER_VALIDATION_FAILURE: 23002,
};

const TTL_IN_SECONDS = Number(process.env.TTL_IN_SECONDS) || 3600;

const addError = (description: any, code: any) => ({
  valid: false,
  code,
  description,
});
interface ValidationError {
  valid: boolean;
  code: number;
  description: string;
}

async function validateContext(
  context: any,
  transaction_id: string,
  result: ValidationError[]
): Promise<void> {
  const contextRes = checkContext(context, constants.ON_STATUS);
  if (!contextRes?.valid) {
    const errors = contextRes?.ERRORS;
    Object.keys(errors).forEach((key: string) =>
      result.push(addError(errors[key], ERROR_CODES.INVALID_RESPONSE))
    );
  }

  if (checkBppIdOrBapId(context.bap_id)) {
    result.push(
      addError(
        "context/bap_id should not be a url",
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }
  if (checkBppIdOrBapId(context.bpp_id)) {
    result.push(
      addError(
        "context/bpp_id should not be a url",
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  const domain = await RedisService.getKey(`${transaction_id}_domain`);
  if (!_.isEqual(context.domain?.split(":")[1], domain)) {
    result.push(
      addError(
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
      addError(
        `City code mismatch in /${constants.SEARCH} and /${constants.ON_STATUS}`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }
}

async function validateMessageId(
  context: any,
  result: ValidationError[],
  action_call: string
): Promise<void> {
  try {
    console.info(`Adding Message Id /${action_call}`);
    const isMsgIdNotPresent = await addMsgIdToRedisSet(
      context.transaction_id,
      context.message_id,
      action_call
    );
    if (!isMsgIdNotPresent) {
      result.push(
        addError(
          `Message id should not be same with previous calls`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }
  } catch (error: any) {
    console.error(
      `!!Error while checking message id for /${constants.ON_STATUS_DELIVERED}, ${error.stack}`
    );
    result.push(
      addError(
        "Internal error while checking message ID",
        ERROR_CODES.INTERNAL_ERROR
      )
    );
  }
}

async function validateFulfillmentsDelivered(
  order: any,
  transaction_id: string,
  state: string,
  fulfillmentsItemsSet: Set<any>,
  result: ValidationError[]
): Promise<void> {
  const [
    itemFlfllmntsRaw,
    providerGpsRaw,
    providerNameRaw,
    buyerGpsRaw,
    buyerAddrRaw,
  ] = await Promise.all([
    RedisService.getKey(`${transaction_id}_itemFlfllmnts`),
    RedisService.getKey(`${transaction_id}_providerGps`),
    RedisService.getKey(`${transaction_id}_providerName`),
    RedisService.getKey(`${transaction_id}_buyerGps`),
    RedisService.getKey(`${transaction_id}_buyerAddr`),
  ]);
  const itemFlfllmnts = itemFlfllmntsRaw ? JSON.parse(itemFlfllmntsRaw) : null;
  const providerGps = providerGpsRaw ? JSON.parse(providerGpsRaw) : null;
  const providerName = providerNameRaw ? JSON.parse(providerNameRaw) : null;
  const buyerGps = buyerGpsRaw ? JSON.parse(buyerGpsRaw) : null;
  const buyerAddr = buyerAddrRaw ? JSON.parse(buyerAddrRaw) : null;

  const deliveryObjArr = order.fulfillments.filter(
    (f: any) => f.type === "Delivery"
  );
  if (!deliveryObjArr.length) {
    result.push(
      addError(
        `Delivery object is mandatory for ${ApiSequence.ON_STATUS_DELIVERED}`,
        ERROR_CODES.ORDER_VALIDATION_FAILURE
      )
    );
  } else {
    const deliveryObj = deliveryObjArr[0];
    if (!deliveryObj.tags) {
      result.push(
        addError(
          `Tags are mandatory in Delivery Fulfillment for ${ApiSequence.ON_STATUS_DELIVERED}`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    } else {
      const routingTagArr = deliveryObj.tags.filter(
        (tag: any) => tag.code === "routing"
      );
      if (!routingTagArr.length) {
        result.push(
          addError(
            `RoutingTag object is mandatory in Tags of Delivery Object for ${ApiSequence.ON_STATUS_DELIVERED}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      } else {
        const routingTag = routingTagArr[0];
        const routingTagList = routingTag.list;
        if (!routingTagList) {
          result.push(
            addError(
              `RoutingTagList is mandatory in RoutingTag of Delivery Object for ${ApiSequence.ON_STATUS_DELIVERED}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else {
          const routingTagTypeArr = routingTagList.filter(
            (item: any) => item.code === "type"
          );
          if (!routingTagTypeArr.length) {
            result.push(
              addError(
                `RoutingTagListType object is mandatory in RoutingTag/List of Delivery Object for ${ApiSequence.ON_STATUS_DELIVERED}`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else {
            const routingTagType = routingTagTypeArr[0];
            if (!ROUTING_ENUMS.includes(routingTagType.value)) {
              result.push(
                addError(
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

  for (const ff of order.fulfillments || []) {
    if (!ff.id) {
      result.push(
        addError(`Fulfillment Id must be present`, ERROR_CODES.INVALID_RESPONSE)
      );
    }

    if (!ff.type) {
      result.push(
        addError(
          `Fulfillment type does not exist in /${state}`,
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
            addError(
              `Tracking must be present for fulfillment ID: ${ff.id} in boolean form`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else if (ffTracking !== ff.tracking) {
          result.push(
            addError(
              `Fulfillment Tracking mismatch with the ${constants.ON_SELECT} call`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      }
    }

    if (!itemFlfllmnts || !Object.values(itemFlfllmnts).includes(ff.id)) {
      result.push(
        addError(
          `Fulfillment id ${ff.id || "missing"} does not exist in /${
            constants.ON_SELECT
          }`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

    const ffDesc = ff.state?.descriptor;
    const ffStateCheck =
      ffDesc?.hasOwnProperty("code") && ffDesc.code === "Order-delivered";
    if (!ffStateCheck) {
      result.push(
        addError(
          `Fulfillment state should be 'Order-delivered' in /${constants.ON_STATUS}_${state}`,
          ERROR_CODES.INVALID_ORDER_STATE
        )
      );
    }

    if (!ff.start || !ff.end) {
      result.push(
        addError(
          `fulfillments[${ff.id}] start and end locations are mandatory`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

    if (
      ff.start?.location?.gps &&
      !compareCoordinates(ff.start.location.gps, providerGps)
    ) {
      result.push(
        addError(
          `store gps location /fulfillments[${ff.id}]/start/location/gps can't change`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

    if (
      !providerName ||
      !_.isEqual(ff.start?.location?.descriptor?.name, providerName)
    ) {
      result.push(
        addError(
          `store name /fulfillments[${ff.id}]/start/location/descriptor/name can't change`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

    if (ff.end?.location?.gps && !_.isEqual(ff.end.location.gps, buyerGps)) {
      result.push(
        addError(
          `fulfillments[${ff.id}].end.location gps is not matching with gps in /${constants.SELECT}`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

    if (
      ff.end?.location?.address?.area_code &&
      !_.isEqual(ff.end.location.address.area_code, buyerAddr)
    ) {
      result.push(
        addError(
          `fulfillments[${ff.id}].end.location.address.area_code is not matching with area_code in /${constants.SELECT}`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
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

  if (deliveryFulfillment.length > 0) {
    const { start, end } = deliveryFulfillment[0];
    const startRange = start?.time?.range;
    const endRange = end?.time?.range;
    if (!startRange || !endRange) {
      result.push(
        addError(
          `Delivery fulfillment (${deliveryFulfillment[0].id}) has incomplete time range.`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

    if (!storedFulfillment) {
      await Promise.all([
        RedisService.setKey(
          `${transaction_id}_deliveryFulfillment`,
          JSON.stringify(deliveryFulfillment[0]),
          TTL_IN_SECONDS
        ),
        RedisService.setKey(
          `${transaction_id}_deliveryFulfillmentAction`,
          JSON.stringify(ApiSequence.ON_STATUS_DELIVERED),
          TTL_IN_SECONDS
        ),
      ]);
    } else {
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
        ApiSequence.ON_STATUS_DELIVERED
      );
      if (fulfillmentRangeErrors) {
        fulfillmentRangeErrors.forEach((error: string) => {
          result.push(addError(`${error}`, ERROR_CODES.INVALID_RESPONSE));
        });
      }
    }
  }

  const flow = (await RedisService.getKey("flow")) || "2";
  if (["6", "2", "3", "5"].includes(flow)) {
    if (!order.fulfillments?.length) {
      result.push(
        addError(
          `missingFulfillments is mandatory for ${ApiSequence.ON_STATUS_DELIVERED}`,
          ERROR_CODES.ORDER_VALIDATION_FAILURE
        )
      );
    } else {
      const fulfillmentsItemsStatusSet = new Set();
      order.fulfillments.forEach((ff: any) => {
        fulfillmentsItemsStatusSet.add(JSON.stringify(ff));
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
            delete obj2?.end?.time?.timestamp;
            delete obj2?.state;
            delete obj1?.state;
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
            result.push(addError(item.errMsg, ERROR_CODES.INVALID_RESPONSE));
          });
        } else {
          result.push(
            addError(
              `Missing fulfillment type '${obj1.type}' in ${ApiSequence.ON_STATUS_DELIVERED} as compared to ${apiSeq}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
        i++;
      }

      fulfillmentsItemsSet.clear();
      fulfillmentsItemsStatusSet.forEach((ff: any) => {
        const obj: any = JSON.parse(ff);
        delete obj?.state;
        delete obj?.start?.time;
        delete obj?.end?.time;
        fulfillmentsItemsSet.add(obj);
      });
      await RedisService.setKey(
        `${transaction_id}_fulfillmentsItemsSet`,
        JSON.stringify([...fulfillmentsItemsSet]),
        TTL_IN_SECONDS
      );
      const deliveryObjArr = order.fulfillments.filter(
        (f: any) => f.type === "Delivery"
      );
      if (!deliveryObjArr.length) {
        result.push(
          addError(
            `Delivery fulfillment must be present in ${ApiSequence.ON_STATUS_DELIVERED}`,
            ERROR_CODES.ORDER_VALIDATION_FAILURE
          )
        );
      } else {
        const deliverObj = { ...deliveryObjArr[0] };
        delete deliverObj?.state;
        delete deliverObj?.tags;
        delete deliverObj?.start?.instructions;
        delete deliverObj?.end?.instructions;
        delete deliverObj?.agent;
        delete deliverObj?.start?.time?.timestamp;
        delete deliverObj?.end?.time?.timestamp;
      }
    }
  }
}

async function validateTimestamps(
  order: any,
  context: any,
  transaction_id: any,
  result: any,
  currCall: any,
  prevCall?: any
) {
  const cnfrmTmpstmpRaw = await RedisService.getKey(
    `${transaction_id}_cnfrmTmpstmp`
  );
  const cnfrmTmpstmp = cnfrmTmpstmpRaw ? JSON.parse(cnfrmTmpstmpRaw) : null;
  if (cnfrmTmpstmp && !_.isEqual(cnfrmTmpstmp, order.created_at)) {
    result.push(
      addError(
        `Created At timestamp for /${currCall} should be equal to context timestamp at ${constants.CONFIRM}`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  const onCnfrmTmpstmpRaw = await RedisService.getKey(
    `${transaction_id}_${ApiSequence.ON_CONFIRM}_tmpstmp`
  );
  const onCnfrmTmpstmp = onCnfrmTmpstmpRaw
    ? JSON.parse(onCnfrmTmpstmpRaw)
    : null;
  if (onCnfrmTmpstmp && _.gte(onCnfrmTmpstmp, context.timestamp)) {
    result.push(
      addError(
        `Timestamp for /${constants.ON_CONFIRM} api cannot be greater than or equal to /${currCall} api`,
        ERROR_CODES.OUT_OF_SEQUENCE
      )
    );
  }
  if (prevCall) {
    const prevCallTmpstmpRaw = await RedisService.getKey(
      `${transaction_id}_${prevCall}_tmpstmp`
    );

    const prevCallTmpstmp = prevCallTmpstmpRaw
      ? JSON.parse(prevCallTmpstmpRaw)
      : null;
    if (prevCallTmpstmp && _.gte(prevCallTmpstmp, context.timestamp)) {
      result.push(
        addError(
          `Timestamp for /${currCall} api cannot be greater than or equal to /${prevCall} api`,
          ERROR_CODES.OUT_OF_SEQUENCE
        )
      );
    }
  }

  if (!areTimestampsLessThanOrEqualTo(order.updated_at, context.timestamp)) {
    result.push(
      addError(
        `order.updated_at timestamp should be less than or equal to context timestamp for /${currCall} api`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  await RedisService.setKey(
    `${transaction_id}_${currCall}_tmpstmp`,
    JSON.stringify(context.timestamp),
    TTL_IN_SECONDS
  );
}
async function validateDeliveryTimestampsDelivered(
  order: any,
  context: any,
  transaction_id: string,
  state: string,
  result: ValidationError[]
): Promise<void> {
  let orderDelivered = false;
  const deliveryTimestamps: any = {};

  for (const fulfillment of order.fulfillments || []) {
    if (fulfillment.type !== "Delivery") continue;

    const ffState = fulfillment.state?.descriptor?.code;
    if (ffState === constants.ORDER_DELIVERED) {
      orderDelivered = true;
      const pickUpTime = fulfillment.start?.time?.timestamp;
      const deliveryTime = fulfillment.end?.time?.timestamp;
      deliveryTimestamps[fulfillment.id] = deliveryTime;

      if (!deliveryTime) {
        result.push(
          addError(
            `delivery timestamp is missing`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      } else {
        if (!_.lte(deliveryTime, context.timestamp)) {
          result.push(
            addError(
              `delivery timestamp should be less than or equal to context/timestamp and can't be future dated as this on_status is sent after the product is delivered; as delivery timestamp is ${deliveryTime} and context timestamp is ${context.timestamp}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }

        if (pickUpTime && _.gte(pickUpTime, deliveryTime)) {
          result.push(
            addError(
              `delivery timestamp (/end/time/timestamp) can't be less than or equal to the pickup timestamp (start/time/timestamp)`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }

        if (!_.gte(order.updated_at, deliveryTime)) {
          result.push(
            addError(
              `order/updated_at timestamp can't be less than the delivery time`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }

        if (!_.gte(context.timestamp, order.updated_at)) {
          result.push(
            addError(
              `order/updated_at timestamp can't be future dated (should match context/timestamp)`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      }
    }
  }

  await RedisService.setKey(
    `${transaction_id}_deliveryTimestamps`,
    JSON.stringify(deliveryTimestamps),
    TTL_IN_SECONDS
  );

  if (!orderDelivered) {
    result.push(
      addError(
        `fulfillments/state should be ${constants.ORDER_DELIVERED} for /${constants.ON_STATUS}_${constants.ORDER_DELIVERED}`,
        ERROR_CODES.INVALID_ORDER_STATE
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
  const prevPaymentRaw = await RedisService.getKey(
    `${transaction_id}_prevPayment`
  );
  const prevPayment = prevPaymentRaw ? JSON.parse(prevPaymentRaw) : null;
  if (prevPayment && !_.isEqual(prevPayment, order.payment)) {
    result.push(
      addError(
        `payment object mismatches with the previous action call and /${constants.ON_STATUS}_${state}`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  const settlement_details: any =
    order?.payment["@ondc/org/settlement_details"];

  const storedSettlementRaw = await RedisService.getKey(
    `${transaction_id}_settlementDetailSet`
  );

  const storedSettlementSet = storedSettlementRaw
    ? JSON.parse(storedSettlementRaw)
    : null;

  storedSettlementSet?.forEach((obj1: any) => {
    const exist = settlement_details.some((obj2: any) => _.isEqual(obj1, obj2));
    if (!exist) {
      result.push({
        valid: false,
        code: 20006,
        description: `Missing payment/@ondc/org/settlement_details as compared to previous calls or not captured correctly: ${JSON.stringify(
          obj1
        )}`,
      });
    }
  });
}

const checkOnStatusDelivered = async (
  data: any,
  state: string,
  fulfillmentsItemsSet: Set<any>,
  currentCall: any,
  prevCall?: any
): Promise<ValidationError[]> => {
  const result: ValidationError[] = [];

  try {
    if (!data || isObjectEmpty(data)) {
      result.push(
        addError("JSON cannot be empty", ERROR_CODES.INVALID_RESPONSE)
      );
      return result;
    }

    const { context, message } = data;
    if (!message || !context || !message.order || isObjectEmpty(message)) {
      result.push(
        addError(
          "/context, /message, /order or /message/order is missing or empty",
          ERROR_CODES.INVALID_RESPONSE
        )
      );
      return result;
    }

    const { transaction_id } = context;
    const order = message.order;

    try {
      const previousCallPresent = await addActionToRedisSet(
        transaction_id,
        prevCall,
        currentCall
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
        `!!Error while checking previous action call /${currentCall}, ${error.stack}`
      );
    }

    await Promise.all([
      validateContext(context, transaction_id, result),
      validateMessageId(context, result, currentCall),
      validateOrder(order, transaction_id, result, currentCall),
      validateFulfillmentsDelivered(
        order,
        transaction_id,
        state,
        fulfillmentsItemsSet,
        result
      ),
      validateTimestamps(
        order,
        context,
        transaction_id,
        result,
        currentCall,
        prevCall
      ),
      validateDeliveryTimestampsDelivered(
        order,
        context,
        transaction_id,
        state,
        result
      ),
      validatePayment(order, transaction_id, state, result),
      validateQuote(order, transaction_id, result, currentCall, prevCall),
      validateBilling(order, transaction_id, currentCall, result),
      validateItems(transaction_id, order.items, result, currentCall, prevCall),
      validateTags(order, transaction_id, result, currentCall),
      RedisService.setKey(
        `${transaction_id}_${currentCall}`,
        JSON.stringify(data),
        TTL_IN_SECONDS
      ),
    ]);

    return result;
  } catch (err: any) {
    console.error(
      `!!Some error occurred while checking /${constants.ON_STATUS} API, ${err.stack}`
    );
    result.push(
      addError(
        `Internal error processing ${currentCall} request`,
        ERROR_CODES.INTERNAL_ERROR
      )
    );
    return result;
  }
};

async function validateFulfillmentsOutDelivery(
  order: any,
  transaction_id: string,
  state: string,
  fulfillmentsItemsSet: Set<any>,
  result: ValidationError[]
): Promise<void> {
  const [
    itemFlfllmntsRaw,
    providerGpsRaw,
    providerNameRaw,
    buyerGpsRaw,
    buyerAddrRaw,
  ] = await Promise.all([
    RedisService.getKey(`${transaction_id}_itemFlfllmnts`),
    RedisService.getKey(`${transaction_id}_providerGps`),
    RedisService.getKey(`${transaction_id}_providerName`),
    RedisService.getKey(`${transaction_id}_buyerGps`),
    RedisService.getKey(`${transaction_id}_buyerAddr`),
  ]);
  const itemFlfllmnts = itemFlfllmntsRaw ? JSON.parse(itemFlfllmntsRaw) : null;
  const providerGps = providerGpsRaw ? JSON.parse(providerGpsRaw) : null;
  const providerName = providerNameRaw ? JSON.parse(providerNameRaw) : null;
  const buyerGps = buyerGpsRaw ? JSON.parse(buyerGpsRaw) : null;
  const buyerAddr = buyerAddrRaw ? JSON.parse(buyerAddrRaw) : null;

  const deliveryObjArr = order.fulfillments.filter(
    (f: any) => f.type === "Delivery"
  );
  if (!deliveryObjArr.length) {
    result.push(
      addError(
        `Delivery object is mandatory for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`,
        ERROR_CODES.ORDER_VALIDATION_FAILURE
      )
    );
  } else {
    const deliveryObj = deliveryObjArr[0];
    if (!deliveryObj.tags) {
      result.push(
        addError(
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
          addError(
            `RoutingTag object is mandatory in Tags of Delivery Object for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      } else {
        const routingTag = routingTagArr[0];
        const routingTagList = routingTag.list;
        if (!routingTagList) {
          result.push(
            addError(
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
              addError(
                `RoutingTagListType object is mandatory in RoutingTag/List of Delivery Object for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else {
            const routingTagType = routingTagTypeArr[0];
            if (!ROUTING_ENUMS.includes(routingTagType.value)) {
              result.push(
                addError(
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

  for (const fulfillment of order.fulfillments || []) {
    const ff = fulfillment;
    if (!ff.id) {
      result.push(
        addError(`Fulfillment Id must be present`, ERROR_CODES.INVALID_RESPONSE)
      );
    }

    if (!ff.type) {
      result.push(
        addError(
          `Fulfillment type does not exist in /${constants.ON_STATUS}_${state}`,
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
            addError(
              `Tracking must be present for fulfillment ID: ${ff.id} in boolean form`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else if (ffTracking !== ff.tracking) {
          result.push(
            addError(
              `Fulfillment Tracking mismatch with the ${constants.ON_SELECT} call`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      }
    }

    if (ff?.type == "Delivery") {
      if (!itemFlfllmnts || !Object.values(itemFlfllmnts).includes(ff.id)) {
        result.push(
          addError(
            `Fulfillment id ${ff.id || "missing"} does not exist in /${
              constants.ON_SELECT
            }`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      const ffDesc = ff.state?.descriptor;
      const ffStateCheck =
        ffDesc?.hasOwnProperty("code") && ffDesc.code === "Out-for-delivery";
      if (!ffStateCheck) {
        result.push(
          addError(
            `Fulfillment state should be 'Out-for-delivery' in /${constants.ON_STATUS}_${state}`,
            ERROR_CODES.INVALID_ORDER_STATE
          )
        );
      }

      if (!ff.start || !ff.end) {
        result.push(
          addError(
            `fulfillments[${ff.id}] start and end locations are mandatory`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      if (
        ff.start?.location?.gps &&
        !compareCoordinates(ff.start.location.gps, providerGps)
      ) {
        result.push(
          addError(
            `store gps location /fulfillments[${ff.id}]/start/location/gps can't change`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      if (
        !providerName ||
        !_.isEqual(ff.start?.location?.descriptor?.name, providerName)
      ) {
        result.push(
          addError(
            `store name /fulfillments[${ff.id}]/start/location/descriptor/name can't change`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      if (ff.end?.location?.gps && !_.isEqual(ff.end.location.gps, buyerGps)) {
        result.push(
          addError(
            `fulfillments[${ff.id}].end.location gps is not matching with gps in /${constants.SELECT}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      if (
        ff.end?.location?.address?.area_code &&
        !_.isEqual(ff.end.location.address.area_code, buyerAddr)
      ) {
        result.push(
          addError(
            `fulfillments[${ff.id}].end.location.address.area_code is not matching with area_code in /${constants.SELECT}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
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

  if (deliveryFulfillment.length > 0) {
    const { start, end } = deliveryFulfillment[0];
    const startRange = start?.time?.range;
    const endRange = end?.time?.range;
    if (!startRange || !endRange) {
      result.push(
        addError(
          `Delivery fulfillment (${deliveryFulfillment[0].id}) has incomplete time range.`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

    if (!storedFulfillment) {
      await Promise.all([
        RedisService.setKey(
          `${transaction_id}_deliveryFulfillment`,
          JSON.stringify(deliveryFulfillment[0]),
          TTL_IN_SECONDS
        ),
        RedisService.setKey(
          `${transaction_id}_deliveryFulfillmentAction`,
          JSON.stringify(ApiSequence.ON_STATUS_OUT_FOR_DELIVERY),
          TTL_IN_SECONDS
        ),
      ]);
    } else {
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
        fulfillmentRangeErrors.forEach((error: string) => {
          result.push(addError(`${error}`, ERROR_CODES.INVALID_RESPONSE));
        });
      }
    }
  }

  const flow = (await RedisService.getKey("flow")) || "2";
  if (["6", "2", "3", "5"].includes(flow)) {
    if (!order.fulfillments?.length) {
      result.push(
        addError(
          `missingFulfillments is mandatory for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`,
          ERROR_CODES.ORDER_VALIDATION_FAILURE
        )
      );
    } else {
      order.fulfillments.forEach((ff: any) => {
        if (ff.type === "Delivery") {
          RedisService.setKey(
            `${transaction_id}_deliveryTmpStmp`,
            JSON.stringify(ff?.start?.time?.timestamp),
            TTL_IN_SECONDS
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
            delete obj1?.state;
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
            result.push(addError(item.errMsg, ERROR_CODES.INVALID_RESPONSE));
          });
        } else {
          result.push(
            addError(
              `Missing fulfillment type '${obj1.type}' in ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY} as compared to ${apiSeq}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
        i++;
      }

      const deliveryObjArr = order.fulfillments.filter(
        (f: any) => f.type === "Delivery"
      );
      if (!deliveryObjArr.length) {
        result.push(
          addError(
            `Delivery fulfillment must be present in ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`,
            ERROR_CODES.ORDER_VALIDATION_FAILURE
          )
        );
      } else {
        const deliverObj = { ...deliveryObjArr[0] };
        delete deliverObj?.state;
        delete deliverObj?.tags;
        delete deliverObj?.start?.instructions;
        delete deliverObj?.end?.instructions;
        delete deliverObj?.agent;
        delete deliverObj?.start?.time?.timestamp;
      }
    }
  }
}

async function validateOutForDeliveryTimestampsOutDelivery(
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
          addError(
            `Out_for_delivery timestamp is missing`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      } else {
        if (!_.lte(outForDeliveryTime, context.timestamp)) {
          result.push(
            addError(
              `Fulfillments start timestamp should match context/timestamp and can't be future dated`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }

        if (!_.gte(order.updated_at, outForDeliveryTime)) {
          result.push(
            addError(
              `order/updated_at timestamp can't be less than the Out_for_delivery time`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }

        if (!_.gte(context.timestamp, order.updated_at)) {
          result.push(
            addError(
              `order/updated_at timestamp can't be future dated (should match context/timestamp)`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      }
    }
  }

  if (order.updated_at) {
    await RedisService.setKey(
      `${transaction_id}_PreviousUpdatedTimestamp`,
      JSON.stringify(order.updated_at),
      TTL_IN_SECONDS
    );
  }

  await RedisService.setKey(
    `${transaction_id}_outforDeliveryTimestamps`,
    JSON.stringify(outforDeliveryTimestamps),
    TTL_IN_SECONDS
  );

  if (!orderOutForDelivery) {
    result.push(
      addError(
        `fulfillments/state should be ${constants.ORDER_OUT_FOR_DELIVERY} for /${constants.ON_STATUS}_${constants.ORDER_OUT_FOR_DELIVERY}`,
        ERROR_CODES.INVALID_ORDER_STATE
      )
    );
  }
}

const checkOnStatusOutForDelivery = async (
  data: any,
  state: string,
  fulfillmentsItemsSet: Set<any>,
  currentCall: any,
  prevCall?: any
): Promise<ValidationError[]> => {
  const result: ValidationError[] = [];

  try {
    if (!data || isObjectEmpty(data)) {
      result.push(
        addError("JSON cannot be empty", ERROR_CODES.INVALID_RESPONSE)
      );
      return result;
    }

    const { context, message } = data;
    if (!message || !context || !message.order || isObjectEmpty(message)) {
      result.push(
        addError(
          "/context, /message, /order or /message/order is missing or empty",
          ERROR_CODES.INVALID_RESPONSE
        )
      );
      return result;
    }

    const { transaction_id } = context;
    const order = message.order;

    try {
      const previousCallPresent = await addActionToRedisSet(
        transaction_id,
        prevCall,
        currentCall
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
        `!!Error while checking previous action call /${currentCall}, ${error.stack}`
      );
    }

    await Promise.all([
      validateContext(context, transaction_id, result),
      validateMessageId(context, result, currentCall),
      validateOrder(order, transaction_id, result, currentCall),
      validateFulfillmentsOutDelivery(
        order,
        transaction_id,
        state,
        fulfillmentsItemsSet,
        result
      ),
      validateTimestamps(
        order,
        context,
        transaction_id,
        result,
        currentCall,
        prevCall
      ),
      validateOutForDeliveryTimestampsOutDelivery(
        order,
        context,
        transaction_id,
        state,
        result
      ),
      validatePayment(order, transaction_id, state, result),
      validateQuote(order, transaction_id, result, currentCall, prevCall),
      validateBilling(order, transaction_id, currentCall, result),
      validateItems(transaction_id, order.items, result, currentCall, prevCall),
      validateTags(order, transaction_id, result, currentCall),
      RedisService.setKey(
        `${transaction_id}_${currentCall}`,
        JSON.stringify(data),
        TTL_IN_SECONDS
      ),
    ]);

    return result;
  } catch (err: any) {
    console.error(
      `!!Some error occurred while checking /${constants.ON_STATUS} API, ${err.stack}`
    );
    result.push(
      addError(
        `Internal error processing ${currentCall} request`,
        ERROR_CODES.INTERNAL_ERROR
      )
    );
    return result;
  }
};

async function validateFulfillmentsPicked(
  order: any,
  transaction_id: string,
  state: string,
  fulfillmentsItemsSet: Set<any>,
  result: ValidationError[]
): Promise<void> {
  const [
    itemFlfllmntsRaw,
    providerGpsRaw,
    providerNameRaw,
    buyerGpsRaw,
    buyerAddrRaw,
  ] = await Promise.all([
    RedisService.getKey(`${transaction_id}_itemFlfllmnts`),
    RedisService.getKey(`${transaction_id}_providerGps`),
    RedisService.getKey(`${transaction_id}_providerName`),
    RedisService.getKey(`${transaction_id}_buyerGps`),
    RedisService.getKey(`${transaction_id}_buyerAddr`),
  ]);
  const itemFlfllmnts = itemFlfllmntsRaw ? JSON.parse(itemFlfllmntsRaw) : null;
  const providerGps = providerGpsRaw ? JSON.parse(providerGpsRaw) : null;
  const providerName = providerNameRaw ? JSON.parse(providerNameRaw) : null;
  const buyerGps = buyerGpsRaw ? JSON.parse(buyerGpsRaw) : null;
  const buyerAddr = buyerAddrRaw ? JSON.parse(buyerAddrRaw) : null;

  const deliveryObjArr = order.fulfillments.filter(
    (f: any) => f.type === "Delivery"
  );
  if (!deliveryObjArr.length) {
    result.push(
      addError(
        `Delivery object is mandatory for ${ApiSequence.ON_STATUS_PICKED}`,
        ERROR_CODES.ORDER_VALIDATION_FAILURE
      )
    );
  } else {
    const deliveryObj = deliveryObjArr[0];
    if (!deliveryObj.tags) {
      result.push(
        addError(
          `Tags are mandatory in Delivery Fulfillment for ${ApiSequence.ON_STATUS_PICKED}`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    } else {
      const routingTagArr = deliveryObj.tags.filter(
        (tag: any) => tag.code === "routing"
      );
      if (!routingTagArr.length) {
        result.push(
          addError(
            `RoutingTag object is mandatory in Tags of Delivery Object for ${ApiSequence.ON_STATUS_PICKED}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      } else {
        const routingTag = routingTagArr[0];
        const routingTagList = routingTag.list;
        if (!routingTagList) {
          result.push(
            addError(
              `RoutingTagList is mandatory in RoutingTag of Delivery Object for ${ApiSequence.ON_STATUS_PICKED}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else {
          const routingTagTypeArr = routingTagList.filter(
            (item: any) => item.code === "type"
          );
          if (!routingTagTypeArr.length) {
            result.push(
              addError(
                `RoutingTagListType object is mandatory in RoutingTag/List of Delivery Object for ${ApiSequence.ON_STATUS_PICKED}`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else {
            const routingTagType = routingTagTypeArr[0];
            if (!ROUTING_ENUMS.includes(routingTagType.value)) {
              result.push(
                addError(
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

  for (const ff of order.fulfillments || []) {
    if (!ff.id) {
      result.push(
        addError(`Fulfillment Id must be present`, ERROR_CODES.INVALID_RESPONSE)
      );
    }

    if (!ff.type) {
      result.push(
        addError(
          `Fulfillment type does not exist in /${constants.ON_STATUS}_${state}`,
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
            addError(
              `Tracking must be present for fulfillment ID: ${ff.id} in boolean form`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else if (ffTracking !== ff.tracking) {
          result.push(
            addError(
              `Fulfillment Tracking mismatch with the ${constants.ON_SELECT} call`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      }
    }

    if (ff?.type == "Delivery") {
      if (!itemFlfllmnts || !Object.values(itemFlfllmnts).includes(ff.id)) {
        result.push(
          addError(
            `Fulfillment id ${ff.id || "missing"} does not exist in /${
              constants.ON_SELECT
            }`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      const ffDesc = ff.state?.descriptor;
      const ffStateCheck =
        ffDesc?.hasOwnProperty("code") && ffDesc.code === "Order-picked-up";
      if (!ffStateCheck) {
        result.push(
          addError(
            `Fulfillment state should be 'Order-picked' in /${constants.ON_STATUS}_${state}`,
            ERROR_CODES.INVALID_ORDER_STATE
          )
        );
      }

      if (!ff.start || !ff.end) {
        result.push(
          addError(
            `fulfillments[${ff.id}] start and end locations are mandatory`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      if (
        ff.start?.location?.gps &&
        !compareCoordinates(ff.start.location.gps, providerGps)
      ) {
        result.push(
          addError(
            `store gps location /fulfillments[${ff.id}]/start/location/gps can't change`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      if (
        !providerName ||
        !_.isEqual(ff.start?.location?.descriptor?.name, providerName)
      ) {
        result.push(
          addError(
            `store name /fulfillments[${ff.id}]/start/location/descriptor/name can't change`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      if (ff.end?.location?.gps && !_.isEqual(ff.end.location.gps, buyerGps)) {
        result.push(
          addError(
            `fulfillments[${ff.id}].end.location gps is not matching with gps in /${constants.SELECT}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      if (
        ff.end?.location?.address?.area_code &&
        !_.isEqual(ff.end.location.address.area_code, buyerAddr)
      ) {
        result.push(
          addError(
            `fulfillments[${ff.id}].end.location.address.area_code is not matching with area_code in /${constants.SELECT}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
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

  if (deliveryFulfillment.length > 0) {
    const { start, end } = deliveryFulfillment[0];
    const startRange = start?.time?.range;
    const endRange = end?.time?.range;
    if (!startRange || !endRange) {
      result.push(
        addError(
          `Delivery fulfillment (${deliveryFulfillment[0].id}) has incomplete time range.`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

    if (!storedFulfillment) {
      await Promise.all([
        RedisService.setKey(
          `${transaction_id}_deliveryFulfillment`,
          JSON.stringify(deliveryFulfillment[0]),
          TTL_IN_SECONDS
        ),
        RedisService.setKey(
          `${transaction_id}_deliveryFulfillmentAction`,
          JSON.stringify(ApiSequence.ON_STATUS_PICKED),
          TTL_IN_SECONDS
        ),
      ]);
    } else {
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
        ApiSequence.ON_STATUS_PICKED
      );
      if (fulfillmentRangeErrors) {
        fulfillmentRangeErrors.forEach((error: string) => {
          result.push(addError(`${error}`, ERROR_CODES.INVALID_RESPONSE));
        });
      }
    }
  }

  const flow = (await RedisService.getKey("flow")) || "2";
  if (["6", "2", "3", "5"].includes(flow)) {
    if (!order.fulfillments?.length) {
      result.push(
        addError(
          `missingFulfillments is mandatory for ${ApiSequence.ON_STATUS_PICKED}`,
          ERROR_CODES.ORDER_VALIDATION_FAILURE
        )
      );
    } else {
      order.fulfillments.forEach((ff: any) => {
        if (ff.type === "Delivery") {
          RedisService.setKey(
            `${transaction_id}_deliveryTmpStmp`,
            JSON.stringify(ff?.start?.time?.timestamp),
            TTL_IN_SECONDS
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
            delete obj2?.start?.instructions;
            delete obj2?.end?.instructions;
            delete obj2?.agent;
            delete obj2?.start?.time?.timestamp;
            delete obj2?.tags;
            delete obj2?.state;
            delete obj1?.state;
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
            result.push(addError(item.errMsg, ERROR_CODES.INVALID_RESPONSE));
          });
        } else {
          result.push(
            addError(
              `Missing fulfillment type '${obj1.type}' in ${ApiSequence.ON_STATUS_PICKED} as compared to ${apiSeq}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
        i++;
      }

      const deliveryObjArr = order.fulfillments.filter(
        (f: any) => f.type === "Delivery"
      );
      if (!deliveryObjArr.length) {
        result.push(
          addError(
            `Delivery fulfillment must be present in ${ApiSequence.ON_STATUS_PICKED}`,
            ERROR_CODES.ORDER_VALIDATION_FAILURE
          )
        );
      } else {
        const deliverObj = { ...deliveryObjArr[0] };
        delete deliverObj?.state;
        delete deliverObj?.tags;
        delete deliverObj?.start?.instructions;
        delete deliverObj?.end?.instructions;
        delete deliverObj?.agent;
        delete deliverObj?.start?.time?.timestamp;
      }
    }
  }
}

async function validatePickupTimestampsPicked(
  order: any,
  context: any,
  transaction_id: string,
  state: string,
  result: ValidationError[]
): Promise<void> {
  let orderPicked = false;
  const pickupTimestamps: any = {};

  for (const fulfillment of order.fulfillments || []) {
    if (fulfillment.type !== "Delivery") continue;

    const ffState = fulfillment.state?.descriptor?.code;
    if (ffState === constants.ORDER_PICKED) {
      orderPicked = true;
      const pickUpTime = fulfillment.start?.time?.timestamp;
      pickupTimestamps[fulfillment.id] = pickUpTime;

      if (!pickUpTime) {
        result.push(
          addError(`picked timestamp is missing`, ERROR_CODES.INVALID_RESPONSE)
        );
      } else {
        if (!_.lte(pickUpTime, context.timestamp)) {
          result.push(
            addError(
              `pickup timestamp should match context/timestamp and can't be future dated`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }

        if (!_.gte(order.updated_at, pickUpTime)) {
          result.push(
            addError(
              `order/updated_at timestamp can't be less than the pickup time`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }

        if (!_.gte(context.timestamp, order.updated_at)) {
          result.push(
            addError(
              `order/updated_at timestamp can't be future dated (should match context/timestamp)`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      }
    }
  }

  await RedisService.setKey(
    `${transaction_id}_pickupTimestamps`,
    JSON.stringify(pickupTimestamps),
    TTL_IN_SECONDS
  );

  if (!orderPicked) {
    result.push(
      addError(
        `fulfillments/state should be ${constants.ORDER_PICKED} for /${constants.ON_STATUS}_${constants.ORDER_PICKED}`,
        ERROR_CODES.INVALID_ORDER_STATE
      )
    );
  }
}

const checkOnStatusPicked = async (
  data: any,
  state: string,
  fulfillmentsItemsSet: Set<any>,
  currentCall: any,
  prevCall?: any
): Promise<ValidationError[]> => {
  const result: ValidationError[] = [];

  try {
    if (!data || isObjectEmpty(data)) {
      result.push(
        addError("JSON cannot be empty", ERROR_CODES.INVALID_RESPONSE)
      );
      return result;
    }

    const { context, message } = data;
    if (!message || !context || !message.order || isObjectEmpty(message)) {
      result.push(
        addError(
          "/context, /message, /order or /message/order is missing or empty",
          ERROR_CODES.INVALID_RESPONSE
        )
      );
      return result;
    }

    const { transaction_id } = context;
    const order = message.order;

    try {
      const previousCallPresent = await addActionToRedisSet(
        transaction_id,
        prevCall,
        currentCall
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
        `!!Error while checking previous action call /${currentCall}, ${error.stack}`
      );
    }

    await Promise.all([
      validateContext(context, transaction_id, result),
      validateMessageId(context, result, currentCall),
      validateOrder(order, transaction_id, result, currentCall),
      validateFulfillmentsPicked(
        order,
        transaction_id,
        state,
        fulfillmentsItemsSet,
        result
      ),
      validateTimestamps(
        order,
        context,
        transaction_id,
        result,
        currentCall,
        prevCall
      ),
      validatePickupTimestampsPicked(
        order,
        context,
        transaction_id,
        state,
        result
      ),
      validatePayment(order, transaction_id, state, result),
      validateQuote(order, transaction_id, result, currentCall, prevCall),
      validateBilling(order, transaction_id, currentCall, result),
      validateTags(order, transaction_id, result, currentCall),
      validateItems(transaction_id, order.items, result, currentCall, prevCall),
      RedisService.setKey(
        `${transaction_id}_${currentCall}`,
        JSON.stringify(data),
        TTL_IN_SECONDS
      ),
    ]);

    return result;
  } catch (err: any) {
    console.error(
      `!!Some error occurred while checking /${constants.ON_STATUS} API, ${err.stack}`
    );
    result.push(
      addError(
        `Internal error processing ${currentCall} request`,
        ERROR_CODES.INTERNAL_ERROR
      )
    );
    return result;
  }
};

async function validateFulfillmentsPacked(
  order: any,
  transaction_id: string,
  state: string,
  fulfillmentsItemsSet: Set<any>,
  result: ValidationError[]
): Promise<void> {
  const [
    itemFlfllmntsRaw,
    providerGpsRaw,
    providerNameRaw,
    buyerGpsRaw,
    buyerAddrRaw,
  ] = await Promise.all([
    RedisService.getKey(`${transaction_id}_itemFlfllmnts`),
    RedisService.getKey(`${transaction_id}_providerGps`),
    RedisService.getKey(`${transaction_id}_providerName`),
    RedisService.getKey(`${transaction_id}_buyerGps`),
    RedisService.getKey(`${transaction_id}_buyerAddr`),
  ]);
  const itemFlfllmnts = itemFlfllmntsRaw ? JSON.parse(itemFlfllmntsRaw) : null;
  const providerGps = providerGpsRaw ? JSON.parse(providerGpsRaw) : null;
  const providerName = providerNameRaw ? JSON.parse(providerNameRaw) : null;
  const buyerGps = buyerGpsRaw ? JSON.parse(buyerGpsRaw) : null;
  const buyerAddr = buyerAddrRaw ? JSON.parse(buyerAddrRaw) : null;

  for (const ff of order.fulfillments || []) {
    if (!ff.id) {
      result.push(
        addError(`Fulfillment Id must be present`, ERROR_CODES.INVALID_RESPONSE)
      );
    }

    if (!ff.type) {
      result.push(
        addError(
          `Fulfillment type does not exist in /${constants.ON_STATUS}_${state}`,
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
            addError(
              `Tracking must be present for fulfillment ID: ${ff.id} in boolean form`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else if (ffTracking !== ff.tracking) {
          result.push(
            addError(
              `Fulfillment Tracking mismatch with the ${constants.ON_SELECT} call`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      }
    }

    if (ff?.type == "Delivery") {
      if (!itemFlfllmnts || !Object.values(itemFlfllmnts).includes(ff.id)) {
        result.push(
          addError(
            `Fulfillment id ${ff.id || "missing"} does not exist in /${
              constants.ON_SELECT
            }`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      {
        const ffDesc = ff.state?.descriptor;
        const ffStateCheck =
          ffDesc?.hasOwnProperty("code") && ffDesc.code === "Packed";
        if (!ffStateCheck) {
          result.push(
            addError(
              `Fulfillment state should be 'Order-packed' in /${constants.ON_STATUS}_${state}`,
              ERROR_CODES.INVALID_ORDER_STATE
            )
          );
        }
      }
      if (!ff.start || !ff.end) {
        result.push(
          addError(
            `fulfillments[${ff.id}] start and end locations are mandatory`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      if (
        ff.start?.location?.gps &&
        !compareCoordinates(ff.start.location.gps, providerGps)
      ) {
        result.push(
          addError(
            `store gps location /fulfillments[${ff.id}]/start/location/gps can't change`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      if (
        !providerName ||
        !_.isEqual(ff.start?.location?.descriptor?.name, providerName)
      ) {
        result.push(
          addError(
            `store name /fulfillments[${ff.id}]/start/location/descriptor/name can't change`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      if (ff.end?.location?.gps && !_.isEqual(ff.end.location.gps, buyerGps)) {
        result.push(
          addError(
            `fulfillments[${ff.id}].end.location gps is not matching with gps in /${constants.SELECT}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      if (
        ff.end?.location?.address?.area_code &&
        !_.isEqual(ff.end.location.address.area_code, buyerAddr)
      ) {
        result.push(
          addError(
            `fulfillments[${ff.id}].end.location.address.area_code is not matching with area_code in /${constants.SELECT}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
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

  if (!storedFulfillment) {
    if (deliveryFulfillment.length > 0) {
      await Promise.all([
        RedisService.setKey(
          `${transaction_id}_deliveryFulfillment`,
          JSON.stringify(deliveryFulfillment[0]),
          TTL_IN_SECONDS
        ),
        RedisService.setKey(
          `${transaction_id}_deliveryFulfillmentAction`,
          JSON.stringify(ApiSequence.ON_STATUS_PACKED),
          TTL_IN_SECONDS
        ),
      ]);
    }
  } else {
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
      ApiSequence.ON_STATUS_PACKED
    );

    if (fulfillmentRangeErrors) {
      fulfillmentRangeErrors.forEach((error: string) => {
        result.push(addError(`${error}`, ERROR_CODES.INVALID_RESPONSE));
      });
    }
  }

  const flow = (await RedisService.getKey("flow")) || "2";
  if (["6", "2", "3", "5"].includes(flow)) {
    if (!order.fulfillments?.length) {
      result.push(
        addError(
          `missingFulfillments is mandatory for ${ApiSequence.ON_STATUS_PACKED}`,
          ERROR_CODES.ORDER_VALIDATION_FAILURE
        )
      );
    } else {
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
            delete obj2?.start?.instructions;
            delete obj2?.end?.instructions;
            delete obj2?.tags;
            delete obj2?.state;
            delete obj1?.state;
          }
          const errors = compareFulfillmentObject(obj1, obj2, keys, i, apiSeq);
          errors.forEach((item: any) => {
            result.push(addError(item.errMsg, ERROR_CODES.INVALID_RESPONSE));
          });
        } else {
          result.push(
            addError(
              `Missing fulfillment type '${obj1.type}' in ${ApiSequence.ON_STATUS_PACKED} as compared to ${apiSeq}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
        i++;
      }

      const deliveryObjArr = order.fulfillments.filter(
        (f: any) => f.type === "Delivery"
      );
      if (!deliveryObjArr.length) {
        result.push(
          addError(
            `Delivery fulfillment must be present in ${ApiSequence.ON_STATUS_PACKED}`,
            ERROR_CODES.ORDER_VALIDATION_FAILURE
          )
        );
      } else {
        const deliverObj = { ...deliveryObjArr[0] };
        delete deliverObj?.state;
        delete deliverObj?.tags;
        delete deliverObj?.start?.instructions;
        delete deliverObj?.end?.instructions;
      }
    }
  }
}

async function validateQuote(
  order: any,
  transaction_id: string,
  result: ValidationError[],
  currCall: any,
  prevCall?: any
): Promise<void> {
  if (!sumQuoteBreakUp(order.quote)) {
    result.push(
      addError(
        `item quote breakup prices for ${currCall} should be equal to the total price`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  const quoteObjRaw = await RedisService.getKey(`${transaction_id}_quoteObj`);
  const previousQuote = quoteObjRaw ? JSON.parse(quoteObjRaw) : null;
  const quoteErrors = compareQuoteObjects(
    previousQuote,
    order.quote,
    currCall,
    prevCall
  );
  if (quoteErrors) {
    quoteErrors.forEach((error: string) =>
      result.push(addError(error, ERROR_CODES.INVALID_RESPONSE))
    );
  }
  const hasItemWithQuantity = _.some(order.quote?.breakup, (item: any) =>
    _.has(item, "item.quantity")
  );
  if (hasItemWithQuantity) {
    result.push(
      addError(
        `Extra attribute Quantity provided in quote object i.e not supposed to be provided after on_confirm so invalid quote object`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }
}

const checkOnStatusPacked = async (
  data: any,
  state: string,
  fulfillmentsItemsSet: Set<any>,
  currentCall: any,
  prevCall?: any
): Promise<ValidationError[]> => {
  const result: ValidationError[] = [];

  try {
    if (!data || isObjectEmpty(data)) {
      result.push(
        addError("JSON cannot be empty", ERROR_CODES.INVALID_RESPONSE)
      );
      return result;
    }

    const { context, message } = data;
    if (!message || !context || !message.order || isObjectEmpty(message)) {
      result.push(
        addError(
          "/context, /message, /order or /message/order is missing or empty",
          ERROR_CODES.INVALID_RESPONSE
        )
      );
      return result;
    }

    const { transaction_id } = context;
    const order = message.order;

    try {
      const previousCallPresent = await addActionToRedisSet(
        transaction_id,
        prevCall,
        currentCall
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
        `!!Error while checking previous action call /${currentCall}, ${error.stack}`
      );
    }

    await Promise.all([
      validateContext(context, transaction_id, result),
      validateMessageId(context, result, currentCall),
      validateOrder(order, transaction_id, result, currentCall),
      validateFulfillmentsPacked(
        order,
        transaction_id,
        state,
        fulfillmentsItemsSet,
        result
      ),
      validateTimestamps(
        order,
        context,
        transaction_id,
        result,
        currentCall,
        prevCall
      ),
      validatePayment(order, transaction_id, state, result),
      validateQuote(order, transaction_id, result, currentCall, prevCall),
      validateBilling(order, transaction_id, currentCall, result),
      validateItems(transaction_id, order.items, result, currentCall, prevCall),
      validateTags(order, transaction_id, result, currentCall),
      RedisService.setKey(
        `${transaction_id}_${currentCall}`,
        JSON.stringify(data),
        TTL_IN_SECONDS
      ),
    ]);

    return result;
  } catch (err: any) {
    console.error(
      `!!Some error occurred while checking /${constants.ON_STATUS} API, ${err.stack}`
    );
    result.push(
      addError(
        "Internal Error - The response could not be processed due to an internal error. The SNP should retry the request.",
        ERROR_CODES.INTERNAL_ERROR
      )
    );
    return result;
  }
};

async function validateOrder(
  order: any,
  transaction_id: any,
  result: any,
  currCall: any
) {
  const cnfrmOrdrId = await RedisService.getKey(
    `${transaction_id}_cnfrmOrdrId`
  );
  if (cnfrmOrdrId && order.id !== cnfrmOrdrId) {
    result.push(
      addError(
        `Order id in /${constants.CONFIRM} and /${currCall} do not match`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  if (order.cancellation_terms && order.cancellation_terms.length > 0) {
    result.push(
      addError(
        `'cancellation_terms' in /message/order should not be provided as those are not enabled yet`,
        ERROR_CODES.INVALID_CANCELLATION_TERMS
      )
    );
  }

  if (
    currCall === ApiSequence.ON_STATUS_PENDING &&
    order.state !== "Created" &&
    order.state !== "Accepted"
  ) {
    result.push(
      addError(
        `Order state should be 'Created' or 'Accepted' in /${currCall}. Current state: ${order.state}`,
        ERROR_CODES.INVALID_ORDER_STATE
      )
    );
  }
  if (
    currCall !== ApiSequence.ON_STATUS_PENDING &&
    currCall !== ApiSequence.ON_STATUS_DELIVERED &&
    order.state !== "In-progress"
  ) {
    result.push(
      addError(
        `order/state should be "In-progress" for /${currCall}`,
        ERROR_CODES.INVALID_ORDER_STATE
      )
    );
  }

  if (
    currCall === ApiSequence.ON_STATUS_DELIVERED &&
    order.state !== "Completed"
  ) {
    result.push(
      addError(
        `order/state should be "Completed" for /${currCall}`,
        ERROR_CODES.INVALID_ORDER_STATE
      )
    );
  }

  const providerIdRaw = await RedisService.getKey(
    `${transaction_id}_providerId`
  );
  const providerId = providerIdRaw ? JSON.parse(providerIdRaw) : null;
  if (providerId && order.provider?.id !== providerId) {
    result.push(
      addError(
        `Provider Id mismatches in /${constants.ON_SEARCH} and /${currCall}`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  const providerLocRaw = await RedisService.getKey(
    `${transaction_id}_providerLoc`
  );
  const providerLoc = providerLocRaw ? JSON.parse(providerLocRaw) : null;
  if (providerLoc && order.provider?.locations?.[0]?.id !== providerLoc) {
    result.push(
      addError(
        `provider.locations[0].id mismatches in /${constants.ON_SEARCH} and /${currCall}`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  await RedisService.setKey(
    `${transaction_id}_orderState`,
    JSON.stringify(order.state),
    TTL_IN_SECONDS
  );
}

async function validateFulfillmentsPending(
  order: any,
  transaction_id: any,
  fulfillmentsItemsSet: any,
  result: any,
  currCall: any
) {
  try {
    const [
      itemFlfllmntsRaw,
      providerGpsRaw,
      providerNameRaw,
      buyerGpsRaw,
      buyerAddrRaw,
      fulfillmentTatObjRaw,
      onSelectFulfillmentsRaw,
      onConfirmTimestampRaw,
      providerAddrRaw,
    ] = await Promise.all(
      [
        RedisService.getKey(`${transaction_id}_itemFlfllmnts`),
        RedisService.getKey(`${transaction_id}_providerGps`),
        RedisService.getKey(`${transaction_id}_providerName`),
        RedisService.getKey(`${transaction_id}_buyerGps`),
        RedisService.getKey(`${transaction_id}_buyerAddr`),
        RedisService.getKey(`${transaction_id}_fulfillment_tat_obj`),
        RedisService.getKey(`${transaction_id}_onSelectFulfillments`),
        RedisService.getKey(
          `${transaction_id}_${ApiSequence.ON_CONFIRM}_tmpstmp`
        ),
        RedisService.getKey(`${transaction_id}_providerAddr`),
      ].map(async (promise, index) => {
        try {
          return await promise;
        } catch (error: any) {
          console.error(
            `Error fetching Redis key ${index} for transaction ${transaction_id}: ${error.message}`
          );
          return null;
        }
      })
    );

    const itemFlfllmnts = itemFlfllmntsRaw
      ? JSON.parse(itemFlfllmntsRaw)
      : null;
    const providerGps = providerGpsRaw ? JSON.parse(providerGpsRaw) : null;
    const providerName = providerNameRaw ? JSON.parse(providerNameRaw) : null;
    const buyerGps = buyerGpsRaw ? JSON.parse(buyerGpsRaw) : null;
    const buyerAddr = buyerAddrRaw ? JSON.parse(buyerAddrRaw) : null;
    const fulfillmentTatObj = fulfillmentTatObjRaw
      ? JSON.parse(fulfillmentTatObjRaw)
      : null;
    const onSelectFulfillments = onSelectFulfillmentsRaw
      ? JSON.parse(onSelectFulfillmentsRaw)
      : null;
    const onConfirmTimestamp = onConfirmTimestampRaw
      ? JSON.parse(onConfirmTimestampRaw)
      : null;
    const providerAddr = providerAddrRaw ? JSON.parse(providerAddrRaw) : null;

    // Check for duplicate fulfillment IDs
    const fulfillmentIds = new Set();
    for (const ff of order?.fulfillments || []) {
      if (!ff?.id) {
        console.info(
          `Missing fulfillment ID in /${currCall} for transaction ${transaction_id}`
        );
        result.push(
          addError(
            `Fulfillment Id must be present`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
        continue;
      }
      if (fulfillmentIds.has(ff.id)) {
        console.info(
          `Duplicate fulfillment ID ${ff.id} in /${currCall} for transaction ${transaction_id}`
        );
        result.push(
          addError(
            `Duplicate fulfillment ID ${ff.id} in /${currCall}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }
      fulfillmentIds.add(ff.id);
    }

    const flow = (await RedisService.getKey("flow")) || "2";
    const orderState =
      (await RedisService.getKey(`${transaction_id}_orderState`)) ||
      '"Accepted"';
    const parsedOrderState = JSON.parse(orderState);

    for (const ff of order?.fulfillments || []) {
      const ffId = ff?.id || "unknown";

      // Basic validations
      if (!ff?.type) {
        console.info(
          `Missing fulfillment type for ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        result.push(
          addError(
            `Fulfillment type does not exist in /${currCall} for fulfillment ID ${ffId}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      } else {
        const validTypes = ["Delivery", "Self-Pickup", "Return", "Cancel"];
        if (!validTypes.includes(ff.type)) {
          console.info(
            `Invalid fulfillment type ${ff.type} for ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          result.push(
            addError(
              `Invalid fulfillment type ${
                ff.type
              } for ID ${ffId}; must be one of ${validTypes.join(", ")}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      }

      if (!ff?.["@ondc/org/TAT"]) {
        console.info(
          `Missing TAT for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        if (ff?.type === "Delivery") {
          result.push(
            addError(
              `'TAT' must be provided in message/order/fulfillments[${ffId}]`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      } else if (
        fulfillmentTatObj &&
        fulfillmentTatObj[ffId] !== isoDurToSec(ff["@ondc/org/TAT"])
      ) {
        console.info(
          `TAT mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        result.push(
          addError(
            `TAT Mismatch between /${currCall} i.e ${isoDurToSec(
              ff["@ondc/org/TAT"]
            )} seconds & /${constants.ON_CONFIRM} i.e ${
              fulfillmentTatObj[ffId]
            } seconds for ID ${ffId}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      // Tracking validation
      if (ff?.type !== "Cancel") {
        if (ff?.tracking === undefined || ff?.tracking === null) {
          console.info(
            `Missing tracking key for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          result.push(
            addError(
              `Tracking key must be explicitly true or false for fulfillment ID ${ffId}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else if (typeof ff.tracking !== "boolean") {
          console.info(
            `Invalid tracking type for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          result.push(
            addError(
              `Tracking must be a boolean (true or false) for fulfillment ID ${ffId}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else {
          try {
            const ffTrackingRaw = await RedisService.getKey(
              `${transaction_id}_${ffId}_tracking`
            );
            const ffTracking = ffTrackingRaw ? JSON.parse(ffTrackingRaw) : null;
            if (ffTracking !== null && ffTracking !== ff.tracking) {
              console.info(
                `Tracking mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
              );
              result.push(
                addError(
                  `Fulfillment Tracking mismatch with /${constants.ON_CONFIRM} for ID ${ffId} (expected ${ffTracking}, got ${ff.tracking})`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            }
          } catch (error: any) {
            console.error(
              `Error fetching tracking for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}: ${error.message}`
            );
            result.push(
              addError(
                `Error validating tracking for fulfillment ID ${ffId}`,
                ERROR_CODES.INTERNAL_ERROR
              )
            );
          }
        }
      } else if (ff?.tracking !== undefined) {
        console.info(
          `Tracking key present for Cancel fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        result.push(
          addError(
            `Tracking key must not be present for Cancel fulfillment ID ${ffId}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      // State validations
      const ffDesc = ff?.state?.descriptor;
      if (ff.type === "Delivery") {
        if (!ffDesc?.code || ffDesc.code !== "Pending") {
          console.info(
            `Invalid state for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          result.push(
            addError(
              `Fulfillment state should be 'Pending' for ID ${ffId} in /${currCall}`,
              ERROR_CODES.INVALID_ORDER_STATE
            )
          );
        } else if (
          parsedOrderState !== "Created" &&
          parsedOrderState !== "Accepted"
        ) {
          console.info(
            `Fulfillment state Pending incompatible with order state ${parsedOrderState} for ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          result.push(
            addError(
              `Fulfillment state 'Pending' is incompatible with order state ${parsedOrderState} for ID ${ffId}`,
              ERROR_CODES.INVALID_ORDER_STATE
            )
          );
        }
      }

      if (ffDesc?.short_desc && typeof ffDesc.short_desc !== "string") {
        console.info(
          `Invalid state.descriptor.short_desc for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        result.push(
          addError(
            `fulfillments[${ffId}].state.descriptor.short_desc must be a string`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      // Location validations
      if (ff.type === "Delivery") {
        if (!ff?.start || !ff?.end) {
          console.info(
            `Missing start or end location for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          result.push(
            addError(
              `fulfillments[${ffId}] start and end locations are mandatory`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else {
          // GPS validations
          const gpsPattern = /^-?\d{1,3}\.\d+,-?\d{1,3}\.\d+$/;
          if (!ff?.start?.location?.gps) {
            console.info(
              `Missing start.location.gps for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].start.location.gps is required`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else if (!gpsPattern.test(ff.start.location.gps)) {
            console.info(
              `Invalid GPS format for start.location.gps in fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].start.location.gps must be in 'latitude,longitude' format`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else if (
            providerGps &&
            !compareCoordinates(ff.start.location.gps, providerGps)
          ) {
            console.info(
              `Start GPS mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `store gps location /fulfillments[${ffId}]/start/location/gps can't change`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          }

          if (!ff?.end?.location?.gps) {
            console.info(
              `Missing end.location.gps for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].end.location.gps is required`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else if (!gpsPattern.test(ff.end.location.gps)) {
            console.info(
              `Invalid GPS format for end.location.gps in fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].end.location.gps must be in 'latitude,longitude' format`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else if (buyerGps && !_.isEqual(ff.end.location.gps, buyerGps)) {
            console.info(
              `End GPS mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].end.location.gps does not match gps in /${constants.SELECT}`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          }

          // Address validations
          if (!ff?.start?.location?.address) {
            console.info(
              `Missing start.location.address for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].start.location.address is required`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else {
            const requiredFields = ["locality", "area_code", "city", "state"];
            for (const field of requiredFields) {
              if (!ff?.start?.location?.address?.[field]) {
                console.info(
                  `Missing start.location.address.${field} for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
                );
                result.push(
                  addError(
                    `fulfillments[${ffId}].start.location.address.${field} is required`,
                    ERROR_CODES.INVALID_RESPONSE
                  )
                );
              }
            }
            if (
              providerAddr &&
              !_.isEqual(ff.start.location.address, providerAddr)
            ) {
              console.info(
                `Start address mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
              );
              result.push(
                addError(
                  `fulfillments[${ffId}].start.location.address does not match address in /${constants.ON_SEARCH}`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            }
          }

          if (!ff?.end?.location?.address) {
            console.info(
              `Missing end.location.address for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].end.location.address is required`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else {
            if (!ff?.end?.location?.address?.area_code) {
              console.info(
                `Missing end.location.address.area_code for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
              );
              result.push(
                addError(
                  `fulfillments[${ffId}].end.location.address.area_code is required`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            } else if (
              buyerAddr &&
              !_.isEqual(ff.end.location.address.area_code, buyerAddr)
            ) {
              console.info(
                `End area_code mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
              );
              result.push(
                addError(
                  `fulfillments[${ffId}].end.location.address.area_code does not match area_code in /${constants.SELECT}`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            }
            if (ff.type === "Delivery") {
              const requiredFields = ["building", "city", "state", "country"];
              for (const field of requiredFields) {
                if (!ff?.end?.location?.address?.[field]) {
                  console.info(
                    `Missing end.location.address.${field} for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
                  );
                  result.push(
                    addError(
                      `fulfillments[${ffId}].end.location.address.${field} is required for Delivery`,
                      ERROR_CODES.INVALID_RESPONSE
                    )
                  );
                }
              }
            }
          }
        }
      }
      // Contact
      if (ff.type === "Delivery") {
        if (!ff?.start?.contact?.phone) {
          console.info(
            `Missing start.contact.phone for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          result.push(
            addError(
              `fulfillments[${ffId}].start.contact.phone is required`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else {
          const phonePattern = /^\+?\d{10,15}$/;
          if (!phonePattern.test(ff.start.contact.phone)) {
            console.info(
              `Invalid phone format for start.contact.phone in fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].start.contact.phone must be a valid phone number`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          }
        }
      }

      if (ff.type === "Delivery") {
        if (!ff?.end?.contact?.phone) {
          console.info(
            `Missing end.contact.phone for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          result
            .push
            // addError(
            //   `fulfillments[${ffId}].end.contact.phone is required`,
            //   ERROR_CODES.INVALID_RESPONSE
            // )
            ();
        } else {
          const phonePattern = /^\+?\d{10,15}$/;
          if (!phonePattern.test(ff.end.contact.phone)) {
            console.info(
              `Invalid phone format for end.contact.phone in fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].end.contact.phone must be a valid phone number`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          }
        }
      }
      // Agent validations
      if (ff?.type === "Delivery" && ff?.agent) {
        if (
          !ff?.agent?.name ||
          typeof ff.agent.name !== "string" ||
          ff.agent.name.trim() === ""
        ) {
          console.info(
            `Invalid agent.name for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          result.push(
            addError(
              `fulfillments[${ffId}].agent.name must be a non-empty string if agent is provided`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
        if (ff?.agent?.phone) {
          const phonePattern = /^\+?\d{10,15}$/;
          if (!phonePattern.test(ff.agent.phone)) {
            console.info(
              `Invalid agent.phone format for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].agent.phone must be a valid phone number if provided`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          }
        }
      }

      // Time validations
      if (ff?.start?.time) {
        if (!ff?.start?.time?.timestamp && !ff?.start?.time?.range) {
          console.info(
            `Invalid start.time format for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          result.push(
            addError(
              `fulfillments[${ffId}].start.time must have timestamp or range`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else if (ff?.start?.time?.range) {
          if (!ff?.start?.time?.range?.start || !ff?.start?.time?.range?.end) {
            console.info(
              `Missing start.time.range fields for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].start.time.range must have start and end timestamps`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else if (
            new Date(ff.start.time.range.end) <=
            new Date(ff.start.time.range.start)
          ) {
            console.info(
              `Invalid start.time.range for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].start.time.range.end must be after range.start`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          }
          if (onSelectFulfillments) {
            const selectFf = onSelectFulfillments.find(
              (f: any) => f.id === ffId
            );
            if (
              selectFf?.start?.time?.range &&
              !_.isEqual(ff.start.time.range, selectFf.start.time.range)
            ) {
              console.info(
                `start.time.range mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
              );
              result.push(
                addError(
                  `fulfillments[${ffId}].start.time.range does not match /${constants.ON_SELECT}`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            }
          }
        }
      }

      if (ff?.end?.time) {
        if (!ff?.end?.time?.timestamp && !ff?.end?.time?.range) {
          console.info(
            `Invalid end.time format for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          result.push(
            addError(
              `fulfillments[${ffId}].end.time must have timestamp or range`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else if (ff?.end?.time?.range) {
          if (!ff?.end?.time?.range?.start || !ff?.end?.time?.range?.end) {
            console.info(
              `Missing end.time.range fields for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].end.time.range must have start and end timestamps`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          } else if (
            new Date(ff.end.time.range.end) <= new Date(ff.end.time.range.start)
          ) {
            console.info(
              `Invalid end.time.range for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].end.time.range.end must be after range.start`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          }
          if (onSelectFulfillments) {
            const selectFf = onSelectFulfillments.find(
              (f: any) => f.id === ffId
            );
            if (
              selectFf?.end?.time?.range &&
              !_.isEqual(ff.end.time.range, selectFf.end.time.range)
            ) {
              console.info(
                `end.time.range mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
              );
              result.push(
                addError(
                  `fulfillments[${ffId}].end.time.range does not match /${constants.ON_SELECT}`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            }
          }
        }
        if (ff?.start?.time?.timestamp && ff?.end?.time?.timestamp) {
          if (
            new Date(ff.end.time.timestamp) <= new Date(ff.start.time.timestamp)
          ) {
            console.info(
              `end.time.timestamp not after start.time.timestamp for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].end.time.timestamp must be after start.time.timestamp`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          }
        }
      }

      // Vehicle validations for Self-Pickup
      if (ff?.type === "Self-Pickup" && flow === "3") {
        if (!ff?.vehicle) {
          console.info(
            `Missing vehicle details for Self-Pickup fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          result.push(
            addError(
              `fulfillments[${ffId}].vehicle is required for Self-Pickup`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        } else {
          if (!ff?.vehicle?.category || ff.vehicle.category !== "Kerbside") {
            console.info(
              `Invalid vehicle.category for Self-Pickup fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].vehicle.category must be 'Kerbside' for Self-Pickup`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          }
          if (!ff?.vehicle?.number) {
            console.info(
              `Missing vehicle.number for Self-Pickup fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].vehicle.number is required for Self-Pickup`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          }
          if (onSelectFulfillments) {
            const selectFf = onSelectFulfillments.find(
              (f: any) => f.id === ffId
            );
            if (selectFf?.vehicle && !_.isEqual(ff.vehicle, selectFf.vehicle)) {
              console.info(
                `Vehicle details mismatch for Self-Pickup fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
              );
              result.push(
                addError(
                  `fulfillments[${ffId}].vehicle details do not match /${constants.ON_SELECT}`,
                  ERROR_CODES.INVALID_RESPONSE
                )
              );
            }
          }
        }
      } else if (ff?.vehicle && ff.type === "Cancel") {
        console.info(
          `Vehicle present for Cancel fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        result.push(
          addError(
            `fulfillments[${ffId}].vehicle must not be present for Cancel`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      // Tags validations
      if (ff?.tags) {
        if (onSelectFulfillments) {
          const selectFf = onSelectFulfillments.find((f: any) => f.id === ffId);
          if (selectFf?.tags && !_.isEqual(ff.tags, selectFf.tags)) {
            console.info(
              `Tags mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            result.push(
              addError(
                `fulfillments[${ffId}].tags do not match /${constants.ON_SELECT}`,
                ERROR_CODES.INVALID_RESPONSE
              )
            );
          }
        }
      }

      // Rateable validation
      if (ff?.rateable !== undefined && typeof ff.rateable !== "boolean") {
        console.info(
          `Invalid rateable type for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        result.push(
          addError(
            `fulfillments[${ffId}].rateable must be a boolean`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      // Instructions validation
      if (
        ff?.start?.instructions &&
        typeof ff.start.instructions !== "string"
      ) {
        console.info(
          `Invalid start.instructions format for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        result.push(
          addError(
            `fulfillments[${ffId}].start.instructions must be a string`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }
      if (ff?.end?.instructions && typeof ff.end.instructions !== "string") {
        console.info(
          `Invalid end.instructions format for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        result.push(
          addError(
            `fulfillments[${ffId}].end.instructions must be a string`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }

      if (
        (!providerName ||
          !_.isEqual(ff?.start?.location?.descriptor?.name, providerName)) &&
        ff?.type == "Delivery"
      ) {
        console.info(
          `Start location name mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        result.push(
          addError(
            `store name /fulfillments[${ffId}]/start/location/descriptor/name can't change`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }
    }

    // Delivery fulfillment handling
    try {
      const storedFulfillmentRaw = await RedisService.getKey(
        `${transaction_id}_deliveryFulfillment`
      );
      const storedFulfillment = storedFulfillmentRaw
        ? JSON.parse(storedFulfillmentRaw)
        : null;
      const deliveryFulfillment =
        order?.fulfillments?.filter((f: any) => f?.type === "Delivery") || [];

      if (!storedFulfillment) {
        if (deliveryFulfillment.length > 0) {
          await Promise.all([
            RedisService.setKey(
              `${transaction_id}_deliveryFulfillment`,
              JSON.stringify(deliveryFulfillment[0]),
              TTL_IN_SECONDS
            ),
            RedisService.setKey(
              `${transaction_id}_deliveryFulfillmentAction`,
              JSON.stringify(ApiSequence.ON_STATUS_PENDING),
              TTL_IN_SECONDS
            ),
          ]);
        }
      } else {
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
          ApiSequence.ON_STATUS_PENDING
        );

        if (fulfillmentRangeErrors) {
          fulfillmentRangeErrors.forEach((error: any) => {
            console.info(
              `Time range error for delivery fulfillment in /${currCall} for transaction ${transaction_id}: ${error}`
            );
            result.push(addError(`${error}`, ERROR_CODES.INVALID_RESPONSE));
          });
        }
      }
    } catch (error: any) {
      console.error(
        `Error handling delivery fulfillment for transaction ${transaction_id}: ${error.message}`
      );
      result.push(
        addError(
          `Error processing delivery fulfillment`,
          ERROR_CODES.INTERNAL_ERROR
        )
      );
    }

    // Flow-specific validations
    if (["6", "2", "3", "5"].includes(flow)) {
      if (!order?.fulfillments?.length) {
        console.info(
          `Missing fulfillments for flow ${flow} in /${currCall} for transaction ${transaction_id}`
        );
        result.push(
          addError(
            `missingFulfillments is mandatory for ${ApiSequence.ON_STATUS_PENDING}`,
            ERROR_CODES.ORDER_VALIDATION_FAILURE
          )
        );
      } else {
        const deliveryObjArr = order.fulfillments.filter(
          (f: any) => f?.type === "Delivery"
        );
        const selfPickupObjArr = order.fulfillments.filter(
          (f: any) => f?.type === "Self-Pickup"
        );
        if (flow !== "3" && !deliveryObjArr.length) {
          console.info(
            `Missing Delivery fulfillment in /${currCall} for transaction ${transaction_id}`
          );
          result.push(
            addError(
              `Delivery fulfillment must be present in ${ApiSequence.ON_STATUS_PENDING}`,
              ERROR_CODES.ORDER_VALIDATION_FAILURE
            )
          );
        }
        if (flow === "3" && selfPickupObjArr.length !== 1) {
          console.info(
            `Invalid number of Self-Pickup fulfillments in /${currCall} for transaction ${transaction_id}`
          );
          result.push(
            addError(
              `Exactly one Self-Pickup fulfillment must be present in ${ApiSequence.ON_STATUS_PENDING}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }

        if (deliveryObjArr.length > 0) {
          try {
            const deliverObj = { ...deliveryObjArr[0] };
            delete deliverObj?.state;
            delete deliverObj?.tags;
            delete deliverObj?.start?.instructions;
            delete deliverObj?.end?.instructions;
            fulfillmentsItemsSet.add(deliverObj);
            await RedisService.setKey(
              `${transaction_id}_fulfillmentsItemsSet`,
              JSON.stringify([...fulfillmentsItemsSet]),
              TTL_IN_SECONDS
            );
          } catch (error: any) {
            console.error(
              `Error storing delivery fulfillment ID for transaction ${transaction_id}: ${error.message}`
            );
            result.push(
              addError(
                `Error storing delivery fulfillment ID`,
                ERROR_CODES.INTERNAL_ERROR
              )
            );
          }
        }
      }
    }
  } catch (error: any) {
    console.error(
      `Error in validateFulfillments for transaction ${transaction_id}: ${error.stack}`
    );
    result.push(
      addError(
        `Internal error validating fulfillments`,
        ERROR_CODES.INTERNAL_ERROR
      )
    );
  }
}

async function validateBilling(
  order: any,
  transaction_id: any,
  currentCall: any,
  result: any
) {
  const billingRaw = await RedisService.getKey(`${transaction_id}_billing`);
  const billing = billingRaw ? JSON.parse(billingRaw) : null;
  const billingErrors = billing && compareObjects(billing, order.billing);
  if (billingErrors) {
    billingErrors.forEach((error: any) =>
      result.push(
        addError(
          `${error} when compared with confirm billing object in /${currentCall}`,
          ERROR_CODES.INVALID_RESPONSE
        )
      )
    );
  }
}

async function validateTags(
  order: any,
  transaction_id: any,
  result: any,
  currCall: any
) {
  const bpp_terms_obj = order.tags?.find(
    (item: any) => item?.code === "bpp_terms"
  );
  const list = bpp_terms_obj?.list || [];
  const np_type_arr = list.filter((item: any) => item.code === "np_type");
  const accept_bap_terms = list.filter(
    (item: any) => item.code === "accept_bap_terms"
  );
  const np_type_on_search = await RedisService.getKey(
    `${transaction_id}_${ApiSequence.ON_SEARCH}np_type`
  );

  // if (np_type_arr.length === 0) {
  //   result.push(
  //     addError(
  //       `np_type not found in ${currCall}`,
  //       ERROR_CODES.INVALID_RESPONSE
  //     )
  //   );
  // } else {
  //   const np_type = np_type_arr[0].value;
  //   if (np_type !== np_type_on_search) {
  //     result.push(
  //       addError(
  //         `np_type of ${constants.ON_SEARCH} is not same to np_type of ${currCall}`,
  //         ERROR_CODES.INVALID_RESPONSE
  //       )
  //     );
  //   }
  // }

  if (accept_bap_terms.length > 0) {
    result.push(
      addError(
        `accept_bap_terms is not required for now`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  let tax_number = "";
  let provider_tax_number = "";
  list.forEach((item: any) => {
    if (item.code === "tax_number") {
      if (item.value.length !== 15) {
        result.push(
          addError(
            `Number of digits in tax number in message.order.tags[0].list should be 15`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      } else {
        tax_number = item.value;
        const taxNumberPattern =
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!taxNumberPattern.test(tax_number)) {
          result.push(
            addError(
              `Invalid format for tax_number in ${currCall}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      }
    }
    if (item.code === "provider_tax_number") {
      if (item.value.length !== 10) {
        result.push(
          addError(
            `Number of digits in provider tax number in message.order.tags[0].list should be 10`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      } else {
        provider_tax_number = item.value;
        const taxNumberPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!taxNumberPattern.test(provider_tax_number)) {
          result.push(
            addError(
              `Invalid format for provider_tax_number in ${currCall}`,
              ERROR_CODES.INVALID_RESPONSE
            )
          );
        }
      }
    }
  });

  if (tax_number.length === 15 && provider_tax_number.length === 10) {
    const pan_id = tax_number.slice(2, 12);
    if (pan_id !== provider_tax_number && np_type_on_search === "ISN") {
      result.push(
        addError(
          `Pan_id is different in tax_number and provider_tax_number in message.order.tags[0].list`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    } else if (pan_id === provider_tax_number && np_type_on_search === "MSN") {
      result.push(
        addError(
          `Pan_id shouldn't be same in tax_number and provider_tax_number in message.order.tags[0].list`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }
  }

  const confirm_tagsRaw = await RedisService.getKey(
    `${transaction_id}_confirm_tags`
  );
  const confirm_tags = confirm_tagsRaw ? JSON.parse(confirm_tagsRaw) : null;
  if (order.tags && confirm_tags) {
    if (!areGSTNumbersMatching(confirm_tags, order.tags, "bpp_terms")) {
      result.push(
        addError(
          `Tags should have same and valid gst_number as passed in /${constants.CONFIRM}`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }
  }

  const list_ON_CONFIRM = bpp_terms_obj?.list || [];
  const list_ON_INITRaw = await RedisService.getKey(
    `${transaction_id}_list_ON_INIT`
  );
  const list_ON_INIT = list_ON_INITRaw ? JSON.parse(list_ON_INITRaw) : null;
  if (list_ON_INIT) {
    let ON_INIT_val = "";
    list_ON_INIT.forEach((data: any) => {
      if (data.code === "tax_number") ON_INIT_val = data.value;
    });
    list_ON_CONFIRM.forEach((data: any) => {
      if (
        data.code === "tax_number" &&
        ON_INIT_val &&
        data.value !== ON_INIT_val
      ) {
        result.push(
          addError(
            `Value of tax Number mismatched in message/order/tags/bpp_terms for ${constants.ON_INIT} and ${currCall}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      }
    });
  }
}

async function validateItems(
  transactionId: any,
  items: any,
  result: any,
  currCall: any,
  prevCall?: any
) {
  const options = {
    currentApi: currCall,
    previousApi: prevCall,
    checkParentItemId: true,
    checkQuantity: true,
    checkTags: true,
    checkLocationId: true,
  };
  const {
    currentApi,
    previousApi,
    checkParentItemId,
    checkQuantity,
    checkTags,
    checkLocationId,
  } = options;

  try {
    if (!Array.isArray(items) || items.length === 0) {
      result.push({
        valid: false,
        code: ERROR_CODES.INVALID_RESPONSE,
        description: `items array is missing or empty in /${currentApi}`,
      });
      return result;
    }

    const redisKeys = [
      RedisService.getKey(`${transactionId}_itemFlfllmnts`),
      RedisService.getKey(`${transactionId}_itemsIdList`),
    ];
    if (checkParentItemId) {
      redisKeys.push(RedisService.getKey(`${transactionId}_parentItemIdSet`));
    }
    if (checkTags) {
      redisKeys.push(
        RedisService.getKey(`${transactionId}_select_customIdArray`)
      );
    }
    if (checkLocationId) {
      redisKeys.push(RedisService.getKey(`${transactionId}_onSearchItems`));
    }

    const redisResults = await Promise.all(
      redisKeys.map(async (key: any, index: any) => {
        try {
          return await key;
        } catch (error: any) {
          console.error(
            `!!Error fetching Redis key ${index} for transaction ${transactionId}: ${error.message}`
          );
          return null;
        }
      })
    );

    const [
      itemFlfllmntsRaw,
      itemsIdListRaw,
      parentItemIdSetRaw,
      customIdArrayRaw,
      onSearchItemsRaw,
    ] = redisResults;

    const itemFlfllmnts = itemFlfllmntsRaw
      ? JSON.parse(itemFlfllmntsRaw)
      : null;
    let itemsIdList = itemsIdListRaw ? JSON.parse(itemsIdListRaw) : null;
    const parentItemIdSet = parentItemIdSetRaw
      ? JSON.parse(parentItemIdSetRaw)
      : null;
    const select_customIdArray = customIdArrayRaw
      ? JSON.parse(customIdArrayRaw)
      : null;
    const allOnSearchItems = onSearchItemsRaw
      ? JSON.parse(onSearchItemsRaw)
      : [];
    const onSearchItems = Array.isArray(allOnSearchItems)
      ? allOnSearchItems.flat()
      : [];

    let itemsCountChange = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemId = item?.id;

      if (!itemId || typeof itemId !== "string" || itemId.trim() === "") {
        console.info(
          `Missing or invalid item ID at index ${i} for transaction ${transactionId}`
        );
        result.push({
          valid: false,
          code: ERROR_CODES.INVALID_RESPONSE,
          description: `items[${i}].id is missing or invalid in /${currentApi}`,
        });
        continue;
      }

      if (!itemFlfllmnts || !(itemId in itemFlfllmnts)) {
        console.info(
          `Item ID ${itemId} not found in /${previousApi} at index ${i} for transaction ${transactionId}`
        );
        result.push({
          valid: false,
          code: ERROR_CODES.INVALID_RESPONSE,
          description: `Item Id ${itemId} does not exist in /${previousApi}`,
        });
        continue;
      }

      if (checkQuantity) {
        if (!item.quantity || item.quantity.count == null) {
          console.info(
            `Missing quantity.count for item ID ${itemId} at index ${i} for transaction ${transactionId}`
          );
          result.push({
            valid: false,
            code: ERROR_CODES.INVALID_RESPONSE,
            description: `items[${i}].quantity.count is missing or undefined for Item ${itemId} in /${currentApi}`,
          });
        } else if (
          !Number.isInteger(item.quantity.count) ||
          item.quantity.count < 0
        ) {
          console.info(
            `Invalid quantity.count for item ID ${itemId} at index ${i} for transaction ${transactionId}`
          );
          result.push({
            valid: false,
            code: ERROR_CODES.INVALID_RESPONSE,
            description: `items[${i}].quantity.count must be a positive integer for Item ${itemId} in /${currentApi}`,
          });
        }
      }

      if (checkParentItemId) {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        const typeTag = tags.find((tag: any) => tag.code === "type");
        const typeValue = typeTag?.list?.find(
          (listItem: any) => listItem.code === "type"
        )?.value;
        const isItemType = typeValue === "item";
        const isCustomizationType = typeValue === "customization";

        if (
          (isItemType || isCustomizationType) &&
          (!item.parent_item_id || item.parent_item_id.trim() === "")
        ) {
          console.info(
            `Missing parent_item_id for item ID: ${itemId} at index ${i} for transaction ${transactionId}`
          );
          result.push({
            valid: false,
            code: ERROR_CODES.INVALID_RESPONSE,
            description: `items[${i}]: parent_item_id is required and must be non-empty for items with type 'item' or 'customization' in /${currentApi}`,
          });
        }

        if (item.parent_item_id && !(isItemType || isCustomizationType)) {
          console.info(
            `Missing type tag for item with parent_item_id: ${item.parent_item_id}, ID: ${itemId} at index ${i} for transaction ${transactionId}`
          );
          result.push({
            valid: false,
            code: ERROR_CODES.INVALID_RESPONSE,
            description: `items[${i}]: items with parent_item_id must have a type tag of 'item' or 'customization' in /${currentApi}`,
          });
        }

        if (
          item.parent_item_id &&
          parentItemIdSet &&
          !parentItemIdSet.includes(item.parent_item_id)
        ) {
          console.info(
            `Parent item ID ${item.parent_item_id} not found in parentItemIdSet for item ID: ${itemId} at index ${i} for transaction ${transactionId}`
          );
          result.push({
            valid: false,
            code: ERROR_CODES.INVALID_RESPONSE,
            description: `items[${i}].parent_item_id ${item.parent_item_id} not found in parentItemIdSet for Item ${itemId} in /${currentApi}`,
          });
        }

        if (checkTags && isCustomizationType && select_customIdArray) {
          const parentTag = tags.find((tag: any) => tag.code === "parent");
          if (!parentTag) {
            console.info(
              `Missing parent tag for customization item ID: ${itemId} at index ${i} for transaction ${transactionId}`
            );
            result.push({
              valid: false,
              code: ERROR_CODES.INVALID_RESPONSE,
              description: `items[${i}]: customization items must have a parent tag in /${currentApi}`,
            });
          } else {
            const parentId = parentTag.list?.find(
              (listItem: any) => listItem.code === "id"
            )?.value;
            if (!parentId || !select_customIdArray.includes(parentId)) {
              console.info(
                `Invalid or missing parent tag id: ${parentId} for customization item ID: ${itemId} at index ${i} for transaction ${transactionId}`
              );
              result.push({
                valid: false,
                code: ERROR_CODES.INVALID_RESPONSE,
                description: `items[${i}]: parent tag id ${
                  parentId || "missing"
                } must be valid and present in select_customIdArray for customization item ${itemId} in /${currentApi}`,
              });
            }
          }
        }
      }

      if (checkLocationId) {
        if (
          !item.location_id ||
          typeof item.location_id !== "string" ||
          item.location_id.trim() === ""
        ) {
          // console.info(`Missing or invalid location_id for item ID: ${itemId} at index ${i} for transaction ${transactionId}`);
          // result.push({
          //   valid: false,
          //   code: ERROR_CODES.INVALID_RESPONSE,
          //   description: `items[${i}]: location_id is required and must be a non-empty string in /${currentApi}`,
          // });
        } else if (onSearchItems.length > 0) {
          const matchingSearchItem = onSearchItems.find(
            (searchItem: any) => searchItem.id === itemId
          );
          if (matchingSearchItem) {
            const isCustomization = tagFinder(
              matchingSearchItem,
              "customization"
            );
            const isNotCustomization = !isCustomization;
            if (
              isNotCustomization &&
              matchingSearchItem.location_id !== item.location_id
            ) {
              console.info(
                `Location_id mismatch for item ID: ${itemId} at index ${i} for transaction ${transactionId}`
              );
              result.push({
                valid: false,
                code: ERROR_CODES.INVALID_RESPONSE,
                description: `items[${i}]: location_id ${item.location_id} for item ${itemId} does not match location_id in /${constants.ON_SEARCH}`,
              });
            }
          } else {
            console.info(
              `Item ${itemId} not found in /${constants.ON_SEARCH} for location_id validation at index ${i} for transaction ${transactionId}`
            );
            result.push({
              valid: false,
              code: ERROR_CODES.INVALID_RESPONSE,
              description: `items[${i}]: item ${itemId} not found in /${constants.ON_SEARCH} for location_id validation`,
            });
          }
        }
      }

      if (
        checkTags &&
        select_customIdArray &&
        checkItemTag(item, select_customIdArray)
      ) {
        console.info(
          `Custom ID tag mismatch for item ID: ${itemId} at index ${i} for transaction ${transactionId}`
        );
        result.push({
          valid: false,
          code: ERROR_CODES.INVALID_RESPONSE,
          description: `items[${i}].tags.parent_id mismatches for Item ${itemId} in /${previousApi} and /${currentApi}`,
        });
      }
    }

    if (checkQuantity && itemsCountChange) {
      await RedisService.setKey(
        `${transactionId}_itemsIdList`,
        JSON.stringify(itemsIdList),
        TTL_IN_SECONDS
      );
    }

    return result;
  } catch (error: any) {
    console.error(
      `!!Error while validating items in /${currentApi} for transaction ${transactionId}: ${error.stack}`
    );
    result.push({
      valid: false,
      code: ERROR_CODES.INTERNAL_ERROR,
      description: `Error occurred while validating items in /${currentApi}`,
    });
    return result;
  }
}

const checkOnStatusPending = async (
  data: any,
  state: any,
  fulfillmentsItemsSet: any,
  currentCall: any,
  prevCall?: any
) => {
  const result = [];

  try {
    if (!data || isObjectEmpty(data)) {
      result.push(
        addError("JSON cannot be empty", ERROR_CODES.INVALID_RESPONSE)
      );
      return result;
    }

    const { context, message } = data;
    if (!message || !context || !message.order || isObjectEmpty(message)) {
      result.push(
        addError(
          "/context, /message, /order or /message/order is missing or empty",
          ERROR_CODES.INVALID_RESPONSE
        )
      );
      return result;
    }

    const onConfirmOrderState = await RedisService.getKey(
      `${context.transaction_id}_${ApiSequence.ON_CONFIRM}_orderState`
    );

    if (onConfirmOrderState === "Accepted") {
      result.push({
        valid: false,
        code: ERROR_CODES.INVALID_ORDER_STATE,
        description: `When the onConfirm Order State is 'Accepted', the ${currentCall} is not required!`,
      });
      return result;
    }

    const { transaction_id } = context;
    const order = message.order;

    try {
      const previousCallPresent = await addActionToRedisSet(
        transaction_id,
        ApiSequence.ON_CONFIRM,
        currentCall
      );
      if (!previousCallPresent) {
        result.push({
          valid: false,
          code: ERROR_CODES.OUT_OF_SEQUENCE,
          description: `Previous call /${constants.ON_CONFIRM} doesn't exist`,
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while checking previous action call /${currentCall}, ${error.stack}`
      );
    }

    await Promise.all([
      validateContext(context, transaction_id, result),
      validateMessageId(context, result, currentCall),
      validateOrder(order, transaction_id, result, currentCall),
      validateFulfillmentsPending(
        order,
        transaction_id,
        fulfillmentsItemsSet,
        result,
        currentCall
      ),
      validateTimestamps(
        order,
        context,
        transaction_id,
        result,
        currentCall,
        prevCall
      ),
      validatePayment(order, transaction_id, state, result),
      validateQuote(order, transaction_id, result, currentCall, prevCall),
      validateBilling(order, transaction_id, currentCall, result),
      validateItems(transaction_id, order.items, result, currentCall, prevCall),
      validateTags(order, transaction_id, result, currentCall),
      RedisService.setKey(
        `${transaction_id}_${currentCall}`,
        JSON.stringify(data),
        TTL_IN_SECONDS
      ),
    ]);

    return result;
  } catch (err: any) {
    console.error(
      `!!Some error occurred while checking /${constants.ON_STATUS} API, ${err.stack}`
    );
    result.push(
      addError(
        "Internal Error - The response could not be processed due to an internal error. The SNP should retry the request.",
        ERROR_CODES.INTERNAL_ERROR
      )
    );
    return result;
  }
};
export const onStatusRouter = async (data: any) => {
  const fulfillments = data?.message?.order?.fulfillments;
  const deliveryFulfillment = fulfillments.find(
    (ff: any) => ff.type === "Delivery"
  );
  const rtoFulfillment = fulfillments.find((ff: any) => ff.type === "RTO");
  let state = "";
  if (!_.isEmpty(rtoFulfillment)) {
    state = rtoFulfillment?.state?.descriptor?.code;
  } else {
    state = deliveryFulfillment?.state?.descriptor?.code;
  }
  const transaction_id = data?.context?.transaction_id;
  let result: any = [];
  let fulfillmentsItemsSetRaw: any = await RedisService.getKey(
    `${transaction_id}_fulfillmentsItemsSet`
  );
  let fulfillmentsItemsSet = new Set(
    fulfillmentsItemsSetRaw ? JSON.parse(fulfillmentsItemsSetRaw) : []
  );

  switch (state) {
    case "Pending":
      result = await checkOnStatusPending(
        data,
        state,
        fulfillmentsItemsSet,
        ApiSequence.ON_STATUS_PENDING,
        ApiSequence.ON_CONFIRM
      );
      break;
    case "Packed":
      result = await checkOnStatusPacked(
        data,
        state,
        fulfillmentsItemsSet,
        ApiSequence.ON_STATUS_PACKED,
        ApiSequence.ON_STATUS_PENDING
      );
      break;
    case "Order-picked-up":
      result = await checkOnStatusPicked(
        data,
        state,
        fulfillmentsItemsSet,
        ApiSequence.ON_STATUS_PICKED,
        ApiSequence.ON_STATUS_PACKED
      );
      break;
    case "Out-for-delivery":
      result = await checkOnStatusOutForDelivery(
        data,
        state,
        fulfillmentsItemsSet,
        ApiSequence.ON_STATUS_OUT_FOR_DELIVERY,
        ApiSequence.ON_STATUS_PICKED
      );
      break;
    case "Order-delivered":
      result = await checkOnStatusDelivered(
        data,
        state,
        fulfillmentsItemsSet,
        ApiSequence.ON_STATUS_DELIVERED,
        ApiSequence.ON_STATUS_OUT_FOR_DELIVERY
      );
      break;
    case "RTO-Disposed":
    case "RTO-Delivered":
      result = await checkOnStatusRTODelivered(data);
      break;
    default:
      result = [
        {
          valid: false,
          code: 400,
          description: `Invalid on_status state: ${state}`,
        },
      ];
      break;
  }
  return result;
};
