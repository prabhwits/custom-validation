import { RedisService } from "ondc-automation-cache-lib";
import checkOnStatusDelivered from "./on_status_delivered";
import checkOnStatusOutForDelivery from "./on_status_out_for_delivery";
import checkOnStatusPacked from "./on_status_packed";
import checkOnStatusPending from "./on_status_pending";
import checkOnStatusPicked from "./on_status_picked";

export const onStatusRouter = async (data: any) => {
  const state = data?.message?.order?.fulfillments[0]?.state?.descriptor?.code;
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
      result = await checkOnStatusPending(data, state, fulfillmentsItemsSet);
      break;
    case "Packed":
      result = await checkOnStatusPacked(data, state, fulfillmentsItemsSet);
      break;
    case "Order-picked-up":
      result = await checkOnStatusPicked(data, state, fulfillmentsItemsSet);
      break;
    case "Out-for-delivery":
      result = await checkOnStatusOutForDelivery(
        data,
        state,
        fulfillmentsItemsSet
      );
      break;
    case "Order-delivered":
      result = await checkOnStatusDelivered(data, state, fulfillmentsItemsSet);
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
