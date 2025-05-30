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
  setRedisValue,
  tagFinder,
} from "../../../../utils/helper";
import constants, { ApiSequence } from "../../../../utils/constants";

const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;

const addError = (result: any[], code: number, description: string): void => {
  result.push({
    valid: false,
    code,
    description,
  });
};

const storeOrder = async (
  txnId: string,
  order: any,
  result: any[]
): Promise<void> => {
  try {
    await Promise.all([
      RedisService.setKey(`${txnId}_cnfrmOrdrId`, order.id, TTL_IN_SECONDS),
      RedisService.setKey(
        `${txnId}_ordrCrtd`,
        JSON.stringify(order.created_at),
        TTL_IN_SECONDS
      ),
      RedisService.setKey(
        `${txnId}_ordrUpdtd`,
        JSON.stringify(order.updated_at),
        TTL_IN_SECONDS
      ),
      RedisService.setKey(
        `${txnId}_PreviousUpdatedTimestamp`,
        JSON.stringify(order.updated_at),
        TTL_IN_SECONDS
      ),
      RedisService.setKey(
        `${txnId}_onCnfrmState`,
        JSON.stringify(order.state),
        TTL_IN_SECONDS
      ),
    ]);
  } catch (err: any) {
    addError(result, 20001, `Error storing order details: ${err.message}`);
  }
};

// Store billing object
const storeBilling = async (
  txnId: string,
  billing: any,
  result: any[]
): Promise<void> => {
  try {
    await RedisService.setKey(
      `${txnId}_billing`,
      JSON.stringify(billing),
      TTL_IN_SECONDS
    );
  } catch (err: any) {
    addError(result, 20002, `Error storing billing: ${err.message}`);
  }
};

// Store quote object
const storeQuote = async (
  txnId: string,
  quote: any,
  result: any[]
): Promise<void> => {
  try {
    await RedisService.setKey(
      `${txnId}_quotePrice`,
      JSON.stringify(parseFloat(quote.price.value)),
      TTL_IN_SECONDS
    );
  } catch (err: any) {
    addError(result, 20003, `Error storing quote: ${err.message}`);
  }
};

// Store payment object
const storePayment = async (
  txnId: string,
  payment: any,
  result: any[]
): Promise<void> => {
  try {
    await RedisService.setKey(
      `${txnId}_prevPayment`,
      JSON.stringify(payment),
      TTL_IN_SECONDS
    );
  } catch (err: any) {
    addError(result, 20004, `Error storing payment: ${err.message}`);
  }
};

// Validate order (id, state, timestamps)
const validateOrder = async (
  txnId: string,
  order: any,
  context: any,
  result: any[]
): Promise<void> => {
  try {
    const cnfrmOrdrId = await getRedisValue(`${txnId}_cnfrmOrdrId`);
    await RedisService.setKey(
      `${txnId}_orderState`,
      JSON.stringify(order.state),
      TTL_IN_SECONDS
    );

    if (cnfrmOrdrId && cnfrmOrdrId !== order.id) {
      addError(
        result,
        20011,
        `Order Id mismatches in /${constants.CONFIRM} and /${constants.ON_CONFIRM}`
      );
    }

    if (order.state !== "Created" && order.state !== "Accepted") {
      addError(result, 20012, `Invalid order state: ${order.state}`);
    }

    const contextTime = new Date(context.timestamp).getTime();
    const createdTime = new Date(order.created_at).getTime();
    const updatedTime = new Date(order.updated_at).getTime();
    const confirmCreatedTimeRaw = await getRedisValue(`${txnId}_ordrCrtd`);
    const confirmCreatedTime = confirmCreatedTimeRaw
      ? new Date(confirmCreatedTimeRaw).getTime()
      : null;

    if (isNaN(createdTime) || createdTime != confirmCreatedTime) {
      console.log(
        "createdTime",
        createdTime,
        "confirmCreatedTime",
        confirmCreatedTime,
        "contextTime"
      );
      addError(
        result,
        20013,
        `order.created_at must match context.timestamp in /${constants.ON_CONFIRM}`
      );
    }

    if (isNaN(updatedTime) || updatedTime !== contextTime) {
      addError(
        result,
        20014,
        `order.updated_at must match context.timestamp in /${constants.ON_CONFIRM}`
      );
    }

    if (order.cancellation_terms && order.cancellation_terms.length > 0) {
      addError(
        result,
        20015,
        `cancellation_terms should not be provided in /${constants.ON_CONFIRM}`
      );
    }
  } catch (err: any) {
    addError(result, 20016, `Error validating order: ${err.message}`);
  }
};

