import _ from "lodash";
import { RedisService } from "ondc-automation-cache-lib";
import { contextChecker } from "../../../../../utils/contextUtils";
import {
  compareTimeRanges,
  compareObjects,
  compareQuoteObjects,
  compareFulfillmentObject,
  getRedisValue,
  compareCoordinates,
  isoDurToSec,
} from "../../../../../utils/helper";
import constants, { ApiSequence, ROUTING_ENUMS } from "../../../../../utils/constants";

const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;
const ERROR_CODES = {
  INVALID_RESPONSE: 20006,
  INVALID_ORDER_STATE: 20007,
  OUT_OF_SEQUENCE: 20008,
  TIMEOUT: 20009,
  INVALID_CANCELLATION_TERMS: 22505,
  INTERNAL_ERROR: 23001,
  ORDER_VALIDATION_FAILURE: 23002,
};
const addError = (result: any[], code: number, description: string): void => {
  result.push({
    valid: false,
    code,
    description,
  });
};

const storeOrder = async (txnId: string, order: any, result: any[]): Promise<void> => {
  try {
    await Promise.all([
      RedisService.setKey(`${txnId}_cnfrmOrdrId`, JSON.stringify(order.id), TTL_IN_SECONDS),
      RedisService.setKey(`${txnId}_ordrCrtd`, JSON.stringify(order.created_at), TTL_IN_SECONDS),
      RedisService.setKey(`${txnId}_ordrUpdtd`, JSON.stringify(order.updated_at), TTL_IN_SECONDS),
      RedisService.setKey(`${txnId}_orderState`, JSON.stringify(order.state), TTL_IN_SECONDS),
    ]);
  } catch (err: any) {
    addError(result, 21001, `Error storing order details: ${err.message}`);
  }
};

const storeFulfillments = async (txnId: string, fulfillments: any[], state: string, result: any[]): Promise<void> => {
  try {
    const deliveryFulfillment = fulfillments.find((f: any) => f.type === "Delivery");
    if (deliveryFulfillment) {
      await Promise.all([
        RedisService.setKey(
          `${txnId}_deliveryFulfillment`,
          JSON.stringify(deliveryFulfillment),
          TTL_IN_SECONDS
        ),
        RedisService.setKey(
          `${txnId}_deliveryFulfillmentAction`,
          JSON.stringify(state),
          TTL_IN_SECONDS
        ),
      ]);
    }

    const fulfillmentsItemsSet = new Set();
    fulfillments.forEach((ff: any) => {
      const obj: any = { ...ff };
      delete obj?.state;
      delete obj?.start?.time;
      delete obj?.end?.time;
      fulfillmentsItemsSet.add(obj);
    });
    await RedisService.setKey(
      `${txnId}_fulfillmentsItemsSet`,
      JSON.stringify([...fulfillmentsItemsSet]),
      TTL_IN_SECONDS
    );
  } catch (err: any) {
    addError(result, 21002, `Error storing fulfillments: ${err.message}`);
  }
};

const storePayment = async (txnId: string, payment: any, result: any[]): Promise<void> => {
  try {
    await RedisService.setKey(`${txnId}_prevPayment`, JSON.stringify(payment), TTL_IN_SECONDS);
  } catch (err: any) {
    addError(result, 21003, `Error storing payment: ${err.message}`);
  }
};

const storeQuote = async (txnId: string, quote: any, result: any[]): Promise<void> => {
  try {
    await RedisService.setKey(`${txnId}_quotePrice`, JSON.stringify(parseFloat(quote.price.value)), TTL_IN_SECONDS);
  } catch (err: any) {
    addError(result, 21004, `Error storing quote: ${err.message}`);
  }
};

const validateOrder = async (txnId: string, order: any, context: any, currentCall: string, result: any[]): Promise<void> => {
  try {
    const cnfrmOrdrId = await getRedisValue(`${txnId}_cnfrmOrdrId`);
    if (cnfrmOrdrId && cnfrmOrdrId !== order.id) {
      addError(result, 21005, `Order Id mismatches in /${constants.CONFIRM} and /${currentCall}`);
    }

    const providerId = await getRedisValue(`${txnId}_providerId`);
    if (providerId && order.provider?.id !== providerId) {
      addError(result, 21006, `Provider Id mismatches in /${constants.ON_SEARCH} and /${currentCall}`);
    }

    const providerLoc = await getRedisValue(`${txnId}_providerLoc`);
    const locationId = order.provider?.locations?.[0]?.id;
    if (providerLoc && providerLoc !== locationId) {
      addError(result, 21007, `provider.locations[0].id mismatches in /${constants.ON_SEARCH} and /${currentCall}`);
    }

    const contextTime = new Date(context.timestamp).getTime();
    const updatedTime = new Date(order.updated_at).getTime();
    if (isNaN(updatedTime) || updatedTime > contextTime) {
      addError(result, 21008, `order.updated_at cannot be future dated in /${currentCall}`);
    }
  } catch (err: any) {
    addError(result, 21009, `Error validating order: ${err.message}`);
  }
};

const validateFulfillments = async (
  txnId: string,
  fulfillments: any[],
  state: string,
  fulfillmentsItemsSet: Set<any>,
  currentCall: string,
  result: any[]
): Promise<void> => {
  try {
    const [
      itemFlfllmntsRaw,
      providerGpsRaw,
      providerNameRaw,
      buyerGpsRaw,
      buyerAddrRaw,
      storedFulfillmentRaw,
      storedFulfillmentActionRaw,
    ] = await Promise.all([
      getRedisValue(`${txnId}_itemFlfllmnts`),
      getRedisValue(`${txnId}_providerGps`),
      getRedisValue(`${txnId}_providerName`),
      getRedisValue(`${txnId}_buyerGps`),
      getRedisValue(`${txnId}_buyerAddr`),
      getRedisValue(`${txnId}_deliveryFulfillment`),
      getRedisValue(`${txnId}_deliveryFulfillmentAction`),
    ]);

    const itemFlfllmnts = itemFlfllmntsRaw 
    const providerGps = providerGpsRaw 
    const providerName = providerNameRaw
    const buyerGps = buyerGpsRaw 
    const buyerAddr = buyerAddrRaw 
    const storedFulfillment = storedFulfillmentRaw 
    const storedFulfillmentAction = storedFulfillmentActionRaw 

    for (const ff of fulfillments) {
      if (!itemFlfllmnts || !Object.values(itemFlfllmnts).includes(ff.id)) {
        addError(result, 21010, `Fulfillment id ${ff.id || "missing"} does not exist in /${constants.ON_SELECT}`);
      }

      if (ff.type !== "Cancel") {
        const ffTrackingRaw = await getRedisValue(`${txnId}_${ff.id}_tracking`);
        const ffTracking = ffTrackingRaw ? JSON.parse(ffTrackingRaw) : null;
        if (ffTracking !== null && ffTracking !== ff.tracking) {
          addError(result, 21011, `Fulfillment Tracking mismatch with /${constants.ON_SELECT} for ID ${ff.id}`);
        }
      }

      if (ff.start?.location?.gps && providerGps && !compareCoordinates(ff.start.location.gps, providerGps)) {
        addError(result, 21012, `store gps location /fulfillments[${ff.id}]/start/location/gps can't change`);
      }

      if (providerName && !_.isEqual(ff.start?.location?.descriptor?.name, providerName)) {
        addError(result, 21013, `store name /fulfillments[${ff.id}]/start/location/descriptor/name can't change`);
      }

      if (ff.end?.location?.gps && buyerGps && !_.isEqual(ff.end.location.gps, buyerGps)) {
        addError(result, 21014, `fulfillments[${ff.id}].end.location gps mismatches with /${constants.SELECT}`);
      }

      if (ff.end?.location?.address?.area_code && buyerAddr && !_.isEqual(ff.end.location.address.area_code, buyerAddr)) {
        addError(result, 21015, `fulfillments[${ff.id}].end.location.address.area_code mismatches with /${constants.SELECT}`);
      }
    }

    const deliveryFulfillment = fulfillments.find((f: any) => f.type === "Delivery");
    if (deliveryFulfillment && storedFulfillment) {
      const fulfillmentRangeErrors = compareTimeRanges(
        storedFulfillment,
        storedFulfillmentAction,
        deliveryFulfillment,
        currentCall
      );
      if (fulfillmentRangeErrors) {
        fulfillmentRangeErrors.forEach((error: string) => {
          addError(result, 21016, `Fulfillment time range error: ${error}`);
        });
      }
    }

    const flow = (await getRedisValue("flow")) || "2";
    if (["6", "2", "3", "5"].includes(flow)) {
      let i = 0;
      for (const obj1 of fulfillmentsItemsSet) {
        const keys = Object.keys(obj1);
        let obj2 : any = fulfillments.filter((f: any) => f.type === obj1.type);
        let apiSeq =
          obj1.type === "Cancel"
            ? ApiSequence.ON_UPDATE_PART_CANCEL
            : (await getRedisValue(`${txnId}_onCnfrmState`)) === "Accepted"
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
          const errors = compareFulfillmentObject(obj1, obj2, keys, i, apiSeq);
          errors.forEach((item: any) => {
            addError(result, 21017, `Fulfillment comparison error: ${item.errMsg}`);
          });
        } else {
          addError(result, 21018, `Missing fulfillment type '${obj1.type}' in ${currentCall} compared to ${apiSeq}`);
        }
        i++;
      }
    }
  } catch (err: any) {
    addError(result, 21019, `Error validating fulfillments: ${err.message}`);
  }
};

