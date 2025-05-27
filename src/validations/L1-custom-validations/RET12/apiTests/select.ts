import { RedisService } from "ondc-automation-cache-lib";
import constants, { ApiSequence } from "../../../../utils/constants";
import { contextChecker } from "../../../../utils/contextUtils";
import { setRedisValue, isObjectEmpty, tagFinder, findItemByItemType, isoDurToSec } from "../../../../utils/helper";
import _ from "lodash";

interface ValidationError {
  valid: boolean;
  code: number;
  description: string;
}

const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;

const addError = (result: ValidationError[], code: number, description: string) => {
  result.push({ valid: false, code, description });
};

// Validate provider-related data
async function validateProvider(
  select: any,
  transaction_id: string,
  result: ValidationError[],
) {
  let providerOnSelect = null;
  try {
    console.log(`Checking for valid provider in /${constants.ON_SEARCH} and /${constants.SELECT}`);
    const onSearchRaw = await RedisService.getKey(`${transaction_id}_${ApiSequence.ON_SEARCH}_message`);
    const onSearch = onSearchRaw ? JSON.parse(onSearchRaw) : null;
    let provider = onSearch?.catalog["bpp/providers"].filter(
      (provider: { id: any }) => provider.id === select.provider.id
    );

    if (!provider || provider.length === 0) {
      addError(result, 30001, `Provider not found - The provider ID provided in the request was not found`);
      return null;
    }

    providerOnSelect = provider[0];
    await Promise.all([
      setRedisValue(`${transaction_id}_providerGps`, providerOnSelect?.locations[0]?.gps, TTL_IN_SECONDS),
      setRedisValue(`${transaction_id}_providerName`, providerOnSelect?.descriptor?.name, TTL_IN_SECONDS),
    ]);

    // Validate provider location
    if (providerOnSelect?.locations[0]?.id !== select.provider?.locations[0]?.id) {
      addError(result, 
        30002,
        `provider.locations[0].id ${providerOnSelect.locations[0].id}, Provider location not found - The provider location ID provided in the request was not found in /${constants.ON_SEARCH} and /${constants.SELECT}`
      );
    }

    // Check provider time status
    if (providerOnSelect?.time && providerOnSelect?.time?.label === "disable") {
      addError(result, 20000, `provider with provider.id: ${providerOnSelect.id} was disabled in on_search`);
    }
  } catch (error: any) {
    console.error(`Error while checking for valid provider in /${constants.ON_SEARCH} and /${constants.SELECT}, ${error.stack}`);
    addError(result, 20000, `Error while checking provider: ${error.message}`);
  }
  return providerOnSelect;
}

async function validateFulfillment(
  select: any,
  transaction_id: string,
  result: ValidationError[],
) {
  try {
    console.log(`Checking for GPS precision in /${constants.SELECT}`);
    select.fulfillments?.forEach(async (ff: any) => {
      if (ff.hasOwnProperty("end")) {
       

    
        await Promise.all([
          setRedisValue(`${transaction_id}_buyerGps`, ff.end?.location?.gps, TTL_IN_SECONDS),
          setRedisValue(`${transaction_id}_buyerAddr`, ff.end?.location?.address?.area_code, TTL_IN_SECONDS),
        ]);
      }
    });
  } catch (error: any) {
    console.error(`!!Error while checking GPS Precision in /${constants.SELECT}, ${error.stack}`);
    addError(result, 20000, `Error while checking fulfillment: ${error.message}`);
  }
}

