/* eslint-disable no-prototype-builtins */
import _ from 'lodash';
import { RedisService } from 'ondc-automation-cache-lib';


import {
  isObjectEmpty,
  checkContext,
  areTimestampsLessThanOrEqualTo,
  payment_status,
  compareTimeRanges,
  addActionToRedisSet,
  addMsgIdToRedisSet,
} from '../../../../../utils/helper';
import { FLOW } from '../../../../../utils/enums';
import constants, { ApiSequence, PAYMENT_STATUS } from '../../../../../utils/constants';

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
  result: ValidationError[],
  onConfirmOrderState: string | null
): Promise<void> {
  if (onConfirmOrderState === 'Accepted') {
    result.push(
      createError(
        "When the onConfirm Order State is 'Accepted', the on_status_pending is not required!",
        ERROR_CODES.INVALID_RESPONSE
      )
    );
    return;
  }

  const contextRes = checkContext(context, constants.ON_STATUS);
  if (!contextRes?.valid) {
    contextRes?.ERRORS.forEach((error: string) =>
      result.push(createError(error, ERROR_CODES.INVALID_RESPONSE))
    );
  }

  const domain = await RedisService.getKey(`${transaction_id}_domain`);
  if (!_.isEqual(context.domain?.split(':')[1], domain)) {
    result.push(
      createError(
        'Domain should be same in each action',
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
          console.info(`Adding Message Id /${constants.ON_STATUS}_pending`);
          const isMsgIdNotPresent = await addMsgIdToRedisSet(
            context.transaction_id,
            context.message_id,
            ApiSequence.ON_STATUS_PENDING
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
            `!!Error while checking message id for /${constants.INIT}, ${error.stack}`
          );
        }

    await RedisService.setKey(
      `${transaction_id}_pending_message_id`,
      JSON.stringify(context.message_id),
      TTL_IN_SECONDS
    );
  } catch (error: any) {
    console.error(
      `!!Error while checking message id for /${constants.ON_STATUS_PENDING}, ${error.stack}`
    );
    result.push(
      createError(
        'Internal error while checking message ID',
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
  if (cnfrmOrdrId && order.id != cnfrmOrdrId) {
    result.push(
      createError(
        `Order id in /${constants.CONFIRM} and /${constants.ON_STATUS}_${state} do not match`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  if (order.state !== 'Accepted') {
    result.push(
      createError(
        `Order state should be accepted whenever Status is being sent 'Accepted'. Current state: ${order.state}`,
        ERROR_CODES.INVALID_ORDER_STATE
      )
    );
  }

  await RedisService.setKey(
    `${transaction_id}_orderState`,
    JSON.stringify(order.state),
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
  for (const ff of order.fulfillments || []) {
    if (!ff.id) {
      result.push(
        createError(
          `Fulfillment Id must be present`,
          ERROR_CODES.INVALID_RESPONSE
        )
      );
    }

    if (ff.type !== 'Cancel') {
      const ffTrackingRaw = await RedisService.getKey(
        `${transaction_id}_${ff.id}_tracking`
      );
      const ffTracking = ffTrackingRaw ? JSON.parse(ffTrackingRaw) : null;
      if (ffTracking !== null) {
        if (typeof ff.tracking !== 'boolean') {
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
    (f: any) => f.type === 'Delivery'
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
      fulfillmentRangeErrors.forEach((error: string, index: number) => {
        result.push(
          createError(
            `${error}`,
            ERROR_CODES.INVALID_RESPONSE
          )
        );
      });
    }
  }

  if (['6', '2', '3', '5'].includes(state)) {
    if (!order.fulfillments?.length) {
      result.push(
        createError(
          `missingFulfillments is mandatory for ${ApiSequence.ON_STATUS_PENDING}`,
          ERROR_CODES.ORDER_VALIDATION_FAILURE
        )
      );
    } else {
      const deliveryObjArr = order.fulfillments.filter(
        (f: any) => f.type === 'Delivery'
      );
      if (!deliveryObjArr.length) {
        result.push(
          createError(
            `Delivery fulfillment must be present in ${ApiSequence.ON_STATUS_PENDING}`,
            ERROR_CODES.ORDER_VALIDATION_FAILURE
          )
        );
      } else {
        const deliverObj = { ...deliveryObjArr[0] };
        delete deliverObj?.state;
        delete deliverObj?.tags;
        delete deliverObj?.start?.instructions;
        delete deliverObj?.end?.instructions;
        fulfillmentsItemsSet.add(deliverObj);
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
  const onCnfrmTmpstmp = onCnfrmTmpstmpRaw ? JSON.parse(onCnfrmTmpstmpRaw) : null;
  if (onCnfrmTmpstmp && _.gte(onCnfrmTmpstmp, context.timestamp)) {
    result.push(
      createError(
        `Timestamp for /${constants.ON_CONFIRM} api cannot be greater than or equal to /${constants.ON_STATUS}_${state} api`,
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

async function validatePayment(
  order: any,
  flow: string,
  result: ValidationError[]
): Promise<void> {
  const status = payment_status(order.payment, flow);
  if (!status) {
    result.push(
      createError(
        `Transaction_id missing in message/order/payment`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }

  if (flow === FLOW.FLOW2A && order.payment?.status !== PAYMENT_STATUS.NOT_PAID) {
    result.push(
      createError(
        `Payment status should be ${PAYMENT_STATUS.NOT_PAID} for ${FLOW.FLOW2A} flow (Cash on Delivery)`,
        ERROR_CODES.INVALID_RESPONSE
      )
    );
  }
}

const checkOnStatusPending = async (
  data: any,
  state: string,
  fulfillmentsItemsSet: Set<any>
): Promise<ValidationError[]> => {
  const result: ValidationError[] = [];
  
  try {
    if (!data || isObjectEmpty(data)) {
      
      const onConfirmOrderStateRaw = await RedisService.getKey(
        `${data?.context?.transaction_id}_onCnfrmState`
      );
      const onConfirmOrderState = onConfirmOrderStateRaw
        
      if (onConfirmOrderState === 'Accepted') return result;
      result.push(
        createError('JSON cannot be empty', ERROR_CODES.INVALID_RESPONSE)
      );
      return result;
    }

    const { context, message } = data;
    if (!message || !context || !message.order || isObjectEmpty(message)) {
      const onConfirmOrderStateRaw = await RedisService.getKey(
        `${data?.context?.transaction_id}_onCnfrmState`
      );
      const onConfirmOrderState = onConfirmOrderStateRaw
       
      if (onConfirmOrderState === 'Accepted') return result;
      result.push(
        createError(
          '/context, /message, /order or /message/order is missing or empty',
          ERROR_CODES.INVALID_RESPONSE
        )
      );
      return result;
    }

    const onConfirmOrderStateRaw = await RedisService.getKey(`${data?.context?.transaction_id}_onCnfrmState`);
    const onConfirmOrderState = onConfirmOrderStateRaw
      

    const flow = await RedisService.getKey('flow') || '2';
    const { transaction_id } = context;
    const order = message.order;

   

    try {
      const previousCallPresent = await addActionToRedisSet(
        transaction_id,
        ApiSequence.ON_CONFIRM,
        ApiSequence.ON_STATUS_PENDING
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
        `!!Error while checking previous action call /${constants.ON_STATUS_PENDING}, ${error.stack}`
      );
    }

    await Promise.all([
      validateContext(context, transaction_id, result, onConfirmOrderState),
      validateMessageId(context, transaction_id,  result),
      validateOrder(order, transaction_id, state, result),
      validateFulfillments(order, transaction_id, state, fulfillmentsItemsSet, result),
      validateTimestamps(order, context, transaction_id, state, result),
      validatePayment(order, flow, result),
      RedisService.setKey(
        `${transaction_id}_${ApiSequence.ON_STATUS_PENDING}`,
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
        'Internal error processing /on_status_pending request',
        ERROR_CODES.INTERNAL_ERROR
      )
    );
    return result;
  }
};

export default checkOnStatusPending;