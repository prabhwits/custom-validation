
import { RedisService } from "ondc-automation-cache-lib";


import { contextChecker } from "../../../../utils/contextUtils";
import { checkItemTag, compareObjects, getRedisValue, tagFinder } from "../../../../utils/helper";
import constants, { ApiSequence } from "../../../../utils/constants";
import _ from "lodash";
const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;

const addError = (result: any[], code: number, description: string): void => {
  result.push({
    valid: false,
    code,
    description,
  });
};

// Store billing object
const storeBilling = async (txnId: string, billing: any, result: any[]): Promise<void> => {
  try {
    await RedisService.setKey(`${txnId}_billing`, JSON.stringify(billing), TTL_IN_SECONDS);
  } catch (err: any) {
    addError(result, 20001, `Error storing billing: ${err.message}`);
  }
};

// Store applicable offers
const storeApplicableOffers = async (txnId: string, offers: any[], result: any[]): Promise<void> => {
  try {
    await RedisService.setKey(
      `${txnId}_${ApiSequence.INIT}_offers`,
      JSON.stringify(offers),
      TTL_IN_SECONDS
    );
  } catch (err: any) {
    addError(result, 20002, `Error storing applicable offers: ${err.message}`);
  }
};

// Validate provider details
const validateProvider = async (txnId: string, provider: any, result: any[]): Promise<void> => {
  try {
    const providerId = await getRedisValue(`${txnId}_providerId`)
    if (providerId !== provider.id) {
      addError(result, 20003, `Provider Id mismatches in /${constants.SELECT} and /${constants.INIT}`);
    }

    const providerLoc = await getRedisValue(`${txnId}_providerLoc`)
    const locationId = provider.locations?.[0]?.id;
    if (providerLoc !== locationId) {
      addError(result, 20004, `Provider.locations[0].id mismatches in /${constants.SELECT} and /${constants.INIT}`);
    }
  } catch (err: any) {
    addError(result, 20005, `Error validating provider: ${err.message}`);
  }
};

// Validate billing timestamps and comparison
const validateBilling = async (txnId: string, billing: any, context: any, result: any[]): Promise<void> => {
  try {
    const contextTime = new Date(context.timestamp).getTime();

    if (billing.created_at) {
      const billingTime = new Date(billing.created_at).getTime();
      if (isNaN(billingTime) || billingTime > contextTime) {
        addError(result, 20006, `billing.created_at should not be greater than context.timestamp in /${constants.INIT}`);
      }
    }

    if (billing.updated_at) {
      const billingTime = new Date(billing.updated_at).getTime();
      if (isNaN(billingTime) || billingTime > contextTime) {
        addError(result, 20007, `billing.updated_at should not be greater than context.timestamp in /${constants.INIT}`);
      }
    }

    if (billing.created_at && billing.updated_at && new Date(billing.updated_at) < new Date(billing.created_at)) {
      addError(result, 20008, `billing.updated_at cannot be less than billing.created_at in /${constants.INIT}`);
    }

    const selectBilling = await getRedisValue(`${txnId}_billing_select`)
    if (selectBilling) {
      const billingErrors = compareObjects(selectBilling, billing);
      billingErrors?.forEach((error: string) => {
        addError(result, 20009, `billing: ${error} when compared with /${constants.SELECT} billing object`);
      });
    }
  } catch (err: any) {
    addError(result, 20010, `Error validating billing: ${err.message}`);
  }
};