const validateDeliveryTimestamps = async (
  txnId: string,
  order: any,
  context: any,
  result: any[]
): Promise<void> => {
  try {
    const deliveryTimestamps: any = {};
    for (const fulfillment of order.fulfillments || []) {
      if (fulfillment.type !== "Delivery") continue;
      if (fulfillment.state?.descriptor?.code !== constants.ORDER_DELIVERED) continue;

      const pickUpTime = fulfillment.start?.time?.timestamp;
      const deliveryTime = fulfillment.end?.time?.timestamp;
      deliveryTimestamps[fulfillment.id] = deliveryTime;

      const contextTime = new Date(context.timestamp).getTime();
      if (deliveryTime && new Date(deliveryTime).getTime() > contextTime) {
        addError(result, 21020, `delivery timestamp cannot be future dated in /${constants.ON_STATUS}`);
      }

      if (pickUpTime && deliveryTime && new Date(pickUpTime).getTime() >= new Date(deliveryTime).getTime()) {
        addError(result, 21021, `delivery timestamp cannot be less than or equal to pickup timestamp`);
      }

      if (deliveryTime && new Date(order.updated_at).getTime() < new Date(deliveryTime).getTime()) {
        addError(result, 21022, `order.updated_at cannot be less than delivery timestamp`);
      }
    }

    await RedisService.setKey(
      `${txnId}_deliveryTimestamps`,
      JSON.stringify(deliveryTimestamps),
      TTL_IN_SECONDS
    );
  } catch (err: any) {
    addError(result, 21023, `Error validating delivery timestamps: ${err.message}`);
  }
};

const validatePickupTimestamps = async (
  txnId: string,
  order: any,
  context: any,
  result: any[]
): Promise<void> => {
  try {
    const pickupTimestamps: any = {};
    for (const fulfillment of order.fulfillments || []) {
      if (fulfillment.type !== "Delivery") continue;
      if (fulfillment.state?.descriptor?.code !== constants.ORDER_PICKED) continue;

      const pickUpTime = fulfillment.start?.time?.timestamp;
      pickupTimestamps[fulfillment.id] = pickUpTime;

      const contextTime = new Date(context.timestamp).getTime();
      if (pickUpTime && new Date(pickUpTime).getTime() > contextTime) {
        addError(result, 21024, `pickup timestamp cannot be future dated in /${constants.ON_STATUS}`);
      }

      if (pickUpTime && new Date(order.updated_at).getTime() < new Date(pickUpTime).getTime()) {
        addError(result, 21025, `order.updated_at cannot be less than pickup timestamp`);
      }
    }

    await RedisService.setKey(
      `${txnId}_pickupTimestamps`,
      JSON.stringify(pickupTimestamps),
      TTL_IN_SECONDS
    );
  } catch (err: any) {
    addError(result, 21026, `Error validating pickup timestamps: ${err.message}`);
  }
};

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
      addError(result, ERROR_CODES.INVALID_RESPONSE, `${error} when compared with confirm billing object in /${currentCall}`)
     
    );
  }
}

// Validate out-for-delivery timestamps
const validateOutForDeliveryTimestamps = async (
  txnId: string,
  order: any,
  context: any,
  result: any[]
): Promise<void> => {
  try {
    const outforDeliveryTimestamps: any = {};
    for (const fulfillment of order.fulfillments || []) {
      if (fulfillment.type !== "Delivery") continue;
      if (fulfillment.state?.descriptor?.code !== constants.ORDER_OUT_FOR_DELIVERY) continue;

      const outForDeliveryTime = fulfillment.start?.time?.timestamp;
      outforDeliveryTimestamps[fulfillment.id] = outForDeliveryTime;

      const contextTime = new Date(context.timestamp).getTime();
      if (outForDeliveryTime && new Date(outForDeliveryTime).getTime() > contextTime) {
        addError(result, 21027, `out-for-delivery timestamp cannot be future dated in /${constants.ON_STATUS}`);
      }

      if (outForDeliveryTime && new Date(order.updated_at).getTime() < new Date(outForDeliveryTime).getTime()) {
        addError(result, 21028, `order.updated_at cannot be less than out-for-delivery timestamp`);
      }
    }

    await RedisService.setKey(
      `${txnId}_outforDeliveryTimestamps`,
      JSON.stringify(outforDeliveryTimestamps),
      TTL_IN_SECONDS
    );
  } catch (err: any) {
    addError(result, 21029, `Error validating out-for-delivery timestamps: ${err.message}`);
  }
};

// Validate payment
const validatePayment = async (
  txnId: string,
  payment: any,
  quote: any,
  currentCall: string,
  result: any[]
): Promise<void> => {
  try {
    const quotePrice = parseFloat(quote.price.value);
    if (parseFloat(payment.params.amount) !== quotePrice) {
      addError(result, 21030, `Payment amount ${payment.params.amount} does not match quote price ${quotePrice} in /${currentCall}`);
    }

    const prevPaymentRaw = await getRedisValue(`${txnId}_prevPayment`);
    const prevPayment = prevPaymentRaw
    if (prevPayment && !compareObjects(prevPayment, payment)) {
      addError(result, 21031, `payment object mismatches with previous call in /${currentCall}`);
    }
  } catch (err: any) {
    addError(result, 21032, `Error validating payment: ${err.message}`);
  }
};

