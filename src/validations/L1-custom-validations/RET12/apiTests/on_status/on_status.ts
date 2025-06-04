/* eslint-disable no-prototype-builtins */
import _ from "lodash";
import { RedisService } from "ondc-automation-cache-lib";

import constants, {
  ApiSequence,
  PAYMENT_STATUS,
} from "../../../../../utils/constants";
import {
  areTimestampsLessThanOrEqualTo,
  compareObjects,
  compareQuoteObjects,
  compareTimeRanges,
  sumQuoteBreakUp,
} from "../../../../../utils/helper";
import { contextChecker } from "../../../../../utils/contextUtils";

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
const addError = (description: string, code: number): ValidationError => ({
  valid: false,
  code,
  description,
});

async function validateOrder(
  order: any,
  transaction_id: string,
  state: string,
  result: ValidationError[]
): Promise<void> {
  const cnfrmOrdrId = await RedisService.getKey(
    `${transaction_id}_cnfrmOrdrId`
  );
  if (cnfrmOrdrId && order.id !== cnfrmOrdrId) {
    result.push(
      addError(
        `Order id in /${constants.CONFIRM} and /${constants.ON_STATUS} do not match`,
        ERROR_CODES.INVALID_RESPONSE
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
        `Provider Id mismatches in /${constants.ON_SEARCH} and /${constants.ON_STATUS}`,
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
        `provider.locations[0].id mismatches in /${constants.ON_SEARCH} and /${constants.ON_STATUS}`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }
  const provider = order?.provider || {};
  if (Array.isArray(provider.creds) && provider.creds.length > 0) {
    const currentCred = provider.creds[0];
    const { id, descriptor } = currentCred;

    if (id && descriptor?.code && descriptor?.short_desc) {
      const stored = await RedisService.getKey(
        `${transaction_id}_${constants.ON_SEARCH}_credsDescriptor`
      );
      const storedCreds = stored ? JSON.parse(stored) : [];

      const isMatchFound = storedCreds.some(
        (storedCred: any) =>
          storedCred.id === id &&
          storedCred.descriptor?.code === descriptor.code &&
          storedCred.descriptor?.short_desc === descriptor.short_desc
      );

      if (!isMatchFound) {
        result.push(
          addError(
            `Order validation failure: Credential (id + descriptor) in /${constants.ON_CONFIRM} does not match /${constants.ON_SEARCH}`,
            23003
          )
        );
      }
    }
  }
}

async function validatePickupTimestamps(
  order: any,
  context: any,
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

  if (!orderPicked) {
    result.push(
      addError(
        `fulfillments/state should be ${constants.ORDER_PICKED} for /${constants.ON_STATUS}_${constants.ORDER_PICKED}`,
        ERROR_CODES.INVALID_ORDER_STATE
      )
    );
  }
}

async function validateDeliveryTimestamps(
  order: any,
  context: any,
  transaction_id: string,
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

async function validateFulfillments(
  order: any,
  transaction_id: string,
  state: string,
  context: any,
  result: ValidationError[]
): Promise<void> {
  const deliveryFulfillments: any[] =
    order.fulfillments?.filter((ff: any) => ff.type === "Delivery") || [];

  const deliveryObjReplacementRaw = await RedisService.getKey(
    `${transaction_id}_deliveryObjReplacement`
  );
  const deliveryObjReplacement: any[] = deliveryObjReplacementRaw
    ? [JSON.parse(deliveryObjReplacementRaw)]
    : [];

  if (deliveryObjReplacement.length > 0) {
    deliveryFulfillments.forEach((fulfillment: any) => {
      const matched = deliveryObjReplacement.find(
        (replacement: any) => replacement.id === fulfillment.id
      );

      if (matched) {
        const fulfillmentRangeErrors = compareTimeRanges(
          matched,
          `${state} on_status action call`,
          fulfillment,
          "previos action call"
        );
        if (state === constants.ORDER_PICKED) {
          validatePickupTimestamps(order, context, result);
        }
        if (state === constants.ORDER_DELIVERED) {
          validateDeliveryTimestamps(order, context, transaction_id, result);
        }

        if (fulfillmentRangeErrors) {
          fulfillmentRangeErrors.forEach((error: string) => {
            result.push(addError(`${error}`, ERROR_CODES.INVALID_RESPONSE));
          });
        }
        delete matched?.start?.instructions;
        delete matched?.end?.instructions;
        delete matched?.tags;
        delete matched?.state;
        delete matched?.start?.time?.timestamp;
        delete matched?.end?.time?.timestamp;

        delete fulfillment?.start?.instructions;
        delete fulfillment?.end?.instructions;
        delete fulfillment?.tags;
        delete fulfillment?.state;
        delete fulfillment?.start?.time?.timestamp;
        delete fulfillment?.end?.time?.timestamp;

        const fulfillmentErrors = compareObjects(fulfillment, matched);
        fulfillmentErrors?.forEach((error: string) => {
          result.push(
            addError(
              `Business Error: fulfillment: ${error} when compared with previous /${constants.ON_STATUS} fulfillment object with id '${fulfillment.id}'`,
              40000
            )
          );
        });
      }
    });
  }
}

async function validateTimestamps(
  order: any,
  context: any,
  transaction_id: string,
  result: ValidationError[]
): Promise<void> {
  const cnfrmTmpstmpRaw = await RedisService.getKey(
    `${transaction_id}_cnfrmTmpstmp`
  );
  const cnfrmTmpstmp = cnfrmTmpstmpRaw ? JSON.parse(cnfrmTmpstmpRaw) : null;
  if (cnfrmTmpstmp && !_.isEqual(cnfrmTmpstmp, order.created_at)) {
    result.push(
      addError(
        `Created At timestamp for /${constants.ON_STATUS} should be equal to context timestamp at ${constants.CONFIRM}`,
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
        `Timestamp for /${constants.ON_CONFIRM} api cannot be greater than or equal to /${constants.ON_STATUS} api`,
        ERROR_CODES.OUT_OF_SEQUENCE
      )
    );
  }

  if (!areTimestampsLessThanOrEqualTo(order.updated_at, context.timestamp)) {
    result.push(
      addError(
        `order.updated_at timestamp should be less than or equal to context timestamp for /${constants.ON_STATUS} api`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }
}

async function validatePayment(
  order: any,
  transaction_id: string,
  result: ValidationError[]
): Promise<void> {
  const prevPaymentRaw = await RedisService.getKey(
    `${transaction_id}_prevPayment`
  );
  const prevPayment = prevPaymentRaw ? JSON.parse(prevPaymentRaw) : null;
  if (prevPayment && !_.isEqual(prevPayment, order.payment)) {
    result.push(
      addError(
        `payment object mismatches with the previous action call and /${constants.ON_STATUS}`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  let status = true;
  if (order.payment.status === PAYMENT_STATUS.PAID) {
    if (!order.payment.params.transaction_id) {
      status = false;
    }
  }

  if (!status) {
    result.push(
      addError(
        `Transaction_id missing in message/order/payment`,
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

async function validateQuote(
  order: any,
  transaction_id: string,
  state: string,
  result: ValidationError[]
): Promise<void> {
  if (!sumQuoteBreakUp(order.quote)) {
    result.push(
      addError(
        `item quote breakup prices for ${constants.ON_STATUS} should be equal to the total price`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  const quoteObjRaw = await RedisService.getKey(`${transaction_id}_quoteObj`);
  const previousQuote = quoteObjRaw ? JSON.parse(quoteObjRaw) : null;
  const quoteErrors = compareQuoteObjects(
    previousQuote,
    order.quote,
    constants.ON_STATUS,
    "previous action call"
  );
  if (quoteErrors) {
    quoteErrors.forEach((error: string) =>
      result.push(addError(error, ERROR_CODES.INVALID_RESPONSE))
    );
  }
}

async function validateBilling(
  order: any,
  transaction_id: string,
  state: string,
  result: ValidationError[]
): Promise<void> {
  const billingRaw = await RedisService.getKey(`${transaction_id}_billing`);
  const billing = billingRaw ? JSON.parse(billingRaw) : null;
  const billingErrors = compareObjects(billing, order.billing);
  if (billingErrors) {
    billingErrors.forEach((error: string) =>
      result.push(
        addError(
          `${error} when compared with confirm billing object`,
          ERROR_CODES.INVALID_RESPONSE
        )
      )
    );
  }
}

const checkOnStatus = async (
  data: any,
  state: string,
  fulfillmentsItemsSet: Set<any>
): Promise<ValidationError[]> => {
  const result: ValidationError[] = [];

  try {
    const { context, message } = data;
    try {
      await contextChecker(
        context,
        result,
        constants.ON_STATUS,
        constants.ON_STATUS,
        true
      );
    } catch (err: any) {
      result.push(addError(`Error checking context: ${err.message}`, 20000));

      return result;
    }

    const { transaction_id } = context;
    const order = message.order;

    await Promise.all([
      validateOrder(order, transaction_id, state, result),
      validateFulfillments(order, transaction_id, state, context, result),
      validateTimestamps(order, context, transaction_id, result),
      validatePayment(order, transaction_id, result),
      validateQuote(order, transaction_id, state, result),
      validateBilling(order, transaction_id, state, result),
      RedisService.setKey(
        `${transaction_id}_${constants.ON_STATUS}`,
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

export default checkOnStatus;
