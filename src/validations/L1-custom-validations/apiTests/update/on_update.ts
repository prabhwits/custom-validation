import _, { isEmpty } from "lodash";
import { RedisService } from "ondc-automation-cache-lib";
import constants, { ApiSequence } from "../../../../utils/constants";
import {
  isObjectEmpty,
  checkBppIdOrBapId,
  checkContext,
  sumQuoteBreakUp,
  payment_status,
  checkQuoteTrailSum,
  timeDiff,
  addMsgIdToRedisSet,
} from "../../../../utils/helper";
import {
  partcancel_return_reasonCodes,
  return_rejected_request_reasonCodes,
  return_request_reasonCodes,
} from "../../../../utils/reasonCode";

const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;

interface ValidationError {
  valid: boolean;
  code: number;
  description: string;
}

// Helper function to retrieve and parse Redis value
async function getRedisValue(
  transaction_id: string,
  key: string
): Promise<any> {
  try {
    const value = await RedisService.getKey(`${transaction_id}_${key}`);
    return value ? JSON.parse(value) : null;
  } catch (error: any) {
    console.error(
      `Error parsing Redis key ${transaction_id}_${key}: ${error.stack}`
    );
    return null;
  }
}

export const checkOnUpdate = async (
  data: any,
  apiSeq: string,
  settlementDetatilSet: Set<any>,
  quoteTrailItemsSet: Set<any>,
  fulfillmentsItemsSet: Set<any>,
  flow: string,
  transaction_id: string
): Promise<ValidationError[]> => {
  const result: ValidationError[] = [];

  try {
    // Check for empty or invalid JSON
    if (!data || isObjectEmpty(data)) {
      result.push({
        valid: false,
        code: 20006,
        description: `${ApiSequence.ON_UPDATE}: JSON cannot be empty`,
      });
      return result;
    }

    const { message, context }: any = data;
    const on_update = message.order;

    // Retrieve context and select data from Redis
    const searchContext: any = await getRedisValue(
      transaction_id,
      `${ApiSequence.SEARCH}_context`
    );
    const select: any = await getRedisValue(
      transaction_id,
      `${ApiSequence.SELECT}`
    );

    // Store on_update data in Redis
    try {
      await RedisService.setKey(
        `${transaction_id}_${ApiSequence.ON_UPDATE}`,
        JSON.stringify(data),
        TTL_IN_SECONDS
      );
    } catch (error: any) {
      result.push({
        valid: false,
        code: 23001,
        description: `Error storing ${ApiSequence.ON_UPDATE} in Redis: ${error.message}`,
      });
    }

    // Check for missing fields
    if (
      !message ||
      !context ||
      isObjectEmpty(message) ||
      isObjectEmpty(message.order)
    ) {
      result.push({
        valid: false,
        code: 20006,
        description: "/context, /message, /message/order is missing or empty",
      });
      return result;
    }

    // Message ID validation
    try {
      if (
        (flow === "6-b" &&
          apiSeq === ApiSequence.ON_UPDATE_INTERIM_REVERSE_QC) ||
        (flow === "6-c" && apiSeq === ApiSequence.ON_UPDATE_INTERIM_LIQUIDATED)
      ) {
        if (apiSeq === ApiSequence.ON_UPDATE_INTERIM_REVERSE_QC) {
          console.info(
            `Comparing Message Ids of /${ApiSequence.UPDATE_REVERSE_QC} and /${ApiSequence.ON_UPDATE_INTERIM_REVERSE_QC}`
          );
          const updateMsgId = RedisService.getKey(
            `${context.transaction_id}_${ApiSequence.UPDATE_REVERSE_QC}_msgId`
          );

          if (!_.isEqual(updateMsgId, context.message_id)) {
            result.push({
              valid: false,
              code: 20008,
              description: `Message Ids for /${ApiSequence.UPDATE_REVERSE_QC} and /${ApiSequence.ON_UPDATE_INTERIM_REVERSE_QC} api should be same`,
            });
          }
        } else if (apiSeq === ApiSequence.ON_UPDATE_INTERIM_LIQUIDATED) {
          console.info(
            `Comparing Message Ids of /${ApiSequence.UPDATE_LIQUIDATED} and /${ApiSequence.ON_UPDATE_INTERIM_LIQUIDATED}`
          );
          const updateMsgId = await RedisService.getKey(
            `${context.transaction_id}_${ApiSequence.UPDATE_LIQUIDATED}_msgId`
          );

          if (!_.isEqual(updateMsgId, context.message_id)) {
            result.push({
              valid: false,
              code: 20008,
              description: `Message Ids for /${ApiSequence.UPDATE_LIQUIDATED} and /${ApiSequence.ON_UPDATE_INTERIM_LIQUIDATED} api should be same`,
            });
          }
        }
      } else {
        try {
          console.info(`Adding Message Id /${constants.ON_UPDATE}`);
          const msgId = await RedisService.setKey(
            `${transaction_id}_${apiSeq}_msgId`,
            data.context.message_id,
            TTL_IN_SECONDS
          );

          const isMsgIdNotPresent = await addMsgIdToRedisSet(
            context.transaction_id,
            context.message_id,
            apiSeq
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
            `!!Error while checking message id for /${apiSeq}, ${error.stack}`
          );
        }
      }
    } catch (error: any) {
      console.error(
        `!!Error while checking message id for /${apiSeq}, ${error.stack}`
      );
      result.push({
        valid: false,
        code: 23001,
        description: `Error while checking message id for /${apiSeq}: ${error.message}`,
      });
    }

    // Check bap_id and bpp_id format
    const checkBap = checkBppIdOrBapId(context.bap_id);
    const checkBpp = checkBppIdOrBapId(context.bpp_id);
    if (checkBap) {
      result.push({
        valid: false,
        code: 20006,
        description: "context/bap_id should not be a url",
      });
    }
    if (checkBpp) {
      result.push({
        valid: false,
        code: 20006,
        description: "context/bpp_id should not be a url",
      });
    }

    // Domain validation
    const domain = await RedisService.getKey(`${transaction_id}_domain`);
    if (!_.isEqual(data.context.domain.split(":")[1], domain)) {
      result.push({
        valid: false,
        code: 20008,
        description: `Domain should be same in each action`,
      });
    }

    // Validate context
    try {
      console.info(`Checking context for /${apiSeq} API`);
      const res: any = checkContext(context, constants.ON_UPDATE);
      if (!res.valid) {
        Object.keys(res.ERRORS).forEach((key) => {
          result.push({
            valid: false,
            code: 20006,
            description: res.ERRORS[key],
          });
        });
      }
    } catch (error: any) {
      console.error(
        `!!Some error occurred while checking /${apiSeq} context, ${error.stack}`
      );
      result.push({
        valid: false,
        code: 23001,
        description: `Error checking context for /${apiSeq}: ${error.message}`,
      });
    }

    // Compare city
    try {
      console.info(`Comparing city of /${constants.SEARCH} and /${apiSeq}`);
      if (!_.isEqual(searchContext?.city, context.city)) {
        result.push({
          valid: false,
          code: 20008,
          description: `City code mismatch in /${constants.SEARCH} and /${apiSeq}`,
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while comparing city in /${constants.SEARCH} and /${apiSeq}, ${error.stack}`
      );
      result.push({
        valid: false,
        code: 23001,
        description: `Error comparing city in /${constants.SEARCH} and /${apiSeq}: ${error.message}`,
      });
    }

    // Compare transaction ID
    try {
      console.info(
        `Comparing transaction Ids of /${constants.SELECT} and /${apiSeq}`
      );
      if (!_.isEqual(select?.context?.transaction_id, context.transaction_id)) {
        result.push({
          valid: false,
          code: 20008,
          description: `Transaction Id should be same from /${constants.SELECT} onwards`,
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while comparing transaction ids for /${constants.SELECT} and /${apiSeq}, ${error.stack}`
      );
      result.push({
        valid: false,
        code: 23001,
        description: `Error comparing transaction ids for /${constants.SELECT} and /${apiSeq}: ${error.message}`,
      });
    }

    // Validate quote breakup
    try {
      console.info(`Checking for valid quote breakup prices for /${apiSeq}`);
      if (!sumQuoteBreakUp(on_update.quote)) {
        result.push({
          valid: false,
          code: 41002,
          description: `Item quote breakup prices for /${apiSeq} should be equal to the net price.`,
        });
      }
    } catch (error: any) {
      console.error(
        `Error occurred while checking for valid quote breakup in ON_UPDATE`
      );
      result.push({
        valid: false,
        code: 23001,
        description: `Error checking quote breakup in /${apiSeq}: ${error.message}`,
      });
    }

    // Validate settlementWindow in payment
    try {
      console.info(`Checking settlementWindow in /message/order/payment`);
      const settlementWindow =
        on_update.payment?.["@ondc/org/settlement_window"];
      if (settlementWindow && !/^PT(\d+H|\d+M)$/.test(settlementWindow)) {
        result.push({
          valid: false,
          code: 20006,
          description: `Invalid settlement window in /${apiSeq}. Expected format: PT<digits>H or PT<digits>M (e.g., PT1H, PT30M)`,
        });
      }
    } catch (error: any) {
      console.error(
        `Error checking settlementWindow in /${apiSeq}: ${error.stack}`
      );
      result.push({
        valid: false,
        code: 23001,
        description: `Error checking settlementWindow in /${apiSeq}: ${error.message}`,
      });
    }

    // Check payment status, transaction_id and setting the payment obj
    try {
      console.info(
        `Checking if payment status is Paid or Unpaid and availability of transaction_id`
      );
      const payment = on_update.payment;

      await RedisService.setKey(
        `${transaction_id}_prevPayment`,
        JSON.stringify(payment),
        TTL_IN_SECONDS
      );
      const status = payment_status(payment, flow);
      if (!status) {
        result.push({
          valid: false,
          code: 20006,
          description: `Transaction_id missing in message/order/payment`,
        });
      }
    } catch (error: any) {
      console.error(`Error while checking the payment status`);
      result.push({
        valid: false,
        code: 23001,
        description: `Error checking payment status in /${apiSeq}: ${error.message}`,
      });
    }

    // Compare provider and location IDs
    try {
      const providerId = await getRedisValue(transaction_id, "providerId");
      const providerLoc = await getRedisValue(transaction_id, "providerLoc");
      if (providerId !== on_update.provider.id) {
        result.push({
          valid: false,
          code: 20008,
          description: `provider.id mismatches in /${apiSeq} and /${constants.ON_SELECT}`,
        });
      }
      if (on_update.provider.locations[0].id !== providerLoc) {
        result.push({
          valid: false,
          code: 20008,
          description: `provider.locations[0].id mismatches in /${constants.ON_SELECT} and /${apiSeq}`,
        });
      }
      if (!_.gte(context.timestamp, on_update.updated_at)) {
        result.push({
          valid: false,
          code: 20009,
          description: `context/timestamp should be greater than message/order/updated_at timestamp`,
        });
      }
    } catch (error: any) {
      console.error(
        `Error while comparing context/timestamp and updated_at timestamp`
      );
      result.push({
        valid: false,
        code: 23001,
        description: `Error comparing provider/location/timestamp in /${apiSeq}: ${error.message}`,
      });
    }

    // Check item IDs
    try {
      const itemsList = message.order.items;
      const updatedItems: any = await getRedisValue(
        transaction_id,
        "SelectItemList"
      );

      console.log("updatedItems", updatedItems, itemsList);
      itemsList.forEach((item: any, index: number) => {
        if (!updatedItems?.includes(item.id)) {
          result.push({
            valid: false,
            code: 20006,
            description: `Invalid Item Id provided in /${apiSeq}: ${item.id}`,
          });
        }
      });
    } catch (error: any) {
      console.error(
        `Error while checking for item IDs for /${apiSeq}, ${error.stack}`
      );
      result.push({
        valid: false,
        code: 23001,
        description: `Error checking item IDs for /${apiSeq}: ${error.message}`,
      });
    }

    // Check settlement details
    try {
      console.info(`Checking for settlement_details in /message/order/payment`);
      const settlement_details: any =
        on_update.payment["@ondc/org/settlement_details"];
      if (!settlement_details || settlement_details.length === 0) {
        result.push({
          valid: false,
          code: 20006,
          description:
            "The settlement_details are missing or empty in the payment object",
        });
      }
      settlement_details.forEach((data: any) => {
        if (
          data.settlement_type === "upi" &&
          data.settlement_counterparty === "seller-app"
        ) {
          if (!data.upi_address) {
            result.push({
              valid: false,
              code: 20006,
              description: `UPI_address is missing in /message/order/payment/@ondc/org/settlement_details`,
            });
          }
        }
      });
    } catch (error: any) {
      console.error(
        `Error while checking the settlement details in /message/order/payment`
      );
      result.push({
        valid: false,
        code: 23001,
        description: `Error checking settlement details in /${apiSeq}: ${error.message}`,
      });
    }

    // Compare settlement details
    try {
      console.info(
        `Checking for settlement_details in /message/order/payment and comparing previous settlement_details`
      );
      const settlement_details: any =
        on_update.payment["@ondc/org/settlement_details"];
      if (flow === "6-a") {
        settlementDetatilSet.add(settlement_details[0]);
        await RedisService.setKey(
          `${transaction_id}_settlementDetatilSet`,
          JSON.stringify([...settlementDetatilSet]),
          TTL_IN_SECONDS
        );
      } else {
        let i = 0;
        const storedSettlementSet = new Set(
          (await getRedisValue(transaction_id, "settlementDetatilSet")) || []
        );
        storedSettlementSet.forEach((obj1: any) => {
          const exist = settlement_details.some((obj2: any) =>
            _.isEqual(obj1, obj2)
          );
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
    } catch (error: any) {
      console.error(
        `Error while checking the settlement details in /message/order/payment and comparing previous settlement_details`
      );
      result.push({
        valid: false,
        code: 23001,
        description: `Error comparing settlement details in /${apiSeq}: ${error.message}`,
      });
    }

    // Check item IDs and quote breakup
    try {
      const items = on_update.items;
      const itemSet: Set<string> = new Set();
      items.forEach((item: any) => {
        const itemStr = JSON.stringify(item);
        if (itemSet.has(itemStr)) {
          result.push({
            valid: false,
            code: 20006,
            description: `Duplicate item found in /${apiSeq}: ${item.id}`,
          });
        } else {
          itemSet.add(itemStr);
        }
      });
      let updateItemList: any = null;
      if (flow === "6-a") {
        updateItemList = await getRedisValue(transaction_id, "SelectItemList");
      } else {
        updateItemList = await getRedisValue(transaction_id, "updateItemList");
      }
      if (updateItemList) {
        items.forEach((item: any) => {
          if (!updateItemList.includes(item.id)) {
            result.push({
              valid: false,
              code: 20006,
              description: `Item ID should be present in /${constants.SELECT} API: ${item.id}`,
            });
          }
        });
        on_update.quote.breakup.forEach((item: any) => {
          if (
            !updateItemList.includes(item["@ondc/org/item_id"]) &&
            item["@ondc/org/title_type"] === "item"
          ) {
            result.push({
              valid: false,
              code: 20006,
              description: `Invalid item ID provided in quote object: ${item["@ondc/org/item_id"]} should be present in /${constants.UPDATE} API`,
            });
          }
        });
      }
    } catch (error: any) {
      console.error(
        `Error while checking for item IDs for /${apiSeq}, ${error.stack}`
      );
      result.push({
        valid: false,
        code: 23001,
        description: `Error checking item IDs for /${apiSeq}: ${error.message}`,
      });
    }

    // Check Delivery object
    try {
      const DELobj = _.filter(on_update.fulfillments, { type: "Delivery" });
      if (!DELobj.length) {
        console.error(`Delivery object is mandatory for ${apiSeq}`);
        result.push({
          valid: false,
          code: 20006,
          description: `Delivery object is mandatory for ${apiSeq}`,
        });
      } else {
        if (!_.isEmpty(DELobj[0]?.start)) {
          const del_obj_start = DELobj[0]?.start;
          if (!_.isEmpty(del_obj_start?.location)) {
            const del_start_location = del_obj_start.location;
            if (!del_start_location.id) {
              result.push({
                valid: false,
                code: 20006,
                description: `Delivery fulfillment start location id is missing in ${apiSeq}`,
              });
            }
          } else {
            result.push({
              valid: false,
              code: 20006,
              description: `Delivery fulfillment start location object is missing in ${apiSeq}`,
            });
          }
        } else {
          result.push({
            valid: false,
            code: 20006,
            description: `Delivery fulfillment start object is missing in ${apiSeq}`,
          });
        }
      }
    } catch (error: any) {
      console.error(
        `Error while checking Fulfillments Delivery Obj in /${apiSeq}, ${error.stack}`
      );
      result.push({
        valid: false,
        code: 23001,
        description: `Error checking Delivery object in /${apiSeq}: ${error.message}`,
      });
    }

    // Check initiated_by in fulfillments
    try {
      console.info(
        `Checking for the availability of initiated_by code in ${apiSeq}`
      );
      const fulfillments = on_update.fulfillments;
      fulfillments.forEach((fulfillment: any, iF: number) => {
        if (fulfillment.tags) {
          const tags = fulfillment.tags;
          tags.forEach((tag: any, iT: number) => {
            if (
              tag.code === "cancel_request" ||
              tag.code === "return_request"
            ) {
              const list = tag.list;
              const tags_initiated = list.find(
                (data: any) => data.code === "initiated_by"
              );
              if (!tags_initiated) {
                result.push({
                  valid: false,
                  code: 20007,
                  description: `${apiSeq} must have initiated_by code in fulfillments[${iF}]/tags[${iT}]/list`,
                });
              }
            }
          });
        }

      });

      let quoteTrailSum = 0
      const lastFulfillment = fulfillments[fulfillments.length - 1].tags;
      if (lastFulfillment) {
        lastFulfillment.forEach((tag: any) => {
          if (tag.code === "quote_trail") {
            tag.list.forEach((data: any) => {
              if (data.code === "value") {
                quoteTrailSum += Number(data.value);
              }
            });
          }
        });
      }   
      quoteTrailSum =  Math.abs(quoteTrailSum);  
      console.log('22323', quoteTrailSum)
      if(quoteTrailSum !== 0) {
      await RedisService.setKey(
        `${transaction_id}_quoteTrailSum`,
        String(quoteTrailSum),
        TTL_IN_SECONDS
      );
    }
    } catch (error: any) {
      console.error(
        `Error while checking for the availability of initiated_by in ${apiSeq}`
      );
      result.push({
        valid: false,
        code: 23001,
        description: `Error checking initiated_by in /${apiSeq}: ${error.message}`,
      });
    }

    const flowSixAChecks = async (data: any) => {
      try {
        // Check order state
        try {
          const orderState = await getRedisValue(transaction_id, "orderState");
          if (data.state !== orderState) {
            result.push({
              valid: false,
              code: 20007,
              description: `order.state shouldn't be changed from ${orderState} to ${data.state} in /${apiSeq}`,
            });
          }
        } catch {
          console.error(`Error while checking order.state for the /${apiSeq}`);
          result.push({
            valid: false,
            code: 23001,
            description: `Error checking order.state for /${apiSeq}`,
          });
        }

        // Store timestamp
        try {
          await RedisService.setKey(
            `${transaction_id}_${ApiSequence.ON_UPDATE_PART_CANCEL}_tmpstmp`,
            JSON.stringify(context.timestamp),
            TTL_IN_SECONDS
          );
        } catch (e: any) {
          console.error(
            `Error while setting context/timestamp for the /${apiSeq}`
          );
          result.push({
            valid: false,
            code: 23001,
            description: `Error setting timestamp for /${apiSeq}: ${e.message}`,
          });
        }

        // Set cancel fulfillment ID
        try {
          data.fulfillments.forEach((fulfillment: any) => {
            if (fulfillment.type === "Cancel") {
              RedisService.setKey(
                `${transaction_id}_cancelFulfillmentID`,
                fulfillment.id,
                TTL_IN_SECONDS
              );
            }
          });
        } catch (e: any) {
          console.error(
            `Error while setting cancelFulfillmentID in /${apiSeq}`
          );
          result.push({
            valid: false,
            code: 23001,
            description: `Error setting cancelFulfillmentID in /${apiSeq}: ${e.message}`,
          });
        }

        // Check quote trail sum
        try {
          if (sumQuoteBreakUp(on_update.quote)) {
            const price = Number(on_update.quote.price.value);
            const priceAtConfirm = Number(
              await getRedisValue(transaction_id, "quotePrice")
            );
            const cancelFulfillments = _.filter(on_update.fulfillments, {
              type: "Cancel",
            });
            console.info(
              `Checking for quote_trail price and item quote price sum for ${apiSeq}`
            );
            checkQuoteTrailSum(
              cancelFulfillments,
              price,
              priceAtConfirm,
              result,
              ApiSequence.ON_UPDATE
            );
          } else {
            result.push({
              valid: false,
              code: 41002,
              description: `The price breakdown in breakup does not match with the total_price for ${apiSeq}`,
            });
          }
        } catch (error: any) {
          console.error(
            `Error occurred while checking for quote_trail price and quote breakup price on /${apiSeq}`
          );
          result.push({
            valid: false,
            code: 23001,
            description: `Error checking quote trail sum in /${apiSeq}: ${error.message}`,
          });
        }

        // Check and store quote trail items
        try {
          let cancelFulfillmentsArray = _.filter(on_update.fulfillments, {
            type: "Cancel",
          });
          if (cancelFulfillmentsArray.length !== 0) {
            const cancelFulfillments = cancelFulfillmentsArray[0];
            const quoteTrailItems = cancelFulfillments.tags.filter(
              (tag: any) => tag.code === "quote_trail"
            );
            if (quoteTrailItems.length !== 0) {
              quoteTrailItems.forEach((item: any) => {
                quoteTrailItemsSet.add(item);
              });
              await RedisService.setKey(
                `${transaction_id}_quoteTrailItemsSet`,
                JSON.stringify([...quoteTrailItemsSet]),
                TTL_IN_SECONDS
              );
            } else {
              result.push({
                valid: false,
                code: 20006,
                description: `Fulfillments/Cancel/tags/quote_trail is missing in ${apiSeq}`,
              });
            }
          } else {
            result.push({
              valid: false,
              code: 20006,
              description: `Fulfillments/Cancel is missing in ${apiSeq}`,
            });
          }
        } catch (error: any) {
          console.error(
            `Error occurred while checking for quote_trail in /${apiSeq}`
          );
          result.push({
            valid: false,
            code: 23001,
            description: `Error checking quote trail items in /${apiSeq}: ${error.message}`,
          });
        }

        // Reason_id mapping for cancel_request
        try {
          console.info(`Reason_id mapping for cancel_request`);
          const fulfillments = on_update.fulfillments;
          let cancelRequestPresent = false;
          fulfillments.forEach((fulfillment: any) => {
            if (fulfillment.type === "Cancel") {
              const tags = fulfillment.tags;
              tags.forEach((tag: any) => {
                if (tag.code === "cancel_request") {
                  cancelRequestPresent = true;
                  const lists = tag.list;
                  let reason_id = "";
                  lists.forEach((list: any) => {
                    if (list.code === "reason_id") {
                      reason_id = list.value;
                    }
                    if (
                      list.code === "initiated_by" &&
                      list.value !== context.bpp_id
                    ) {
                      result.push({
                        valid: false,
                        code: 20007,
                        description: `initiated_by should be ${context.bpp_id}`,
                      });
                    }
                    if (
                      list.code === "initiated_by" &&
                      list.value === context.bpp_id &&
                      !partcancel_return_reasonCodes.includes(reason_id)
                    ) {
                      result.push({
                        valid: false,
                        code: 20007,
                        description: `reason code allowed are ${partcancel_return_reasonCodes}`,
                      });
                    }
                  });
                }
              });
            }
          });
          if (!cancelRequestPresent) {
            result.push({
              valid: false,
              code: 20007,
              description: `Cancel request is not present in the 'Cancel' fulfillment`,
            });
          }
        } catch (error: any) {
          console.error(
            `!!Error while mapping cancellation_reason_id in ${apiSeq}`
          );
          result.push({
            valid: false,
            code: 23001,
            description: `Error mapping cancellation_reason_id in /${apiSeq}: ${error.message}`,
          });
        }

        // Check and store fulfillments items
        try {
          let fulfillmentsArray = structuredClone(on_update.fulfillments);

          if (fulfillmentsArray.length !== 0) {
            fulfillmentsArray.forEach((ff: any) => {
              if (ff.type === "Cancel") {
                fulfillmentsItemsSet.add(ff);
              }
            });
            await RedisService.setKey(
              `${transaction_id}_fulfillmentsItemsSet`,
              JSON.stringify([...fulfillmentsItemsSet]),
              TTL_IN_SECONDS
            );
          } else {
            result.push({
              valid: false,
              code: 20006,
              description: `Fulfillments are missing in ${apiSeq}`,
            });
          }
        } catch (error: any) {
          console.error(
            `Error occurred while checking for fulfillments in /${apiSeq}`
          );
          result.push({
            valid: false,
            code: 23001,
            description: `Error checking fulfillments in /${apiSeq}: ${error.message}`,
          });
        }
      } catch (error: any) {
        console.error(`Error while checking the flow 6-a checks in /${apiSeq}`);
        result.push({
          valid: false,
          code: 23001,
          description: `Error in flow 6-a checks for /${apiSeq}: ${error.message}`,
        });
      }
    };

    // Check fulfillment id, type, and tracking
    try {
      console.info("Checking fulfillment.id, fulfillment.type and tracking");
      on_update.fulfillments.forEach(async (ff: any) => {
        if (!ff.id) {
          result.push({
            valid: false,
            code: 20006,
            description: `Fulfillment Id must be present`,
          });
        }
        if (!ff.type) {
          result.push({
            valid: false,
            code: 20006,
            description: `Fulfillment Type must be present`,
          });
        }
        const ffType = ff.type;
        const ffId = ff.id;
        if (ffType !== "Return" && ffType !== "Cancel") {
          const tracking = await getRedisValue(
            transaction_id,
            `${ffId}_tracking`
          );
          if (tracking !== null) {
            if (ff.tracking === false || ff.tracking === true) {
              if (tracking !== ff.tracking) {
                result.push({
                  valid: false,
                  code: 20008,
                  description: `Fulfillment Tracking mismatch with the ${constants.ON_SELECT} call`,
                });
              }
            } else {
              result.push({
                valid: false,
                code: 20006,
                description: `Tracking must be present for fulfillment ID: ${ff.id} in boolean form`,
              });
            }
          }
        }
      });
    } catch (error: any) {
      console.error(
        `Error while checking fulfillments id, type and tracking in /${constants.ON_STATUS}`
      );
      result.push({
        valid: false,
        code: 23001,
        description: `Error checking fulfillments id, type, and tracking in /${apiSeq}: ${error.message}`,
      });
    }

    // Flow 6-b and 6-c checks
    if (flow === "6-b" || flow === "6-c") {
      try {
        const timestampOnUpdatePartCancelRaw = await getRedisValue(
          transaction_id,
          `${ApiSequence.ON_UPDATE_PART_CANCEL}_tmpstmp`
        );

        const timestampOnUpdatePartCancel = timestampOnUpdatePartCancelRaw
          ? timestampOnUpdatePartCancelRaw
          : null;

        const timeDif = timeDiff(
          context.timestamp,
          timestampOnUpdatePartCancel
        );
        if (timeDif <= 0) {
          result.push({
            valid: false,
            code: 20009,
            description: `context/timestamp of /${apiSeq} should be greater than /${ApiSequence.ON_UPDATE_PART_CANCEL} context/timestamp`,
          });
        }

        const timestampRaw = await getRedisValue(transaction_id, "timestamp_");
        const timestamp = timestampRaw ? JSON.parse(timestampRaw) : null;

        if (timestamp && timestamp.length !== 0) {
          const timeDif2 = timeDiff(context.timestamp, timestamp[0]);
          if (timeDif2 <= 0) {
            result.push({
              valid: false,
              code: 20009,
              description: `context/timestamp of /${apiSeq} should be greater than context/timestamp of /${timestamp[1]}`,
            });
          }
        } else {
          result.push({
            valid: false,
            code: 20009,
            description: `context/timestamp of the previous call is missing or the previous action call itself is missing`,
          });
        }
        await RedisService.setKey(
          `${transaction_id}_timestamp_`,
          JSON.stringify([context.timestamp, apiSeq]),
          TTL_IN_SECONDS
        );
      } catch (e: any) {
        console.error(
          `Error while checking context/timestamp for the /${apiSeq} -=> ${e.stack}`
        );
        result.push({
          valid: false,
          code: 23001,
          description: `Error checking timestamp for /${apiSeq}: ${e.message}`,
        });
      }

      // Check order state for 6-b and 6-c
      try {
        if (on_update.state !== "Completed") {
          result.push({
            valid: false,
            code: 20007,
            description: `Order state should be 'Completed' in ${apiSeq}`,
          });
        }
      } catch (error: any) {
        console.error(`Error while checking order.state for the /${apiSeq}`);
        result.push({
          valid: false,
          code: 23001,
          description: `Error checking order.state in /${apiSeq}: ${error.message}`,
        });
      }
    }

    // Flow 6-b checks
    if (flow === "6-b") {
      if (
        apiSeq === ApiSequence.ON_UPDATE_APPROVAL ||
        apiSeq === ApiSequence.ON_UPDATE_PICKED ||
        apiSeq === ApiSequence.ON_UPDATE_DELIVERED
      ) {
        try {
          const RETobj = _.filter(on_update.fulfillments, { type: "Return" });
          if (!RETobj.length) {
            result.push({
              valid: false,
              code: 20006,
              description: `Return object is mandatory for ${apiSeq}`,
            });
          } else {
            // Check end object
            if (!_.isEmpty(RETobj[0]?.end)) {
              const ret_obj_end = RETobj[0]?.end;
              if (_.isEmpty(ret_obj_end?.location)) {
                result.push({
                  valid: false,
                  code: 20006,
                  description: `Return fulfillment end location object is missing in ${apiSeq}`,
                });
              }
              if (apiSeq === ApiSequence.ON_UPDATE_DELIVERED) {
                if (!_.isEmpty(ret_obj_end?.time)) {
                  const ret_obj_end_time = ret_obj_end.time;
                  if (!_.isEmpty(ret_obj_end_time?.timestamp)) {
                    const ret_obj_end_time_timestamp = new Date(
                      ret_obj_end_time.timestamp
                    );
                    if (
                      !(ret_obj_end_time_timestamp instanceof Date) ||
                      ret_obj_end_time_timestamp > new Date(context.timestamp)
                    ) {
                      result.push({
                        valid: false,
                        code: 20009,
                        description: `end/time/timestamp of return fulfillment should be less than or equal to context/timestamp of ${apiSeq}`,
                      });
                    }
                  } else {
                    result.push({
                      valid: false,
                      code: 20006,
                      description: `end/time/timestamp of return fulfillment is missing in ${apiSeq}`,
                    });
                  }
                } else {
                  result.push({
                    valid: false,
                    code: 20006,
                    description: `end/time/timestamp of return fulfillment is missing in ${apiSeq}`,
                  });
                }
              }
            } else {
              result.push({
                valid: false,
                code: 20006,
                description: `Return fulfillment end object is missing in ${apiSeq}`,
              });
            }

            // Check start object
            if (!_.isEmpty(RETobj[0]?.start)) {
              const ret_obj_start = RETobj[0]?.start;
              if (!_.isEmpty(ret_obj_start?.location)) {
                const ret_start_location = ret_obj_start.location;
                if (ret_start_location.id) {
                  result.push({
                    valid: false,
                    code: 20006,
                    description: `Return fulfillment start location id is not required in ${apiSeq}`,
                  });
                }
              } else {
                result.push({
                  valid: false,
                  code: 20006,
                  description: `Return fulfillment start location object is missing in ${apiSeq}`,
                });
              }
              if (!_.isEmpty(ret_obj_start?.time)) {
                const ret_obj_start_time = ret_obj_start.time;
                if (apiSeq === ApiSequence.ON_UPDATE_APPROVAL) {
                  if (!_.isEmpty(ret_obj_start_time?.range)) {
                    const ret_obj_start_time_range = ret_obj_start_time?.range;
                    const startTime: any = new Date(
                      ret_obj_start_time_range?.start
                    );
                    const endTime: any = new Date(
                      ret_obj_start_time_range?.end
                    );
                    if (
                      !(startTime instanceof Date) ||
                      !(endTime instanceof Date)
                    ) {
                      if (!(startTime instanceof Date)) {
                        result.push({
                          valid: false,
                          code: 20006,
                          description: `start/time/range/start of /${apiSeq} should have valid time format for return fulfillment`,
                        });
                      }
                      if (!(endTime instanceof Date)) {
                        result.push({
                          valid: false,
                          code: 20006,
                          description: `end/time/range/end of /${apiSeq} should have valid time format for return fulfillment`,
                        });
                      }
                    } else {
                      const timeDifStart = timeDiff(
                        ret_obj_start_time_range?.start,
                        context.timestamp
                      );
                      if (timeDifStart < 0) {
                        result.push({
                          valid: false,
                          code: 20009,
                          description: `start/time/range/start time of return fulfillment should be greater than context/timestamp of ${apiSeq}`,
                        });
                      }
                      const timeDifEnd = timeDiff(
                        ret_obj_start_time_range?.end,
                        context.timestamp
                      );
                      if (timeDifEnd <= 0) {
                        result.push({
                          valid: false,
                          code: 20009,
                          description: `start/time/range/end time of return fulfillment should be greater than context/timestamp of ${apiSeq}`,
                        });
                      }
                      await RedisService.setKey(
                        `${transaction_id}_${ApiSequence.ON_UPDATE_APPROVAL}`,
                        JSON.stringify({ start: startTime, end: endTime }),
                        TTL_IN_SECONDS
                      );
                      if (startTime >= endTime) {
                        result.push({
                          valid: false,
                          code: 20006,
                          description: `start/time/range/start should not be greater than or equal to start/time/range/end in return fulfillment`,
                        });
                      }
                    }
                  } else {
                    result.push({
                      valid: false,
                      code: 20006,
                      description: `Return fulfillment start time range object is missing in ${apiSeq}`,
                    });
                  }
                } else {
                  if (!_.isEmpty(ret_obj_start_time?.timestamp)) {
                    const ret_obj_start_time_timestamp: any = new Date(
                      ret_obj_start_time.timestamp
                    );
                    const onUpdateApprovalTimeRanges = await getRedisValue(
                      transaction_id,
                      `${ApiSequence.ON_UPDATE_APPROVAL}`
                    );
                    let startTime: any = "";
                    let endTime: any = "";
                    if (!isEmpty(onUpdateApprovalTimeRanges)) {
                      const { start, end }: any = onUpdateApprovalTimeRanges;
                      startTime = start;
                      endTime = end;
                    }
                    if (!(ret_obj_start_time_timestamp instanceof Date)) {
                      result.push({
                        valid: false,
                        code: 20006,
                        description: `start/time/timestamp of return fulfillment should have valid time format`,
                      });
                    } else {
                      if (
                        startTime instanceof Date &&
                        endTime instanceof Date &&
                        (ret_obj_start_time_timestamp < startTime ||
                          ret_obj_start_time_timestamp > endTime)
                      ) {
                        result.push({
                          valid: false,
                          code: 20009,
                          description: `start/time/timestamp of return fulfillment should be in the valid time/range as in ${ApiSequence.ON_UPDATE_APPROVAL}`,
                        });
                      }
                      if (ret_obj_start_time_timestamp > context.timestamp) {
                        result.push({
                          valid: false,
                          code: 20009,
                          description: `start/time/timestamp of return fulfillment should be less than context/timestamp of ${apiSeq}`,
                        });
                      }
                    }
                  } else {
                    result.push({
                      valid: false,
                      code: 20006,
                      description: `start/time/timestamp of return fulfillment is missing`,
                    });
                  }
                }
              } else {
                result.push({
                  valid: false,
                  code: 20006,
                  description: `Return fulfillment start time object is missing in ${apiSeq}`,
                });
              }
            } else {
              result.push({
                valid: false,
                code: 20006,
                description: `Return fulfillment start object is missing in ${apiSeq}`,
              });
            }
          }
        } catch (error: any) {
          console.error(
            `Error while checking Fulfillments Return Obj in /${apiSeq}, ${error.stack}`
          );
          result.push({
            valid: false,
            code: 23001,
            description: `Error checking Return object in /${apiSeq}: ${error.message}`,
          });
        }
      }

      // Check quote trail sum for 6-b
      try {
        if (sumQuoteBreakUp(on_update.quote)) {
          const price = Number(on_update.quote.price.value);
          const priceAtConfirm = Number(
            await getRedisValue(transaction_id, "quotePrice")
          );
          const returnCancelFulfillments = _.filter(
            on_update.fulfillments,
            (item) => item.type === "Return" || item.type === "Cancel"
          );
          if (
            apiSeq === ApiSequence.ON_UPDATE_PICKED ||
            apiSeq === ApiSequence.ON_UPDATE_DELIVERED
          ) {
            console.info(
              `Checking for quote_trail price and item quote price sum for ${apiSeq}`
            );
            checkQuoteTrailSum(
              returnCancelFulfillments,
              price,
              priceAtConfirm,
              result,
              ApiSequence.ON_UPDATE
            );
          }
        } else {
          result.push({
            valid: false,
            code: 41002,
            description: `The price breakdown in breakup does not match with the total_price for ${apiSeq}`,
          });
        }
      } catch (error: any) {
        console.error(
          `Error occurred while checking for quote_trail price and quote breakup price on /${apiSeq}`
        );
        result.push({
          valid: false,
          code: 23001,
          description: `Error checking quote trail sum in /${apiSeq}: ${error.message}`,
        });
      }

      // Check quote trail items for 6-b
      try {
        let cancelFulfillmentsArray = _.filter(on_update.fulfillments, {
          type: "Cancel",
        });
        if (cancelFulfillmentsArray.length !== 0) {
          const cancelFulfillments = cancelFulfillmentsArray[0];
          const quoteTrailItems = cancelFulfillments.tags.filter(
            (tag: any) => tag.code === "quote_trail"
          );
          if (quoteTrailItems.length !== 0) {
            if (apiSeq === ApiSequence.ON_UPDATE_INTERIM_REVERSE_QC) {
              quoteTrailItems.forEach((item: any) => {
                quoteTrailItemsSet.add(item);
              });
              await RedisService.setKey(
                `${transaction_id}_quoteTrailItemsSet`,
                JSON.stringify([...quoteTrailItemsSet]),
                TTL_IN_SECONDS
              );
            }
            const storedQuoteTrailItemsSet = new Set(
              (await getRedisValue(transaction_id, "quoteTrailItemsSet")) || []
            );
            storedQuoteTrailItemsSet.forEach((obj1: any) => {
              const exist = quoteTrailItems.some((obj2: any) =>
                _.isEqual(obj1, obj2)
              );
              if (!exist) {
                result.push({
                  valid: false,
                  code: 20006,
                  description: `Missing fulfillments/Cancel/tags/quote_trail as compared to previous calls`,
                });
              }
            });
          } else {
            result.push({
              valid: false,
              code: 20006,
              description: `Fulfillments/Cancel/tags/quote_trail is missing in ${apiSeq}`,
            });
          }
        } else {
          result.push({
            valid: false,
            code: 20006,
            description: `Fulfillments/Cancel is missing in ${apiSeq}`,
          });
        }
      } catch (error: any) {
        console.error(
          `Error occurred while checking for quote_trail in /${apiSeq}`
        );
        result.push({
          valid: false,
          code: 23001,
          description: `Error checking quote trail items in /${apiSeq}: ${error.message}`,
        });
      }

      // Reason_id mapping for return_request in 6-b
      try {
        console.info(`Reason_id mapping for return_request`);
        const fulfillments = on_update.fulfillments;
        fulfillments.forEach((fulfillment: any) => {
          if (fulfillment.type !== "Return") return;
          const tags = fulfillment.tags;
          let returnRequestPresent = false;
          tags.forEach((tag: any) => {
            if (tag.code !== "return_request") return;
            returnRequestPresent = true;
            const lists = tag.list;
            let reason_id = "not_found";
            lists.forEach((list: any) => {
              if (list.code === "reason_id") {
                reason_id = list.value;
              }
              if (list.code === "initiated_by") {
                if (list.value !== context.bap_id) {
                  result.push({
                    valid: false,
                    code: 20007,
                    description: `initiated_by should be ${context.bap_id}`,
                  });
                }
                if (
                  reason_id !== "not_found" &&
                  list.value === context.bap_id &&
                  !return_request_reasonCodes.includes(reason_id)
                ) {
                  result.push({
                    valid: false,
                    code: 20007,
                    description: `reason code allowed are ${return_request_reasonCodes}`,
                  });
                }
              }
            });
          });
          if (!returnRequestPresent) {
            result.push({
              valid: false,
              code: 20007,
              description: `return request is not present in the 'Return' fulfillment`,
            });
          }
        });
      } catch (error: any) {
        console.error(
          `!!Error while mapping return_request reason_id in ${apiSeq}`
        );
        result.push({
          valid: false,
          code: 23001,
          description: `Error mapping return_request reason_id in /${apiSeq}: ${error.message}`,
        });
      }
    }

    // Flow 6-c checks
    if (flow === "6-c") {
      try {
        console.info(`Reason_id mapping for return_rejected_request`);
        const fulfillments = on_update.fulfillments;
        fulfillments.forEach((fulfillment: any) => {
          if (fulfillment.type !== "Return") return;
          const tags = fulfillment.tags;
          let returnRejectedRequestPresent = false;
          tags.forEach((tag: any) => {
            if (tag.code !== "return_request") return;
            returnRejectedRequestPresent = true;
            const lists = tag.list;
            let reason_id = "";
            lists.forEach((list: any) => {
              if (list.code === "reason_id") {
                reason_id = list.value;
              }
              if (list.code === "initiated_by") {
                if (list.value !== context.bap_id) {
                  result.push({
                    valid: false,
                    code: 20007,
                    description: `initiated_by should be ${context.bap_id}`,
                  });
                }
                if (
                  reason_id &&
                  list.value === context.bap_id &&
                  !return_rejected_request_reasonCodes.includes(reason_id)
                ) {
                  result.push({
                    valid: false,
                    code: 20007,
                    description: `reason code allowed are ${return_rejected_request_reasonCodes}`,
                  });
                }
              }
            });
          });
          if (!returnRejectedRequestPresent) {
            result.push({
              valid: false,
              code: 20007,
              description: `return rejected request is not present in the 'Return' fulfillment`,
            });
          }
        });
      } catch (error: any) {
        console.error(
          `!!Error while mapping return_rejected_request reason_id in ${apiSeq}`
        );
        result.push({
          valid: false,
          code: 23001,
          description: `Error mapping return_rejected_request reason_id in /${apiSeq}: ${error.message}`,
        });
      }

      // Check quote trail sum for 6-c
      try {
        if (sumQuoteBreakUp(on_update.quote)) {
          const price = Number(on_update.quote.price.value);
          const priceAtConfirm = Number(
            await getRedisValue(transaction_id, "quotePrice")
          );
          const returnCancelFulfillments = _.filter(
            on_update.fulfillments,
            (item) => item.type === "Return" || item.type === "Cancel"
          );
          if (apiSeq === ApiSequence.ON_UPDATE_LIQUIDATED) {
            console.info(
              `Checking for quote_trail price and item quote price sum for ${apiSeq}`
            );
            checkQuoteTrailSum(
              returnCancelFulfillments,
              price,
              priceAtConfirm,
              result,
              ApiSequence.ON_UPDATE
            );
          }
        } else {
          result.push({
            valid: false,
            code: 41002,
            description: `The price breakdown in breakup does not match with the total_price for ${apiSeq}`,
          });
        }
      } catch (error: any) {
        console.error(
          `Error occurred while checking for quote_trail price and quote breakup price on /${apiSeq}`
        );
        result.push({
          valid: false,
          code: 23001,
          description: `Error checking quote trail sum in /${apiSeq}: ${error.message}`,
        });
      }

      // Check quote trail items for 6-c
      try {
        let cancelFulfillmentsArray = _.filter(on_update.fulfillments, {
          type: "Cancel",
        });
        if (cancelFulfillmentsArray.length !== 0) {
          const cancelFulfillments = cancelFulfillmentsArray[0];
          const quoteTrailItems = cancelFulfillments.tags.filter(
            (tag: any) => tag.code === "quote_trail"
          );
          if (quoteTrailItems.length !== 0) {
            if (apiSeq === ApiSequence.ON_UPDATE_LIQUIDATED) {
              quoteTrailItems.forEach((item: any) => {
                quoteTrailItemsSet.add(item);
              });
              await RedisService.setKey(
                `${transaction_id}_quoteTrailItemsSet`,
                JSON.stringify([...quoteTrailItemsSet]),
                TTL_IN_SECONDS
              );
            }
            const storedQuoteTrailItemsSet = new Set(
              (await getRedisValue(transaction_id, "quoteTrailItemsSet")) || []
            );
            storedQuoteTrailItemsSet.forEach((obj1: any) => {
              const exist = quoteTrailItems.some((obj2: any) =>
                _.isEqual(obj1, obj2)
              );
              if (!exist) {
                result.push({
                  valid: false,
                  code: 20006,
                  description: `Missing fulfillments/Cancel/tags/quote_trail as compared to previous calls`,
                });
              }
            });
          } else {
            result.push({
              valid: false,
              code: 20006,
              description: `Fulfillments/Cancel/tags/quote_trail is missing in ${apiSeq}`,
            });
          }
        } else {
          result.push({
            valid: false,
            code: 20006,
            description: `Fulfillments/Cancel is missing in ${apiSeq}`,
          });
        }
      } catch (error: any) {
        console.error(
          `Error occurred while checking for quote_trail in /${apiSeq}`
        );
        result.push({
          valid: false,
          code: 23001,
          description: `Error checking quote trail items in /${apiSeq}: ${error.message}`,
        });
      }
    }

    // Execute flow 6-a checks
    if (flow === "6-a") {
      await flowSixAChecks(message.order);
    }

    return result;
  } catch (error: any) {
    console.error(
      `!!Some error occurred while checking /${apiSeq} API`,
      error.stack
    );
    return [
      {
        valid: false,
        code: 23001,
        description: `Error occurred while checking /${apiSeq}: ${error.message}`,
      },
    ];
  }
};
