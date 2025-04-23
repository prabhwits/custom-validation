// import { RedisService } from "ondc-automation-cache-lib";
// import logger from "../utils/logger";
// import {
// 	Expectation,
// 	RequestProperties,
// 	SessionCache,
// 	SubscriberCache,
// 	TransactionCache,
// } from "../types/cache-types";
// import { ApiServiceRequest } from "../types/request-types";

// export class SessionService {
// 	receiveRequest = async (
// 		body: any,
// 		action: string,
// 		subscriberUrl: string
// 	): Promise<RequestProperties> => {
// 		const transactionId = body.context.transaction_id;
// 		logger.info(
// 			`received request for action ${action} and transactionId ${transactionId} from subscriber ${subscriberUrl}`
// 		);
// 		const subscriberData = (await this.loadCache(
// 			subscriberUrl,
// 			"subscriber"
// 		)) as SubscriberCache | undefined;
// 		if (!subscriberData) {
// 			logger.info(`no cache found for subscriber ${subscriberUrl}`);
// 			return this.getDefaultProperties(body, action, subscriberUrl);
// 		}
// 		const fulfilledExpectation = await this.tryFulfillExpectation(
// 			subscriberData.activeSessions,
// 			action,
// 			transactionId
// 		);
// 		if (subscriberData.activeSessions.length === 0) {
// 			logger.info(
// 				`no active sessions found for subscriber ${subscriberUrl} and deleting subscriber the cache`
// 			);
// 			await this.deleteCache(subscriberUrl);
// 			return this.getDefaultProperties(body, action, subscriberUrl);
// 		} else {
// 			logger.info(
// 				`active sessions found for subscriber ${subscriberUrl} and updating the cache`
// 			);
// 			await this.saveCache(subscriberUrl, subscriberData);
// 		}
// 		if (fulfilledExpectation) {
// 			const sessionCache = (await this.loadCache(
// 				fulfilledExpectation.sessionId,
// 				"session"
// 			)) as SessionCache | undefined;
// 			if (!sessionCache) {
// 				logger.info(
// 					`no cache found for session ${fulfilledExpectation.sessionId}`
// 				);
// 				return this.getDefaultProperties(body, action, subscriberUrl);
// 			}
// 			return {
// 				transactionId: transactionId,
// 				action: action,
// 				subscriberUrl: subscriberUrl,
// 				defaultMode: false,
// 				difficulty: sessionCache.sessionDifficulty,
// 				sessionId: fulfilledExpectation.sessionId,
// 				flowId: fulfilledExpectation.flowId,
// 				env: sessionCache.env ?? "STAGING",
// 			};
// 		}
// 		return this.getDefaultProperties(body, action, subscriberUrl);
// 	};

// 	tryFulfillExpectation = async (
// 		expectations: Expectation[],
// 		action: string,
// 		transactionId: string
// 	) => {
// 		this.checkExpiredExpectations(expectations);

// 		const secondTarget = expectations.find((e) => e.expectedAction === action);
// 		if (secondTarget) {
// 			logger.info(
// 				`New expectation found for action ${action} and transactionId ${transactionId}`
// 			);
// 			return secondTarget;
// 		}
// 		logger.info(
// 			`no expectation found for action ${action} and transactionId ${transactionId}`
// 		);
// 		return undefined;
// 	};

// 	checkExpiredExpectations = (expectations: Expectation[]) => {
// 		const now = Date.now();
// 		for (let i = 0; i < expectations.length; i++) {
// 			const expect = expectations[i];
// 			if (new Date(expect.expireAt).getTime() < now) {
// 				logger.info(`${JSON.stringify(expect)} has expired removing it`);
// 			}
// 			expectations.filter((e) => e.expireAt !== expect.expireAt);
// 		}
// 		return expectations;
// 	};