const validateProvider = async (
  txnId: string,
  provider: any,
  result: any[]
): Promise<void> => {
  try {
    const providerId = await getRedisValue(`${txnId}_providerId`);
    if (providerId && providerId !== provider.id) {
      addError(
        result,
        20017,
        `Provider Id mismatches in /${constants.ON_SEARCH} and /${constants.ON_CONFIRM}`
      );
    }

    const providerLoc = await getRedisValue(`${txnId}_providerLoc`);
    const locationId = provider.locations?.[0]?.id;
    if (providerLoc && providerLoc !== locationId) {
      addError(
        result,
        20018,
        `provider.locations[0].id mismatches in /${constants.ON_SEARCH} and /${constants.ON_CONFIRM}`
      );
    }
  } catch (err: any) {
    addError(result, 20019, `Error validating provider: ${err.message}`);
  }
};

const validateBilling = async (
  txnId: string,
  billing: any,
  context: any,
  result: any[]
): Promise<void> => {
  try {
    const contextTime = new Date(context.timestamp).getTime();

    if (billing.created_at) {
      const billingTime = new Date(billing.created_at).getTime();
      if (isNaN(billingTime) || billingTime > contextTime) {
        addError(
          result,
          20020,
          `billing.created_at should not be greater than context.timestamp in /${constants.ON_CONFIRM}`
        );
      }
    }

    if (billing.updated_at) {
      const billingTime = new Date(billing.updated_at).getTime();
      if (isNaN(billingTime) || billingTime > contextTime) {
        addError(
          result,
          20021,
          `billing.updated_at should not be greater than context.timestamp in /${constants.ON_CONFIRM}`
        );
      }
    }

    if (
      billing.created_at &&
      billing.updated_at &&
      new Date(billing.updated_at) < new Date(billing.created_at)
    ) {
      addError(
        result,
        20022,
        `billing.updated_at cannot be less than billing.created_at in /${constants.ON_CONFIRM}`
      );
    }

    const confirmBilling = await getRedisValue(`${txnId}_billing`);
    if (confirmBilling) {
      const billingErrors = compareObjects(confirmBilling, billing);
      console.log(
        "ConfirmBilling",
        confirmBilling,
        "\n onConfirmBilling",
        billing
      );
      billingErrors?.forEach((error: string) => {
        addError(
          result,
          20023,
          `billing: ${error} when compared with /${constants.CONFIRM} billing object`
        );
      });
    }
  } catch (err: any) {
    addError(result, 20024, `Error validating billing: ${err.message}`);
  }
};

