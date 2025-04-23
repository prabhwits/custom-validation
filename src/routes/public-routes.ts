import express, { NextFunction, Response } from "express";
import { ValidationController } from "../controllers/validation-controller";
import { CommunicationController } from "../controllers/communication-controller";
import { DataController } from "../controllers/data-controller";
import logger from "../utils/logger";
import { v4 as uuidV4 } from "uuid";
import { SessionController } from "../controllers/session-controller";
import { ApiServiceRequest } from "../types/request-types";
import { TransactionCacheService } from "../services/session-service-rewrite";

const router = express();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const validationController = new ValidationController();
const commController = new CommunicationController();
const dbController = new DataController();
const sessionController = new SessionController();

router.post(
	"/:action",
	validationController.validateRequestBodyNp,
	sessionController.receiveNewRequestFromNp,
	sessionController.createTransaction,
	modifyExpressSend,
	validationController.validateSignatureNp,
	validationController.validateL0,
	validationController.validateL1,
	validationController.validateL1Custom,
	validationController.validateContextFromNp,
	commController.forwardToMockServer
);

function modifyExpressSend(
	req: ApiServiceRequest,
	res: Response,
	next: NextFunction
) {
	if (!res.locals.isSendWrapped) {
		res.locals.isSendWrapped = true; // Flag to indicate the wrapping is done
		const originalSend = res.send;
		res.send = function (body) {
			if (!res.locals.isCacheUpdated) {
				res.locals.isCacheUpdated = true; // Flag to ensure cache update happens only once
				const statusCode = res.statusCode;
				if (statusCode !== 200) {
					logger.info(
						"API service response status code is not 200",
						statusCode
					);
				}

				const payloadID = uuidV4();
				new TransactionCacheService().updateTransactionCache(
					payloadID,
					req.body,
					body,
					req?.requestProperties?.subscriberUrl
				);
				dbController.savePayloadInDb(req, body, false, statusCode, payloadID);
				logger.info("Sending response: " + JSON.stringify(body));
			}
			return originalSend.call(this, body); // Call the original send method
		};
	}
	next(); // Proceed to the next middleware
}

export default router;