// 	getDefaultProperties = async (
// 		body: any,
// 		action: string,
// 		subscriberUrl: string
// 	) => {
// 		const transactionId = body.context.transaction_id;
// 		return {
// 			transactionId: transactionId,
// 			action: action,
// 			subscriberUrl: subscriberUrl,
// 			defaultMode: true,
// 			env: "STALLING",
// 			difficulty: {
// 				sensitiveTTL: true,
// 				useGateway: true,
// 				stopAfterFirstNack: false,
// 				protocolValidations: true,
// 				timeValidations: true,
// 				headerValidaton: true,
// 			},
// 		};
// 	};

// 	loadCache = async (
// 		key: string,
// 		type: "transaction" | "session" | "subscriber"
// 	) => {
// 		try {
// 			logger.info(`loading ${type} cache for key ${key}`);
// 			if (await RedisService.keyExists(key)) {
// 				const data = await RedisService.getKey(key);
// 				if (data === null) return undefined;
// 				const parsedData = JSON.parse(data);
// 				logger.info(`loaded ${type} cache for key ${key}`);
// 				switch (type) {
// 					case "transaction":
// 						return parsedData as TransactionCache;
// 					case "session":
// 						return parsedData as SessionCache;
// 					case "subscriber":
// 						return parsedData as SubscriberCache;
// 				}
// 			}
// 			logger.info(`no cache found for key ${key}`);
// 			return undefined;
// 		} catch (e) {
// 			logger.error(`failed to load ${type} cache for key ${key}`, e);
// 			return undefined;
// 		}
// 	};

// 	saveCache = async (key: string, jsonData: any) => {
// 		try {
// 			logger.info(`saving cache for key ${key}`);
// 			await RedisService.setKey(key, JSON.stringify(jsonData));
// 		} catch (err) {
// 			logger.error(`failed to save cache for key ${key}`, err);
// 		}
// 	};

// 	deleteCache = async (key: string) => {
// 		try {
// 			logger.info(`deleting cache for key ${key}`);
// 			await RedisService.deleteKey(key);
// 		} catch (err) {
// 			logger.error(`failed to delete cache for key ${key}`, err);
// 		}
// 	};

// 	createTransactionCache = async (
// 		transactionId: string,
// 		action: string,
// 		time: string
// 	) => {
// 		const transactionCache: TransactionCache = {
// 			latestAction: action,
// 			latestTimestamp: time,
// 			messageIds: [],
// 			apiList: [],
// 			type: "default",
// 		};
// 		await this.saveCache(transactionId, transactionCache);
// 		return transactionCache;
// 	};

// 	updateTransactionCache = async (
// 		payloadId: string,
// 		reqBody: any,
// 		resBody: any
// 	) => {
// 		const transactionId = reqBody.context.transaction_id;
// 		let transactionCache = (await this.loadCache(
// 			transactionId,
// 			"transaction"
// 		)) as TransactionCache | undefined;
// 		if (!transactionCache)
// 			transactionCache = await this.createTransactionCache(
// 				transactionId,
// 				reqBody.context.action,
// 				reqBody.context.timestamp
// 			);
// 		else {
// 			transactionCache.apiList.push({
// 				action: reqBody.context.action,
// 				payloadId: payloadId,
// 				messageId: reqBody.context.message_id,
// 				response: resBody,
// 				timestamp: reqBody.context.timestamp,
// 			});
// 			transactionCache.latestAction = reqBody.context.action;
// 			transactionCache.latestTimestamp = reqBody.context.timestamp;
// 			transactionCache.messageIds.push(reqBody.context.message_id);
// 			await this.saveCache(transactionId, transactionCache);
// 		}
// 	};
// }

// /*
//     1. listen to a api request
//     2. compute its subscriber url
//     3. get transaction_id from the payload
//     4. check if that transactionId is expected in the subscriber cache
//     5. if yes, then fulfill the expectation
//     6. if no then just use default forwarding

//     ? fulfillment of the expectation
//         1. if transaction id is expected the append to that flow
//         2. there cannot be more than one expectation of same action with no transaction id
// */
