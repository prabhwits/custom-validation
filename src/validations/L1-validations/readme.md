

- **search** : All the following sub conditions must pass as per the api requirement

	- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload
	
	- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload
	
	- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload
	
	- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload
	
	- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload
	
	- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload
	
	- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload
	
	- **condition Enum_Required_8_CONTEXT_ACTION**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_8_CONTEXT_ACTION.1**: every element of $.context.action must be in ["search"]
	  - **condition Enum_Required_8_CONTEXT_ACTION.2**: $.context.action must be present in the payload
	
	- **condition Enum_Required_9_COUNTRY_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_9_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
	  - **condition Enum_Required_9_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload
	
	- **condition Enum_Required_10_CITY_CODE**: $.context.location.city.code must be present in the payload
	
	- **condition Enum_Required_11_CONTEXT_DOMAIN**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_11_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
	  - **condition Enum_Required_11_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload
	
	- **condition Enum_Required_12_VEHICLE_CATEGORY**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_12_VEHICLE_CATEGORY.1**: every element of $.message.intent.fulfillment.vehicle.category must be in ["BUS", "METRO"]
	  - **condition Enum_Required_12_VEHICLE_CATEGORY.2**: $.message.intent.fulfillment.vehicle.category must be present in the payload
	
	- **condition Enum_Required_13_FULFILLMENT_TYPE**: every element of $.message.intent.fulfillment.type must be in ["ROUTE", "TRIP"]
	
		> Note: **Condition Enum_Required_13_FULFILLMENT_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.intent.fulfillment.type must **not** be present in the payload
	
	- **condition Enum_Required_14_STOPS_TYPE**: every element of $.message.intent.fulfillment.stops[*].type must be in ["START", "END", "INTERMEDIATE_STOP", "TRANSIT_STOP"]
	
		> Note: **Condition Enum_Required_14_STOPS_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.intent.fulfillment.stops[*].type must **not** be present in the payload
	
	- **condition Enum_Required_15_AUTHORIZATION_TYPE**: every element of $.message.intent.fulfillment.stops[*].authorization.type must be in ["QR"]
	
		> Note: **Condition Enum_Required_15_AUTHORIZATION_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.intent.fulfillment.stops[*].authorization.type must **not** be present in the payload
	
	- **condition Enum_Required_16_AUTHORIZATION_STATUS**: every element of $.message.intent.fulfillment.stops[*].authorization.status must be in ["UNCLAIMED", "CLAIMED"]
	
		> Note: **Condition Enum_Required_16_AUTHORIZATION_STATUS** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.intent.fulfillment.stops[*].authorization.status must **not** be present in the payload
	
	- **condition BUYER_FINDER_FEES_Tag_Required_17_DESCRIPTOR_CODE**: every element of $.message.intent.payment.tags[*].descriptor.code must be in ["BUYER_FINDER_FEES", "SETTLEMENT_TERMS"]
	
		> Note: **Condition BUYER_FINDER_FEES_Tag_Required_17_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.intent.payment.tags[*].descriptor.code must **not** be present in the payload
	
	- **condition validate_tag_0_BUYER_FINDER_FEES**: every element of $.message.intent.payment.tags[?(@.descriptor.code=='BUYER_FINDER_FEES')].list[*].descriptor.code must be in ["BUYER_FINDER_FEES_TYPE", "BUYER_FINDER_FEES_PERCENTAGE", "BUYER_FINDER_FEES_AMOUNT"]
	
	- **condition validate_tag_0_SETTLEMENT_TERMS**: every element of $.message.intent.payment.tags[?(@.descriptor.code=='SETTLEMENT_TERMS')].list[*].descriptor.code must be in ["SETTLEMENT_WINDOW", "SETTLEMENT_BASIS", "SETTLEMENT_TYPE", "MANDATORY_ARBITRATION", "COURT_JURISDICTION", "DELAY_INTEREST", "STATIC_TERMS", "SETTLEMENT_AMOUNT"]

- **select** : All the following sub conditions must pass as per the api requirement

	- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload
	
	- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload
	
	- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload
	
	- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload
	
	- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload
	
	- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload
	
	- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload
	
	- **condition Attri_Required_8_CONTEXT_BPP_ID**: $.context.bpp_id must be present in the payload
	
	- **condition Attri_Required_9_CONTEXT_BPP_URI**: $.context.bpp_uri must be present in the payload
	
	- **condition Attri_Required_10_ITEMS_ID**: $.message.order.items[*].id must be present in the payload
	
	- **condition Attri_Required_11_SELECTED_COUNT**: $.message.order.items[*].quantity.selected.count must be present in the payload
	
	- **condition Attri_Required_12_PROVIDER_ID**: $.message.order.provider.id must be present in the payload
	
	- **condition Enum_Required_13_CONTEXT_ACTION**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_13_CONTEXT_ACTION.1**: every element of $.context.action must be in ["select"]
	  - **condition Enum_Required_13_CONTEXT_ACTION.2**: $.context.action must be present in the payload
	
	- **condition Enum_Required_14_COUNTRY_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_14_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
	  - **condition Enum_Required_14_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload
	
	- **condition Enum_Required_15_CITY_CODE**: $.context.location.city.code must be present in the payload
	
	- **condition Enum_Required_16_CONTEXT_DOMAIN**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_16_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
	  - **condition Enum_Required_16_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload
	
	- **condition Enum_Required_17_DESCRIPTOR_CODE**: every element of $.message.order.items[*].descriptor.code must be in ["SJT", "SFSJT", "RJT", "PASS"]
	
		> Note: **Condition Enum_Required_17_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.items[*].descriptor.code must **not** be present in the payload
	
	- **condition Enum_Required_18_VEHICLE_CATEGORY**: every element of $.message.order.fulfillments[*].vehicle.category must be in ["BUS", "METRO"]
	
		> Note: **Condition Enum_Required_18_VEHICLE_CATEGORY** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].vehicle.category must **not** be present in the payload
	
	- **condition Enum_Required_19_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["ROUTE", "TRIP"]
	
		> Note: **Condition Enum_Required_19_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload
	
	- **condition Enum_Required_20_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["START", "END", "INTERMEDIATE_STOP", "TRANSIT_STOP"]
	
		> Note: **Condition Enum_Required_20_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload
	
	- **condition Enum_Required_21_AUTHORIZATION_TYPE**: every element of $.message.order.fulfillments[*].stops[*].authorization.type must be in ["QR"]
	
		> Note: **Condition Enum_Required_21_AUTHORIZATION_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.type must **not** be present in the payload
	
	- **condition Enum_Required_22_AUTHORIZATION_STATUS**: every element of $.message.order.fulfillments[*].stops[*].authorization.status must be in ["UNCLAIMED", "CLAIMED"]
	
		> Note: **Condition Enum_Required_22_AUTHORIZATION_STATUS** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.status must **not** be present in the payload
	
	- **condition Enum_Required_23_ORDER_STATUS**: every element of $.message.order.status must be in ["SOFT_CANCEL", "CONFIRM_CANCEL", "ACTIVE", "COMPLETE", "CANCELLED"]
	
		> Note: **Condition Enum_Required_23_ORDER_STATUS** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.status must **not** be present in the payload
	
	- **condition Enum_Required_24_BREAKUP_TITLE**: every element of $.message.order.quote.breakup[*].title must be in ["BASE_PRICE", "REFUND", "CANCELLATION_CHARGES", "OFFER", "TOLL"]
	
		> Note: **Condition Enum_Required_24_BREAKUP_TITLE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.quote.breakup[*].title must **not** be present in the payload
	
	- **condition ROUTE_INFO_Tag_Required_25_DESCRIPTOR_CODE**: every element of $.message.order.fulfillments[*].tags[*].descriptor.code must be in ["ROUTE_INFO", "TICKET_INFO", "TRIP_DETAILS"]
	
		> Note: **Condition ROUTE_INFO_Tag_Required_25_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].tags[*].descriptor.code must **not** be present in the payload
	
	- **condition validate_tag_0_ROUTE_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='ROUTE_INFO')].list[*].descriptor.code must be in ["ROUTE_ID", "ROUTE_DIRECTION"]
	
	- **condition validate_tag_0_TICKET_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TICKET_INFO')].list[*].descriptor.code must be in ["NUMBER"]
	
	- **condition validate_tag_0_TRIP_DETAILS**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TRIP_DETAILS')].list[*].descriptor.code must be in ["AVAILABLE_TRIPS", "UTILIZED_TRIPS"]

- **init** : All the following sub conditions must pass as per the api requirement

	- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload
	
	- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload
	
	- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload
	
	- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload
	
	- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload
	
	- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload
	
	- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload
	
	- **condition Attri_Required_8_CONTEXT_BPP_ID**: $.context.bpp_id must be present in the payload
	
	- **condition Attri_Required_9_CONTEXT_BPP_URI**: $.context.bpp_uri must be present in the payload
	
	- **condition Attri_Required_10_ITEMS_ID**: $.message.order.items[*].id must be present in the payload
	
	- **condition Attri_Required_11_SELECTED_COUNT**: $.message.order.items[*].quantity.selected.count must be present in the payload
	
	- **condition Attri_Required_12_PROVIDER_ID**: $.message.order.provider.id must be present in the payload
	
	- **condition Attri_Required_13_PAYMENTS_COLLECTED_BY**: $.message.order.payments[*].collected_by must be present in the payload
	
	- **condition Attri_Required_14_PAYMENTS_STATUS**: $.message.order.payments[*].status must be present in the payload
	
	- **condition Attri_Required_15_PAYMENTS_TYPE**: $.message.order.payments[*].type must be present in the payload
	
	- **condition Enum_Required_16_CONTEXT_ACTION**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_16_CONTEXT_ACTION.1**: every element of $.context.action must be in ["init"]
	  - **condition Enum_Required_16_CONTEXT_ACTION.2**: $.context.action must be present in the payload
	
	- **condition Enum_Required_17_COUNTRY_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_17_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
	  - **condition Enum_Required_17_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload
	
	- **condition Enum_Required_18_CITY_CODE**: $.context.location.city.code must be present in the payload
	
	- **condition Enum_Required_19_CONTEXT_DOMAIN**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_19_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
	  - **condition Enum_Required_19_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload
	
	- **condition Enum_Required_20_DESCRIPTOR_CODE**: every element of $.message.order.items[*].descriptor.code must be in ["SJT", "SFSJT", "RJT", "PASS"]
	
		> Note: **Condition Enum_Required_20_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.items[*].descriptor.code must **not** be present in the payload
	
	- **condition Enum_Required_21_VEHICLE_CATEGORY**: every element of $.message.order.fulfillments[*].vehicle.category must be in ["BUS", "METRO"]
	
		> Note: **Condition Enum_Required_21_VEHICLE_CATEGORY** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].vehicle.category must **not** be present in the payload
	
	- **condition Enum_Required_22_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["ROUTE", "TRIP"]
	
		> Note: **Condition Enum_Required_22_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload
	
	- **condition Enum_Required_23_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["START", "END", "INTERMEDIATE_STOP", "TRANSIT_STOP"]
	
		> Note: **Condition Enum_Required_23_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload
	
	- **condition Enum_Required_24_AUTHORIZATION_TYPE**: every element of $.message.order.fulfillments[*].stops[*].authorization.type must be in ["QR"]
	
		> Note: **Condition Enum_Required_24_AUTHORIZATION_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.type must **not** be present in the payload
	
	- **condition Enum_Required_25_AUTHORIZATION_STATUS**: every element of $.message.order.fulfillments[*].stops[*].authorization.status must be in ["UNCLAIMED", "CLAIMED"]
	
		> Note: **Condition Enum_Required_25_AUTHORIZATION_STATUS** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.status must **not** be present in the payload
	
	- **condition Enum_Required_26_ORDER_STATUS**: every element of $.message.order.status must be in ["SOFT_CANCEL", "CONFIRM_CANCEL", "ACTIVE", "COMPLETE", "CANCELLED"]
	
		> Note: **Condition Enum_Required_26_ORDER_STATUS** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.status must **not** be present in the payload
	
	- **condition Enum_Required_27_BREAKUP_TITLE**: every element of $.message.order.quote.breakup[*].title must be in ["BASE_PRICE", "REFUND", "CANCELLATION_CHARGES", "OFFER", "TOLL"]
	
		> Note: **Condition Enum_Required_27_BREAKUP_TITLE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.quote.breakup[*].title must **not** be present in the payload
	
	- **condition BUYER_FINDER_FEES_Tag_Required_28_DESCRIPTOR_CODE**: every element of $.message.order.payments[*].tags[*].descriptor.code must be in ["BUYER_FINDER_FEES", "SETTLEMENT_TERMS"]
	
		> Note: **Condition BUYER_FINDER_FEES_Tag_Required_28_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.payments[*].tags[*].descriptor.code must **not** be present in the payload
	
	- **condition validate_tag_0_BUYER_FINDER_FEES**: every element of $.message.order.payments[*].tags[?(@.descriptor.code=='BUYER_FINDER_FEES')].list[*].descriptor.code must be in ["BUYER_FINDER_FEES_TYPE", "BUYER_FINDER_FEES_PERCENTAGE", "BUYER_FINDER_FEES_AMOUNT"]
	
	- **condition validate_tag_0_SETTLEMENT_TERMS**: every element of $.message.order.payments[*].tags[?(@.descriptor.code=='SETTLEMENT_TERMS')].list[*].descriptor.code must be in ["SETTLEMENT_WINDOW", "SETTLEMENT_BASIS", "SETTLEMENT_TYPE", "MANDATORY_ARBITRATION", "COURT_JURISDICTION", "DELAY_INTEREST", "STATIC_TERMS", "SETTLEMENT_AMOUNT"]

