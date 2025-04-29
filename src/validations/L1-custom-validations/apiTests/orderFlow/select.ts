import { RedisService } from "ondc-automation-cache-lib";
import {
  addActionToRedisSet,
  addMsgIdToRedisSet,
  checkBppIdOrBapId,
  checkContext,
  findItemByItemType,
  isObjectEmpty,
  isoDurToSec,
  tagFinder,
 
} from "../../../../utils/helper";
import _ from "lodash";
import constants, { ApiSequence } from "../../../../utils/constants";



const select = async (data: any, flow: string = "default", apiSeq: string = ApiSequence.SELECT) => {
  const result: any[] = [];
  const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;

  // Check if data is empty
  if (!data || isObjectEmpty(data)) {
    result.push({
      valid: false,
      code: 20000,
      description: "JSON cannot be empty",
    });
    return result;
  }

  const { message, context } = data;
  const transaction_id = context?.transaction_id;
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

  // Check previous call for default flow
  if (flow !== "3" || apiSeq !== ApiSequence.SELECT_OUT_OF_STOCK) {
    try {
      const previousCallPresent = await addActionToRedisSet(
        context.transaction_id,
        ApiSequence.ON_SEARCH,
        ApiSequence.SELECT
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
        `!!Error while checking previous action call /${constants.SELECT}, ${error.stack}`
      );
    }
  }

  const contextRes: any = checkContext(context, constants.SELECT);

  let selectedPrice = 0;
  const itemsIdList: any = {};
  const itemsCtgrs: any = {};
  const itemsTat: any[] = [];

  // Domain consistency check
  const domain = await RedisService.getKey(`${transaction_id}_domain`);
  if (!_.isEqual(data.context.domain.split(":")[1], domain)) {
    result.push({
      valid: false,
      code: 20000,
      description: "Domain should be same in each action",
    });
  }

  // BAP and BPP ID checks
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

  // Context validation errors
  if (!contextRes?.valid) {
    contextRes.ERRORS.forEach((error: any) => {
      result.push({
        valid: false,
        code: 20000,
        description: error,
      });
    });
  }

  const select = message.order;

  // Message ID checks
  try {
    console.info(
      `Adding Message Id /${flow === "3" && apiSeq === ApiSequence.SELECT_OUT_OF_STOCK ? constants.SELECT_OUT_OF_STOCK : constants.SELECT}`
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
    await RedisService.setKey(
      `${context.transaction_id}_${apiSeq}_msgId`,
      context.message_id,
      TTL_IN_SECONDS
    );

    // Compare message ID with /search and /on_search
    const searchContextRaw = await RedisService.getKey(
      `${transaction_id}_${ApiSequence.SEARCH}_context`
    );
    const searchContext = searchContextRaw ? JSON.parse(searchContextRaw) : null;
    const onSearchContextRaw = await RedisService.getKey(
      `${transaction_id}_${ApiSequence.ON_SEARCH}_context`
    );
    const onSearchContext = onSearchContextRaw ? JSON.parse(onSearchContextRaw) : null;

    if (onSearchContext && _.isEqual(onSearchContext.message_id, context.message_id)) {
      result.push({
        valid: false,
        code: 20000,
        description: `Message Id for /${ApiSequence.ON_SEARCH} and /${ApiSequence.SELECT} api cannot be same`,
      });
    }
    if (searchContext && _.isEqual(searchContext.message_id, context.message_id)) {
      result.push({
        valid: false,
        code: 20000,
        description: `Message Id for /${ApiSequence.SEARCH} and /${ApiSequence.SELECT} api cannot be same`,
      });
    }
  } catch (error: any) {
    console.error(
      `!!Error while checking message id for /${flow === "3" && apiSeq === ApiSequence.SELECT_OUT_OF_STOCK ? constants.SELECT_OUT_OF_STOCK : constants.SELECT}, ${error.stack}`
    );
  }

  // Store data in Redis
  await RedisService.setKey(
    `${transaction_id}_${apiSeq}`,
    JSON.stringify(data),
    TTL_IN_SECONDS
  );
  await RedisService.setKey(
    `${transaction_id}_providerId`,
    JSON.stringify(select.provider.id),
    TTL_IN_SECONDS
  );
  await RedisService.setKey(
    `${transaction_id}_providerLoc`,
    JSON.stringify(select.provider.locations[0].id),
    TTL_IN_SECONDS
  );
  await RedisService.setKey(
    `${transaction_id}_items`,
    JSON.stringify(select.items),
    TTL_IN_SECONDS
  );

  const searchContextRaw = await RedisService.getKey(
    `${transaction_id}_${ApiSequence.SEARCH}_context`
  );
  const searchContext = searchContextRaw ? JSON.parse(searchContextRaw) : null;

  const onSearchContextRaw = await RedisService.getKey(
    `${transaction_id}_${ApiSequence.ON_SEARCH}_context`
  );
  const onSearchContext = onSearchContextRaw ? JSON.parse(onSearchContextRaw) : null;

  let providerOnSelect = null;
  const itemIdArray: any[] = [];
  const customIdArray: any[] = [];
  const itemsOnSelect: any = [];
  const itemMap: any = {};
  const itemMapper: any = {};

  // City comparison
  try {
    console.log(`Comparing city of /${constants.ON_SEARCH} and /${constants.SELECT}`);
    if (!_.isEqual(onSearchContext?.city, context.city)) {
      result.push({
        valid: false,
        code: 20000,
        description: `City code mismatch in /${ApiSequence.ON_SEARCH} and /${ApiSequence.SELECT}`,
      });
    }
  } catch (error: any) {
    console.log(
      `Error while comparing city in /${constants.SEARCH} and /${constants.SELECT}, ${error.stack}`
    );
  }

  // Timestamp comparison
  try {
    console.log(`Comparing timestamp of /${constants.ON_SEARCH} and /${constants.SELECT}`);
    if (onSearchContext && _.gte(onSearchContext.timestamp, context.timestamp)) {
      result.push({
        valid: false,
        code: 20000,
        description: `Timestamp for /${constants.ON_SEARCH} api cannot be greater than or equal to /${constants.SELECT} api`,
      });
    }
    await RedisService.setKey(
      `${transaction_id}_${apiSeq}_tmpstmp`,
      JSON.stringify(context.timestamp),
      TTL_IN_SECONDS
    );
    await RedisService.setKey(
      `${transaction_id}_txnId`,
      transaction_id,
      TTL_IN_SECONDS
    );
  } catch (error: any) {
    console.log(
      `Error while comparing timestamp for /${constants.ON_SEARCH} and /${constants.SELECT} api, ${error.stack}`
    );
  }

  // Item ID validation
  try {
    console.log(`Storing item IDs and their count in /${constants.SELECT}`);
    const itemsOnSearchRaw = await RedisService.getKey(
      `${transaction_id}_${ApiSequence.ON_SEARCH}itemsId`
    );
    const itemsOnSearch = itemsOnSearchRaw ? JSON.parse(itemsOnSearchRaw) : [];
    if (!itemsOnSearch?.length) {
      result.push({
        valid: false,
        code: 20000,
        description: `No Items found on ${constants.ON_SEARCH} API`,
      });
    }

    select.items.forEach((item: { id: string | number; quantity: { count: number } }) => {
      if (!itemsOnSearch?.includes(item.id)) {
        result.push({
          valid: false,
          code: 20000,
          description: `Invalid item found in /${constants.SELECT} id: ${item.id}`,
        });
      }
      itemIdArray.push(item.id);
      itemsOnSelect.push(item.id);
      itemsIdList[item.id] = item.quantity.count;
    });

    await RedisService.setKey(
      `${transaction_id}_itemsIdList`,
      JSON.stringify(itemsIdList),
      TTL_IN_SECONDS
    );
    await RedisService.setKey(
      `${transaction_id}_SelectItemList`,
      JSON.stringify(itemsOnSelect),
      TTL_IN_SECONDS
    );
  } catch (error: any) {
    console.error(`Error while storing item IDs in /${constants.SELECT}, ${error.stack}`);
  }

  try {
    console.log(`Checking for GPS precision in /${constants.SELECT}`);
    select.fulfillments?.forEach((ff: any) => {
      if (ff.hasOwnProperty("end")) {
        // Check if gps field is missing
        if (!ff.end?.location?.gps) {
          result.push({
            valid: false,
            code: 20000,
            description: "fulfillments location.gps is missing in /select",
          });
          return; // Skip further checks for this fulfillment
        }
  
        // Store gps and address in Redis
        RedisService.setKey(
          `${transaction_id}_buyerGps`,
          JSON.stringify(ff.end?.location?.gps),
          TTL_IN_SECONDS
        );
        RedisService.setKey(
          `${transaction_id}_buyerAddr`,
          JSON.stringify(ff.end?.location?.address?.area_code),
          TTL_IN_SECONDS
        );
  
        const gps = ff.end?.location?.gps?.split(",");
        const gpsLat: string = gps?.[0];
        const gpsLong: string = gps?.[1];
  
        // Validate latitude
        Array.from(gpsLat).forEach((char: any) => {
          if (char !== "." && isNaN(parseInt(char))) {
            result.push({
              valid: false,
              code: 20000,
              description: "fulfillments location.gps latitude is not as per the API contract",
            });
          }
        });
  
        // Validate longitude
        Array.from(gpsLong).forEach((char: any) => {
          if (char !== "." && isNaN(parseInt(char))) {
            result.push({
              valid: false,
              code: 20000,
              description: "fulfillments location.gps longitude is not as per the API contract",
            });
          }
        });
  
        // Check if latitude or longitude is missing
        if (!gpsLat || !gpsLong) {
          result.push({
            valid: false,
            code: 20000,
            description: "fulfillments location.gps is incomplete in /select",
          });
        }
  
        // Check for area_code
        if (!ff.end.location.address.hasOwnProperty("area_code")) {
          result.push({
            valid: false,
            code: 20000,
            description: `address.area_code is required property in /${constants.SELECT}`,
          });
        }
      }
    });
  } catch (error: any) {
    console.error(`!!Error while checking GPS Precision in /${constants.SELECT}, ${error.stack}`);
  }

  // Provider validation
  try {
    console.log(`Checking for valid provider in /${constants.ON_SEARCH} and /${constants.SELECT}`);
    const onSearchRaw = await RedisService.getKey(`${transaction_id}_${ApiSequence.ON_SEARCH}`);
    const onSearch = onSearchRaw ? JSON.parse(onSearchRaw) : null;
    let provider = onSearch?.message?.catalog["bpp/providers"].filter(
      (provider: { id: any }) => provider.id === select.provider.id
    );

    if (provider?.length === 0) {
      result.push({
        valid: false,
        code: 20000,
        description: `provider with provider.id: ${select.provider.id} does not exist in on_search`,
      });
    } else {
      providerOnSelect = provider[0];
      await RedisService.setKey(
        `${transaction_id}_providerGps`,
        JSON.stringify(providerOnSelect?.locations[0]?.gps),
        TTL_IN_SECONDS
      );
      await RedisService.setKey(
        `${transaction_id}_providerName`,
        JSON.stringify(providerOnSelect?.descriptor?.name),
        TTL_IN_SECONDS
      );
    }
  } catch (error: any) {
    console.error(
      `Error while checking for valid provider in /${constants.ON_SEARCH} and /${constants.SELECT}, ${error.stack}`
    );
  }

  try {
    console.log(`Checking for valid and present location ID inside item list for /${constants.SELECT}`);
    const allOnSearchItemsRaw = await RedisService.getKey(`${transaction_id}_onSearchItems`);
    const allOnSearchItems = allOnSearchItemsRaw ? JSON.parse(allOnSearchItemsRaw) : [];
    let onSearchItems = allOnSearchItems.flat();
    
    select.items.forEach((item: any, index: number) => {
      // Check if location_id is present
      if (!item.location_id || item.location_id.trim() === "") {
        result.push({
          valid: false,
          code: 20000,
          description: `/message/order/items[${index}]: location_id is required`,
        });
        return; // Skip further checks for this item
      }
  
      // Compare location_id with on_search items for non-customization items
      onSearchItems.forEach((it: any) => {
        const isCustomization = tagFinder(it, "customization");
        const isNotCustomization = !isCustomization;
        
        if (it.id === item.id && it.location_id !== item.location_id && isNotCustomization) {
          result.push({
            valid: false,
            code: 20000,
            description: `/message/order/items[${index}]: location_id for item ${item.id} must match the location_id in on_search`,
          });
        }
      });
    });
  } catch (error: any) {
    console.error(
      `Error while checking for valid and present location ID inside item list for /${constants.SELECT}, ${error.stack}`
    );
  }

  // Duplicate parent_item_id check
  try {
    console.log(`Checking for duplicate parent_item_id, required parent_item_id, and type tags in /${constants.SELECT}`);
    select.items.forEach((item: any, index: number) => {
      const isItemType = tagFinder(item, "item");
      const isCustomizationType = tagFinder(item, "customization");
      
      // Check 1: If item has type: item or type: customization, parent_item_id must be present
      if ((isItemType || isCustomizationType) && !item.parent_item_id) {
        console.info(
          `Missing parent_item_id for item with ID: ${item.id || 'undefined'} at index ${index}`
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
      
      // Check 3: Check for duplicate parent_item_id for the same item.id
      if (!itemMapper[item.id]) {
        itemMapper[item.id] = item.parent_item_id;
      } else {
        if (itemMapper[item.id] === item.parent_item_id) {
          console.info(
            `Duplicate parent_item_id: ${item.parent_item_id} for item with ID: ${item.id} at index ${index}`
          );
          result.push({
            valid: false,
            code: 20000,
            description: `/message/order/items[${index}]: parent_item_id cannot be duplicate if item/id is same`,
          });
        }
      }
    });
  } catch (error: any) {
    console.error(
      `Error while checking for duplicate parent_item_id, required parent_item_id, and type tags in /${constants.SELECT}, ${error.stack}`
    );
  }

  // Item price mapping
  try {
    console.log(
      `Mapping the items with their prices on /${constants.ON_SEARCH} and /${constants.SELECT}`
    );
    const allOnSearchItemsRaw = await RedisService.getKey(`${transaction_id}_onSearchItems`);
    const allOnSearchItems = allOnSearchItemsRaw ? JSON.parse(allOnSearchItemsRaw) : [];
    let onSearchItems = allOnSearchItems.flat();
    select.items.forEach((item: any) => {
      const itemOnSearch = onSearchItems.find((it: any) => it.id === item.id);
      if (itemOnSearch) {
        console.log(
          `ITEM ID: ${item.id}, Price: ${itemOnSearch.price.value}, Count: ${item.quantity.count}`
        );
        itemsCtgrs[item.id] = itemOnSearch.category_id;
        itemsTat.push(itemOnSearch["@ondc/org/time_to_ship"]);
        selectedPrice += itemOnSearch.price.value * item.quantity?.count;
      }
    });
    await RedisService.setKey(
      `${transaction_id}_selectedPrice`,
      JSON.stringify(selectedPrice),
      TTL_IN_SECONDS
    );
    await RedisService.setKey(
      `${transaction_id}_itemsCtgrs`,
      JSON.stringify(itemsCtgrs),
      TTL_IN_SECONDS
    );
  } catch (error: any) {
    console.error(
      `Error while mapping the items with their prices on /${constants.ON_SEARCH} and /${constants.SELECT}, ${error.stack}`
    );
  }

  // Time to ship
  try {
    console.log(`Saving time_to_ship in /${constants.SELECT}`);
    let timeToShip = 0;
    itemsTat?.forEach((tts: any) => {
      const ttship = isoDurToSec(tts);
      console.log(ttship);
      timeToShip = Math.max(timeToShip, ttship);
    });
    await RedisService.setKey(
      `${transaction_id}_timeToShip`,
      JSON.stringify(timeToShip),
      TTL_IN_SECONDS
    );
  } catch (error: any) {
    console.error(`!!Error while saving time_to_ship in ${constants.SELECT}`, error);
  }

  // Consistent location IDs for parent_item_id
  try {
    console.log(`Checking for Consistent location IDs for parent_item_id in /${constants.SELECT}`);
    select.items.forEach((item: any, index: number) => {
      const itemTag = tagFinder(item, "item");
      if (itemTag) {
        if (!itemMap[item.parent_item_id]) {
          itemMap[item.parent_item_id] = { location_id: item.location_id };
        }
      }
      if (itemTag && itemMap[item.parent_item_id].location_id !== item.location_id) {
        result.push({
          valid: false,
          code: 20000,
          description: `Inconsistent location_id for parent_item_id ${item.parent_item_id}`,
        });
      }
    });
  } catch (error: any) {
    console.error(
      `Error while checking for Consistent location IDs for parent_item_id in /${constants.SELECT}, ${error.stack}`
    );
  }

  const checksOnValidProvider = async (provider: any) => {
    try {
      console.log(`Comparing provider location in /${constants.ON_SEARCH} and /${constants.SELECT}`);
      if (provider?.locations[0]?.id != select.provider?.locations[0]?.id) {
        result.push({
          valid: false,
          code: 20000,
          description: `provider.locations[0].id ${provider.locations[0].id} mismatches in /${constants.ON_SEARCH} and /${constants.SELECT}`,
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while comparing provider's location id in /${constants.ON_SEARCH} and /${constants.SELECT}, ${error.stack}`
      );
    }

    try {
      console.log(`Checking for valid items for provider in /${constants.SELECT}`);
      const itemProviderMapRaw = await RedisService.getKey(`${transaction_id}_itemProviderMap`);
      const itemProviderMap = itemProviderMapRaw ? JSON.parse(itemProviderMapRaw) : {};
      const providerID = select.provider.id;
      const items = select.items;
      items.forEach((item: any, index: number) => {
        if (!itemProviderMap[providerID]?.includes(item.id)) {
          result.push({
            valid: false,
            code: 20000,
            description: `Item with id ${item.id} is not available for provider with id ${provider.id}`,
          });
        }
      });
    } catch (error: any) {
      console.error(
        `Error while checking for valid items for provider in /${constants.SELECT}, ${error.stack}`
      );
    }

    try {
      console.log(`Storing item IDs on custom ID array`);
      provider?.categories?.map((item: { id: string }) => {
        customIdArray.push(item.id);
      });
      await RedisService.setKey(
        `${transaction_id}_select_customIdArray`,
        JSON.stringify(customIdArray),
        TTL_IN_SECONDS
      );
    } catch (error: any) {
      console.error(`Error while storing item IDs on custom ID array, ${error.stack}`);
    }

    try {
      console.log(`Checking for valid time object in /${constants.SELECT}`);
      if (provider?.time && provider?.time?.label === "disable") {
        result.push({
          valid: false,
          code: 20000,
          description: `provider with provider.id: ${provider.id} was disabled in on_search`,
        });
      }
    } catch (error: any) {
      console.error(
        `Error while checking for valid time object in /${constants.SELECT}, ${error.stack}`
      );
    }

    try {
      console.log(`Checking for valid base Item in /${constants.SELECT}`);
      select.items.forEach((item: any) => {
        const baseItem = findItemByItemType(item);
        if (baseItem) {
          const searchBaseItem = provider.items.find((it: { id: any }) => it.id === baseItem.id);
          if (searchBaseItem && searchBaseItem.time.label === "disable") {
            result.push({
              valid: false,
              code: 20000,
              description: `disabled item with id ${baseItem.id} cannot be selected`,
            });
          }
        }
      });
    } catch (error: any) {
      console.error(
        `Error while checking for valid base Item in /${constants.SELECT}, ${error.stack}`
      );
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
                return listItem.code === "id" && customIdArray.includes(listItem.value);
              })
            );
          });
          if (!parentTag) {
            result.push({
              valid: false,
              code: 20000,
              description: `/message/order/items/tags/customization/value in item: ${item.id} should be one of the customizations id mapped in on_search`,
            });
          }
        }
      });
    } catch (error: any) {
      console.error(
        `Error while checking for customization Items in /${constants.SELECT}, ${error.stack}`
      );
    }
  };

  // Call provider checks if valid provider exists
  if (providerOnSelect) {
    await checksOnValidProvider(providerOnSelect);
  } else {
    result.push({
      valid: false,
      code: 20000,
      description: `Warning: Missed checks for provider as provider with ID: ${select.provider.id} does not exist on ${constants.ON_SEARCH} API`,
    });
  }

  return result;
};

export default select;