// Validate items
const validateItems = async (
  txnId: string,
  items: any[],
  context: any,
  result: any[]
): Promise<void> => {
  try {
    const [
      itemFlfllmntsRaw,
      itemsIdListRaw,
      fulfillmentIdArrayRaw,
      parentItemIdSetRaw,
    ] = await Promise.all([
      getRedisValue(`${txnId}_itemFlfllmnts`),
      getRedisValue(`${txnId}_itemsIdList`),
      getRedisValue(`${txnId}_fulfillmentIdArray`),
      getRedisValue(`${txnId}_parentItemIdSet`),
    ]);

    const itemFlfllmnts = itemFlfllmntsRaw;
    const itemsIdList = itemsIdListRaw;
    const fulfillmentIdArray = fulfillmentIdArrayRaw;
    const parentItemIdSet = parentItemIdSetRaw;

    let itemsCountChange = false;
    const updatedItemsIdList = { ...itemsIdList };

    items.forEach((item: any, i: number) => {
      const itemId = item.id;

      if (!itemsIdList || !(itemId in itemsIdList)) {
        addError(
          result,
          20025,
          `Item Id ${itemId} does not exist in /${constants.ON_SELECT}`
        );
      }

      if (
        item.fulfillment_id &&
        !fulfillmentIdArray?.includes(item.fulfillment_id)
      ) {
        addError(
          result,
          20026,
          `items[${i}].fulfillment_id mismatches for Item ${itemId} in /${constants.ON_SELECT} and /${constants.ON_CONFIRM}`
        );
      }

      if (
        itemsIdList &&
        itemId in itemsIdList &&
        item.quantity.count !== itemsIdList[itemId]
      ) {
        updatedItemsIdList[itemId] = item.quantity.count;
        itemsCountChange = true;
        addError(
          result,
          20027,
          `Warning: items[${i}].quantity.count for item ${itemId} mismatches with /${constants.SELECT}`
        );
      }

      const typeTag = item.tags?.find((tag: any) => tag.code === "type");
      const typeValue = typeTag?.list?.find(
        (listItem: any) => listItem.code === "type"
      )?.value;

      if (
        parentItemIdSet &&
        item.parent_item_id &&
        !parentItemIdSet.includes(item.parent_item_id)
      ) {
        addError(
          result,
          20030,
          `items[${i}].parent_item_id mismatches for Item ${itemId} in /${constants.ON_SEARCH} and /${constants.ON_CONFIRM}`
        );
      }
    });

    if (itemsCountChange) {
      await RedisService.setKey(
        `${txnId}_itemsIdList`,
        JSON.stringify(updatedItemsIdList),
        TTL_IN_SECONDS
      );
    }
  } catch (err: any) {
    addError(result, 20033, `Error validating items: ${err.message}`);
  }
};

// Validate fulfillments
const validateFulfillments = async (
  txnId: string,
  fulfillments: any[],
  result: any[]
): Promise<void> => {
  try {
    const [fulfillmentIdArrayRaw, buyerGpsRaw, buyerAddrRaw] =
      await Promise.all([
        getRedisValue(`${txnId}_fulfillmentIdArray`),
        getRedisValue(`${txnId}_buyerGps`),
        getRedisValue(`${txnId}_buyerAddr`),
      ]);

    const fulfillmentIdArray = fulfillmentIdArrayRaw;
    const buyerGps = buyerGpsRaw;
    const buyerAddr = buyerAddrRaw;

    const gpsRegex = /^-?\d{1,3}\.\d+,-?\d{1,3}\.\d+$/;

    fulfillments.forEach(async (fulfillment: any, i: number) => {
      const id = fulfillment.id;
      if (!fulfillmentIdArray?.includes(id)) {
        addError(
          result,
          20034,
          `fulfillment id ${id} does not exist in /${constants.ON_SELECT}`
        );
      }

      if (!fulfillment["@ondc/org/TAT"]) {
        addError(
          result,
          20035,
          `'TAT' must be provided in message/order/fulfillments[${id}]`
        );
      }

      const type = fulfillment.type;
      const category = fulfillment["@ondc/org/category"];
      const vehicle = fulfillment.vehicle;
      const SELF_PICKUP = "Self-Pickup";
      const KERBSIDE = "Kerbside";

      if (type === SELF_PICKUP && category === KERBSIDE) {
        if (!vehicle) {
          addError(
            result,
            20036,
            `Vehicle is required for fulfillment ${i} with type ${SELF_PICKUP} and category ${KERBSIDE} in /${constants.ON_CONFIRM}`
          );
        } else if (!vehicle.registration) {
          addError(
            result,
            20037,
            `Vehicle registration is required for fulfillment ${i} with type ${SELF_PICKUP} and category ${KERBSIDE} in /${constants.ON_CONFIRM}`
          );
        }
      } else if (vehicle) {
        addError(
          result,
          20038,
          `Vehicle should not be present in fulfillment ${i} with type ${type} and category ${category} in /${constants.ON_CONFIRM}`
        );
      }

      const gps = fulfillment.end?.location?.gps;
      if (!gpsRegex.test(gps)) {
        addError(
          result,
          20039,
          `fulfillments[${i}].end.location.gps has invalid format in /${constants.ON_CONFIRM}`
        );
      } else if (buyerGps && !_.isEqual(gps, buyerGps)) {
        addError(
          result,
          20040,
          `gps coordinates in fulfillments[${i}].end.location mismatch in /${constants.SELECT} & /${constants.ON_CONFIRM}`
        );
      }

      const areaCode = fulfillment.end?.location?.address?.area_code;
      if (buyerAddr && !_.isEqual(areaCode, buyerAddr)) {
        addError(
          result,
          20041,
          `address.area_code in fulfillments[${i}].end.location mismatch in /${constants.SELECT} & /${constants.ON_CONFIRM}`
        );
      }

      const address = fulfillment.end?.location?.address;
      const providerAddress = fulfillment.start;
      if (providerAddress && !_.isEqual(providerAddress, address)) {
        await setRedisValue(
          `${txnId}_providerAddr`,
          providerAddress,
          TTL_IN_SECONDS
        );
      }
      if (address) {
        const lenName = address.name?.length || 0;
        const lenBuilding = address.building?.length || 0;
        const lenLocality = address.locality?.length || 0;

        if (lenName + lenBuilding + lenLocality >= 190) {
          addError(
            result,
            20042,
            `address.name + address.building + address.locality should be < 190 chars in fulfillments[${i}]`
          );
        }

        if (lenBuilding <= 3) {
          addError(
            result,
            20043,
            `address.building should be > 3 chars in fulfillments[${i}]`
          );
        }
        if (lenName <= 3) {
          addError(
            result,
            20044,
            `address.name should be > 3 chars in fulfillments[${i}]`
          );
        }
        if (lenLocality <= 3) {
          addError(
            result,
            20045,
            `address.locality should be > 3 chars in fulfillments[${i}]`
          );
        }

        if (
          address.building === address.locality ||
          address.name === address.building ||
          address.name === address.locality
        ) {
          addError(
            result,
            20046,
            `address.name, address.building, and address.locality should be unique in fulfillments[${i}]`
          );
        }
      }
    });
  } catch (err: any) {
    addError(result, 20047, `Error validating fulfillments: ${err.message}`);
  }
};

