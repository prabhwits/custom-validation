
import _ from "lodash";
import { RedisService } from "ondc-automation-cache-lib";
import { contextChecker } from "../../../../utils/contextUtils";
import {
  checkItemTag,
  compareObjects,
  compareQuoteObjects,
  getRedisValue,
  isTagsValid,
  payment_status,
  tagFinder,

} from "../../../../utils/helper";
import constants, { ApiSequence } from "../../../../utils/constants";

const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;

interface ValidationError {
  valid: boolean;
  code: number;
  description: string;
}

// Helper to add error to result array
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

// Store quote object
const storeQuote = async (txnId: string, quote: any, result: any[]): Promise<void> => {
  try {
    await RedisService.setKey(`${txnId}_initQuote`, JSON.stringify(quote), TTL_IN_SECONDS);
  } catch (err: any) {
    addError(result, 20002, `Error storing quote: ${err.message}`);
  }
};

// Store payment object
const storePayment = async (txnId: string, payment: any, result: any[]): Promise<void> => {
  try {
    await RedisService.setKey(`${txnId}_payment`, JSON.stringify(payment), TTL_IN_SECONDS);
  } catch (err: any) {
    addError(result, 20003, `Error storing payment: ${err.message}`);
  }
};

// Store applicable offers
const storeApplicableOffers = async (txnId: string, offers: any[], result: any[]): Promise<void> => {
  try {
    await RedisService.setKey(`${txnId}_${ApiSequence.ON_INIT}_offers`, JSON.stringify(offers), TTL_IN_SECONDS);
  } catch (err: any) {
    addError(result, 20004, `Error storing applicable offers: ${err.message}`);
  }
};

// Validate provider details
const validateProvider = async (txnId: string, provider: any, result: any[]): Promise<void> => {
  try {
    const providerId = await getRedisValue(`${txnId}_providerId`);
    if (providerId && providerId !== provider.id) {
      addError(result, 20005, `Provider Id mismatches in /${constants.ON_SEARCH} and /${constants.ON_INIT}`);
    }

    const providerLoc = await getRedisValue(`${txnId}_providerLoc`);
    const locationId = provider.locations?.[0]?.id;
    if (providerLoc && providerLoc !== locationId) {
      addError(result, 20006, `provider.locations[0].id mismatches in /${constants.ON_SEARCH} and /${constants.ON_INIT}`);
    }
  } catch (err: any) {
    addError(result, 20007, `Error validating provider: ${err.message}`);
  }
};

// Validate billing timestamps and comparison
const validateBilling = async (txnId: string, billing: any, context: any, result: any[]): Promise<void> => {
  try {
    const contextTime = new Date(context.timestamp).getTime();

    if (billing.created_at) {
      const billingTime = new Date(billing.created_at).getTime();
      if (isNaN(billingTime) || billingTime > contextTime) {
        addError(result, 20008, `billing.created_at should not be greater than context.timestamp in /${constants.ON_INIT}`);
      }
    }

    if (billing.updated_at) {
      const billingTime = new Date(billing.updated_at).getTime();
      if (isNaN(billingTime) || billingTime > contextTime) {
        addError(result, 20009, `billing.updated_at should not be greater than context.timestamp in /${constants.ON_INIT}`);
      }
    }

    if (billing.created_at && billing.updated_at && new Date(billing.updated_at) < new Date(billing.created_at)) {
      addError(result, 20010, `billing.updated_at cannot be less than billing.created_at in /${constants.ON_INIT}`);
    }

    const selectBilling = await getRedisValue(`${txnId}_billing_select`);
    if (selectBilling) {
      const billingErrors = compareObjects(selectBilling, billing);
      billingErrors?.forEach((error: string) => {
        addError(result, 20011, `billing: ${error} when compared with /${constants.ON_SELECT} billing object`);
      });
    }
  } catch (err: any) {
    addError(result, 20012, `Error validating billing: ${err.message}`);
  }
};

