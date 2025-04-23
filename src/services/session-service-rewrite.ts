import { RedisService } from "ondc-automation-cache-lib";
import logger from "../utils/logger";
import {
	Expectation,
	RequestProperties,
	SessionCache,
	SubscriberCache,
	TransactionCache,
} from "../types/cache-types";
import { BecknContext } from "../models/beckn-types";

export class SessionManagementService {
	transactionService: TransactionCacheService;
	sessionService: SessionCacheService;
	subscriberService: SubscriberCacheService;
	constructor() {
		this.transactionService = new TransactionCacheService();
		this.sessionService = new SessionCacheService();
		this.subscriberService = new SubscriberCacheService();
	}
	receiveRequestFromNp = async (
		body: any,
		action: string,
		subscriberUrl: string,
		subscriberType: "BAP" | "BPP"
	): Promise<RequestProperties> => {
		const txnId = body.context.transaction_id;
		logger.info(
			`received request for action ${action} and transactionId ${txnId} from subscriber ${subscriberUrl}`
		);
		if (
			await this.transactionService.checkIfTransactionExists(
				this.transactionService.createTransactionKey(txnId, subscriberUrl)
			)
		) {
			return await this.handleExistingTransaction(txnId, action, subscriberUrl);
		} else {
			if (await this.subscriberService.checkIfSubscriberExists(subscriberUrl)) {
				const subscriber =
					await this.subscriberService.loadSubscriberThatExists(subscriberUrl);
				const fulfilled = await this.tryFulfillExpectation(
					subscriber,
					subscriberUrl,
					action
				);
				if (fulfilled) {
					const sessionData = await this.sessionService.loadSessionThatExists(
						fulfilled.sessionId
					);

					if (sessionData.flowMap[fulfilled.flowId] === undefined) {
						await this.assignTransactionToSession(
							fulfilled.sessionId,
							fulfilled.flowId,
							txnId
						);
					}

					return {
						action: action,
						transactionId: txnId,
						subscriberUrl: subscriberUrl,
						subscriberType: subscriberType,
						defaultMode: false,
						sessionId: fulfilled.sessionId,
						flowId: fulfilled.flowId,
						difficulty: sessionData.sessionDifficulty,
					};
				}
			}
			return await this.getDefaultProperties(
				action,
				txnId,
				subscriberUrl,
				subscriberType
			);
		}
	};

	receiveRequestFromMock = async (
		body: any,
		action: string,
		subscriberUrl: string,
		subscriberType: "BAP" | "BPP",
		sessionId?: string,
		flowId?: string
	): Promise<RequestProperties> => {
		const txnId = body.context.transaction_id;
		if (
			await this.transactionService.checkIfTransactionExists(
				this.transactionService.createTransactionKey(txnId, subscriberUrl)
			)
		) {
			return await this.handleExistingTransaction(txnId, action, subscriberUrl);
		}
		logger.info(
			`received request for action ${action} and transactionId ${txnId} from mock with session ${
				sessionId ?? "default"
			}`
		);
		if (flowId && sessionId) {
			const session = await this.sessionService.loadSessionThatExists(
				sessionId
			);
			if (session.flowMap[flowId] === undefined) {
				await this.assignTransactionToSession(sessionId, flowId, txnId);
			}
			return {
				action: action,
				transactionId: txnId,
				subscriberUrl: subscriberUrl,
				subscriberType: subscriberType,
				defaultMode: false,
				sessionId: sessionId,
				flowId: flowId,
				difficulty: session.sessionDifficulty,
			};
		}
		return await this.getDefaultProperties(
			action,
			txnId,
			subscriberUrl,
			subscriberType
		);
	};

	handleExistingTransaction = async (
		txnId: string,
		action: string,
		subscriberUrl: string
	) => {
		const transaction = await this.transactionService.loadTransactionThatExists(
			this.transactionService.createTransactionKey(txnId, subscriberUrl)
		);
		const relatedData = transaction;
		logger.info(`transaction exists with id ${txnId}`);
		let difficulty = this.defaultDifficulties;
		if (
			relatedData.sessionId &&
			(await this.sessionService.checkIfSessionExists(relatedData.sessionId))
		) {
			const session = await this.sessionService.loadSessionThatExists(
				relatedData.sessionId as string
			);
			difficulty = session.sessionDifficulty;
		}
		const properties: RequestProperties = {
			action: action,
			transactionId: txnId,
			subscriberUrl: subscriberUrl,
			subscriberType: relatedData.subscriberType,
			defaultMode: relatedData.type === "default",
			sessionId: relatedData.sessionId,
			flowId: relatedData.flowId,
			difficulty: difficulty,
		};
		return properties;
	};

	tryFulfillExpectation = async (
		subscriber: SubscriberCache,
		subscriberUrl: string,
		action: string
	) => {
		logger.info(
			`trying to fulfill expectation for action ${action} in subscriber ${subscriberUrl}`
		);
		let expectations = subscriber.activeSessions.filter(
			(e) => Date.now() < new Date(e.expireAt).getTime()
		);
		const target = expectations.find((exp) => exp.expectedAction === action);
		if (target) {
			logger.info(
				`FOUND! expectation for action ${action} in subscriber ${subscriberUrl}`
			);
			expectations = expectations.filter((e) => e.expectedAction !== action);
			subscriber.activeSessions = expectations;
			await this.subscriberService.updateSubscriber(subscriber, subscriberUrl);
			return target;
		}
		await this.subscriberService.updateSubscriber(subscriber, subscriberUrl);
		return undefined;
	};

	assignTransactionToSession = async (
		sessionId: string,
		flowId: string,
		transactionId: string
	) => {
		await this.sessionService.updateSessionCache(
			sessionId,
			flowId,
			transactionId
		);
	};

