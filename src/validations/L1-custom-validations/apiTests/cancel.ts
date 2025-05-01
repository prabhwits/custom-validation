import _ from "lodash";
import constants, {
  ApiSequence,
  buyerCancellationRid,
} from "../../../utils/constants";
import {
  isObjectEmpty,
  checkContext,
  checkBppIdOrBapId,
  addMsgIdToRedisSet,
  isValidISO8601Duration,
} from "../../../utils/helper";
import { RedisService } from "ondc-automation-cache-lib";

export const cancel = async (data: any) => {
  const TTL_IN_SECONDS: number = Number(process.env.TTL_IN_SECONDS) || 3600;
  const result: any[] = [];
  try {
    if (!data || isObjectEmpty(data)) {
      result.push({
        valid: false,
        code: 40000,
        description: `JSON cannot be empty in /${constants.CANCEL}`,
      });
      return result;
    }

    const { message, context }: any = data;
    if (!message || !context || isObjectEmpty(message)) {
      result.push({
        valid: false,
        code: 40000,
        description: "/context, /message, is missing or empty",
      });
      return result;
    }

    const searchContextKey = `${context.transaction_id}_${ApiSequence.SEARCH}_context`;
    const domainKey = `${context.transaction_id}_domain`;
    const timestampKey = `${context.transaction_id}_tmpstmp`;
    const confirmOrderIdKey = `${context.transaction_id}_cnfrmOrdrId`;
    const cancelMsgIdKey = `${context.transaction_id}_${ApiSequence.CANCEL}_msgId`;
    const cancelDataKey = `${context.transaction_id}_${ApiSequence.CANCEL}`;
    const cancelReasonIdKey = `${context.transaction_id}_cnclRid`;

    // Retrieve search context from Redis
    const searchContextRaw = await RedisService.getKey(searchContextKey);
    const searchContext = searchContextRaw
      ? JSON.parse(searchContextRaw)
      : null;

    const contextRes: any = checkContext(context, constants.CANCEL);

    const checkBap = checkBppIdOrBapId(context.bap_id);
    const checkBpp = checkBppIdOrBapId(context.bpp_id);

    if (checkBap) {
      result.push({
        valid: false,
        code: 40000,
        description: "context/bap_id should not be a url",
      });
    }
    if (checkBpp) {
      result.push({
        valid: false,
        code: 40000,
        description: "context/bpp_id should not be a url",
      });
    }

    if (!contextRes?.valid) {
      contextRes.ERRORS.forEach((error: any) => {
        result.push({
          valid: false,
          code: 40000,
          description: error.message,
        });
      });
    }

    try {
      console.info(`Adding Message Id /${constants.CANCEL}`);
      await RedisService.setKey(
        `${cancelMsgIdKey}`,
        data.context.message_id,
        TTL_IN_SECONDS
      );

      const isMsgIdNotPresent = await addMsgIdToRedisSet(
        context.transaction_id,
        context.message_id,
        ApiSequence.CANCEL
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
        `!!Error while checking message id for /${constants.CANCEL}, ${error.stack}`
      );
    }

    try {
      const storedDomainRaw = await RedisService.getKey(domainKey);
      const storedDomain = storedDomainRaw ? JSON.parse(storedDomainRaw) : null;
      if (!_.isEqual(context.domain.split(":")[1], storedDomain)) {
        result.push({
          valid: false,
          code: 40000,
          description: `Domain should be same in each action in /${context.action}`,
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while checking domain for /${constants.CANCEL}, ${error.stack}`
      );
    }

    // Store cancel data
    await RedisService.setKey(
      cancelDataKey,
      JSON.stringify(data),
      TTL_IN_SECONDS
    );

    try {
      console.info(`Checking context for /${constants.CANCEL} API`);
      const res: any = checkContext(context, constants.CANCEL);
      if (!res.valid) {
        res.ERRORS.forEach((error: any) => {
          result.push({
            valid: false,
            code: 40000,
            description: error.message,
          });
        });
      }
    } catch (error: any) {
      console.error(
        `!!Some error occurred while checking /${constants.CANCEL} context, ${error.stack}`
      );
    }

    try {
      console.info(
        `Comparing city of /${constants.SEARCH} and /${constants.CANCEL}`
      );
      if (!_.isEqual(searchContext?.city, context.city)) {
        result.push({
          valid: false,
          code: 40000,
          description: `City code mismatch in /${constants.SEARCH} and /${constants.CANCEL}`,
        });
      }
    } catch (error: any) {
      console.error(
        `!!Error while comparing city in /${constants.SEARCH} and /${constants.CANCEL}, ${error.stack}`
      );
    }

    try {
      console.info(
        `Comparing timestamp of /${constants.ON_INIT} and /${constants.CANCEL}`
      );
      const storedTimestampRaw = await RedisService.getKey(timestampKey);
      const storedTimestamp = storedTimestampRaw
        ? JSON.parse(storedTimestampRaw)
        : null;
      if (_.gte(storedTimestamp, context.timestamp)) {
        result.push({
          valid: false,
          code: 40000,
          description: `Timestamp for /${constants.ON_INIT} api cannot be greater than or equal to /${constants.CANCEL} api`,
        });
      }
      await RedisService.setKey(
        timestampKey,
        JSON.stringify(context.timestamp),
        TTL_IN_SECONDS
      );
    } catch (error: any) {
      console.error(
        `!!Error while comparing timestamp for /${constants.ON_INIT} and /${constants.CANCEL} api, ${error.stack}`
      );
    }

    try {
      console.info(
        `Comparing transaction Ids of /${constants.SELECT} and /${constants.CANCEL}`
      );
      const cancel = message;

      try {
        console.info(
          `Comparing order Id in /${constants.CANCEL} and /${constants.CONFIRM}`
        );
        const confirmOrderIdRaw = await RedisService.getKey(confirmOrderIdKey);
        const confirmOrderId = confirmOrderIdRaw
          ? JSON.parse(confirmOrderIdRaw)
          : null;
        if (cancel.order_id !== confirmOrderId) {
          result.push({
            valid: false,
            code: 30018,
            description: `Order Id in /${constants.CANCEL} and /${constants.CONFIRM} do not match`,
          });
        }
      } catch (error: any) {
        console.info(
          `Error while comparing order id in /${constants.CANCEL} and /${constants.CONFIRM}, ${error.stack}`
        );
      }
    } catch (error: any) {
      console.error(
        `!!Error while comparing transaction Ids of /${constants.SELECT} and /${constants.CANCEL}, ${error.stack}`
      );
    }
    const cancel = message;

    try {
      console.info("Checking the validity of cancellation reason id for buyer");
      if (!buyerCancellationRid.has(cancel?.cancellation_reason_id)) {
        console.info(
          `cancellation_reason_id should be a valid cancellation id (buyer app initiated)`
        );
        result.push({
          valid: false,
          code: 30012,
          description: `Cancellation reason id is not a valid reason id (buyer app initiated)`,
        });
      } else {
        await RedisService.setKey(
          cancelReasonIdKey,
          JSON.stringify(cancel?.cancellation_reason_id),
          TTL_IN_SECONDS
        );
      }
    } catch (error: any) {
      console.info(
        `Error while checking validity of cancellation reason id /${constants.CANCEL}, ${error.stack}`
      );
    }

    if (cancel.descriptor) {
      const { name, short_desc, tags } = cancel.descriptor;

      // Validate descriptor fields
      if (!name || name !== "fulfillment") {
        result.push({
          valid: false,
          code: 40000,
          description: `message/descriptor/name must be 'fulfillment' in /${constants.CANCEL}`,
        });
      }
      if (!short_desc) {
        result.push({
          valid: false,
          code: 40000,
          description: `message/descriptor/short_desc is missing in /${constants.CANCEL}`,
        });
      }

      // Validate tags array
      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        result.push({
          valid: false,
          code: 40000,
          description: `message/descriptor/tags is missing or invalid in /${constants.CANCEL}`,
        });
      } else {
        const paramsTag = tags.find((tag: any) => tag.code === "params");
        console.log("paramTag", paramsTag);
        if (!paramsTag || !paramsTag.list || !Array.isArray(paramsTag.list)) {
          result.push({
            valid: false,
            code: 40000,
            description: `message/descriptor/tags must contain a 'params' tag with a valid list in /${constants.CANCEL}`,
          });
        } else {
          const forceParam = paramsTag.list.find(
            (item: any) => item.code === "force"
          );
          const ttlResponseParam = paramsTag.list.find(
            (item: any) => item.code === "ttl_response"
          );

          console.log("forceParam", forceParam);

          // Validate force parameter
          if (!forceParam || !forceParam.code) {
            result.push({
              valid: false,
              code: 40000,
              description: `message/descriptor/tags/params must contain a 'force' parameter in /${constants.CANCEL}`,
            });
          } else if (!["yes", "no"].includes(forceParam.value)) {
            result.push({
              valid: false,
              code: 30024,
              description: `message/descriptor/tags/params/force must be 'yes' or 'no' in /${constants.CANCEL}`,
            });
          }

          // Validate ttl_response parameter
          if (!ttlResponseParam || !ttlResponseParam.value) {
            result.push({
              valid: false,
              code: 40000,
              description: `message/descriptor/tags/params must contain a 'ttl_response' parameter in /${constants.CANCEL}`,
            });
          } else if (!isValidISO8601Duration(ttlResponseParam.value)) {
            result.push({
              valid: false,
              code: 30025,
              description: `message/descriptor/tags/params/ttl_response must be a valid ISO8601 duration in /${constants.CANCEL}`,
            });
          }
        }
      }
    }

    // Store confirm data
    await RedisService.setKey(
      `${context.transaction_id}_${ApiSequence.CANCEL}`,
      JSON.stringify(data),
      TTL_IN_SECONDS
    );

    return result;
  } catch (err: any) {
    console.error(
      `!!Some error occurred while checking /${constants.CANCEL} API, ${err.stack}`
    );
    result.push({
      valid: false,
      code: 40000,
      description: `Some error occurred while checking /${constants.CANCEL} API`,
    });
    return result;
  }
};
