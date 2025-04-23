import { setAckResponse, setInternalServerNack } from "../utils/ackUtils";
import { Response } from "express";
import logger from "../utils/logger";
import { CommunicationService } from "../services/forwarding-service";
import { BecknContext } from "../models/beckn-types";
import { loadData, saveLog } from "../utils/data-utils/cache-utils";
import { ApiServiceRequest } from "../types/request-types";

export class CommunicationController {
	communicationService: CommunicationService;

	constructor() {
		this.communicationService = new CommunicationService();
	}

	forwardToMockServer = async (req: ApiServiceRequest, res: Response) => {
		if (req.requestProperties?.defaultMode) {
			res.status(204).send();
			return;
		}
		res.status(200).send(setAckResponse(true, req.body));
		const sessionId = req.requestProperties?.sessionId ?? "unknown";
		try {
			await saveLog(sessionId, "Forwarding request to mock server");
			await new CommunicationService().forwardApiToMock(
				req.body,
				req.requestProperties
			);
			await saveLog(sessionId, "Successfully forwarded request to mock server");
		} catch (error) {
			await saveLog(
				sessionId,
				`Error forwarding request to mock server: ${error}`,
				"error"
			);
			logger.error("Error in forwarding request to mock server", error);
		}
	};

	handleRequestFromMockServer = async (
		req: ApiServiceRequest,
		res: Response
	) => {
		const sessionId = req.requestProperties?.sessionId ?? "unknown";
		try {
			if (!req.requestProperties) {
				logger.error("[FATAL]: Request properties not found");
				res.status(200).send(setInternalServerNack);
				return;
			}
			const context: BecknContext = req.body.context;
			const bpp_uri = context.bpp_uri;
			if (bpp_uri) {
				await saveLog(sessionId, "Forwarding request to NP server");
				logger.info("Forwarding request to NP server");
				const response = await this.communicationService.forwardApiToNp(
					req.body,
					req.params.action
				);
				res.status(response.status).send(response.data);
				return;
			}
			const subUrl = req.requestProperties.subscriberUrl;
			const useGateway = req.requestProperties.difficulty.useGateway;
			if (useGateway) {
				logger.info("Forwarding request to Gateway server");
				const response = await this.communicationService.forwardApiToGateway(
					req.body
				);
				res.status(response.status).send(response.data);
				return;
			} else {
				logger.info("Forwarding request to NP server");
				const response = await this.communicationService.forwardApiToNp(
					req.body,
					req.params.action,
					subUrl
				);
				res.status(response.status).send(response.data);
				return;
			}
		} catch (error) {
			await saveLog(
				sessionId,
				`Error handling request from mock server: ${error}`,
				"error"
			);
			logger.error("Error in handling request from mock server", error);
			res.status(200).send(setInternalServerNack);
		}
	};
}