	getDefaultProperties = async (
		action: string,
		transactionId: string,
		subscriberUrl: string,
		subscriberType: "BAP" | "BPP"
	) => {
		const defaultProp: RequestProperties = {
			difficulty: this.defaultDifficulties,
			env: "STAGING",
			defaultMode: true,
			action: action,
			transactionId: transactionId,
			subscriberType: subscriberType,
			subscriberUrl: subscriberUrl,
		};
		return defaultProp;
	};

	defaultDifficulties = {
		sensitiveTTL: true,
		useGateway: true,
		stopAfterFirstNack: false,
		protocolValidations: true,
		timeValidations: true,
		headerValidaton: true,
	};
}

export class TransactionCacheService {
	tryLoadTransaction = async (transactionId: string, subscriberUrl: string) => {
		const key = this.createTransactionKey(transactionId, subscriberUrl);
		if (await this.checkIfTransactionExists(key)) {
			return this.loadTransactionThatExists(key);
		}
		return undefined;
	};
	checkIfTransactionExists = async (transSubKey: string) => {
		let exists = await RedisService.keyExists(transSubKey);
		logger.info(
			`cache for transaction with id ${transSubKey} exists ${exists}`
		);
		return exists;
	};
	loadTransactionThatExists = async (transSubKey: string) => {
		const rawData = await RedisService.getKey(transSubKey);
		if (!rawData) {
			logger.error(`Transaction with id ${transSubKey} not found`);
			throw new Error(`Transaction with id ${transSubKey} not found`);
		}
		return JSON.parse(rawData) as TransactionCache;
	};
	updateTransactionCache = async (
		payloadID: string,
		requestBody: any,
		responseBody: any,
		subscriberUrl?: string
	) => {
		if (!subscriberUrl) {
			logger.error(`Subscriber url not provided for transaction cache update`);
			return;
		}
		const txnId = requestBody.context.transaction_id;
		const key = this.createTransactionKey(txnId, subscriberUrl);
		if (await this.checkIfTransactionExists(key)) {
			const transaction = await this.loadTransactionThatExists(key);
			transaction.apiList.push({
				action: requestBody.context.action,
				messageId: requestBody.context.message_id,
				payloadId: payloadID,
				response: responseBody,
				timestamp: requestBody.context.timestamp,
			});
			transaction.latestAction = requestBody.context.action;
			transaction.latestTimestamp = requestBody.context.timestamp;
			logger.info(`updated transaction with id ${txnId}`);
			await RedisService.setKey(key, JSON.stringify(transaction));
		} else {
			logger.error(`Transaction with id ${txnId} not found`);
		}
	};
	createTransaction = async (
		transSubKey: string,
		request: RequestProperties,
		context: BecknContext
	) => {
		// ! this will over write already existing subscriber transaction
		const transaction: TransactionCache = {
			sessionId: request.sessionId,
			flowId: request.flowId,
			latestAction: "",
			subscriberType: request.subscriberType,
			latestTimestamp: new Date(0).toISOString(),
			type: request.defaultMode ? "default" : "manual",
			messageIds: [],
			apiList: [],
		};
		await RedisService.setKey(transSubKey, JSON.stringify(transaction));
		logger.info(`created transaction with id ${transSubKey}`);
		return transaction;
	};
	createTransactionKey = (transactionId: string, subscriberUrl: string) => {
		return `${transactionId.trim()}::${subscriberUrl.trim()}`;
	};
}

export class SessionCacheService {
	checkIfSessionExists = async (sessionId?: string) => {
		if (!sessionId) {
			logger.error(`Session id is not provided`);
			return false;
		}
		const exists = await RedisService.keyExists(sessionId);
		logger.info(`cache for session with id ${sessionId} exists ${exists}`);
		return exists;
	};
	loadSessionThatExists = async (sessionId: string) => {
		const rawData = await RedisService.getKey(sessionId);
		if (!rawData) {
			logger.error(`Session with id ${sessionId} not found`);
			throw new Error(`Session with id ${sessionId} not found`);
		}
		return JSON.parse(rawData) as SessionCache;
	};
	updateSessionCache = async (
		sessionId: string,
		flowId: string,
		transactionId: string
	) => {
		if ((await this.checkIfSessionExists(sessionId)) === false) {
			logger.warn(`Session with id ${sessionId} not found skipping update`);
			return;
		}
		const session = await this.loadSessionThatExists(sessionId);
		session.transactionIds.push(transactionId);
		session.flowMap[flowId] = transactionId;
		await RedisService.setKey(sessionId, JSON.stringify(session));
		logger.info(`updated session with id ${sessionId}`);
	};
}

export class SubscriberCacheService {
	checkIfSubscriberExists = async (subscriberUrl: string) => {
		const exists = await RedisService.keyExists(subscriberUrl);
		logger.info(
			`cache for subscriber with url ${subscriberUrl} exists ${exists}`
		);
		return exists;
	};
	loadSubscriberThatExists = async (subscriberUrl: string) => {
		const rawData = await RedisService.getKey(subscriberUrl);
		if (!rawData) {
			logger.error(`Subscriber with url ${subscriberUrl} not found`);
			throw new Error(`Subscriber with url ${subscriberUrl} not found`);
		}

		const data = JSON.parse(rawData) as SubscriberCache;
		if (data.activeSessions === undefined) {
			data.activeSessions = [];
		}
		return data;
	};
	updateSubscriber = async (
		subscriber: SubscriberCache,
		subscriberUrl: string
	) => {
		await RedisService.setKey(subscriberUrl, JSON.stringify(subscriber));
		logger.info(`updated subscriber with url ${subscriberUrl}`);
	};
}
