type sessionId = string;
type subscriberUrl = string;
type participantType = "BPP" | "BAP";

export interface SessionData {
	active_session_id: sessionId;
	type: participantType;
	domain: string;
	version: string;
	city: string;
	np_id: string;
	current_flow_id: string;
	session_payloads: Record<string, any>;
	context_cache: Record<string, ContextCache>;
	difficulty_cache: {
		sensitiveTTL: boolean;
		useGateway: boolean;
		stopAfterFirstNack: boolean;
		protocolValidations: boolean;
		timeValidations: boolean;
		headerValidaton: boolean;
	};
}

export interface ContextCache {
	latest_timestamp: string; // ISO timestamp
	latest_action: string;
	subscriber_id: string;
	subscriber_url: subscriberUrl;
	message_ids: string[];
}
