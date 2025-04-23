import axios from "axios";
import logger from "../utils/logger";
import { RedisService } from "ondc-automation-cache-lib";
import { TransactionCacheService } from "./session-service-rewrite";
import { generateHash } from "../utils/hash";

export class DataService {
	saveSessionToDB = async (
		subscriberUri: string,
		payload: any,
		reqHeader: any,
		response: any,
		code: number,
		requestId: string
	) => {
		try {
			logger.info("Saving data to DB");
			const dbUrl = process.env.DATA_BASE_URL;
			const sessionData =
				await new TransactionCacheService().tryLoadTransaction(
					payload.context.transaction_id,
					subscriberUri
				);
			let key = `${new TransactionCacheService().createTransactionKey(
				payload.context.transaction_id,
				subscriberUri
			)}`;
			key = generateHash(key);
			if (sessionData === undefined) {
				logger.error(
					"Session data not found for subscriber URL: skipping persistent saving " +
						subscriberUri
				);
				return;
			}
			const checkSessionUrl = `${dbUrl}/api/sessions/check/${
				sessionData.sessionId ?? key
			}`;
			const postUrl = `${dbUrl}/api/sessions`;
			const exists = await axios.get(checkSessionUrl);
			if (!exists.data) {
				logger.info("Session does not exist in DB, creating new session");
				const sessionPayload = {
					sessionId: sessionData.sessionId ?? key,
					npType: sessionData.subscriberType,
					npId: sessionData,
					domain: payload.context.domain,
					version: payload.context.version ?? payload.context.core_version,
					sessionType: "AUTOMATION",
					sessionActive: true,
				};
				await axios.post(postUrl, sessionPayload);
			}
			const action = payload.context.action as string;

			const requestBody = {
				messageId: payload.context.message_id,
				transactionId: payload.context.transaction_id,
				payloadId: requestId,
				action: action.toUpperCase(),
				bppId: payload.context.bpp_id ?? "",
				bapId: payload.context.bap_id,
				reqHeader: reqHeader,
				jsonRequest: payload,
				jsonResponse: { response: response },
				httpStatus: code,
				flowId: sessionData.flowId,
				sessionDetails: {
					sessionId: sessionData.sessionId ?? key,
				},
			};

			const res = await axios.post(postUrl + "/payload", requestBody);
			logger.info(
				`Data saved to DB with response: ${res.data} and payloadID: ${requestId}`
			);
		} catch (error) {
			logger.error("Error in saving data to DB ", error);
		}
	};
	checkSessionExistence = async (subscriberUri: string) => {
		return await RedisService.keyExists(subscriberUri);
	};
}