// Validate items (IDs, quantities, parent_item_id, location_id)
const validateItems = async (txnId: string, items: any[], context: any, result: any[]): Promise<void> => {
  try {
    const itemFlfllmnts = await getRedisValue(`${txnId}_itemFlfllmnts`);
    const itemsIdList = await getRedisValue(`${txnId}_itemsIdList`);
    const fulfillmentIdArray = await getRedisValue(`${txnId}_fulfillmentIdArray`);
    const parentItemIdSet = await getRedisValue(`${txnId}_parentItemIdSet`);
    const selectCustomIdArray = await getRedisValue(`${txnId}_select_customIdArray`);
    const onSearchItems = await getRedisValue(`${txnId}_onSearchItems`);

    items.forEach((item: any, i: number) => {
      const itemId = item.id;

      // Validate item ID existence
      if (!(itemId in itemsIdList)) {
        addError(result, 20013, `Item not found - Item Id ${itemId} does not exist in /${constants.ON_SELECT}`);
      }

      // Validate fulfillment ID
      if (!fulfillmentIdArray?.includes(item.fulfillment_id)) {
        addError(result, 20014, `items[${i}].fulfillment_id mismatches for Item ${itemId} in /${constants.ON_SELECT} and /${constants.ON_INIT}`);
      }

      // Validate quantity
      if (itemsIdList && itemId in itemsIdList && item.quantity.count !== itemsIdList[itemId]) {
        addError(result, 20015, `Warning: items[${i}].quantity.count for item ${itemId} mismatches with /${constants.SELECT}`);
      }

      // Validate parent_item_id
      if (parentItemIdSet && item.parent_item_id && !parentItemIdSet.includes(item.parent_item_id)) {
        addError(result, 20016, `items[${i}].parent_item_id mismatches for Item ${itemId} in /${constants.ON_SEARCH} and /${constants.ON_INIT}`);
      }

      // Validate location_id
      if (onSearchItems) {
        const matchingItem = onSearchItems.find((it: any) => it.id === itemId && !tagFinder(it, "customization"));
        if (matchingItem && item.locationid && matchingItem.location_id !== item.location_id) {
          addError(result, 20017, `items[${i}]: location_id for item ${itemId} must match /${constants.ON_SEARCH}`);
        }
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

      if (isCustomizationType && selectCustomIdArray) {
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

      // Validate Buyer-Delivery tags
      const fulfillment = (context.fulfillments || []).find((f: any) => f.id === item.fulfillment_id);
      if (fulfillment?.type === "Buyer-Delivery") {
        const rtoTag = item.tags?.find((tag: any) => tag.code === "rto_action");
      
          const returnToOrigin = rtoTag.list?.find((i: any) => i.code === "return_to_origin");
          if (!returnToOrigin || returnToOrigin.value?.toLowerCase() !== "yes") {
            addError(result, 20023, `'return_to_origin' must be 'yes' in 'rto_action' tag of items[${i}]`);
          }
        
      }
    });
  } catch (err: any) {
    addError(result, 20024, `Error validating items: ${err.message}`);
  }
};

// Validate fulfillments (IDs, GPS, area_code, Buyer-Delivery)
const validateFulfillments = async (txnId: string, fulfillments: any[], result: any[]): Promise<void> => {
  try {
    const fulfillmentIdArray = await getRedisValue(`${txnId}_fulfillmentIdArray`);
    const buyerGps = await getRedisValue(`${txnId}_buyerGps`);
    const buyerAddr = await getRedisValue(`${txnId}_buyerAddr`);

    fulfillments.forEach(async (fulfillment: any, i: number) => {
      const id = fulfillment.id;
      if (!fulfillmentIdArray?.includes(id)) {
        addError(result, 20025, `fulfillment id ${id} does not exist in /${constants.ON_SELECT}`);
      }

      if (fulfillment.type !== "Delivery") {
        addError(result, 20026, `Fulfillment type should be 'Delivery' (case-sensitive)`);
      } else if (fulfillment.tags?.length > 0 && fulfillment.type !== "Buyer-Delivery") {
        addError(result, 20027, `/message/order/fulfillment of type 'Delivery' should not have tags`);
      }

      const gps = fulfillment.end?.location?.gps;
      if (buyerGps && !_.isEqual(gps, buyerGps)) {
        console.log(`buyerGps: ${buyerGps}, gps: ${gps}`);
        addError(result, 20028, `gps coordinates in fulfillments[${i}].end.location mismatch in /${constants.ON_SELECT} & /${constants.ON_INIT}`);
      }

      const areaCode = fulfillment.end?.location?.address?.area_code;
      if (buyerAddr && !_.isEqual(areaCode, buyerAddr)) {
        addError(result, 20029, `address.area_code in fulfillments[${i}].end.location mismatch in /${constants.ON_SELECT} & /${constants.ON_INIT}`);
      }

      const address = fulfillment.end?.location?.address;
      if (address) {
        const lenName = address.name?.length || 0;
        const lenBuilding = address.building?.length || 0;
        const lenLocality = address.locality?.length || 0;

        if (lenName + lenBuilding + lenLocality >= 190) {
          addError(result, 20030, `address.name + address.building + address.locality should be < 190 chars`);
        }

        if (lenBuilding <= 3) {
          addError(result, 20031, `address.building should be > 3 chars`);
        }
        if (lenName <= 3) {
          addError(result, 20032, `address.name should be > 3 chars`);
        }
        if (lenLocality <= 3) {
          addError(result, 20033, `address.locality should be > 3 chars`);
        }

        if (
          address.building === address.locality ||
          address.name === address.building ||
          address.name === address.locality
        ) {
          addError(result, 20034, `address.name, address.building, and address.locality should be unique`);
        }
      }

      if (fulfillment.type === "Buyer-Delivery") {
        const orderDetailsTag = fulfillment.tags?.find((tag: any) => tag.code === "order_details");
        
          const requiredFields = ["weight_unit", "weight_value", "dim_unit", "length", "breadth", "height"];
          orderDetailsTag.list?.forEach((item: any) => {
            if (requiredFields.includes(item.code) && (!item.value || item.value.toString().trim() === "")) {
              addError(result, 20036, `'${item.code}' is missing or empty in 'order_details' tag in fulfillments`);
            }
          });
        

        const rtoTag = fulfillment.tags?.find((tag: any) => tag.code === "rto_action");
       
          const returnToOrigin = rtoTag.list?.find((i: any) => i.code === "return_to_origin");
          if (!returnToOrigin || returnToOrigin.value?.toLowerCase() !== "yes") {
            addError(result, 20038, `'return_to_origin' must be 'yes' in 'rto_action' tag in fulfillments`);
          }
        
      }

      const tracking = await getRedisValue(`${txnId}_${id}_tracking`);
      if (tracking != null) {
        if (tracking !== fulfillment.tracking) {
          addError(result, 20040, `Fulfillment Tracking mismatch with the ${constants.ON_SELECT} call`);
        }
      }
    });
  } catch (err: any) {
    addError(result, 20041, `Error validating fulfillments: ${err.message}`);
  }
};

// Validate quote
const validateQuote = async (txnId: string, quote: any, context: any, result: any[]): Promise<void> => {
  try {
    let initBreakupPrice = 0;
    quote.breakup.forEach((element: { price: { value: string } }) => {
      initBreakupPrice += parseFloat(element.price.value);
    });

    const initQuotePrice = parseFloat(quote.price.value);
    if (Math.round(initQuotePrice) !== Math.round(initBreakupPrice)) {
      addError(result, 20042, `Quoted Price ${initQuotePrice} does not match with Net Breakup Price ${initBreakupPrice} in /${constants.ON_INIT}`);
    }

    const onSelectQuote = await getRedisValue(`${txnId}_quoteObj`);
    if (onSelectQuote) {
      const quoteErrors = compareQuoteObjects(onSelectQuote, quote, constants.ON_SELECT, constants.ON_INIT);
      quoteErrors?.forEach((error: string) => {
        addError(result, 20043, `quote: ${error}`);
      });
    }

    const onSelectPrice = await getRedisValue(`${txnId}_onSelectPrice`);
    if (onSelectPrice && Math.round(parseFloat(onSelectPrice)) !== Math.round(initQuotePrice)) {
      addError(result, 20044, `Quoted Price in /${constants.ON_INIT} INR ${initQuotePrice} does not match with /${constants.ON_SELECT} INR ${onSelectPrice}`);
    }

    if (_.some(quote.breakup, (item) => _.has(item, "item.quantity"))) {
      addError(result, 20045, `Extra attribute Quantity provided in quote object after on_select`);
    }
  } catch (err: any) {
    addError(result, 20046, `Error validating quote: ${err.message}`);
  }
};

// Validate payment
const validatePayment = async (txnId: string, payment: any, context: any, flow: string, result: any[]): Promise<void> => {
  try {
    if (!payment) {
      addError(result, 20047, `Payment Object can't be null in /${constants.ON_INIT}`);
      return;
    }

    const buyerFF = await getRedisValue(`${txnId}_${ApiSequence.SEARCH}_buyerFF`);
    if (buyerFF && parseFloat(payment["@ondc/org/buyer_app_finder_fee_amount"]) !== parseFloat(buyerFF)) {
      addError(result, 20048, `Buyer app finder fee can't change in /${constants.ON_INIT}`);
    }

    const validSettlementBasis = ["delivery", "shipment"];
    const settlementBasis = payment["@ondc/org/settlement_basis"];
    if (settlementBasis && !validSettlementBasis.includes(settlementBasis)) {
      addError(result, 20049, `Invalid settlement basis in /${constants.ON_INIT}. Expected: ${validSettlementBasis.join(", ")}`);
    }

    const settlementWindow = payment["@ondc/org/settlement_window"];
    if (settlementWindow && !/^P(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/.test(settlementWindow)) {
      addError(result, 20050, `Invalid settlement window in /${constants.ON_INIT}. Expected format: PTd+[MH]`);
    }

    const settlementDetails = payment["@ondc/org/settlement_details"]?.[0];
    if (!settlementDetails) {
      addError(result, 20051, `settlement_details missing in /${constants.ON_INIT}`);
    } else {
      if (settlementDetails.settlement_counterparty !== "seller-app") {
        addError(result, 20052, `settlement_counterparty must be 'seller-app' in @ondc/org/settlement_details`);
      }

      const { settlement_type } = settlementDetails;
      if (!["neft", "rtgs", "upi"].includes(settlement_type)) {
        addError(result, 20053, `settlement_type must be 'neft/rtgs/upi' in @ondc/org/settlement_details`);
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
          addError(result, 20054, `Payment details missing: ${missingFields.join(", ")}`);
        }
      } else if (!settlementDetails.upi_address || settlementDetails.upi_address.trim() === "") {
        addError(result, 20055, `Payment details missing: upi_address`);
      }
    }

    if (payment.collected_by === "BPP") {
      if (!payment.type || payment.type !== "ON-ORDER") {
        addError(result, 20056, "Type must be 'ON-ORDER' in payment");
      }
      if (!payment.uri || !/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(payment.uri)) {
        addError(result, 20057, "Uri must be a valid URL in payment");
      }
      if (!payment.status || payment.status !== "NOT-PAID") {
        addError(result, 20058, "Status must be 'NOT-PAID' in payment");
      }
      if (!payment.params || typeof payment.params !== "object" || payment.params === null) {
        addError(result, 20059, "Params must be a non-null object in payment");
      }
      if (!payment["@ondc/org/settlement_basis"] || payment["@ondc/org/settlement_basis"] !== "delivery") {
        addError(result, 20060, "Settlement_basis must be 'delivery' in payment");
      }
      if (!payment["@ondc/org/settlement_window"] || !/^P(\d+D)?$/.test(payment["@ondc/org/settlement_window"])) {
        addError(result, 20061, "Settlement_window must be a valid ISO 8601 duration in payment");
      }
      if (!payment.tags || !Array.isArray(payment.tags) || payment.tags.length === 0) {
        addError(result, 20062, "Tags must be a non-empty array in payment");
      }

      if (payment.params) {
        if (!payment.params.currency || !/^[A-Z]{3}$/.test(payment.params.currency)) {
          addError(result, 20063, "Currency must be a valid ISO 4217 code in params");
        }
        if (!payment.params.transaction_id || typeof payment.params.transaction_id !== "string" || payment.params.transaction_id === "") {
          addError(result, 20064, "Transaction_id must be a non-empty string in params");
        }
        if (!payment.params.amount || !/^\d*\.\d{2}$/.test(payment.params.amount)) {
          addError(result, 20065, "Amount must be a valid decimal number in params");
        }
      }

      payment.tags?.forEach((tag: any, index: number) => {
        if (!tag.code || tag.code !== "bpp_collect") {
          addError(result, 20066, `payment.tag[${index}].code must be 'bpp_collect'`);
        }
        if (!tag.list || !Array.isArray(tag.list) || tag.list.length === 0) {
          addError(result, 20067, `payment.tag[${index}].list must be a non-empty array`);
        }
        const codes = new Set();
        tag.list?.forEach((item: any, itemIndex: number) => {
          if (!item.code || !["success", "error"].includes(item.code)) {
            addError(result, 20068, `payment.tag[${index}].list[${itemIndex}].code must be 'success' or 'error'`);
          }
          if (item.code && codes.has(item.code)) {
            addError(result, 20069, `payment.tag[${index}].list[${itemIndex}].code is a duplicate`);
          } else if (item.code) {
            codes.add(item.code);
          }
          if (!item.value || typeof item.value !== "string") {
            addError(result, 20070, `payment.tag[${index}].list[${itemIndex}].value must be a string`);
          } else if (item.code === "success" && item.value !== "Y") {
            addError(result, 20071, `payment.tag[${index}].list[${itemIndex}].value must be 'Y' for code 'success'`);
          } else if (item.code === "error" && (item.value === "" || item.value === "..")) {
            addError(result, 20072, `payment.tag[${index}].list[${itemIndex}].value is invalid for code 'error'`);
          }
        });
      });
    }

    const status = payment_status(payment, flow);
    if (!status || status.message) {
      addError(result, 20073, status.message || `Transaction_id missing in message/order/payment`);
    }
  } catch (err: any) {
    addError(result, 20074, `Error validating payment: ${err.message}`);
  }
};

// Validate tags (tax numbers, bpp_terms)
const validateTags = async (txnId: string, tags: any[], result: any[]): Promise<void> => {
  try {
    if (tags?.length) {
      if (!isTagsValid(tags, "bpp_terms")) {
        addError(result, 20075, `Tags should have valid gst number and fields in /${constants.ON_INIT}`);
      }

      const bppTermsTag = tags.find((tag: any) => tag.code === "bpp_terms");
      if (bppTermsTag) {
        const tagsList = bppTermsTag.list || [];
        const acceptBapTerms = tagsList.filter((item: any) => item.code === "accept_bap_terms");
        if (acceptBapTerms.length > 0) {
          addError(result, 20076, `accept_bap_terms is not required`);
        }

        let tax_number: any = {};
        let provider_tax_number: any = {};
        const np_type_on_search = await getRedisValue(`${txnId}_${ApiSequence.ON_SEARCH}np_type`);

        tagsList.forEach((e: any) => {
          if (e.code === "tax_number") {
            if (!e.value) {
              addError(result, 20077, `value must be present for tax_number in ${constants.ON_INIT}`);
            } else {
              const taxNumberPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
              if (!taxNumberPattern.test(e.value)) {
                addError(result, 20078, `Invalid format for tax_number in ${constants.ON_INIT}`);
              }
            }
            tax_number = e;
          }
          if (e.code === "provider_tax_number") {
            if (!e.value) {
              addError(result, 20079, `value must be present for provider_tax_number in ${constants.ON_INIT}`);
            } else {
              const taxNumberPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
              if (!taxNumberPattern.test(e.value)) {
                addError(result, 20080, `Invalid format for provider_tax_number in ${constants.ON_INIT}`);
              }
            }
            provider_tax_number = e;
          }
        });

        if (_.isEmpty(tax_number)) {
          addError(result, 20081, `tax_number must be present in ${constants.ON_INIT}`);
        }
        if (_.isEmpty(provider_tax_number)) {
          addError(result, 20082, `provider_tax_number must be present in ${constants.ON_INIT}`);
        }

        if (tax_number.value?.length === 15 && provider_tax_number?.value?.length === 10 && np_type_on_search) {
          const pan_id = tax_number.value.slice(2, 12);
          if (pan_id !== provider_tax_number.value && np_type_on_search === "ISN") {
            addError(result, 20083, `Pan_id is different in tax_number and provider_tax_number`);
          } else if (pan_id === provider_tax_number.value && np_type_on_search === "MSN") {
            addError(result, 20084, `Pan_id shouldn't be same in tax_number and provider_tax_number`);
          }
        }

        tags.forEach((tag: any) => {
          if (tag.code === "bap_terms") {
            const hasStaticTerms = tag.list?.some((item: any) => item.code === "static_terms");
            if (hasStaticTerms) {
              addError(result, 20085, `static_terms is not required in ${constants.ON_INIT}`);
            }
          }
          const providerTaxNumber = tag.list?.find((item: any) => item.code === "provider_tax_number");
          if (providerTaxNumber) {
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (!panRegex.test(providerTaxNumber.value)) {
              addError(result, 20086, `'provider_tax_number' should have a valid PAN number format`);
            }
          }
        });
      }

      await RedisService.setKey(`${txnId}_bpp_tags`, JSON.stringify(tags), TTL_IN_SECONDS);
      await RedisService.setKey(`${txnId}_on_init_tags`, JSON.stringify(tags), TTL_IN_SECONDS);
      if (bppTermsTag) {
        await RedisService.setKey(`${txnId}_list_ON_INIT`, JSON.stringify(bppTermsTag.list), TTL_IN_SECONDS);
      }
    }
  } catch (err: any) {
    addError(result, 20087, `Error validating tags: ${err.message}`);
  }
};

// Validate offers
const validateOffers = async (txnId: string, order: any, context: any, result: any[]): Promise<any[]> => {
  const applicableOffers: any[] = [];
  try {
    const providerOffers = await getRedisValue(`${txnId}_${ApiSequence.ON_SEARCH}_offers`);
    const selectOffers = await getRedisValue(`${txnId}_selected_offers`);
    const onSelectOffers = await getRedisValue(`${txnId}_on_select_offers`);
    const orderItemIds = order.items?.map((item: any) => item.id) || [];
    const orderLocationIds = order.provider?.locations?.map((item: any) => item.id) || [];
    const initOfferIds = order.offers?.map((offer: any) => offer.id.toLowerCase()) || [];

    // Compare with select offers
    if (selectOffers && !initOfferIds.length) {
      addError(result, 20088, `Offers required in on_init when present in select`);
    } else if (selectOffers && initOfferIds.length) {
      selectOffers.forEach((offer: any) => {
        const offerTagId = offer?.id?.toLowerCase();
        if (offerTagId && !initOfferIds.includes(offerTagId)) {
          addError(result, 20089, `Offer Id ${offerTagId} mismatched in /${constants.SELECT} and /${constants.ON_INIT}`);
        }
      });
    }

    // Validate offers
    if (order.offers?.length) {
      order.offers.forEach((offer: any, index: number) => {
        const providerOffer = providerOffers?.find((p: any) => p.id.toLowerCase() === offer.id.toLowerCase());
        if (!providerOffer) {
          addError(result, 20090, `Offer with id ${offer.id} is not available for the provider`);
          return;
        }

        const offerLocationIds = providerOffer.location_ids || [];
        if (!offerLocationIds.some((id: string) => orderLocationIds.includes(id))) {
          addError(result, 20091, `Offer ${offer.id} not applicable for order locations [${orderLocationIds.join(", ")}]`);
        }

        const offerItemIds = providerOffer.item_ids || [];
        if (!offerItemIds.some((id: string) => orderItemIds.includes(id))) {
          addError(result, 20092, `Offer ${offer.id} not applicable for ordered items [${orderItemIds.join(", ")}]`);
        }

        const { label, range } = providerOffer.time || {};
        const start = range?.start;
        const end = range?.end;
        if (label !== "valid" || !start || !end) {
          addError(result, 20093, `Offer ${offer.id} has invalid or missing time configuration`);
        } else {
          const currentTime = new Date(context.timestamp);
          const startTime = new Date(start);
          const endTime = new Date(end);
          if (!(currentTime >= startTime && currentTime <= endTime)) {
            addError(result, 20094, `Offer ${offer.id} is not currently valid based on time range`);
          }
        }

        const isSelected = offer.tags?.some(
          (tag: any) =>
            tag.code === "selection" &&
            tag.list?.some((entry: any) => entry.code === "apply" && entry.value === "yes")
        );
        if (!isSelected) {
          addError(result, 20095, `Offer ${offer.id} is not selected (apply: "yes" missing)`);
        }

        applicableOffers.push({ ...providerOffer, index });
      });

      // Validate additive/non-additive offers
      const additiveOffers = applicableOffers.filter((offer) =>
        offer.tags?.find((tag: any) => tag.code === "meta")?.list?.some(
          (entry: any) => entry.code === "additive" && entry.value.toLowerCase() === "yes"
        )
      );
      const nonAdditiveOffers = applicableOffers.filter((offer) =>
        offer.tags?.find((tag: any) => tag.code === "meta")?.list?.some(
          (entry: any) => entry.code === "additive" && entry.value.toLowerCase() === "no"
        )
      );

      if (additiveOffers.length > 0) {
        applicableOffers.length = 0;
        additiveOffers.forEach((offer) => {
          const providerOffer = providerOffers.find((o: any) => o.id === offer.id);
          if (providerOffer) applicableOffers.push(providerOffer);
        });
      } else if (nonAdditiveOffers.length === 1) {
        applicableOffers.length = 0;
        const providerOffer = providerOffers.find((o: any) => o.id === nonAdditiveOffers[0].id);
        if (providerOffer) applicableOffers.push(providerOffer);
      } else if (nonAdditiveOffers.length > 1) {
        applicableOffers.length = 0;
        nonAdditiveOffers.forEach((offer) => {
          addError(result, 20096, `Offer ${offer.id} is non-additive and cannot be combined with other non-additive offers`);
        });
      }

      // Compare with on_select offers
      const applicableOfferIds = applicableOffers.map((offer) => offer.id.toLowerCase());
      if (onSelectOffers?.length && applicableOfferIds.length) {
        const hasMatchingOffer = onSelectOffers.some((offer: any) => {
          const offerTagId = offer.item?.tags
            ?.find((tag: any) => tag.code === "offer")
            ?.list?.find((entry: any) => entry.code === "id")?.value?.toLowerCase();
          return offerTagId && applicableOfferIds.includes(offerTagId);
        });
        if (!hasMatchingOffer) {
          addError(result, 20097, `No matching offer ID found in /${constants.ON_SELECT} and /${constants.ON_INIT}`);
        }
      }
    }
  } catch (err: any) {
    addError(result, 20098, `Error validating offers: ${err.message}`);
  }
  return applicableOffers;
};

const onInit = async (data: any) => {
  const { context, message } = data;
  const result: any[] = [];
  const txnId = context?.transaction_id;
  const flow = "2";

  try {
    await contextChecker(context, result, constants.ON_INIT, constants.INIT);
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

    await RedisService.setKey(`${txnId}_${ApiSequence.ON_INIT}`, JSON.stringify(data), TTL_IN_SECONDS);

    
  

    await validateProvider(txnId, order.provider, result);
    await validateItems(txnId, order.items, context, result);
    await validateFulfillments(txnId, order.fulfillments, result);
    await validateBilling(txnId, order.billing, context, result);
    await validateQuote(txnId, order.quote, context, result);
    await validatePayment(txnId, order.payment, context, flow, result);
    await validateTags(txnId, order.tags, result);
    await validateOffers(txnId, order, context, result);

    await storeBilling(txnId, order.billing, result);
    await storeQuote(txnId, order.quote, result);
    await storePayment(txnId, order.payment, result);
    const applicableOffers = await validateOffers(txnId, order, context, result);
    await storeApplicableOffers(txnId, applicableOffers, result);

    return result;
  } catch (err: any) {
    console.error(`!!Some error occurred while checking /${constants.ON_INIT} API, ${err.stack}`);
    return result;
  }
};

export default onInit;