// Validate quote
const validateQuote = async (
  txnId: string,
  quote: any,
  context: any,
  result: any[]
): Promise<void> => {
  try {
    let breakupPrice = 0;
    quote.breakup.forEach((element: { price: { value: string } }) => {
      breakupPrice += parseFloat(element.price.value);
    });

    const quotePrice = parseFloat(quote.price.value);
    if (Math.round(quotePrice) !== Math.round(breakupPrice)) {
      addError(
        result,
        20048,
        `Quoted Price ${quotePrice} does not match with Net Breakup Price ${breakupPrice} in /${constants.ON_CONFIRM}`
      );
    }

    const onSelectQuote = await getRedisValue(`${txnId}_quoteObj`);
    if (onSelectQuote) {
      const quoteErrors = compareQuoteObjects(
        onSelectQuote,
        quote,
        constants.ON_SELECT,
        constants.ON_CONFIRM
      );
      quoteErrors?.forEach((error: string) => {
        addError(result, 20049, `quote: ${error}`);
      });
    }

    const confirmQuotePrice = await getRedisValue(`${txnId}_quotePrice`);
    if (
      confirmQuotePrice &&
      Math.round(parseFloat(confirmQuotePrice)) !== Math.round(quotePrice)
    ) {
      addError(
        result,
        20050,
        `Quoted Price in /${constants.ON_CONFIRM} INR ${quotePrice} does not match with /${constants.CONFIRM} INR ${confirmQuotePrice}`
      );
    }

    if (_.some(quote.breakup, (item) => _.has(item, "item.quantity"))) {
      addError(
        result,
        20051,
        `Extra attribute Quantity provided in quote object after on_select in /${constants.ON_CONFIRM}`
      );
    }
  } catch (err: any) {
    addError(result, 20052, `Error validating quote: ${err.message}`);
  }
};

