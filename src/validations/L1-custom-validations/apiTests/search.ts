import constants, { ApiSequence } from "../../../utils/constants";
import {
  checkGpsPrecision,
  isObjectEmpty,
  hasProperty,
  checkContext,
  checkTagConditions,
  addMsgIdToRedisSet,
  addActionToRedisSet,
} from "../../../utils/helper";
import { bap_features } from "../../../utils/bap_features";
import { RedisService } from "ondc-automation-cache-lib";

const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;

interface ValidationError {
  valid: boolean;
  code: number;
  description: string;
}

type ValidationOutput = ValidationError[];

export default async function search(payload: any): Promise<ValidationOutput> {
  const result: ValidationOutput = [];
  const addError = (code: number, description: string) => {
    result.push({ valid: false, code, description });
  };

  try {
    console.info(
      `Checking JSON structure and required fields for ${ApiSequence.SEARCH} API`
    );

    if (!payload || isObjectEmpty(payload)) {
      addError(40000, "Payload is missing or empty");
      return result;
    }

    const { context, message } = payload;
    if (
      !context ||
      !message ||
      !message.intent ||
      isObjectEmpty(message.intent)
    ) {
      addError(
        40000,
        "/context, /message, or /message/intent is missing or empty"
      );
      return result;
    }

    if (!context.transaction_id) {
      addError(40000, "Transaction_id is missing");
      return result;
    }

    try {
      const previousCallPresent = await addActionToRedisSet(
        context.transaction_id,
        ApiSequence.SEARCH,
        ApiSequence.SEARCH
      );
      if (!previousCallPresent) {
        result.push({
          valid: false,
          code: 20009,
          description: `Previous call doesn't exist`,
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while previous action call /${constants.SEARCH}, ${error.stack}`
      );
    }
    // Validate message.intent
    const { intent } = message;

    // Payment validation
    if (!intent.payment) {
      addError(40000, "intent.payment is required");
    } else {
      const payment = intent.payment;
      if (!payment["@ondc/org/buyer_app_finder_fee_type"]) {
        addError(
          40000,
          "payment.@ondc/org/buyer_app_finder_fee_type is required"
        );
      } else if (
        !["percent", "amount"].includes(
          payment["@ondc/org/buyer_app_finder_fee_type"]
        )
      ) {
        addError(
          40000,
          'payment.@ondc/org/buyer_app_finder_fee_type must be "percent" or "amount"'
        );
      }

      if (!payment["@ondc/org/buyer_app_finder_fee_amount"]) {
        addError(
          40000,
          "payment.@ondc/org/buyer_app_finder_fee_amount is required"
        );
      } else if (
        !/^(\d*.?\d{1,2})$/.test(
          payment["@ondc/org/buyer_app_finder_fee_amount"]
        )
      ) {
        addError(
          40000,
          "payment.@ondc/org/buyer_app_finder_fee_amount must be a valid decimal number"
        );
      }

      const buyerFF = parseFloat(
        payment["@ondc/org/buyer_app_finder_fee_amount"]
      );

      if (!isNaN(buyerFF)) {
        await RedisService.setKey(
          `${context.transaction_id}_${ApiSequence.SEARCH}_buyerFF`,
          JSON.stringify(buyerFF),
          TTL_IN_SECONDS
        );
      } else {
        addError(
          40000,
          "payment.@ondc/org/buyer_app_finder_fee_amount must be a valid number"
        );
      }
    }

    // Fulfillment validation
    if (intent.fulfillment) {
      const { fulfillment } = intent;
      if (
        fulfillment.type &&
        !["Delivery", "Self-Pickup", "Buyer-Delivery"].includes(
          fulfillment.type
        )
      ) {
        addError(
          40000,
          "fulfillment.type must be one of: Delivery, Self-Pickup, Buyer-Delivery"
        );
      }

      if (fulfillment.end) {
        const { location } = fulfillment.end;
        if (!location) {
          addError(40000, "fulfillment.end.location is required");
        } else {
          if (!location.gps) {
            addError(40000, "location.gps is required");
          } else if (!checkGpsPrecision(location.gps)) {
            addError(40000, "location.gps must have at least 4 decimal places");
          }

          if (!location.address) {
            addError(40000, "location.address is required");
          } else if (!location.address.area_code) {
            addError(40000, "location.address.area_code is required");
          }
        }
      }
    }

    // Item validation
    if (intent.item) {
      if (!intent.item.descriptor) {
        addError(40000, "item.descriptor is required");
      } else if (!intent.item.descriptor.name) {
        addError(40000, "item.descriptor.name is required");
      }
    }

    // Category validation
    if (intent.category && !intent.category.id) {
      addError(40000, "category.id is required");
    }

    // Mutual exclusivity of item and category
    if (hasProperty(intent, "item") && hasProperty(intent, "category")) {
      addError(
        40000,
        "/message/intent cannot have both properties item and category"
      );
    }

    // Tags validation
    if (intent.tags) {
      if (!Array.isArray(intent.tags) || intent.tags.length === 0) {
        addError(40000, "tags must be a non-empty array");
      } else {
        const validTagCodes = [
          "catalog_full",
          "catalog_inc",
          "bap_terms",
          "bap_features",
        ];
        let hasValidTag = false;

        for (const tag of intent.tags) {
          if (!tag.code) {
            addError(40000, "tag.code is required");
            continue;
          }

          if (!validTagCodes.includes(tag.code)) {
            addError(
              40000,
              `tag.code must be one of: ${validTagCodes.join(", ")}`
            );
            continue;
          }

          if (!tag.list || !Array.isArray(tag.list) || tag.list.length === 0) {
            addError(40000, "tag.list must be a non-empty array");
            continue;
          }

          hasValidTag = true;

          try {
            switch (tag.code) {
              case "bnp_demand_signal":
                const searchTermTag = tag.list.find(
                  (item: any) => item.code === "search_term"
                );

                if (!searchTermTag) {
                  addError(
                    40000,
                    `"bnp_demand_signal" tag must include code "search_term"`
                  );
                } else {
                  try {
                    const parsedValue = JSON.parse(searchTermTag.value);

                    if (!Array.isArray(parsedValue)) {
                      addError(
                        40000,
                        `"search_term" value must be a JSON array`
                      );
                    } else {
                      for (const obj of parsedValue) {
                        if (
                          typeof obj !== "object" ||
                          Array.isArray(obj) ||
                          obj === null ||
                          Object.keys(obj).length !== 1 ||
                          typeof Object.keys(obj)[0] !== "string"
                        ) {
                          addError(
                            40000,
                            `"search_term" must contain string-keyed single-entry objects like {"sweater"}`
                          );
                          break;
                        }
                      }
                    }
                  } catch {
                    addError(
                      40000,
                      `"search_term" value must be a valid stringified JSON array`
                    );
                  }
                }
                break;

              case "catalog_full":
                const payloadType = tag.list.find(
                  (item: any) => item.code === "payload_type"
                );
                if (!payloadType) {
                  addError(
                    40000,
                    'catalog_full tag must contain code "payload_type"'
                  );
                } else if (!["link", "inline"].includes(payloadType.value)) {
                  addError(
                    40000,
                    'payload_type value must be either "link" or "inline"'
                  );
                }
                else if(payloadType.value === "link") {
                  await RedisService.setKey(
                    `${context.transaction_id}_${ApiSequence.SEARCH}_payload_type`,
                    payloadType.value,
                    TTL_IN_SECONDS
                  );
                }
                break;

              case "catalog_inc":
                const hasMode = tag.list.some(
                  (item: any) => item.code === "mode"
                );
                const hasStartTime = tag.list.some(
                  (item: any) => item.code === "start_time"
                );
                const hasEndTime = tag.list.some(
                  (item: any) => item.code === "end_time"
                );

                if (!hasMode && !(hasStartTime && hasEndTime)) {
                  addError(
                    40000,
                    'catalog_inc tag must contain either "mode" or both "start_time" and "end_time"'
                  );
                }
                break;

              case "bap_terms":
                const staticTerms = tag.list.find(
                  (item: any) => item.code === "static_terms"
                );
                const staticTermsNew = tag.list.find(
                  (item: any) => item.code === "static_terms_new"
                );
                const effectiveDate = tag.list.find(
                  (item: any) => item.code === "effective_date"
                );

                if (!staticTerms) {
                  addError(
                    40000,
                    `"bap_terms" tag must include code "static_terms"`
                  );
                }

                if (
                  !staticTermsNew ||
                  !/^https:\/\/.+/.test(staticTermsNew.value)
                ) {
                  addError(
                    40000,
                    `"bap_terms" tag must include valid "static_terms_new" with an HTTPS URL`
                  );
                }

                if (!effectiveDate || isNaN(Date.parse(effectiveDate.value))) {
                  addError(
                    40000,
                    `"bap_terms" tag must include valid "effective_date" in ISO format`
                  );
                } else {
                  const effective = new Date(effectiveDate.value);
                  const timestamp = new Date(context.timestamp);
                  if (effective > timestamp) {
                    addError(
                      40000,
                      `"effective_date" must be less than or equal from timestamp`
                    );
                  }
                }
                break;

              case "bap_features":
                if (!Array.isArray(tag.list)) {
                  addError(40000, "bap_features list must be an array");
                } else {
                  const validFeatureCodes = Object.keys(bap_features);

                  for (const feature of tag.list) {
                    if (!feature.code) {
                      addError(40000, "Each bap_feature must have a 'code'");
                      continue;
                    }

                    if (!validFeatureCodes.includes(feature.code)) {
                      addError(
                        40000,
                        `bap_feature code '${feature.code}' is not valid`
                      );
                    }

                    if (
                      typeof feature.value !== "string" ||
                      !["yes", "no"].includes(feature.value.toLowerCase())
                    ) {
                      addError(
                        40000,
                        `bap_feature '${feature.code}' has invalid value '${feature.value}'. Expected 'yes' or 'no'`
                      );
                    }

                    // Optional Redis store for enabled features
                    if (
                      validFeatureCodes.includes(feature.code) &&
                      feature.value.toLowerCase() === "yes"
                    ) {
                      const redisKey = `${context.transaction_id}_${feature.code}_enabled`;
                      await RedisService.setKey(
                        redisKey,
                        "true",
                        TTL_IN_SECONDS
                      );
                    }
                  }
                }
                break;

              default:
                // No validation required
                break;
            }
          } catch (err) {
            console.error("Error during tag validation:", err);
            addError(
              23001,
              "Internal server error during tag validation,The response could not be processed due to an internal error"
            );
          }

          for (const item of tag.list) {
            if (!("code" in item)) {
              addError(40000, "tag.list item code is required");
            }
            if (!("value" in item)) {
              addError(40000, "tag.list item value is required");
            }
          }
        }

        if (!hasValidTag) {
          addError(40000, "tags must contain at least one valid tag");
        }

        const tagErrors = await checkTagConditions(
          message,
          context,
          ApiSequence.SEARCH
        );
        if (tagErrors?.length) {
          tagErrors.forEach((err) => addError(40000, err));
        }
      }
    }

    // Redis operations for message ID and domain
    try {
      console.info(`Adding Message Id /${constants.SEARCH}`);
      const isMsgIdNotPresent = await addMsgIdToRedisSet(
        context.transaction_id,
        context.message_id,
        ApiSequence.SEARCH
      );
      if (!isMsgIdNotPresent) {
        result.push({
          valid: false,
          code: 20000,
          description: `Message id should not be same with previous calls`,
        });
      }
      await RedisService.setKey(
        `${context.transaction_id}_${ApiSequence.SEARCH}_msgId`,
        context.message_id,
        TTL_IN_SECONDS
      );
    } catch (error: any) {
      console.error(
        `!!Error while checking message id for /${constants.SEARCH}, ${error.stack}`
      );
    }

    const domainParts = context.domain?.split(":");
    if (domainParts?.[1]) {
      await RedisService.setKey(
        `${context.transaction_id}_domain`,
        domainParts[1],
        TTL_IN_SECONDS
      );
    }

    console.info(
      `Checking for context in /context for ${constants.SEARCH} API`
    );
    const contextRes: any = checkContext(payload.context, constants.SEARCH);

    await RedisService.setKey(
      `${context?.transaction_id}_${ApiSequence.SEARCH}_context`,
      JSON.stringify(payload.context),
      TTL_IN_SECONDS
    );

    if (!contextRes?.valid) {
      const errors = contextRes?.ERRORS;
      Object.keys(errors).forEach((key: string) =>
        addError(40000, errors[key] || "Context validation failed")
      );
    }
    return result;
  } catch (error: any) {
    console.error(`Error in /${ApiSequence.SEARCH}: ${error.stack}`);
    addError(
      40000,
      `Business Error - A generic business error: ${error.message}`
    );
    return result;
  }
}
