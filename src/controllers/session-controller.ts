import { NextFunction, Request, Response } from "express";
import { computeSubscriberUri } from "../utils/subscriber-utils";
import { ApiServiceRequest } from "../types/request-types";
import {
	SessionManagementService,
	TransactionCacheService,
} from "../services/session-service-rewrite";
import logger from "../utils/logger";
import { setInternalServerNack } from "../utils/ackUtils";
import { saveLog } from "../utils/data-utils/cache-utils";

export class SessionController {
	sessionService: SessionManagementService;
	constructor() {
		this.sessionService = new SessionManagementService();
	}

	receiveNewRequestFromNp = async (
		req: ApiServiceRequest,
		res: Response,
		next: NextFunction
	) => {
		const action = req.params.action;
		const body = req.body;
		const sub = computeSubscriberUri(body.context, action, false);
		const properties = await this.sessionService.receiveRequestFromNp(
			body,
			action,
			sub.subUrl,
			sub.partType
		);
		req.requestProperties = properties;

		properties.sessionId &&
			saveLog(
				properties.sessionId,
				`Received ${action} with Transaction ID: ${properties.transactionId}`
			);
		next();
	};

	receiveNewRequestFromMock = async (
		req: ApiServiceRequest,
		res: Response,
		next: NextFunction
	) => {
		const action = req.params.action;
		const body = req.body;
		const sub = computeSubscriberUri(body.context, action, true);
		if (req.query.subscriber_url) {
			sub.subUrl = req.query.subscriber_url as string;
		}
		const sessionID = req.query.session_id as string;
		const flowID = req.query.flow_id as string;
		const properties = await this.sessionService.receiveRequestFromMock(
			body,
			action,
			sub.subUrl,
			sub.partType,
			sessionID,
			flowID
		);
		req.requestProperties = properties;
		req.requestProperties.sessionId &&
			saveLog(
				req.requestProperties.sessionId,
				`Received Mock ${action} with Transaction ID: ${properties.transactionId}`
			);
		next();
	};

	createTransaction = async (
		req: ApiServiceRequest,
		res: Response,
		next: NextFunction
	) => {
		if (!req.requestProperties) {
			logger.error("Request properties not found");
			res.status(200).send(setInternalServerNack);
			return;
		}
		const transService = new TransactionCacheService();
		let transactionData = await transService.tryLoadTransaction(
			req.requestProperties.transactionId,
			req.requestProperties.subscriberUrl
		);
		if (!transactionData) {
			logger.info("Transaction not found, creating new transaction");
			transactionData = await transService.createTransaction(
				transService.createTransactionKey(
					req.requestProperties.transactionId,
					req.requestProperties.subscriberUrl
				),
				req.requestProperties,
				req.body.context
			);
		}
		next();
	};
}