// Validate items (IDs, quantities, parent_item_id, location_id)
const validateItems = async (txnId: string, items: any[], context: any, result: any[]): Promise<void> => {
  try {
    const itemsIdList =await getRedisValue(`${txnId}_itemsIdList`)
    const fulfillmentIdArray =await getRedisValue(`${txnId}_fulfillmentIdArray`)
    const parentItemIdSet =await getRedisValue(`${txnId}_parentItemIdSet`)
    const selectCustomIdArray =await getRedisValue(`${txnId}_select_customIdArray`)
    const onSearchItems =await getRedisValue(`${txnId}_onSearchItems`)

    items.forEach((item: any, i: number) => {
      const itemId = item.id;

      // Validate item ID existence
      if (!(itemId in itemsIdList)) {
        addError(result, 20011, `Item not found - Item Id ${itemId} does not exist in /${constants.ON_SELECT}`);
      }

      // Validate fulfillment ID
      if (!fulfillmentIdArray?.includes(item.fulfillment_id)) {
        addError(result, 20012, `items[${i}].fulfillment_id mismatches for Item ${itemId} in /${constants.ON_SELECT} and /${constants.INIT}`);
      }

      // Validate quantity
      if (itemId in itemsIdList && item.quantity.count !== itemsIdList[itemId]) {
        addError(result, 20013, `Warning: items[${i}].quantity.count for item ${itemId} mismatches with /${constants.SELECT}`);
      }

      // Validate parent_item_id
      if (parentItemIdSet && item.parent_item_id && !parentItemIdSet.includes(item.parent_item_id)) {
        addError(result, 20014, `items[${i}].parent_item_id mismatches for Item ${itemId} in /${constants.ON_SEARCH} and /${constants.INIT}`);
      }

    

        const matchingItem = onSearchItems.find((it: any) => it.id === itemId && !tagFinder(it, "customization"));
        if (matchingItem && matchingItem.location_id !== item.location_id) {
          addError(result, 20017, `items[${i}]: location_id for item ${itemId} must match /${constants.ON_SEARCH}`);
        }
      

      // Validate type and parent_item_id
      const typeTag = item.tags?.find((tag: any) => tag.code === "type");
      const typeValue = typeTag?.list?.find((listItem: any) => listItem.code === "type")?.value;
      const isItemType = typeValue === "item";
      const isCustomizationType = typeValue === "customization";

      if ((isItemType || isCustomizationType) && !item.parent_item_id) {
        addError(result, 20018, `items[${i}]: parent_item_id required for type 'item' or 'customization'`);
      }

      if (item.parent_item_id && !(isItemType || isCustomizationType)) {
        addError(result, 20019, `items[${i}]: items with parent_item_id must have type 'item' or 'customization'`);
      }

      if (isCustomizationType) {
        const parentTag = item.tags?.find((tag: any) => tag.code === "parent");
        if (!parentTag) {
          addError(result, 20020, `items[${i}]: customization items must have a parent tag`);
        } else {
          const parentId = parentTag.list?.find((listItem: any) => listItem.code === "id")?.value;
          if (parentId && checkItemTag(item, selectCustomIdArray)) {
            addError(result, 20021, `items[${i}]: parent tag id ${parentId} must be in select_customIdArray`);
          }
        }
      }
    });
  } catch (err: any) {
    addError(result, 20022, `Error validating items: ${err.message}`);
  }
};

