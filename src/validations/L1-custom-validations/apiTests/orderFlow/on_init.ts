/* eslint-disable no-prototype-builtins */
import _, { isArray } from "lodash";
import { RedisService } from "ondc-automation-cache-lib";
import {
  addActionToRedisSet,
  checkBppIdOrBapId,
  checkContext,
  checkItemTag,
  compareObjects,
  compareQuoteObjects,
  isObjectEmpty,
  isTagsValid,
  payment_status,
  timeDiff as timeDifference
} from "../../../../utils/helper";
import constants, { ApiSequence } from "../../../../utils/constants";

interface ValidationError {
  valid: boolean;
  code: number;
  description: string;
}

const onInit = async (data: any): Promise<ValidationError[]> => {
  const result: ValidationError[] = [];
  const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;
  const flow = "2";

  try {
    if (!data || isObjectEmpty(data)) {
      result.push({
        valid: false,
        code: 20000,
        description: "JSON cannot be empty",
      });
      return result;
    }

    const { message, context }: { message: any; context: any } = data;
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
        description: "/context, /message, /order or /message/order is missing or empty",
      });
      return result;
    }

    // Check previous call
    try {
      const previousCallPresent = await addActionToRedisSet(
        context.transaction_id,
        ApiSequence.INIT,
        ApiSequence.ON_INIT
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
      console.error(`!!Error while checking previous action call /${constants.ON_INIT}, ${error.stack}`);
    }

    // Fetch Redis data
    const [searchContextRaw, parentItemIdSetRaw, select_customIdArrayRaw, domainRaw] = await Promise.all([
      RedisService.getKey(`${transaction_id}_${ApiSequence.SEARCH}_context`),
      RedisService.getKey(`${transaction_id}_parentItemIdSet`),
      RedisService.getKey(`${transaction_id}_select_customIdArray`),
      RedisService.getKey(`${transaction_id}_domain`),
    ]);

    const searchContext = searchContextRaw ? JSON.parse(searchContextRaw) : null;
    const parentItemIdSet = parentItemIdSetRaw ? JSON.parse(parentItemIdSetRaw) : null;
    const select_customIdArray = select_customIdArrayRaw ? JSON.parse(select_customIdArrayRaw) : null;
    const domain = domainRaw 

    // Validate BAP/BPP IDs
    if (checkBppIdOrBapId(context.bap_id)) {
      result.push({
        valid: false,
        code: 20000,
        description: "context/bap_id should not be a url",
      });
    }
    if (checkBppIdOrBapId(context.bpp_id)) {
      result.push({
        valid: false,
        code: 20000,
        description: "context/bpp_id should not be a url",
      });
    }

    // Validate domain
    if (domain && !_.isEqual(data.context.domain.split(":")[1], domain)) {
      result.push({
        valid: false,
        code: 20000,
        description: `Domain should be same in each action`,
      });
    }

    // Store on_init data
    await RedisService.setKey(
      `${transaction_id}_${ApiSequence.ON_INIT}`,
      JSON.stringify(data),
      TTL_IN_SECONDS
    );

    // Check context
    try {
      console.info(`Checking context for /${constants.ON_INIT} API`);
      const contextRes: any = checkContext(context, constants.ON_INIT);
      if (!contextRes.valid) {
        contextRes.ERRORS.forEach((error: any) => {
          result.push({
            valid: false,
            code: 20000,
            description: error,
          });
        });
      }
    } catch (error: any) {
      console.error(`!!Error while checking /${constants.ON_INIT} context, ${error.stack}`);
    }

    // Compare city
    try {
      console.info(`Comparing city of ${constants.SEARCH} & ${constants.ON_INIT}`);
      if (searchContext && !_.isEqual(searchContext.city, context.city)) {
        result.push({
          valid: false,
          code: 20000,
          description: `City code mismatch in ${constants.SEARCH} & ${constants.ON_INIT}`,
        });
      }
    } catch (error: any) {
      console.error(`!!Error while comparing city in ${constants.SEARCH} & ${constants.ON_INIT}, ${error.stack}`);
    }

    // Compare timestamp
    try {
      console.info(`Comparing timestamp of ${constants.INIT} & ${constants.ON_INIT}`);
      const tmpstmpRaw = await RedisService.getKey(`${transaction_id}_${ApiSequence.INIT}_tmpstmp`);
      const tmpstmp = tmpstmpRaw ? JSON.parse(tmpstmpRaw) : null;
      if (tmpstmp && _.gt(tmpstmp, context.timestamp)) {
        result.push({
          valid: false,
          code: 20000,
          description: `Timestamp for ${constants.INIT} api cannot be greater than or equal to ${constants.ON_INIT} api`,
        });
      } else if (tmpstmp) {
        const timeDiff = timeDifference(context.timestamp, tmpstmp);
        console.info(timeDiff);
        if (timeDiff > 5000) {
          result.push({
            valid: false,
            code: 20000,
            description: `context/timestamp difference between /${constants.ON_INIT} and /${constants.INIT} should be less than 5 sec`,
          });
        }
      }
      await RedisService.setKey(
        `${transaction_id}_${ApiSequence.ON_INIT}_tmpstmp`,
        JSON.stringify(context.timestamp),
        TTL_IN_SECONDS
      );
    } catch (error: any) {
      console.error(`!!Error while comparing timestamp for /${constants.INIT} and /${constants.ON_INIT} api, ${error.stack}`);
    }

    // Compare message IDs
    try {
      console.info(`Comparing Message Ids of /${constants.INIT} and /${constants.ON_INIT}`);
      const msgIdRaw = await RedisService.getKey(`${transaction_id}_${ApiSequence.INIT}_msgId`);
      const msgId = msgIdRaw ? JSON.parse(msgIdRaw) : null;
      if (msgId && !_.isEqual(msgId, context.message_id)) {
        result.push({
          valid: false,
          code: 20000,
          description: `Message Ids for /${constants.INIT} and /${constants.ON_INIT} api should be same`,
        });
      }
    } catch (error: any) {
      console.error(`!!Error while checking message id for /${constants.ON_INIT}, ${error.stack}`);
    }

    const on_init = message.order;

    // Check cancellation terms
    try {
      console.info(`Checking Cancellation terms for /${constants.ON_INIT}`);
      if (on_init.cancellation_terms && on_init.cancellation_terms.length > 0) {
        result.push({
          valid: false,
          code: 20000,
          description: `'cancellation_terms' in /message/order should not be provided as those are not enabled yet`,
        });
      }
    } catch (error: any) {
      console.error(`!!Error while checking Cancellation terms for /${constants.ON_INIT}, ${error.stack}`);
    }

    // Check provider ID and location
    try {
      console.info(`Checking provider id and location in /${constants.ON_INIT}`);
      const providerIdRaw = await RedisService.getKey(`${transaction_id}_providerId`);
      const providerId = providerIdRaw ? JSON.parse(providerIdRaw) : null;
      if (providerId && on_init.provider.id !== providerId) {
        result.push({
          valid: false,
          code: 20000,
          description: `Provider Id mismatches in /${constants.ON_SEARCH} and /${constants.ON_INIT}`,
        });
      }

      const providerLocRaw = await RedisService.getKey(`${transaction_id}_providerLoc`);
      const providerLoc = providerLocRaw ? JSON.parse(providerLocRaw) : null;
      if (
        providerLoc &&
        on_init.provider.locations &&
        isArray(on_init.provider.locations) &&
        on_init.provider.locations.length > 0 &&
        on_init.provider.locations[0].id !== providerLoc
      ) {
        result.push({
          valid: false,
          code: 20000,
          description: `provider.locations[0].id mismatches in /${constants.ON_SEARCH} and /${constants.ON_INIT}`,
        });
      }
    } catch (error: any) {
      console.error(`!!Error while checking provider id and location in /${constants.ON_INIT}, ${error.stack}`);
    }

    // Validate tax numbers
    try {
      console.info(`Checking for tax_number for ${constants.ON_INIT}`);
      const bpp_terms_obj = on_init.tags?.find((item: any) => item?.code === "bpp_terms");
      const tags = bpp_terms_obj?.list || [];
      const accept_bap_terms = tags.filter((item: any) => item.code === "accept_bap_terms");
      const np_type_on_search = await RedisService.getKey(`${transaction_id}_${ApiSequence.ON_SEARCH}np_type`);

      let tax_number: any = {};
      let provider_tax_number: any = {};
      if (accept_bap_terms.length > 0) {
        result.push({
          valid: false,
          code: 20000,
          description: `accept_bap_terms is not required for now!`,
        });
      }

      tags.forEach((e: any) => {
        if (e.code === "tax_number") {
          if (!e.value) {
            console.error(`value must be present for tax_number in ${constants.ON_INIT}`);
            result.push({
              valid: false,
              code: 20000,
              description: `value must be present for tax_number in ${constants.ON_INIT}`,
            });
          } else {
            const taxNumberPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!taxNumberPattern.test(e.value)) {
              console.error(`Invalid format for tax_number in ${constants.ON_INIT}`);
              result.push({
                valid: false,
                code: 20000,
                description: `Invalid format for tax_number in ${constants.ON_INIT}`,
              });
            }
          }
          tax_number = e;
        }
        if (e.code === "provider_tax_number") {
          if (!e.value) {
            console.error(`value must be present for provider_tax_number in ${constants.ON_INIT}`);
            result.push({
              valid: false,
              code: 20000,
              description: `value must be present for provider_tax_number in ${constants.ON_INIT}`,
            });
          } else {
            const taxNumberPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (!taxNumberPattern.test(e.value)) {
              console.error(`Invalid format for provider_tax_number in ${constants.ON_INIT}`);
              result.push({
                valid: false,
                code: 20000,
                description: `Invalid format for provider_tax_number in ${constants.ON_INIT}`,
              });
            }
          }
          provider_tax_number = e;
        }
      });

      if (_.isEmpty(tax_number)) {
        console.error(`tax_number must be present in ${constants.ON_INIT}`);
        result.push({
          valid: false,
          code: 20000,
          description: `tax_number must be present for ${constants.ON_INIT}`,
        });
      }
      if (_.isEmpty(provider_tax_number)) {
        console.error(`provider_tax_number must be present in ${constants.ON_INIT}`);
        result.push({
          valid: false,
          code: 20000,
          description: `provider_tax_number must be present for ${constants.ON_INIT}`,
        });
      }

      if (
        tax_number.value?.length === 15 &&
        provider_tax_number?.value?.length === 10 &&
        np_type_on_search
      ) {
        const pan_id = tax_number.value.slice(2, 12);
        if (pan_id !== provider_tax_number.value && np_type_on_search === "ISN") {
          console.error(`Pan_id is different in tax_number and provider_tax_number in ${constants.ON_INIT}`);
          result.push({
            valid: false,
            code: 20000,
            description: `Pan_id is different in tax_number and provider_tax_number in message.order.tags[0].list`,
          });
        } else if (pan_id === provider_tax_number.value && np_type_on_search === "MSN") {
          console.error(`Pan_id shouldn't be same in tax_number and provider_tax_number in message.order.tags[0].list`);
          result.push({
            valid: false,
            code: 20000,
            description: `Pan_id shouldn't be same in tax_number and provider_tax_number in message.order.tags[0].list`,
          });
        }
      }
    } catch (error: any) {
      console.error(`!!Error while checking tax numbers in /${constants.ON_INIT}, ${error.stack}`);
      result.push({
        valid: false,
        code: 20000,
        description: `Failed to validate tax numbers in /${constants.ON_INIT}`,
      });
    }

    // Consolidated tags validation
    try {
      console.info(`Validating tags in /${constants.ON_INIT}`);
      if (on_init.tags && isArray(on_init.tags)) {
        await RedisService.setKey(
          `${transaction_id}_bpp_tags`,
          JSON.stringify(on_init.tags),
          TTL_IN_SECONDS
        );

        const bppTermsTag = on_init.tags.find((tag: any) => tag.code === "bpp_terms");
        if (bppTermsTag) {
          await RedisService.setKey(
            `${transaction_id}_list_ON_INIT`,
            JSON.stringify(bppTermsTag.list),
            TTL_IN_SECONDS
          );
        }

        const isValid = isTagsValid(on_init.tags, "bpp_terms");
        if (!isValid) {
          result.push({
            valid: false,
            code: 20000,
            description: `Tags should have valid gst number and fields in /${constants.ON_INIT}`,
          });
        }

        for (const tag of on_init.tags) {
          if (tag.code === "bap_terms") {
            const hasStaticTerms = tag.list.some((item: { code: string }) => item.code === "static_terms");
            if (hasStaticTerms) {
              result.push({
                valid: false,
                code: 20000,
                description: `static_terms is not required for now! in ${constants.ON_INIT}`,
              });
            }
          }

          const providerTaxNumber = tag.list?.find((item: any) => item.code === "provider_tax_number");
          if (providerTaxNumber) {
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (!panRegex.test(providerTaxNumber.value)) {
              result.push({
                valid: false,
                code: 20000,
                description: `'provider_tax_number' should have a valid PAN number format`,
              });
            }
          }
        }

        await RedisService.setKey(
          `${transaction_id}_on_init_tags`,
          JSON.stringify(on_init.tags),
          TTL_IN_SECONDS
        );
      }
    } catch (error: any) {
      console.error(`!!Error while validating tags in /${constants.ON_INIT}, ${error.stack}`);
    }

    // Compare item and fulfillment IDs
   // Compare item and fulfillment IDs
