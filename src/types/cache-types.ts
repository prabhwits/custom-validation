export type TransactionId = string;
export type FlowId = string;
export type PayloadId = string;

export type SessionDifficulty = {
	sensitiveTTL: boolean;
	useGateway: boolean;
	stopAfterFirstNack: boolean;
	protocolValidations: boolean;
	timeValidations: boolean;
	headerValidaton: boolean;
};

export type Expectation = {
	sessionId: string;
	flowId: string;
	expectedAction?: string;
	expireAt: string;
};

export interface ApiData {
	action: string;
	payloadId: string;
	messageId: string;
	response: any;
	timestamp: string;
}

export interface TransactionCache {
	sessionId?: string;
	flowId?: string;
	latestAction: string;
	latestTimestamp: string;
	type: "default" | "manual";
	subscriberType: "BAP" | "BPP";
	messageIds: string[];
	apiList: ApiData[];
}

export interface SubscriberCache {
	activeSessions: Expectation[];
}

export interface SessionCache {
	// against session_id
	transactionIds: string[];
	flowMap: Record<FlowId, TransactionId>;
	npType: "BAP" | "BPP";
	domain: string;
	version: string;
	subscriberId?: string;
	subscriberUrl: string;
	env: "STAGING" | "PRE-PRODUCTION";
	sessionDifficulty: SessionDifficulty;
}

export interface RequestProperties {
	defaultMode: boolean;
	subscriberUrl: string;
	subscriberType: "BAP" | "BPP";
	action: string;
	transactionId: string;
	difficulty: SessionDifficulty;
	sessionId?: string;
	flowId?: string;
	env?: string;
}
