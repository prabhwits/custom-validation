import axios from "axios";
import { BecknContext } from "../models/beckn-types";
import logger from "../utils/logger";
import { createAuthHeader } from "../utils/headerUtils";
import { config } from "../config/registryGatewayConfig";
import { getAxiosErrorMessage } from "../utils/axiosUtils";
import { RequestProperties } from "../types/cache-types";

export class CommunicationService {
	forwardApiToMock = async (
		body: any,
		requestProperties?: RequestProperties
	) => {
		let url = process.env.MOCK_SERVER_URL;
		const domain = process.env.DOMAIN;
		const version = process.env.VERSION;
		url = `${url}/${domain}/${version}`;
		const action = requestProperties?.action ?? body.context.action;
		if (requestProperties?.defaultMode === false) {
			url = `${url}/manual/${action}`;
		} else {
			url = `${url}/mock/${action}`;
		}
		logger.info("Forwarding request to Mock server", url, action);
		return await axios.post(url, body);
	};
	forwardApiToNp = async (body: any, action: string, overwriteUrl?: string) => {
		const context: BecknContext = body.context;
		let finalUri = context.action.startsWith("on_")
			? context.bap_uri
			: context.bpp_uri;
		if (overwriteUrl) finalUri = overwriteUrl;
		logger.info("Forwarding request to NP server", finalUri);

		const header = await createAuthHeader(body);
		try {
			const response = await axios.post(`${finalUri}/${action}`, body, {
				headers: {
					Authorization: header,
				},
			});
			return {
				status: response.status,
				data: response.data,
			};
		} catch (error: any) {
			logger.error("Error in forwarding request to NP server");
			const status = error.response?.status || 500;
			return {
				status,
				data: getAxiosErrorMessage(error),
			};
		}
	};

	forwardApiToGateway = async (body: any) => {
		const url = config.gateway.STAGING;
		const header = await createAuthHeader(body);
		try {
			logger.info("Forwarding request to Gateway server", url);
			const response = await axios.post(`${url}search`, body, {
				headers: {
					Authorization: header,
				},
			});
			logger.info(JSON.stringify(response.data));
			return {
				status: response.status,
				data: response.data,
			};
		} catch (error: any) {
			logger.error("Error in forwarding request to Gateway server");
			const status = error.response?.status || 500;
			return {
				status,
				data: getAxiosErrorMessage(error),
			};
		}
	};
}