// Validate payment
const validatePayment = async (
  txnId: string,
  payment: any,
  quote: any,
  context: any,
  flow: string,
  result: any[]
): Promise<void> => {
  try {
    const quotePrice = parseFloat(quote.price.value);
    if (parseFloat(payment.params.amount) !== quotePrice) {
      addError(
        result,
        20053,
        `Payment amount ${payment.params.amount} does not match quote price ${quotePrice} in /${constants.ON_CONFIRM}`
      );
    }

    const buyerFF = await getRedisValue(`${txnId}_buyerFFAmount`);
    if (
      buyerFF &&
      parseFloat(payment["@ondc/org/buyer_app_finder_fee_amount"]) !==
        parseFloat(buyerFF)
    ) {
      addError(
        result,
        20054,
        `Buyer app finder fee can't change in /${constants.ON_CONFIRM}`
      );
    }

    const confirmSettlementDetails = await getRedisValue(
      `${txnId}_sttlmntdtls`
    );
    if (
      confirmSettlementDetails &&
      !_.isEqual(
        payment["@ondc/org/settlement_details"][0],
        confirmSettlementDetails
      )
    ) {
      addError(
        result,
        20055,
        `payment settlement_details mismatch in /${constants.CONFIRM} & /${constants.ON_CONFIRM}`
      );
    }

    const settlementDetails = payment["@ondc/org/settlement_details"]?.[0];
    if (!settlementDetails) {
      addError(
        result,
        20056,
        `settlement_details missing in /${constants.ON_CONFIRM}`
      );
    } else {
      if (settlementDetails.settlement_counterparty !== "seller-app") {
        addError(
          result,
          20057,
          `settlement_counterparty must be 'seller-app' in @ondc/org/settlement_details`
        );
      }

      const { settlement_type } = settlementDetails;
      if (!["neft", "rtgs", "upi"].includes(settlement_type)) {
        addError(
          result,
          20058,
          `settlement_type must be 'neft/rtgs/upi' in @ondc/org/settlement_details`
        );
      } else if (settlement_type !== "upi") {
        const missingFields = [];
        if (!settlementDetails.bank_name) missingFields.push("bank_name");
        if (!settlementDetails.branch_name) missingFields.push("branch_name");
        if (
          !settlementDetails.beneficiary_name ||
          settlementDetails.beneficiary_name.trim() === ""
        ) {
          missingFields.push("beneficiary_name");
        }
        if (!settlementDetails.settlement_phase)
          missingFields.push("settlement_phase");
        if (!settlementDetails.settlement_ifsc_code)
          missingFields.push("settlement_ifsc_code");
        if (
          !settlementDetails.settlement_bank_account_no ||
          settlementDetails.settlement_bank_account_no.trim() === ""
        ) {
          missingFields.push("settlement_bank_account_no");
        }
        if (missingFields.length > 0) {
          addError(
            result,
            20059,
            `Missing fields in settlement_details: ${missingFields.join(", ")}`
          );
        }
      }
    }

    if (payment.collected_by === "BAP") {
      if (!payment.type || payment.type !== "ON-ORDER") {
        addError(
          result,
          20060,
          `payment.type must be 'ON-ORDER' when collected_by is 'BAP' in /${constants.ON_CONFIRM}`
        );
      }
      if (!payment.status || payment.status !== "PAID") {
        addError(
          result,
          20061,
          `payment.status must be 'PAID' when collected_by is 'BAP' in /${constants.ON_CONFIRM}`
        );
      }
      if (!payment.uri || !/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(payment.uri)) {
        addError(
          result,
          20062,
          `payment.uri must be a valid URL in /${constants.ON_CONFIRM}`
        );
      }
      if (!payment.tl_method || payment.tl_method !== "http/get") {
        addError(
          result,
          20063,
          `payment.tl_method must be 'http/get' when collected_by is 'BAP' in /${constants.ON_CONFIRM}`
        );
      }
      if (payment.params) {
        if (
          !payment.params.currency ||
          !/^[A-Z]{3}$/.test(payment.params.currency)
        ) {
          addError(
            result,
            20064,
            `payment.params.currency must be a valid ISO 4217 code in /${constants.ON_CONFIRM}`
          );
        }
        if (
          !payment.params.transaction_id ||
          typeof payment.params.transaction_id !== "string" ||
          payment.params.transaction_id === ""
        ) {
          addError(
            result,
            20065,
            `payment.params.transaction_id must be a non-empty string in /${constants.ON_CONFIRM}`
          );
        }
      }
    }
       if(payment.type === "ON-FULFILLMENT") {
          if(!payment.status || payment.status == 'NOT_PAID'){
            addError(result, 20069, `payment.status must be 'NOT_PAID' when payment.type is 'ON-FULFILLMENT' in /${constants.CONFIRM}`);
          }
          if (!payment.uri || !/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(payment.uri)) {
            addError(result, 20065, `payment.uri must be a valid URL in /${constants.CONFIRM}`);
          }
          if (!payment.tl_method || payment.tl_method !== "http/get") {
            addError(result, 20066, `payment.tl_method must be 'http/get' when collected_by is 'BAP' in /${constants.CONFIRM}`);
          }
          if (payment.params) {
            if (!payment.params.currency || !/^[A-Z]{3}$/.test(payment.params.currency)) {
              addError(result, 20067, `payment.params.currency must be a valid ISO 4217 code in /${constants.CONFIRM}`);
            }
            if (!payment.params.transaction_id || typeof payment.params.transaction_id !== "string" || payment.params.transaction_id === "") {
              addError(result, 20068, `payment.params.transaction_id must be a non-empty string in /${constants.CONFIRM}`);
            }
          }
        }
    
  } catch (err: any) {
    console.log(`Error validating payment: ${err.stack}`);
    addError(result, 20066, `Error validating payment: ${err.message}`);
  }
};

