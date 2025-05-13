import { RedisService } from "ondc-automation-cache-lib";
import _ from "lodash";
import { ApiSequence } from "../../../../utils/constants";
import { checkUpdate } from "./update";
import { checkOnUpdate } from "./on_update";

// Interface for validation errors
interface ValidationError {
  valid: boolean;
  code: number;
  description: string;
}

// Helper to create validation errors
const addError = (code: number, description: string): ValidationError => ({
  valid: false,
  code,
  description
});

// Helper to fetch and parse Redis set
async function fetchRedisSet(transaction_id: string, key: string): Promise<Set<any>> {
  try {
    const rawData = await RedisService.getKey(`${transaction_id}_${key}`);
    return new Set(rawData ? JSON.parse(rawData) : []);
  } catch (error: any) {
    console.error(`Error fetching Redis key ${transaction_id}_${key}: ${error.stack}`);
    return new Set();
  }
}

export const updateRouter = async (data: any) => {
  const transaction_id = data.context.transaction_id;
  let apiSeq = "";
  let flow = "";
  let result: any = [];

  // Fetch settlement details set
  let settlementDetailSet = await fetchRedisSet(transaction_id, "settlementDetailSet");

  const updateTarget = data?.message?.update_target;
  if (updateTarget) {
    if (updateTarget === "payment") {
      const fulfillments = data.message?.order?.fulfillments;
      const fulfillment = fulfillments[0];
      if (fulfillment.type === "Cancel") {
        apiSeq = ApiSequence.UPDATE_SETTLEMENT_PART_CANCEL;
        flow = "6-a";
      } else if (fulfillment.type === "Return") {
        apiSeq = ApiSequence.UPDATE_SETTLEMENT_LIQUIDATED;
        flow = "6-a";
      } else {
        result = [addError(400, "Invalid update fulfillment.type")];
      }
    } else if (updateTarget === "item") {
      flow = "6-c";
      apiSeq = ApiSequence.UPDATE_LIQUIDATED;
    } else {
      result = [addError(400, "Invalid action call, update_target is not correct")];
    }
  } else {
    result = [addError(400, "Invalid action call, update_target is misisng")];
  }

  switch (apiSeq) {
    case ApiSequence.UPDATE_SETTLEMENT_PART_CANCEL:
      result = await checkUpdate(
        data,
        ApiSequence.UPDATE_SETTLEMENT_PART_CANCEL,
        settlementDetailSet,
        flow
      );
      break;
    case ApiSequence.UPDATE_LIQUIDATED:
      result = await checkUpdate(
        data,
        ApiSequence.UPDATE_LIQUIDATED,
        settlementDetailSet,
        flow
      );
      break;
    case ApiSequence.UPDATE_SETTLEMENT_LIQUIDATED:
      result = await checkUpdate(
        data,
        ApiSequence.UPDATE_SETTLEMENT_LIQUIDATED,
        settlementDetailSet,
        flow
      );
      break;
    default:
      result = [addError(400, "Invalid update action call")];
      break;
  }
  return result;
};

export const onUpdateRouter = async (data: any) => {
  const transaction_id = data.context.transaction_id;
  let result: any = [];
  let apiSeq = "";
  let flow = "";

  // Fetch Redis sets concurrently
  const [fulfillmentsItemsSet, settlementDetailSet, quoteTrailItemsSet] = await Promise.all([
    fetchRedisSet(transaction_id, "fulfillmentsItemsSet"),
    fetchRedisSet(transaction_id, "settlementDetailSet"),
    fetchRedisSet(transaction_id, "quoteTrailItemsSet")
  ]);

  const fulfillments = data.message?.order?.fulfillments;
  const length = fulfillments?.length;

  if (!fulfillments || !length) {
    return [addError(400, "Fulfillments are missing or empty")];
  }

  const fulfillmentObj = fulfillments[length - 1];
  const fulfillmentType = fulfillmentObj.type;
  if (fulfillmentType === "Cancel") {
    apiSeq = ApiSequence.ON_UPDATE_PART_CANCEL;
    flow = "6-a";
  } else {
    const fulfillmentState = fulfillmentObj.state?.descriptor?.code;
    flow = "6-c";
    switch (fulfillmentState) {
      case "Return_Initiated":
        apiSeq = ApiSequence.ON_UPDATE_INTERIM_LIQUIDATED;
        break;
      case "Liquidated":
        apiSeq = ApiSequence.ON_UPDATE_LIQUIDATED;
        break;
      default:
        result = [addError(400, `Invalid on_update state: ${fulfillmentState}`)];
        break;
    }
  }

  if (result.length === 0) {
    result = await checkOnUpdate(
      data,
      apiSeq,
      settlementDetailSet,
      quoteTrailItemsSet,
      fulfillmentsItemsSet,
      flow,
      transaction_id
    );
  }

  return result;
};