// Validate item-related data
async function validateItem(
  select: any,
  transaction_id: string,
  result: ValidationError[],
  providerOnSelect: any,
  customIdArray: string[]
) {
  const itemIdArray: string[] = [];
  const itemsOnSelect: string[] = [];
  const itemsIdList: any = {};
  const itemsCtgrs: any = {};
  const itemsTat: any[] = [];
  let selectedPrice = 0;
  const itemMap: any = {};
  const itemMapper: any = {};

  try {
    console.log(`Storing item IDs and their count in /${constants.SELECT}`);
    const itemsOnSearchRaw = await RedisService.getKey(`${transaction_id}_${ApiSequence.ON_SEARCH}itemsId`);
    const itemsOnSearch = itemsOnSearchRaw ? JSON.parse(itemsOnSearchRaw) : [];


    select.items.forEach((item: { id: string | number; quantity: { count: number } }) => {
      if (!itemsOnSearch?.includes(item.id.toString())) {
        addError(result, 20000, `Invalid item found in /${constants.SELECT} id: ${item.id}`);
      }
      itemIdArray.push(item.id.toString());
      itemsOnSelect.push(item.id.toString());
      itemsIdList[item.id] = item.quantity.count;
    });

    await Promise.all([
      setRedisValue(`${transaction_id}_itemsIdList`, itemsIdList, TTL_IN_SECONDS),
      setRedisValue(`${transaction_id}_SelectItemList`, itemsOnSelect, TTL_IN_SECONDS),
    ]);
  } catch (error: any) {
    console.error(`Error while storing item IDs in /${constants.SELECT}, ${error.stack}`);
    addError(result, 20000, `Error while storing item IDs: ${error.message}`);
  }

  try {
    console.log(`Checking for valid and present location ID inside item list for /${constants.SELECT}`);
    const allOnSearchItemsRaw = await RedisService.getKey(`${transaction_id}_onSearchItems`);
    const allOnSearchItems = allOnSearchItemsRaw ? JSON.parse(allOnSearchItemsRaw) : [];
    let onSearchItems = allOnSearchItems.flat();

    select.items.forEach((item: any, index: number) => {
     
      onSearchItems.forEach((it: any) => {
        const isCustomization = tagFinder(it, "customization");
        const isNotCustomization = !isCustomization;
        if (
          it.id === item.id &&
          it.location_id !== item.location_id &&
          isNotCustomization
        ) {
          addError(result, 
            20000,
            `/message/order/items[${index}]: location_id for item ${item.id} must match the location_id in on_search`
          );
        }
      });
    });

    const itemProviderMapRaw = await RedisService.getKey(`${transaction_id}_itemProviderMap`);
    const itemProviderMap = itemProviderMapRaw ? JSON.parse(itemProviderMapRaw) : {};
    const providerID = select.provider.id;
    select.items.forEach((item: any, index: number) => {
      if (!itemProviderMap[providerID]?.includes(item.id)) {
        addError(result, 
          30004,
          `Item with id ${item.id} not found - The item ID provided in the request was not found with provider_id ${providerID}`
        );
      }
    });
  } catch (error: any) {
    console.error(`Error while checking for valid and present location ID inside item list for /${constants.SELECT}, ${error.stack}`);
    addError(result, 20000, `Error while checking item location/provider: ${error.message}`);
  }

  try {
    console.log(`Checking for duplicate parent_item_id, required parent_item_id, and type tags in /${constants.SELECT}`);
    select.items.forEach((item: any, index: number) => {
      const isItemType = tagFinder(item, "item");
      const isCustomizationType = tagFinder(item, "customization");

     

     
      if (!itemMapper[item.id]) {
        itemMapper[item.id] = item.parent_item_id;
      } else if (itemMapper[item.id] === item.parent_item_id) {
        addError(result, 
          20000,
          `/message/order/items[${index}]: parent_item_id cannot be duplicate if item/id is same`
        );
      }
    });
  } catch (error: any) {
    console.error(`Error while checking for duplicate parent_item_id, required parent_item_id, and type tags in /${constants.SELECT}, ${error.stack}`);
    addError(result, 20000, `Error while checking parent_item_id: ${error.message}`);
  }

  try {
    console.log(`Checking for Consistent location IDs for parent_item_id in /${constants.SELECT}`);
    select.items.forEach((item: any, index: number) => {
      const itemTag = tagFinder(item, "item");
      if (itemTag) {
        if (!itemMap[item.parent_item_id]) {
          itemMap[item.parent_item_id] = { location_id: item.location_id };
        }
      }
      if (
        itemTag &&
        itemMap[item.parent_item_id]?.location_id !== item.location_id
      ) {
        addError(result, 
          20000,
          `Inconsistent location_id for parent_item_id ${item.parent_item_id}`
        );
      }
    });
  } catch (error: any) {
    console.error(`Error while checking for Consistent location IDs for parent_item_id in /${constants.SELECT}, ${error.stack}`);
  }

  try {
    console.log(`Checking for customization Items in /${constants.SELECT}`);
    select.items.forEach((item: any, index: number) => {
      const customizationTag = tagFinder(item, "customization");
      if (customizationTag) {
        const parentTag = item.tags.find((tag: any) => {
          return (
            tag.code === "parent" &&
            tag.list &&
            tag.list.find((listItem: { code: string; value: any }) => {
              return (
                listItem.code === "id" &&
                customIdArray.includes(listItem.value)
              );
            })
          );
        });
       
      }
    });
  } catch (error: any) {
    console.error(`Error while checking for customization Items in /${constants.SELECT}, ${error.stack}`);
    addError(result, 20000, `Error while checking customization items: ${error.message}`);
  }

  try {
    console.log(`Checking for valid base Item in /${constants.SELECT}`);
    select.items.forEach((item: any) => {
      const baseItem = findItemByItemType(item);
      if (baseItem) {
        const searchBaseItem = providerOnSelect?.items.find(
          (it: { id: any }) => it.id === baseItem.id
        );
        if (searchBaseItem && searchBaseItem.time.label === "disable") {
          addError(result, 20000, `disabled item with id ${baseItem.id} cannot be selected`);
        }
      }
    });
  } catch (error: any) {
    console.error(`Error while checking for valid base Item in /${constants.SELECT}, ${error.stack}`);
    addError(result, 20000, `Error while checking base item: ${error.message}`);
  }

  try {
    console.log(`Mapping the items with their prices on /${constants.ON_SEARCH} and /${constants.SELECT}`);
    const allOnSearchItemsRaw = await RedisService.getKey(`${transaction_id}_onSearchItems`);
    const allOnSearchItems = allOnSearchItemsRaw ? JSON.parse(allOnSearchItemsRaw) : [];
    let onSearchItems = allOnSearchItems.flat();
    select.items.forEach((item: any) => {
      const onSearchItem = onSearchItems.find((it: any) => it.id === item.id);
      if (onSearchItem) {
        itemsCtgrs[item.id] = onSearchItem.category_id;
        itemsTat.push(onSearchItem["@ondc/org/time_to_ship"]);

        if (
          onSearchItem.quantity?.available?.count &&
          onSearchItem.quantity?.maximum?.count
        ) {
          const availableCount =
            onSearchItem.quantity.available.count === "99"
              ? Infinity
              : parseInt(onSearchItem.quantity.available.count);
          const maximumCount =
            onSearchItem.quantity.maximum.count === "99"
              ? Infinity
              : parseInt(onSearchItem.quantity.maximum.count);
          const selectedQuantity = parseInt(item.quantity.count);

          if (selectedQuantity > 0) {
            if (
              !(
                selectedQuantity <= availableCount &&
                selectedQuantity <= maximumCount
              )
            ) {
              addError(result, 
                40009,
                `Maximum order qty exceeded - The maximum order quantity has been exceeded for the item.id: ${item.id}`
              );
            }
          } else {
            addError(result, 
              40012,
              `Minimum order qty required - The minimum order quantity has not been met for the item.id: ${item.id}`
            );
          }

          selectedPrice += onSearchItem.price.value * item.quantity?.count;
        }
      }
    });
    const provider_id = select.provider.id;

    let orderValueData = await RedisService.getKey(`${transaction_id}_${ApiSequence.ON_SEARCH}_orderValueSet`);
    if (!_.isNull(orderValueData)) {
      const parsedData: any[] = JSON.parse(orderValueData) || [];
      const min_value =
        parsedData?.find((itm: any) => itm.provider_id === provider_id)?.value || 0;

      if (selectedPrice < min_value) {
        addError(result, 
          30023,
          `Minimum order value error - The cart value is less than the minimum order value (${selectedPrice} < ${min_value})`
        );
      }
    }
    await Promise.all([
      setRedisValue(`${transaction_id}_selectedPrice`, selectedPrice, TTL_IN_SECONDS),
      setRedisValue(`${transaction_id}_itemsCtgrs`,itemsCtgrs, TTL_IN_SECONDS),
    ]);
  } catch (error: any) {
    console.error(`Error while mapping the items with their prices on /${constants.ON_SEARCH} and /${constants.SELECT}, ${error.stack}`);
    addError(result, 20000, `Error while mapping item prices: ${error.message}`);
  }

  try {
    console.log(`Saving time_to_ship in /${constants.SELECT}`);
    let timeToShip = 0;
    itemsTat?.forEach((tts: any) => {
      const ttship = isoDurToSec(tts);
      timeToShip = Math.max(timeToShip, ttship);
    });
    await setRedisValue(`${transaction_id}_timeToShip`, timeToShip, TTL_IN_SECONDS);
  } catch (error: any) {
    console.error(`!!Error while saving time_to_ship in ${constants.SELECT}, ${error.stack}`);
    addError(result, 20000, `Error while saving time_to_ship: ${error.message}`);
  }

  return { itemIdArray, itemsOnSelect, itemsIdList, itemsCtgrs, selectedPrice };
}