// Validate fulfillments (IDs, GPS, area_code)
const validateFulfillments = async (txnId: string, fulfillments: any[], result: any[]): Promise<void> => {
  try {
    const fulfillmentIdArray = await getRedisValue(`${txnId}_fulfillmentIdArray`)
    const buyerGps = await getRedisValue(`${txnId}_buyerGps`)
    const buyerAddr = await getRedisValue(`${txnId}_buyerAddr`)

    fulfillments.forEach((fulfillment: any, i: number) => {
      const id = fulfillment.id;
     if (!fulfillmentIdArray?.includes(id)) {
        addError(result, 20024, `fulfillment id ${id} does not exist in /${constants.ON_SELECT}`);
      }

      const gps = fulfillment.end?.location?.gps;
      if (buyerGps && !_.isEqual(gps, buyerGps)) {
        console.log(
            `buyerGps: ${buyerGps}, gps: ${gps}`
        );
        addError(result, 20026, `gps coordinates in fulfillments[${i}].end.location mismatch in /${constants.SELECT} & /${constants.INIT}`);
      }

      const areaCode = fulfillment.end?.location?.address?.area_code;
       if (buyerAddr && !_.isEqual(areaCode, buyerAddr)) {
        addError(result, 20028, `address.area_code in fulfillments[${i}].end.location mismatch in /${constants.SELECT} & /${constants.INIT}`);
      }

      const address = fulfillment.end?.location?.address;
      if (address) {
        const lenName = address.name?.length || 0;
        const lenBuilding = address.building?.length || 0;
        const lenLocality = address.locality?.length || 0;

        if (lenName + lenBuilding + lenLocality >= 190) {
          addError(result, 20029, `address.name + address.building + address.locality should be < 190 chars`);
        }

        if (lenBuilding <= 3) {
          addError(result, 20030, `address.building should be > 3 chars`);
        }
        if (lenName <= 3) {
          addError(result, 20031, `address.name should be > 3 chars`);
        }
        if (lenLocality <= 3) {
          addError(result, 20032, `address.locality should be > 3 chars`);
        }

        if (
          address.building === address.locality ||
          address.name === address.building ||
          address.name === address.locality
        ) {
          addError(result, 20033, `address.name, address.building, and address.locality should be unique`);
        }
      }
    });
  } catch (err: any) {
    addError(result, 20034, `Error validating fulfillments: ${err.message}`);
  }
};

// // Validate offers
// const validateOffers = async (txnId: string, order: any, context: any, result: any[]): Promise<any[]> => {
//   const applicableOffers: any[] = [];
//   try {
//     const providerOffers = await RedisService.getKey(`${txnId}_${ApiSequence.ON_SEARCH}_offers`).then(JSON.parse);
//     const selectOffers = await RedisService.getKey(`${txnId}_selected_offers`).then(JSON.parse);
//     const onSelectOffers = await RedisService.getKey(`${txnId}_on_select_offers`).then(JSON.parse);
//     const orderItemIds = order.items?.map((item: any) => item.id) || [];
//     const orderLocationIds = order.provider?.locations?.map((item: any) => item.id) || [];
//     const initOfferIds = order.offers?.map((offer: any) => offer.id.toLowerCase()) || [];

//     // Compare with select offers
//     if (selectOffers && !initOfferIds.length) {
//       addError(result, 20035, `Offers required in init when present in select`);
//     } else if (selectOffers && initOfferIds.length) {
//       selectOffers.forEach((offer: any) => {
//         const offerTagId = offer?.id;
//         if (offerTagId && !initOfferIds.includes(offerTagId)) {
//           addError(result, 20036, `Offer Id ${offerTagId} mismatched in /${constants.SELECT} and /${constants.INIT}`);
//         }
//       });
//     }

//     // Validate offers
//     if (order.offers?.length) {
//       order.offers.forEach((offer: any, index: number) => {
//         const providerOffer = providerOffers?.find(
//           (p: any) => p.id.toLowerCase() === offer.id.toLowerCase()
//         );
//         if (!providerOffer) {
//           addError(result, 20037, `Offer with id ${offer.id} is not available for the provider`);
//           return;
//         }

//         const offerLocationIds = providerOffer.location_ids || [];
//         if (!offerLocationIds.some((id: string) => orderLocationIds.includes(id))) {
//           addError(result, 20038, `Offer ${offer.id} not applicable for order locations [${orderLocationIds.join(", ")}]`);
//         }

//         const offerItemIds = providerOffer.item_ids || [];
//         if (!offerItemIds.some((id: string) => orderItemIds.includes(id))) {
//           addError(result, 20039, `Offer ${offer.id} not applicable for ordered items [${orderItemIds.join(", ")}]`);
//         }

