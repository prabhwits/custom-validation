import checkOnStatusDelivered from "./on_status_delivered";
import checkOnStatusOutForDelivery from "./on_status_out_for_delivery";
import checkOnStatusPacked from "./on_status_packed";
import checkOnStatusPending from "./on_status_pending";
import checkOnStatusPicked from "./on_status_picked";

export const onStatusRouter = async (data: any) => {
    const state = data?.message?.order?.fulfillments[0]?.state?.descriptor?.code;
    let result: any = [];
    let fulfillmentsItemsSet: Set<any> = new Set();
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
        result = await checkOnStatusOutForDelivery(data, state, fulfillmentsItemsSet);
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
}