async function validateOffers(
  select: any,
  transaction_id: string,
  result: ValidationError[],
  timestamp: any
) {
  try {
    console.info(`Checking offers in /${constants.SELECT}`);
    if (select?.offers && select.offers.length > 0) {
      const providerOffersRaw = await RedisService.getKey(`${transaction_id}_${ApiSequence.ON_SEARCH}_offers`);
      const providerOffers = providerOffersRaw ? JSON.parse(providerOffersRaw) : [];
      const applicableOffers: any[] = [];
      const orderItemIds = select?.items?.map((item: any) => item.id) || [];
      const orderLocationIds = select?.provider?.locations?.map((item: any) => item.id) || [];

      select.offers.forEach((offer: any, index: number) => {
        const providerOffer = providerOffers.find(
          (providedOffer: any) => providedOffer?.id === offer?.id
        );

        if (!providerOffer) {
          addError(result, 40000, `Offer with id ${offer.id || 'unknown'} is not available for the provider`);
          return;
        }

        const offerLocationIds = providerOffer?.location_ids || [];
        const locationMatch = offerLocationIds.some((id: any) => orderLocationIds.includes(id));
        if (!locationMatch) {
          addError(result, 
            40000,
            `Offer with id '${offer.id || 'unknown'}' is not applicable for any of the order's locations [${orderLocationIds.join(', ')}]`
          );
          return;
        }

        const offerItemIds = providerOffer?.item_ids || [];
        const itemMatch = offerItemIds.some((id: any) => orderItemIds.includes(id));
        if (!itemMatch) {
          addError(result, 
            40000,
            `Offer with id '${offer.id || 'unknown'}' is not applicable for any of the ordered item(s) [${orderItemIds.join(', ')}]`
          );
          return;
        }

        const { label, range } = providerOffer?.time || {};
        const start = range?.start;
        const end = range?.end;
        if (label !== "valid" || !start || !end) {
          addError(result, 40000, `Offer with id ${offer.id || 'unknown'} has an invalid or missing time configuration`);
          return;
        }

        const currentTimeStamp = new Date(timestamp);
        const startTime = new Date(start);
        const endTime = new Date(end);
        if (!(currentTimeStamp >= startTime && currentTimeStamp <= endTime)) {
          addError(result, 40000, `Offer with id ${offer.id || 'unknown'} is not currently valid based on time range`);
          return;
        }

        const isSelected = offer?.tags?.some(
          (tag: any) =>
            tag.code === "selection" &&
            tag.list?.some((entry: any) => entry.code === "apply" && entry.value === "yes")
        );
        if (!isSelected) {
          addError(result, 40000, `Offer with id ${offer.id || 'unknown'} is not selected (apply: "yes" missing)`);
          return;
        }

        applicableOffers.push({ ...providerOffer, index });
      });

      const additiveOffers = applicableOffers.filter((offer: any) => {
        const metaTag = offer.tags?.find((tag: any) => tag.code === "meta");
        return metaTag?.list?.some(
          (entry: any) => entry.code === "additive" && entry.value.toLowerCase() === "yes"
        );
      });

      const nonAdditiveOffers = applicableOffers.filter((offer: any) => {
        const metaTag = offer.tags?.find((tag: any) => tag.code === "meta");
        return metaTag?.list?.some(
          (entry: any) => entry.code === "additive" && entry.value.toLowerCase() === "no"
        );
      });

      if (additiveOffers.length > 0) {
        applicableOffers.length = 0;
        additiveOffers.forEach((offer: any) => {
          const providerOffer = providerOffers.find((o: any) => o.id === offer.id);
          if (providerOffer) {
            applicableOffers.push(providerOffer);
          }
        });
      } else if (nonAdditiveOffers.length === 1) {
        applicableOffers.length = 0;
        const offer = nonAdditiveOffers[0];
        const providerOffer = providerOffers.find((o: any) => o.id === offer.id);
        if (providerOffer) {
          applicableOffers.push(providerOffer);
        }
      } else if (nonAdditiveOffers.length > 1) {
        applicableOffers.length = 0;
        nonAdditiveOffers.forEach((offer: any) => {
          addError(result, 
            40000,
            `Offer ${offer.id || 'unknown'} is non-additive and cannot be combined with other non-additive offers`
          );
        });
        return;
      }

      console.log("Applicable Offers in select:", applicableOffers);
      await setRedisValue(`${transaction_id}_selected_offers`, applicableOffers, TTL_IN_SECONDS);
    }
  } catch (error: any) {
    console.error(`Error while checking for offers in /${constants.SELECT}, ${error.stack}`);
    addError(result, 40000, `Error while checking for offers: ${error.message}`);
  }
}

