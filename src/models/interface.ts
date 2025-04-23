export interface ackPayload {
	context?: any;
	message?: any;
	error?: any;
}

interface EnvironmentURLs {
	STAGING: string;
	PREPROD: string;
	PROD: string;
}

export interface registryGatewayConfig {
	readonly gateway: EnvironmentURLs;
	readonly registry: EnvironmentURLs;
}

export interface ONDCSubscriber {
	subscriber_id: string;
	city: string[];
	country: string;
	valid_from: string; // ISO 8601 date string
	valid_until: string; // ISO 8601 date string
	signing_public_key: string;
	encr_public_key: string;
	created: string; // ISO 8601 date string
	updated: string; // ISO 8601 date string
	unique_key_id: string;
	network_participant: NetworkParticipant[];
}

interface NetworkParticipant {
	subscriber_url: string;
	domain: string;
	type: string;
	msn: boolean;
	city_code: string[];
	seller_on_record: string[];
}
