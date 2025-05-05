import _ from "lodash";
import constants, { ApiSequence } from "../../../../utils/constants";
import {
  isObjectEmpty,
  checkContext,
  checkBppIdOrBapId,
  compareObjects,
  sumQuoteBreakUp,
  payment_status,
  mapCancellationID,
  checkQuoteTrail,
  checkQuoteTrailSum,
  isValidISO8601Duration,
  addMsgIdToRedisSet,
} from "../../../../utils/helper";
import { RedisService } from "ondc-automation-cache-lib";

interface ValidationResult {
  valid: boolean;
  code: number;
  description: string;
}

export const onCancel = async (
  data: any,
  flow: string
): Promise<ValidationResult[]> => {
  const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;
  const results: ValidationResult[] = [];

  try {
    // Check if data is empty or invalid
    if (!data || isObjectEmpty(data)) {
      return [
        {
          valid: false,
          code: 20006,
          description: `JSON cannot be empty in /${constants.ON_CANCEL}`,
        },
      ];
    }

    const { message, context } = data;
    if (
      !message ||
      !context ||
      !message.order ||
      isObjectEmpty(message) ||
      isObjectEmpty(message.order)
    ) {
      return [
        {
          valid: false,
          code: 20006,
          description: `/context, /message, /order or /message/order is missing or empty in /${constants.ON_CANCEL}`,
        },
      ];
    }

    const transaction_id = context.transaction_id;
    const on_cancel = message.order;

    // Validate context
    try {
      const contextRes = checkContext(context, constants.ON_CANCEL);
      if (!contextRes?.valid) {
        const errors = contextRes?.ERRORS;

        Object.keys(errors).forEach((key: any) => {
          results.push({
            valid: false,
            code: 20006,
            description: errors[key],
          });
        });
      }
    } catch (error: any) {
      console.error(
        `Error while checking context for /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal Error - The response could not be processed due to an internal error. The SNP should retry the request. /${constants.ON_CANCEL}`,
      });
    }

    // Validate BAP and BPP IDs
    if (checkBppIdOrBapId(context.bap_id)) {
      results.push({
        valid: false,
        code: 20006,
        description: "context/bap_id should not be a URL",
      });
    }
    if (checkBppIdOrBapId(context.bpp_id)) {
      results.push({
        valid: false,
        code: 20006,
        description: "context/bpp_id should not be a URL",
      });
    }

    // Validate message ID
    try {
      console.info(`Checking Message Id for /${constants.ON_CANCEL}`);
      if (flow === "4") {
        const cancelMsgId = await RedisService.getKey(
          `${transaction_id}_${ApiSequence.CANCEL}_msgId`
        );

        if (!_.isEqual(cancelMsgId, context.message_id)) {
          results.push({
            valid: false,
            code: 20008,
            description: `Message IDs for /${constants.CANCEL} and /${constants.ON_CANCEL} should be the same`,
          });
        }
        console.info(`Adding Message Id /${constants.CANCEL}`);
        await RedisService.setKey(
          `${transaction_id}_${ApiSequence.ON_CANCEL}_msgId`,
          data.context.message_id,
          TTL_IN_SECONDS
        );
      }
      // for flow === "5"
      else {
        await RedisService.setKey(
          `${transaction_id}_${ApiSequence.ON_CANCEL}_msgId`,
          data.context.message_id,
          TTL_IN_SECONDS
        );

        const isMsgIdNotPresent = await addMsgIdToRedisSet(
          context.transaction_id,
          context.message_id,
          ApiSequence.ON_CANCEL
        );
        if (!isMsgIdNotPresent) {
          results.push({
            valid: false,
            code: 20000,
            description: `Message id should not be same with previous calls`,
          });
        }
      }
    } catch (error: any) {
      console.error(
        `Error while checking message ID for /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during message ID validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate domain
    try {
      const domain = await RedisService.getKey(`${transaction_id}_domain`);
      if (domain && !_.isEqual(context.domain.split(":")[1], domain)) {
        results.push({
          valid: false,
          code: 20006,
          description: `Domain must be the same across all actions in /${constants.ON_CANCEL}`,
        });
      }
    } catch (error: any) {
      console.error(
        `Error while checking domain for /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during domain validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate city
    try {
      console.info(
        `Comparing city of /${constants.SEARCH} and /${constants.ON_CANCEL}`
      );
      const searchContextRaw = await RedisService.getKey(
        `${transaction_id}_${ApiSequence.SEARCH}_context`
      );
      const searchContext = searchContextRaw
        ? JSON.parse(searchContextRaw)
        : null;
      if (searchContext && !_.isEqual(searchContext.city, context.city)) {
        results.push({
          valid: false,
          code: 20006,
          description: `City code mismatch between /${constants.SEARCH} and /${constants.ON_CANCEL}`,
        });
      }
    } catch (error: any) {
      console.error(
        `Error while comparing city for /${constants.SEARCH} and /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during city validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate timestamp
    try {
      console.info(
        `Comparing timestamp of /${constants.ON_CONFIRM} and /${constants.ON_CANCEL}`
      );
      const onConfirmTimestampRaw = await RedisService.getKey(
        `${transaction_id}_${ApiSequence.ON_CONFIRM}_tmpstmp`
      );
      const onConfirmTimestamp = onConfirmTimestampRaw
        ? JSON.parse(onConfirmTimestampRaw)
        : null;

      console.log("first");
      if (onConfirmTimestamp && _.gte(onConfirmTimestamp, context.timestamp)) {
        results.push({
          valid: false,
          code: 20009,
          description: `Timestamp for /${constants.ON_CONFIRM} must be earlier than /${constants.ON_CANCEL}`,
        });
      }
      await RedisService.setKey(
        `${transaction_id}_${ApiSequence.ON_CANCEL}_tmpstmp`,
        JSON.stringify(context.timestamp),
        TTL_IN_SECONDS
      );
    } catch (error: any) {
      console.error(
        `Error while comparing timestamp for /${constants.ON_CONFIRM} and /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during timestamp validation in /${constants.ON_CANCEL}`,
      });
    }

    // Store on_cancel data
    try {
      await RedisService.setKey(
        `${transaction_id}_${ApiSequence.ON_CANCEL}`,
        JSON.stringify(data),
        TTL_IN_SECONDS
      );
    } catch (error: any) {
      console.error(
        `Error while storing cancel data for /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error while storing cancel data in /${constants.ON_CANCEL}`,
      });
    }

    // Validate order ID
    try {
      console.info(
        `Comparing order IDs in /${constants.ON_CANCEL} and /${constants.ON_CONFIRM}`
      );

      const confirmOrderId = await RedisService.getKey(
        `${transaction_id}_cnfrmOrdrId`
      );
      if (confirmOrderId !== on_cancel.id) {
        results.push({
          valid: false,
          code: 20007,
          description: `Order ID provided in /${constants.ON_CANCEL} was not found`,
        });
      }
    } catch (error: any) {
      console.error(
        `Error while comparing order IDs in /${constants.ON_CONFIRM} and /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during order ID validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate provider ID and location
    try {
      console.info(
        `Checking provider ID and location in /${constants.ON_CANCEL}`
      );
      const providerIdRaw = await RedisService.getKey(
        `${transaction_id}_providerId`
      );
      const providerId = providerIdRaw ? JSON.parse(providerIdRaw) : null;
      const providerLocRaw = await RedisService.getKey(
        `${transaction_id}_providerLoc`
      );
      const providerLoc = providerLocRaw ? JSON.parse(providerLocRaw) : null;
      if (on_cancel.provider?.id !== providerId) {
        results.push({
          valid: false,
          code: 20006,
          description: `Provider ID mismatches in /${constants.ON_SELECT} and /${constants.ON_CANCEL}`,
        });
      }
      if (on_cancel.provider?.locations?.[0]?.id !== providerLoc) {
        results.push({
          valid: false,
          code: 20006,
          description: `provider.locations[0].id mismatches in /${constants.ON_SEARCH} and /${constants.ON_CANCEL}`,
        });
      }
    } catch (error: any) {
      console.error(
        `Error while checking provider ID and location in /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during provider ID and location validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate item IDs
    const itemSet = new Set<string>();
    try {
      console.info(`Checking item IDs in /${constants.ON_CANCEL}`);
      const itemsOnSelectRaw = await RedisService.getKey(
        `${transaction_id}_SelectItemList`
      );
      const itemsOnSelect = itemsOnSelectRaw
        ? JSON.parse(itemsOnSelectRaw)
        : null;
      const itemsList = on_cancel.items || [];
      const quoteobj = on_cancel.quote?.breakup || [];
      quoteobj.forEach((item: any) => {
        if (
          !itemsOnSelect?.includes(item["@ondc/org/item_id"]) &&
          item["@ondc/org/title_type"] === "item"
        ) {
          results.push({
            valid: false,
            code: 20006,
            description: `Invalid Item ID provided in quote object /${constants.ON_CANCEL}: ${item.id}`,
          });
        }
      });
      itemsList.forEach((item: any) => {
        if (!itemsOnSelect?.includes(item.id)) {
          results.push({
            valid: false,
            code: 20006,
            description: `Invalid Item ID provided in /${constants.ON_CANCEL}: ${item.id}`,
          });
        } else {
          itemSet.add(item.id);
        }
      });
    } catch (error: any) {
      console.error(
        `Error while checking item IDs for /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during item ID validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate fulfillment IDs and item count
    try {
      console.info(
        `Checking fulfillment IDs and item count in /${constants.ON_CANCEL}`
      );
      const fulfillmentIdsOnSelectRaw = await RedisService.getKey(
        `${transaction_id}_selectFlflmntSet`
      );
      const fulfillmentIdsOnSelect = fulfillmentIdsOnSelectRaw
        ? JSON.parse(fulfillmentIdsOnSelectRaw)
        : null;
      const itemList = on_cancel.items || [];
      itemList.forEach((item: any, index: number) => {
        if (fulfillmentIdsOnSelect) {
          if (
            fulfillmentIdsOnSelect.includes(item.fulfillment_id) &&
            item.quantity.count !== 0
          ) {
            results.push({
              valid: false,
              code: 20006,
              description: `Item count should be 0 for /${constants.ON_CANCEL} in forward shipment`,
            });
          } else if (
            !fulfillmentIdsOnSelect.includes(item.fulfillment_id) &&
            item.quantity.count === 0
          ) {
            results.push({
              valid: false,
              code: 20006,
              description: `Item count can't be 0 for /${constants.ON_CANCEL} in cancel shipment`,
            });
          }
        }
      });
    } catch (error: any) {
      console.error(
        `Error while checking fulfillment IDs for /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during fulfillment ID validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate fulfillment details for flow 5
    if (flow === "5") {
      try {
        console.info(
          `Checking fulfillment type Delivery for /${constants.ON_CANCEL}`
        );
        const deliveryFFObj = _.filter(on_cancel.fulfillments, {
          type: "Delivery",
        });
        if (!deliveryFFObj.length) {
          results.push({
            valid: false,
            code: 20006,
            description: `Fulfillment type Delivery is missing in /${constants.ON_CANCEL}`,
          });
        } else {
          const deliveryFF = deliveryFFObj[0];
          const deliveryFFStart = deliveryFF.start;
          const deliveryFFEnd = deliveryFF.end;

          function checkFFStartOrEnd(ffStartOrEnd: any, startOrEnd: string) {
            if (!ffStartOrEnd) {
              results.push({
                valid: false,
                code: 20006,
                description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()} is missing in /${
                  constants.ON_CANCEL
                }`,
              });
              return;
            }
            if (_.isEmpty(ffStartOrEnd.location)) {
              results.push({
                valid: false,
                code: 20006,
                description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/location is missing in /${
                  constants.ON_CANCEL
                }`,
              });
            } else if (startOrEnd === "End") {
              if (_.isEmpty(ffStartOrEnd.location?.address)) {
                results.push({
                  valid: false,
                  code: 20006,
                  description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/location/address is missing in /${
                    constants.ON_CANCEL
                  }`,
                });
              } else {
                if (_.isEmpty(ffStartOrEnd.location.address.name)) {
                  results.push({
                    valid: false,
                    code: 20006,
                    description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/location/address/name is missing in /${
                      constants.ON_CANCEL
                    }`,
                  });
                }
                if (_.isEmpty(ffStartOrEnd.location.address.building)) {
                  results.push({
                    valid: false,
                    code: 20006,
                    description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/location/address/building is missing in /${
                      constants.ON_CANCEL
                    }`,
                  });
                }
                if (_.isEmpty(ffStartOrEnd.location.address.country)) {
                  results.push({
                    valid: false,
                    code: 20006,
                    description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/location/address/country is missing in /${
                      constants.ON_CANCEL
                    }`,
                  });
                }
              }
            }
            if (_.isEmpty(ffStartOrEnd.time)) {
              results.push({
                valid: false,
                code: 20006,
                description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/time is missing in /${
                  constants.ON_CANCEL
                }`,
              });
            } else if (_.isEmpty(ffStartOrEnd.time.range)) {
              results.push({
                valid: false,
                code: 20006,
                description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/time/range is missing in /${
                  constants.ON_CANCEL
                }`,
              });
            } else {
              if (!ffStartOrEnd.time.range.start) {
                results.push({
                  valid: false,
                  code: 20006,
                  description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/time/range/start is missing in /${
                    constants.ON_CANCEL
                  }`,
                });
              } else {
                const date = new Date(ffStartOrEnd.time.range.start);
                if (String(date) === "Invalid Date") {
                  results.push({
                    valid: false,
                    code: 20006,
                    description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/time/range/start is not a valid date format in /${
                      constants.ON_CANCEL
                    }`,
                  });
                }
              }
              if (!ffStartOrEnd.time.range.end) {
                results.push({
                  valid: false,
                  code: 20006,
                  description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/time/range/end is missing in /${
                    constants.ON_CANCEL
                  }`,
                });
              } else {
                const date = new Date(ffStartOrEnd.time.range.end);
                if (String(date) === "Invalid Date") {
                  results.push({
                    valid: false,
                    code: 20006,
                    description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/time/range/end is not a valid date format in /${
                      constants.ON_CANCEL
                    }`,
                  });
                }
              }
            }
            if (_.isEmpty(ffStartOrEnd.contact)) {
              results.push({
                valid: false,
                code: 20006,
                description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/contact is missing in /${
                  constants.ON_CANCEL
                }`,
              });
            } else {
              if (!ffStartOrEnd.contact.phone) {
                results.push({
                  valid: false,
                  code: 20006,
                  description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/contact/phone is missing in /${
                    constants.ON_CANCEL
                  }`,
                });
              } else if (isNaN(Number(ffStartOrEnd.contact.phone))) {
                results.push({
                  valid: false,
                  code: 20006,
                  description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/contact/phone is not a valid phone number in /${
                    constants.ON_CANCEL
                  }`,
                });
              }
              if (!ffStartOrEnd.contact.email) {
                results.push({
                  valid: false,
                  code: 20006,
                  description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/contact/email is missing in /${
                    constants.ON_CANCEL
                  }`,
                });
              } else if (typeof ffStartOrEnd.contact.email !== "string") {
                results.push({
                  valid: false,
                  code: 20006,
                  description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/contact/email is not a string in /${
                    constants.ON_CANCEL
                  }`,
                });
              }
            }
            if (startOrEnd === "End") {
              if (_.isEmpty(ffStartOrEnd.person)) {
                results.push({
                  valid: false,
                  code: 20006,
                  description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/person is missing in /${
                    constants.ON_CANCEL
                  }`,
                });
              } else if (
                !ffStartOrEnd.person.name ||
                typeof ffStartOrEnd.person.name !== "string"
              ) {
                results.push({
                  valid: false,
                  code: 20006,
                  description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/person/name is missing or not a string in /${
                    constants.ON_CANCEL
                  }`,
                });
              }
            }
          }

          checkFFStartOrEnd(deliveryFFStart, "Start");
          checkFFStartOrEnd(deliveryFFEnd, "End");
        }
      } catch (error: any) {
        console.error(
          `Error while checking fulfillment type Delivery in /${constants.ON_CANCEL}: ${error.stack}`
        );
        results.push({
          valid: false,
          code: 23001,
          description: `Internal error during Delivery fulfillment validation in /${constants.ON_CANCEL}`,
        });
      }
    }

    // Validate item count
    try {
      console.info(
        `Matching item count in message/order/items with that in /${constants.ON_SELECT}`
      );
      const selectItemsRaw = await RedisService.getKey(
        `${transaction_id}_items`
      );
      const select_items = selectItemsRaw ? JSON.parse(selectItemsRaw) : [];
      const onCancelItems: any[] = on_cancel.items || [];
      let onCancelItemCount: number = 0;
      let onSelectItemCount: number = 0;
      select_items.forEach((selectItem: any) => {
        onSelectItemCount += selectItem.quantity.count / 1;
      });
      onCancelItems.forEach((item: any) => {
        onCancelItemCount += item.quantity.count / 1;
      });
      if (onSelectItemCount !== onCancelItemCount) {
        results.push({
          valid: false,
          code: 20006,
          description: `Total item count in message/order/items does not match with item count of /${constants.ON_SELECT}`,
        });
      }
    } catch (error: any) {
      console.error(
        `Error while matching item count in /${constants.ON_CANCEL} and /${constants.ON_SELECT}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during item count validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate quote breakup
    try {
      console.info(`Checking quote breakup prices for /${constants.ON_CANCEL}`);
      if (!sumQuoteBreakUp(on_cancel.quote)) {
        results.push({
          valid: false,
          code: 22503,
          description: `Item quote breakup prices for /${constants.ON_CANCEL} should equal the total price`,
        });
      }
    } catch (error: any) {
      console.error(
        `Error while comparing quote object for /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during quote breakup validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate quote trail and sum
    try {
      if (sumQuoteBreakUp(on_cancel.quote)) {
        console.info(
          `Checking quote_trail price and item quote price sum for /${constants.ON_CANCEL}`
        );
        const price = Number(on_cancel.quote?.price?.value);
        const priceAtConfirmRaw = await RedisService.getKey(
          `${transaction_id}_quotePrice`
        );
        const priceAtConfirm = priceAtConfirmRaw
          ? JSON.parse(priceAtConfirmRaw)
          : null;
        let cancelFulfillments =
          flow === "5"
            ? _.filter(on_cancel.fulfillments, { type: "RTO" })
            : _.filter(on_cancel.fulfillments, { type: "Cancel" });
        if (!cancelFulfillments.length && flow === "4") {
          results.push({
            valid: false,
            code: 20006,
            description: `Fulfillment type Cancel is missing in /${constants.ON_CANCEL}`,
          });
        }
        checkQuoteTrailSum(
          cancelFulfillments,
          price,
          priceAtConfirm,
          results,
          ApiSequence.ON_CANCEL
        );
      }
    } catch (error: any) {
      console.error(
        `Error while comparing quote_trail object for /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during quote trail validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate quote trail items
    try {
      console.info(
        `Checking item IDs in quote object in /${constants.ON_CANCEL}`
      );
      const selectPriceMapRaw = await RedisService.getKey(
        `${transaction_id}_selectPriceMap`
      );
      const selectPriceMap = new Map<string, string>(
        selectPriceMapRaw ? JSON.parse(selectPriceMapRaw) : []
      );
      let cancelFulfillments =
        flow === "5"
          ? _.filter(on_cancel.fulfillments, { type: "RTO" })
          : _.filter(on_cancel.fulfillments, { type: "Cancel" });
      for (let obj of cancelFulfillments) {
        const quoteTrailItems = _.filter(obj.tags, { code: "quote_trail" });
        checkQuoteTrail(quoteTrailItems, results, selectPriceMap, itemSet);
      }
    } catch (error: any) {
      console.error(
        `Error while checking quote object in /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during quote trail item validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate cancellation reason
    try {
      console.info(`Mapping cancellation_reason_id in /${constants.ON_CANCEL}`);
      const cancellationObj = on_cancel.cancellation;
      const cancelled_by = cancellationObj?.cancelled_by;
      const reason_id = cancellationObj?.reason?.id;
      if (!cancellationObj || !reason_id) {
        results.push({
          valid: false,
          code: 20006,
          description: `Cancellation object or reason ID is missing in /${constants.ON_CANCEL}`,
        });
      } else {
        if (cancelled_by === context.bap_id) {
          mapCancellationID("BNP", reason_id, results);
        } else {
          mapCancellationID("SNP", reason_id, results);
        }
        if (flow === "4" && cancelled_by !== context.bap_id) {
          results.push({
            valid: false,
            code: 20006,
            description: `cancelled_by entity should be the same as context/bap_id in /${constants.ON_CANCEL}`,
          });
        }
        if (flow === "4") {
          const cancelReasonId = await RedisService.getKey(
            `${transaction_id}_cnclRid`
          );

          if (reason_id !== cancelReasonId) {
            results.push({
              valid: false,
              code: 22502,
              description: `Cancellation reason provided in /${constants.ON_CANCEL} is invalid`,
            });
          }
        }
      }
    } catch (error: any) {
      console.error(
        `Error while mapping cancellation_reason_id in /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during cancellation reason validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate fulfillment IDs and consistency
    try {
      console.info(
        `Comparing item and fulfillment IDs in /${constants.ON_SELECT} and /${constants.ON_CANCEL}`
      );
      const itemFlfllmntsRaw = await RedisService.getKey(
        `${transaction_id}_itemFlfllmnts`
      );
      const itemFlfllmnts = itemFlfllmntsRaw
        ? JSON.parse(itemFlfllmntsRaw)
        : null;
      const itemIds: string[] = [];
      const fulfillmentIds: string[] = [];
      let forwardFulfillmentCount = 0;
      let cancellationFulfillmentCount = 0;
      on_cancel.items?.forEach((item: any) => {
        itemIds.push(item.id);
        fulfillmentIds.push(item.fulfillment_id);
        if (!(item.id in itemFlfllmnts)) {
          results.push({
            valid: false,
            code: 20006,
            description: `Item ID ${item.id} not found in /${constants.ON_SELECT}`,
          });
        }
        if (
          item.id in itemFlfllmnts &&
          Object.values(itemFlfllmnts).includes(item.fulfillment_id)
        ) {
          forwardFulfillmentCount++;
        }
        if (
          item.id in itemFlfllmnts &&
          !Object.values(itemFlfllmnts).includes(item.fulfillment_id)
        ) {
          cancellationFulfillmentCount++;
        }
      });
      if (cancellationFulfillmentCount !== forwardFulfillmentCount) {
        results.push({
          valid: false,
          code: 20006,
          description: `Count of cancellation fulfillments does not equal count of forward fulfillments or invalid fulfillment ID in /${constants.ON_CANCEL}`,
        });
      }
      on_cancel.fulfillments?.forEach(
        async (fulfillment: any, index: number) => {
          if (fulfillment.id && !fulfillmentIds.includes(fulfillment.id)) {
            results.push({
              valid: false,
              code: 20006,
              description: `Fulfillment ID ${fulfillment.id} does not exist in /${constants.ON_CANCEL} items.fulfillment_id`,
            });
          }
          if (flow !== "5" && fulfillment.type !== "Cancel") {
            if (!fulfillment.id) {
              results.push({
                valid: false,
                code: 20006,
                description: `fulfillments[${index}].id is missing in /${constants.ON_CANCEL}`,
              });
            } else if (!Object.values(itemFlfllmnts).includes(fulfillment.id)) {
              results.push({
                valid: false,
                code: 20006,
                description: `Fulfillment ID ${fulfillment.id} does not exist in /${constants.ON_SELECT}`,
              });
            }
            if (!fulfillment.end || !fulfillment.end.person) {
              results.push({
                valid: false,
                code: 20006,
                description: `fulfillments[${index}].end.person object is missing in /${constants.ON_CANCEL}`,
              });
            }
            const buyerGpsRaw = await RedisService.getKey(
              `${transaction_id}_buyerGps`
            );
            const buyerGps = buyerGpsRaw ? JSON.parse(buyerGpsRaw) : null;
            if (!_.isEqual(fulfillment.end?.location?.gps, buyerGps)) {
              results.push({
                valid: false,
                code: 20006,
                description: `fulfillments[${index}].end.location.gps does not match gps in /${constants.SELECT}`,
              });
            }
            const buyerAddrRaw = await RedisService.getKey(
              `${transaction_id}_buyerAddr`
            );
            const buyerAddr = buyerAddrRaw ? JSON.parse(buyerAddrRaw) : null;
            if (
              !_.isEqual(
                fulfillment.end?.location?.address?.area_code,
                buyerAddr
              )
            ) {
              results.push({
                valid: false,
                code: 20006,
                description: `fulfillments[${index}].end.location.address.area_code does not match area_code in /${constants.SELECT}`,
              });
            }
          }
        }
      );
    } catch (error: any) {
      console.error(
        `Error while comparing item and fulfillment IDs in /${constants.ON_SELECT} and /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during fulfillment ID consistency validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate billing
    try {
      console.info(
        `Comparing billing object in /${constants.INIT} and /${constants.ON_CANCEL}`
      );
      const billingRaw = await RedisService.getKey(`${transaction_id}_billing`);
      const billing = billingRaw ? JSON.parse(billingRaw) : null;
      const billingErrors = compareObjects(billing, on_cancel.billing);
      if (billingErrors) {
        billingErrors.forEach((error: string) => {
          results.push({
            valid: false,
            code: 20006,
            description: `${error} when comparing with /${constants.INIT} billing object`,
          });
        });
      }
      await RedisService.setKey(
        `${transaction_id}_billing`,
        JSON.stringify(on_cancel.billing),
        TTL_IN_SECONDS
      );
    } catch (error: any) {
      console.error(
        `Error while comparing billing object in /${constants.INIT} and /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during billing validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate payment
    try {
      console.info(`Checking payment object in /${constants.ON_CANCEL}`);
      const payment = on_cancel.payment;
      const sttlmntdtlsRaw = await RedisService.getKey(
        `${transaction_id}_sttlmntdtls`
      );
      const sttlmntdtls = sttlmntdtlsRaw ? JSON.parse(sttlmntdtlsRaw) : null;
      if (
        !_.isEqual(payment["@ondc/org/settlement_details"]?.[0], sttlmntdtls)
      ) {
        results.push({
          valid: false,
          code: 20006,
          description: `Payment settlement_details mismatch in /${constants.ON_INIT} and /${constants.ON_CANCEL}`,
        });
      }
      if (!on_cancel.created_at || !on_cancel.updated_at) {
        results.push({
          valid: false,
          code: 20006,
          description: `Order created_at and updated_at timestamps are mandatory in /${constants.ON_CANCEL}`,
        });
      } else if (!_.gt(on_cancel.updated_at, on_cancel.created_at)) {
        results.push({
          valid: false,
          code: 20006,
          description: `order.updated_at timestamp should be greater than order.created_at timestamp in /${constants.ON_CANCEL}`,
        });
      }
      await RedisService.setKey(
        `${transaction_id}_cnfrmpymnt`,
        JSON.stringify(payment),
        TTL_IN_SECONDS
      );
      if (!payment_status(payment, "4")) {
        results.push({
          valid: false,
          code: 20006,
          description: `Transaction_id missing in message/order/payment in /${constants.ON_CANCEL}`,
        });
      }
    } catch (error: any) {
      console.error(
        `Error while checking payment object in /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during payment validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate RTO fulfillments for flow 5
    if (flow === "5") {
      try {
        console.info(`Checking RTO fulfillments for /${constants.ON_CANCEL}`);
        const RTOobj = _.filter(on_cancel.fulfillments, { type: "RTO" });
        const DELobj = _.filter(on_cancel.fulfillments, { type: "Delivery" });
        let rto_start_location: any = {};
        let rto_end_location: any = {};
        let del_start_location: any = {};
        let del_end_location: any = {};
        let rto_delivered_or_disposed = false;

        if (!RTOobj.length) {
          results.push({
            valid: false,
            code: 20006,
            description: `RTO fulfillment object is mandatory for /${constants.ON_CANCEL}`,
          });
        } else {
          await RedisService.setKey(
            `${transaction_id}_RTO_Obj`,
            JSON.stringify(RTOobj[0]),
            TTL_IN_SECONDS
          );
          RTOobj.forEach((item: any) => {
            const validStates = [
              "RTO-Initiated",
              "RTO-Delivered",
              "RTO-Disposed",
            ];
            if (!validStates.includes(item.state?.descriptor?.code)) {
              results.push({
                valid: false,
                code: 20007,
                description: `RTO state must be one of ['RTO-Initiated', 'RTO-Delivered', 'RTO-Disposed'] in /${constants.ON_CANCEL}`,
              });
            } else if (
              item.state.descriptor.code === "RTO-Delivered" ||
              item.state.descriptor.code === "RTO-Disposed"
            ) {
              rto_delivered_or_disposed = true;
            }
          });

          if (!_.isEmpty(RTOobj[0]?.start)) {
            const rto_obj_start = RTOobj[0].start;
            if (!_.isEmpty(rto_obj_start.location)) {
              rto_start_location = rto_obj_start.location;
            } else {
              results.push({
                valid: false,
                code: 20006,
                description: `RTO fulfillment start location object is missing in /${constants.ON_CANCEL}`,
              });
            }
          } else {
            results.push({
              valid: false,
              code: 20006,
              description: `RTO fulfillment start object is missing in /${constants.ON_CANCEL}`,
            });
          }

          if (!_.isEmpty(RTOobj[0]?.end)) {
            const rto_obj_end = RTOobj[0].end;
            if (rto_delivered_or_disposed) {
              if (_.isEmpty(rto_obj_end.time)) {
                results.push({
                  valid: false,
                  code: 20006,
                  description: `RTO fulfillment end/time is missing in /${constants.ON_CANCEL}`,
                });
              } else if (_.isEmpty(rto_obj_end.time.timestamp)) {
                results.push({
                  valid: false,
                  code: 20006,
                  description: `RTO fulfillment end/time/timestamp is missing in /${constants.ON_CANCEL}`,
                });
              } else {
                const date = new Date(rto_obj_end.time.timestamp);
                if (String(date) === "Invalid Date") {
                  results.push({
                    valid: false,
                    code: 20006,
                    description: `RTO fulfillment end/time/timestamp is not a valid date format in /${constants.ON_CANCEL}`,
                  });
                }
              }
            } else if (!_.isEmpty(rto_obj_end.time)) {
              results.push({
                valid: false,
                code: 20006,
                description: `RTO fulfillment end/time should not be present when state is RTO-Initiated in /${constants.ON_CANCEL}`,
              });
            }
            if (!_.isEmpty(rto_obj_end.location)) {
              rto_end_location = rto_obj_end.location;
            } else {
              results.push({
                valid: false,
                code: 20006,
                description: `RTO fulfillment end location object is missing in /${constants.ON_CANCEL}`,
              });
            }
          } else {
            results.push({
              valid: false,
              code: 20006,
              description: `RTO fulfillment end object is missing in /${constants.ON_CANCEL}`,
            });
          }
        }

        if (!DELobj.length) {
          results.push({
            valid: false,
            code: 20006,
            description: `Delivery fulfillment object is mandatory for /${constants.ON_CANCEL}`,
          });
        } else {
          await RedisService.setKey(
            `${transaction_id}_DEL_Obj`,
            JSON.stringify(DELobj[0]),
            TTL_IN_SECONDS
          );
          if (!_.isEmpty(DELobj[0]?.start)) {
            const del_obj_start = DELobj[0].start;
            if (!_.isEmpty(del_obj_start.location)) {
              del_start_location = del_obj_start.location;
            } else {
              results.push({
                valid: false,
                code: 20006,
                description: `Delivery fulfillment start location object is missing in /${constants.ON_CANCEL}`,
              });
            }
          } else {
            results.push({
              valid: false,
              code: 20006,
              description: `Delivery fulfillment start object is missing in /${constants.ON_CANCEL}`,
            });
          }

          if (!_.isEmpty(DELobj[0]?.end)) {
            const del_obj_end = DELobj[0].end;
            if (!_.isEmpty(del_obj_end.location)) {
              del_end_location = del_obj_end.location;
            } else {
              results.push({
                valid: false,
                code: 20006,
                description: `Delivery fulfillment end location object is missing in /${constants.ON_CANCEL}`,
              });
            }
          } else {
            results.push({
              valid: false,
              code: 20006,
              description: `Delivery fulfillment end object is missing in /${constants.ON_CANCEL}`,
            });
          }
        }

        if (!_.isEmpty(rto_start_location) && !_.isEmpty(del_end_location)) {
          if (
            !_.isEqual(rto_start_location?.address, del_end_location?.address)
          ) {
            results.push({
              valid: false,
              code: 20006,
              description: `RTO fulfillment start and Delivery fulfillment end location mismatch in /${constants.ON_CANCEL}`,
            });
          }
        } else {
          results.push({
            valid: false,
            code: 20006,
            description: `RTO fulfillment start or Delivery fulfillment end location is missing in /${constants.ON_CANCEL}`,
          });
        }

        if (
          !_.isEmpty(rto_start_location?.address) &&
          !_.isEmpty(del_start_location?.address) &&
          _.isEqual(rto_start_location?.address, del_start_location?.address)
        ) {
          results.push({
            valid: false,
            code: 20006,
            description: `RTO fulfillment start and Delivery fulfillment start location should not be equal in /${constants.ON_CANCEL}`,
          });
        }

        if (!_.isEmpty(rto_end_location) && !_.isEmpty(del_start_location)) {
          if (
            !_.isEqual(rto_end_location?.address, del_start_location?.address)
          ) {
            results.push({
              valid: false,
              code: 20006,
              description: `RTO fulfillment end and Delivery fulfillment start location mismatch in /${constants.ON_CANCEL}`,
            });
          }
          if (_.isEmpty(rto_end_location?.id)) {
            results.push({
              valid: false,
              code: 20006,
              description: `RTO fulfillment end location ID missing in /${constants.ON_CANCEL}`,
            });
          }
          if (_.isEmpty(del_start_location?.id)) {
            results.push({
              valid: false,
              code: 20006,
              description: `Delivery fulfillment start location ID missing in /${constants.ON_CANCEL}`,
            });
          }
          if (!_.isEqual(rto_end_location?.id, del_start_location?.id)) {
            results.push({
              valid: false,
              code: 20006,
              description: `RTO fulfillment end and Delivery fulfillment start location ID mismatch in /${constants.ON_CANCEL}`,
            });
          }
        } else {
          results.push({
            valid: false,
            code: 20006,
            description: `RTO fulfillment end or Delivery fulfillment start location is missing in /${constants.ON_CANCEL}`,
          });
        }

        if (
          !_.isEmpty(rto_end_location?.address) &&
          !_.isEmpty(del_end_location?.address) &&
          _.isEqual(rto_end_location?.address, del_end_location?.address)
        ) {
          results.push({
            valid: false,
            code: 20006,
            description: `RTO fulfillment end and Delivery fulfillment end location should not be equal in /${constants.ON_CANCEL}`,
          });
        }
      } catch (error: any) {
        console.error(
          `Error while checking RTO fulfillments in /${constants.ON_CANCEL}: ${error.stack}`
        );
        results.push({
          valid: false,
          code: 23001,
          description: `Internal error during RTO fulfillment validation in /${constants.ON_CANCEL}`,
        });
      }
    }

    // Validate Cancel and Delivery fulfillments for flow 4
    if (flow === "4") {
      try {
        console.info(
          `Checking Cancel and Delivery fulfillments for /${constants.ON_CANCEL}`
        );
        const Cancelobj = _.filter(on_cancel.fulfillments, { type: "Cancel" });
        if (!Cancelobj.length) {
          results.push({
            valid: false,
            code: 20006,
            description: `Cancel fulfillment object is mandatory for /${constants.ON_CANCEL}`,
          });
        }
        const DELobj = _.filter(on_cancel.fulfillments, { type: "Delivery" });
        if (!DELobj.length) {
          results.push({
            valid: false,
            code: 20006,
            description: `Delivery fulfillment object is mandatory for /${constants.ON_CANCEL}`,
          });
        } else {
          function checkFFStartEndTime(ffStartOrEnd: any, startOrEnd: string) {
            if (!ffStartOrEnd) {
              results.push({
                valid: false,
                code: 20006,
                description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()} is missing in /${
                  constants.ON_CANCEL
                }`,
              });
              return;
            }
            if (_.isEmpty(ffStartOrEnd.time)) {
              results.push({
                valid: false,
                code: 20006,
                description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/time is missing in /${
                  constants.ON_CANCEL
                }`,
              });
            } else if (_.isEmpty(ffStartOrEnd.time.range)) {
              results.push({
                valid: false,
                code: 20006,
                description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/time/range is missing in /${
                  constants.ON_CANCEL
                }`,
              });
            } else {
              if (!ffStartOrEnd.time.range.start) {
                results.push({
                  valid: false,
                  code: 20006,
                  description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/time/range/start is missing in /${
                    constants.ON_CANCEL
                  }`,
                });
              } else {
                const date = new Date(ffStartOrEnd.time.range.start);
                if (String(date) === "Invalid Date") {
                  results.push({
                    valid: false,
                    code: 20006,
                    description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/time/range/start is not a valid date format in /${
                      constants.ON_CANCEL
                    }`,
                  });
                }
              }
              if (!ffStartOrEnd.time.range.end) {
                results.push({
                  valid: false,
                  code: 20006,
                  description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/time/range/end is missing in /${
                    constants.ON_CANCEL
                  }`,
                });
              } else {
                const date = new Date(ffStartOrEnd.time.range.end);
                if (String(date) === "Invalid Date") {
                  results.push({
                    valid: false,
                    code: 20006,
                    description: `Fulfillment type Delivery ${startOrEnd.toLowerCase()}/time/range/end is not a valid date format in /${
                      constants.ON_CANCEL
                    }`,
                  });
                }
              }
            }
          }

          const onCnfrmStateRaw = await RedisService.getKey(
            `${transaction_id}_onCnfrmState`
          );
          const onCnfrmState = onCnfrmStateRaw
            ? JSON.parse(onCnfrmStateRaw)
            : null;
          if (onCnfrmState === "Accepted") {
            checkFFStartEndTime(DELobj[0]?.start, "start");
            checkFFStartEndTime(DELobj[0]?.end, "end");
          }
        }
      } catch (error: any) {
        console.error(
          `Error while checking Cancel and Delivery fulfillments in /${constants.ON_CANCEL}: ${error.stack}`
        );
        results.push({
          valid: false,
          code: 23001,
          description: `Internal error during Cancel and Delivery fulfillment validation in /${constants.ON_CANCEL}`,
        });
      }
    }

    // Validate Delivery fulfillment tags
    try {
      console.info(
        `Checking Delivery fulfillment tags in /${constants.ON_CANCEL}`
      );
      const DeliveryObj = _.filter(on_cancel.fulfillments, {
        type: "Delivery",
      });
      let reasonID_flag = 0;
      let rto_id_flag = 0;
      let initiated_by_flag = 0;
      DeliveryObj.forEach(async (item: any) => {
        if (item.state?.descriptor?.code !== "Cancelled") {
          results.push({
            valid: false,
            code: 20007,
            description: `Delivery state must be 'Cancelled' for /${constants.ON_CANCEL}`,
          });
        }
        if (
          item.state?.descriptor?.code === "Cancelled" &&
          (!item.tags || !item.tags.length)
        ) {
          results.push({
            valid: false,
            code: 20006,
            description: `Tags are mandatory for Cancelled state in fulfillment type Delivery in /${constants.ON_CANCEL}`,
          });
        }
        const cancel_request = _.filter(item.tags, { code: "cancel_request" });
        if (!cancel_request.length) {
          results.push({
            valid: false,
            code: 20006,
            description: `Cancel Request tag is mandatory in fulfillment type Delivery in /${constants.ON_CANCEL}`,
          });
        } else {
          cancel_request.forEach((tag: any) => {
            if (!tag.list) {
              results.push({
                valid: false,
                code: 20006,
                description: `List object is mandatory for cancel_request tag in /${constants.ON_CANCEL}`,
              });
              return;
            }
            tag.list.forEach((i: any) => {
              if (i.code === "reason_id") reasonID_flag = 1;
              if (i.code === "rto_id") rto_id_flag = 1;
              if (i.code === "initiated_by") initiated_by_flag = 1;
            });
          });
        }
        const preCancelObj = _.filter(item.tags, { code: "precancel_state" });
        if (!preCancelObj.length) {
          results.push({
            valid: false,
            code: 20006,
            description: `Pre Cancel tag is mandatory in /${constants.ON_CANCEL}`,
          });
        } else {
          const timeStampObj = _.filter(preCancelObj[0]?.list, {
            code: "updated_at",
          });
          if (!timeStampObj.length) {
            results.push({
              valid: false,
              code: 20006,
              description: `Pre Cancel updated_at timestamp is mandatory in /${constants.ON_CANCEL}`,
            });
          } else {
            const previousTimestampRaw = await RedisService.getKey(
              `${transaction_id}_PreviousUpdatedTimestamp`
            );
            const previousTimestamp = previousTimestampRaw
              ? JSON.parse(previousTimestampRaw)
              : null;
            if (!_.isEqual(previousTimestamp, timeStampObj[0].value)) {
              results.push({
                valid: false,
                code: 20007,
                description: `precancel_state.updated_at in /${
                  constants.ON_CANCEL
                } does not match ${
                  flow === "4"
                    ? constants.ON_CONFIRM
                    : constants.ON_STATUS_OUT_FOR_DELIVERY
                } order.updated_at`,
              });
            }
          }
          const fulfillmentStateObj = _.filter(preCancelObj[0]?.list, {
            code: "fulfillment_state",
          });
          if (!fulfillmentStateObj.length) {
            results.push({
              valid: false,
              code: 20006,
              description: `Pre Cancel fulfillment_state is mandatory in /${constants.ON_CANCEL}`,
            });
          } else {
            const ffIdPrecancelRaw = await RedisService.getKey(
              `${transaction_id}_ffIdPrecancel`
            );
            const ffIdPrecancel = ffIdPrecancelRaw
              ? JSON.parse(ffIdPrecancelRaw)
              : null;
            if (!_.isEqual(ffIdPrecancel, fulfillmentStateObj[0].value)) {
              results.push({
                valid: false,
                code: 20007,
                description: `precancel_state.fulfillment_state in /${
                  constants.ON_CANCEL
                } does not match ${
                  flow === "4"
                    ? constants.ON_CONFIRM
                    : constants.ON_STATUS_OUT_FOR_DELIVERY
                } fulfillment state`,
              });
            }
          }
        }
      });

      if (!reasonID_flag) {
        results.push({
          valid: false,
          code: 20006,
          description: `reason_id is mandatory in cancel_request tag for /${constants.ON_CANCEL}`,
        });
      }
      if (!rto_id_flag && flow === "5") {
        results.push({
          valid: false,
          code: 20006,
          description: `rto_id is mandatory in cancel_request tag for /${constants.ON_CANCEL}`,
        });
      }
      if (!initiated_by_flag) {
        results.push({
          valid: false,
          code: 20006,
          description: `initiated_by is mandatory in cancel_request tag for /${constants.ON_CANCEL}`,
        });
      }
    } catch (error: any) {
      console.error(
        `Error while checking Delivery fulfillment tags in /${constants.ON_CANCEL}: ${error.stack}`
      );
      results.push({
        valid: false,
        code: 23001,
        description: `Internal error during Delivery fulfillment tag validation in /${constants.ON_CANCEL}`,
      });
    }

    // Validate descriptor if present
    if (on_cancel.descriptor && typeof on_cancel.descriptor === "object") {
      try {
        console.info(`Validating descriptor in /${constants.ON_CANCEL}`);
        const { name, short_desc, tags } = on_cancel.descriptor;

        if (!name || name !== "fulfillment") {
          results.push({
            valid: false,
            code: 20006,
            description: `message/order/descriptor/name must be 'fulfillment' in /${constants.ON_CANCEL}`,
          });
        }
        if (!short_desc) {
          results.push({
            valid: false,
            code: 20006,
            description: `message/order/descriptor/short_desc is missing in /${constants.ON_CANCEL}`,
          });
        }
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
          results.push({
            valid: false,
            code: 20006,
            description: `message/order/descriptor/tags is missing or invalid in /${constants.ON_CANCEL}`,
          });
        } else {
          const paramsTag = tags.find((tag: any) => tag.code === "params");
          if (!paramsTag || !paramsTag.list || !Array.isArray(paramsTag.list)) {
            results.push({
              valid: false,
              code: 20006,
              description: `message/order/descriptor/tags must contain a 'params' tag with a valid list in /${constants.ON_CANCEL}`,
            });
          } else {
            const forceParam = paramsTag.list.find(
              (item: any) => item.code === "force"
            );
            const ttlResponseParam = paramsTag.list.find(
              (item: any) => item.code === "ttl_response"
            );

            if (!forceParam || !forceParam.value) {
              results.push({
                valid: false,
                code: 20006,
                description: `message/order/descriptor/tags/params must contain a 'force' parameter in /${constants.ON_CANCEL}`,
              });
            } else if (!["yes", "no"].includes(forceParam.value)) {
              results.push({
                valid: false,
                code: 20006,
                description: `message/order/descriptor/tags/params/force must be 'yes' or 'no' in /${constants.ON_CANCEL}`,
              });
            }

            if (!ttlResponseParam || !ttlResponseParam.value) {
              results.push({
                valid: false,
                code: 20006,
                description: `message/order/descriptor/tags/params must contain a 'ttl_response' parameter in /${constants.ON_CANCEL}`,
              });
            } else if (!isValidISO8601Duration(ttlResponseParam.value)) {
              results.push({
                valid: false,
                code: 20006,
                description: `message/order/descriptor/tags/params/ttl_response must be a valid ISO8601 duration in /${constants.ON_CANCEL}`,
              });
            } else {
              const storedTATRaw = await RedisService.getKey(
                `${transaction_id}_fulfillmentTAT`
              );
              const storedTAT = storedTATRaw ? JSON.parse(storedTATRaw) : null;
              if (storedTAT && ttlResponseParam.value !== storedTAT) {
                results.push({
                  valid: false,
                  code: 22504,
                  description: `Fulfillment TAT in /${constants.ON_CANCEL} differs from previously quoted TAT`,
                });
              }
            }
          }
        }
      } catch (error: any) {
        console.error(
          `Error while validating descriptor in /${constants.ON_CANCEL}: ${error.stack}`
        );
        results.push({
          valid: false,
          code: 23001,
          description: `Internal error during descriptor validation in /${constants.ON_CANCEL}`,
        });
      }
    }

    return results.length
      ? results
      : [{ valid: true, code: 200, description: "Validation successful" }];
  } catch (error: any) {
    console.error(
      `Error in /${constants.ON_CANCEL} validation: ${error.stack}`
    );
    return [
      {
        valid: false,
        code: 23001,
        description: `Internal error during /${constants.ON_CANCEL} validation`,
      },
    ];
  }
};