// Validate tags
const validateTags = async (
  txnId: string,
  tags: any[],
  result: any[]
): Promise<void> => {
  try {
    if (tags?.length) {
      const bppTermsTag = tags.find((tag: any) => tag.code === "bpp_terms");
      if (bppTermsTag) {
        if (!isTagsValid(tags, "bpp_terms")) {
          addError(
            result,
            20067,
            `Tags should have valid gst number and fields in /${constants.ON_CONFIRM}`
          );
        }

        const tagsList = bppTermsTag.list || [];
        const acceptBapTerms = tagsList.filter(
          (item: any) => item.code === "accept_bap_terms"
        );
        if (acceptBapTerms.length > 0) {
          addError(
            result,
            20068,
            `accept_bap_terms is not required in /${constants.ON_CONFIRM}`
          );
        }

        let tax_number: any = {};
        let provider_tax_number: any = {};
        const np_type_on_search = await getRedisValue(
          `${txnId}_${ApiSequence.ON_SEARCH}np_type`
        );

        tagsList.forEach((e: any) => {
          if (e.code === "tax_number") {
            if (!e.value) {
              addError(
                result,
                20069,
                `value must be present for tax_number in /${constants.ON_CONFIRM}`
              );
            } else {
              const taxNumberPattern =
                /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
              if (!taxNumberPattern.test(e.value)) {
                addError(
                  result,
                  20070,
                  `Invalid format for tax_number in /${constants.ON_CONFIRM}`
                );
              }
              if (e.value.length !== 15) {
                addError(
                  result,
                  20071,
                  `tax_number must be 15 digits in /${constants.ON_CONFIRM}`
                );
              }
            }
            tax_number = e;
          }
          if (e.code === "provider_tax_number") {
            if (!e.value) {
              addError(
                result,
                20072,
                `value must be present for provider_tax_number in /${constants.ON_CONFIRM}`
              );
            } else {
              const taxNumberPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
              if (!taxNumberPattern.test(e.value)) {
                addError(
                  result,
                  20073,
                  `Invalid format for provider_tax_number in /${constants.ON_CONFIRM}`
                );
              }
            }
            provider_tax_number = e;
          }
        });

        if (_.isEmpty(tax_number)) {
          addError(
            result,
            20074,
            `tax_number must be present in /${constants.ON_CONFIRM}`
          );
        }
        if (_.isEmpty(provider_tax_number)) {
          addError(
            result,
            20075,
            `provider_tax_number must be present in /${constants.ON_CONFIRM}`
          );
        }

        if (
          tax_number.value?.length === 15 &&
          provider_tax_number?.value?.length === 10 &&
          np_type_on_search
        ) {
          const pan_id = tax_number.value.slice(2, 12);
          if (
            pan_id !== provider_tax_number.value &&
            np_type_on_search === "ISN"
          ) {
            addError(
              result,
              20076,
              `Pan_id is different in tax_number and provider_tax_number in /${constants.ON_CONFIRM}`
            );
          } else if (
            pan_id === provider_tax_number.value &&
            np_type_on_search === "MSN"
          ) {
            addError(
              result,
              20077,
              `Pan_id shouldn't be same in tax_number and provider_tax_number in /${constants.ON_CONFIRM}`
            );
          }
        }
      }

      const bapTermsTag = tags.find((tag: any) => tag.code === "bap_terms");
      if (bapTermsTag) {
        if (!isTagsValid(tags, "bap_terms")) {
          addError(
            result,
            20078,
            `Tags/bap_terms should have valid gst number and fields in /${constants.ON_CONFIRM}`
          );
        }

        const hasStaticTerms = bapTermsTag.list?.some(
          (item: any) => item.code === "static_terms"
        );
        if (hasStaticTerms) {
          addError(
            result,
            20079,
            `static_terms is not required in /${constants.ON_CONFIRM}`
          );
        }

        const bapTaxNumber = bapTermsTag.list?.find(
          (item: any) => item.code === "tax_number"
        )?.value;
        const bppTaxNumber = bppTermsTag?.list?.find(
          (item: any) => item.code === "tax_number"
        )?.value;
        if (
          bapTaxNumber &&
          bppTaxNumber &&
          _.isEqual(bapTaxNumber, bppTaxNumber)
        ) {
          addError(
            result,
            20080,
            `Tags/bap_terms and Tags/bpp_terms should have different gst numbers in /${constants.ON_CONFIRM}`
          );
        }
      }

      const confirmTags = await getRedisValue(`${txnId}_confirm_tags`);
      if (confirmTags && bppTermsTag) {
        const initBppTerms = confirmTags.find(
          (tag: any) => tag.code === "bpp_terms"
        );
        if (initBppTerms && !compareObjects(bppTermsTag, initBppTerms)) {
          console.log(`initBppTerms`, initBppTerms, `bppTermsTag`, bppTermsTag);
          addError(
            result,
            20081,
            `Tags/bpp_terms should match /${constants.CONFIRM} in /${constants.ON_CONFIRM}`
          );
        }
      }

      await RedisService.setKey(
        `${txnId}_on_confirm_tags`,
        JSON.stringify(tags),
        TTL_IN_SECONDS
      );
      if (bppTermsTag) {
        await RedisService.setKey(
          `${txnId}_list_ON_CONFIRM`,
          JSON.stringify(bppTermsTag.list),
          TTL_IN_SECONDS
        );
      }
    }
  } catch (err: any) {
    addError(result, 20082, `Error validating tags: ${err.message}`);
  }
};