// Validate quote
const validateQuote = async (
  txnId: string,
  quote: any,
  currentCall: string,
  prevCall: string | undefined,
  result: any[]
): Promise<void> => {
  try {
    let breakupPrice = 0;
    quote.breakup.forEach((element: { price: { value: string } }) => {
      breakupPrice += parseFloat(element.price.value);
    });

    const quotePrice = parseFloat(quote.price.value);
    if (Math.round(quotePrice) !== Math.round(breakupPrice)) {
      addError(result, 21033, `Quoted Price ${quotePrice} does not match breakup price ${breakupPrice} in /${currentCall}`);
    }

    const prevQuoteRaw = await getRedisValue(`${txnId}_quoteObj`);
    const prevQuote = prevQuoteRaw 
    if (prevQuote) {
      const quoteErrors = compareQuoteObjects(prevQuote, quote, prevCall || constants.ON_CONFIRM, currentCall);
      quoteErrors?.forEach((error: string) => {
        addError(result, 21034, `quote: ${error}`);
      });
    }
  } catch (err: any) {
    addError(result, 21035, `Error validating quote: ${err.message}`);
  }
};

const validateItems = async (
  txnId: string,
  items: any[],
  currentCall: string,
  prevCall: string | undefined,
  result: any[]
): Promise<void> => {
  try {
    const [itemFlfllmntsRaw, itemsIdListRaw, parentItemIdSetRaw, selectCustomIdArrayRaw, fulfillmentIdArrayRaw] = await Promise.all([
      getRedisValue(`${txnId}_itemFlfllmnts`),
      getRedisValue(`${txnId}_itemsIdList`),
      getRedisValue(`${txnId}_parentItemIdSet`),
      getRedisValue(`${txnId}_select_customIdArray`),
      getRedisValue(`${txnId}_fulfillmentIdArray`),
    ]);

    const itemFlfllmnts = itemFlfllmntsRaw 
    const itemsIdList = itemsIdListRaw 
    const parentItemIdSet = parentItemIdSetRaw 
    const selectCustomIdArray = selectCustomIdArrayRaw 
    let itemsCountChange = false;
    const updatedItemsIdList = { ...itemsIdList };
    const fulfillmentIdArray = fulfillmentIdArrayRaw 


    items.forEach((item: any, i: number) => {
      const itemId = item.id;
      console.log();
      if (!itemsIdList || !(itemId in itemsIdList)) {
        addError(result, 21036, `Item Id ${itemId} does not exist in /${prevCall || constants.ON_SELECT}`);
      }

      if (itemsIdList && itemId in itemsIdList && item.quantity.count !== itemsIdList[itemId]) {
        updatedItemsIdList[itemId] = item.quantity.count;
        itemsCountChange = true;
        addError(result, 21037, `Warning: items[${i}].quantity.count for item ${itemId} mismatches with /${constants.SELECT}`);
      }
      console.log('Itemfuiffl2122', itemFlfllmnts);
       if (item.fulfillment_id &&   itemFlfllmnts[itemId] != item.fulfillment_id) {
              addError(result, 20026, `items[${i}].fulfillment_id mismatches for Item ${itemId} in /${constants.ON_SELECT} and /${constants.ON_CONFIRM}`);
            }

      if (parentItemIdSet && item.parent_item_id && !parentItemIdSet.includes(item.parent_item_id)) {
        addError(result, 21038, `items[${i}].parent_item_id ${item.parent_item_id} not found in /${constants.ON_SEARCH}`);
      }

      const typeTag = item.tags?.find((tag: any) => tag.code === "type");
      const typeValue = typeTag?.list?.find((listItem: any) => listItem.code === "type")?.value;
      const isCustomizationType = typeValue === "customization";

      if (isCustomizationType && selectCustomIdArray) {
        const parentTag = item.tags?.find((tag: any) => tag.code === "parent");
        if (parentTag) {
          const parentId = parentTag.list?.find((listItem: any) => listItem.code === "id")?.value;
          if (parentId && !selectCustomIdArray.includes(parentId)) {
            addError(result, 21039, `items[${i}]: parent tag id ${parentId} not valid in select_customIdArray`);
          }
        }
      }
    });

    if (itemsCountChange) {
      await RedisService.setKey(`${txnId}_itemsIdList`, JSON.stringify(updatedItemsIdList), TTL_IN_SECONDS);
    }
  } catch (err: any) {
    addError(result, 21040, `Error validating items: ${err.message}`);
  }
};
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
     const fulfillmentIdArrayRaw : any = await RedisService.getKey(`${transaction_id}_fulfillmentIdArray`);
    const fulfillmentIdArray = fulfillmentIdArrayRaw
      ? JSON.parse(fulfillmentIdArrayRaw)
      : null;
    // Check for duplicate fulfillment IDs
    const fulfillmentIds = new Set();
    for (const ff of order?.fulfillments || []) {
   
      if (fulfillmentIds.has(ff.id)) {
        console.info(
          `Duplicate fulfillment ID ${ff.id} in /${currCall} for transaction ${transaction_id}`
        );
        addError(result, ERROR_CODES.INVALID_RESPONSE, `Duplicate fulfillment ID ${ff.id} in /${currCall}`);
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
       if (!fulfillmentIdArray?.includes(ffId)) {
            addError(result, 20034, `fulfillment id ${ffId} does not exist in /${constants.ON_SELECT}`);
            continue
          }
      // Basic validations
      if (!ff?.type) {
        console.info(
          `Missing fulfillment type for ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `Fulfillment type does not exist in /${currCall} for fulfillment ID ${ffId}`
        );
      } else {
        const validTypes = ["Delivery", "Self-Pickup", "Return", "Cancel"];
        if (!validTypes.includes(ff.type)) {
          console.info(
            `Invalid fulfillment type ${ff.type} for ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Invalid fulfillment type ${
              ff.type
            } for ID ${ffId}; must be one of ${validTypes.join(", ")}`
          );
        }
      }

      if (!ff?.["@ondc/org/TAT"]) {
        console.info(
          `Missing TAT for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        if (ff?.type === "Delivery") {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `'TAT' must be provided in message/order/fulfillments[${ffId}]`
          );
        }
      } else if (
        fulfillmentTatObj &&
        fulfillmentTatObj[ffId] !== isoDurToSec(ff["@ondc/org/TAT"])
      ) {
        console.info(
          `TAT mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `TAT Mismatch between /${currCall} i.e ${isoDurToSec(
            ff["@ondc/org/TAT"]
          )} seconds & /${constants.ON_CONFIRM} i.e ${
            fulfillmentTatObj[ffId]
          } seconds for ID ${ffId}`
        );
      }

      // Tracking validation
      if (ff?.type !== "Cancel") {
        if (ff?.tracking === undefined || ff?.tracking === null) {
          console.info(
            `Missing tracking key for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Tracking key must be explicitly true or false for fulfillment ID ${ffId}`
          );
        } else if (typeof ff.tracking !== "boolean") {
          console.info(
            `Invalid tracking type for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Tracking must be a boolean (true or false) for fulfillment ID ${ffId}`
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
              addError(result, ERROR_CODES.INVALID_RESPONSE, `Fulfillment Tracking mismatch with /${constants.ON_CONFIRM} for ID ${ffId} (expected ${ffTracking}, got ${ff.tracking})`);
            }
          } catch (error: any) {
            console.error(
              `Error fetching tracking for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}: ${error.message}`
            );
            addError(result, ERROR_CODES.INTERNAL_ERROR, `Error validating tracking for fulfillment ID ${ffId}`);
          }
        }
      } else if (ff?.tracking !== undefined) {
        console.info(
          `Tracking key present for Cancel fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        addError(result, ERROR_CODES.INVALID_RESPONSE, `Tracking key must not be present for Cancel fulfillment ID ${ffId}`);
      }

      // State validations
      const ffDesc = ff?.state?.descriptor;
      if (ff.type === "Delivery") {
        if (!ffDesc?.code || ffDesc.code !== "Pending") {
          console.info(
            `Invalid state for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          addError(
            result,
            ERROR_CODES.INVALID_ORDER_STATE,
            `Fulfillment state should be 'Pending' for ID ${ffId} in /${currCall}`
          );
        } else if (
          parsedOrderState !== "Created" &&
          parsedOrderState !== "Accepted"
        ) {
          console.info(
            `Fulfillment state Pending incompatible with order state ${parsedOrderState} for ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          addError(
            result,
            ERROR_CODES.INVALID_ORDER_STATE,
            `Fulfillment state 'Pending' is incompatible with order state ${parsedOrderState} for ID ${ffId}`
          );
        }
      }

      if (ffDesc?.short_desc && typeof ffDesc.short_desc !== "string") {
        console.info(
          `Invalid state.descriptor.short_desc for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `fulfillments[${ffId}].state.descriptor.short_desc must be a string`
        );

      }

      // Location validations
      if (ff.type === "Delivery") {
        if (!ff?.start || !ff?.end) {
          console.info(
            `Missing start or end location for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `fulfillments[${ffId}] start and end locations are mandatory`
          );
        } else {
          // GPS validations
          const gpsPattern = /^-?\d{1,3}\.\d+,-?\d{1,3}\.\d+$/;
          if (!ff?.start?.location?.gps) {
            console.info(
              `Missing start.location.gps for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].start.location.gps is required`
            );
          } else if (!gpsPattern.test(ff.start.location.gps)) {
            console.info(
              `Invalid GPS format for start.location.gps in fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].start.location.gps must be in 'latitude,longitude' format`
            );
          } else if (
            providerGps &&
            !compareCoordinates(ff.start.location.gps, providerGps)
          ) {
            console.info(
              `Start GPS mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `store gps location /fulfillments[${ffId}]/start/location/gps can't change`
            );
          }

          if (!ff?.end?.location?.gps) {
            console.info(
              `Missing end.location.gps for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].end.location.gps is required`
            );
          } else if (!gpsPattern.test(ff.end.location.gps)) {
            console.info(
              `Invalid GPS format for end.location.gps in fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].end.location.gps must be in 'latitude,longitude' format`
            );
          } else if (buyerGps && !_.isEqual(ff.end.location.gps, buyerGps)) {
            console.info(
              `End GPS mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].end.location.gps does not match gps in /${constants.SELECT}`
            );
          }

          // Address validations
          if (!ff?.start?.location?.address) {
            console.info(
              `Missing start.location.address for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].start.location.address is required`
            );
          } else {
            const requiredFields = ["locality", "area_code", "city", "state"];
            for (const field of requiredFields) {
              if (!ff?.start?.location?.address?.[field]) {
                console.info(
                  `Missing start.location.address.${field} for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
                );
                addError(
                  result,
                  ERROR_CODES.INVALID_RESPONSE,
                  `fulfillments[${ffId}].start.location.address.${field} is required`
                );
              }
            }
            if(providerAddr){
              const providerAddError = compareObjects(ff.start.location.address, providerAddr)
              providerAddError?.forEach((error: string) => {
                addError(
                  result,
                  ERROR_CODES.INVALID_RESPONSE,
                  `fulfillments[${ffId}].start.location.address error:${error} `
                );
               
              }
              );
            }
           
          }

          if (!ff?.end?.location?.address) {
            console.info(
              `Missing end.location.address for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].end.location.address is required`
            );
          } else {
            if (!ff?.end?.location?.address?.area_code) {
              console.info(
                `Missing end.location.address.area_code for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
              );
              addError(
                result,
                ERROR_CODES.INVALID_RESPONSE,
                `fulfillments[${ffId}].end.location.address.area_code is required`
              );
            } else if (
              buyerAddr &&
              !_.isEqual(ff.end.location.address.area_code, buyerAddr)
            ) {
              console.info(
                `End area_code mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
              );
              addError(
                result,
                ERROR_CODES.INVALID_RESPONSE,
                `fulfillments[${ffId}].end.location.address.area_code does not match area_code in /${constants.SELECT}`
              );
            }
            if (ff.type === "Delivery") {
              const requiredFields = ["building", "city", "state", "country"];
              for (const field of requiredFields) {
                if (!ff?.end?.location?.address?.[field]) {
                  console.info(
                    `Missing end.location.address.${field} for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
                  );
                  addError(
                    result,
                    ERROR_CODES.INVALID_RESPONSE,
                    `fulfillments[${ffId}].end.location.address.${field} is required for Delivery`
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
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `fulfillments[${ffId}].start.contact.phone is required`
          );
        } else {
          const phonePattern = /^\+?\d{10,15}$/;
          if (!phonePattern.test(ff.start.contact.phone)) {
            console.info(
              `Invalid phone format for start.contact.phone in fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].start.contact.phone must be a valid phone number`
            );
          }
        }
      }

      if (ff.type === "Delivery") {
        if (!ff?.end?.contact?.phone) {
          console.info(
            `Missing end.contact.phone for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `fulfillments[${ffId}].end.contact.phone is required`
          );
        } else {
          const phonePattern = /^\+?\d{10,15}$/;
          if (!phonePattern.test(ff.end.contact.phone)) {
            console.info(
              `Invalid phone format for end.contact.phone in fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].end.contact.phone must be a valid phone number`
            );
          }
        }
      }
      if (ff?.type === "Delivery" && ff?.agent) {
        if (
          !ff?.agent?.name ||
          typeof ff.agent.name !== "string" ||
          ff.agent.name.trim() === ""
        ) {
          console.info(
            `Invalid agent.name for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `fulfillments[${ffId}].agent.name must be a non-empty string if agent is provided`
          );
        }
        if (ff?.agent?.phone) {
          const phonePattern = /^\+?\d{10,15}$/;
          if (!phonePattern.test(ff.agent.phone)) {
            console.info(
              `Invalid agent.phone format for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].agent.phone must be a valid phone number if provided`
            );
          }
        }
      }

      if (ff?.start?.time) {
        if (!ff?.start?.time?.timestamp && !ff?.start?.time?.range) {
          console.info(
            `Invalid start.time format for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `fulfillments[${ffId}].start.time must have timestamp or range`
          );
        } else if (ff?.start?.time?.range) {
          if (!ff?.start?.time?.range?.start || !ff?.start?.time?.range?.end) {
            console.info(
              `Missing start.time.range fields for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].start.time.range must have start and end timestamps`
            );
          } else if (
            new Date(ff.start.time.range.end) <=
            new Date(ff.start.time.range.start)
          ) {
            console.info(
              `Invalid start.time.range for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].start.time.range.end must be after range.start`
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
              addError(
                result,
                ERROR_CODES.INVALID_RESPONSE,
                `fulfillments[${ffId}].start.time.range does not match /${constants.ON_SELECT}`
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
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `fulfillments[${ffId}].end.time must have timestamp or range`
          );
        } else if (ff?.end?.time?.range) {
          if (!ff?.end?.time?.range?.start || !ff?.end?.time?.range?.end) {
            console.info(
              `Missing end.time.range fields for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].end.time.range must have start and end timestamps`
            );
          } else if (
            new Date(ff.end.time.range.end) <= new Date(ff.end.time.range.start)
          ) {
            console.info(
              `Invalid end.time.range for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].end.time.range.end must be after range.start`
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
              addError(
                result,
                ERROR_CODES.INVALID_RESPONSE,
                `fulfillments[${ffId}].end.time.range does not match /${constants.ON_SELECT}`
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
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].end.time.timestamp must be after start.time.timestamp`
            );
          }
        }
      }

      if (ff?.type === "Self-Pickup" && flow === "3") {
        if (!ff?.vehicle) {
          console.info(
            `Missing vehicle details for Self-Pickup fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
          );
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `fulfillments[${ffId}].vehicle is required for Self-Pickup`
          );
        } else {
          if (!ff?.vehicle?.category || ff.vehicle.category !== "Kerbside") {
            console.info(
              `Invalid vehicle.category for Self-Pickup fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].vehicle.category must be 'Kerbside' for Self-Pickup`
            );
          }
          if (!ff?.vehicle?.number) {
            console.info(
              `Missing vehicle.number for Self-Pickup fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].vehicle.number is required for Self-Pickup`
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
              addError(
                result,
                ERROR_CODES.INVALID_RESPONSE,
                `fulfillments[${ffId}].vehicle details do not match /${constants.ON_SELECT}`
              );
            }
          }
        }
      } else if (ff?.vehicle && ff.type === "Cancel") {
        console.info(
          `Vehicle present for Cancel fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `fulfillments[${ffId}].vehicle must not be present for Cancel`
        );
      }

      if (ff?.tags) {
        if (onSelectFulfillments) {
          const selectFf = onSelectFulfillments.find((f: any) => f.id === ffId);
          if (selectFf?.tags && !_.isEqual(ff.tags, selectFf.tags)) {
            console.info(
              `Tags mismatch for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
            );
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `fulfillments[${ffId}].tags do not match /${constants.ON_SELECT}`
            );
          }
        }
      }

      if (ff?.rateable !== undefined && typeof ff.rateable !== "boolean") {
        console.info(
          `Invalid rateable type for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `fulfillments[${ffId}].rateable must be a boolean`
        );
      }

      if (
        ff?.start?.instructions &&
        typeof ff.start.instructions !== "string"
      ) {
        console.info(
          `Invalid start.instructions format for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `fulfillments[${ffId}].start.instructions must be a string`
        );
      }
      if (ff?.end?.instructions && typeof ff.end.instructions !== "string") {
        console.info(
          `Invalid end.instructions format for fulfillment ID ${ffId} in /${currCall} for transaction ${transaction_id}`
        );
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `fulfillments[${ffId}].end.instructions must be a string`
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
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `store name /fulfillments[${ffId}]/start/location/descriptor/name can't change`
        );
      }
    }

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
            addError(result, ERROR_CODES.INVALID_RESPONSE, `${error}`);
          });
        }
      }
    } catch (error: any) {
      console.error(
        `Error handling delivery fulfillment for transaction ${transaction_id}: ${error.message}`
      );
      addError(
        result,
        ERROR_CODES.INTERNAL_ERROR,
        `Error processing delivery fulfillment`
      );
    }

    if (["6", "2", "3", "5"].includes(flow)) {
      if (!order?.fulfillments?.length) {
        console.info(
          `Missing fulfillments for flow ${flow} in /${currCall} for transaction ${transaction_id}`
        );
        addError(
          result,
          ERROR_CODES.ORDER_VALIDATION_FAILURE,
          `missingFulfillments is mandatory for ${ApiSequence.ON_STATUS_PENDING}`
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
          addError(
            result,
            ERROR_CODES.ORDER_VALIDATION_FAILURE,
            `Delivery fulfillment must be present in ${ApiSequence.ON_STATUS_PENDING}`
          );
        }
        if (flow === "3" && selfPickupObjArr.length !== 1) {
          console.info(
            `Invalid number of Self-Pickup fulfillments in /${currCall} for transaction ${transaction_id}`
          );
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Exactly one Self-Pickup fulfillment must be present in ${ApiSequence.ON_STATUS_PENDING}`
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
            addError(
              result,
              ERROR_CODES.INTERNAL_ERROR,
              `Error storing delivery fulfillment ID`
            );
          }
        }
      }
    }
  } catch (error: any) {
    console.error(
      `Error in validateFulfillments for transaction ${transaction_id}: ${error.stack}`
    );
    addError(
      result,
      ERROR_CODES.INTERNAL_ERROR,
      `Internal error validating fulfillments`
    );
  }
}

async function validateFulfillmentsPacked(
  order: any,
  transaction_id: string,
  state: string,
  fulfillmentsItemsSet: any,
  result: any
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
      addError(result, ERROR_CODES.INVALID_RESPONSE, `Fulfillment Id must be present`);
    }

    if (!ff.type) {
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `Fulfillment type does not exist in /${constants.ON_STATUS}_${state}`
      );
    }

    if (ff.type !== "Cancel") {
      const ffTrackingRaw = await RedisService.getKey(
        `${transaction_id}_${ff.id}_tracking`
      );
      const ffTracking = ffTrackingRaw ? JSON.parse(ffTrackingRaw) : null;
      if (ffTracking !== null) {
        if (typeof ff.tracking !== "boolean") {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Tracking must be present for fulfillment ID: ${ff.id} in boolean form`
          );
        } else if (ffTracking !== ff.tracking) {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Fulfillment Tracking mismatch with the ${constants.ON_SELECT} call`
          );
        }
      }
    }

    if (ff?.type == "Delivery") {
      if (!itemFlfllmnts || !Object.values(itemFlfllmnts).includes(ff.id)) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `Fulfillment id ${ff.id || "missing"} does not exist in /${constants.ON_SELECT}`
        );
      }

      {
        const ffDesc = ff.state?.descriptor;
        const ffStateCheck =
          ffDesc?.hasOwnProperty("code") && ffDesc.code === "Packed";
        if (!ffStateCheck) {
          addError(
            result,
            ERROR_CODES.INVALID_ORDER_STATE,
            `Fulfillment state should be 'Order-packed' in /${constants.ON_STATUS}_${state}`
          );
        }
      }
      if (!ff.start || !ff.end) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `fulfillments[${ff.id}] start and end locations are mandatory`
        );
      }

      if (
        ff.start?.location?.gps &&
        !compareCoordinates(ff.start.location.gps, providerGps)
      ) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `store gps location /fulfillments[${ff.id}]/start/location/gps can't change`
        );
      }

      if (
        !providerName ||
        !_.isEqual(ff.start?.location?.descriptor?.name, providerName)
      ) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `store name /fulfillments[${ff.id}]/start/location/descriptor/name can't change`
        );
      }

      if (ff.end?.location?.gps && !_.isEqual(ff.end.location.gps, buyerGps)) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `fulfillments[${ff.id}].end.location gps is not matching with gps in /${constants.SELECT}`
        );
      }

      if (
        ff.end?.location?.address?.area_code &&
        !_.isEqual(ff.end.location.address.area_code, buyerAddr)
      ) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `fulfillments[${ff.id}].end.location.address.area_code is not matching with area_code in /${constants.SELECT}`
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
        addError(result, ERROR_CODES.INVALID_RESPONSE, `${error}`);
      });
    }
  }

  const flow = (await RedisService.getKey("flow")) || "2";
  if (["6", "2", "3", "5"].includes(flow)) {
    if (!order.fulfillments?.length) {
      addError(
        result,
        ERROR_CODES.ORDER_VALIDATION_FAILURE,
        `missingFulfillments is mandatory for ${ApiSequence.ON_STATUS_PACKED}`
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
            addError(result, ERROR_CODES.INVALID_RESPONSE, item.errMsg);
          });
        } else {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Missing fulfillment type '${obj1.type}' in ${ApiSequence.ON_STATUS_PACKED} as compared to ${apiSeq}`
          );
        }
        i++;
      }

      const deliveryObjArr = order.fulfillments.filter(
        (f: any) => f.type === "Delivery"
      );
      if (!deliveryObjArr.length) {
        addError(
          result,
          ERROR_CODES.ORDER_VALIDATION_FAILURE,
          `Delivery fulfillment must be present in ${ApiSequence.ON_STATUS_PACKED}`
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

async function validateFulfillmentsPicked(
  order: any,
  transaction_id: string,
  state: string,
  fulfillmentsItemsSet: any,
  result: any
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
    addError(
      result,
      ERROR_CODES.ORDER_VALIDATION_FAILURE,
      `Delivery object is mandatory for ${ApiSequence.ON_STATUS_PICKED}`
    );
  } else {
    const deliveryObj = deliveryObjArr[0];
    if (!deliveryObj.tags) {
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `Tags are mandatory in Delivery Fulfillment for ${ApiSequence.ON_STATUS_PICKED}`
      );
    } else {
      const routingTagArr = deliveryObj.tags.filter(
        (tag: any) => tag.code === "routing"
      );
      if (!routingTagArr.length) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `RoutingTag object is mandatory in Tags of Delivery Object for ${ApiSequence.ON_STATUS_PICKED}`
        );
      } else {
        const routingTag = routingTagArr[0];
        const routingTagList = routingTag.list;
        if (!routingTagList) {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `RoutingTagList is mandatory in RoutingTag of Delivery Object for ${ApiSequence.ON_STATUS_PICKED}`
          );
        } else {
          const routingTagTypeArr = routingTagList.filter(
            (item: any) => item.code === "type"
          );
          if (!routingTagTypeArr.length) {
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `RoutingTagListType object is mandatory in RoutingTag/List of Delivery Object for ${ApiSequence.ON_STATUS_PICKED}`
            );
          } else {
            const routingTagType = routingTagTypeArr[0];
            if (!ROUTING_ENUMS.includes(routingTagType.value)) {
              addError(
                result,
                ERROR_CODES.INVALID_RESPONSE,
                `RoutingTagListType Value is mandatory in RoutingTag of Delivery Object for ${ApiSequence.ON_STATUS_PICKED} and should be equal to 'P2P' or 'P2H2P'`
              );
            }
          }
        }
      }
    }
  }

  for (const ff of order.fulfillments || []) {
    if (!ff.id) {
      addError(result, ERROR_CODES.INVALID_RESPONSE, `Fulfillment Id must be present`);
    }

    if (!ff.type) {
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `Fulfillment type does not exist in /${constants.ON_STATUS}_${state}`
      );
    }

    if (ff.type !== "Cancel") {
      const ffTrackingRaw = await RedisService.getKey(
        `${transaction_id}_${ff.id}_tracking`
      );
      const ffTracking = ffTrackingRaw ? JSON.parse(ffTrackingRaw) : null;
      if (ffTracking !== null) {
        if (typeof ff.tracking !== "boolean") {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Tracking must be present for fulfillment ID: ${ff.id} in boolean form`
          );
        } else if (ffTracking !== ff.tracking) {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Fulfillment Tracking mismatch with the ${constants.ON_SELECT} call`
          );
        }
      }
    }

    if (ff?.type == "Delivery") {
      if (!itemFlfllmnts || !Object.values(itemFlfllmnts).includes(ff.id)) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `Fulfillment id ${ff.id || "missing"} does not exist in /${constants.ON_SELECT}`
        );
      }

      const ffDesc = ff.state?.descriptor;
      const ffStateCheck =
        ffDesc?.hasOwnProperty("code") && ffDesc.code === "Order-picked-up";
      if (!ffStateCheck) {
        addError(
          result,
          ERROR_CODES.INVALID_ORDER_STATE,
          `Fulfillment state should be 'Order-picked' in /${constants.ON_STATUS}_${state}`
        );
      }

      if (!ff.start || !ff.end) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `fulfillments[${ff.id}] start and end locations are mandatory`
        );
      }

      if (
        ff.start?.location?.gps &&
        !compareCoordinates(ff.start.location.gps, providerGps)
      ) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `store gps location /fulfillments[${ff.id}]/start/location/gps can't change`
        );
      }

      if (
        !providerName ||
        !_.isEqual(ff.start?.location?.descriptor?.name, providerName)
      ) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `store name /fulfillments[${ff.id}]/start/location/descriptor/name can't change`
        );
      }

      if (ff.end?.location?.gps && !_.isEqual(ff.end.location.gps, buyerGps)) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `fulfillments[${ff.id}].end.location gps is not matching with gps in /${constants.SELECT}`
        );
      }

      if (
        ff.end?.location?.address?.area_code &&
        !_.isEqual(ff.end.location.address.area_code, buyerAddr)
      ) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `fulfillments[${ff.id}].end.location.address.area_code is not matching with area_code in /${constants.SELECT}`
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
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `Delivery fulfillment (${deliveryFulfillment[0].id}) has incomplete time range.`
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
          addError(result, ERROR_CODES.INVALID_RESPONSE, `${error}`);
        });
      }
    }
  }

  const flow = (await RedisService.getKey("flow")) || "2";
  if (["6", "2", "3", "5"].includes(flow)) {
    if (!order.fulfillments?.length) {
      addError(
        result,
        ERROR_CODES.ORDER_VALIDATION_FAILURE,
        `missingFulfillments is mandatory for ${ApiSequence.ON_STATUS_PICKED}`
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
            addError(result, ERROR_CODES.INVALID_RESPONSE, item.errMsg);
          });
        } else {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Missing fulfillment type '${obj1.type}' in ${ApiSequence.ON_STATUS_PICKED} as compared to ${apiSeq}`
          );
        }
        i++;
      }

      const deliveryObjArr = order.fulfillments.filter(
        (f: any) => f.type === "Delivery"
      );
      if (!deliveryObjArr.length) {
        addError(
          result,
          ERROR_CODES.ORDER_VALIDATION_FAILURE,
          `Delivery fulfillment must be present in ${ApiSequence.ON_STATUS_PICKED}`
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

async function validateFulfillmentsOutDelivery(
  order: any,
  transaction_id: string,
  state: string,
  fulfillmentsItemsSet: any,
  result: any
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
    addError(
      result,
      ERROR_CODES.ORDER_VALIDATION_FAILURE,
      `Delivery object is mandatory for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`
    );
  } else {
    const deliveryObj = deliveryObjArr[0];
    if (!deliveryObj.tags) {
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `Tags are mandatory in Delivery Fulfillment for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`
      );
    } else {
      const routingTagArr = deliveryObj.tags.filter(
        (tag: any) => tag.code === "routing"
      );
      if (!routingTagArr.length) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `RoutingTag object is mandatory in Tags of Delivery Object for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`
        );
      } else {
        const routingTag = routingTagArr[0];
        const routingTagList = routingTag.list;
        if (!routingTagList) {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `RoutingTagList is mandatory in RoutingTag of Delivery Object for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`
          );
        } else {
          const routingTagTypeArr = routingTagList.filter(
            (item: any) => item.code === "type"
          );
          if (!routingTagTypeArr.length) {
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `RoutingTagListType object is mandatory in RoutingTag/List of Delivery Object for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`
            );
          } else {
            const routingTagType = routingTagTypeArr[0];
            if (!ROUTING_ENUMS.includes(routingTagType.value)) {
              addError(
                result,
                ERROR_CODES.INVALID_RESPONSE,
                `RoutingTagListType Value is mandatory in RoutingTag of Delivery Object for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY} and should be equal to 'P2P' or 'P2H2P'`
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
      addError(result, ERROR_CODES.INVALID_RESPONSE, `Fulfillment Id must be present`);
    }

    if (!ff.type) {
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `Fulfillment type does not exist in /${constants.ON_STATUS}_${state}`
      );
    }

    if (ff.type !== "Cancel") {
      const ffTrackingRaw = await RedisService.getKey(
        `${transaction_id}_${ff.id}_tracking`
      );
      const ffTracking = ffTrackingRaw ? JSON.parse(ffTrackingRaw) : null;
      if (ffTracking !== null) {
        if (typeof ff.tracking !== "boolean") {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Tracking must be present for fulfillment ID: ${ff.id} in boolean form`
          );
        } else if (ffTracking !== ff.tracking) {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Fulfillment Tracking mismatch with the ${constants.ON_SELECT} call`
          );
        }
      }
    }

    if (ff?.type == "Delivery") {
      if (!itemFlfllmnts || !Object.values(itemFlfllmnts).includes(ff.id)) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `Fulfillment id ${ff.id || "missing"} does not exist in /${constants.ON_SELECT}`
        );
      }

      const ffDesc = ff.state?.descriptor;
      const ffStateCheck =
        ffDesc?.hasOwnProperty("code") && ffDesc.code === "Out-for-delivery";
      if (!ffStateCheck) {
        addError(
          result,
          ERROR_CODES.INVALID_ORDER_STATE,
          `Fulfillment state should be 'Out-for-delivery' in /${constants.ON_STATUS}_${state}`
        );
      }

      if (!ff.start || !ff.end) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `fulfillments[${ff.id}] start and end locations are mandatory`
        );
      }

      if (
        ff.start?.location?.gps &&
        !compareCoordinates(ff.start.location.gps, providerGps)
      ) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `store gps location /fulfillments[${ff.id}]/start/location/gps can't change`
        );
      }

      if (
        !providerName ||
        !_.isEqual(ff.start?.location?.descriptor?.name, providerName)
      ) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `store name /fulfillments[${ff.id}]/start/location/descriptor/name can't change`
        );
      }

      if (ff.end?.location?.gps && !_.isEqual(ff.end.location.gps, buyerGps)) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `fulfillments[${ff.id}].end.location gps is not matching with gps in /${constants.SELECT}`
        );
      }

      if (
        ff.end?.location?.address?.area_code &&
        !_.isEqual(ff.end.location.address.area_code, buyerAddr)
      ) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `fulfillments[${ff.id}].end.location.address.area_code is not matching with area_code in /${constants.SELECT}`
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
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `Delivery fulfillment (${deliveryFulfillment[0].id}) has incomplete time range.`
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
          addError(result, ERROR_CODES.INVALID_RESPONSE, `${error}`);
        });
      }
    }
  }

  const flow = (await RedisService.getKey("flow")) || "2";
  if (["6", "2", "3", "5"].includes(flow)) {
    if (!order.fulfillments?.length) {
      addError(
        result,
        ERROR_CODES.ORDER_VALIDATION_FAILURE,
        `missingFulfillments is mandatory for ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`
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
            addError(result, ERROR_CODES.INVALID_RESPONSE, item.errMsg);
          });
        } else {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Missing fulfillment type '${obj1.type}' in ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY} as compared to ${apiSeq}`
          );
        }
        i++;
      }

      const deliveryObjArr = order.fulfillments.filter(
        (f: any) => f.type === "Delivery"
      );
      if (!deliveryObjArr.length) {
        addError(
          result,
          ERROR_CODES.ORDER_VALIDATION_FAILURE,
          `Delivery fulfillment must be present in ${ApiSequence.ON_STATUS_OUT_FOR_DELIVERY}`
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

async function validateFulfillmentsDelivered(
  order: any,
  transaction_id: string,
  state: string,
  fulfillmentsItemsSet: any,
  result: any
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
    addError(
      result,
      ERROR_CODES.ORDER_VALIDATION_FAILURE,
      `Delivery object is mandatory for ${ApiSequence.ON_STATUS_DELIVERED}`
    );
  } else {
    const deliveryObj = deliveryObjArr[0];
    if (!deliveryObj.tags) {
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `Tags are mandatory in Delivery Fulfillment for ${ApiSequence.ON_STATUS_DELIVERED}`
      );
    } else {
      const routingTagArr = deliveryObj.tags.filter(
        (tag: any) => tag.code === "routing"
      );
      if (!routingTagArr.length) {
        addError(
          result,
          ERROR_CODES.INVALID_RESPONSE,
          `RoutingTag object is mandatory in Tags of Delivery Object for ${ApiSequence.ON_STATUS_DELIVERED}`
        );
      } else {
        const routingTag = routingTagArr[0];
        const routingTagList = routingTag.list;
        if (!routingTagList) {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `RoutingTagList is mandatory in RoutingTag of Delivery Object for ${ApiSequence.ON_STATUS_DELIVERED}`
          );
        } else {
          const routingTagTypeArr = routingTagList.filter(
            (item: any) => item.code === "type"
          );
          if (!routingTagTypeArr.length) {
            addError(
              result,
              ERROR_CODES.INVALID_RESPONSE,
              `RoutingTagListType object is mandatory in RoutingTag/List of Delivery Object for ${ApiSequence.ON_STATUS_DELIVERED}`
            );
          } else {
            const routingTagType = routingTagTypeArr[0];
            if (!ROUTING_ENUMS.includes(routingTagType.value)) {
              addError(
                result,
                ERROR_CODES.INVALID_RESPONSE,
                `RoutingTagListType Value is mandatory in RoutingTag of Delivery Object for ${ApiSequence.ON_STATUS_DELIVERED} and should be equal to 'P2P' or 'P2H2P'`
              );
            }
          }
        }
      }
    }
  }

  for (const ff of order.fulfillments || []) {
    if (!ff.id) {
      addError(result, ERROR_CODES.INVALID_RESPONSE, `Fulfillment Id must be present`);
    }

    if (!ff.type) {
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `Fulfillment type does not exist in /${state}`
      );
    }

    if (ff.type !== "Cancel") {
      const ffTrackingRaw = await RedisService.getKey(
        `${transaction_id}_${ff.id}_tracking`
      );
      const ffTracking = ffTrackingRaw ? JSON.parse(ffTrackingRaw) : null;
      if (ffTracking !== null) {
        if (typeof ff.tracking !== "boolean") {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Tracking must be present for fulfillment ID: ${ff.id} in boolean form`
          );
        } else if (ffTracking !== ff.tracking) {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Fulfillment Tracking mismatch with the ${constants.ON_SELECT} call`
          );
        }
      }
    }

    if (!itemFlfllmnts || !Object.values(itemFlfllmnts).includes(ff.id)) {
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `Fulfillment id ${ff.id || "missing"} does not exist in /${constants.ON_SELECT}`
      );
    }

    const ffDesc = ff.state?.descriptor;
    const ffStateCheck =
      ffDesc?.hasOwnProperty("code") && ffDesc.code === "Order-delivered";
    if (!ffStateCheck) {
      addError(
        result,
        ERROR_CODES.INVALID_ORDER_STATE,
        `Fulfillment state should be 'Order-delivered' in /${constants.ON_STATUS}_${state}`
      );
    }

    if (!ff.start || !ff.end) {
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `fulfillments[${ff.id}] start and end locations are mandatory`
      );
    }

    if (
      ff.start?.location?.gps &&
      !compareCoordinates(ff.start.location.gps, providerGps)
    ) {
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `store gps location /fulfillments[${ff.id}]/start/location/gps can't change`
      );
    }

    if (
      !providerName ||
      !_.isEqual(ff.start?.location?.descriptor?.name, providerName)
    ) {
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `store name /fulfillments[${ff.id}]/start/location/descriptor/name can't change`
      );
    }

    if (ff.end?.location?.gps && !_.isEqual(ff.end.location.gps, buyerGps)) {
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `fulfillments[${ff.id}].end.location gps is not matching with gps in /${constants.SELECT}`
      );
    }

    if (
      ff.end?.location?.address?.area_code &&
      !_.isEqual(ff.end.location.address.area_code, buyerAddr)
    ) {
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `fulfillments[${ff.id}].end.location.address.area_code is not matching with area_code in /${constants.SELECT}`
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
      addError(
        result,
        ERROR_CODES.INVALID_RESPONSE,
        `Delivery fulfillment (${deliveryFulfillment[0].id}) has incomplete time range.`
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
          addError(result, ERROR_CODES.INVALID_RESPONSE, `${error}`);
        });
      }
    }
  }

  const flow = (await RedisService.getKey("flow")) || "2";
  if (["6", "2", "3", "5"].includes(flow)) {
    if (!order.fulfillments?.length) {
      addError(
        result,
        ERROR_CODES.ORDER_VALIDATION_FAILURE,
        `missingFulfillments is mandatory for ${ApiSequence.ON_STATUS_DELIVERED}`
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
            addError(result, ERROR_CODES.INVALID_RESPONSE, item.errMsg);
          });
        } else {
          addError(
            result,
            ERROR_CODES.INVALID_RESPONSE,
            `Missing fulfillment type '${obj1.type}' in ${ApiSequence.ON_STATUS_DELIVERED} as compared to ${apiSeq}`
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
        addError(
          result,
          ERROR_CODES.ORDER_VALIDATION_FAILURE,
          `Delivery fulfillment must be present in ${ApiSequence.ON_STATUS_DELIVERED}`
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


export const onStatus = async (data: any) => {
  const { context, message } = data;
  const result: any[] = [];
  const txnId = context?.transaction_id;
  const order = message.order;
  const fulfillments = order.fulfillments;

  let fulfillmentsItemsSetRaw = await getRedisValue(`${txnId}_fulfillmentsItemsSet`);
  let fulfillmentsItemsSet = new Set(fulfillmentsItemsSetRaw ? fulfillmentsItemsSetRaw: []);

  const deliveryFulfillment = fulfillments.find((ff: any) => ff.type === "Delivery");
  const rtoFulfillment = fulfillments.find((ff: any) => ff.type === "RTO");
  let state = "";
  if (!_.isEmpty(rtoFulfillment)) {
    state = rtoFulfillment?.state?.descriptor?.code;
  } else {
    state = deliveryFulfillment?.state?.descriptor?.code;
  }

 

  try {
    let currentCall: string;
    let prevCall: string | undefined = constants.ON_CONFIRM;

    switch (state) {
      case "Pending":
        currentCall = ApiSequence.ON_STATUS_PENDING;
        prevCall = ApiSequence.ON_CONFIRM;
        break;
      case "Packed":
        currentCall = ApiSequence.ON_STATUS_PACKED;
        prevCall = ApiSequence.ON_STATUS_PENDING;
        break;
      case "Order-picked-up":
        currentCall = ApiSequence.ON_STATUS_PICKED;
        prevCall = ApiSequence.ON_STATUS_PACKED;
        break;
      case "Out-for-delivery":
        currentCall = ApiSequence.ON_STATUS_OUT_FOR_DELIVERY;
        prevCall = ApiSequence.ON_STATUS_PICKED;
        break;
      case "Order-delivered":
        currentCall = ApiSequence.ON_STATUS_DELIVERED;
        prevCall = ApiSequence.ON_STATUS_OUT_FOR_DELIVERY;
        break;
      // case "RTO-Disposed":
    
      default:
        addError(result, 21041, `Invalid on_status state: ${state}`);
        return result;
    }

     try {
    await contextChecker(context, result, currentCall, prevCall);
  } catch (err: any) {
    addError(result, 21000, `Error checking context: ${err.message}`);
    return result;
  }

   switch(state){
     case "Pending":
       await validateFulfillmentsPending(order, txnId, fulfillmentsItemsSet, result, currentCall);
       break;
     case "Packed":
       await validateFulfillmentsPacked(order, txnId, state, fulfillmentsItemsSet, result);
       break;
     case "Order-picked-up":
       await validateFulfillmentsPicked(order, txnId, state, fulfillmentsItemsSet, result);
       break;
     case "Out-for-delivery":
       await validateFulfillmentsOutDelivery(order, txnId, state, fulfillmentsItemsSet, result);
       break;
     case "Order-delivered":
       await validateFulfillmentsDelivered(order, txnId, state, fulfillmentsItemsSet, result);
       break;

   }

    await Promise.all([
      validateOrder(txnId, order, context, currentCall, result),
      validatePayment(txnId, order.payment, order.quote, currentCall, result),
      validateQuote(txnId, order.quote, currentCall, prevCall, result),
      validateItems(txnId, order.items, currentCall, prevCall, result),
      state === "Order-delivered" ? validateDeliveryTimestamps(txnId, order, context, result) : Promise.resolve(),
      state === "Order-picked-up" ? validatePickupTimestamps(txnId, order, context, result) : Promise.resolve(),
      state === "Out-for-delivery" ? validateOutForDeliveryTimestamps(txnId, order, context, result) : Promise.resolve(),
      storeOrder(txnId, order, result),
      storeFulfillments(txnId, fulfillments, currentCall, result),
      storePayment(txnId, order.payment, result),
      storeQuote(txnId, order.quote, result),
      validateBilling(order, txnId, currentCall, result),
      RedisService.setKey(`${txnId}_${currentCall}`, JSON.stringify(data), TTL_IN_SECONDS),
    ]);

    return result;
  } catch (err: any) {
    console.error(`!!Error in /${constants.ON_STATUS} API: ${err.stack}`);
    addError(result, 21043, `Unexpected error: ${err.message}`);
    return result;
  }
};