//         const { label, range } = providerOffer.time || {};
//         const start = range?.start;
//         const end = range?.end;
//         if (label !== "valid" || !start || !end) {
//           addError(result, 20040, `Offer ${offer.id} has invalid or missing time configuration`);
//         } else {
//           const currentTime = new Date(context.timestamp);
//           const startTime = new Date(start);
//           const endTime = new Date(end);
//           if (!(currentTime >= startTime && currentTime <= endTime)) {
//             addError(result, 20041, `Offer ${offer.id} is not currently valid based on time range`);
//           }
//         }

//         const isSelected = offer.tags?.some(
//           (tag: any) =>
//             tag.code === "selection" &&
//             tag.list?.some((entry: any) => entry.code === "apply" && entry.value === "yes")
//         );
//         if (!isSelected) {
//           addError(result, 20042, `Offer ${offer.id} is not selected (apply: "yes" missing)`);
//         }

//         applicableOffers.push({ ...providerOffer, index });
//       });

//       // Validate additive/non-additive offers
//       const additiveOffers = applicableOffers.filter((offer) =>
//         offer.tags?.find((tag: any) => tag.code === "meta")?.list?.some(
//           (entry: any) => entry.code === "additive" && entry.value.toLowerCase() === "yes"
//         )
//       );
//       const nonAdditiveOffers = applicableOffers.filter((offer) =>
//         offer.tags?.find((tag: any) => tag.code === "meta")?.list?.some(
//           (entry: any) => entry.code === "additive" && entry.value.toLowerCase() === "no"
//         )
//       );

//       if (additiveOffers.length > 0) {
//         applicableOffers.length = 0;
//         additiveOffers.forEach((offer) => {
//           const providerOffer = providerOffers.find((o: any) => o.id === offer.id);
//           if (providerOffer) applicableOffers.push(providerOffer);
//         });
//       } else if (nonAdditiveOffers.length === 1) {
//         applicableOffers.length = 0;
//         const providerOffer = providerOffers.find((o: any) => o.id === nonAdditiveOffers[0].id);
//         if (providerOffer) applicableOffers.push(providerOffer);
//       } else if (nonAdditiveOffers.length > 1) {
//         applicableOffers.length = 0;
//         nonAdditiveOffers.forEach((offer) => {
//           addError(result, 20043, `Offer ${offer.id} is non-additive and cannot be combined with other non-additive offers`);
//         });
//       }

//       // Compare with on_select offers
//       const applicableOfferIds = applicableOffers.map((offer) => offer.id.toLowerCase());
//       if (onSelectOffers?.length && applicableOfferIds.length) {
//         const hasMatchingOffer = onSelectOffers.some((offer: any) => {
//           const offerTagId = offer.item?.tags
//             ?.find((tag: any) => tag.code === "offer")
//             ?.list?.find((entry: any) => entry.code === "id")?.value?.toLowerCase();
//           return offerTagId && applicableOfferIds.includes(offerTagId);
//         });
//         if (!hasMatchingOffer) {
//           addError(result, 20044, `No matching offer ID found in /${constants.ON_SELECT} and /${constants.INIT}`);
//         }
//       }
//     }
//   } catch (err: any) {
//     addError(result, 20045, `Error validating offers: ${err.message}`);
//   }
//   return applicableOffers;
// };

// Main init function
const init = async (data: any) => {
  const { context, message } = data;
    const result: any = [];
    const txnId = context?.transaction_id;
  
    try {
      await contextChecker(context, result, constants.INIT, constants.ON_SELECT);
    } catch (err: any) {
      result.push({
        valid: false,
        code: 20000,
        description: err.message,
      });
      return result;
    }
  
    try {
    const order = message.order;

    // Validate and store message components
    await validateProvider(txnId, order.provider, result);
    await validateItems(txnId, order.items, context, result);
    await validateFulfillments(txnId, order.fulfillments, result);
    await validateBilling(txnId, order.billing, context, result);
    await storeBilling(txnId, order.billing, result);

    return result;
  } catch (err: any) {
    console.error(`!!Some error occurred while checking /${constants.INIT} API, ${err.stack}`);
    return result;
  }
};

export default init;