const on_confirm = async (data: any) => {
  const { context, message } = data;
  const result: any[] = [];
  const txnId = context?.transaction_id;
  const flow = "2";

  try {
    await contextChecker(
      context,
      result,
      constants.ON_CONFIRM,
      constants.CONFIRM
    );
  } catch (err: any) {
    addError(result, 20000, `Error checking context: ${err.message}`);
    return result;
  }

  try {
    const order = message.order;

    await RedisService.setKey(
      `${txnId}_${ApiSequence.ON_CONFIRM}`,
      JSON.stringify(data),
      TTL_IN_SECONDS
    );

    await validateOrder(txnId, order, context, result);
    await validateProvider(txnId, order.provider, result);
    await validateItems(txnId, order.items, context, result);
    await validateFulfillments(txnId, order.fulfillments, result);
    await validateBilling(txnId, order.billing, context, result);
    await validateQuote(txnId, order.quote, context, result);
    await validatePayment(
      txnId,
      order.payment,
      order.quote,
      context,
      flow,
      result
    );
    await validateTags(txnId, order.tags, result);

    await storeOrder(txnId, order, result);
    await storeBilling(txnId, order.billing, result);
    await storeQuote(txnId, order.quote, result);
    await storePayment(txnId, order.payment, result);

    return result;
  } catch (err: any) {
    console.error(
      `!!Some error occurred while checking /${constants.ON_CONFIRM} API, ${err.stack}`
    );
    addError(result, 20083, `Unexpected error: ${err.message}`);
    return result;
  }
};

export default on_confirm;
