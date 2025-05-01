/* eslint-disable no-prototype-builtins */
import _, { isArray } from "lodash";
import { RedisService } from "ondc-automation-cache-lib";
import {
  addActionToRedisSet,
  addMsgIdToRedisSet,
  areGSTNumbersDifferent,
  areGSTNumbersMatching,
  checkBppIdOrBapId,
  checkContext,
  checkItemTag,
  compareObjects,
  compareQuoteObjects,
  isTagsValid,
  payment_status,
  sumQuoteBreakUp,
  tagFinder,
} from "../../../utils/helper";
import constants, { ApiSequence } from "../../../utils/constants";

const confirm = async (data: any) => {
  const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;
  const result: any[] = [];
  const flow = "2";
  try {
    const { context, message }: any = data;
    const { transaction_id } = context || {};

    if (!data || _.isEmpty(data)) {
      result.push({
        valid: false,
        code: 20000,
        description: "JSON cannot be empty",
      });
      return result;
    }

    if (
      !message ||
      !context ||
      !message.order ||
      _.isEmpty(message) ||
      _.isEmpty(message.order)
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
    const select_customIdArrayRaw = await RedisService.getKey(
      `${transaction_id}_select_customIdArray`
    );
    const select_customIdArray = select_customIdArrayRaw
      ? JSON.parse(select_customIdArrayRaw)
      : null;
    const allOnSearchItemsRaw = await RedisService.getKey(
      `${transaction_id}_onSearchItems`
    );
    const allOnSearchItems = allOnSearchItemsRaw
      ? JSON.parse(allOnSearchItemsRaw)
      : [];
    const onSearchItems = allOnSearchItems.flat();

    const contextRes: any = checkContext(context, constants.CONFIRM);

    try {
      const previousCallPresent = await addActionToRedisSet(
        context.transaction_id,
        ApiSequence.ON_INIT,
        ApiSequence.CONFIRM
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
        `!!Error while previous action call /${constants.CONFIRM}, ${error.stack}`
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

    const domain = await RedisService.getKey(`${transaction_id}_domain`);
    if (!_.isEqual(data.context.domain.split(":")[1], domain)) {
      result.push({
        valid: false,
        code: 20000,
        description: `Domain should be same in each action`,
      });
    }

    try {
      console.info(`Adding Message Id /${constants.CONFIRM}`);
      const msgId = await RedisService.setKey(
        `${transaction_id}_${ApiSequence.CONFIRM}_msgId`,
        data.context.message_id,
        TTL_IN_SECONDS
      );

      const isMsgIdNotPresent = await addMsgIdToRedisSet(
        context.transaction_id,
        context.message_id,
        ApiSequence.CONFIRM
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
        `!!Error while checking message id for /${constants.CONFIRM}, ${error.stack}`
      );
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
      `${transaction_id}_${ApiSequence.CONFIRM}`,
      JSON.stringify(data),
      TTL_IN_SECONDS
    );

    try {
      console.info(
        `Comparing city of /${constants.SEARCH} and /${constants.CONFIRM}`
      );
      if (!_.isEqual(searchContext.city, context.city)) {
        result.push({
          valid: false,
          code: 20000,
          description: `City code mismatch in /${constants.SEARCH} and /${constants.CONFIRM}`,
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while comparing city in /${constants.SEARCH} and /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Comparing timestamp of /${constants.ON_INIT} and /${constants.CONFIRM}`
      );
      const tmpstmpRaw = await RedisService.getKey(
        `${transaction_id}_${ApiSequence.ON_INIT}_tmpstmp`
      );
      const tmpstmp = tmpstmpRaw ? JSON.parse(tmpstmpRaw) : null;
      if (_.gte(tmpstmp, context.timestamp)) {
        result.push({
          valid: false,
          code: 20000,
          description: `Timestamp for /${constants.ON_INIT} api cannot be greater than or equal to /${constants.CONFIRM} api`,
        });
      }

      await RedisService.setKey(
        `${transaction_id}_${ApiSequence.CONFIRM}_tmpstmp`,
        JSON.stringify(context.timestamp),
        TTL_IN_SECONDS
      );
    } catch (error: any) {
      console.error(
        `!!Error while comparing timestamp for /${constants.ON_INIT} and /${constants.CONFIRM} api, ${error.stack}`
      );
    }

    const confirm = message.order;
    const cnfrmOrdrId = confirm.id;
    await RedisService.setKey(
      `${transaction_id}_cnfrmOrdrId`,
      JSON.stringify(cnfrmOrdrId),
      TTL_IN_SECONDS
    );

    try {
      console.info(`Checking order state in /${constants.CONFIRM}`);
      if (confirm.state != "Created") {
        result.push({
          valid: false,
          code: 20000,
          description: `Default order state should be used in /${constants.CONFIRM}`,
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while checking order state in /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Checking provider id and location in /${constants.CONFIRM}`
      );
      const providerIdRaw = await RedisService.getKey(
        `${transaction_id}_providerId`
      );
      const providerId = providerIdRaw ? JSON.parse(providerIdRaw) : null;
      const providerLocRaw = await RedisService.getKey(
        `${transaction_id}_providerLoc`
      );
      const providerLoc = providerLocRaw ? JSON.parse(providerLocRaw) : null;
      if (confirm.provider.id != providerId) {
        result.push({
          valid: false,
          code: 20000,
          description: `Provider Id mismatches in /${constants.ON_SEARCH} and /${constants.CONFIRM}`,
        });
      }

      if (
        confirm.provider.locations &&
        isArray(confirm.provider.locations) &&
        confirm.provider.locations.length > 0 &&
        confirm.provider.locations[0].id != providerLoc
      ) {
        result.push({
          valid: false,
          code: 20000,
          description: `provider.locations[0].id mismatches in /${constants.ON_SEARCH} and /${constants.CONFIRM}`,
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while checking provider id and location in /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Comparing item Ids and fulfillment ids in /${constants.ON_SELECT} and /${constants.CONFIRM}`
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
      let itemsIdList = itemsIdListRaw ? JSON.parse(itemsIdListRaw) : null;
      let i = 0;
      const len = confirm.items?.length || 0;
      let itemsCountChange = false;
      const fulfillmentIdArrayRaw = await RedisService.getKey(
        `${transaction_id}_fulfillmentIdArray`
      );
      const fulfillmentIdArray = fulfillmentIdArrayRaw
        ? JSON.parse(fulfillmentIdArrayRaw)
        : null;
      while (i < len) {
        const itemId = confirm.items[i].id;
        const item = confirm.items[i];

        if (checkItemTag(item, select_customIdArray)) {
          result.push({
            valid: false,
            code: 20000,
            description: `items[${i}].tags.parent_id mismatches for Item ${itemId} in /${constants.SELECT} and /${constants.CONFIRM}`,
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
            description: `items[${i}].parent_item_id mismatches for Item ${itemId} in /${constants.ON_SEARCH} and /${constants.CONFIRM}`,
          });
        }

        if (itemFlfllmnts && fulfillmentIdArray && (itemId in fulfillmentIdArray) || (itemId in itemFlfllmnts)) {
          if (!fulfillmentIdArray.includes(confirm.items[i].fulfillment_id)  && !itemFlfllmnts[itemId]) {
            result.push({
              valid: false,
              code: 20000,
              description: `items[${i}].fulfillment_id mismatches for Item ${itemId} in /${constants.ON_SELECT} and /${constants.CONFIRM}`,
            });
          }
        } else {
          result.push({
            valid: false,
            code: 20000,
            description: `Item Id ${itemId} does not exist in /${constants.ON_SELECT}`,
          });
        }

        if (itemsIdList && itemId in itemsIdList) {
          if (!item.quantity || item.quantity.count == null) {
            result.push({
              valid: false,
              code: 20000,
              description: `items[${i}].quantity.count is missing or undefined for Item ${itemId} in /${constants.CONFIRM}`,
            });
          } else if (confirm.items[i].quantity.count != itemsIdList[itemId]) {
            itemsIdList[itemId] = confirm.items[i].quantity.count;
            itemsCountChange = true;
            result.push({
              valid: false,
              code: 20000,
              description: `Warning: items[${i}].quantity.count for item ${itemId} mismatches with the items quantity selected in /${constants.SELECT}`,
            });
          }
        }

        i++;
      }

      if (itemsCountChange) {
        await RedisService.setKey(
          `${transaction_id}_itemsIdList`,
          JSON.stringify(itemsIdList),
          TTL_IN_SECONDS
        );
      }
    } catch (error: any) {
      console.error(
        `!!Error while comparing Item and Fulfillment Id in /${constants.ON_SELECT} and /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Checking parent_item_id and type tags in /${constants.CONFIRM}`
      );
      const items = confirm.items || [];
      items.forEach((item: any, index: number) => {
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
        `!!Error while checking parent_item_id and type tags in /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Checking for valid and present location ID inside item list for /${constants.CONFIRM}`
      );
      confirm.items.forEach((item: any, index: number) => {
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
        `!!Error while checking for valid and present location ID inside item list for /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Checking vehicle registration for fulfillments in /${constants.CONFIRM}`
      );
      const fulfillments = confirm.fulfillments;
      if (Array.isArray(fulfillments)) {
        fulfillments.forEach((fulfillment, index) => {
          const type = fulfillment.type;
          const category = fulfillment["@ondc/org/category"];
          const vehicle = fulfillment.vehicle;
          const SELF_PICKUP = "Self-Pickup";
          const KERBSIDE = "Kerbside";

          if (type === SELF_PICKUP && category === KERBSIDE) {
            if (!vehicle) {
              result.push({
                valid: false,
                code: 20000,
                description: `Vehicle is required for fulfillment ${index} with type ${SELF_PICKUP} and category ${KERBSIDE} in /${constants.CONFIRM}`,
              });
            } else if (!vehicle.registration) {
              result.push({
                valid: false,
                code: 20000,
                description: `Vehicle registration is required for fulfillment ${index} with type ${SELF_PICKUP} and category ${KERBSIDE} in /${constants.CONFIRM}`,
              });
            }
          } else if (vehicle) {
            result.push({
              valid: false,
              code: 20000,
              description: `Vehicle should not be present in fulfillment ${index} with type ${type} and category ${category} in /${constants.CONFIRM}`,
            });
          }
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while checking vehicle registration for fulfillments in /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Checking address components length in /${constants.CONFIRM}`
      );
      const noOfFulfillments = confirm.fulfillments?.length || 0;
      let i = 0;
      while (i < noOfFulfillments) {
        const address = confirm.fulfillments[i].end?.location?.address;
        if (!address) {
          result.push({
            valid: false,
            code: 20000,
            description: `fulfillments[${i}].end.location.address is missing in /${constants.CONFIRM}`,
          });
        } else {
          const lenName = address.name?.length || 0;
          const lenBuilding = address.building?.length || 0;
          const lenLocality = address.locality?.length || 0;

          if (lenName + lenBuilding + lenLocality >= 190) {
            result.push({
              valid: false,
              code: 20000,
              description: `address.name + address.building + address.locality should be less than 190 chars in fulfillments[${i}]`,
            });
          }

          if (lenBuilding <= 3) {
            result.push({
              valid: false,
              code: 20000,
              description: `address.building should be more than 3 chars in fulfillments[${i}]`,
            });
          }

          if (lenName <= 3) {
            result.push({
              valid: false,
              code: 20000,
              description: `address.name should be more than 3 chars in fulfillments[${i}]`,
            });
          }

          if (lenLocality <= 3) {
            result.push({
              valid: false,
              code: 20000,
              description: `address.locality should be more than 3 chars in fulfillments[${i}]`,
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
              description: `value of address.name, address.building, and address.locality should be unique in fulfillments[${i}]`,
            });
          }
        }

        i++;
      }
    } catch (error: any) {
      console.error(
        `!!Error while checking address components in /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Checking for number of digits in tax number in message.order.tags[0].list`
      );
      if (message.order.tags && isArray(message.order.tags)) {
        const list = message.order.tags[0]?.list;
        list.forEach((item: any) => {
          if (item.code == "tax_number") {
            if (item.value.length !== 15) {
              result.push({
                valid: false,
                code: 20000,
                description: `Number of digits in tax number in message.order.tags[0].list should be 15`,
              });
            }
          }
        });
      }
    } catch (error: any) {
      console.error(
        `Error while checking for the number of digits in tax_number, ${error.stack}`
      );
    }

    try {
      console.info(
        `Comparing billing object in /${constants.INIT} and /${constants.CONFIRM}`
      );
      const billingRaw = await RedisService.getKey(`${transaction_id}_billing`);
      const billing = billingRaw ? JSON.parse(billingRaw) : null;
      const billingErrors = compareObjects(billing, confirm.billing);
      if (billingErrors) {
        billingErrors.forEach((error: string, index: number) => {
          result.push({
            valid: false,
            code: 20000,
            description: `${error} when compared with init billing object`,
          });
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while comparing billing object in /${constants.INIT} and /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(`Checking fulfillments objects in /${constants.CONFIRM}`);
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
      const len = confirm.fulfillments?.length || 0;
      const gpsRegex = /^-?\d{1,3}\.\d+,-?\d{1,3}\.\d+$/;
      while (i < len) {
        if (confirm.fulfillments[i].id) {
          const id = confirm.fulfillments[i].id;
          if (fulfillmentIdArray && !fulfillmentIdArray.includes(id)) {
            result.push({
              valid: false,
              code: 20000,
              description: `fulfillment id ${id} does not exist in /${constants.ON_SELECT}`,
            });
          }
        } else {
          result.push({
            valid: false,
            code: 20000,
            description: `fulfillments[${i}].id is missing in /${constants.CONFIRM}`,
          });
        }

        const ffId = confirm.fulfillments[i].id || "";
        const trackingRaw = await RedisService.getKey(
          `${transaction_id}_${ffId}_tracking`
        );
        const tracking = trackingRaw ? JSON.parse(trackingRaw) : null;
        if (tracking != null) {
          if (
            confirm.fulfillments[i].tracking === false ||
            confirm.fulfillments[i].tracking === true
          ) {
            if (tracking != confirm.fulfillments[i].tracking) {
              result.push({
                valid: false,
                code: 20000,
                description: `Fulfillment Tracking mismatch with the ${constants.ON_SELECT} call`,
              });
            }
          } else {
            result.push({
              valid: false,
              code: 20000,
              description: `Tracking must be present for fulfillment ID: ${ffId} in boolean form`,
            });
          }
        }

        if (
          !confirm.fulfillments[i].end ||
          !confirm.fulfillments[i].end.person
        ) {
          result.push({
            valid: false,
            code: 20000,
            description: `fulfillments[${i}].end.person object is missing`,
          });
        }

        const gps = confirm.fulfillments[i].end?.location?.gps;
        if (gps == null || gps === "") {
          console.info(
            `Missing gps coordinates for fulfillment at index ${i} in /${constants.CONFIRM}`
          );
          result.push({
            valid: false,
            code: 20000,
            description: `fulfillments[${i}].end.location.gps is missing or empty in /${constants.CONFIRM}`,
          });
        } else {
          if (!gpsRegex.test(gps)) {
            console.info(
              `Invalid gps format for fulfillment at index ${i}: ${gps}`
            );
            result.push({
              valid: false,
              code: 20000,
              description: `fulfillments[${i}].end.location.gps has invalid format in /${constants.CONFIRM}`,
            });
          } else {
            const buyerGpsRaw = await RedisService.getKey(
              `${transaction_id}_buyerGps`
            );
            const buyerGps = buyerGpsRaw ? JSON.parse(buyerGpsRaw) : null;
            console.info(
              `GPS from confirm: ${gps}, buyerGps from Redis: ${buyerGps}`
            );
            if (buyerGps == null) {
              console.info(
                `buyerGps is missing or null for transaction_id ${transaction_id} in /${constants.CONFIRM}`
              );
              result.push({
                valid: false,
                code: 20000,
                description: `buyerGps is missing in Redis for /${constants.CONFIRM}`,
              });
            } else if (!gpsRegex.test(buyerGps)) {
              console.info(
                `Invalid buyerGps format for transaction_id ${transaction_id}: ${buyerGps}`
              );
              result.push({
                valid: false,
                code: 20000,
                description: `buyerGps has invalid format in Redis for /${constants.CONFIRM}`,
              });
            } else if (!_.isEqual(gps, buyerGps)) {
              console.info(
                `GPS coordinates mismatch for fulfillment at index ${i} in /${constants.CONFIRM}`
              );
              result.push({
                valid: false,
                code: 20000,
                description: `gps coordinates in fulfillments[${i}].end.location mismatch in /${constants.SELECT} & /${constants.CONFIRM}`,
              });
            }
          }
        }

        const areaCode =
          confirm.fulfillments[i].end?.location?.address?.area_code;
        if (areaCode == null || areaCode === "") {
          console.info(
            `Missing area_code for fulfillment at index ${i} in /${constants.CONFIRM}`
          );
          result.push({
            valid: false,
            code: 20000,
            description: `fulfillments[${i}].end.location.address.area_code is missing or empty in /${constants.CONFIRM}`,
          });
        } else {
          const buyerAddrRaw = await RedisService.getKey(
            `${transaction_id}_buyerAddr`
          );
          const buyerAddr = buyerAddrRaw ? JSON.parse(buyerAddrRaw) : null;
          if (buyerAddr != null && !_.isEqual(areaCode, buyerAddr)) {
            console.info(
              `Area code mismatch for fulfillment at index ${i} in /${constants.CONFIRM}`
            );
            result.push({
              valid: false,
              code: 20000,
              description: `address.area_code in fulfillments[${i}].end.location mismatch in /${constants.SELECT} & /${constants.CONFIRM}`,
            });
          }
        }

        i++;
      }
    } catch (error: any) {
      console.error(
        `!!Error while checking fulfillments object in /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(`Checking payment object in /${constants.CONFIRM}`);
      if (
        parseFloat(confirm.payment.params.amount) !=
        parseFloat(confirm.quote.price.value)
      ) {
        result.push({
          valid: false,
          code: 20000,
          description:
            "Quoted price (/confirm) doesn't match with the amount in payment.params",
        });
      }

      const sttlmntdtlsRaw = await RedisService.getKey(
        `${transaction_id}_sttlmntdtls`
      );
      const sttlmntdtls = sttlmntdtlsRaw ? JSON.parse(sttlmntdtlsRaw) : null;
      if (
        !_.isEqual(
          confirm.payment["@ondc/org/settlement_details"][0],
          sttlmntdtls
        )
      ) {
        console.log(`👺 ${confirm.payment["@ondc/org/settlement_details"]}`)
        console.log('👀', sttlmntdtls)
        result.push({
          valid: false,
          code: 20000,
          description: `payment settlement_details mismatch in /${constants.ON_INIT} & /${constants.CONFIRM}`,
        });
      }

      if (
        !confirm.hasOwnProperty("created_at") ||
        !confirm.hasOwnProperty("updated_at")
      ) {
        result.push({
          valid: false,
          code: 20000,
          description: `order created and updated timestamps are mandatory in /${constants.CONFIRM}`,
        });
      } else {
        const tmpstmpRaw = await RedisService.getKey(
          `${transaction_id}_${ApiSequence.ON_INIT}_tmpstmp`
        );
        const tmpstmp = tmpstmpRaw ? JSON.parse(tmpstmpRaw) : null;
        if (!_.isEqual(confirm.created_at, tmpstmp)) {
          result.push({
            valid: false,
            code: 20000,
            description: `order.created_at timestamp should match context.timestamp`,
          });
        }

        if (!_.isEqual(confirm.created_at, confirm.updated_at)) {
          result.push({
            valid: false,
            code: 20000,
            description: `order.updated_at timestamp should match order.created_at timestamp`,
          });
        }
      }
    } catch (error: any) {
      console.error(
        `!!Error while checking payment object in /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(`storing payment object in /${constants.CONFIRM}`);
      await RedisService.setKey(
        `${transaction_id}_cnfrmpymnt`,
        JSON.stringify(confirm.payment),
        TTL_IN_SECONDS
      );
    } catch (error: any) {
      console.error(
        `!!Error while storing payment object in /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Comparing Quote object for /${constants.ON_SELECT} and /${constants.CONFIRM}`
      );
      const quoteObjRaw = await RedisService.getKey(
        `${transaction_id}_quoteObj`
      );
      const quoteObj = quoteObjRaw ? JSON.parse(quoteObjRaw) : null;
      const quoteErrors = compareQuoteObjects(
        quoteObj,
        confirm.quote,
        constants.ON_SELECT,
        constants.CONFIRM
      );
      const hasItemWithQuantity = _.some(confirm.quote.breakup, (item: any) =>
        _.has(item, "item.quantity")
      );
      if (hasItemWithQuantity) {
        result.push({
          valid: false,
          code: 20000,
          description: `Extra attribute Quantity provided in quote object i.e not supposed to be provided after on_select so invalid quote object`,
        });
      } else if (quoteErrors) {
        quoteErrors.forEach((error: string, index: number) => {
          result.push({
            valid: false,
            code: 20000,
            description: `${error}`,
          });
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while Comparing Quote object for /${constants.ON_SELECT} and /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(`Checking quote breakup prices for /${constants.CONFIRM}`);
      if (!sumQuoteBreakUp(confirm.quote)) {
        result.push({
          valid: false,
          code: 20000,
          description: `item quote breakup prices for ${constants.CONFIRM} should be equal to the total price.`,
        });
        console.error(
          `item quote breakup prices for ${constants.CONFIRM} should be equal to the total price`
        );
      }
    } catch (error: any) {
      console.error(
        `!!Error while Comparing Quote object for /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Checking Buyer App finder fee amount in /${constants.CONFIRM}`
      );
      const buyerFFRaw = await RedisService.getKey(
        `${transaction_id}_${ApiSequence.SEARCH}_buyerFF`
      );
      const buyerFF = buyerFFRaw ? JSON.parse(buyerFFRaw) : null;
      if (
        !confirm.payment["@ondc/org/buyer_app_finder_fee_amount"] ||
        parseFloat(confirm.payment["@ondc/org/buyer_app_finder_fee_amount"]) !=
          buyerFF
      ) {
        result.push({
          valid: false,
          code: 20000,
          description: `Buyer App Finder fee can't change`,
        });
        console.info(
          `Buyer app finder fee ${confirm.payment["@ondc/org/buyer_app_finder_fee_amount"]} can't change in /${constants.CONFIRM}`
        );
      }
    } catch (error: any) {
      console.error(
        `!!Error while Checking Buyer App finder fee amount in /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info("storing order created and updated timestamps");
      if (confirm.created_at)
        await RedisService.setKey(
          `${transaction_id}_ordrCrtd`,
          JSON.stringify(confirm.created_at),
          TTL_IN_SECONDS
        );
      if (confirm.updated_at)
        await RedisService.setKey(
          `${transaction_id}_ordrUpdtd`,
          JSON.stringify(confirm.updated_at),
          TTL_IN_SECONDS
        );
    } catch (error: any) {
      console.error(
        `!!Error while storing order created and updated timestamps in /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Comparing order price value in /${constants.ON_INIT} and /${constants.CONFIRM}`
      );
      const initQuotePriceRaw = await RedisService.getKey(
        `${transaction_id}_initQuotePrice`
      );
      const initQuotePrice = initQuotePriceRaw
        ? JSON.parse(initQuotePriceRaw)
        : null;
      const confirmQuotePrice = parseFloat(confirm.quote.price.value);
      console.info(
        `Comparing quote prices of /${constants.ON_INIT} and /${constants.CONFIRM}`
      );
      if (initQuotePrice != confirmQuotePrice) {
        result.push({
          valid: false,
          code: 20000,
          description: `Quoted Price in /${constants.CONFIRM} INR ${confirmQuotePrice} does not match with the quoted price in /${constants.ON_INIT} INR ${initQuotePrice}`,
        });
      }
      await RedisService.setKey(
        `${transaction_id}_quotePrice`,
        JSON.stringify(confirmQuotePrice),
        TTL_IN_SECONDS
      );
    } catch (error: any) {
      console.error(
        `!!Error while comparing order price value in /${constants.ON_INIT} and /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Comparing tags in /${constants.ON_INIT} and /${constants.CONFIRM}`
      );
      const on_init_tagsRaw = await RedisService.getKey(
        `${transaction_id}_on_init_tags`
      );
      const on_init_tags = on_init_tagsRaw ? JSON.parse(on_init_tagsRaw) : null;
      if (confirm.tags) {
        const isValid = areGSTNumbersMatching(
          on_init_tags,
          confirm.tags,
          "bpp_terms"
        );
        if (isValid === false) {
          result.push({
            valid: false,
            code: 20000,
            description: `Tags should have same and valid gst_number as passed in /${constants.ON_INIT}`,
          });
        }

        const isValidBap = isTagsValid(confirm.tags, "bap_terms");
        if (isValidBap === false) {
          result.push({
            valid: false,
            code: 20000,
            description: `Tags/bap_terms should have valid gst number and fields in /${constants.CONFIRM}`,
          });
        }

        const areGstDiff = areGSTNumbersDifferent(confirm.tags);
        if (areGstDiff === true) {
          result.push({
            valid: false,
            code: 20000,
            description: `Tags/bap_terms and Tags/bpp_terms should have different gst number in /${constants.CONFIRM}`,
          });
        }

        await RedisService.setKey(
          `${transaction_id}_confirm_tags`,
          JSON.stringify(confirm.tags),
          TTL_IN_SECONDS
        );
      }
    } catch (error: any) {
      console.error(
        `!!Error while Comparing tags in /${constants.ON_INIT} and /${constants.CONFIRM}, ${error.stack}`
      );
    }

    try {
      console.info(`Checking if bap_terms is present in ${constants.CONFIRM}`);
      const tags = confirm.tags;
      for (const tag of tags) {
        if (tag.code === "bap_terms") {
          const hasStaticTerms = tag.list.some(
            (item: { code: string }) => item.code === "static_terms"
          );
          if (hasStaticTerms) {
            result.push({
              valid: false,
              code: 20000,
              description: `static_terms is not required for now! in ${constants.CONFIRM}`,
            });
          }
        }
      }
    } catch (err: any) {
      console.error(
        `Error while Checking bap_terms in ${constants.CONFIRM}, ${err.stack}`
      );
    }

    try {
      console.info(
        "Checking if transaction_id is present in message.order.payment"
      );
      const payment = confirm.payment;

      const status = payment_status(payment, flow);
      if (!status) {
        result.push({
          valid: false,
          code: 20000,
          description: "Transaction_id missing in message/order/payment",
        });
      }
    } catch (err: any) {
      console.error(
        "Error while checking transaction in message/order/payment: " +
          err.message
      );
    }

    return result;
  } catch (err: any) {
    console.error(
      `!!Some error occurred while checking /${constants.CONFIRM} API`,
      err
    );
    return result;
  }
};

export default confirm;