- **confirm** : All the following sub conditions must pass as per the api requirement

	- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload
	
	- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload
	
	- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload
	
	- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload
	
	- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload
	
	- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload
	
	- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload
	
	- **condition Attri_Required_8_CONTEXT_BPP_ID**: $.context.bpp_id must be present in the payload
	
	- **condition Attri_Required_9_CONTEXT_BPP_URI**: $.context.bpp_uri must be present in the payload
	
	- **condition Attri_Required_11_ITEMS_ID**: $.message.order.items[*].id must be present in the payload
	
	- **condition Attri_Required_12_SELECTED_COUNT**: $.message.order.items[*].quantity.selected.count must be present in the payload
	
	- **condition Attri_Required_13_PROVIDER_ID**: $.message.order.provider.id must be present in the payload
	
	- **condition Attri_Required_14_PAYMENTS_ID**: $.message.order.payments[*].id must be present in the payload
	
	- **condition Attri_Required_15_PARAMS_TRANSACTION_ID**: $.message.order.payments[*].params.transaction_id must be present in the payload
	
	- **condition Attri_Required_16_PARAMS_CURRENCY**: $.message.order.payments[*].params.currency must be present in the payload
	
	- **condition Attri_Required_17_PARAMS_AMOUNT**: $.message.order.payments[*].params.amount must be present in the payload
	
	- **condition Attri_Required_18_PARAMS_TRANSACTION_ID**: $.message.order.payments[*].params.transaction_id must be present in the payload
	
	- **condition Attri_Required_19_PARAMS_CURRENCY**: $.message.order.payments[*].params.currency must be present in the payload
	
	- **condition Attri_Required_20_PARAMS_AMOUNT**: $.message.order.payments[*].params.amount must be present in the payload
	
	- **condition Enum_Required_21_CONTEXT_ACTION**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_21_CONTEXT_ACTION.1**: every element of $.context.action must be in ["confirm"]
	  - **condition Enum_Required_21_CONTEXT_ACTION.2**: $.context.action must be present in the payload
	
	- **condition Enum_Required_22_COUNTRY_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_22_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
	  - **condition Enum_Required_22_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload
	
	- **condition Enum_Required_23_CITY_CODE**: $.context.location.city.code must be present in the payload
	
	- **condition Enum_Required_24_CONTEXT_DOMAIN**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_24_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
	  - **condition Enum_Required_24_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload
	
	- **condition Enum_Required_25_DESCRIPTOR_CODE**: every element of $.message.order.items[*].descriptor.code must be in ["SJT", "SFSJT", "RJT", "PASS"]
	
		> Note: **Condition Enum_Required_25_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.items[*].descriptor.code must **not** be present in the payload
	
	- **condition Enum_Required_26_VEHICLE_CATEGORY**: every element of $.message.order.fulfillments[*].vehicle.category must be in ["BUS", "METRO"]
	
		> Note: **Condition Enum_Required_26_VEHICLE_CATEGORY** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].vehicle.category must **not** be present in the payload
	
	- **condition Enum_Required_27_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["ROUTE", "TRIP"]
	
		> Note: **Condition Enum_Required_27_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload
	
	- **condition Enum_Required_28_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["START", "END", "INTERMEDIATE_STOP", "TRANSIT_STOP"]
	
		> Note: **Condition Enum_Required_28_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload
	
	- **condition Enum_Required_29_AUTHORIZATION_TYPE**: every element of $.message.order.fulfillments[*].stops[*].authorization.type must be in ["QR"]
	
		> Note: **Condition Enum_Required_29_AUTHORIZATION_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.type must **not** be present in the payload
	
	- **condition Enum_Required_30_AUTHORIZATION_STATUS**: every element of $.message.order.fulfillments[*].stops[*].authorization.status must be in ["UNCLAIMED", "CLAIMED"]
	
		> Note: **Condition Enum_Required_30_AUTHORIZATION_STATUS** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.status must **not** be present in the payload
	
	- **condition Enum_Required_31_PAYMENTS_STATUS**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_31_PAYMENTS_STATUS.1**: every element of $.message.order.payments[*].status must be in ["NOT-PAID", "PAID"]
	  - **condition Enum_Required_31_PAYMENTS_STATUS.2**: $.message.order.payments[*].status must be present in the payload
	
	- **condition Enum_Required_32_PAYMENTS_COLLECTED_BY**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_32_PAYMENTS_COLLECTED_BY.1**: every element of $.message.order.payments[*].collected_by must be in ["BPP", "BAP"]
	  - **condition Enum_Required_32_PAYMENTS_COLLECTED_BY.2**: $.message.order.payments[*].collected_by must be present in the payload
	
	- **condition Enum_Required_33_PAYMENTS_TYPE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_33_PAYMENTS_TYPE.1**: every element of $.message.order.payments[*].type must be in ["PRE-ORDER", "ON-FULFILLMENT", "POST-FULFILLMENT"]
	  - **condition Enum_Required_33_PAYMENTS_TYPE.2**: $.message.order.payments[*].type must be present in the payload
	
	- **condition Enum_Required_34_BREAKUP_TITLE**: every element of $.message.order.quote.breakup[*].title must be in ["BASE_PRICE", "REFUND", "CANCELLATION_CHARGES", "OFFER", "TOLL"]
	
		> Note: **Condition Enum_Required_34_BREAKUP_TITLE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.quote.breakup[*].title must **not** be present in the payload

- **status** : All the following sub conditions must pass as per the api requirement

	- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload
	
	- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload
	
	- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload
	
	- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload
	
	- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload
	
	- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload
	
	- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload
	
	- **condition Attri_Required_8_CONTEXT_BPP_ID**: $.context.bpp_id must be present in the payload
	
	- **condition Attri_Required_9_CONTEXT_BPP_URI**: $.context.bpp_uri must be present in the payload
	
	- **condition Enum_Required_10_CONTEXT_ACTION**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_10_CONTEXT_ACTION.1**: every element of $.context.action must be in ["status"]
	  - **condition Enum_Required_10_CONTEXT_ACTION.2**: $.context.action must be present in the payload
	
	- **condition Enum_Required_11_COUNTRY_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_11_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
	  - **condition Enum_Required_11_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload
	
	- **condition Enum_Required_12_CITY_CODE**: $.context.location.city.code must be present in the payload
	
	- **condition Enum_Required_13_CONTEXT_DOMAIN**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_13_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
	  - **condition Enum_Required_13_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload

- **cancel** : All the following sub conditions must pass as per the api requirement

	- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload
	
	- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload
	
	- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload
	
	- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload
	
	- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload
	
	- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload
	
	- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload
	
	- **condition Attri_Required_8_CONTEXT_BPP_ID**: $.context.bpp_id must be present in the payload
	
	- **condition Attri_Required_9_CONTEXT_BPP_URI**: $.context.bpp_uri must be present in the payload
	
	- **condition Attri_Required_10_MESSAGE_ORDER_ID**: $.message.order_id must be present in the payload
	
	- **condition Attri_Required_11_MESSAGE_CANCELLATION_REASON_ID**: $.message.cancellation_reason_id must be present in the payload
	
	- **condition Attri_Required_12_DESCRIPTOR_NAME**: $.message.descriptor.name must be present in the payload
	
	- **condition Enum_Required_13_CONTEXT_ACTION**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_13_CONTEXT_ACTION.1**: every element of $.context.action must be in ["cancel"]
	  - **condition Enum_Required_13_CONTEXT_ACTION.2**: $.context.action must be present in the payload
	
	- **condition Enum_Required_14_COUNTRY_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_14_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
	  - **condition Enum_Required_14_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload
	
	- **condition Enum_Required_15_CITY_CODE**: $.context.location.city.code must be present in the payload
	
	- **condition Enum_Required_16_CONTEXT_DOMAIN**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_16_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
	  - **condition Enum_Required_16_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload
	
	- **condition Enum_Required_17_DESCRIPTOR_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_17_DESCRIPTOR_CODE.1**: every element of $.message.descriptor.code must be in ["SOFT_CANCEL", "CONFIRM_CANCEL"]
	  - **condition Enum_Required_17_DESCRIPTOR_CODE.2**: $.message.descriptor.code must be present in the payload

- **update** : All the following sub conditions must pass as per the api requirement

	- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload
	
	- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload
	
	- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload
	
	- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload
	
	- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload
	
	- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload
	
	- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload
	
	- **condition Attri_Required_8_CONTEXT_BPP_ID**: $.context.bpp_id must be present in the payload
	
	- **condition Attri_Required_9_CONTEXT_BPP_URI**: $.context.bpp_uri must be present in the payload
	
	- **condition Attri_Required_10_MESSAGE_UPDATE_TARGET**: $.message.update_target must be present in the payload
	
	- **condition Attri_Required_11_ORDER_ID**: $.message.order.id must be present in the payload
	
	- **condition Enum_Required_12_CONTEXT_ACTION**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_12_CONTEXT_ACTION.1**: every element of $.context.action must be in ["update"]
	  - **condition Enum_Required_12_CONTEXT_ACTION.2**: $.context.action must be present in the payload
	
	- **condition Enum_Required_13_COUNTRY_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_13_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
	  - **condition Enum_Required_13_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload
	
	- **condition Enum_Required_14_CITY_CODE**: $.context.location.city.code must be present in the payload
	
	- **condition Enum_Required_15_CONTEXT_DOMAIN**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_15_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
	  - **condition Enum_Required_15_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload
	
	- **condition Enum_Required_16_DESCRIPTOR_CODE**: every element of $.message.order.items[*].descriptor.code must be in ["SJT", "SFSJT", "RJT", "PASS"]
	
		> Note: **Condition Enum_Required_16_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.items[*].descriptor.code must **not** be present in the payload
	
	- **condition Enum_Required_17_VEHICLE_CATEGORY**: every element of $.message.order.fulfillments[*].vehicle.category must be in ["BUS", "METRO"]
	
		> Note: **Condition Enum_Required_17_VEHICLE_CATEGORY** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].vehicle.category must **not** be present in the payload
	
	- **condition Enum_Required_18_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["ROUTE", "TRIP"]
	
		> Note: **Condition Enum_Required_18_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload
	
	- **condition Enum_Required_19_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["START", "END", "INTERMEDIATE_STOP", "TRANSIT_STOP"]
	
		> Note: **Condition Enum_Required_19_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload
	
	- **condition Enum_Required_20_AUTHORIZATION_TYPE**: every element of $.message.order.fulfillments[*].stops[*].authorization.type must be in ["QR"]
	
		> Note: **Condition Enum_Required_20_AUTHORIZATION_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.type must **not** be present in the payload
	
	- **condition Enum_Required_21_AUTHORIZATION_STATUS**: every element of $.message.order.fulfillments[*].stops[*].authorization.status must be in ["UNCLAIMED", "CLAIMED"]
	
		> Note: **Condition Enum_Required_21_AUTHORIZATION_STATUS** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.status must **not** be present in the payload
	
	- **condition Enum_Required_22_PAYMENTS_STATUS**: every element of $.message.order.payments[*].status must be in ["NOT-PAID", "PAID"]
	
		> Note: **Condition Enum_Required_22_PAYMENTS_STATUS** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.payments[*].status must **not** be present in the payload
	
	- **condition Enum_Required_23_PAYMENTS_COLLECTED_BY**: every element of $.message.order.payments[*].collected_by must be in ["BPP", "BAP"]
	
		> Note: **Condition Enum_Required_23_PAYMENTS_COLLECTED_BY** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.payments[*].collected_by must **not** be present in the payload
	
	- **condition Enum_Required_24_PAYMENTS_TYPE**: every element of $.message.order.payments[*].type must be in ["PRE-ORDER", "ON-FULFILLMENT", "POST-FULFILLMENT"]
	
		> Note: **Condition Enum_Required_24_PAYMENTS_TYPE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.payments[*].type must **not** be present in the payload
	
	- **condition Enum_Required_25_BREAKUP_TITLE**: every element of $.message.order.quote.breakup[*].title must be in ["BASE_PRICE", "REFUND", "CANCELLATION_CHARGES", "OFFER", "TOLL"]
	
		> Note: **Condition Enum_Required_25_BREAKUP_TITLE** can be skipped if the following conditions are met:
		>
		> - **condition B**: $.message.order.quote.breakup[*].title must **not** be present in the payload

