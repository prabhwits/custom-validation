// Define types for your configuration
import { registryGatewayConfig } from "../models/interface";

// Use environment variables for flexibility
export const config: registryGatewayConfig = {
	gateway: {
		STAGING:
			process.env.GATEWAY_STAGING || "https://staging.gateway.proteantech.in/",
		PREPROD: process.env.GATEWAY_PREPROD || "https://preprod.gateway.ondc.org/",
		PROD: process.env.GATEWAY_PROD || "https://prod.gateway.ondc.org/",
	},
	registry: {
		STAGING:
			process.env.REGISTRY_STAGING || "https://staging.registry.ondc.org/",
		PREPROD:
			process.env.REGISTRY_PREPROD || "https://preprod.registry.ondc.org/ondc/",
		PROD: process.env.REGISTRY_PROD || "https://prod.registry.ondc.org/",
	},
};
