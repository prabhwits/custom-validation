import _, { isEmpty } from "lodash";
import { RedisService } from "ondc-automation-cache-lib";
import constants, {
  ApiSequence,
  buyerReturnId,
} from "../../../../utils/constants";
import {
  isObjectEmpty,
  checkBppIdOrBapId,
  checkContext,
  isValidUrl,
  timeDiff,
  isPresentInRedisSet,
} from "../../../../utils/helper";
import { condition_id } from "../../../../utils/constants/reasonCode";

const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;

// Error codes
const ERROR_CODES = {
  FEATURE_NOT_SUPPORTED_BNP: 21001, // Feature not supported (BNP)
  INCREASE_ITEM_QUANTITY: 21002, // Increase in item quantity (BNP)
  CHANGE_ITEM_QUOTE: 21003, // Change in item quote (BNP)
  INVALID_PART_CANCEL_REQUEST: 22508, // Invalid Part Cancel Request (BNP)
  CANCEL_RETURN_REQUEST: 22509, // Cancel Return Request (BNP)
  ITEM_NOT_FOUND: 30004, // Item not found (SNP)
  INVALID_RETURN_REQUEST: 30005, // Invalid return request (SNP)
  INVALID_ORDER: 30018, // Invalid Order (SNP)
  ORDER_PROCESSING: 31003, // Order processing in progress (SNP)
  BUSINESS_ERROR: 40000, // Business Error (SNP)
  FEATURE_NOT_SUPPORTED_SNP: 40001, // Feature not supported (SNP)
  CHANGE_IN_QUOTE: 40008, // Change in quote (SNP)
  EXPIRED_AUTHORIZATION: 40010, // Expired authorization (SNP)
  INVALID_AUTHORIZATION: 40011, // Invalid authorization (SNP)
  POLICY_ERROR: 50000, // Policy Error (SNP)
  UPDATION_NOT_POSSIBLE: 50002, // Updation not possible (SNP)
  FULFILLMENT_NOT_FOUND: 50007, // Fulfillment not found (SNP)
  FULFILLMENT_CANNOT_UPDATE: 50008, // Fulfillment cannot be updated (SNP)
};

// ValidationError interface
interface ValidationError {
  valid: boolean;
  code: number;
  description: string;
}

// addError function
const addError = (description: string, code: number): ValidationError => ({
  valid: false,
  code,
  description,
});