- **on_search** : All the following sub conditions must pass as per the api requirement

	- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload
	
	- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload
	
	- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload
	
	- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload
	
	- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload
	
	- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload
	
	- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload
	
	- **condition Attri_Required_8_CONTEXT_BPP_ID**: $.context.bpp_id must be present in the payload
	
	- **condition Attri_Required_9_CONTEXT_BPP_URI**: $.context.bpp_uri must be present in the payload
	
	- **condition Enum_Required_19_CONTEXT_ACTION**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_19_CONTEXT_ACTION.1**: every element of $.context.action must be in ["on_search"]
	  - **condition Enum_Required_19_CONTEXT_ACTION.2**: $.context.action must be present in the payload
	
	- **condition Enum_Required_20_COUNTRY_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_20_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
	  - **condition Enum_Required_20_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload
	
	- **condition Enum_Required_21_CITY_CODE**: $.context.location.city.code must be present in the payload
	
	- **condition Enum_Required_22_CONTEXT_DOMAIN**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_22_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
	  - **condition Enum_Required_22_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload
	
	- **on_search_Message_TESTS** : All the following sub conditions must pass as per the api requirement
	
		- **condition Attri_Required_10_DESCRIPTOR_NAME**: $.message.catalog.descriptor.name must be present in the payload
		
		- **condition Attri_Required_11_PROVIDERS_ID**: $.message.catalog.providers[*].id must be present in the payload
		
		- **condition Attri_Required_12_DESCRIPTOR_NAME**: $.message.catalog.providers[*].descriptor.name must be present in the payload
		
		- **condition Attri_Required_13_FULFILLMENTS_ID**: $.message.catalog.providers[*].fulfillments[*].id must be present in the payload
		
		- **condition Attri_Required_14_LOCATION_GPS**: $.message.catalog.providers[*].fulfillments[*].stops[*].location.gps must be present in the payload
		
		- **condition Attri_Required_15_FULFILLMENTS_ID**: $.message.catalog.providers[*].fulfillments[*].id must be present in the payload
		
		- **condition Attri_Required_16_CATEGORIES_ID**: $.message.catalog.providers[*].categories[*].id must be present in the payload
		
		- **condition Attri_Required_17_RANGE_START**: $.message.catalog.providers[*].time.range.start must be present in the payload
		
		- **condition Attri_Required_18_RANGE_END**: $.message.catalog.providers[*].time.range.end must be present in the payload
		
		- **condition Enum_Required_23_DESCRIPTOR_CODE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_23_DESCRIPTOR_CODE.1**: every element of $.message.catalog.providers[*].categories[*].descriptor.code must be in ["TICKET", "PASS"]
		  - **condition Enum_Required_23_DESCRIPTOR_CODE.2**: $.message.catalog.providers[*].categories[*].descriptor.code must be present in the payload
		
		- **condition Enum_Required_24_DESCRIPTOR_CODE**: every element of $.message.catalog.providers[*].descriptor.code must be in ["SJT", "SFSJT", "RJT", "PASS"]
		
			> Note: **Condition Enum_Required_24_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.catalog.providers[*].descriptor.code must **not** be present in the payload
		
		- **condition Enum_Required_25_VEHICLE_CATEGORY**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_25_VEHICLE_CATEGORY.1**: every element of $.message.catalog.providers[*].fulfillments[*].vehicle.category must be in ["BUS", "METRO"]
		  - **condition Enum_Required_25_VEHICLE_CATEGORY.2**: $.message.catalog.providers[*].fulfillments[*].vehicle.category must be present in the payload
		
		- **condition Enum_Required_26_FULFILLMENTS_TYPE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_26_FULFILLMENTS_TYPE.1**: every element of $.message.catalog.providers[*].fulfillments[*].type must be in ["ROUTE", "TRIP"]
		  - **condition Enum_Required_26_FULFILLMENTS_TYPE.2**: $.message.catalog.providers[*].fulfillments[*].type must be present in the payload
		
		- **condition Enum_Required_27_FULFILLMENTS_TYPE**: every element of $.message.catalog.providers[*].fulfillments[*].type must be in ["START", "END", "INTERMEDIATE_STOP", "TRANSIT_STOP"]
		
			> Note: **Condition Enum_Required_27_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.catalog.providers[*].fulfillments[*].type must **not** be present in the payload
		
		- **condition Enum_Required_28_AUTHORIZATION_TYPE**: every element of $.message.catalog.providers[*].fulfillments[*].stops[*].authorization.type must be in ["QR"]
		
			> Note: **Condition Enum_Required_28_AUTHORIZATION_TYPE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.catalog.providers[*].fulfillments[*].stops[*].authorization.type must **not** be present in the payload
		
		- **condition Enum_Required_29_AUTHORIZATION_STATUS**: every element of $.message.catalog.providers[*].fulfillments[*].stops[*].authorization.status must be in ["UNCLAIMED", "CLAIMED"]
		
			> Note: **Condition Enum_Required_29_AUTHORIZATION_STATUS** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.catalog.providers[*].fulfillments[*].stops[*].authorization.status must **not** be present in the payload
		
		- **condition Enum_Required_30_PAYMENTS_STATUS**: every element of $.message.catalog.providers[*].payments[*].status must be in ["NOT-PAID", "PAID"]
		
			> Note: **Condition Enum_Required_30_PAYMENTS_STATUS** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.catalog.providers[*].payments[*].status must **not** be present in the payload
		
		- **condition Enum_Required_31_PAYMENTS_COLLECTED_BY**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_31_PAYMENTS_COLLECTED_BY.1**: every element of $.message.catalog.providers[*].payments[*].collected_by must be in ["BPP", "BAP"]
		  - **condition Enum_Required_31_PAYMENTS_COLLECTED_BY.2**: $.message.catalog.providers[*].payments[*].collected_by must be present in the payload
		
		- **condition Enum_Required_32_PAYMENTS_TYPE**: every element of $.message.catalog.providers[*].payments[*].type must be in ["PRE-ORDER", "ON-FULFILLMENT", "POST-FULFILLMENT"]
		
			> Note: **Condition Enum_Required_32_PAYMENTS_TYPE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.catalog.providers[*].payments[*].type must **not** be present in the payload
		
		- **condition FARE_POLICY_Tag_Required_33_DESCRIPTOR_CODE**: every element of $.message.catalog.providers[*].items[*].tags[*].descriptor.code must be in ["FARE_POLICY"]
		
			> Note: **Condition FARE_POLICY_Tag_Required_33_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.catalog.providers[*].items[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_0_FARE_POLICY**: every element of $.message.catalog.providers[*].items[*].tags[?(@.descriptor.code=='FARE_POLICY')].list[*].descriptor.code must be in ["RESTRICTED_PERSON", "RESTRICTION_PROOF"]
		
		- **condition ROUTE_INFO_Tag_Required_35_DESCRIPTOR_CODE**: every element of $.message.catalog.providers[*].fulfillments[*].tags[*].descriptor.code must be in ["ROUTE_INFO", "TICKET_INFO", "TRIP_DETAILS"]
		
			> Note: **Condition ROUTE_INFO_Tag_Required_35_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.catalog.providers[*].fulfillments[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_1_ROUTE_INFO**: every element of $.message.catalog.providers[*].fulfillments[*].tags[?(@.descriptor.code=='ROUTE_INFO')].list[*].descriptor.code must be in ["ROUTE_ID", "ROUTE_DIRECTION"]
		
		- **condition validate_tag_1_TICKET_INFO**: every element of $.message.catalog.providers[*].fulfillments[*].tags[?(@.descriptor.code=='TICKET_INFO')].list[*].descriptor.code must be in ["NUMBER"]
		
		- **condition validate_tag_1_TRIP_DETAILS**: every element of $.message.catalog.providers[*].fulfillments[*].tags[?(@.descriptor.code=='TRIP_DETAILS')].list[*].descriptor.code must be in ["AVAILABLE_TRIPS", "UTILIZED_TRIPS"]
		
		- **condition BUYER_FINDER_FEES_Tag_Required_39_DESCRIPTOR_CODE**: every element of $.message.catalog.providers[*].payments[*].tags[*].descriptor.code must be in ["BUYER_FINDER_FEES", "SETTLEMENT_TERMS"]
		
			> Note: **Condition BUYER_FINDER_FEES_Tag_Required_39_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.catalog.providers[*].payments[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_2_BUYER_FINDER_FEES**: every element of $.message.catalog.providers[*].payments[*].tags[?(@.descriptor.code=='BUYER_FINDER_FEES')].list[*].descriptor.code must be in ["BUYER_FINDER_FEES_TYPE", "BUYER_FINDER_FEES_PERCENTAGE", "BUYER_FINDER_FEES_AMOUNT"]
		
		- **condition validate_tag_2_SETTLEMENT_TERMS**: every element of $.message.catalog.providers[*].payments[*].tags[?(@.descriptor.code=='SETTLEMENT_TERMS')].list[*].descriptor.code must be in ["SETTLEMENT_WINDOW", "SETTLEMENT_BASIS", "SETTLEMENT_TYPE", "MANDATORY_ARBITRATION", "COURT_JURISDICTION", "DELAY_INTEREST", "STATIC_TERMS", "SETTLEMENT_AMOUNT"]
		
		- **condition SCHEDULED_INFO_Tag_Required_42_DESCRIPTOR_CODE**: every element of $.message.catalog.providers[*].tags[*].descriptor.code must be in ["SCHEDULED_INFO"]
		
			> Note: **Condition SCHEDULED_INFO_Tag_Required_42_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.catalog.providers[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_3_SCHEDULED_INFO**: every element of $.message.catalog.providers[*].tags[?(@.descriptor.code=='SCHEDULED_INFO')].list[*].descriptor.code must be in ["GTFS"]

- **on_select** : All the following sub conditions must pass as per the api requirement

	- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload
	
	- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload
	
	- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload
	
	- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload
	
	- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload
	
	- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload
	
	- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload
	
	- **condition Attri_Required_8_CONTEXT_BPP_ID**: $.context.bpp_id must be present in the payload
	
	- **condition Attri_Required_9_CONTEXT_BPP_URI**: $.context.bpp_uri must be present in the payload
	
	- **condition Enum_Required_33_CONTEXT_ACTION**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_33_CONTEXT_ACTION.1**: every element of $.context.action must be in ["on_select"]
	  - **condition Enum_Required_33_CONTEXT_ACTION.2**: $.context.action must be present in the payload
	
	- **condition Enum_Required_34_COUNTRY_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_34_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
	  - **condition Enum_Required_34_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload
	
	- **condition Enum_Required_35_CITY_CODE**: $.context.location.city.code must be present in the payload
	
	- **condition Enum_Required_36_CONTEXT_DOMAIN**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_36_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
	  - **condition Enum_Required_36_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload
	
	- **on_select_Message_TESTS** : All the following sub conditions must pass as per the api requirement
	
		- **condition Attri_Required_10_ITEMS_ID**: $.message.order.items[*].id must be present in the payload
		
		- **condition Attri_Required_11_PRICE_CURRENCY**: $.message.order.items[*].price.currency must be present in the payload
		
		- **condition Attri_Required_12_PRICE_VALUE**: $.message.order.items[*].price.value must be present in the payload
		
		- **condition Attri_Required_13_SELECTED_COUNT**: $.message.order.items[*].quantity.selected.count must be present in the payload
		
		- **condition Attri_Required_14_ITEMS_FULFILLMENT_IDS**: $.message.order.items[*].fulfillment_ids[*] must be present in the payload
		
		- **condition Attri_Required_15_TIME_LABEL**: $.message.order.items[*].time.label must be present in the payload
		
		- **condition Attri_Required_16_TIME_DURATION**: $.message.order.items[*].time.duration must be present in the payload
		
		- **condition Attri_Required_17_PROVIDER_ID**: $.message.order.provider.id must be present in the payload
		
		- **condition Attri_Required_18_DESCRIPTOR_NAME**: $.message.order.provider.descriptor.name must be present in the payload
		
		- **condition Attri_Required_19_FULFILLMENTS_ID**: $.message.order.fulfillments[*].id must be present in the payload
		
		- **condition Attri_Required_20_LOCATION_GPS**: $.message.order.fulfillments[*].stops[*].location.gps must be present in the payload
		
		- **condition Attri_Required_21_FULFILLMENTS_ID**: $.message.order.fulfillments[*].id must be present in the payload
		
		- **condition Attri_Required_22_PRICE_VALUE**: $.message.order.quote.price.value must be present in the payload
		
		- **condition Attri_Required_23_PRICE_CURRENCY**: $.message.order.quote.price.currency must be present in the payload
		
		- **condition Attri_Required_24_ITEM_ID**: $.message.order.quote.breakup[*].item.id must be present in the payload
		
		- **condition Attri_Required_25_ITEMS_CATEGORY_IDS**: $.message.order.items[*].category_ids[*] must be present in the payload
		
		- **condition Attri_Required_26_RANGE_START**: $.message.order.provider.time.range.start must be present in the payload
		
		- **condition Attri_Required_27_RANGE_END**: $.message.order.provider.time.range.end must be present in the payload
		
		- **condition Attri_Required_28_PRICE_CURRENCY**: $.message.order.quote.breakup[*].item.price.currency must be present in the payload
		
		- **condition Attri_Required_29_PRICE_VALUE**: $.message.order.quote.breakup[*].item.price.value must be present in the payload
		
		- **condition Attri_Required_30_SELECTED_COUNT**: $.message.order.quote.breakup[*].item.quantity.selected.count must be present in the payload
		
		- **condition Attri_Required_31_EXTERNAL_REF_URL**: $.message.order.cancellation_terms[*].external_ref.url must be present in the payload
		
		- **condition Attri_Required_32_EXTERNAL_REF_MIMETYPE**: $.message.order.cancellation_terms[*].external_ref.mimetype must be present in the payload
		
		- **condition Enum_Required_37_DESCRIPTOR_CODE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_37_DESCRIPTOR_CODE.1**: every element of $.message.order.items[*].descriptor.code must be in ["SJT", "SFSJT", "RJT", "PASS"]
		  - **condition Enum_Required_37_DESCRIPTOR_CODE.2**: $.message.order.items[*].descriptor.code must be present in the payload
		
		- **condition Enum_Required_38_VEHICLE_CATEGORY**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_38_VEHICLE_CATEGORY.1**: every element of $.message.order.fulfillments[*].vehicle.category must be in ["BUS", "METRO"]
		  - **condition Enum_Required_38_VEHICLE_CATEGORY.2**: $.message.order.fulfillments[*].vehicle.category must be present in the payload
		
		- **condition Enum_Required_39_FULFILLMENTS_TYPE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_39_FULFILLMENTS_TYPE.1**: every element of $.message.order.fulfillments[*].type must be in ["ROUTE", "TRIP"]
		  - **condition Enum_Required_39_FULFILLMENTS_TYPE.2**: $.message.order.fulfillments[*].type must be present in the payload
		
		- **condition Enum_Required_40_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["START", "END", "INTERMEDIATE_STOP", "TRANSIT_STOP"]
		
			> Note: **Condition Enum_Required_40_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload
		
		- **condition Enum_Required_41_AUTHORIZATION_TYPE**: every element of $.message.order.fulfillments[*].stops[*].authorization.type must be in ["QR"]
		
			> Note: **Condition Enum_Required_41_AUTHORIZATION_TYPE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.type must **not** be present in the payload
		
		- **condition Enum_Required_42_AUTHORIZATION_STATUS**: every element of $.message.order.fulfillments[*].stops[*].authorization.status must be in ["UNCLAIMED", "CLAIMED"]
		
			> Note: **Condition Enum_Required_42_AUTHORIZATION_STATUS** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.status must **not** be present in the payload
		
		- **condition Enum_Required_43_ORDER_STATUS**: every element of $.message.order.status must be in ["SOFT_CANCEL", "CONFIRM_CANCEL", "ACTIVE", "COMPLETE", "CANCELLED"]
		
			> Note: **Condition Enum_Required_43_ORDER_STATUS** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.status must **not** be present in the payload
		
		- **condition Enum_Required_44_BREAKUP_TITLE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_44_BREAKUP_TITLE.1**: every element of $.message.order.quote.breakup[*].title must be in ["BASE_PRICE", "REFUND", "CANCELLATION_CHARGES", "OFFER", "TOLL"]
		  - **condition Enum_Required_44_BREAKUP_TITLE.2**: $.message.order.quote.breakup[*].title must be present in the payload
		
		- **condition ROUTE_INFO_Tag_Required_45_DESCRIPTOR_CODE**: every element of $.message.order.fulfillments[*].tags[*].descriptor.code must be in ["ROUTE_INFO", "TICKET_INFO", "TRIP_DETAILS"]
		
			> Note: **Condition ROUTE_INFO_Tag_Required_45_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_0_ROUTE_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='ROUTE_INFO')].list[*].descriptor.code must be in ["ROUTE_ID", "ROUTE_DIRECTION"]
		
		- **condition validate_tag_0_TICKET_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TICKET_INFO')].list[*].descriptor.code must be in ["NUMBER"]
		
		- **condition validate_tag_0_TRIP_DETAILS**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TRIP_DETAILS')].list[*].descriptor.code must be in ["AVAILABLE_TRIPS", "UTILIZED_TRIPS"]
		
		- **condition FARE_POLICY_Tag_Required_49_DESCRIPTOR_CODE**: every element of $.message.order.items[*].tags[*].descriptor.code must be in ["FARE_POLICY"]
		
			> Note: **Condition FARE_POLICY_Tag_Required_49_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.items[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_1_FARE_POLICY**: every element of $.message.order.items[*].tags[?(@.descriptor.code=='FARE_POLICY')].list[*].descriptor.code must be in ["RESTRICTED_PERSON", "RESTRICTION_PROOF"]

- **on_init** : All the following sub conditions must pass as per the api requirement

	- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload
	
	- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload
	
	- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload
	
	- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload
	
	- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload
	
	- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload
	
	- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload
	
	- **condition Attri_Required_8_CONTEXT_BPP_ID**: $.context.bpp_id must be present in the payload
	
	- **condition Attri_Required_9_CONTEXT_BPP_URI**: $.context.bpp_uri must be present in the payload
	
	- **condition Enum_Required_34_CONTEXT_ACTION**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_34_CONTEXT_ACTION.1**: every element of $.context.action must be in ["on_init"]
	  - **condition Enum_Required_34_CONTEXT_ACTION.2**: $.context.action must be present in the payload
	
	- **condition Enum_Required_35_COUNTRY_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_35_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
	  - **condition Enum_Required_35_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload
	
	- **condition Enum_Required_36_CITY_CODE**: $.context.location.city.code must be present in the payload
	
	- **condition Enum_Required_37_CONTEXT_DOMAIN**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_37_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
	  - **condition Enum_Required_37_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload
	
	- **on_init_Message_TESTS** : All the following sub conditions must pass as per the api requirement
	
		- **condition Attri_Required_10_ITEMS_ID**: $.message.order.items[*].id must be present in the payload
		
		- **condition Attri_Required_11_PRICE_CURRENCY**: $.message.order.items[*].price.currency must be present in the payload
		
		- **condition Attri_Required_12_PRICE_VALUE**: $.message.order.items[*].price.value must be present in the payload
		
		- **condition Attri_Required_13_SELECTED_COUNT**: $.message.order.items[*].quantity.selected.count must be present in the payload
		
		- **condition Attri_Required_14_ITEMS_FULFILLMENT_IDS**: $.message.order.items[*].fulfillment_ids[*] must be present in the payload
		
		- **condition Attri_Required_15_TIME_LABEL**: $.message.order.items[*].time.label must be present in the payload
		
		- **condition Attri_Required_16_TIME_DURATION**: $.message.order.items[*].time.duration must be present in the payload
		
		- **condition Attri_Required_17_PROVIDER_ID**: $.message.order.provider.id must be present in the payload
		
		- **condition Attri_Required_18_DESCRIPTOR_NAME**: $.message.order.provider.descriptor.name must be present in the payload
		
		- **condition Attri_Required_19_FULFILLMENTS_ID**: $.message.order.fulfillments[*].id must be present in the payload
		
		- **condition Attri_Required_20_LOCATION_GPS**: $.message.order.fulfillments[*].stops[*].location.gps must be present in the payload
		
		- **condition Attri_Required_21_FULFILLMENTS_ID**: $.message.order.fulfillments[*].id must be present in the payload
		
		- **condition Attri_Required_22_PRICE_VALUE**: $.message.order.quote.price.value must be present in the payload
		
		- **condition Attri_Required_23_PRICE_CURRENCY**: $.message.order.quote.price.currency must be present in the payload
		
		- **condition Attri_Required_24_ITEM_ID**: $.message.order.quote.breakup[*].item.id must be present in the payload
		
		- **condition Attri_Required_25_PAYMENTS_ID**: $.message.order.payments[*].id must be present in the payload
		
		- **condition Attri_Required_26_ITEMS_CATEGORY_IDS**: $.message.order.items[*].category_ids[*] must be present in the payload
		
		- **condition Attri_Required_27_RANGE_START**: $.message.order.provider.time.range.start must be present in the payload
		
		- **condition Attri_Required_28_RANGE_END**: $.message.order.provider.time.range.end must be present in the payload
		
		- **condition Attri_Required_29_SELECTED_COUNT**: $.message.order.quote.breakup[*].item.quantity.selected.count must be present in the payload
		
		- **condition Attri_Required_30_PRICE_VALUE**: $.message.order.quote.breakup[*].item.price.value must be present in the payload
		
		- **condition Attri_Required_31_PRICE_CURRENCY**: $.message.order.quote.breakup[*].item.price.currency must be present in the payload
		
		- **condition Attri_Required_32_EXTERNAL_REF_URL**: $.message.order.cancellation_terms[*].external_ref.url must be present in the payload
		
		- **condition Attri_Required_33_EXTERNAL_REF_MIMETYPE**: $.message.order.cancellation_terms[*].external_ref.mimetype must be present in the payload
		
		- **condition Enum_Required_38_DESCRIPTOR_CODE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_38_DESCRIPTOR_CODE.1**: every element of $.message.order.items[*].descriptor.code must be in ["SJT", "SFSJT", "RJT", "PASS"]
		  - **condition Enum_Required_38_DESCRIPTOR_CODE.2**: $.message.order.items[*].descriptor.code must be present in the payload
		
		- **condition Enum_Required_39_VEHICLE_CATEGORY**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_39_VEHICLE_CATEGORY.1**: every element of $.message.order.fulfillments[*].vehicle.category must be in ["BUS", "METRO"]
		  - **condition Enum_Required_39_VEHICLE_CATEGORY.2**: $.message.order.fulfillments[*].vehicle.category must be present in the payload
		
		- **condition Enum_Required_40_FULFILLMENTS_TYPE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_40_FULFILLMENTS_TYPE.1**: every element of $.message.order.fulfillments[*].type must be in ["ROUTE", "TRIP"]
		  - **condition Enum_Required_40_FULFILLMENTS_TYPE.2**: $.message.order.fulfillments[*].type must be present in the payload
		
		- **condition Enum_Required_41_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["START", "END", "INTERMEDIATE_STOP", "TRANSIT_STOP"]
		
			> Note: **Condition Enum_Required_41_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload
		
		- **condition Enum_Required_42_AUTHORIZATION_TYPE**: every element of $.message.order.fulfillments[*].stops[*].authorization.type must be in ["QR"]
		
			> Note: **Condition Enum_Required_42_AUTHORIZATION_TYPE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.type must **not** be present in the payload
		
		- **condition Enum_Required_43_AUTHORIZATION_STATUS**: every element of $.message.order.fulfillments[*].stops[*].authorization.status must be in ["UNCLAIMED", "CLAIMED"]
		
			> Note: **Condition Enum_Required_43_AUTHORIZATION_STATUS** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.status must **not** be present in the payload
		
		- **condition Enum_Required_44_PAYMENTS_STATUS**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_44_PAYMENTS_STATUS.1**: every element of $.message.order.payments[*].status must be in ["NOT-PAID", "PAID"]
		  - **condition Enum_Required_44_PAYMENTS_STATUS.2**: $.message.order.payments[*].status must be present in the payload
		
		- **condition Enum_Required_45_PAYMENTS_COLLECTED_BY**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_45_PAYMENTS_COLLECTED_BY.1**: every element of $.message.order.payments[*].collected_by must be in ["BPP", "BAP"]
		  - **condition Enum_Required_45_PAYMENTS_COLLECTED_BY.2**: $.message.order.payments[*].collected_by must be present in the payload
		
		- **condition Enum_Required_46_PAYMENTS_TYPE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_46_PAYMENTS_TYPE.1**: every element of $.message.order.payments[*].type must be in ["PRE-ORDER", "ON-FULFILLMENT", "POST-FULFILLMENT"]
		  - **condition Enum_Required_46_PAYMENTS_TYPE.2**: $.message.order.payments[*].type must be present in the payload
		
		- **condition Enum_Required_47_BREAKUP_TITLE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_47_BREAKUP_TITLE.1**: every element of $.message.order.quote.breakup[*].title must be in ["BASE_PRICE", "REFUND", "CANCELLATION_CHARGES", "OFFER", "TOLL"]
		  - **condition Enum_Required_47_BREAKUP_TITLE.2**: $.message.order.quote.breakup[*].title must be present in the payload
		
		- **condition ROUTE_INFO_Tag_Required_48_DESCRIPTOR_CODE**: every element of $.message.order.fulfillments[*].tags[*].descriptor.code must be in ["ROUTE_INFO", "TICKET_INFO", "TRIP_DETAILS"]
		
			> Note: **Condition ROUTE_INFO_Tag_Required_48_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_0_ROUTE_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='ROUTE_INFO')].list[*].descriptor.code must be in ["ROUTE_ID", "ROUTE_DIRECTION"]
		
		- **condition validate_tag_0_TICKET_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TICKET_INFO')].list[*].descriptor.code must be in ["NUMBER"]
		
		- **condition validate_tag_0_TRIP_DETAILS**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TRIP_DETAILS')].list[*].descriptor.code must be in ["AVAILABLE_TRIPS", "UTILIZED_TRIPS"]
		
		- **condition FARE_POLICY_Tag_Required_52_DESCRIPTOR_CODE**: every element of $.message.order.items[*].tags[*].descriptor.code must be in ["FARE_POLICY"]
		
			> Note: **Condition FARE_POLICY_Tag_Required_52_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.items[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_1_FARE_POLICY**: every element of $.message.order.items[*].tags[?(@.descriptor.code=='FARE_POLICY')].list[*].descriptor.code must be in ["RESTRICTED_PERSON", "RESTRICTION_PROOF"]
		
		- **condition BUYER_FINDER_FEES_Tag_Required_54_DESCRIPTOR_CODE**: every element of $.message.order.payments[*].tags[*].descriptor.code must be in ["BUYER_FINDER_FEES", "SETTLEMENT_TERMS"]
		
			> Note: **Condition BUYER_FINDER_FEES_Tag_Required_54_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.payments[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_2_BUYER_FINDER_FEES**: every element of $.message.order.payments[*].tags[?(@.descriptor.code=='BUYER_FINDER_FEES')].list[*].descriptor.code must be in ["BUYER_FINDER_FEES_TYPE", "BUYER_FINDER_FEES_PERCENTAGE", "BUYER_FINDER_FEES_AMOUNT"]
		
		- **condition validate_tag_2_SETTLEMENT_TERMS**: every element of $.message.order.payments[*].tags[?(@.descriptor.code=='SETTLEMENT_TERMS')].list[*].descriptor.code must be in ["SETTLEMENT_WINDOW", "SETTLEMENT_BASIS", "SETTLEMENT_TYPE", "MANDATORY_ARBITRATION", "COURT_JURISDICTION", "DELAY_INTEREST", "STATIC_TERMS", "SETTLEMENT_AMOUNT"]

- **on_confirm** : All the following sub conditions must pass as per the api requirement

	- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload
	
	- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload
	
	- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload
	
	- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload
	
	- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload
	
	- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload
	
	- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload
	
	- **condition Attri_Required_8_CONTEXT_BPP_ID**: $.context.bpp_id must be present in the payload
	
	- **condition Attri_Required_9_CONTEXT_BPP_URI**: $.context.bpp_uri must be present in the payload
	
	- **condition Enum_Required_43_CONTEXT_ACTION**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_43_CONTEXT_ACTION.1**: every element of $.context.action must be in ["on_confirm"]
	  - **condition Enum_Required_43_CONTEXT_ACTION.2**: $.context.action must be present in the payload
	
	- **condition Enum_Required_44_COUNTRY_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_44_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
	  - **condition Enum_Required_44_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload
	
	- **condition Enum_Required_45_CITY_CODE**: $.context.location.city.code must be present in the payload
	
	- **condition Enum_Required_46_CONTEXT_DOMAIN**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_46_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
	  - **condition Enum_Required_46_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload
	
	- **on_confirm_Message_TESTS** : All the following sub conditions must pass as per the api requirement
	
		- **condition Attri_Required_10_ORDER_ID**: $.message.order.id must be present in the payload
		
		- **condition Attri_Required_11_ITEMS_ID**: $.message.order.items[*].id must be present in the payload
		
		- **condition Attri_Required_12_DESCRIPTOR_NAME**: $.message.order.items[*].descriptor.name must be present in the payload
		
		- **condition Attri_Required_13_PRICE_CURRENCY**: $.message.order.items[*].price.currency must be present in the payload
		
		- **condition Attri_Required_14_PRICE_VALUE**: $.message.order.items[*].price.value must be present in the payload
		
		- **condition Attri_Required_15_SELECTED_COUNT**: $.message.order.items[*].quantity.selected.count must be present in the payload
		
		- **condition Attri_Required_16_ITEMS_FULFILLMENT_IDS**: $.message.order.items[*].fulfillment_ids[*] must be present in the payload
		
		- **condition Attri_Required_17_TIME_LABEL**: $.message.order.items[*].time.label must be present in the payload
		
		- **condition Attri_Required_18_TIME_DURATION**: $.message.order.items[*].time.duration must be present in the payload
		
		- **condition Attri_Required_19_PROVIDER_ID**: $.message.order.provider.id must be present in the payload
		
		- **condition Attri_Required_20_DESCRIPTOR_NAME**: $.message.order.provider.descriptor.name must be present in the payload
		
		- **condition Attri_Required_21_FULFILLMENTS_ID**: $.message.order.fulfillments[*].id must be present in the payload
		
		- **condition Attri_Required_22_LOCATION_GPS**: $.message.order.fulfillments[*].stops[*].location.gps must be present in the payload
		
		- **condition Attri_Required_23_FULFILLMENTS_ID**: $.message.order.fulfillments[*].id must be present in the payload
		
		- **condition Attri_Required_24_PRICE_VALUE**: $.message.order.quote.price.value must be present in the payload
		
		- **condition Attri_Required_25_PRICE_CURRENCY**: $.message.order.quote.price.currency must be present in the payload
		
		- **condition Attri_Required_26_ITEM_ID**: $.message.order.quote.breakup[*].item.id must be present in the payload
		
		- **condition Attri_Required_27_PAYMENTS_ID**: $.message.order.payments[*].id must be present in the payload
		
		- **condition Attri_Required_28_PARAMS_TRANSACTION_ID**: $.message.order.payments[*].params.transaction_id must be present in the payload
		
		- **condition Attri_Required_29_PARAMS_CURRENCY**: $.message.order.payments[*].params.currency must be present in the payload
		
		- **condition Attri_Required_30_PARAMS_AMOUNT**: $.message.order.payments[*].params.amount must be present in the payload
		
		- **condition Attri_Required_31_CANCEL_BY_DURATION**: $.message.order.cancellation_terms[*].cancel_by.duration must be present in the payload
		
		- **condition Attri_Required_32_ORDER_STATUS**: $.message.order.status must be present in the payload
		
		- **condition Attri_Required_33_ITEMS_CATEGORY_IDS**: $.message.order.items[*].category_ids[*] must be present in the payload
		
		- **condition Attri_Required_34_RANGE_START**: $.message.order.provider.time.range.start must be present in the payload
		
		- **condition Attri_Required_35_RANGE_END**: $.message.order.provider.time.range.end must be present in the payload
		
		- **condition Attri_Required_36_PRICE_VALUE**: $.message.order.quote.breakup[*].item.price.value must be present in the payload
		
		- **condition Attri_Required_37_PRICE_CURRENCY**: $.message.order.quote.breakup[*].item.price.currency must be present in the payload
		
		- **condition Attri_Required_38_SELECTED_COUNT**: $.message.order.quote.breakup[*].item.quantity.selected.count must be present in the payload
		
		- **condition Attri_Required_39_EXTERNAL_REF_URL**: $.message.order.cancellation_terms[*].external_ref.url must be present in the payload
		
		- **condition Attri_Required_40_EXTERNAL_REF_MIMETYPE**: $.message.order.cancellation_terms[*].external_ref.mimetype must be present in the payload
		
		- **condition Attri_Required_41_ORDER_CREATED_AT**: $.message.order.created_at must be present in the payload
		
		- **condition Attri_Required_42_ORDER_UPDATED_AT**: $.message.order.updated_at must be present in the payload
		
		- **condition Enum_Required_47_DESCRIPTOR_CODE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_47_DESCRIPTOR_CODE.1**: every element of $.message.order.items[*].descriptor.code must be in ["SJT", "SFSJT", "RJT", "PASS"]
		  - **condition Enum_Required_47_DESCRIPTOR_CODE.2**: $.message.order.items[*].descriptor.code must be present in the payload
		
		- **condition Enum_Required_48_VEHICLE_CATEGORY**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_48_VEHICLE_CATEGORY.1**: every element of $.message.order.fulfillments[*].vehicle.category must be in ["BUS", "METRO"]
		  - **condition Enum_Required_48_VEHICLE_CATEGORY.2**: $.message.order.fulfillments[*].vehicle.category must be present in the payload
		
		- **condition Enum_Required_49_FULFILLMENTS_TYPE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_49_FULFILLMENTS_TYPE.1**: every element of $.message.order.fulfillments[*].type must be in ["ROUTE", "TRIP"]
		  - **condition Enum_Required_49_FULFILLMENTS_TYPE.2**: $.message.order.fulfillments[*].type must be present in the payload
		
		- **condition Enum_Required_50_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["START", "END", "INTERMEDIATE_STOP", "TRANSIT_STOP"]
		
			> Note: **Condition Enum_Required_50_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload
		
		- **condition Enum_Required_51_AUTHORIZATION_TYPE**: every element of $.message.order.fulfillments[*].stops[*].authorization.type must be in ["QR"]
		
			> Note: **Condition Enum_Required_51_AUTHORIZATION_TYPE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.type must **not** be present in the payload
		
		- **condition Enum_Required_52_AUTHORIZATION_STATUS**: every element of $.message.order.fulfillments[*].stops[*].authorization.status must be in ["UNCLAIMED", "CLAIMED"]
		
			> Note: **Condition Enum_Required_52_AUTHORIZATION_STATUS** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.status must **not** be present in the payload
		
		- **condition Enum_Required_53_PAYMENTS_STATUS**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_53_PAYMENTS_STATUS.1**: every element of $.message.order.payments[*].status must be in ["NOT-PAID", "PAID"]
		  - **condition Enum_Required_53_PAYMENTS_STATUS.2**: $.message.order.payments[*].status must be present in the payload
		
		- **condition Enum_Required_54_PAYMENTS_COLLECTED_BY**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_54_PAYMENTS_COLLECTED_BY.1**: every element of $.message.order.payments[*].collected_by must be in ["BPP", "BAP"]
		  - **condition Enum_Required_54_PAYMENTS_COLLECTED_BY.2**: $.message.order.payments[*].collected_by must be present in the payload
		
		- **condition Enum_Required_55_PAYMENTS_TYPE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_55_PAYMENTS_TYPE.1**: every element of $.message.order.payments[*].type must be in ["PRE-ORDER", "ON-FULFILLMENT", "POST-FULFILLMENT"]
		  - **condition Enum_Required_55_PAYMENTS_TYPE.2**: $.message.order.payments[*].type must be present in the payload
		
		- **condition Enum_Required_56_BREAKUP_TITLE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_56_BREAKUP_TITLE.1**: every element of $.message.order.quote.breakup[*].title must be in ["BASE_PRICE", "REFUND", "CANCELLATION_CHARGES", "OFFER", "TOLL"]
		  - **condition Enum_Required_56_BREAKUP_TITLE.2**: $.message.order.quote.breakup[*].title must be present in the payload
		
		- **condition ROUTE_INFO_Tag_Required_57_DESCRIPTOR_CODE**: every element of $.message.order.fulfillments[*].tags[*].descriptor.code must be in ["ROUTE_INFO", "TICKET_INFO", "TRIP_DETAILS"]
		
			> Note: **Condition ROUTE_INFO_Tag_Required_57_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_0_ROUTE_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='ROUTE_INFO')].list[*].descriptor.code must be in ["ROUTE_ID", "ROUTE_DIRECTION"]
		
		- **condition validate_tag_0_TICKET_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TICKET_INFO')].list[*].descriptor.code must be in ["NUMBER"]
		
		- **condition validate_tag_0_TRIP_DETAILS**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TRIP_DETAILS')].list[*].descriptor.code must be in ["AVAILABLE_TRIPS", "UTILIZED_TRIPS"]
		
		- **condition FARE_POLICY_Tag_Required_61_DESCRIPTOR_CODE**: every element of $.message.order.items[*].tags[*].descriptor.code must be in ["FARE_POLICY"]
		
			> Note: **Condition FARE_POLICY_Tag_Required_61_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.items[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_1_FARE_POLICY**: every element of $.message.order.items[*].tags[?(@.descriptor.code=='FARE_POLICY')].list[*].descriptor.code must be in ["RESTRICTED_PERSON", "RESTRICTION_PROOF"]
		
		- **condition BUYER_FINDER_FEES_Tag_Required_63_DESCRIPTOR_CODE**: every element of $.message.order.payments[*].tags[*].descriptor.code must be in ["BUYER_FINDER_FEES", "SETTLEMENT_TERMS"]
		
			> Note: **Condition BUYER_FINDER_FEES_Tag_Required_63_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.payments[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_2_BUYER_FINDER_FEES**: every element of $.message.order.payments[*].tags[?(@.descriptor.code=='BUYER_FINDER_FEES')].list[*].descriptor.code must be in ["BUYER_FINDER_FEES_TYPE", "BUYER_FINDER_FEES_PERCENTAGE", "BUYER_FINDER_FEES_AMOUNT"]
		
		- **condition validate_tag_2_SETTLEMENT_TERMS**: every element of $.message.order.payments[*].tags[?(@.descriptor.code=='SETTLEMENT_TERMS')].list[*].descriptor.code must be in ["SETTLEMENT_WINDOW", "SETTLEMENT_BASIS", "SETTLEMENT_TYPE", "MANDATORY_ARBITRATION", "COURT_JURISDICTION", "DELAY_INTEREST", "STATIC_TERMS", "SETTLEMENT_AMOUNT"]

- **on_cancel** : All the following sub conditions must pass as per the api requirement

	- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload
	
	- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload
	
	- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload
	
	- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload
	
	- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload
	
	- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload
	
	- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload
	
	- **condition Attri_Required_8_CONTEXT_BPP_ID**: $.context.bpp_id must be present in the payload
	
	- **condition Attri_Required_9_CONTEXT_BPP_URI**: $.context.bpp_uri must be present in the payload
	
	- **condition Enum_Required_38_CONTEXT_ACTION**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_38_CONTEXT_ACTION.1**: every element of $.context.action must be in ["on_cancel"]
	  - **condition Enum_Required_38_CONTEXT_ACTION.2**: $.context.action must be present in the payload
	
	- **condition Enum_Required_39_COUNTRY_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_39_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
	  - **condition Enum_Required_39_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload
	
	- **condition Enum_Required_40_CITY_CODE**: $.context.location.city.code must be present in the payload
	
	- **condition Enum_Required_41_CONTEXT_DOMAIN**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_41_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
	  - **condition Enum_Required_41_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload
	
	- **on_cancel_Message_TESTS** : All the following sub conditions must pass as per the api requirement
	
		- **condition Attri_Required_10_ORDER_ID**: $.message.order.id must be present in the payload
		
		- **condition Attri_Required_11_ORDER_STATUS**: $.message.order.status must be present in the payload
		
		- **condition Attri_Required_12_ITEMS_ID**: $.message.order.items[*].id must be present in the payload
		
		- **condition Attri_Required_13_DESCRIPTOR_NAME**: $.message.order.items[*].descriptor.name must be present in the payload
		
		- **condition Attri_Required_14_PRICE_CURRENCY**: $.message.order.items[*].price.currency must be present in the payload
		
		- **condition Attri_Required_15_PRICE_VALUE**: $.message.order.items[*].price.value must be present in the payload
		
		- **condition Attri_Required_16_SELECTED_COUNT**: $.message.order.items[*].quantity.selected.count must be present in the payload
		
		- **condition Attri_Required_17_ITEMS_FULFILLMENT_IDS**: $.message.order.items[*].fulfillment_ids[*] must be present in the payload
		
		- **condition Attri_Required_18_ITEMS_CATEGORY_IDS**: $.message.order.items[*].category_ids[*] must be present in the payload
		
		- **condition Attri_Required_19_TIME_LABEL**: $.message.order.items[*].time.label must be present in the payload
		
		- **condition Attri_Required_20_TIME_DURATION**: $.message.order.items[*].time.duration must be present in the payload
		
		- **condition Attri_Required_21_PROVIDER_ID**: $.message.order.provider.id must be present in the payload
		
		- **condition Attri_Required_22_DESCRIPTOR_NAME**: $.message.order.provider.descriptor.name must be present in the payload
		
		- **condition Attri_Required_23_IMAGES_URL**: $.message.order.provider.descriptor.images[*].url must be present in the payload
		
		- **condition Attri_Required_24_RANGE_START**: $.message.order.provider.time.range.start must be present in the payload
		
		- **condition Attri_Required_25_RANGE_END**: $.message.order.provider.time.range.end must be present in the payload
		
		- **condition Attri_Required_26_FULFILLMENTS_ID**: $.message.order.fulfillments[*].id must be present in the payload
		
		- **condition Attri_Required_27_FULFILLMENTS_ID**: $.message.order.fulfillments[*].id must be present in the payload
		
		- **condition Attri_Required_28_LOCATION_GPS**: $.message.order.fulfillments[*].stops[*].location.gps must be present in the payload
		
		- **condition Attri_Required_29_PRICE_VALUE**: $.message.order.quote.price.value must be present in the payload
		
		- **condition Attri_Required_30_PRICE_CURRENCY**: $.message.order.quote.price.currency must be present in the payload
		
		- **condition Attri_Required_31_PAYMENTS_ID**: $.message.order.payments[*].id must be present in the payload
		
		- **condition Attri_Required_32_PARAMS_BANK_CODE**: $.message.order.payments[*].params.bank_code must be present in the payload
		
		- **condition Attri_Required_33_PARAMS_BANK_ACCOUNT_NUMBER**: $.message.order.payments[*].params.bank_account_number must be present in the payload
		
		- **condition Attri_Required_34_EXTERNAL_REF_URL**: $.message.order.cancellation_terms[*].external_ref.url must be present in the payload
		
		- **condition Attri_Required_35_EXTERNAL_REF_MIMETYPE**: $.message.order.cancellation_terms[*].external_ref.mimetype must be present in the payload
		
		- **condition Attri_Required_36_CANCELLATION_CANCELLED_BY**: $.message.order.cancellation.cancelled_by must be present in the payload
		
		- **condition Attri_Required_37_CANCELLATION_TIME**: $.message.order.cancellation.time must be present in the payload
		
		- **condition Enum_Required_42_DESCRIPTOR_CODE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_42_DESCRIPTOR_CODE.1**: every element of $.message.order.items[*].descriptor.code must be in ["SJT", "SFSJT", "RJT", "PASS"]
		  - **condition Enum_Required_42_DESCRIPTOR_CODE.2**: $.message.order.items[*].descriptor.code must be present in the payload
		
		- **condition Enum_Required_43_VEHICLE_CATEGORY**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_43_VEHICLE_CATEGORY.1**: every element of $.message.order.fulfillments[*].vehicle.category must be in ["BUS", "METRO"]
		  - **condition Enum_Required_43_VEHICLE_CATEGORY.2**: $.message.order.fulfillments[*].vehicle.category must be present in the payload
		
		- **condition Enum_Required_44_FULFILLMENTS_TYPE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_44_FULFILLMENTS_TYPE.1**: every element of $.message.order.fulfillments[*].type must be in ["ROUTE", "TRIP"]
		  - **condition Enum_Required_44_FULFILLMENTS_TYPE.2**: $.message.order.fulfillments[*].type must be present in the payload
		
		- **condition Enum_Required_45_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["START", "END", "INTERMEDIATE_STOP", "TRANSIT_STOP"]
		
			> Note: **Condition Enum_Required_45_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload
		
		- **condition Enum_Required_46_AUTHORIZATION_TYPE**: every element of $.message.order.fulfillments[*].stops[*].authorization.type must be in ["QR"]
		
			> Note: **Condition Enum_Required_46_AUTHORIZATION_TYPE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.type must **not** be present in the payload
		
		- **condition Enum_Required_47_AUTHORIZATION_STATUS**: every element of $.message.order.fulfillments[*].stops[*].authorization.status must be in ["UNCLAIMED", "CLAIMED"]
		
			> Note: **Condition Enum_Required_47_AUTHORIZATION_STATUS** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.status must **not** be present in the payload
		
		- **condition Enum_Required_48_PAYMENTS_STATUS**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_48_PAYMENTS_STATUS.1**: every element of $.message.order.payments[*].status must be in ["NOT-PAID", "PAID"]
		  - **condition Enum_Required_48_PAYMENTS_STATUS.2**: $.message.order.payments[*].status must be present in the payload
		
		- **condition Enum_Required_49_PAYMENTS_COLLECTED_BY**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_49_PAYMENTS_COLLECTED_BY.1**: every element of $.message.order.payments[*].collected_by must be in ["BPP", "BAP"]
		  - **condition Enum_Required_49_PAYMENTS_COLLECTED_BY.2**: $.message.order.payments[*].collected_by must be present in the payload
		
		- **condition Enum_Required_50_PAYMENTS_TYPE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_50_PAYMENTS_TYPE.1**: every element of $.message.order.payments[*].type must be in ["PRE-ORDER", "ON-FULFILLMENT", "POST-FULFILLMENT"]
		  - **condition Enum_Required_50_PAYMENTS_TYPE.2**: $.message.order.payments[*].type must be present in the payload
		
		- **condition Enum_Required_51_BREAKUP_TITLE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_51_BREAKUP_TITLE.1**: every element of $.message.order.quote.breakup[*].title must be in ["BASE_PRICE", "REFUND", "CANCELLATION_CHARGES", "OFFER", "TOLL"]
		  - **condition Enum_Required_51_BREAKUP_TITLE.2**: $.message.order.quote.breakup[*].title must be present in the payload
		
		- **condition ROUTE_INFO_Tag_Required_52_DESCRIPTOR_CODE**: every element of $.message.order.fulfillments[*].tags[*].descriptor.code must be in ["ROUTE_INFO", "TICKET_INFO", "TRIP_DETAILS"]
		
			> Note: **Condition ROUTE_INFO_Tag_Required_52_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_0_ROUTE_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='ROUTE_INFO')].list[*].descriptor.code must be in ["ROUTE_ID", "ROUTE_DIRECTION"]
		
		- **condition validate_tag_0_TICKET_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TICKET_INFO')].list[*].descriptor.code must be in ["NUMBER"]
		
		- **condition validate_tag_0_TRIP_DETAILS**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TRIP_DETAILS')].list[*].descriptor.code must be in ["AVAILABLE_TRIPS", "UTILIZED_TRIPS"]
		
		- **condition FARE_POLICY_Tag_Required_56_DESCRIPTOR_CODE**: every element of $.message.order.items[*].tags[*].descriptor.code must be in ["FARE_POLICY"]
		
			> Note: **Condition FARE_POLICY_Tag_Required_56_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.items[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_1_FARE_POLICY**: every element of $.message.order.items[*].tags[?(@.descriptor.code=='FARE_POLICY')].list[*].descriptor.code must be in ["RESTRICTED_PERSON", "RESTRICTION_PROOF"]
		
		- **condition BUYER_FINDER_FEES_Tag_Required_58_DESCRIPTOR_CODE**: every element of $.message.order.payments[*].tags[*].descriptor.code must be in ["BUYER_FINDER_FEES", "SETTLEMENT_TERMS"]
		
			> Note: **Condition BUYER_FINDER_FEES_Tag_Required_58_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.payments[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_2_BUYER_FINDER_FEES**: every element of $.message.order.payments[*].tags[?(@.descriptor.code=='BUYER_FINDER_FEES')].list[*].descriptor.code must be in ["BUYER_FINDER_FEES_TYPE", "BUYER_FINDER_FEES_PERCENTAGE", "BUYER_FINDER_FEES_AMOUNT"]
		
		- **condition validate_tag_2_SETTLEMENT_TERMS**: every element of $.message.order.payments[*].tags[?(@.descriptor.code=='SETTLEMENT_TERMS')].list[*].descriptor.code must be in ["SETTLEMENT_WINDOW", "SETTLEMENT_BASIS", "SETTLEMENT_TYPE", "MANDATORY_ARBITRATION", "COURT_JURISDICTION", "DELAY_INTEREST", "STATIC_TERMS", "SETTLEMENT_AMOUNT"]

- **on_update** : All the following sub conditions must pass as per the api requirement

	- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload
	
	- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload
	
	- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload
	
	- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload
	
	- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload
	
	- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload
	
	- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload
	
	- **condition Attri_Required_8_CONTEXT_BPP_ID**: $.context.bpp_id must be present in the payload
	
	- **condition Attri_Required_9_CONTEXT_BPP_URI**: $.context.bpp_uri must be present in the payload
	
	- **condition Enum_Required_39_CONTEXT_ACTION**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_39_CONTEXT_ACTION.1**: every element of $.context.action must be in ["on_cancel"]
	  - **condition Enum_Required_39_CONTEXT_ACTION.2**: $.context.action must be present in the payload
	
	- **condition Enum_Required_40_COUNTRY_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_40_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
	  - **condition Enum_Required_40_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload
	
	- **condition Enum_Required_41_CITY_CODE**: $.context.location.city.code must be present in the payload
	
	- **condition Enum_Required_42_CONTEXT_DOMAIN**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_42_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
	  - **condition Enum_Required_42_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload
	
	- **on_update_Message_TESTS** : All the following sub conditions must pass as per the api requirement
	
		- **condition Attri_Required_10_ORDER_ID**: $.message.order.id must be present in the payload
		
		- **condition Attri_Required_11_ITEMS_ID**: $.message.order.items[*].id must be present in the payload
		
		- **condition Attri_Required_12_DESCRIPTOR_NAME**: $.message.order.items[*].descriptor.name must be present in the payload
		
		- **condition Attri_Required_13_PRICE_CURRENCY**: $.message.order.items[*].price.currency must be present in the payload
		
		- **condition Attri_Required_14_PRICE_VALUE**: $.message.order.items[*].price.value must be present in the payload
		
		- **condition Attri_Required_15_SELECTED_COUNT**: $.message.order.items[*].quantity.selected.count must be present in the payload
		
		- **condition Attri_Required_16_ITEMS_FULFILLMENT_IDS**: $.message.order.items[*].fulfillment_ids[*] must be present in the payload
		
		- **condition Attri_Required_17_TIME_LABEL**: $.message.order.items[*].time.label must be present in the payload
		
		- **condition Attri_Required_18_TIME_DURATION**: $.message.order.items[*].time.duration must be present in the payload
		
		- **condition Attri_Required_19_PROVIDER_ID**: $.message.order.provider.id must be present in the payload
		
		- **condition Attri_Required_20_DESCRIPTOR_NAME**: $.message.order.provider.descriptor.name must be present in the payload
		
		- **condition Attri_Required_21_FULFILLMENTS_ID**: $.message.order.fulfillments[*].id must be present in the payload
		
		- **condition Attri_Required_22_INSTRUCTIONS_NAME**: $.message.order.fulfillments[*].stops[*].instructions.name must be present in the payload
		
		- **condition Attri_Required_23_DESCRIPTOR_NAME**: $.message.order.fulfillments[*].stops[*].location.descriptor.name must be present in the payload
		
		- **condition Attri_Required_24_DESCRIPTOR_CODE**: $.message.order.fulfillments[*].stops[*].location.descriptor.code must be present in the payload
		
		- **condition Attri_Required_25_LOCATION_GPS**: $.message.order.fulfillments[*].stops[*].location.gps must be present in the payload
		
		- **condition Attri_Required_26_AUTHORIZATION_TOKEN**: $.message.order.fulfillments[*].stops[*].authorization.token must be present in the payload
		
		- **condition Attri_Required_27_AUTHORIZATION_VALID_TO**: $.message.order.fulfillments[*].stops[*].authorization.valid_to must be present in the payload
		
		- **condition Attri_Required_28_FULFILLMENTS_ID**: $.message.order.fulfillments[*].id must be present in the payload
		
		- **condition Attri_Required_29_PRICE_VALUE**: $.message.order.quote.price.value must be present in the payload
		
		- **condition Attri_Required_30_PRICE_CURRENCY**: $.message.order.quote.price.currency must be present in the payload
		
		- **condition Attri_Required_31_ITEM_ID**: $.message.order.quote.breakup[*].item.id must be present in the payload
		
		- **condition Attri_Required_32_PRICE_CURRENCY**: $.message.order.quote.breakup[*].price.currency must be present in the payload
		
		- **condition Attri_Required_33_PRICE_VALUE**: $.message.order.quote.breakup[*].price.value must be present in the payload
		
		- **condition Attri_Required_34_PAYMENTS_ID**: $.message.order.payments[*].id must be present in the payload
		
		- **condition Attri_Required_35_PARAMS_TRANSACTION_ID**: $.message.order.payments[*].params.transaction_id must be present in the payload
		
		- **condition Attri_Required_36_PARAMS_CURRENCY**: $.message.order.payments[*].params.currency must be present in the payload
		
		- **condition Attri_Required_37_PARAMS_AMOUNT**: $.message.order.payments[*].params.amount must be present in the payload
		
		- **condition Attri_Required_38_CANCEL_BY_DURATION**: $.message.order.cancellation_terms[*].cancel_by.duration must be present in the payload
		
		- **condition Enum_Required_43_DESCRIPTOR_CODE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_43_DESCRIPTOR_CODE.1**: every element of $.message.order.items[*].descriptor.code must be in ["SJT", "SFSJT", "RJT", "PASS"]
		  - **condition Enum_Required_43_DESCRIPTOR_CODE.2**: $.message.order.items[*].descriptor.code must be present in the payload
		
		- **condition Enum_Required_44_VEHICLE_CATEGORY**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_44_VEHICLE_CATEGORY.1**: every element of $.message.order.fulfillments[*].vehicle.category must be in ["BUS", "METRO"]
		  - **condition Enum_Required_44_VEHICLE_CATEGORY.2**: $.message.order.fulfillments[*].vehicle.category must be present in the payload
		
		- **condition Enum_Required_45_FULFILLMENTS_TYPE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_45_FULFILLMENTS_TYPE.1**: every element of $.message.order.fulfillments[*].type must be in ["ROUTE", "TRIP"]
		  - **condition Enum_Required_45_FULFILLMENTS_TYPE.2**: $.message.order.fulfillments[*].type must be present in the payload
		
		- **condition Enum_Required_46_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["START", "END", "INTERMEDIATE_STOP", "TRANSIT_STOP"]
		
			> Note: **Condition Enum_Required_46_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload
		
		- **condition Enum_Required_47_AUTHORIZATION_TYPE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_47_AUTHORIZATION_TYPE.1**: every element of $.message.order.fulfillments[*].stops[*].authorization.type must be in ["QR"]
		  - **condition Enum_Required_47_AUTHORIZATION_TYPE.2**: $.message.order.fulfillments[*].stops[*].authorization.type must be present in the payload
		
		- **condition Enum_Required_48_AUTHORIZATION_STATUS**: every element of $.message.order.fulfillments[*].stops[*].authorization.status must be in ["UNCLAIMED", "CLAIMED"]
		
			> Note: **Condition Enum_Required_48_AUTHORIZATION_STATUS** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.status must **not** be present in the payload
		
		- **condition Enum_Required_49_PAYMENTS_STATUS**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_49_PAYMENTS_STATUS.1**: every element of $.message.order.payments[*].status must be in ["NOT-PAID", "PAID"]
		  - **condition Enum_Required_49_PAYMENTS_STATUS.2**: $.message.order.payments[*].status must be present in the payload
		
		- **condition Enum_Required_50_PAYMENTS_COLLECTED_BY**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_50_PAYMENTS_COLLECTED_BY.1**: every element of $.message.order.payments[*].collected_by must be in ["BPP", "BAP"]
		  - **condition Enum_Required_50_PAYMENTS_COLLECTED_BY.2**: $.message.order.payments[*].collected_by must be present in the payload
		
		- **condition Enum_Required_51_PAYMENTS_TYPE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_51_PAYMENTS_TYPE.1**: every element of $.message.order.payments[*].type must be in ["PRE-ORDER", "ON-FULFILLMENT", "POST-FULFILLMENT"]
		  - **condition Enum_Required_51_PAYMENTS_TYPE.2**: $.message.order.payments[*].type must be present in the payload
		
		- **condition Enum_Required_52_BREAKUP_TITLE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_52_BREAKUP_TITLE.1**: every element of $.message.order.quote.breakup[*].title must be in ["BASE_PRICE", "REFUND", "CANCELLATION_CHARGES", "OFFER", "TOLL"]
		  - **condition Enum_Required_52_BREAKUP_TITLE.2**: $.message.order.quote.breakup[*].title must be present in the payload
		
		- **condition ROUTE_INFO_Tag_Required_53_DESCRIPTOR_CODE**: every element of $.message.order.fulfillments[*].tags[*].descriptor.code must be in ["ROUTE_INFO", "TICKET_INFO", "TRIP_DETAILS"]
		
			> Note: **Condition ROUTE_INFO_Tag_Required_53_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_0_ROUTE_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='ROUTE_INFO')].list[*].descriptor.code must be in ["ROUTE_ID", "ROUTE_DIRECTION"]
		
		- **condition validate_tag_0_TICKET_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TICKET_INFO')].list[*].descriptor.code must be in ["NUMBER"]
		
		- **condition validate_tag_0_TRIP_DETAILS**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TRIP_DETAILS')].list[*].descriptor.code must be in ["AVAILABLE_TRIPS", "UTILIZED_TRIPS"]
		
		- **condition FARE_POLICY_Tag_Required_57_DESCRIPTOR_CODE**: every element of $.message.order.items[*].tags[*].descriptor.code must be in ["FARE_POLICY"]
		
			> Note: **Condition FARE_POLICY_Tag_Required_57_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.items[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_1_FARE_POLICY**: every element of $.message.order.items[*].tags[?(@.descriptor.code=='FARE_POLICY')].list[*].descriptor.code must be in ["RESTRICTED_PERSON", "RESTRICTION_PROOF"]

- **on_status** : All the following sub conditions must pass as per the api requirement

	- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload
	
	- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload
	
	- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload
	
	- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload
	
	- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload
	
	- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload
	
	- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload
	
	- **condition Attri_Required_8_CONTEXT_BPP_ID**: $.context.bpp_id must be present in the payload
	
	- **condition Attri_Required_9_CONTEXT_BPP_URI**: $.context.bpp_uri must be present in the payload
	
	- **condition Enum_Required_43_CONTEXT_ACTION**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_43_CONTEXT_ACTION.1**: every element of $.context.action must be in ["on_status"]
	  - **condition Enum_Required_43_CONTEXT_ACTION.2**: $.context.action must be present in the payload
	
	- **condition Enum_Required_44_COUNTRY_CODE**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_44_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
	  - **condition Enum_Required_44_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload
	
	- **condition Enum_Required_45_CITY_CODE**: $.context.location.city.code must be present in the payload
	
	- **condition Enum_Required_46_CONTEXT_DOMAIN**: all of the following sub conditions must be met:
	
	  - **condition Enum_Required_46_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
	  - **condition Enum_Required_46_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload
	
	- **on_status_Message_TESTS** : All the following sub conditions must pass as per the api requirement
	
		- **condition Attri_Required_10_ORDER_ID**: $.message.order.id must be present in the payload
		
		- **condition Attri_Required_11_ORDER_STATUS**: $.message.order.status must be present in the payload
		
		- **condition Attri_Required_12_ITEMS_ID**: $.message.order.items[*].id must be present in the payload
		
		- **condition Attri_Required_13_DESCRIPTOR_NAME**: $.message.order.items[*].descriptor.name must be present in the payload
		
		- **condition Attri_Required_14_PRICE_CURRENCY**: $.message.order.items[*].price.currency must be present in the payload
		
		- **condition Attri_Required_15_PRICE_VALUE**: $.message.order.items[*].price.value must be present in the payload
		
		- **condition Attri_Required_16_SELECTED_COUNT**: $.message.order.items[*].quantity.selected.count must be present in the payload
		
		- **condition Attri_Required_17_ITEMS_FULFILLMENT_IDS**: $.message.order.items[*].fulfillment_ids[*] must be present in the payload
		
		- **condition Attri_Required_18_TIME_LABEL**: $.message.order.items[*].time.label must be present in the payload
		
		- **condition Attri_Required_19_TIME_DURATION**: $.message.order.items[*].time.duration must be present in the payload
		
		- **condition Attri_Required_20_PROVIDER_ID**: $.message.order.provider.id must be present in the payload
		
		- **condition Attri_Required_21_DESCRIPTOR_NAME**: $.message.order.provider.descriptor.name must be present in the payload
		
		- **condition Attri_Required_22_FULFILLMENTS_ID**: $.message.order.fulfillments[*].id must be present in the payload
		
		- **condition Attri_Required_23_LOCATION_GPS**: $.message.order.fulfillments[*].stops[*].location.gps must be present in the payload
		
		- **condition Attri_Required_24_FULFILLMENTS_ID**: $.message.order.fulfillments[*].id must be present in the payload
		
		- **condition Attri_Required_25_PRICE_VALUE**: $.message.order.quote.price.value must be present in the payload
		
		- **condition Attri_Required_26_PRICE_CURRENCY**: $.message.order.quote.price.currency must be present in the payload
		
		- **condition Attri_Required_27_ITEM_ID**: $.message.order.quote.breakup[*].item.id must be present in the payload
		
		- **condition Attri_Required_28_PAYMENTS_ID**: $.message.order.payments[*].id must be present in the payload
		
		- **condition Attri_Required_29_PARAMS_TRANSACTION_ID**: $.message.order.payments[*].params.transaction_id must be present in the payload
		
		- **condition Attri_Required_30_PARAMS_CURRENCY**: $.message.order.payments[*].params.currency must be present in the payload
		
		- **condition Attri_Required_31_PARAMS_AMOUNT**: $.message.order.payments[*].params.amount must be present in the payload
		
		- **condition Attri_Required_32_CANCEL_BY_DURATION**: $.message.order.cancellation_terms[*].cancel_by.duration must be present in the payload
		
		- **condition Attri_Required_33_ITEMS_CATEGORY_IDS**: $.message.order.items[*].category_ids[*] must be present in the payload
		
		- **condition Attri_Required_34_RANGE_START**: $.message.order.provider.time.range.start must be present in the payload
		
		- **condition Attri_Required_35_RANGE_END**: $.message.order.provider.time.range.end must be present in the payload
		
		- **condition Attri_Required_36_PRICE_CURRENCY**: $.message.order.quote.breakup[*].item.price.currency must be present in the payload
		
		- **condition Attri_Required_37_PRICE_VALUE**: $.message.order.quote.breakup[*].item.price.value must be present in the payload
		
		- **condition Attri_Required_38_SELECTED_COUNT**: $.message.order.quote.breakup[*].item.quantity.selected.count must be present in the payload
		
		- **condition Attri_Required_39_EXTERNAL_REF_URL**: $.message.order.cancellation_terms[*].external_ref.url must be present in the payload
		
		- **condition Attri_Required_40_EXTERNAL_REF_MIMETYPE**: $.message.order.cancellation_terms[*].external_ref.mimetype must be present in the payload
		
		- **condition Attri_Required_41_ORDER_CREATED_AT**: $.message.order.created_at must be present in the payload
		
		- **condition Attri_Required_42_ORDER_UPDATED_AT**: $.message.order.updated_at must be present in the payload
		
		- **condition Enum_Required_47_DESCRIPTOR_CODE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_47_DESCRIPTOR_CODE.1**: every element of $.message.order.items[*].descriptor.code must be in ["SJT", "SFSJT", "RJT", "PASS"]
		  - **condition Enum_Required_47_DESCRIPTOR_CODE.2**: $.message.order.items[*].descriptor.code must be present in the payload
		
		- **condition Enum_Required_48_VEHICLE_CATEGORY**: every element of $.message.order.fulfillments[*].vehicle.category must be in ["BUS", "METRO"]
		
			> Note: **Condition Enum_Required_48_VEHICLE_CATEGORY** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].vehicle.category must **not** be present in the payload
		
		- **condition Enum_Required_49_FULFILLMENTS_TYPE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_49_FULFILLMENTS_TYPE.1**: every element of $.message.order.fulfillments[*].type must be in ["ROUTE", "TRIP"]
		  - **condition Enum_Required_49_FULFILLMENTS_TYPE.2**: $.message.order.fulfillments[*].type must be present in the payload
		
		- **condition Enum_Required_50_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["START", "END", "INTERMEDIATE_STOP", "TRANSIT_STOP"]
		
			> Note: **Condition Enum_Required_50_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload
		
		- **condition Enum_Required_51_AUTHORIZATION_TYPE**: every element of $.message.order.fulfillments[*].stops[*].authorization.type must be in ["QR"]
		
			> Note: **Condition Enum_Required_51_AUTHORIZATION_TYPE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.type must **not** be present in the payload
		
		- **condition Enum_Required_52_AUTHORIZATION_STATUS**: every element of $.message.order.fulfillments[*].stops[*].authorization.status must be in ["UNCLAIMED", "CLAIMED"]
		
			> Note: **Condition Enum_Required_52_AUTHORIZATION_STATUS** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.status must **not** be present in the payload
		
		- **condition Enum_Required_53_PAYMENTS_STATUS**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_53_PAYMENTS_STATUS.1**: every element of $.message.order.payments[*].status must be in ["NOT-PAID", "PAID"]
		  - **condition Enum_Required_53_PAYMENTS_STATUS.2**: $.message.order.payments[*].status must be present in the payload
		
		- **condition Enum_Required_54_PAYMENTS_COLLECTED_BY**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_54_PAYMENTS_COLLECTED_BY.1**: every element of $.message.order.payments[*].collected_by must be in ["BPP", "BAP"]
		  - **condition Enum_Required_54_PAYMENTS_COLLECTED_BY.2**: $.message.order.payments[*].collected_by must be present in the payload
		
		- **condition Enum_Required_55_PAYMENTS_TYPE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_55_PAYMENTS_TYPE.1**: every element of $.message.order.payments[*].type must be in ["PRE-ORDER", "ON-FULFILLMENT", "POST-FULFILLMENT"]
		  - **condition Enum_Required_55_PAYMENTS_TYPE.2**: $.message.order.payments[*].type must be present in the payload
		
		- **condition Enum_Required_56_BREAKUP_TITLE**: all of the following sub conditions must be met:
		
		  - **condition Enum_Required_56_BREAKUP_TITLE.1**: every element of $.message.order.quote.breakup[*].title must be in ["BASE_PRICE", "REFUND", "CANCELLATION_CHARGES", "OFFER", "TOLL"]
		  - **condition Enum_Required_56_BREAKUP_TITLE.2**: $.message.order.quote.breakup[*].title must be present in the payload
		
		- **condition ROUTE_INFO_Tag_Required_57_DESCRIPTOR_CODE**: every element of $.message.order.fulfillments[*].tags[*].descriptor.code must be in ["ROUTE_INFO", "TICKET_INFO", "TRIP_DETAILS"]
		
			> Note: **Condition ROUTE_INFO_Tag_Required_57_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.fulfillments[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_0_ROUTE_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='ROUTE_INFO')].list[*].descriptor.code must be in ["ROUTE_ID", "ROUTE_DIRECTION"]
		
		- **condition validate_tag_0_TICKET_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TICKET_INFO')].list[*].descriptor.code must be in ["NUMBER"]
		
		- **condition validate_tag_0_TRIP_DETAILS**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TRIP_DETAILS')].list[*].descriptor.code must be in ["AVAILABLE_TRIPS", "UTILIZED_TRIPS"]
		
		- **condition FARE_POLICY_Tag_Required_61_DESCRIPTOR_CODE**: every element of $.message.order.items[*].tags[*].descriptor.code must be in ["FARE_POLICY"]
		
			> Note: **Condition FARE_POLICY_Tag_Required_61_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.items[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_1_FARE_POLICY**: every element of $.message.order.items[*].tags[?(@.descriptor.code=='FARE_POLICY')].list[*].descriptor.code must be in ["RESTRICTED_PERSON", "RESTRICTION_PROOF"]
		
		- **condition BUYER_FINDER_FEES_Tag_Required_63_DESCRIPTOR_CODE**: every element of $.message.order.payments[*].tags[*].descriptor.code must be in ["BUYER_FINDER_FEES", "SETTLEMENT_TERMS"]
		
			> Note: **Condition BUYER_FINDER_FEES_Tag_Required_63_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
			>
			> - **condition B**: $.message.order.payments[*].tags[*].descriptor.code must **not** be present in the payload
		
		- **condition validate_tag_2_BUYER_FINDER_FEES**: every element of $.message.order.payments[*].tags[?(@.descriptor.code=='BUYER_FINDER_FEES')].list[*].descriptor.code must be in ["BUYER_FINDER_FEES_TYPE", "BUYER_FINDER_FEES_PERCENTAGE", "BUYER_FINDER_FEES_AMOUNT"]
		
		- **condition validate_tag_2_SETTLEMENT_TERMS**: every element of $.message.order.payments[*].tags[?(@.descriptor.code=='SETTLEMENT_TERMS')].list[*].descriptor.code must be in ["SETTLEMENT_WINDOW", "SETTLEMENT_BASIS", "SETTLEMENT_TYPE", "MANDATORY_ARBITRATION", "COURT_JURISDICTION", "DELAY_INTEREST", "STATIC_TERMS", "SETTLEMENT_AMOUNT"]