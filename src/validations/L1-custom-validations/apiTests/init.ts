import _ from "lodash";

import { RedisService } from "ondc-automation-cache-lib";
import {
  addActionToRedisSet,
  addMsgIdToRedisSet,
  checkBppIdOrBapId,
  checkContext,
  checkItemTag,
  isObjectEmpty,
  tagFinder,
  compareObjects,
} from "../../../utils/helper";
import constants, { ApiSequence } from "../../../utils/constants";

const init = async (data: any) => {
  const result: any[] = [];
  const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;
  try {
    if (!data || isObjectEmpty(data)) {
      result.push({
        valid: false,
        code: 20000,
        description: "JSON cannot be empty",
      });
      return result;
    }

    const { message, context }: any = data;
    const { transaction_id } = context;

    if (
      !message ||
      !context ||
      !message.order ||
      isObjectEmpty(message) ||
      isObjectEmpty(message.order)
    ) {
      result.push({
        valid: false,
        code: 20000,
        description:
          "/context, /message, /order or /message/order is missing or empty",
      });
      return result;
    }

    const searchContextRaw = await RedisService.getKey(
      `${transaction_id}_${ApiSequence.SEARCH}_context`
    );
    const searchContext = searchContextRaw
      ? JSON.parse(searchContextRaw)
      : null;
    const parentItemIdSetRaw = await RedisService.getKey(
      `${transaction_id}_parentItemIdSet`
    );
    const parentItemIdSet = parentItemIdSetRaw
      ? JSON.parse(parentItemIdSetRaw)
      : null;
    const customIdArrayRaw = await RedisService.getKey(
      `${transaction_id}_select_customIdArray`
    );
    const select_customIdArray = customIdArrayRaw
      ? JSON.parse(customIdArrayRaw)
      : null;

    const contextRes: any = checkContext(context, constants.INIT);

    try {
      const previousCallPresent = await addActionToRedisSet(
        context.transaction_id,
        ApiSequence.ON_SELECT,
        ApiSequence.INIT
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
        `!!Error while checking previous action call /${constants.INIT}, ${error.stack}`
      );
    }

    const checkBap = checkBppIdOrBapId(context.bap_id);
    const checkBpp = checkBppIdOrBapId(context.bpp_id);

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

    try {
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
    } catch (err) {
      console.error(err);
    }

    if (!contextRes?.valid) {
      contextRes.ERRORS.forEach((error: any) => {
        result.push({
          valid: false,
          code: 20000,
          description: error,
        });
      });
    }

    await RedisService.setKey(
      `${transaction_id}_${ApiSequence.INIT}`,
      JSON.stringify(data),
      TTL_IN_SECONDS
    );

    try {
      console.info(`Checking context for /${constants.INIT} API`);
      const res: any = checkContext(context, constants.INIT);
      if (!res.valid) {
        res.ERRORS.forEach((error: any) => {
          result.push({
            valid: false,
            code: 20000,
            description: error,
          });
        });
      }
    } catch (error: any) {
      console.error(
        `!!Some error occurred while checking /${constants.INIT} context, ${error.stack}`
      );
    }

    try {
      console.info(
        `Comparing city of /${constants.SEARCH} and /${constants.INIT}`
      );
      if (!_.isEqual(searchContext.city, context.city)) {
        result.push({
          valid: false,
          code: 20000,
          description: `City code mismatch in /${constants.SEARCH} and /${constants.INIT}`,
        });
      }
    } catch (error: any) {
      console.info(
        `Error while comparing city in /${constants.SEARCH} and /${constants.INIT}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Comparing timestamp of /${constants.ON_SELECT} and /${constants.INIT}`
      );
      const tmpRaw = await RedisService.getKey(
        `${transaction_id}_${ApiSequence.ON_SELECT}_tmpstmp`
      );
      const tmpstmp = tmpRaw ? JSON.parse(tmpRaw) : null;
      if (_.gte(tmpstmp, context.timestamp)) {
        result.push({
          valid: false,
          code: 20000,
          description: `Timestamp for /${constants.ON_SELECT} api cannot be greater than or equal to /${constants.INIT} api`,
        });
      }
      await RedisService.setKey(
        `${transaction_id}_${ApiSequence.INIT}_tmpstmp`,
        JSON.stringify(context.timestamp),
        TTL_IN_SECONDS
      );
    } catch (error: any) {
      console.error(
        `!!Error while comparing timestamp for /${constants.ON_SELECT} and /${constants.INIT} api, ${error.stack}`
      );
    }

    try {
      console.info(`Adding Message Id /${constants.INIT}`);
      const isMsgIdNotPresent = await addMsgIdToRedisSet(
        context.transaction_id,
        context.message_id,
        ApiSequence.INIT
      );
      if (!isMsgIdNotPresent) {
        result.push({
          valid: false,
          code: 20000,
          description: `Message id should not be same with previous calls`,
        });
      }
      await RedisService.setKey(
        `${transaction_id}_${ApiSequence.INIT}_msgId`,
        JSON.stringify(data.context.message_id),
        TTL_IN_SECONDS
      );
    } catch (error: any) {
      console.error(
        `!!Error while checking message id for /${constants.INIT}, ${error.stack}`
      );
    }

    const init = message.order;

    try {
      console.info(
        `Comparing provider object in /${constants.SELECT} and /${constants.INIT}`
      );

      const providerIdRaw = await RedisService.getKey(
        `${transaction_id}_providerId`
      );
      const providerId = providerIdRaw ? JSON.parse(providerIdRaw) : null;

      if (providerId != init.provider["id"]) {
        result.push({
          valid: false,
          code: 20000,
          description: `Provider Id mismatches in /${constants.SELECT} and /${constants.INIT}`,
        });
      }

      const providerLocRaw = await RedisService.getKey(
        `${transaction_id}_providerLoc`
      );
      const providerLoc = providerLocRaw ? JSON.parse(providerLocRaw) : null;
      if (providerLoc != init.provider.locations[0].id) {
        result.push({
          valid: false,
          code: 20000,
          description: `Provider.locations[0].id mismatches in /${constants.SELECT} and /${constants.INIT}`,
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while checking provider object in /${constants.SELECT} and /${constants.INIT}, ${error.stack}`
      );
    }

    try {
      console.info(`Checking address components length`);
      const noOfFulfillments = init.fulfillments.length;
      let i = 0;
      while (i < noOfFulfillments) {
        const address = init.fulfillments[i].end.location.address;
        const lenName = address.name.length;
        const lenBuilding = address.building.length;
        const lenLocality = address.locality.length;

        if (lenName + lenBuilding + lenLocality >= 190) {
          result.push({
            valid: false,
            code: 20000,
            description: `address.name + address.building + address.locality should be less than 190 chars`,
          });
        }

        if (lenBuilding <= 3) {
          result.push({
            valid: false,
            code: 20000,
            description: `address.building should be more than 3 chars`,
          });
        }

        if (lenName <= 3) {
          result.push({
            valid: false,
            code: 20000,
            description: `address.name should be more than 3 chars`,
          });
        }

        if (lenLocality <= 3) {
          result.push({
            valid: false,
            code: 20000,
            description: `address.locality should be more than 3 chars`,
          });
        }

        if (
          address.building === address.locality ||
          address.name === address.building ||
          address.name === address.locality
        ) {
          result.push({
            valid: false,
            code: 20000,
            description: `value of address.name, address.building and address.locality should be unique`,
          });
        }

        i++;
      }
    } catch (error: any) {
      console.error(
        `!!Error while checking address components in /${constants.INIT}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Validating and storing billing object in /${constants.INIT}`
      );
      if (!init.billing) {
        console.info(`Missing billing object in /${constants.INIT}`);
        result.push({
          valid: false,
          code: 20000,
          description: `billing object is missing in /${constants.INIT}`,
        });
      } else {
        // Check created_at presence
        if (
          init.billing.created_at == null ||
          init.billing.created_at.trim() === ""
        ) {
          console.info(
            `Missing created_at in billing object in /${constants.INIT}`
          );
          result.push({
            valid: false,
            code: 20000,
            description: `billing.created_at is missing or empty in /${constants.INIT}`,
          });
        }

        // Check updated_at presence
        if (
          init.billing.updated_at == null ||
          init.billing.updated_at.trim() === ""
        ) {
          console.info(
            `Missing updated_at in billing object in /${constants.INIT}`
          );
          result.push({
            valid: false,
            code: 20000,
            description: `billing.updated_at is missing or empty in /${constants.INIT}`,
          });
        }

        // Compare updated_at with created_at
        if (
          init.billing.created_at &&
          init.billing.updated_at &&
          new Date(init.billing.updated_at) < new Date(init.billing.created_at)
        ) {
          console.info(
            `updated_at is less than created_at in billing object in /${constants.INIT}`
          );
          result.push({
            valid: false,
            code: 20000,
            description: `billing.updated_at cannot be less than billing.created_at in /${constants.INIT}`,
          });
        }

        // Store billing object
        await RedisService.setKey(
          `${transaction_id}_billing`,
          JSON.stringify(init.billing),
          TTL_IN_SECONDS
        );
      }
    } catch (error: any) {
      console.error(
        `!!Error while validating or storing billing object in /${constants.INIT}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Comparing billing object with /${constants.SELECT} in /${constants.INIT}`
      );
      const selectBillingRaw = await RedisService.getKey(
        `${transaction_id}_billing_select`
      );
      const selectBilling = selectBillingRaw
        ? JSON.parse(selectBillingRaw)
        : null;

      if (selectBilling) {
        const billingErrors = compareObjects(selectBilling, init.billing);
        if (billingErrors && billingErrors.length > 0) {
          billingErrors.forEach((error: string) => {
            console.info(`Billing object mismatch: ${error}`);
            result.push({
              valid: false,
              code: 20000,
              description: `billing: ${error} when compared with /${constants.SELECT} billing object`,
            });
          });
        }
      }
    } catch (error: any) {
      console.error(
        `!!Error while comparing billing object in /${constants.INIT} and /${constants.SELECT}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Comparing item Ids and fulfillment ids in /${constants.ON_SELECT} and /${constants.INIT}`
      );
      const itemFlfllmntsRaw = await RedisService.getKey(
        `${transaction_id}_itemFlfllmnts`
      );
      const itemFlfllmnts = itemFlfllmntsRaw
        ? JSON.parse(itemFlfllmntsRaw)
        : null;
      const itemsIdListRaw = await RedisService.getKey(
        `${transaction_id}_itemsIdList`
      );
      const itemsIdList = itemsIdListRaw ? JSON.parse(itemsIdListRaw) : null;
      let i = 0;
      const len = init.items.length;
      const fulfillmentIdArrayRaw = await RedisService.getKey(
        `${transaction_id}_fulfillmentIdArray`
      );
      const fulfillmentIdArray = fulfillmentIdArrayRaw
        ? JSON.parse(fulfillmentIdArrayRaw)
        : null;
      while (i < len) {
        const itemId = init.items[i].id;
        const item = init.items[i];

        if (checkItemTag(item, select_customIdArray)) {
          result.push({
            valid: false,
            code: 20000,
            description: `items[${i}].tags.parent_id mismatches for Item ${itemId} in /${constants.ON_SEARCH} and /${constants.INIT}`,
          });
        }

        if (
          parentItemIdSet &&
          item.parent_item_id &&
          !parentItemIdSet.includes(item.parent_item_id)
        ) {
          result.push({
            valid: false,
            code: 20000,
            description: `items[${i}].parent_item_id mismatches for Item ${itemId} in /${constants.ON_SEARCH} and /${constants.INIT}`,
          });
        }

        if (itemId in itemFlfllmnts) {
          if (!fulfillmentIdArray.includes(init.items[i].fulfillment_id) ) {
            console.log('🥶', init.items[i].fulfillment_id)
            console.log('🤬', fulfillmentIdArray)
            result.push({
              valid: false,
              code: 20000,
              description: `items[${i}].fulfillment_id mismatches for Item ${itemId} in /${constants.ON_SELECT} and /${constants.INIT}`,
            });
          }
        } else {
          result.push({
            valid: false,
            code: 30004,
            description: `Item not found - Item Id ${itemId} does not exist in /${constants.ON_SELECT}`,
          });
        }

        if (itemId in itemsIdList) {
          if (init.items[i].quantity.count != itemsIdList[itemId]) {
            result.push({
              valid: false,
              code: 20000,
              description: `Warning: items[${i}].quantity.count for item ${itemId} mismatches with the items quantity selected in /${constants.SELECT}`,
            });
          }
        }

        i++;
      }
    } catch (error: any) {
      console.error(
        `!!Error while comparing Item and Fulfillment Id in /${constants.ON_SELECT} and /${constants.INIT}, ${error.stack}`
      );
    }

    try {
      console.info(`Checking fulfillments objects in /${constants.INIT}`);
      const itemFlfllmntsRaw = await RedisService.getKey(
        `${transaction_id}_itemFlfllmnts`
      );
      const itemFlfllmnts = itemFlfllmntsRaw
        ? JSON.parse(itemFlfllmntsRaw)
        : null;
        const fulfillmentIdArrayRaw = await RedisService.getKey(
          `${transaction_id}_fulfillmentIdArray`
        );
        const fulfillmentIdArray = fulfillmentIdArrayRaw
          ? JSON.parse(fulfillmentIdArrayRaw)
          : null;
      let i = 0;
      const len = init.fulfillments.length;
      while (i < len) {
        const id = init.fulfillments[i].id;
        if (!id) {
          console.info(
            `Missing id for fulfillment at index ${i} in /${constants.INIT}`
          );
          result.push({
            valid: false,
            code: 20000,
            description: `fulfillments[${i}].id is missing in /${constants.INIT}`,
          });
        } else {
          // Check if fulfillment id exists in itemFlfllmnts
          if (!fulfillmentIdArray || !fulfillmentIdArray.includes(id)) {
            console.info(
              `Fulfillment id ${id} not found in /${constants.ON_SELECT} at index ${i}`
            );
            result.push({
              valid: false,
              code: 20000,
              description: `fulfillment id ${id} does not exist in /${constants.ON_SELECT}`,
            });
          }

          // Check if tracking is present and a boolean
          const tracking = init.fulfillments[i].tracking;
          if (tracking == null) {
            console.info(
              `Missing tracking for fulfillment at index ${i} in /${constants.INIT}`
            );
            result.push({
              valid: false,
              code: 20000,
              description: `fulfillments[${i}].tracking is missing in /${constants.INIT}`,
            });
          } else if (typeof tracking !== "boolean") {
            console.info(
              `Invalid tracking value for fulfillment at index ${i} in /${constants.INIT}`
            );
            result.push({
              valid: false,
              code: 20000,
              description: `fulfillments[${i}].tracking must be a boolean (true or false) in /${constants.INIT}`,
            });
          }

          // Check if gps is present
          const gps = init.fulfillments[i].end?.location?.gps;
          if (gps == null || gps === "") {
            console.info(
              `Missing gps coordinates for fulfillment at index ${i} in /${constants.INIT}`
            );
            result.push({
              valid: false,
              code: 20000,
              description: `fulfillments[${i}].end.location.gps is missing or empty in /${constants.INIT}`,
            });
          } else {
            // Compare gps with buyerGps
            const buyerGpsRaw = await RedisService.getKey(
              `${transaction_id}_buyerGps`
            );
            const buyerGps = buyerGpsRaw ? JSON.parse(buyerGpsRaw) : null;
            if (buyerGps != null && !_.isEqual(gps, buyerGps)) {
              console.info(
                `GPS coordinates mismatch for fulfillment at index ${i} in /${constants.INIT}`
              );
              result.push({
                valid: false,
                code: 20000,
                description: `gps coordinates in fulfillments[${i}].end.location mismatch in /${constants.SELECT} & /${constants.INIT}`,
              });
            }
          }

          // Compare area_code with buyerAddr
          const areaCode =
            init.fulfillments[i].end?.location?.address?.area_code;
          if (areaCode == null || areaCode === "") {
            console.info(
              `Missing area_code for fulfillment at index ${i} in /${constants.INIT}`
            );
            result.push({
              valid: false,
              code: 20000,
              description: `fulfillments[${i}].end.location.address.area_code is missing or empty in /${constants.INIT}`,
            });
          } else {
            const buyerAddrRaw = await RedisService.getKey(
              `${transaction_id}_buyerAddr`
            );
            const buyerAddr = buyerAddrRaw ? JSON.parse(buyerAddrRaw) : null;
            if (buyerAddr != null && !_.isEqual(areaCode, buyerAddr)) {
              console.info(
                `Area code mismatch for fulfillment at index ${i} in /${constants.INIT}`
              );
              result.push({
                valid: false,
                code: 20000,
                description: `address.area_code in fulfillments[${i}].end.location mismatch in /${constants.SELECT} & /${constants.INIT}`,
              });
            }
          }
        }

        i++;
      }
    } catch (error: any) {
      console.error(
        `!!Error while checking fulfillments object in /${constants.INIT}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Checking parent_item_id and type tags in /${constants.INIT}`
      );
      const items = init.items || [];
      items.forEach((item: any, index: number) => {
        // Manually check type tags
        let isItemType = false;
        let isCustomizationType = false;
        if (item.tags) {
          const typeTag = item.tags.find((tag: any) => tag.code === "type");
          if (typeTag && typeTag.list) {
            const typeValue = typeTag.list.find(
              (listItem: any) => listItem.code === "type"
            )?.value;
            isItemType = typeValue === "item";
            isCustomizationType = typeValue === "customization";
          }
        }

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
            description: `items[${index}]: parent_item_id is required for items with type 'item' or 'customization'`,
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
            description: `items[${index}]: items with parent_item_id must have a type tag of 'item' or 'customization'`,
          });
        }

        // Check 3: For customization items, ensure parent tag's id is in select_customIdArray
        if (isCustomizationType && select_customIdArray) {
          const parentTag = item.tags.find((tag: any) => tag.code === "parent");
          if (!parentTag) {
            console.info(
              `Missing parent tag for customization item with ID: ${
                item.id || "undefined"
              } at index ${index}`
            );
            result.push({
              valid: false,
              code: 20000,
              description: `items[${index}]: customization items must have a parent tag`,
            });
          } else {
            const parentId = parentTag.list.find(
              (listItem: any) => listItem.code === "id"
            )?.value;
            if (parentId && checkItemTag(item, select_customIdArray)) {
              console.info(
                `Invalid parent tag id: ${parentId} for customization item with ID: ${
                  item.id || "undefined"
                } at index ${index}`
              );
              result.push({
                valid: false,
                code: 20000,
                description: `items[${index}]: parent tag id ${parentId} must be in select_customIdArray for customization items`,
              });
            }
          }
        }
      });
    } catch (error: any) {
      console.error(
        `!!Error while checking parent_item_id and type tags in /${constants.INIT}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Checking for valid and present location ID inside item list for /${constants.INIT}`
      );
      const allOnSearchItemsRaw = await RedisService.getKey(
        `${transaction_id}_onSearchItems`
      );
      const allOnSearchItems = allOnSearchItemsRaw
        ? JSON.parse(allOnSearchItemsRaw)
        : [];
      const onSearchItems = allOnSearchItems.flat();

      init.items.forEach((item: any, index: number) => {
        // Check if location_id is present
        if (!item.location_id || item.location_id.trim() === "") {
          console.info(
            `Missing location_id for item with ID: ${
              item.id || "undefined"
            } at index ${index}`
          );
          result.push({
            valid: false,
            code: 20000,
            description: `items[${index}]: location_id is required`,
          });
          return; // Skip further checks for this item
        }

        // Compare location_id with on_search items for non-customization items
        onSearchItems.forEach((it: any) => {
          const isCustomization = tagFinder(it, "customization");
          const isNotCustomization = !isCustomization;

          if (
            it.id === item.id &&
            it.location_id !== item.location_id &&
            isNotCustomization
          ) {
            console.info(
              `Location_id mismatch for item with ID: ${item.id} at index ${index}`
            );
            result.push({
              valid: false,
              code: 20000,
              description: `items[${index}]: location_id for item ${item.id} must match the location_id in /${constants.ON_SEARCH}`,
            });
          }
        });
      });
    } catch (error: any) {
      console.error(
        `!!Error while checking for valid and present location ID inside item list for /${constants.INIT}, ${error.stack}`
      );
    }

    return result;
  } catch (err: any) {
    console.error(
      `!!Some error occurred while checking /${constants.INIT} API, ${err.stack}`
    );
    return result;
  }
};

export default init;