try {
  console.info(`Comparing item Ids and fulfillment Ids in /${constants.ON_SELECT} and /${constants.ON_INIT}`);
  const itemFlfllmntsRaw = await RedisService.getKey(`${transaction_id}_itemFlfllmnts`);
  const itemFlfllmnts = itemFlfllmntsRaw ? JSON.parse(itemFlfllmntsRaw) : null;
  const itemsIdListRaw = await RedisService.getKey(`${transaction_id}_itemsIdList`);
  const itemsIdList = itemsIdListRaw ? JSON.parse(itemsIdListRaw) : null;
  const fulfillmentIdArrayRaw = await RedisService.getKey(
    `${transaction_id}_fulfillmentIdArray`
  );
  const fulfillmentIdArray = fulfillmentIdArrayRaw
    ? JSON.parse(fulfillmentIdArrayRaw)
    : null;

  for (let i = 0; i < (on_init.items?.length || 0); i++) {
    const itemId: any = on_init.items[i].id;
    const item = on_init.items[i];

    if (select_customIdArray && checkItemTag(item, select_customIdArray)) {
      result.push({
        valid: false,
        code: 20000,
        description: `items[${i}].tags.parent_id mismatches for Item ${itemId} in /${constants.SELECT} and /${constants.ON_INIT}`,
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
        description: `items[${i}].parent_item_id mismatches for Item ${itemId} in /${constants.ON_SEARCH} and /${constants.ON_INIT}`,
      });
    }

    if (itemFlfllmnts && fulfillmentIdArray && (itemId in fulfillmentIdArray) || (itemId in itemFlfllmnts)) {
      if (!fulfillmentIdArray.includes(on_init.items[i].fulfillment_id) && !itemFlfllmnts[itemId]) {
        result.push({
          valid: false,
          code: 20000,
          description: `items[${i}].fulfillment_id mismatches for Item ${itemId} in /${constants.ON_SELECT} and /${constants.ON_INIT}`,
        });
      }
    } 
    else {
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
          description: `items[${i}].quantity.count is missing or undefined for Item ${itemId} in /${constants.ON_INIT}`,
        });
      } else if (item.quantity.count !== itemsIdList[itemId]) {
        result.push({
          valid: false,
          code: 20000,
          description: `Warning: items[${i}].quantity.count for item ${itemId} mismatches with the items quantity selected in /${constants.SELECT}`,
        });
      }
    }
  }
} catch (error: any) {
  console.error(
    `!!Error while comparing Item and Fulfillment Id in /${constants.ON_SELECT} and /${constants.ON_INIT}, ${error.stack}`
  );
}

    // Validate fulfillments (GPS and Area Code)
    try {
      console.info(`Validating fulfillments`);
      const buyerGpsRaw = await RedisService.getKey(`${transaction_id}_buyerGps`);
      const buyerGps = buyerGpsRaw ? JSON.parse(buyerGpsRaw) : null;
      const buyerAddrRaw = await RedisService.getKey(`${transaction_id}_buyerAddr`);
      const buyerAddr = buyerAddrRaw ? JSON.parse(buyerAddrRaw) : null;

      on_init?.fulfillments?.forEach((fulfillment: any, index: number) => {
        const { type } = fulfillment;
        if (type !== "Delivery") {
          result.push({
            valid: false,
            code: 20000,
            description: `Fulfillment type should be 'Delivery' (case-sensitive)`,
          });
        } else if (fulfillment.tags && fulfillment.tags.length > 0) {
          result.push({
            valid: false,
            code: 20000,
            description: `/message/order/fulfillment of type 'Delivery' should not have tags`,
          });
        }

        const gps = fulfillment.end?.location?.gps;
        if (gps == null || gps === "") {
          console.info(`Missing gps coordinates for fulfillment at index ${index} in /${constants.ON_INIT}`);
          result.push({
            valid: false,
            code: 20000,
            description: `fulfillments[${index}].end.location.gps is missing or empty in /${constants.ON_INIT}`,
          });
        } else if (buyerGps && !_.isEqual(gps, buyerGps)) {
          console.info(`GPS coordinates mismatch for fulfillment at index ${index} in /${constants.ON_INIT}`);
          result.push({
            valid: false,
            code: 20000,
            description: `gps coordinates in fulfillments[${index}].end.location mismatch in /${constants.ON_SELECT} & /${constants.ON_INIT}`,
          });
        }

        const areaCode = fulfillment.end?.location?.address?.area_code;
        if (areaCode == null || areaCode === "") {
          console.info(`Missing area_code for fulfillment at index ${index} in /${constants.ON_INIT}`);
          result.push({
            valid: false,
            code: 20000,
            description: `fulfillments[${index}].end.location.address.area_code is missing or empty in /${constants.ON_INIT}`,
          });
        } else if (buyerAddr && !_.isEqual(areaCode, buyerAddr)) {
          console.info(`Area code mismatch for fulfillment at index ${index} in /${constants.ON_INIT}`);
          result.push({
            valid: false,
            code: 20000,
            description: `address.area_code in fulfillments[${index}].end.location mismatch in /${constants.ON_SELECT} & /${constants.ON_INIT}`,
          });
        }
      });
    } catch (error: any) {
      console.error(`!!Error while validating fulfillments, ${error.stack}`);
    }

    // Check fulfillment IDs, types, and tracking
    try {
      console.info("Checking fulfillment.id, fulfillment.type and tracking");
      for (const ff of on_init.fulfillments || []) {
        if (!ff.id) {
          console.info(`Fulfillment Id must be present`);
          result.push({
            valid: false,
            code: 20000,
            description: `Fulfillment Id must be present`,
          });
          continue;
        }

        const trackingRaw = await RedisService.getKey(`${transaction_id}_${ff.id}_tracking`);
        const tracking = trackingRaw ? JSON.parse(trackingRaw) : null;
        if (tracking != null) {
          if (ff.tracking === false || ff.tracking === true) {
            if (tracking !== ff.tracking) {
              console.info(`Fulfillment Tracking mismatch with the ${constants.ON_SELECT} call`);
              result.push({
                valid: false,
                code: 20000,
                description: `Fulfillment Tracking mismatch with the ${constants.ON_SELECT} call`,
              });
            }
          } else {
            console.info(`Tracking must be present for fulfillment ID: ${ff.id} in boolean form`);
            result.push({
              valid: false,
              code: 20000,
              description: `Tracking must be present for fulfillment ID: ${ff.id} in boolean form`,
            });
          }
        }
      }
    } catch (error: any) {
      console.error(`!!Error while checking fulfillments id, type and tracking in /${constants.ON_INIT}, ${error.stack}`);
    }

    try {
      const fulfillment = on_init.fulfillments[0];
      if (fulfillment?.type === "Buyer-Delivery") {
        on_init.items.forEach((item: any, index: any) => {
          const itemPath = `order.items[${index}]`;

          const rtoTag = item.tags?.find(
            (tag: any) => tag.code === "rto_action"
          );

          if (!rtoTag) {
            result.push({
              valid: false,
              code: 20011,
              description: `'rto_action' tag is missing in ${itemPath}`,
            });
          } else {
            const returnToOrigin = rtoTag.list?.find(
              (i: any) => i.code === "return_to_origin"
            );

            if (
              !returnToOrigin ||
              returnToOrigin.value?.toLowerCase() !== "yes"
            ) {
              result.push({
                valid: false,
                code: 20012,
                description: `'return_to_origin' must be 'yes' in 'rto_action' tag of ${itemPath}`,
              });
            }
          }
        });

        const orderDetailsTag = fulfillment.tags?.find(
          (tag: any) => tag.code === "order_details"
        );
        if (!orderDetailsTag) {
          result.push({
            valid: false,
            code: 20007,
            description: `Missing 'order_details' tag in fulfillments when fulfillment.type is 'Buyer-Delivery'`,
          });
        } else {
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

          const rtoTag = fulfillment.tags?.find(
            (tag: any) => tag.code === "rto_action"
          );

          if (!rtoTag) {
            result.push({
              valid: false,
              code: 20009,
              description: `'rto_action' tag is missing in fulfillments for Buyer-Delivery fulfillment`,
            });
          } else {
            const returnToOrigin = rtoTag.list?.find(
              (i: any) => i.code === "return_to_origin"
            );

            if (
              !returnToOrigin ||
              returnToOrigin.value?.toLowerCase() !== "yes"
            ) {
              result.push({
                valid: false,
                code: 20010,
                description: `'return_to_origin' must be set to 'yes' in 'rto_action' tag in fulfillments`,
              });
            }
          }
        }
      }
    } catch (error: any) {
      `Error while checking fulfillments type for buyer delivery/${constants.ON_INIT}`;
    }

    try {
      const fulfillment = on_init.fulfillments[0];
      if (fulfillment?.type === "Buyer-Delivery") {
        on_init.items.forEach((item: any, index: any) => {
          const itemPath = `order.items[${index}]`;

          const rtoTag = item.tags?.find(
            (tag: any) => tag.code === "rto_action"
          );

          if (!rtoTag) {
            result.push({
              valid: false,
              code: 20011,
              description: `'rto_action' tag is missing in ${itemPath}`,
            });
          } else {
            const returnToOrigin = rtoTag.list?.find(
              (i: any) => i.code === "return_to_origin"
            );

            if (
              !returnToOrigin ||
              returnToOrigin.value?.toLowerCase() !== "yes"
            ) {
              result.push({
                valid: false,
                code: 20012,
                description: `'return_to_origin' must be 'yes' in 'rto_action' tag of ${itemPath}`,
              });
            }
          }
        });

        const orderDetailsTag = fulfillment.tags?.find(
          (tag: any) => tag.code === "order_details"
        );
        if (!orderDetailsTag) {
          result.push({
            valid: false,
            code: 20007,
            description: `Missing 'order_details' tag in fulfillments when fulfillment.type is 'Buyer-Delivery'`,
          });
        } else {
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

          const rtoTag = fulfillment.tags?.find(
            (tag: any) => tag.code === "rto_action"
          );

          if (!rtoTag) {
            result.push({
              valid: false,
              code: 20009,
              description: `'rto_action' tag is missing in fulfillments for Buyer-Delivery fulfillment`,
            });
          } else {
            const returnToOrigin = rtoTag.list?.find(
              (i: any) => i.code === "return_to_origin"
            );

            if (
              !returnToOrigin ||
              returnToOrigin.value?.toLowerCase() !== "yes"
            ) {
              result.push({
                valid: false,
                code: 20010,
                description: `'return_to_origin' must be set to 'yes' in 'rto_action' tag in fulfillments`,
              });
            }
          }
        }
      }
    } catch (error: any) {
      `Error while checking fulfillments type for buyer delivery/${constants.ON_INIT}`;
    }

    // Compare billing object
    try {
      console.info(`Comparing billing object in /${constants.INIT} and /${constants.ON_INIT}`);
      const billingRaw = await RedisService.getKey(`${transaction_id}_billing`);
      const billing = billingRaw ? JSON.parse(billingRaw) : null;

      if (billing) {
        const billingErrors = compareObjects(billing, on_init.billing);
        if (billingErrors) {
          for (const error of billingErrors) {
            result.push({
              valid: false,
              code: 20000,
              description: `${error} when compared with init billing object`,
            });
          }
        }
      }
    } catch (error: any) {
      console.error(`!!Error while comparing billing object in /${constants.INIT} and /${constants.ON_INIT}, ${error.stack}`);
    }

    // Check fulfillment objects
    try {

      console.info(`Checking fulfillments objects in /${constants.ON_INIT}`);
      const fulfillmentIdArrayRaw = await RedisService.getKey(
        `${transaction_id}_fulfillmentIdArray`
      );
      const fulfillmentIdArray = fulfillmentIdArrayRaw
        ? JSON.parse(fulfillmentIdArrayRaw)
        : null;
      const itemFlfllmntsRaw = await RedisService.getKey(`${transaction_id}_itemFlfllmnts`);
      const itemFlfllmnts = itemFlfllmntsRaw ? JSON.parse(itemFlfllmntsRaw) : null;

      for (let i = 0; i < (on_init.fulfillments?.length || 0); i++) {
        if (on_init.fulfillments[i].id) {
          const id = on_init.fulfillments[i].id;
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
            description: `fulfillments.id is missing in /${constants.ON_INIT}`,
          });
        }
      }
    } catch (error: any) {
      console.error(`!!Error while checking fulfillments object in /${constants.ON_INIT}, ${error.stack}`);
    }

    // Validate item tags and parent_item_id
    try {
      console.info(`Validating item tags and parent_item_id in /${constants.ON_INIT}`);
      const items = on_init.items || [];
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        let isItemType = false;
        let isCustomizationType = false;

        if (item.tags) {
          const typeTag = item.tags.find((tag: any) => tag.code === "type");
          if (typeTag && typeTag.list) {
            const typeValue = typeTag.list.find((listItem: any) => listItem.code === "type")?.value;
            isItemType = typeValue === "item";
            isCustomizationType = typeValue === "customization";
          }
        }

        if ((isItemType || isCustomizationType) && !item.parent_item_id) {
          console.info(`Missing parent_item_id for item with ID: ${item.id || "undefined"} at index ${index}`);
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
            console.info(`Missing parent tag for customization item with ID: ${item.id || "undefined"} at index ${index}`);
            result.push({
              valid: false,
              code: 20000,
              description: `items[${index}]: customization items must have a parent tag`,
            });
          } else {
            const parentId = parentTag.list.find((listItem: any) => listItem.code === "id")?.value;
            if (parentId && checkItemTag(item, select_customIdArray)) {
              console.info(
                `Invalid parent tag id: ${parentId} for customization item with ID: ${item.id || "undefined"} at index ${index}`
              );
              result.push({
                valid: false,
                code: 20000,
                description: `items[${index}]: parent tag id ${parentId} must be in select_customIdArray for customization items`,
              });
            }
          }
        }
      }
    } catch (error: any) {
      console.error(`!!Error while checking parent_item_id and type tags in /${constants.ON_INIT}, ${error.stack}`);
    }

    // Check quote and payment
    try {
      console.info(`Checking Quote and Payment for /${constants.ON_INIT}`);
      let initQuotePrice = 0;
      let initBreakupPrice = 0;

      on_init.quote.breakup.forEach((element: { price: { value: string } }) => {
        initBreakupPrice += parseFloat(element.price.value);
      });
      console.info(`/${constants.ON_INIT} Price Breakup: ${initBreakupPrice}`);

      initQuotePrice = parseFloat(on_init.quote.price.value);
      await RedisService.setKey(
        `${transaction_id}_initQuotePrice`,
        JSON.stringify(initQuotePrice),
        TTL_IN_SECONDS
      );
      console.info(`/${constants.ON_INIT} Quoted Price: ${initQuotePrice}`);

      if (Math.round(initQuotePrice) !== Math.round(initBreakupPrice)) {
        console.info(`Quoted Price in /${constants.ON_INIT} is not equal to the Net Breakup Price`);
        result.push({
          valid: false,
          code: 20000,
          description: `Quoted Price ${initQuotePrice} does not match with Net Breakup Price ${initBreakupPrice} in /${constants.ON_INIT}`,
        });
      }

      const onSelectPriceRaw = await RedisService.getKey(`${transaction_id}_onSelectPrice`);
      const onSelectPrice = onSelectPriceRaw ? JSON.parse(onSelectPriceRaw) : null;
      if (onSelectPrice && Math.round(onSelectPrice) !== Math.round(initQuotePrice)) {
        console.info(`Quoted Price in /${constants.ON_INIT} is not equal to the quoted price in /${constants.ON_SELECT}`);
        result.push({
          valid: false,
          code: 20000,
          description: `Quoted Price in /${constants.ON_INIT} INR ${initQuotePrice} does not match with the quoted price in /${constants.ON_SELECT} INR ${onSelectPrice}`,
        });
      }

      if (!on_init.payment) {
        result.push({
          valid: false,
          code: 20000,
          description: `Payment Object can't be null in /${constants.ON_INIT}`,
        });
      }
    } catch (error: any) {
      console.error(`!!Error while checking /${constants.ON_INIT} Quoted Price and Net Price Breakup, ${error.stack}`);
    }

    // Check buyer app finder fee
    try {
      console.info(`Checking Buyer App finder fee amount in /${constants.ON_INIT}`);
      const buyerFFRaw = await RedisService.getKey(`${transaction_id}_${ApiSequence.SEARCH}_buyerFF`);
      const buyerFF = buyerFFRaw ? JSON.parse(buyerFFRaw) : null;
      if (
        !on_init.payment["@ondc/org/buyer_app_finder_fee_amount"] ||
        parseFloat(on_init.payment["@ondc/org/buyer_app_finder_fee_amount"]) !== buyerFF
      ) {
        result.push({
          valid: false,
          code: 20000,
          description: `Buyer app finder fee can't change in /${constants.ON_INIT}`,
        });
      }
    } catch (error: any) {
      console.error(`!!Error while checking buyer app finder fee in /${constants.ON_INIT}, ${error.stack}`);
    }

    // Check settlement basis
    try {
      console.info(`Checking Settlement basis in /${constants.ON_INIT}`);
      const validSettlementBasis = ["delivery", "shipment"];
      const settlementBasis = on_init.payment["@ondc/org/settlement_basis"];
      if (!validSettlementBasis.includes(settlementBasis)) {
        result.push({
          valid: false,
          code: 20000,
          description: `Invalid settlement basis in /${constants.ON_INIT}. Expected one of: ${validSettlementBasis.join(", ")}`,
        });
      }
    } catch (error: any) {
      console.error(`!!Error while checking settlement basis in /${constants.ON_INIT}, ${error.stack}`);
    }

    // Check settlement window
    try {
      console.info(`Checking Settlement Window in /${constants.ON_INIT}`);
      const settlementWindow = on_init.payment["@ondc/org/settlement_window"];
      if (!/^P(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/.test(settlementWindow)) {
        result.push({
          valid: false,
          code: 20000,
          description: `Invalid settlement window in /${constants.ON_INIT}. Expected format: PTd+[MH] (e.g., PT1H, PT30M)`,
        });
      }
    } catch (error: any) {
      console.error(`!!Error while checking settlement window in /${constants.ON_INIT}, ${error.stack}`);
    }

    // Check payment details
    try {
      console.info(`Checking payment object in /${constants.ON_INIT}`);
      const settlementDetails = on_init.payment["@ondc/org/settlement_details"]?.[0];
      if (!settlementDetails) {
        result.push({
          valid: false,
          code: 20000,
          description: `settlement_details missing in /${constants.ON_INIT}`,
        });
      } else {
        if (settlementDetails.settlement_counterparty !== "seller-app") {
          result.push({
            valid: false,
            code: 20000,
            description: `settlement_counterparty is expected to be 'seller-app' in @ondc/org/settlement_details`,
          });
        }

        const { settlement_type } = settlementDetails;
        if (!["neft", "rtgs", "upi"].includes(settlement_type)) {
          console.error(
            `settlement_type is expected to be 'neft/rtgs/upi' in @ondc/org/settlement_details in /${constants.ON_INIT}`
          );
          result.push({
            valid: false,
            code: 20000,
            description: `settlement_type is expected to be 'neft/rtgs/upi' in @ondc/org/settlement_details`,
          });
        } else if (settlement_type !== "upi") {
          const missingFields = [];
          if (!settlementDetails.bank_name) missingFields.push("bank_name");
          if (!settlementDetails.branch_name) missingFields.push("branch_name");
          if (!settlementDetails.beneficiary_name || settlementDetails.beneficiary_name.trim() === "") {
            missingFields.push("beneficiary_name");
          }
          if (!settlementDetails.settlement_phase) missingFields.push("settlement_phase");
          if (!settlementDetails.settlement_ifsc_code) missingFields.push("settlement_ifsc_code");
          if (!settlementDetails.settlement_counterparty) missingFields.push("settlement_counterparty");
          if (!settlementDetails.settlement_bank_account_no || settlementDetails.settlement_bank_account_no.trim() === "") {
            missingFields.push("settlement_bank_account_no");
          }

          if (missingFields.length > 0) {
            console.error(`Payment details are missing: ${missingFields.join(", ")} /${constants.ON_INIT}`);
            result.push({
              valid: false,
              code: 20000,
              description: `Payment details are missing: ${missingFields.join(", ")}/${constants.ON_INIT}`,
            });
          }
        } else if (!settlementDetails.upi_address || settlementDetails.upi_address.trim() === "") {
          console.error(`Payment details are missing /${constants.ON_INIT}`);
          result.push({
            valid: false,
            code: 20000,
            description: `Payment details are missing/${constants.ON_INIT}`,
          });
        }

        await RedisService.setKey(
          `${transaction_id}_sttlmntdtls`,
          JSON.stringify(settlementDetails),
          TTL_IN_SECONDS
        );
      }
    } catch (error: any) {
      console.error(`!!Error while checking payment object in /${constants.ON_INIT}, ${error.stack}`);
    }

    // Check quote object
    try {
      console.info(`Checking Quote Object in /${constants.ON_SELECT} and /${constants.ON_INIT}`);
      const on_select_quoteRaw = await RedisService.getKey(`${transaction_id}_quoteObj`);
      const on_select_quote = on_select_quoteRaw ? JSON.parse(on_select_quoteRaw) : null;

      if (on_select_quote) {
        console.log("quoteDiff", JSON.stringify(on_select_quote), JSON.stringify(on_init.quote));
        const quoteErrors = compareQuoteObjects(on_select_quote, on_init.quote, constants.ON_SELECT, constants.ON_INIT);
        if (quoteErrors) {
          for (const error of quoteErrors) {
            result.push({
              valid: false,
              code: 20000,
              description: `${error}`,
            });
          }
        }
      }

      const hasItemWithQuantity = _.some(on_init.quote.breakup, (item) => _.has(item, "item.quantity"));
      if (hasItemWithQuantity) {
        result.push({
          valid: false,
          code: 20000,
          description: `Extra attribute Quantity provided in quote object i.e not supposed to be provided after on_select so invalid quote object`,
        });
      }
    } catch (error: any) {
      console.error(`!!Error while checking quote object in /${constants.ON_SELECT} and /${constants.ON_INIT}, ${error.stack}`);
    }

    // Check transaction_id and payment status
    try {
      console.info(`Checking if transaction_id is present in message.order.payment`);
      const payment = on_init.payment;
      const status = payment_status(payment, flow);
      if (!status) {
        result.push({
          valid: false,
          code: 20000,
          description: `Transaction_id missing in message/order/payment`,
        });
      } else if (status.message) {
        console.error(status.message);
        result.push({
          valid: false,
          code: 20000,
          description: status.message,
        });
      } else {
        console.info("Payment status is valid.");
      }
    } catch (error: any) {
      console.error(`!!Error while handling payment status in /${constants.ON_INIT}, ${error.stack}`);
      result.push({
        valid: false,
        code: 20000,
        description: "Payment status cannot be paid (COD flow)",
      });
    }

    return result;
  } catch (error: any) {
    console.error(`!!Some error occurred while checking /${constants.ON_INIT} API, ${error.stack}`);
    result.push({
      valid: false,
      code: 20000,
      description: `Unexpected error in /${constants.ON_INIT}`,
    });
    return result;
  }
};

export default onInit;