export const checkUpdate = async (
  data: any,
  apiSeq: any,
  settlementDetailSet: any,
  flow: any
) => {
  const result: ValidationError[] = [];
  try {
    if (!data || isObjectEmpty(data)) {
      return [
        addError("JSON cannot be empty", ERROR_CODES.FEATURE_NOT_SUPPORTED_BNP),
      ];
    }

    const { message, context }: any = data;
    const searchContextRaw = await RedisService.getKey(
      `${context.transaction_id}_${ApiSequence.SEARCH}_context`
    );
    const searchContext = searchContextRaw
      ? JSON.parse(searchContextRaw)
      : null;

    const selectRaw = await RedisService.getKey(
      `${context.transaction_id}_${ApiSequence.SELECT}`
    );
    const select = selectRaw ? JSON.parse(selectRaw) : null;
    if (!message || !context || isObjectEmpty(message)) {
      return [
        addError(
          "/context, /message, is missing or empty",
          ERROR_CODES.FEATURE_NOT_SUPPORTED_BNP
        ),
      ];
    }

    const update = message.order;
    const selectItemListRaw = await RedisService.getKey(
      `${context.transaction_id}_SelectItemList`
    );
    const selectItemList = selectItemListRaw
      ? JSON.parse(selectItemListRaw)
      : null;

    try {
      const timestampOnUpdatePartCancelRaw = await RedisService.getKey(
        `${context.transaction_id}_${ApiSequence.ON_UPDATE_PART_CANCEL}_tmpstmp`
      );
      const timestampOnUpdatePartCancel = timestampOnUpdatePartCancelRaw
        ? JSON.parse(timestampOnUpdatePartCancelRaw)
        : null;

      if (timestampOnUpdatePartCancel) {
        const timeDif = timeDiff(
          context.timestamp,
          timestampOnUpdatePartCancel
        );
        if (timeDif <= 0) {
          result.push(
            addError(
              `context/timestamp of /${apiSeq} should be greater than /${ApiSequence.ON_UPDATE_PART_CANCEL} context/timestamp`,
              ERROR_CODES.INVALID_PART_CANCEL_REQUEST
            )
          );
        }
      }

      if (flow === "6-b" || flow === "6-c") {
        if (
          apiSeq === ApiSequence.UPDATE_LIQUIDATED ||
          apiSeq === ApiSequence.UPDATE_REVERSE_QC
        ) {
          await RedisService.setKey(
            `${context.transaction_id}_timestamp_`,
            JSON.stringify([context.timestamp, apiSeq]),
            TTL_IN_SECONDS
          );
          await RedisService.setKey(
            `${context.transaction_id}_${apiSeq}_msgId`,
            context?.message_id,
            TTL_IN_SECONDS
          );
          const returnFulfillmentArr = _.filter(update?.fulfillments, {
            type: "Return",
          });
          function getReturnFfIdAndQuantity(returnFulfillment: any): any {
            if (!isEmpty(returnFulfillment?.tags)) {
              const returnFulifllmentTags = returnFulfillment?.tags[0];
              if (!isEmpty(returnFulifllmentTags?.list)) {
                const returnFulifillmentTagsList = returnFulifllmentTags.list;
                const exchangeArr = _.filter(returnFulifillmentTagsList, {
                  code: "exchange",
                });
                const replaceArr = _.filter(returnFulifillmentTagsList, {
                  code: "replace",
                });
                let replaceValue = "";
                const ffIdArr = _.filter(returnFulifillmentTagsList, {
                  code: "id",
                });
                const itemQuantityArr = _.filter(returnFulifillmentTagsList, {
                  code: "item_quantity",
                });
                let ffId = "";
                let itemQuantity = "";
                let exchangeValue = "";
                if (exchangeArr.length > 0 && exchangeArr[0]?.value) {
                  exchangeValue = exchangeArr[0]?.value;

                  // Validate exchange value
                  if (exchangeValue === "yes" || exchangeValue === "no") {
                    console.info(
                      `Exchange value is ${exchangeValue} for /${apiSeq}`
                    );

                    if (exchangeValue === "yes") {
                      console.info(
                        `Exchange is requested for /${apiSeq}. Proceeding with additional checks...`
                      );

                      // Validate condition_id
                      const conditionIdArr = _.filter(
                        returnFulifillmentTagsList,
                        { code: "condition_id" }
                      );
                      if (
                        conditionIdArr.length === 0 ||
                        !conditionIdArr[0]?.value
                      ) {
                        result.push(
                          addError(
                            `condition_id is missing for /${apiSeq}`,
                            ERROR_CODES.INVALID_RETURN_REQUEST
                          )
                        );
                      } else if (
                        !condition_id.includes(conditionIdArr[0]?.value)
                      ) {
                        result.push(
                          addError(
                            `Invalid condition_id: ${conditionIdArr[0]?.value} in ${apiSeq}. Only 001, 002, or 003 are allowed.`,
                            ERROR_CODES.INVALID_RETURN_REQUEST
                          )
                        );
                      }

                      // Validate condition_desc
                      const conditionDescArr = _.filter(
                        returnFulifillmentTagsList,
                        { code: "condition_desc" }
                      );
                      if (
                        conditionDescArr.length === 0 ||
                        !conditionDescArr[0]?.value
                      ) {
                        result.push(
                          addError(
                            `condition_desc is missing for /${apiSeq}`,
                            ERROR_CODES.INVALID_RETURN_REQUEST
                          )
                        );
                      }
                    }
                  } else {
                    result.push(
                      addError(
                        `Invalid exchange value: ${exchangeValue} in ${apiSeq}. Only "yes" or "no" are allowed.`,
                        ERROR_CODES.INVALID_RETURN_REQUEST
                      )
                    );
                  }
                }

                // Validate ffId
                if (ffIdArr.length > 0 && ffIdArr[0]?.value) {
                  ffId = ffIdArr[0]?.value;
                } else {
                  result.push(
                    addError(
                      `Return fulfillment/tags/list/code/id is missing in ${apiSeq}`,
                      ERROR_CODES.FULFILLMENT_NOT_FOUND
                    )
                  );
                }

                // Validate replace value
                if (replaceArr.length > 0 && replaceArr[0]?.value) {
                  replaceValue = replaceArr[0]?.value;
                  if (replaceValue === "yes" || replaceValue === "no") {
                    console.info(
                      `Valid replace value: ${replaceValue} for /${apiSeq}`
                    );
                  } else {
                    result.push(
                      addError(
                        `Invalid replace value: ${replaceValue} in ${apiSeq}. Only "yes" or "no" are allowed.`,
                        ERROR_CODES.INVALID_RETURN_REQUEST
                      )
                    );
                  }
                }

                // Validate item_quantity
                if (itemQuantityArr.length > 0 && itemQuantityArr[0]?.value) {
                  itemQuantity = itemQuantityArr[0]?.value;
                } else {
                  result.push(
                    addError(
                      `Return fulfillment/tags/list/code/item_quantity is missing in ${apiSeq}`,
                      ERROR_CODES.INVALID_RETURN_REQUEST
                    )
                  );
                }
                return { ffId: ffId, itemQuantity: itemQuantity };
              } else {
                result.push(
                  addError(
                    `Return fulfillment/tags/list is missing in ${apiSeq}`,
                    ERROR_CODES.INVALID_RETURN_REQUEST
                  )
                );
              }
            } else {
              result.push(
                addError(
                  `Return fulfillment/tags is missing in ${apiSeq}`,
                  ERROR_CODES.INVALID_RETURN_REQUEST
                )
              );
            }
          }
          if (returnFulfillmentArr.length > 0) {
            let obj = getReturnFfIdAndQuantity(returnFulfillmentArr[0]);
            if (returnFulfillmentArr.length > 1) {
              const obj2 = getReturnFfIdAndQuantity(returnFulfillmentArr[1]);
              const returnFfReverseQcRaw = await RedisService.getKey(
                `${context.transaction_id}_${ApiSequence.UPDATE_REVERSE_QC}_ffId_itemQuantiy`
              );
              const returnFfReverseQc = returnFfReverseQcRaw
                ? JSON.parse(returnFfReverseQcRaw)
                : null;
              if (obj2?.ffId == returnFfReverseQc?.ffId) {
                obj.ffId = obj2?.ffId;
                obj.itemQuantity = obj2?.itemQuantity;
              }
            }
            await RedisService.setKey(
              `${context.transaction_id}_${apiSeq}_ffId_itemQuantiy`,
              JSON.stringify({
                ffId: obj?.ffId,
                itemQuantity: obj?.itemQuantity,
                apiSeq: apiSeq,
              }),
              TTL_IN_SECONDS
            );
          } else {
            result.push(
              addError(
                `Return fulfillment is missing in ${apiSeq}`,
                ERROR_CODES.FULFILLMENT_NOT_FOUND
              )
            );
          }
        } else {
          const timestampRaw = await RedisService.getKey(
            `${context.transaction_id}_timestamp_`
          );
          const timestamp = timestampRaw ? JSON.parse(timestampRaw) : null;
          if (timestamp && timestamp.length != 0) {
            const timeDif2 = timeDiff(context.timestamp, timestamp[0]);
            if (timeDif2 <= 0) {
              result.push(
                addError(
                  `context/timestamp of /${apiSeq} should be greater than context/timestamp of /${timestamp[1]}`,
                  ERROR_CODES.UPDATION_NOT_POSSIBLE
                )
              );
            }
          } else {
            result.push(
              addError(
                `context/timestamp of the previous call is missing or the previous action call itself is missing`,
                ERROR_CODES.UPDATION_NOT_POSSIBLE
              )
            );
          }
          await RedisService.setKey(
            `${context.transaction_id}_timestamp_`,
            JSON.stringify([context.timestamp, apiSeq]),
            TTL_IN_SECONDS
          );
        }
      }
    } catch (e: any) {
      console.error(`Error while context/timestamp for the /${apiSeq}`);
    }

    // Checking bap_id and bpp_id format
    const checkBap = checkBppIdOrBapId(context.bap_id);
    const checkBpp = checkBppIdOrBapId(context.bpp_id);
    if (checkBap) {
      result.push(
        addError(
          "context/bap_id should not be a url",
          ERROR_CODES.BUSINESS_ERROR
        )
      );
    }
    if (checkBpp) {
      result.push(
        addError(
          "context/bpp_id should not be a url",
          ERROR_CODES.BUSINESS_ERROR
        )
      );
    }

    const domain = await RedisService.getKey(
      `${context.transaction_id}_domain`
    );
    if (!_.isEqual(data.context.domain.split(":")[1], domain)) {
      result.push(
        addError(
          `Domain should be same in each action`,
          ERROR_CODES.BUSINESS_ERROR
        )
      );
    }

    // Checking for valid context object
    try {
      console.info(`Checking context for /${apiSeq} API`);
      const res: any = checkContext(context, constants.UPDATE);
      if (!res.valid) {
        Object.keys(res.ERRORS).forEach((key) => {
          result.push(addError(res.ERRORS[key], ERROR_CODES.BUSINESS_ERROR));
        });
      }
    } catch (error: any) {
      console.error(
        `!!Some error occurred while checking /${apiSeq} context, ${error.stack}`
      );
    }

    // Comparing context.city with /search city
    try {
      console.info(`Comparing city of /${constants.SEARCH} and /${apiSeq}`);
      if (!_.isEqual(searchContext.city, context.city)) {
        result.push(
          addError(
            `City code mismatch in /${constants.SEARCH} and /${apiSeq}`,
            ERROR_CODES.BUSINESS_ERROR
          )
        );
      }
    } catch (error: any) {
      console.error(
        `!!Error while comparing city in /${constants.SEARCH} and /${apiSeq}, ${error.stack}`
      );
    }

    // Comparing Timestamp of /update with /on_init API
    try {
      console.info(
        `Comparing timestamp of /${constants.ON_INIT} and /${apiSeq}`
      );
      const onInitTmpstmpRaw = await RedisService.getKey(
        `${context.transaction_id}_${ApiSequence.ON_INIT}_tmpstmp`
      );
      const onInitTmpstmp = onInitTmpstmpRaw
        ? JSON.parse(onInitTmpstmpRaw)
        : null;
      if (_.gte(onInitTmpstmp, context.timestamp)) {
        result.push(
          addError(
            `Timestamp for /${constants.ON_INIT} api cannot be greater than or equal to /${apiSeq} api`,
            ERROR_CODES.UPDATION_NOT_POSSIBLE
          )
        );
      }

      await RedisService.setKey(
        `${context.transaction_id}_tmpstmp`,
        JSON.stringify(context.timestamp),
        TTL_IN_SECONDS
      );
    } catch (error: any) {
      console.error(
        `!!Error while comparing timestamp for /${constants.ON_INIT} and /${apiSeq} api, ${error.stack}`
      );
    }

    // Checking for payment object in message.order
    try {
      const payment = update.payment;
      if (payment) {
        const prevPaymentRaw = await RedisService.getKey(
          `${context.transaction_id}_prevPayment`
        );
        const prevPayment = prevPaymentRaw ? JSON.parse(prevPaymentRaw) : null;

        const settlement_details = payment["@ondc/org/settlement_details"];
        if(settlement_details[0] && !isPresentInRedisSet(settlementDetailSet, settlement_details[0])) {
          settlementDetailSet.add(settlement_details[0]);
        }

        prevPayment["@ondc/org/settlement_details"] = [...settlementDetailSet];
        
        await RedisService.setKey(
          `${context.transaction_id}_prevPayment`,
          JSON.stringify(prevPayment),
          TTL_IN_SECONDS
        );

        await RedisService.setKey(
          `${context.transaction_id}_settlementDetailSet`,
          JSON.stringify([...settlementDetailSet]),
          TTL_IN_SECONDS
        );
        const quoteTrailSum = await RedisService.getKey(`${context.transaction_id}_quoteTrailSum`);


        if(settlement_details?.[0]?.settlement_amount && quoteTrailSum && Number(settlement_details?.[0]?.settlement_amount) !== Number(quoteTrailSum)) {
          result.push(
            addError(
              `Settlement amount in payment object should be equal to the sum of quote trail i.e ${quoteTrailSum}`,
              ERROR_CODES.INVALID_ORDER
            )
          );
        }
      }
    } catch (error: any) {
      console.error(
        `!!Error occurred while checking for payment object in /${apiSeq} API`,
        error.stack
      );
    }

    if (flow === "6-a") {
      try {
        console.info(`Checking for fulfillment ID in /${apiSeq} API`);

        const cancelFulfillmentID = await RedisService.getKey(
          `${context.transaction_id}_cancelFulfillmentID`
        );
        update.fulfillments.forEach((fulfillment: any) => {
          if (
            fulfillment.type === "Cancel" &&
            fulfillment.id !== cancelFulfillmentID
          ) {
            result.push(
              addError(
                `Cancel fulfillment ID should be same as the one in /${constants.ON_UPDATE} API`,
                ERROR_CODES.FULFILLMENT_NOT_FOUND
              )
            );
          }
        });
      } catch (error: any) {
        console.error(
          `!!Error occurred while checking for fulfillment ID in /${apiSeq} API`,
          error.stack
        );
      }
    }

    // Checking for return_request object in /Update
    if (update.fulfillments[0].tags) {
      try {
        console.info(`Checking for return_request object in /${apiSeq}`);
        const updateItemSet: any = {};
        const updateItemList: any = [];
        const updateReturnId: any = [];
        const itemFlfllmntsRaw = await RedisService.getKey(
          `${context.transaction_id}_itemFlfllmnts`
        );
        const itemFlfllmnts = itemFlfllmntsRaw
          ? JSON.parse(itemFlfllmntsRaw)
          : null;
        let return_request_obj = null;
        update.fulfillments.forEach((item: any) => {
          item.tags?.forEach((tag: any) => {
            if (tag.code === "return_request") {
              return_request_obj = tag;

              if (!Array.isArray(tag.list)) {
                console.error(
                  `tag.list is missing or not an array in ${apiSeq}`
                );
                result.push(
                  addError(
                    `tag.list is missing or not an array in ${apiSeq}`,
                    ERROR_CODES.INVALID_RETURN_REQUEST
                  )
                );
                return;
              }
              let key: any = null;
              tag.list.forEach(async (item: any) => {
                if (item.code === "item_id") {
                  key = item.value;
                  if (!selectItemList.includes(key)) {
                    console.error(
                      `Item code should be present in /${constants.SELECT} API`
                    );
                    result.push(
                      addError(
                        `Item ID should be present in /${constants.SELECT} API for /${apiSeq}`,
                        ERROR_CODES.ITEM_NOT_FOUND
                      )
                    );
                  } else {
                    updateItemSet[item.value] = item.value;
                    updateItemList.push(item.value);
                  }
                }
                // console.log("itemFlfllmnts", itemFlfllmnts)

                // if (item.code === "id") {
                //   const valuesArray = Object.values(
                //     (itemFlfllmnts as { values: any }).values
                //   );
                //   if (valuesArray.includes(item.value)) {
                //     result.push(
                //       addError(
                //         `${item.value} is not a unique fulfillment`,
                //         ERROR_CODES.FULFILLMENT_NOT_FOUND
                //       )
                //     );
                //   } else {
                //     updateReturnId.push(item.value);
                //   }
                // }
                // if (item.code === "replace") {
                //   console.info(
                //     `Checking for valid replace value for /${apiSeq}`
                //   );
                //   let replaceValue = item.value;
                //   if (replaceValue !== "yes" && replaceValue !== "no") {
                //     console.error(
                //       `Invalid replace value: ${replaceValue} for /${apiSeq}`
                //     );
                //     result.push(
                //       addError(
                //         `Invalid replace value: ${replaceValue} in ${apiSeq} (valid: 'yes' or 'no')`,
                //         ERROR_CODES.INVALID_RETURN_REQUEST
                //       )
                //     );
                //   }
                // }

                if (item.code === "item_quantity") {
                  let val = item.value;
                  updateItemSet[key] = val;
                }

                if (item.code === "reason_id") {
                  console.info(
                    `Checking for valid buyer reasonID for /${apiSeq}`
                  );
                  let reasonId = item.value;
                  if (!buyerReturnId.has(reasonId)) {
                    console.error(
                      `reason_id should be a valid cancellation id (buyer app initiated)`
                    );
                    result.push(
                      addError(
                        `reason_id is not a valid reason id (buyer app initiated)`,
                        ERROR_CODES.INVALID_RETURN_REQUEST
                      )
                    );
                  }
                }

                // if (item.code === "images") {
                //   const images = item.value;
                //   const allurls = images?.every((img: string) =>
                //     isValidUrl(img)
                //   );
                //   if (!allurls) {
                //     console.error(
                //       `Images array should be provided as comma-separated values and each image should be a URL`
                //     );
                //     result.push(
                //       addError(
                //         `Images array should be provided as comma-separated values and each image should be a URL for /${apiSeq}`,
                //         ERROR_CODES.INVALID_RETURN_REQUEST
                //       )
                //     );
                //   }
                // }
              });
            }
          });
        });
        // await RedisService.setKey(
        //   `${context.transaction_id}_updateReturnId`,
        //   JSON.stringify(updateReturnId),
        //   TTL_IN_SECONDS
        // );
        // await RedisService.setKey(
        //   `${context.transaction_id}_updateItemSet`,
        //   JSON.stringify(updateItemSet),
        //   TTL_IN_SECONDS
        // );
        // await RedisService.setKey(
        //   `${context.transaction_id}_updateItemList`,
        //   JSON.stringify(updateItemList),
        //   TTL_IN_SECONDS
        // );
        // await RedisService.setKey(
        //   `${context.transaction_id}_return_request_obj`,
        //   JSON.stringify(return_request_obj),
        //   TTL_IN_SECONDS
        // );
      } catch (error: any) {
        console.error(
          `Error while checking for return_request_obj for /${apiSeq} , ${error}`
        );
      }
    }

    return result;
  } catch (error: any) {
    console.error(
      `!!Some error occurred while checking /${apiSeq} API`,
      error.stack
    );
    return [
      addError(
        `Internal error while checking /${apiSeq} API`,
        ERROR_CODES.BUSINESS_ERROR
      ),
    ];
  }
};