export async function select(data: any) {
  const { context, message } = data;
  const result: ValidationError[] = [];
  const txnId = context?.transaction_id;

  try {
    await contextChecker(context, result, constants.SELECT, constants.ON_SEARCH);
  } catch (err: any) {
    result.push({
      valid: false,
      code: 20000,
      description: err.message,
    });
    return result;
  }

  try {
  

    const select = message.order;

    await Promise.all([
      setRedisValue(`${txnId}_${ApiSequence.SELECT}`,data, TTL_IN_SECONDS),
      setRedisValue(`${txnId}_providerId`, select.provider.id, TTL_IN_SECONDS),
      setRedisValue(`${txnId}_providerLoc`, select.provider.locations[0].id, TTL_IN_SECONDS),
      setRedisValue(`${txnId}_items`,select.items, TTL_IN_SECONDS),
    ]);

    // Collect custom ID array
    const customIdArray: string[] = [];
    try {
      console.log(`Storing item IDs on custom ID array`);
      const onSearchRaw = await RedisService.getKey(`${txnId}_${ApiSequence.ON_SEARCH}`);
      const onSearch = onSearchRaw ? JSON.parse(onSearchRaw) : null;
      const provider = onSearch?.message?.catalog["bpp/providers"].find(
        (provider: { id: any }) => provider.id === select.provider.id
      );
      provider?.categories?.forEach((item: { id: string }) => {
        customIdArray.push(item.id);
      });
      await setRedisValue(`${txnId}_select_customIdArray`, customIdArray, TTL_IN_SECONDS);
    } catch (error: any) {
      console.error(`Error while storing item IDs on custom ID array, ${error.stack}`);
      addError(result, 20000, `Error while storing custom ID array: ${error.message}`);
    }

    // Run validations
    const providerOnSelect = await validateProvider(select, txnId, result);
    await validateFulfillment(select, txnId, result, );
    await validateItem(select, txnId, result, providerOnSelect, customIdArray);
    await validateOffers(select, txnId, result, context.timestamp);

    return result;
  } catch (error: any) {
    console.error(`Error in /${constants.SELECT}: ${error.stack}`);
    addError(result, 20000, `Internal error: ${error.message}`);
    return result;
  }
}