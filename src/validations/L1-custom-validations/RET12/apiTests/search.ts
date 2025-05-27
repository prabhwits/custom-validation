import constants from "../../../../utils/constants";
import { contextChecker } from "../../../../utils/contextUtils";
import { setRedisValue } from "../../../../utils/helper";

export async function search(data: any) {
  const { context, message } = data;
  const result: any = [];

  const txnId = context?.transaction_id;
  try {
    await contextChecker(context, result, constants.SEARCH);
  } catch (err: any) {
    return result.push({
      valid: false,
      code: 20000,
      description: err.message,
    });
  }
  try {
    const intent = message?.intent;
    const buyerFFAmount =
      intent?.payment?.["@ondc/org/buyer_app_finder_fee_amount"];
    await setRedisValue(`${txnId}_buyerFFAmount`, buyerFFAmount);
    return result;
  } catch (error: any) {
    console.error(`Error in /${constants.SEARCH}: ${error.stack}`);
  }
}
