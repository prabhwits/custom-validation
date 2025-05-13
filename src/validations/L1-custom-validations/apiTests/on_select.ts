import { RedisService } from "ondc-automation-cache-lib";
import {
  addActionToRedisSet,
  tagFinder,
  taxNotInlcusive,
} from "../../../utils/helper";
import {
  checkBppIdOrBapId,
  checkContext,
  isObjectEmpty,
  isoDurToSec,
  timeDiff,
} from "../../../utils/helper";
import _ from "lodash";
import constants, { ApiSequence, ffCategory } from "../../../utils/constants";

interface BreakupElement {
  "@ondc/org/title_type": string;
  item?: {
    quantity: any;
  };
}

const retailPymntTtl: { [key: string]: string } = {
  "delivery charges": "delivery",
  "packing charges": "packing",
  tax: "tax",
  discount: "discount",
  "convenience fee": "misc",
  offer: "offer",
};

const onSelect = async (data: any) => {
  const { message, context } = data;
  const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;
  const { transaction_id } = context;
  const error = data?.error;

  if (!data || isObjectEmpty(data)) {
    return [
      {
        valid: false,
        code: 20000,
        description: "JSON cannot be empty",
      },
    ];
  }

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
        code: 20000,
        description:
          "/context, /message, /order or /message/order is missing or empty",
      },
    ];
  }

  const contextRes: any = checkContext(context, constants.ON_SELECT);
  const result: any[] = [];

  try {
    const previousCallPresent = await addActionToRedisSet(
      context.transaction_id,
      ApiSequence.SELECT,
      ApiSequence.ON_SELECT
    );
    if (!previousCallPresent) {
      result.push({
        valid: false,
        code: 20000,
        description: `Previous call doesn't exist`,
      });
      return result;
    }
  } catch (error: any) {
    console.error(
      `!!Error while previous action call /${constants.ON_SELECT}, ${error.stack}`
    );
  }

  const checkBap = checkBppIdOrBapId(context.bap_id);
  const checkBpp = checkBppIdOrBapId(context.bpp_id);

  try {
    console.info(
      `Comparing Message Ids of /${constants.SELECT} and /${constants.ON_SELECT}`
    );

    const selectMsgId = await RedisService.getKey(
      `${transaction_id}_${ApiSequence.SELECT}_msgId`
    );

    if (!_.isEqual(selectMsgId, context.message_id)) {
      result.push({
        valid: false,
        code: 20000,
        description: `Message Ids for /${constants.SELECT} and /${constants.ON_SELECT} api should be same`,
      });
    }
  } catch (error: any) {
    console.error(
      `!!Error while checking message id for /${constants.ON_SELECT}, ${error.stack}`
    );
  }

  if (
    !_.isEqual(
      data.context.domain.split(":")[1],
      await RedisService.getKey(`${transaction_id}_domain`)
    )
  ) {
    result.push({
      valid: false,
      code: 20000,
      description: `Domain should be same in each action`,
    });
  }

  if (checkBap) {
    result.push({
      valid: false,
      code: 20000,
      description: "context/bap_id should not be a url",
    });
  }
  if (checkBpp) {
    result.push({
      valid: false,
      code: 20000,
      description: "context/bpp_id should not be a url",
    });
  }

  if (!contextRes?.valid) {
    const errors = contextRes.ERRORS;
    Object.keys(errors).forEach((key: any) => {
      result.push({
        valid: false,
        code: 20000,
        description: errors[key],
      });
    });
  }

  const searchContextRaw = await RedisService.getKey(
    `${transaction_id}_${ApiSequence.SEARCH}_context`
  );
  const searchContext = searchContextRaw ? JSON.parse(searchContextRaw) : null;
  const searchMessageRaw = await RedisService.getKey(
    `${transaction_id}_${ApiSequence.ON_SEARCH}_message`
  );
  const searchMessage = searchMessageRaw ? JSON.parse(searchMessageRaw) : null;

  try {
    console.info(
      `Comparing city of /${constants.SEARCH} and /${constants.ON_SELECT}`
    );
    if (!_.isEqual(searchContext.city, context.city)) {
      result.push({
        valid: false,
        code: 20000,
        description: `City code mismatch in /${constants.SEARCH} and /${constants.ON_SELECT}`,
      });
    }
  } catch (error: any) {
    console.error(
      `!!Error while comparing city in /${constants.SEARCH} and /${constants.ON_SELECT}, ${error.stack}`
    );
  }

  try {
    console.info(
      `Comparing timestamp of /${constants.SELECT} and /${constants.ON_SELECT}`
    );
    const tmpstmpRaw = await RedisService.getKey(
      `${transaction_id}_${ApiSequence.SELECT}_tmpstmp`
    );
    const tmpstmp = tmpstmpRaw ? JSON.parse(tmpstmpRaw) : null;

    if (_.gte(tmpstmp, context.timestamp)) {
      result.push({
        valid: false,
        code: 20000,
        description: `Timestamp for /${constants.SELECT} api cannot be greater than or equal to /${constants.ON_SELECT} api`,
      });
    } else {
      const timeDifference = timeDiff(context.timestamp, tmpstmp);
      console.info(timeDifference);
      if (timeDifference > 5000) {
        result.push({
          valid: false,
          code: 20000,
          description: `context/timestamp difference between /${constants.ON_SELECT} and /${constants.SELECT} should be less than 5 sec`,
        });
      }
    }
    await RedisService.setKey(
      `${transaction_id}_${ApiSequence.ON_SELECT}_tmpstmp`,
      JSON.stringify(context.timestamp),
      TTL_IN_SECONDS
    );
  } catch (error: any) {
    console.error(
      `!!Error while comparing timestamp for /${constants.SELECT} and /${constants.ON_SELECT}, ${error.stack}`
    );
  }

  try {
    const itemsOnSelectRaw = await RedisService.getKey(
      `${transaction_id}_SelectItemList`
    );

    const itemsOnSelect = itemsOnSelectRaw
      ? JSON.parse(itemsOnSelectRaw)
      : null;

    const itemsList = message.order.items;
    const selectItems: any = [];
    itemsList.forEach((item: any, index: number) => {
      if (!itemsOnSelect?.includes(item.id)) {
        result.push({
          valid: false,
          code: 20000,
          description: `Invalid Item Id provided in /${constants.ON_SELECT}: ${item.id}`,
        });
      } else {
        selectItems.push(item.id);
      }
    });
    await RedisService.setKey(
      `${transaction_id}_SelectItemList`,
      JSON.stringify(selectItems),
      TTL_IN_SECONDS
    );
  } catch (error: any) {
    console.error(
      `Error while checking for item IDs for /${constants.ON_SELECT}, ${error.stack}`
    );
  }

  try {
    const fulfillments = message.order.fulfillments;
    const selectFlflmntSet: any = [];
    const fulfillment_tat_obj: any = {};

    fulfillments.forEach((flflmnt: any) => {
      fulfillment_tat_obj[flflmnt.id] = isoDurToSec(flflmnt["@ondc/org/TAT"]);
      selectFlflmntSet.push(flflmnt.id);
    });

    fulfillments.forEach((ff: any) => {
      const type = ff?.type;
      switch (type) {
        case "Delivery":
          if (ff?.end) {
            const timeRange = ff?.end?.time?.range;
            const start = timeRange?.start ? new Date(timeRange.start) : null;
            const end = timeRange?.end ? new Date(timeRange.end) : null;
            const contextTime = context.timestamp;

            if (!start || !end) {
              result.push({
                valid: false,
                code: 20001,
                description: `Missing start or end time in Delivery fulfillment`,
              });
              break;
            }

            if (start >= end) {
              result.push({
                valid: false,
                code: 20001,
                description: `Start time must be less than end time in Delivery fulfillment}`,
              });
            }

            if (start <= contextTime) {
              result.push({
                valid: false,
                code: 20001,
                description: `Start time must be after context.timestamp in Delivery fulfillment`,
              });
            }
          }
          break;
        case "Self-Pickup":
          if (ff?.start) {
            const timeRange = ff?.end?.time?.range;
            const start = timeRange?.start ? new Date(timeRange.start) : null;
            const end = timeRange?.end ? new Date(timeRange.end) : null;
            const contextTime = context.timestamp;

            if (!start || !end) {
              result.push({
                valid: false,
                code: 20001,
                description: `Missing start or end time in Self-Pickup fulfillment`,
              });
              break;
            }

            if (start >= end) {
              result.push({
                valid: false,
                code: 20001,
                description: `Start time must be less than end time in Self-Pickup fulfillment}`,
              });
            }

            if (start <= contextTime) {
              result.push({
                valid: false,
                code: 20001,
                description: `Start time must be after context.timestamp in Self-Pickup fulfillment`,
              });
            }
          }
          break;
        case "Buyer-Delivery":
          const orderDetailsTag = ff.tags?.find(
            (tag: any) => tag.code === "order_details"
          );
          if (!orderDetailsTag) {
            result.push({
              valid: false,
              code: 20007,
              description: `Missing 'order_details' tag in fulfillments when fulfillment.type is 'Buyer-Delivery'`,
            });
            break;
          }

          const requiredFields = [
            "weight_unit",
            "weight_value",
            "dim_unit",
            "length",
            "breadth",
            "height",
          ];

          const list = orderDetailsTag.list || [];
          for (const field of requiredFields) {
            const item = list.find((i: any) => i.code === field);
            if (!item || !item.value || item.value.toString().trim() === "") {
              result.push({
                valid: false,
                code: 20008,
                description: `'${field}' is missing or empty in 'order_details' tag in fulfillments`,
              });
            }
          }
          break;
        default:
          break;
      }
    });

    await RedisService.setKey(
      `${transaction_id}_selectFlflmntSet`,
      JSON.stringify(selectFlflmntSet),
      TTL_IN_SECONDS
    );
    await RedisService.setKey(
      `${transaction_id}_fulfillment_tat_obj`,
      JSON.stringify(fulfillment_tat_obj),
      TTL_IN_SECONDS
    );
  } catch (error: any) {
    console.error(
      `Error while checking for fulfillment IDs for /${constants.ON_SELECT}`,
      error.stack
    );
  }

  let on_select_error: any = {};
  try {
    console.info(`Checking domain-error in /${constants.ON_SELECT}`);
    if (data.hasOwnProperty("error")) {
      on_select_error = data.error;
    }
  } catch (error: any) {
    console.info(
      `Error while checking domain-error in /${constants.ON_SELECT}, ${error.stack}`
    );
  }

  const on_select: any = message.order;
  const itemFlfllmnts: any = {};

  try {
    console.info(
      `Checking provider id in /${constants.ON_SEARCH} and /${constants.ON_SELECT}`
    );
    const providerIdRaw = await RedisService.getKey(
      `${transaction_id}_providerId`
    );
    const providerId = providerIdRaw ? JSON.parse(providerIdRaw) : null;
    const providerLocRaw = await RedisService.getKey(
      `${transaction_id}_providerLoc`
    );
    const providerLoc = providerLocRaw ? JSON.parse(providerLocRaw) : null;
    if (providerId != on_select.provider.id) {
      result.push({
        valid: false,
        code: 20000,
        description: `provider.id mismatches in /${constants.SELECT} and /${constants.ON_SELECT}`,
      });
    }
    if (!on_select.provider.locations) {
      result.push({
        valid: false,
        code: 20000,
        description: `provider.locations[0].id is missing in /${constants.ON_SELECT}`,
      });
    } else if (on_select.provider.locations[0].id != providerLoc) {
      result.push({
        valid: false,
        code: 20000,
        description: `provider.locations[0].id mismatches in /${constants.SELECT} and /${constants.ON_SELECT}`,
      });
    }
  } catch (error: any) {
    console.error(
      `Error while comparing provider ids in /${constants.ON_SEARCH} and /${constants.ON_SELECT}, ${error.stack}`
    );
  }

  try {
    console.info(`Item Id and Fulfillment Id Mapping in /on_select`);
    let i = 0;
    const len = on_select.items.length;
    while (i < len) {
      const found = on_select.fulfillments.some(
        (fId: { id: any }) => fId.id === on_select.items[i].fulfillment_id
      );
      if (!found) {
        result.push({
          valid: false,
          code: 20000,
          description: `fulfillment_id for item ${on_select.items[i].id} does not exist in order.fulfillments[]`,
        });
      }
      i++;
    }
  } catch (error: any) {
    console.error(
      `!!Error while checking Item Id and Fulfillment Id Mapping in /${constants.ON_SELECT}, ${error.stack}`
    );
  }
  try {
    console.info(
      `Checking parent_item_id and type tags in /${constants.ON_SELECT}`
    );
    const items = on_select.items || [];
    items.forEach((item: any, index: number) => {
      const isItemType = tagFinder(item, "item");
      const isCustomizationType = tagFinder(item, "customization");

      // Check 1: If item has type: item or type: customization, parent_item_id must be present
      if ((isItemType || isCustomizationType) && !item.parent_item_id) {
        console.info(
          `Missing parent_item_id for item with ID: ${
            item.id || "undefined"
          } at index ${index}`
        );
        result.push({
          valid: false,
          code: 20000,
          description: `/message/order/items[${index}]: parent_item_id is required for items with type 'item' or 'customization'`,
        });
      }

      // Check 2: If item has parent_item_id, it must have type: item or type: customization
      if (item.parent_item_id && !(isItemType || isCustomizationType)) {
        console.info(
          `Missing type: item or type: customization tag for item with parent_item_id: ${item.parent_item_id} at index ${index}`
        );
        result.push({
          valid: false,
          code: 20000,
          description: `/message/order/items[${index}]: items with parent_item_id must have a type tag of 'item' or 'customization'`,
        });
      }
    });
  } catch (error: any) {
    console.error(
      `Error while checking parent_item_id and type tags in /${constants.ON_SELECT}, ${error.stack}`
    );
  }

  try {
    console.info("Mapping and storing item Id and fulfillment Id");
    let i = 0;
    const len = on_select.items.length;
    while (i < len) {
      const id = on_select.items[i].id;
      itemFlfllmnts[id] = on_select.items[i].fulfillment_id;
      i++;
    }
    await RedisService.setKey(
      `${transaction_id}_itemFlfllmnts`,
      JSON.stringify(itemFlfllmnts),
      TTL_IN_SECONDS
    );
  } catch (error: any) {
    console.error(
      `!!Error occurred while mapping and storing item Id and fulfillment Id, ${error.stack}`
    );
  }

  try {
    console.info(`Checking TAT and TTS in /${constants.ON_SELECT}`);
    const ttsRaw = await RedisService.getKey(`${transaction_id}_timeToShip`);
    const tts = ttsRaw ? JSON.parse(ttsRaw) : null;
    on_select.fulfillments.forEach((ff: { [x: string]: any }, indx: any) => {
      const tat = isoDurToSec(ff["@ondc/org/TAT"]);
      if (tat < tts) {
        result.push({
          valid: false,
          code: 20000,
          description: `/fulfillments[${indx}]/@ondc/org/TAT (O2D) in /${constants.ON_SELECT} can't be less than @ondc/org/time_to_ship (O2S) in /${constants.ON_SEARCH}`,
        });
      }
      if (tat === tts) {
        result.push({
          valid: false,
          code: 20000,
          description: `/fulfillments[${indx}]/@ondc/org/TAT (O2D) in /${constants.ON_SELECT} can't be equal to @ondc/org/time_to_ship (O2S) in /${constants.ON_SEARCH}`,
        });
      }
      console.info(tat, "asdfasdf", tts);
    });
  } catch (error: any) {
    console.error(
      `!!Error while checking TAT and TTS in /${constants.ON_SELECT}`
    );
  }

  try {
    console.info(
      `Checking TAT and TTS in /${constants.ON_SELECT} and /${constants.ON_SEARCH}`
    );
    const catalog = searchMessage.catalog;
    const providers = catalog["bpp/providers"];
    let max_time_to_ships = [];
    for (
      let providerIndex = 0;
      providerIndex < providers.length;
      providerIndex++
    ) {
      const providerItems = providers[providerIndex].items;
      for (let itemIndex = 0; itemIndex < providerItems.length; itemIndex++) {
        const timeToShip = isoDurToSec(
          providerItems[itemIndex]["@ondc/org/time_to_ship"]
        );
        if (timeToShip) {
          max_time_to_ships.push(timeToShip);
        }
      }
    }
    const max_tts = max_time_to_ships.sort((a, b) => a - b)[0];
    const on_select_tat = on_select.fulfillments.map((e: any) =>
      isoDurToSec(e["@ondc/org/TAT"])
    );
    if (on_select_tat < max_tts) {
      result.push({
        valid: false,
        code: 20000,
        description: `/fulfillments/@ondc/org/TAT (O2D) in /${constants.ON_SELECT} can't be less than @ondc/org/time_ship (O2S) in /${constants.ON_SEARCH}`,
      });
    }
    if (on_select_tat === max_tts) {
      result.push({
        valid: false,
        code: 20000,
        description: `/fulfillments/@ondc/org/TAT (O2D) in /${constants.ON_SELECT} can't be equal to @ondc/org/time_ship (O2S) in /${constants.ON_SEARCH}`,
      });
    }
  } catch (error: any) {
    console.error(
      `!!Error while Checking TAT and TTS in /${constants.ON_SELECT} and /${constants.ON_SEARCH}`
    );
  }

  let nonServiceableFlag = 0;
  try {
    console.info(`Checking fulfillments' state in ${constants.ON_SELECT}`);
    const ffState = on_select.fulfillments.every(
      (ff: { state: { descriptor: any } }) => {
        if (ff.state) {
          const ffDesc = ff.state.descriptor;
          if (ffDesc.code === "Non-serviceable") {
            nonServiceableFlag = 1;
          }
          return ffDesc.hasOwnProperty("code")
            ? ffDesc.code === "Serviceable" || ffDesc.code === "Non-serviceable"
            : false;
        }
        return;
      }
    );
    if (!ffState) {
      result.push({
        valid: false,
        code: 20000,
        description: `Pre-order fulfillment state codes should be used in fulfillments[].state.descriptor.code`,
      });
    } else if (
      nonServiceableFlag &&
      (!on_select_error ||
        !(
          on_select_error.type === "DOMAIN-ERROR" &&
          on_select_error.code === "30009"
        ))
    ) {
      result.push({
        valid: false,
        code: 20000,
        description: `Non Serviceable Domain error should be provided when fulfillment is not serviceable`,
      });
    }
  } catch (error: any) {
    console.error(
      `!!Error while checking fulfillments' state in /${constants.ON_SELECT}, ${error.stack}`
    );
  }

  try {
    console.info(`Checking fulfillments' state in ${constants.ON_SELECT}`);
    on_select.fulfillments.forEach((ff: any, idx: number) => {
      if (ff.state) {
        const ffDesc = ff.state.descriptor;
        function checkFFOrgCategory(selfPickupOrDelivery: number) {
          if (
            !ff["@ondc/org/category"] ||
            !ffCategory[selfPickupOrDelivery].includes(ff["@ondc/org/category"])
          ) {
            result.push({
              valid: false,
              code: 20000,
              description: `In Fulfillment${idx}, @ondc/org/category is not a valid value in ${
                constants.ON_SELECT
              } and should have one of these values ${[
                ffCategory[selfPickupOrDelivery],
              ]}`,
            });
          }
          const domain = data.context.domain.split(":")[1];
          if (
            ff.type === "Delivery" &&
            domain === "RET11" &&
            ff["@ondc/org/category"] !== "Immediate Delivery"
          ) {
            result.push({
              valid: false,
              code: 20000,
              description: `In Fulfillment${idx}, @ondc/org/category should be "Immediate Delivery" for F&B in ${constants.ON_SELECT}`,
            });
          }
        }
        if (ffDesc.code === "Serviceable" && ff.type == "Delivery") {
          checkFFOrgCategory(0);
        } else if (ff.type == "Self-Pickup") {
          checkFFOrgCategory(1);
        }
      } else {
        result.push({
          valid: false,
          code: 20000,
          description: `In Fulfillment${idx}, descriptor code is mandatory in ${constants.ON_SELECT}`,
        });
      }
    });
  } catch (error: any) {
    console.error(
      `!!Error while checking fulfillments @ondc/org/category in /${constants.ON_SELECT}, ${error.stack}`
    );
  }

  let onSelectPrice: any = 0;
  let onSelectItemsPrice = 0;

  try {
    console.info(
      `Comparing count of items in ${constants.SELECT} and ${constants.ON_SELECT}`
    );
    const itemsIdListRaw = await RedisService.getKey(
      `${transaction_id}_itemsIdList`
    );
    const itemsIdList = itemsIdListRaw ? JSON.parse(itemsIdListRaw) : null;
    if (on_select.quote) {
      on_select.quote.breakup.forEach((item: { [x: string]: any }) => {
        if (item["@ondc/org/item_id"] in itemsIdList) {
          if (
            item["@ondc/org/title_type"] === "item" &&
            itemsIdList[item["@ondc/org/item_id"]] !=
              item["@ondc/org/item_quantity"].count
          ) {
            result.push({
              valid: false,
              code: 20000,
              description: `Count of item with id: ${item["@ondc/org/item_id"]} does not match in ${constants.SELECT} & ${constants.ON_SELECT}`,
            });
          }
        }
      });
    } else {
      console.error(`Missing quote object in ${constants.ON_SELECT}`);
      result.push({
        valid: false,
        code: 20000,
        description: `Missing quote object in ${constants.ON_SELECT}`,
      });
    }
  } catch (error: any) {
    console.error(
      `!!Error while comparing count items in ${constants.SELECT} and ${constants.ON_SELECT}, ${error.stack}`
    );
  }

  if (error) {
    try {
      const breakup_msg = message.order.quote.breakup;
      const msg_err: string = error.message;
      const msg_err_code: string = error.code;
      const itemsIdListRaw: any = await RedisService.getKey(
        `${transaction_id}_itemsIdList`
      );
      const itemsIdList: any = itemsIdListRaw
        ? JSON.parse(itemsIdListRaw)
        : null;

      console.info(
        `Checking for Valid error.message and Item Id and error.message.item_id Mapping in /ON_SELECT_OUT_OF_STOCK`
      );

      if (msg_err_code === "40002") {
        let errorArray: any = "";
        try {
          errorArray = JSON.parse(msg_err);
        } catch (error: any) {
          console.error(
            `!!Error while Checking for Valid error.message and paring it ${error.message} ${error.stack}`
          );
        }
        if (!Array.isArray(errorArray)) {
          result.push({
            valid: false,
            code: 20006,
            description: `The error.message provided in the ${ApiSequence.ON_SELECT_OUT_OF_STOCK} should be in the form of an array with proper error_code and item_id. For Example: [{"item_id":"I1","error":"40002"},{"item_id":"I2","error":"40002"},{"item_id":"I3","error":"40002"}]`,
          });
        } else {
          function isValidErrorItem(item: any): boolean {
            return (
              typeof item.dynamic_item_id === "string" &&
              typeof item.customization_id === "string" &&
              typeof item.customization_group_id === "string" &&
              typeof item.error === "string"
            );
            // && typeof item.item_id === 'string'
          }

          function validateErrorArray(items: any[]): boolean {
            return items.every(isValidErrorItem);
          }
          if (validateErrorArray(errorArray)) {
            const parent_item_ids = _.map(breakup_msg, "item.parent_item_id");
            const dynamic_item_ids = _.map(errorArray, "dynamic_item_id");

            _.difference(dynamic_item_ids, parent_item_ids).forEach((diff) => {
              result.push({
                valid: false,
                code: 20006,
                description: `Dynamic_item_id: ${diff} doesn't exists in any quote.breakup.item.parent_item_ids`,
              });
            });

            const itemsReduced = breakup_msg.filter((item: any) => {
              return (
                item["@ondc/org/item_quantity"] &&
                item["@ondc/org/item_quantity"].count <
                  itemsIdList[item["@ondc/org/item_id"]]
              );
            });

            _.difference(
              _.map(itemsReduced, "item.parent_item_id"),
              dynamic_item_ids
            ).forEach((diff) => {
              result.push({
                valid: false,
                code: 20006,
                description: `Dynamic_item_id: ${diff} is missing from error payload and should be provided in the correct form with proper error_code and item_id,dynamic_item_id,etc. For Example: if base item "I1" for dynamic item "DI1" and customization "C15" for dynamic item "DI2" are both out of stock, error.message would be encoded as: "[{\"dynamic_item_id\":\"DI1\",\"item_id\":\"I1\",\"error\":\"40002\"}, {\"dynamic_item_id\":\"DI2\",\"customization_id\":\"C15\",\"customization_group_id\":\"CG3\",\"error\":\"40002\"}]"`,
              });
            });
            errorArray.forEach((errorItem: any) => {
              const isPresent = itemsReduced.some(
                (item: any) => item["@ondc/org/item_id"] === errorItem.item_id
              );

              if (!isPresent) {
                result.push({
                  valid: false,
                  code: 20006,
                  description: `Item isn't reduced ${errorItem.item_id} in ${msg_err} is not present in fullfillments/items`,
                });
              }
            });

            itemsReduced.forEach((item: any) => {
              const isPresentForward = errorArray.some(
                (errorItem: any) =>
                  errorItem.item_id === item["@ondc/org/item_id"]
              );
              if (!isPresentForward) {
                result.push({
                  valid: false,
                  code: 20006,
                  description: `message/order/items for item ${item["@ondc/org/item_id"]} does not match in ${msg_err}`,
                });
              }
            });
          } else {
            let isCustomizationThere = false;
            errorArray.forEach((obj: any) => {
              if (Object.keys(obj).includes("dynamic_item_id")) {
                isCustomizationThere = true;
              }
            });
            if (!isCustomizationThere) {
              result.push({
                valid: false,
                code: 20006,
                description: `The error.message provided in the ${ApiSequence.ON_SELECT_OUT_OF_STOCK} should be provided in the correct form with proper error_code and item_id. For Example: [{"item_id":"I1","error":"40002"},{"item_id":"I2","error":"40002"},{"item_id":"I3","error":"40002"}]`,
              });
            }
          }
        }
      }
    } catch (error: any) {
      console.error(
        `!!Error while Checking for Valid error.message and Item Id and error.message.item_id Mapping in ${error.message} ${error.stack}`
      );
    }
  }

  try {
    const itemPrices = new Map();
    on_select.quote.breakup.forEach(
      (item: { [x: string]: any; price: { value: any } }) => {
        if (
          item["@ondc/org/item_id"] &&
          item.price &&
          item.price.value &&
          item["@ondc/org/title_type"] === "item"
        ) {
          itemPrices.set(item["@ondc/org/item_id"], Math.abs(item.price.value));
        }
      }
    );
  const parentItemIds = on_select.items
    .map((item: any) => item.parent_item_id)
    .filter((id: any) => id); 
    const parentItemIdsQuotes = on_select.quote.breakup
    .map((breakupItem: any) => breakupItem.item?.parent_item_id)
    .filter((id: any) => id); // Remove undefined/null values
  
  parentItemIdsQuotes.forEach((quoteParentId : any, index : any) => {
    if (!parentItemIds.includes(quoteParentId)) {
      const errorMsg = `parent_item_id '${quoteParentId}' in quote.breakup[${index}] is not present in items array`;
      result.push({
        valid: false,
        code: 20000,
        description: errorMsg,
      });
      console.error(
        `!!Error: ${errorMsg} in /${constants.ON_SELECT}`)
      
    }
  });
    
    await RedisService.setKey(
      `${transaction_id}_selectPriceMap`,
      JSON.stringify(Array.from(itemPrices.entries())),
      TTL_IN_SECONDS
    );
  } catch (error: any) {
    console.error(
      `!!Error while checking and comparing the quoted price in /${constants.ON_SELECT}, ${error.stack}`
    );
  }

  try {
    if (!error) {
      console.info(
        `Checking available and maximum count in ${constants.ON_SELECT}`
      );
      on_select.quote.breakup.forEach((element: any, i: any) => {
        const itemId = element["@ondc/org/item_id"];
        if (
          element.item?.quantity &&
          element.item.quantity?.available &&
          element.item.quantity?.maximum &&
          typeof element.item.quantity.available.count === "string" &&
          typeof element.item.quantity.maximum.count === "string"
        ) {
          const availCount = parseInt(
            element.item.quantity.available.count,
            10
          );
          const maxCount = parseInt(element.item.quantity.maximum.count, 10);
          const selectedCount = element["@ondc/org/item_quantity"]?.count
            ? parseInt(element["@ondc/org/item_quantity"].count, 10)
            : 0;

          if (isNaN(availCount) || isNaN(maxCount) || availCount <= 0) {
            result.push({
              valid: false,
              code: 20000,
              description: `Available and Maximum count should be greater than 0 for item id: ${itemId} in quote.breakup[${i}]`,
            });
          } else if (
            element.item.quantity.available.count.trim() === "" ||
            element.item.quantity.maximum.count.trim() === ""
          ) {
            result.push({
              valid: false,
              code: 20000,
              description: `Available or Maximum count should not be empty string for item id: ${itemId} in quote.breakup[${i}]`,
            });
          } else if (selectedCount > availCount || selectedCount > maxCount) {
            result.push({
              valid: false,
              code: 20001,
              description: `Selected count (${selectedCount}) exceeds available (${availCount}) or maximum (${maxCount}) count for item id: ${itemId} in quote.breakup[${i}]`,
            });
          } else if (availCount > maxCount) {
            result.push({
              valid: false,
              code: 20001,
              description: `available (${availCount})  exceeds  maximum (${maxCount}) count for item id: ${itemId} in quote.breakup[${i}]`,
            });
          }
        }
      });
    }
  } catch (error: any) {
    console.error(
      `Error while checking available and maximum count in ${constants.ON_SELECT}, ${error.stack}`
    );
  }

  try {
    console.info(
      `Checking if delivery line item present in case of Serviceable for ${constants.ON_SELECT}`
    );
    if (on_select.quote) {
      const quoteBreakup = on_select.quote.breakup;
      const deliveryItems = quoteBreakup.filter(
        (item: { [x: string]: string }) =>
          item["@ondc/org/title_type"] === "delivery"
      );
      const noOfDeliveries = deliveryItems.length;
      if (!noOfDeliveries && !nonServiceableFlag) {
        result.push({
          valid: false,
          code: 20000,
          description: `delivery line item must be present in quote/breakup (if location is serviceable)`,
        });
      }
      if (noOfDeliveries && nonServiceableFlag) {
        deliveryItems.map((e: any) => {
          if (e.price.value > 0) {
            console.error(
              "Delivery charges not applicable for non-servicable locations"
            );
          }
        });
      }
    } else {
      console.error(`Missing quote object in ${constants.ON_SELECT}`);
    }
  } catch (error: any) {
    console.info(
      `!!Error occurred while checking delivery line item in /${constants.ON_SELECT}, ${error.stack}`
    );
  }

  try {
    console.info(
      `Checking payment breakup title & type in /${constants.ON_SELECT}`
    );
    if (on_select.quote) {
      on_select.quote.breakup.forEach(
        (item: { [x: string]: any; title: string }) => {
          if (
            item["@ondc/org/title_type"] != "item" &&
            !Object.values(retailPymntTtl).includes(
              item["@ondc/org/title_type"]
            )
          ) {
            
            result.push({
              valid: false,
              code: 20000,
              description: `Quote breakup Payment title type "${item["@ondc/org/title_type"]}" is not as per the API contract`,
            });
          }
          if (
            item["@ondc/org/title_type"] !== "item" &&
            item['@ondc/org/title_type'] !== 'offer' &&
            !(item.title.toLowerCase().trim() in retailPymntTtl)
          ) {
            
            result.push({
              valid: false,
              code: 20000,
              description: `Quote breakup Payment title "${item.title}" is not as per the API Contract`,
            });
          } else if (
            item["@ondc/org/title_type"] !== "item" &&
            item['@ondc/org/title_type'] !== 'offer' &&
            retailPymntTtl[item.title.toLowerCase().trim()] !==
              item["@ondc/org/title_type"]
          ) {
            result.push({
              valid: false,
              code: 20000,
              description: `Quote breakup Payment title "${
                item.title
              }" comes under the title type "${
                retailPymntTtl[item.title.toLowerCase().trim()]
              }"`,
            });
          }
        }
      );
    } else {
      console.error(`Missing quote object in ${constants.ON_SELECT}`);
    }
  } catch (error: any) {
    console.error(
      `!!Error while checking payment breakup title & type in /${constants.ON_SELECT}`
    );
  }

  let fulfillmentIdArray: any = [];
  try {
    console.info("Checking Fulfillment TAT...");
    on_select.fulfillments.forEach((ff: { [x: string]: any; id: any }) => {
      if (ff.id) fulfillmentIdArray.push(ff.id);
      if (!ff["@ondc/org/TAT"]) {
        console.info(
          `Fulfillment TAT must be present for Fulfillment ID: ${ff.id}`
        );
        result.push({
          valid: false,
          code: 20000,
          description: `Fulfillment TAT must be present for fulfillment ID: ${ff.id}`,
        });
      }
    });

    await RedisService.setKey(
      `${transaction_id}_fulfillmentIdArray`,
      JSON.stringify(fulfillmentIdArray),
      TTL_IN_SECONDS
    );
  } catch (error: any) {
    console.info(
      `Error while checking fulfillments TAT in /${constants.ON_SELECT}`
    );
  }

  try {
    console.info(
      `-x-x-x-x-Quote Breakup ${constants.ON_SELECT} all checks-x-x-x-x`
    );
    const itemsIdListRaw = await RedisService.getKey(
      `${transaction_id}_itemsIdList`
    );
    const itemsIdList = itemsIdListRaw ? JSON.parse(itemsIdListRaw) : null;
    const itemsCtgrsRaw = await RedisService.getKey(
      `${transaction_id}_itemsCtgrs`
    );
    const itemsCtgrs = itemsCtgrsRaw ? JSON.parse(itemsCtgrsRaw) : null;
    const providerOffersRaw: any = await RedisService.getKey(`${transaction_id}_${ApiSequence.ON_SEARCH}_offers`) 
    const providerOffers = providerOffersRaw
      ? JSON.parse(providerOffersRaw)
      : null;
    const applicableOffers: any[] = []
    const orderItemIds = on_select?.items?.map((item: any) => item.id) || []
     const items: any = orderItemIds
      .map((id: any) => {
        const item = on_select?.quote?.breakup.find((entry: any) => entry['@ondc/org/item_id'] === id)
        return item ? { id, price: item.price.value } : null
      })
      .filter((item: any) => item !== null)

      const priceSums = items.reduce((acc: Record<string, number>, item: { id: string; price: string }) => {
        const { id, price } = item
        acc[id] = (acc[id] || 0) + parseFloat(price)
        return acc
      }, {})
      const totalWithoutOffers = on_select?.quote?.breakup.reduce((sum: any, item: any) => {
        if (item['@ondc/org/title_type'] !== 'offer') {
          const value = parseFloat(item.price?.value || '0')
          return sum + value
        }
        return sum
      }, 0)
      const offers: any = on_select.quote.breakup.filter((offer: any) => offer['@ondc/org/title_type'] === 'offer')
      const applicableOfferRaw = await RedisService.getKey(`${transaction_id}_selected_offers`)
      const applicableOffer = applicableOfferRaw
        ? JSON.parse(applicableOfferRaw)
        : null
      console.info(`Calculating Items' prices in /${constants.ON_SELECT}`);
      const deliveryCharges =
      Math.abs(
        parseFloat(
          on_select.quote.breakup.find((item: any) => item['@ondc/org/title_type'] === 'delivery')?.price?.value,
        ),
      ) || 0
      if (offers.length > 0) {
        await RedisService.setKey(`${transaction_id}_on_select_offers`, JSON.stringify(offers), TTL_IN_SECONDS)
        const additiveOffers = offers.filter((offer: any) => {
          const metaTag = offer?.item.tags?.find((tag: any) => tag.code === 'offer')
          return metaTag?.list?.some((entry: any) => entry.code === 'additive' && entry.value.toLowerCase() === 'yes')
        })

        const nonAdditiveOffers = offers.filter((offer: any) => {
          const metaTag = offer?.item.tags?.find((tag: any) => tag.code === 'offer')
          return metaTag?.list?.some((entry: any) => entry.code === 'additive' && entry.value.toLowerCase() === 'no')
        })

        if (additiveOffers.length > 0) {
          offers.length = 0
          additiveOffers.forEach((offer: any) => {
            const providerOffer = providerOffers.find((o: any) => o.id === offer.id)
            if (providerOffer) {
              applicableOffers.push(providerOffer)
            }
          })
        } else if (nonAdditiveOffers.length === 1) {
          // Apply the single non-additive offer
          applicableOffers.length = 0
          const offer = nonAdditiveOffers[0]
          const offerId = offer?.item?.tags
            ?.find((tag: any) => tag.code === 'offer')
            ?.list?.find((entry: any) => entry.code === 'id')?.value
          const providerOffer = providerOffers.find((o: any) => o.id === offerId)
          if (providerOffer) {
            applicableOffers.push(providerOffer)
          }
        } else if (nonAdditiveOffers.length > 1) {
          console.log('nonAdditiveOffers', nonAdditiveOffers)

          applicableOffers.length = 0
          nonAdditiveOffers.forEach((offer: any) => {
            result.push({
              valid: false,
              code: 20000,
              description: `Offer ${offer.id} is non-additive and cannot be combined with other non-additive offers.`,
            })
           
          })
          // setValue('Addtive-Offers',false)
          return
        }
        console.log('Applicable Offers:', applicableOffers)
      }
    if (on_select.quote) {
      on_select.quote.breakup.forEach(async (element: any, i: any) => {
        const titleType = element["@ondc/org/title_type"];
        console.info(
          `Calculating quoted Price Breakup for element ${element.title}`
        );
        if (titleType === 'offer') {
          const priceValue = parseFloat(element.price.value)

          if (isNaN(priceValue)) {
            result.push({
              valid: false,
              code: 20000,
              description: `Price for title type "offer" is not a valid number.`,
            })
            
          } else if (priceValue >= 0) {
            result.push({
              valid: false,
              code: 20000,
              description: `Price for title type "offer" must be negative, but got ${priceValue}.`,
            })
          
          }
        }
        onSelectPrice += parseFloat(element.price.value);
        if (titleType === "item") {
          if (!(element["@ondc/org/item_id"] in itemFlfllmnts)) {
            console.log(
              "fasly error is coming here",
              element["@ondc/org/item_id"],
              JSON.stringify(itemFlfllmnts)
            );
            result.push({
              valid: false,
              code: 20000,
              description: `item with id: ${element["@ondc/org/item_id"]} in quote.breakup[${i}] does not exist in items[]`,
            });
          }
          console.info(
            `Comparing individual item's total price and unit price `
          );
          if (!element.hasOwnProperty("item")) {
            result.push({
              valid: false,
              code: 20000,
              description: `Item's unit price missing in quote.breakup for item id ${element["@ondc/org/item_id"]}`,
            });
          } else if (
            parseFloat(element.item.price.value) *
              element["@ondc/org/item_quantity"].count !=
            element.price.value
          ) {
            result.push({
              valid: false,
              code: 20000,
              description: `Item's unit and total price mismatch for id: ${element["@ondc/org/item_id"]}`,
            });
          }
        }
       
        if (
          typeof itemsIdList === "object" &&
          itemsIdList &&
          element["@ondc/org/item_id"] in itemsIdList
        ) {
          if (
            titleType === "item" ||
            (titleType === "tax" &&
              !taxNotInlcusive.includes(
                itemsCtgrs[element["@ondc/org/item_id"]]
              ))
          ) {
            onSelectItemsPrice += parseFloat(element.price.value);
          }
        }
        if (titleType === 'tax' || titleType === 'discount') {
          if (!(element["@ondc/org/item_id"] in itemFlfllmnts)) {
            result.push({
              valid: false,
              code: 20000,
              description: `item with id: ${element["@ondc/org/item_id"]} in quote.breakup[${i}] does not exist in items[] (should be a valid item id)`,
            });
          }
        }
        if (
          titleType === "packing" ||
          titleType === "delivery" ||
          titleType === "misc"
        ) {
          if (!fulfillmentIdArray.includes(element["@ondc/org/item_id"])) {
            result.push({
              valid: false,
              code: 20000,
              description: `invalid  id: ${element["@ondc/org/item_id"]} in ${titleType} line item (should be a valid fulfillment_id as provided in message.items for the items)`,
            });
          }
        }
        if (titleType === 'offer' && providerOffers.length > 0 && offers.length > 0) {
          try {
            if (applicableOffers?.length > 0) {
              const offerType = element?.item?.tags
                ?.find((tag: any) => tag.code === 'offer')
                ?.list?.find((entry: any) => entry.code === 'type')?.value
              const offerId = element?.item?.tags
                ?.find((tag: any) => tag.code === 'offer')
                ?.list?.find((entry: any) => entry.code === 'id')?.value 
              const onSelectOfferAutoApplicable = element?.item?.tags
                ?.find((tag: any) => tag.code === 'offer')
                ?.list?.find((entry: any) => entry.code === 'auto')?.value
              if (!offerId) {
                result.push({
                  valid: false,
                  code: 20000,
                  description: `Offer id cannot be null or empty.`, 
                });
              
                return
              }
              const quoteType =
                element?.item?.tags
                  .find((tag: any) => tag.code === 'quote')
                  ?.list?.map((type: any) => type.value)
                  .join(',') || ''
  
              console.log('quoteType', quoteType)
              // if(quoteType == "order"){
              //   const offerId = element['@ondc/org/item_id']
              //   if (!offerId) {
              //     errorObj['inVldItemId'] = [`offerId cannot be null or empty.`]
              //     return
              //   }
              //   const applicableOffer = getValue('selected_offer')
              //   console.log('applicableOffer', applicableOffer)
              //   const offer = applicableOffer?.find((offer: any) => offer?.id === offerId)
              //   if(!offer){
              //     errorObj[`invalidOffer`] =
              //     `Offer with id '${offerId}' is not applicable for this order.`;
              //   return;
              //   }
  
              // }
              const offerPriceValue: number = Math.abs(parseFloat(element?.price?.value))
              console.log('offerType', offerType)
              console.log('offerId', offerId)
  
              // const applicableOffer = getValue('selected_offer')
              // console.log('applicableOffer', applicableOffer)
              const selectedOffer = applicableOffer?.find((offer: any) => offer?.id === offerId)
              if (!applicableOffer) {
                const providerOffer = applicableOffers?.find((p: any) => p?.id === offerId)
                const providerMetaTag =
                  providerOffer?.tags
                    ?.find((tag: any) => tag.code === 'meta')
                    ?.list?.find((code: any) => code.code === 'auto')?.value || {}
                const offerAutoApplicable: boolean =
                  providerMetaTag === onSelectOfferAutoApplicable && onSelectOfferAutoApplicable === 'yes'
                if (!offerAutoApplicable && offerId) {
                  result.push({
                    valid: false,
                    code: 20000,
                    description: `Offer with id '${offerId}' is not applicable for this order as this offer cannot be auto applied but found in on select as defined in the catalog.`,
                  })
                
                  return
                }
                if (!selectedOffer && !offerAutoApplicable) {
                  const key = `inVldItemId[${i}]`
                  result.push({
                    valid: false,
                    code: 20000,
                    description: `item with id: ${element['@ondc/org/item_id']} in quote.breakup[${i}] does not exist in select offers id (should be a valid item id) `,
                  })
                  
                }
              }
  
              const providerOffer = providerOffers?.find((p: any) => p?.id === offerId)
              const orderLocationIds = on_select?.provider?.locations?.map((loc: any) => loc.id) || []
  
              console.log('providerOffer', JSON.stringify(providerOffer))
  
              const offerLocationIds = providerOffer?.location_ids || []
              const locationMatch = offerLocationIds.some((id: string) => orderLocationIds.includes(id))
  
              if (!locationMatch) {
                result.push({
                  valid: false,
                  code: 20000,
                  description: `Offer with id '${offerId}' is not applicable for any of the order's locations. \nApplicable locations in offer: [${offerLocationIds.join(', ')}], \nLocations in order: [${orderLocationIds.join(', ')}].`,
                })
               
                return
              }
  
              const offerItemIds = providerOffer?.item_ids || []
              const itemMatch = offerItemIds.some((id: string) => orderItemIds.includes(id))
  
              if (!itemMatch && titleType === 'buyXgetY') {
                result.push({
                  valid: false,
                  code: 20000,
                  description: `Offer with id '${offerId}' is not applicable for any of the ordered item(s). \nApplicable items in offer: [${offerItemIds.join(', ')}], \nItems in order: [${orderItemIds.join(', ')}].`,
                })
               
              }
  
              const benefitTag: any = providerOffer?.tags?.find((tag: any) => {
                return tag?.code === 'benefit'
              })
              const benefitList = benefitTag?.list || []
              const qualifierTag: any = providerOffer?.tags?.find((tag: any) => {
                return tag?.code === 'qualifier'
              })
              const qualifierList: any = qualifierTag?.list || []
              console.log('qualifierList', qualifierList, qualifierTag)
  
              const minValue = parseFloat(qualifierList.find((l: any) => l.code === 'min_value')?.value) || 0
              console.log('min_value', minValue)
              const itemsOnSearchRaw: any = await RedisService.getKey(`${transaction_id}_onSearchItems`) 
              const itemsOnSearch = itemsOnSearchRaw
                ? JSON.parse(itemsOnSearchRaw)
                : null
              
              if (offerType === 'discount') {
                if (minValue > 0 && minValue !== null) {
                  const qualifies: boolean = totalWithoutOffers >= minValue
                  console.log('qualifies', qualifies, minValue)
  
                  if (!qualifies) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `Offer with id '${offerId}' is not applicable for quote with actual quote value before discount is ₹${totalWithoutOffers} as required min_value for order is ₹${minValue}.`,
                    })  
                    
                  }
                }
  
                const benefitList = benefitTag?.list || []
  
                const valueType = benefitList.find((l: any) => l?.code === 'value_type')?.value
                const value_cap = Math.abs(
                  parseFloat(benefitList.find((l: any) => l?.code === 'value_cap')?.value || '0'),
                )
                const benefitAmount = Math.abs(
                  parseFloat(benefitList.find((l: any) => l.code === 'value')?.value || '0'),
                )
                const quotedPrice = parseFloat(on_select.quote.price.value || '0')
  
                let benefitValue = 0
                let qualifies = false
  
                if (valueType === 'percent') {
                  if (value_cap > 0) {
                    benefitValue = (benefitAmount / 100) * value_cap
  
                    if (offerPriceValue !== benefitValue) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Discount mismatch: Expected discount is -₹${benefitValue.toFixed(2)} (i.e., ${benefitAmount}% of capped value ₹${value_cap}), but found -₹${offerPriceValue.toFixed(2)}.`,
                      })
                      
                    }
  
                    qualifies = Math.abs(value_cap - benefitValue - quotedPrice) < 0.01
  
                    if (!qualifies) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Quoted price mismatch: After ${benefitAmount}% discount on ₹${value_cap}, expected price is ₹${(value_cap - benefitValue).toFixed(2)}, but got ₹${quotedPrice.toFixed(2)}.`,
                      })
                    
                    }
                  } else {
                    const quotePercentageAmount = (benefitAmount / 100) * totalWithoutOffers
  
                    if (offerPriceValue !== quotePercentageAmount) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Discount mismatch: Expected discount is -₹${quotePercentageAmount.toFixed(2)} (i.e., ${benefitAmount}% of ₹${totalWithoutOffers}), but found -₹${offerPriceValue.toFixed(2)}.`,
                      })
                     
                    }
  
                    const quoteAfterBenefit = totalWithoutOffers - quotePercentageAmount
                    qualifies = Math.abs(quoteAfterBenefit - quotedPrice) < 0.01
  
                    if (!qualifies) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Quoted price mismatch: After ${benefitAmount}% discount on ₹${totalWithoutOffers}, expected price is ₹${quoteAfterBenefit.toFixed(2)}, but got ₹${quotedPrice.toFixed(2)}.`,
                      })
                      
                    }
                  }
                } else {
                  if (value_cap > 0) {
                    benefitValue = value_cap - benefitAmount
  
                    if (offerPriceValue !== benefitAmount) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Discount mismatch: Expected discount is -₹${benefitAmount.toFixed(2)} (from capped value ₹${value_cap}), but found -₹${offerPriceValue.toFixed(2)}.`,
                      })
                     
                    }
  
                    qualifies = Math.abs(benefitValue - quotedPrice) < 0.01
  
                    if (!qualifies) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Quoted price mismatch: After applying ₹${benefitAmount} on cap ₹${value_cap}, expected price is ₹${benefitValue.toFixed(2)}, but got ₹${quotedPrice.toFixed(2)}.`,
                      })
                    
                    }
                  } else {
                    const quoteAfterBenefit = totalWithoutOffers - benefitAmount
  
                    if (offerPriceValue !== benefitAmount) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Discount mismatch: Expected discount is -₹${benefitAmount.toFixed(2)} (from ₹${totalWithoutOffers}), but found -₹${offerPriceValue.toFixed(2)}.`,
                      })
                     
                    }
  
                    qualifies = Math.abs(quoteAfterBenefit - quotedPrice) < 0.01
  
                    if (!qualifies) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Quoted price mismatch: After applying ₹${benefitAmount} on ₹${totalWithoutOffers}, expected price is ₹${quoteAfterBenefit.toFixed(2)}, but got ₹${quotedPrice.toFixed(2)}.`,
                      })
                     
                    }
                  }
                }
              }
  
              if (offerType === 'freebie') {
                // const benefitTag: any = providerOffer?.tags?.find((tag: any) => {
                //   return tag?.code === 'benefit'
                // })
                // const benefitList = benefitTag?.list || []
                // const qualifierTag: any = providerOffer?.tags?.find((tag: any) => {
                //   return tag?.code === 'qualifier'
                // })
                // if(!benefitTag){
                //   errorObj.invalidTags = `bpp/providers/offers/${offerId} tags with code benefit are missing and required`
                //   return
                // }
                // const qualifierList: any = qualifierTag?.list || []
                // console.log('qualifierList', qualifierList, qualifierTag)
  
                // const minValue = parseFloat(qualifierList.find((l: any) => l.code === 'min_value')?.value) || 0
                // console.log('min_value', minValue)
  
                if (minValue > 0 && minValue !== null) {
                  console.log('benefit lsit', benefitList)
                  const qualifies: boolean = totalWithoutOffers >= minValue
  
                  console.log('qualifies', qualifies, minValue)
  
                  if (!qualifies) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `Offer with id '${offerId}' is not applicable for quote with actual quote value before discount is ₹${totalWithoutOffers} as required min_value for order is ₹${minValue}.`,
                    })
                    
                  }
                  const benefitItemId = benefitList.find((entry: any) => entry.code === 'item_id')?.value || ''
                  const benefitItemCount = parseInt(
                    benefitList.find((entry: any) => entry.code === 'item_count')?.value || '0',
                  )
                  const itemTags = element?.item?.tags || []
  
                  const offerTag = itemTags.find((tag: any) => tag.code === 'offer')
                  if (!offerTag) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `tags are required in on_select   /quote with @ondc/org/title_type:${titleType} and offerId:${offerId}`,
                    })
                  
                  }
  
                  const offerItemId = offerTag?.list?.find((entry: any) => entry.code === 'item_id')?.value || ''
                  const offerItemCount = parseInt(
                    offerTag?.list?.find((entry: any) => entry.code === 'item_count')?.value || '0',
                  )
                  if (!offerItemCount) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `item_count is required in on_select   /quote with @ondc/org/title_type:${titleType} `,
                    })
                  
                  }
                  if (offerItemId !== benefitItemId) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `Mismatch: item_id used in on_select quote.breakup (${offerItemId}) doesn't match with offer benefit item_id (${benefitItemId}) in on_search catalog for offer ID: ${offerId}`,
                    })
                    
                  }
                  if (benefitItemCount !== offerItemCount) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `Mismatch: item_id used in on_select quote.breakup (${offerItemCount}) quantity doesn't match with offer benefit item_id (${benefitItemCount}) in on_search catalog  for offer ID: ${offerId}`,
                    })
                   
                  }
                  if (!offerItemId) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `item_id is required in on_select   /quote with @ondc/org/title_type:${titleType} with  offer_id:${offerId}`,
                    })
                    
                  }
  
                  // const offerPrice = Math.abs(parseFloat(element?.price?.value || '0'))
  
                  const itemIds = offerItemId.split(',').map((id: string) => id.trim())
  
                  const matchedItems = itemsOnSearch[0].filter((item: any) => itemIds.includes(item.id))
  
                  const priceMismatchItems: string[] = []
                  let totalExpectedOfferValue: number = 0
                  console.log(totalExpectedOfferValue)
                  let allItemsEligible = true
  
                  matchedItems.forEach((item: any) => {
                    const itemPrice = Math.abs(parseFloat(item?.price?.value || '0'))
                    const availableCount = parseInt(item?.quantity?.available?.count || '0', 10)
  
                    // Calculate the expected total price for the item
                    const expectedItemTotal = itemPrice * offerItemCount
                    totalExpectedOfferValue += expectedItemTotal
  
                    // Validate stock availability
                    if (availableCount < offerItemCount) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Item ID: ${item.id} does not have sufficient stock. Required: ${offerItemCount}, Available: ${availableCount}`,
                      })
                    
                      allItemsEligible = false
                    }
  
                    // Validate price consistency
                    const quotedPrice = Math.abs(parseFloat(element?.price?.value || '0'))
                    if (expectedItemTotal !== quotedPrice) {
                      priceMismatchItems.push(
                        `ID: ${item.id} (Expected Total: ₹${expectedItemTotal}, Quoted: ₹${quotedPrice})`,
                      )
                      allItemsEligible = false
                    }
                  })
  
                  if (priceMismatchItems.length > 0) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `Price mismatch found for item(s): ${priceMismatchItems.join('; ')}`,  
                    });
                   
                  }
  
                  if (!allItemsEligible) {
                    const missingOrOutOfStock = itemIds.filter((id: string) => {
                      const matchedItem = matchedItems.find((item: any) => item.id === id)
                      if (!matchedItem) return true
                      const availableCount = parseInt(matchedItem?.quantity?.available?.count || '0', 10)
                      return availableCount < offerItemCount
                    })
  
                    if (missingOrOutOfStock.length > 0) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Item(s) with ID(s) ${missingOrOutOfStock.join(', ')} not found in catalog or do not have enough stock for offer ID: ${offerId}`,
                      })
                     
                    }
                  }
                } else {
                  console.log('benefit lsit', benefitList)
                  const benefitItemId = benefitList.find((entry: any) => entry.code === 'item_id')?.value || ''
                  const benefitItemCount = parseInt(
                    benefitList.find((entry: any) => entry.code === 'item_count')?.value || '0',
                  )
                  const itemTags = element?.item?.tags || []
  
                  const offerTag = itemTags.find((tag: any) => tag.code === 'offer')
                  if (!offerTag) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `tags are required in on_select   /quote with @ondc/org/title_type:${titleType} and offerId:${offerId}`,
                    })
                    
                  }
  
                  const offerItemId = offerTag?.list?.find((entry: any) => entry.code === 'item_id')?.value || ''
                  const offerItemCount = parseInt(
                    offerTag?.list?.find((entry: any) => entry.code === 'item_count')?.value || '0',
                  )
                  if (!offerItemCount) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `item_count is required in on_select   /quote with @ondc/org/title_type:${titleType} `,
                    })
                  
                  }
                  if (offerItemId !== benefitItemId) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `Mismatch: item_id used in on_select quote.breakup (${offerItemId}) doesn't match with offer benefit item_id (${benefitItemId}) in on_search catalog for offer ID: ${offerId}`,
                    })
                    
                  }
                  if (benefitItemCount !== offerItemCount) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `Mismatch: item_id used in on_select quote.breakup (${offerItemCount}) quantity doesn't match with offer benefit item_id (${benefitItemCount}) in on_search catalog  for offer ID: ${offerId}`,
                    })
                    
                  }
                  if (!offerItemId) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `item_id is required in on_select   /quote with @ondc/org/title_type:${titleType} with  offer_id:${offerId}`,
                    })
                  
                  }
  
                  // const offerPrice = Math.abs(parseFloat(element?.price?.value || '0'))
  
                  const itemIds = offerItemId.split(',').map((id: string) => id.trim())
                  // let totalExpectedOfferValue = 0
                  const matchedItems = itemsOnSearch[0].filter((item: any) => itemIds.includes(item.id))
  
                  const priceMismatchItems: string[] = []
                  let totalExpectedOfferValue = 0
                  console.log(totalExpectedOfferValue)
                  let allItemsEligible = true
  
                  matchedItems.forEach((item: any) => {
                    const itemPrice = Math.abs(parseFloat(item?.price?.value || '0'))
                    const availableCount = parseInt(item?.quantity?.available?.count || '0', 10)
  
                    // Calculate the expected total price for the item
                    const expectedItemTotal = itemPrice * offerItemCount
                    totalExpectedOfferValue += expectedItemTotal
  
                    // Validate stock availability
                    if (availableCount < offerItemCount) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Item ID: ${item.id} does not have sufficient stock. Required: ${offerItemCount}, Available: ${availableCount}`,
                      })
                    
                      allItemsEligible = false
                    }
  
                    // Validate price consistency
                    const quotedPrice = Math.abs(parseFloat(element?.price?.value || '0'))
                    if (expectedItemTotal !== quotedPrice) {
                      priceMismatchItems.push(
                        `ID: ${item.id} (Expected Total: ₹${expectedItemTotal}, Quoted: ₹${quotedPrice})`,
                      )
                      allItemsEligible = false
                    }
                  })
  
                  // Report any price mismatches
                  if (priceMismatchItems.length > 0) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `Price mismatch found for item(s): ${priceMismatchItems.join('; ')}`,
                    })
                   
                  }
  
                  // If not all items are eligible, identify missing or out-of-stock items
                  if (!allItemsEligible) {
                    const missingOrOutOfStock = itemIds.filter((id: string) => {
                      const matchedItem = matchedItems.find((item: any) => item.id === id)
                      if (!matchedItem) return true
                      const availableCount = parseInt(matchedItem?.quantity?.available?.count || '0', 10)
                      return availableCount < offerItemCount
                    })
  
                    if (missingOrOutOfStock.length > 0) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Item(s) with ID(s) ${missingOrOutOfStock.join(', ')} not found in catalog or do not have enough stock for offer ID: ${offerId}`,
                      })
                      
                    }
                  }
                }
              }
  
              if (offerType === 'buyXgetY') {
                const offerMinItemCount =
                  parseFloat(qualifierList.find((l: any) => l.code === 'item_count')?.value) || 0
                if (!offerMinItemCount || offerMinItemCount === 0) {
                  result.push({
                    valid: false,
                    code: 20000,
                    description: `Minimum Item Count required in catalog /offers/tags/qualifier/list/code:item_count or minimum item_count cannot be 0 for offer with id :${offerId}`,
                  })
                
                }
                if (minValue > 0 && minValue !== null) {
                  const qualifies: boolean = minValue >= priceSums
                  console.log('qualifies', qualifies, minValue)
  
                  if (!qualifies) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `Offer with id '${offerId}' is not applicable for quote with actual quote value before discount is ₹${totalWithoutOffers} as required min_value for order is ₹${minValue}.`,
                    })
                   
                  }
                }
                const benefitItemId = benefitList.find((entry: any) => entry.code === 'item_id')?.value || ''
                const benefitItemCount = parseInt(
                  benefitList.find((entry: any) => entry.code === 'item_count')?.value || '0',
                )
                const itemTags = element?.item?.tags || []
  
                const offerTag = itemTags.find((tag: any) => tag.code === 'offer')
                if (!offerTag) {
                  result.push({
                    valid: false,
                    code: 20000,
                    description: `tags are required in on_select   /quote with @ondc/org/title_type:${titleType} and offerId:${offerId}`,
                  })
                  
                }
  
                const offerItemId = offerTag?.list?.find((entry: any) => entry.code === 'item_id')?.value || ''
                const offerItemCount = parseInt(
                  offerTag?.list?.find((entry: any) => entry.code === 'item_count')?.value || '0',
                )
                if (!offerItemCount) {
                  result.push({
                    valid: false,
                    code: 20000,
                    description: `item_count is required in on_select   /quote with @ondc/org/title_type:${titleType} `,
                  })
                 
                }
                if (offerItemId !== benefitItemId) {
                  result.push({
                    valid: false,
                    code: 20000,
                    description: `Mismatch: item_id used in on_select quote.breakup (${offerItemId}) doesn't match with offer benefit item_id (${benefitItemId}) in on_search catalog for offer ID: ${offerId}`,
                  })
                  
                }
                if (benefitItemCount !== offerItemCount) {
                  result.push({
                    valid: false,
                    code: 20000,
                    description: `Mismatch: item_id used in on_select quote.breakup (${offerItemCount}) quantity doesn't match with offer benefit item_id (${benefitItemCount}) in on_search catalog  for offer ID: ${offerId}`,
                  })
                 
                }
                if (offerItemId) {
                  const itemIds = offerItemId.split(',').map((id: string) => id.trim())
                  // let totalExpectedOfferValue = 0
                  const matchedItems = itemsOnSearch[0].filter((item: any) => itemIds.includes(item.id))
  
                  const priceMismatchItems: string[] = []
                  let totalExpectedOfferValue = 0
                  console.log(totalExpectedOfferValue)
                  let allItemsEligible = true
  
                  matchedItems.forEach((item: any) => {
                    const itemPrice = Math.abs(parseFloat(item?.price?.value || '0'))
                    const availableCount = parseInt(item?.quantity?.available?.count || '0', 10)
  
                    // Calculate the expected total price for the item
                    const expectedItemTotal = itemPrice * offerItemCount
                    totalExpectedOfferValue += expectedItemTotal
  
                    // Validate stock availability
                    if (availableCount < offerItemCount) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Item ID: ${item.id} does not have sufficient stock. Required: ${offerItemCount}, Available: ${availableCount}`,
                      })
                    
                      allItemsEligible = false
                    }
  
                    // Validate price consistency
                    const quotedPrice = Math.abs(parseFloat(element?.price?.value || '0'))
                    if (expectedItemTotal !== quotedPrice) {
                      priceMismatchItems.push(
                        `ID: ${item.id} (Expected Total: ₹${expectedItemTotal}, Quoted: ₹${quotedPrice})`,
                      )
                      allItemsEligible = false
                    }
                  })
  
                  // Report any price mismatches
                  if (priceMismatchItems.length > 0) {
                    result.push({
                      valid: false,
                      code: 20000,
                      description: `Price mismatch found for item(s): ${priceMismatchItems.join('; ')}`,
                    })
                   
                  }
  
                  // If not all items are eligible, identify missing or out-of-stock items
                  if (!allItemsEligible) {
                    const missingOrOutOfStock = itemIds.filter((id: string) => {
                      const matchedItem = matchedItems.find((item: any) => item.id === id)
                      if (!matchedItem) return true
                      const availableCount = parseInt(matchedItem?.quantity?.available?.count || '0', 10)
                      return availableCount < offerItemCount
                    })
  
                    if (missingOrOutOfStock.length > 0) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Item(s) with ID(s) ${missingOrOutOfStock.join(', ')} not found in catalog or do not have enough stock for offer ID: ${offerId}`,
                      })
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Item(s) with ID(s) ${missingOrOutOfStock.join(', ')} not found in catalog or do not have enough stock for offer ID: ${offerId}`,
                      })
                     
                    }
                  }
                }
              }
              if (offerType === 'delivery' && quoteType === 'fulfillment') {
                if (deliveryCharges > 0 || deliveryCharges !== null) {
                  if (minValue > 0 && minValue !== null) {
                    const qualifies: boolean = totalWithoutOffers >= minValue
                    console.log('qualifies', qualifies, minValue)
  
                    if (!qualifies) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Offer with id '${offerId}' is not applicable for quote with actual quote value before discount is ₹${totalWithoutOffers} as required min_value for order is ₹${minValue}.`,
                      })
                   
                    }
                  }
  
                  const benefitList = benefitTag?.list || []
  
                  const valueType = benefitList.find((l: any) => l?.code === 'value_type')?.value
                  const value_cap = Math.abs(
                    parseFloat(benefitList.find((l: any) => l?.code === 'value_cap')?.value || '0'),
                  )
                  const benefitValue = Math.abs(
                    parseFloat(benefitList.find((l: any) => l.code === 'value')?.value || '0'),
                  )
                  const quotedPrice = parseFloat(on_select.quote.price.value || '0')
                  let qualifies = false
  
                  if (valueType === 'percent') {
                    if (value_cap === 0) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Offer with id '${offerId}' is not applicable for quote with actual quote value before discount is ₹${totalWithoutOffers} as required min_value for order is ₹${minValue}.`,
                      })
                     
                    } else {
                      console.log('delivery charges', deliveryCharges, offerPriceValue)
                      let expectedDiscount = 0
                      expectedDiscount = (benefitValue / 100) * deliveryCharges
                      if (expectedDiscount > value_cap) {
                        expectedDiscount = value_cap
                      }
                      if (expectedDiscount > deliveryCharges) {
                        result.push({
                          valid: false,
                          code: 20000,
                          description: `Discount exceeds delivery charge. Discount: ₹${expectedDiscount.toFixed(2)}, Delivery Charge: ₹${deliveryCharges.toFixed(2)}`,
                        })
                        
                      }
                      if (offerPriceValue !== expectedDiscount) {
                        result.push({
                          valid: false,
                          code: 20000,
                          description: `Discount mismatch: Expected discount is -₹${expectedDiscount.toFixed(2)} (i.e., ${benefitValue}% of capped value ₹${value_cap}), but found -₹${offerPriceValue.toFixed(2)}.`,
                        })
                       
                      }
                    }
                  } else {
                    if (benefitValue !== offerPriceValue) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Discount mismatch: Expected discount is -₹${benefitValue.toFixed(2)} (from ₹${totalWithoutOffers}), but found -₹${offerPriceValue.toFixed(2)}.`,
                      })
                     
                    }
  
                    if (offerPriceValue !== deliveryCharges) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Discount mismatch: Expected discount is -₹${offerPriceValue.toFixed(2)}, but delivery charges are -₹${deliveryCharges.toFixed(2)}.`,
                      })
                      
                    }
  
                    const quoteAfterBenefit = totalWithoutOffers - benefitValue
  
                    qualifies = Math.abs(quoteAfterBenefit - quotedPrice) < 0.01
  
                    if (!qualifies) {
                      result.push({
                        valid: false,
                        code: 20000,
                        description: `Quoted price mismatch: After applying ₹${benefitValue} on ₹${totalWithoutOffers}, expected price is ₹${quoteAfterBenefit.toFixed(2)}, but got ₹${quotedPrice.toFixed(2)}.`,
                      })
                    
                    }
                  }
                } else {
                  result.push({
                    valid: false,
                    code: 20000,
                    description: `Delivery charges are required in on_select   /quote with @ondc/org/title_type:${titleType} with  offer_id:${offerId}`,
                  })
                 
                }
              }
            }
          } catch (error: any) {
            console.error(
              `!!Error while checking and validating the offer price in /${constants.ON_SELECT}, ${error.stack}`,
            )
          }
        }
      });
     
      await RedisService.setKey(
        `${transaction_id}_onSelectPrice`,
        JSON.stringify(on_select.quote.price.value),
        TTL_IN_SECONDS
      );
      onSelectPrice = onSelectPrice.toFixed(2);
      console.info(
        `Matching quoted Price ${parseFloat(
          on_select.quote.price.value
        )} with Breakup Price ${onSelectPrice}`
      );
      if (
        Math.round(onSelectPrice) !=
        Math.round(parseFloat(on_select.quote.price.value))
      ) {
        result.push({
          valid: false,
          code: 20000,
          description: `quote.price.value ${on_select.quote.price.value} does not match with the price breakup ${onSelectPrice}`,
        });
      }
      const selectedPriceRaw = await RedisService.getKey(
        `${transaction_id}_selectedPrice`
      );
      const selectedPrice = selectedPriceRaw
        ? JSON.parse(selectedPriceRaw)
        : null;
      console.info(
        `Matching price breakup of items ${onSelectItemsPrice} (/${constants.ON_SELECT}) with selected items price ${selectedPrice} (${constants.SELECT})`
      );
      if (
        typeof selectedPrice === "number" &&
        onSelectItemsPrice !== selectedPrice
      ) {
        result.push({
          valid: false,
          code: 20000,
          description: `Warning: Quoted Price in /${constants.ON_SELECT} INR ${onSelectItemsPrice} does not match with the total price of items in /${constants.SELECT} INR ${selectedPrice} i.e price for the item mismatch in on_search and on_select`,
        });
        console.info("Quoted Price and Selected Items price mismatch");
      }
    } else {
      console.error(`Missing quote object in ${constants.ON_SELECT}`);
    }
  } catch (error: any) {
    console.error(
      `!!Error while checking and comparing the quoted price in /${constants.ON_SELECT}, ${error.stack}`
    );
  }

  try {
    console.info("Checking fulfillment.id, fulfillment.type and tracking");
    on_select.fulfillments.forEach(async (ff: any) => {
      let ffId = "";
      if (!ff.id) {
        console.info(`Fulfillment Id must be present `);
        result.push({
          valid: false,
          code: 20000,
          description: `Fulfillment Id must be present`,
        });
      }
      ffId = ff.id;
      if (ffId) {
        if (ff.tracking === false || ff.tracking === true) {
          await RedisService.setKey(
            `${transaction_id}_${ffId}_tracking`,
            JSON.stringify(ff.tracking),
            TTL_IN_SECONDS
          );
        } else {
          console.info(
            `Tracking must be present for fulfillment ID: ${ff.id} in boolean form`
          );
          result.push({
            valid: false,
            code: 20000,
            description: `Tracking must be present for fulfillment ID: ${ff.id} in boolean form`,
          });
        }
      }
    });
  } catch (error: any) {
    console.info(
      `Error while checking fulfillments id, type and tracking in /${constants.ON_SELECT}`
    );
  }

  try {
    console.info("Checking quote validity quote.ttl");
    if (!on_select.quote.hasOwnProperty("ttl")) {
      result.push({
        valid: false,
        code: 20000,
        description: "quote.ttl: Validity of the quote is missing",
      });
    }
  } catch (error: any) {
    console.error(
      `!!Error while checking quote.ttl in /${constants.ON_SELECT}`
    );
  }

  try {
    if (on_select.quote) {
      console.info(`Storing Quote object in /${constants.ON_SELECT}`);
      on_select.quote.breakup.forEach((element: BreakupElement) => {
        if (element["@ondc/org/title_type"] === "item") {
          if (element.item && element.item.hasOwnProperty("quantity")) {
            delete element.item.quantity;
          }
        }
      });
      await RedisService.setKey(
        `${transaction_id}_quoteObj`,
        JSON.stringify(on_select.quote),
        TTL_IN_SECONDS
      );
    }
  } catch (error: any) {
    console.error(
      `!!Error while storing quote object in /${constants.ON_SELECT}, ${error.stack}`
    );
  }

  try {
    console.info(
      `Comparing fulfillmentID with providerID for /${constants.ON_SELECT} `
    );
    const len: number = on_select.fulfillments.length;
    let i = 0;
    while (i < len) {
      const fulfillment_id = on_select.fulfillments[i].id;
      const provider_id = on_select.provider.id;
      if (fulfillment_id === provider_id) {
        result.push({
          valid: false,
          code: 20000,
          description:
            "FullfillmentID can't be equal to ProviderID on ${constants.ON_SELECT}",
        });
      }
      i++;
    }
  } catch (error: any) {
    console.error(
      `!Error while comparing fulfillmentID with providerID in /${ApiSequence.ON_SELECT}, ${error.stack}`
    );
  }

  await RedisService.setKey(
    `${transaction_id}_quote_price`,
    JSON.stringify(on_select.quote.price.value),
    TTL_IN_SECONDS
  );

  return result;
};

export default onSelect;
