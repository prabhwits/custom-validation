import payloadUtils from "../utils/json-path-utils";
import validations from "../utils/validation-utils";
import {
    testFunctionArray,
    validationInput,
    validationOutput,
} from "../types/test-config";

export default function on_status(input: validationInput): validationOutput {
    const scope = payloadUtils.getJsonPath(input.payload, "$");
    let subResults: validationOutput = [];
    let valid = true;
    for (const testObj of scope) {
        testObj._EXTERNAL = input.externalData;

        function Attri_Required_1_CONTEXT_TIMESTAMP(
            input: validationInput,
        ): validationOutput {
            const scope = payloadUtils.getJsonPath(input.payload, "$");
            let subResults: validationOutput = [];
            let valid = true;
            for (const testObj of scope) {
                testObj._EXTERNAL = input.externalData;
                const attr = payloadUtils.getJsonPath(
                    testObj,
                    "$.context.timestamp",
                );

                const validate = validations.arePresent(attr);

                if (!validate) {
                    return [
                        {
                            valid: false,
                            code: 30000,
                            description: `- **condition Attri_Required_1_CONTEXT_TIMESTAMP**: $.context.timestamp must be present in the payload`,
                        },
                    ];
                }

                delete testObj._EXTERNAL;
            }
            return [{ valid: valid, code: 200 }, ...subResults];
        }
        function Attri_Required_2_CONTEXT_BAP_ID(
            input: validationInput,
        ): validationOutput {
            const scope = payloadUtils.getJsonPath(input.payload, "$");
            let subResults: validationOutput = [];
            let valid = true;
            for (const testObj of scope) {
                testObj._EXTERNAL = input.externalData;
                const attr = payloadUtils.getJsonPath(
                    testObj,
                    "$.context.bap_id",
                );

                const validate = validations.arePresent(attr);

                if (!validate) {
                    return [
                        {
                            valid: false,
                            code: 30000,
                            description: `- **condition Attri_Required_2_CONTEXT_BAP_ID**: $.context.bap_id must be present in the payload`,
                        },
                    ];
                }

                delete testObj._EXTERNAL;
            }
            return [{ valid: valid, code: 200 }, ...subResults];
        }
        function Attri_Required_3_CONTEXT_TRANSACTION_ID(
            input: validationInput,
        ): validationOutput {
            const scope = payloadUtils.getJsonPath(input.payload, "$");
            let subResults: validationOutput = [];
            let valid = true;
            for (const testObj of scope) {
                testObj._EXTERNAL = input.externalData;
                const attr = payloadUtils.getJsonPath(
                    testObj,
                    "$.context.transaction_id",
                );

                const validate = validations.arePresent(attr);

                if (!validate) {
                    return [
                        {
                            valid: false,
                            code: 30000,
                            description: `- **condition Attri_Required_3_CONTEXT_TRANSACTION_ID**: $.context.transaction_id must be present in the payload`,
                        },
                    ];
                }

                delete testObj._EXTERNAL;
            }
            return [{ valid: valid, code: 200 }, ...subResults];
        }
        function Attri_Required_4_CONTEXT_MESSAGE_ID(
            input: validationInput,
        ): validationOutput {
            const scope = payloadUtils.getJsonPath(input.payload, "$");
            let subResults: validationOutput = [];
            let valid = true;
            for (const testObj of scope) {
                testObj._EXTERNAL = input.externalData;
                const attr = payloadUtils.getJsonPath(
                    testObj,
                    "$.context.message_id",
                );

                const validate = validations.arePresent(attr);

                if (!validate) {
                    return [
                        {
                            valid: false,
                            code: 30000,
                            description: `- **condition Attri_Required_4_CONTEXT_MESSAGE_ID**: $.context.message_id must be present in the payload`,
                        },
                    ];
                }

                delete testObj._EXTERNAL;
            }
            return [{ valid: valid, code: 200 }, ...subResults];
        }
        function Attri_Required_5_CONTEXT_VERSION(
            input: validationInput,
        ): validationOutput {
            const scope = payloadUtils.getJsonPath(input.payload, "$");
            let subResults: validationOutput = [];
            let valid = true;
            for (const testObj of scope) {
                testObj._EXTERNAL = input.externalData;
                const attr = payloadUtils.getJsonPath(
                    testObj,
                    "$.context.version",
                );

                const validate = validations.arePresent(attr);

                if (!validate) {
                    return [
                        {
                            valid: false,
                            code: 30000,
                            description: `- **condition Attri_Required_5_CONTEXT_VERSION**: $.context.version must be present in the payload`,
                        },
                    ];
                }

                delete testObj._EXTERNAL;
            }
            return [{ valid: valid, code: 200 }, ...subResults];
        }
        function Attri_Required_6_CONTEXT_BAP_URI(
            input: validationInput,
        ): validationOutput {
            const scope = payloadUtils.getJsonPath(input.payload, "$");
            let subResults: validationOutput = [];
            let valid = true;
            for (const testObj of scope) {
                testObj._EXTERNAL = input.externalData;
                const attr = payloadUtils.getJsonPath(
                    testObj,
                    "$.context.bap_uri",
                );

                const validate = validations.arePresent(attr);

                if (!validate) {
                    return [
                        {
                            valid: false,
                            code: 30000,
                            description: `- **condition Attri_Required_6_CONTEXT_BAP_URI**: $.context.bap_uri must be present in the payload`,
                        },
                    ];
                }

                delete testObj._EXTERNAL;
            }
            return [{ valid: valid, code: 200 }, ...subResults];
        }
        function Attri_Required_7_CONTEXT_TTL(
            input: validationInput,
        ): validationOutput {
            const scope = payloadUtils.getJsonPath(input.payload, "$");
            let subResults: validationOutput = [];
            let valid = true;
            for (const testObj of scope) {
                testObj._EXTERNAL = input.externalData;
                const attr = payloadUtils.getJsonPath(testObj, "$.context.ttl");

                const validate = validations.arePresent(attr);

                if (!validate) {
                    return [
                        {
                            valid: false,
                            code: 30000,
                            description: `- **condition Attri_Required_7_CONTEXT_TTL**: $.context.ttl must be present in the payload`,
                        },
                    ];
                }

                delete testObj._EXTERNAL;
            }
            return [{ valid: valid, code: 200 }, ...subResults];
        }
        function Attri_Required_8_CONTEXT_BPP_ID(
            input: validationInput,
        ): validationOutput {
            const scope = payloadUtils.getJsonPath(input.payload, "$");
            let subResults: validationOutput = [];
            let valid = true;
            for (const testObj of scope) {
                testObj._EXTERNAL = input.externalData;
                const attr = payloadUtils.getJsonPath(
                    testObj,
                    "$.context.bpp_id",
                );

                const validate = validations.arePresent(attr);

                if (!validate) {
                    return [
                        {
                            valid: false,
                            code: 30000,
                            description: `- **condition Attri_Required_8_CONTEXT_BPP_ID**: $.context.bpp_id must be present in the payload`,
                        },
                    ];
                }

                delete testObj._EXTERNAL;
            }
            return [{ valid: valid, code: 200 }, ...subResults];
        }
        function Attri_Required_9_CONTEXT_BPP_URI(
            input: validationInput,
        ): validationOutput {
            const scope = payloadUtils.getJsonPath(input.payload, "$");
            let subResults: validationOutput = [];
            let valid = true;
            for (const testObj of scope) {
                testObj._EXTERNAL = input.externalData;
                const attr = payloadUtils.getJsonPath(
                    testObj,
                    "$.context.bpp_uri",
                );

                const validate = validations.arePresent(attr);

                if (!validate) {
                    return [
                        {
                            valid: false,
                            code: 30000,
                            description: `- **condition Attri_Required_9_CONTEXT_BPP_URI**: $.context.bpp_uri must be present in the payload`,
                        },
                    ];
                }

                delete testObj._EXTERNAL;
            }
            return [{ valid: valid, code: 200 }, ...subResults];
        }
        function Enum_Required_43_CONTEXT_ACTION(
            input: validationInput,
        ): validationOutput {
            const scope = payloadUtils.getJsonPath(input.payload, "$");
            let subResults: validationOutput = [];
            let valid = true;
            for (const testObj of scope) {
                testObj._EXTERNAL = input.externalData;
                const enumList = ["on_status"];
                const enumPath = payloadUtils.getJsonPath(
                    testObj,
                    "$.context.action",
                );

                const validate =
                    validations.allIn(enumPath, enumList) &&
                    validations.arePresent(enumPath);

                if (!validate) {
                    return [
                        {
                            valid: false,
                            code: 30000,
                            description: `- **condition Enum_Required_43_CONTEXT_ACTION**: all of the following sub conditions must be met:

  - **condition Enum_Required_43_CONTEXT_ACTION.1**: every element of $.context.action must be in ["on_status"]
  - **condition Enum_Required_43_CONTEXT_ACTION.2**: $.context.action must be present in the payload`,
                        },
                    ];
                }

                delete testObj._EXTERNAL;
            }
            return [{ valid: valid, code: 200 }, ...subResults];
        }
        function Enum_Required_44_COUNTRY_CODE(
            input: validationInput,
        ): validationOutput {
            const scope = payloadUtils.getJsonPath(input.payload, "$");
            let subResults: validationOutput = [];
            let valid = true;
            for (const testObj of scope) {
                testObj._EXTERNAL = input.externalData;
                const enumList = ["IND"];
                const enumPath = payloadUtils.getJsonPath(
                    testObj,
                    "$.context.location.country.code",
                );

                const validate =
                    validations.allIn(enumPath, enumList) &&
                    validations.arePresent(enumPath);

                if (!validate) {
                    return [
                        {
                            valid: false,
                            code: 30000,
                            description: `- **condition Enum_Required_44_COUNTRY_CODE**: all of the following sub conditions must be met:

  - **condition Enum_Required_44_COUNTRY_CODE.1**: every element of $.context.location.country.code must be in ["IND"]
  - **condition Enum_Required_44_COUNTRY_CODE.2**: $.context.location.country.code must be present in the payload`,
                        },
                    ];
                }

                delete testObj._EXTERNAL;
            }
            return [{ valid: valid, code: 200 }, ...subResults];
        }
        function Enum_Required_45_CITY_CODE(
            input: validationInput,
        ): validationOutput {
            const scope = payloadUtils.getJsonPath(input.payload, "$");
            let subResults: validationOutput = [];
            let valid = true;
            for (const testObj of scope) {
                testObj._EXTERNAL = input.externalData;
                const enumPath = payloadUtils.getJsonPath(
                    testObj,
                    "$.context.location.city.code",
                );

                const validate = validations.arePresent(enumPath);

                if (!validate) {
                    return [
                        {
                            valid: false,
                            code: 30000,
                            description: `- **condition Enum_Required_45_CITY_CODE**: $.context.location.city.code must be present in the payload`,
                        },
                    ];
                }

                delete testObj._EXTERNAL;
            }
            return [{ valid: valid, code: 200 }, ...subResults];
        }
        function Enum_Required_46_CONTEXT_DOMAIN(
            input: validationInput,
        ): validationOutput {
            const scope = payloadUtils.getJsonPath(input.payload, "$");
            let subResults: validationOutput = [];
            let valid = true;
            for (const testObj of scope) {
                testObj._EXTERNAL = input.externalData;
                const enumList = ["ONDC:TRV11"];
                const enumPath = payloadUtils.getJsonPath(
                    testObj,
                    "$.context.domain",
                );

                const validate =
                    validations.allIn(enumPath, enumList) &&
                    validations.arePresent(enumPath);

                if (!validate) {
                    return [
                        {
                            valid: false,
                            code: 30000,
                            description: `- **condition Enum_Required_46_CONTEXT_DOMAIN**: all of the following sub conditions must be met:

  - **condition Enum_Required_46_CONTEXT_DOMAIN.1**: every element of $.context.domain must be in ["ONDC:TRV11"]
  - **condition Enum_Required_46_CONTEXT_DOMAIN.2**: $.context.domain must be present in the payload`,
                        },
                    ];
                }

                delete testObj._EXTERNAL;
            }
            return [{ valid: valid, code: 200 }, ...subResults];
        }
        function on_status_Message_TESTS(
            input: validationInput,
        ): validationOutput {
            const scope = payloadUtils.getJsonPath(input.payload, "$");
            let subResults: validationOutput = [];
            let valid = true;
            for (const testObj of scope) {
                testObj._EXTERNAL = input.externalData;
                const errorBlock = payloadUtils.getJsonPath(
                    testObj,
                    "$.error.code",
                );

                const skipCheck = validations.arePresent(errorBlock);
                if (skipCheck) continue;

                function Attri_Required_10_ORDER_ID(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.id",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_10_ORDER_ID**: $.message.order.id must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_11_ORDER_STATUS(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.status",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_11_ORDER_STATUS**: $.message.order.status must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_12_ITEMS_ID(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.items[*].id",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_12_ITEMS_ID**: $.message.order.items[*].id must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_13_DESCRIPTOR_NAME(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.items[*].descriptor.name",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_13_DESCRIPTOR_NAME**: $.message.order.items[*].descriptor.name must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_14_PRICE_CURRENCY(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.items[*].price.currency",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_14_PRICE_CURRENCY**: $.message.order.items[*].price.currency must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_15_PRICE_VALUE(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.items[*].price.value",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_15_PRICE_VALUE**: $.message.order.items[*].price.value must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_16_SELECTED_COUNT(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.items[*].quantity.selected.count",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_16_SELECTED_COUNT**: $.message.order.items[*].quantity.selected.count must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_17_ITEMS_FULFILLMENT_IDS(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.items[*].fulfillment_ids[*]",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_17_ITEMS_FULFILLMENT_IDS**: $.message.order.items[*].fulfillment_ids[*] must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_18_TIME_LABEL(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.items[*].time.label",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_18_TIME_LABEL**: $.message.order.items[*].time.label must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_19_TIME_DURATION(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.items[*].time.duration",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_19_TIME_DURATION**: $.message.order.items[*].time.duration must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_20_PROVIDER_ID(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.provider.id",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_20_PROVIDER_ID**: $.message.order.provider.id must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_21_DESCRIPTOR_NAME(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.provider.descriptor.name",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_21_DESCRIPTOR_NAME**: $.message.order.provider.descriptor.name must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_22_FULFILLMENTS_ID(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.fulfillments[*].id",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_22_FULFILLMENTS_ID**: $.message.order.fulfillments[*].id must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_23_LOCATION_GPS(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.fulfillments[*].stops[*].location.gps",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_23_LOCATION_GPS**: $.message.order.fulfillments[*].stops[*].location.gps must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_24_FULFILLMENTS_ID(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.fulfillments[*].id",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_24_FULFILLMENTS_ID**: $.message.order.fulfillments[*].id must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_25_PRICE_VALUE(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.quote.price.value",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_25_PRICE_VALUE**: $.message.order.quote.price.value must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_26_PRICE_CURRENCY(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.quote.price.currency",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_26_PRICE_CURRENCY**: $.message.order.quote.price.currency must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_27_ITEM_ID(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.quote.breakup[*].item.id",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_27_ITEM_ID**: $.message.order.quote.breakup[*].item.id must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_28_PAYMENTS_ID(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.payments[*].id",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_28_PAYMENTS_ID**: $.message.order.payments[*].id must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_29_PARAMS_TRANSACTION_ID(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.payments[*].params.transaction_id",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_29_PARAMS_TRANSACTION_ID**: $.message.order.payments[*].params.transaction_id must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_30_PARAMS_CURRENCY(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.payments[*].params.currency",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_30_PARAMS_CURRENCY**: $.message.order.payments[*].params.currency must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_31_PARAMS_AMOUNT(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.payments[*].params.amount",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_31_PARAMS_AMOUNT**: $.message.order.payments[*].params.amount must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_32_CANCEL_BY_DURATION(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.cancellation_terms[*].cancel_by.duration",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_32_CANCEL_BY_DURATION**: $.message.order.cancellation_terms[*].cancel_by.duration must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_33_ITEMS_CATEGORY_IDS(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.items[*].category_ids[*]",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_33_ITEMS_CATEGORY_IDS**: $.message.order.items[*].category_ids[*] must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_34_RANGE_START(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.provider.time.range.start",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_34_RANGE_START**: $.message.order.provider.time.range.start must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_35_RANGE_END(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.provider.time.range.end",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_35_RANGE_END**: $.message.order.provider.time.range.end must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_36_PRICE_CURRENCY(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.quote.breakup[*].item.price.currency",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_36_PRICE_CURRENCY**: $.message.order.quote.breakup[*].item.price.currency must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_37_PRICE_VALUE(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.quote.breakup[*].item.price.value",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_37_PRICE_VALUE**: $.message.order.quote.breakup[*].item.price.value must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_38_SELECTED_COUNT(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.quote.breakup[*].item.quantity.selected.count",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_38_SELECTED_COUNT**: $.message.order.quote.breakup[*].item.quantity.selected.count must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_39_EXTERNAL_REF_URL(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.cancellation_terms[*].external_ref.url",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_39_EXTERNAL_REF_URL**: $.message.order.cancellation_terms[*].external_ref.url must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_40_EXTERNAL_REF_MIMETYPE(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.cancellation_terms[*].external_ref.mimetype",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_40_EXTERNAL_REF_MIMETYPE**: $.message.order.cancellation_terms[*].external_ref.mimetype must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_41_ORDER_CREATED_AT(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.created_at",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_41_ORDER_CREATED_AT**: $.message.order.created_at must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Attri_Required_42_ORDER_UPDATED_AT(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const attr = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.updated_at",
                        );

                        const validate = validations.arePresent(attr);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Attri_Required_42_ORDER_UPDATED_AT**: $.message.order.updated_at must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Enum_Required_47_DESCRIPTOR_CODE(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const enumList = ["SJT", "SFSJT", "RJT", "PASS"];
                        const enumPath = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.items[*].descriptor.code",
                        );

                        const validate =
                            validations.allIn(enumPath, enumList) &&
                            validations.arePresent(enumPath);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Enum_Required_47_DESCRIPTOR_CODE**: all of the following sub conditions must be met:

  - **condition Enum_Required_47_DESCRIPTOR_CODE.1**: every element of $.message.order.items[*].descriptor.code must be in ["SJT", "SFSJT", "RJT", "PASS"]
  - **condition Enum_Required_47_DESCRIPTOR_CODE.2**: $.message.order.items[*].descriptor.code must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Enum_Required_48_VEHICLE_CATEGORY(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const enumList = ["BUS", "METRO"];
                        const enumPath = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.fulfillments[*].vehicle.category",
                        );

                        const skipCheck = !validations.arePresent(enumPath);
                        if (skipCheck) continue;

                        const validate = validations.allIn(enumPath, enumList);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Enum_Required_48_VEHICLE_CATEGORY**: every element of $.message.order.fulfillments[*].vehicle.category must be in ["BUS", "METRO"]

	> Note: **Condition Enum_Required_48_VEHICLE_CATEGORY** can be skipped if the following conditions are met:
	>
	> - **condition B**: $.message.order.fulfillments[*].vehicle.category must **not** be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Enum_Required_49_FULFILLMENTS_TYPE(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const enumList = ["ROUTE", "TRIP"];
                        const enumPath = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.fulfillments[*].type",
                        );

                        const validate =
                            validations.allIn(enumPath, enumList) &&
                            validations.arePresent(enumPath);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Enum_Required_49_FULFILLMENTS_TYPE**: all of the following sub conditions must be met:

  - **condition Enum_Required_49_FULFILLMENTS_TYPE.1**: every element of $.message.order.fulfillments[*].type must be in ["ROUTE", "TRIP"]
  - **condition Enum_Required_49_FULFILLMENTS_TYPE.2**: $.message.order.fulfillments[*].type must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Enum_Required_50_FULFILLMENTS_TYPE(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const enumList = [
                            "START",
                            "END",
                            "INTERMEDIATE_STOP",
                            "TRANSIT_STOP",
                        ];
                        const enumPath = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.fulfillments[*].type",
                        );

                        const skipCheck = !validations.arePresent(enumPath);
                        if (skipCheck) continue;

                        const validate = validations.allIn(enumPath, enumList);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Enum_Required_50_FULFILLMENTS_TYPE**: every element of $.message.order.fulfillments[*].type must be in ["START", "END", "INTERMEDIATE_STOP", "TRANSIT_STOP"]

	> Note: **Condition Enum_Required_50_FULFILLMENTS_TYPE** can be skipped if the following conditions are met:
	>
	> - **condition B**: $.message.order.fulfillments[*].type must **not** be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Enum_Required_51_AUTHORIZATION_TYPE(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const enumList = ["QR"];
                        const enumPath = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.fulfillments[*].stops[*].authorization.type",
                        );

                        const skipCheck = !validations.arePresent(enumPath);
                        if (skipCheck) continue;

                        const validate = validations.allIn(enumPath, enumList);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Enum_Required_51_AUTHORIZATION_TYPE**: every element of $.message.order.fulfillments[*].stops[*].authorization.type must be in ["QR"]

	> Note: **Condition Enum_Required_51_AUTHORIZATION_TYPE** can be skipped if the following conditions are met:
	>
	> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.type must **not** be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Enum_Required_52_AUTHORIZATION_STATUS(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const enumList = ["UNCLAIMED", "CLAIMED"];
                        const enumPath = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.fulfillments[*].stops[*].authorization.status",
                        );

                        const skipCheck = !validations.arePresent(enumPath);
                        if (skipCheck) continue;

                        const validate = validations.allIn(enumPath, enumList);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Enum_Required_52_AUTHORIZATION_STATUS**: every element of $.message.order.fulfillments[*].stops[*].authorization.status must be in ["UNCLAIMED", "CLAIMED"]

	> Note: **Condition Enum_Required_52_AUTHORIZATION_STATUS** can be skipped if the following conditions are met:
	>
	> - **condition B**: $.message.order.fulfillments[*].stops[*].authorization.status must **not** be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Enum_Required_53_PAYMENTS_STATUS(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const enumList = ["NOT-PAID", "PAID"];
                        const enumPath = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.payments[*].status",
                        );

                        const validate =
                            validations.allIn(enumPath, enumList) &&
                            validations.arePresent(enumPath);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Enum_Required_53_PAYMENTS_STATUS**: all of the following sub conditions must be met:

  - **condition Enum_Required_53_PAYMENTS_STATUS.1**: every element of $.message.order.payments[*].status must be in ["NOT-PAID", "PAID"]
  - **condition Enum_Required_53_PAYMENTS_STATUS.2**: $.message.order.payments[*].status must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Enum_Required_54_PAYMENTS_COLLECTED_BY(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const enumList = ["BPP", "BAP"];
                        const enumPath = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.payments[*].collected_by",
                        );

                        const validate =
                            validations.allIn(enumPath, enumList) &&
                            validations.arePresent(enumPath);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Enum_Required_54_PAYMENTS_COLLECTED_BY**: all of the following sub conditions must be met:

  - **condition Enum_Required_54_PAYMENTS_COLLECTED_BY.1**: every element of $.message.order.payments[*].collected_by must be in ["BPP", "BAP"]
  - **condition Enum_Required_54_PAYMENTS_COLLECTED_BY.2**: $.message.order.payments[*].collected_by must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Enum_Required_55_PAYMENTS_TYPE(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const enumList = [
                            "PRE-ORDER",
                            "ON-FULFILLMENT",
                            "POST-FULFILLMENT",
                        ];
                        const enumPath = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.payments[*].type",
                        );

                        const validate =
                            validations.allIn(enumPath, enumList) &&
                            validations.arePresent(enumPath);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Enum_Required_55_PAYMENTS_TYPE**: all of the following sub conditions must be met:

  - **condition Enum_Required_55_PAYMENTS_TYPE.1**: every element of $.message.order.payments[*].type must be in ["PRE-ORDER", "ON-FULFILLMENT", "POST-FULFILLMENT"]
  - **condition Enum_Required_55_PAYMENTS_TYPE.2**: $.message.order.payments[*].type must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function Enum_Required_56_BREAKUP_TITLE(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const enumList = [
                            "BASE_PRICE",
                            "REFUND",
                            "CANCELLATION_CHARGES",
                            "OFFER",
                            "TOLL",
                        ];
                        const enumPath = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.quote.breakup[*].title",
                        );

                        const validate =
                            validations.allIn(enumPath, enumList) &&
                            validations.arePresent(enumPath);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition Enum_Required_56_BREAKUP_TITLE**: all of the following sub conditions must be met:

  - **condition Enum_Required_56_BREAKUP_TITLE.1**: every element of $.message.order.quote.breakup[*].title must be in ["BASE_PRICE", "REFUND", "CANCELLATION_CHARGES", "OFFER", "TOLL"]
  - **condition Enum_Required_56_BREAKUP_TITLE.2**: $.message.order.quote.breakup[*].title must be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function ROUTE_INFO_Tag_Required_57_DESCRIPTOR_CODE(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const validTags = [
                            "ROUTE_INFO",
                            "TICKET_INFO",
                            "TRIP_DETAILS",
                        ];
                        const tagPath = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.fulfillments[*].tags[*].descriptor.code",
                        );

                        const skipCheck = !validations.arePresent(tagPath);
                        if (skipCheck) continue;

                        const validate = validations.allIn(tagPath, validTags);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition ROUTE_INFO_Tag_Required_57_DESCRIPTOR_CODE**: every element of $.message.order.fulfillments[*].tags[*].descriptor.code must be in ["ROUTE_INFO", "TICKET_INFO", "TRIP_DETAILS"]

	> Note: **Condition ROUTE_INFO_Tag_Required_57_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
	>
	> - **condition B**: $.message.order.fulfillments[*].tags[*].descriptor.code must **not** be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function validate_tag_0_ROUTE_INFO(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(
                        input.payload,
                        "$.message.order.fulfillments[*].tags[?(@.descriptor.code=='ROUTE_INFO')]",
                    );
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const subTags = payloadUtils.getJsonPath(
                            testObj,
                            "$.list[*].descriptor.code",
                        );
                        const validValues = ["ROUTE_ID", "ROUTE_DIRECTION"];

                        const validate = validations.allIn(
                            subTags,
                            validValues,
                        );

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition validate_tag_0_ROUTE_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='ROUTE_INFO')].list[*].descriptor.code must be in ["ROUTE_ID", "ROUTE_DIRECTION"]`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function validate_tag_0_TICKET_INFO(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(
                        input.payload,
                        "$.message.order.fulfillments[*].tags[?(@.descriptor.code=='TICKET_INFO')]",
                    );
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const subTags = payloadUtils.getJsonPath(
                            testObj,
                            "$.list[*].descriptor.code",
                        );
                        const validValues = ["NUMBER"];

                        const validate = validations.allIn(
                            subTags,
                            validValues,
                        );

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition validate_tag_0_TICKET_INFO**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TICKET_INFO')].list[*].descriptor.code must be in ["NUMBER"]`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function validate_tag_0_TRIP_DETAILS(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(
                        input.payload,
                        "$.message.order.fulfillments[*].tags[?(@.descriptor.code=='TRIP_DETAILS')]",
                    );
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const subTags = payloadUtils.getJsonPath(
                            testObj,
                            "$.list[*].descriptor.code",
                        );
                        const validValues = [
                            "AVAILABLE_TRIPS",
                            "UTILIZED_TRIPS",
                        ];

                        const validate = validations.allIn(
                            subTags,
                            validValues,
                        );

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition validate_tag_0_TRIP_DETAILS**: every element of $.message.order.fulfillments[*].tags[?(@.descriptor.code=='TRIP_DETAILS')].list[*].descriptor.code must be in ["AVAILABLE_TRIPS", "UTILIZED_TRIPS"]`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function FARE_POLICY_Tag_Required_61_DESCRIPTOR_CODE(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const validTags = ["FARE_POLICY"];
                        const tagPath = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.items[*].tags[*].descriptor.code",
                        );

                        const skipCheck = !validations.arePresent(tagPath);
                        if (skipCheck) continue;

                        const validate = validations.allIn(tagPath, validTags);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition FARE_POLICY_Tag_Required_61_DESCRIPTOR_CODE**: every element of $.message.order.items[*].tags[*].descriptor.code must be in ["FARE_POLICY"]

	> Note: **Condition FARE_POLICY_Tag_Required_61_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
	>
	> - **condition B**: $.message.order.items[*].tags[*].descriptor.code must **not** be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function validate_tag_1_FARE_POLICY(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(
                        input.payload,
                        "$.message.order.items[*].tags[?(@.descriptor.code=='FARE_POLICY')]",
                    );
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const subTags = payloadUtils.getJsonPath(
                            testObj,
                            "$.list[*].descriptor.code",
                        );
                        const validValues = [
                            "RESTRICTED_PERSON",
                            "RESTRICTION_PROOF",
                        ];

                        const validate = validations.allIn(
                            subTags,
                            validValues,
                        );

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition validate_tag_1_FARE_POLICY**: every element of $.message.order.items[*].tags[?(@.descriptor.code=='FARE_POLICY')].list[*].descriptor.code must be in ["RESTRICTED_PERSON", "RESTRICTION_PROOF"]`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function BUYER_FINDER_FEES_Tag_Required_63_DESCRIPTOR_CODE(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(input.payload, "$");
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const validTags = [
                            "BUYER_FINDER_FEES",
                            "SETTLEMENT_TERMS",
                        ];
                        const tagPath = payloadUtils.getJsonPath(
                            testObj,
                            "$.message.order.payments[*].tags[*].descriptor.code",
                        );

                        const skipCheck = !validations.arePresent(tagPath);
                        if (skipCheck) continue;

                        const validate = validations.allIn(tagPath, validTags);

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition BUYER_FINDER_FEES_Tag_Required_63_DESCRIPTOR_CODE**: every element of $.message.order.payments[*].tags[*].descriptor.code must be in ["BUYER_FINDER_FEES", "SETTLEMENT_TERMS"]

	> Note: **Condition BUYER_FINDER_FEES_Tag_Required_63_DESCRIPTOR_CODE** can be skipped if the following conditions are met:
	>
	> - **condition B**: $.message.order.payments[*].tags[*].descriptor.code must **not** be present in the payload`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function validate_tag_2_BUYER_FINDER_FEES(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(
                        input.payload,
                        "$.message.order.payments[*].tags[?(@.descriptor.code=='BUYER_FINDER_FEES')]",
                    );
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const subTags = payloadUtils.getJsonPath(
                            testObj,
                            "$.list[*].descriptor.code",
                        );
                        const validValues = [
                            "BUYER_FINDER_FEES_TYPE",
                            "BUYER_FINDER_FEES_PERCENTAGE",
                            "BUYER_FINDER_FEES_AMOUNT",
                        ];

                        const validate = validations.allIn(
                            subTags,
                            validValues,
                        );

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition validate_tag_2_BUYER_FINDER_FEES**: every element of $.message.order.payments[*].tags[?(@.descriptor.code=='BUYER_FINDER_FEES')].list[*].descriptor.code must be in ["BUYER_FINDER_FEES_TYPE", "BUYER_FINDER_FEES_PERCENTAGE", "BUYER_FINDER_FEES_AMOUNT"]`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }
                function validate_tag_2_SETTLEMENT_TERMS(
                    input: validationInput,
                ): validationOutput {
                    const scope = payloadUtils.getJsonPath(
                        input.payload,
                        "$.message.order.payments[*].tags[?(@.descriptor.code=='SETTLEMENT_TERMS')]",
                    );
                    let subResults: validationOutput = [];
                    let valid = true;
                    for (const testObj of scope) {
                        testObj._EXTERNAL = input.externalData;
                        const subTags = payloadUtils.getJsonPath(
                            testObj,
                            "$.list[*].descriptor.code",
                        );
                        const validValues = [
                            "SETTLEMENT_WINDOW",
                            "SETTLEMENT_BASIS",
                            "SETTLEMENT_TYPE",
                            "MANDATORY_ARBITRATION",
                            "COURT_JURISDICTION",
                            "DELAY_INTEREST",
                            "STATIC_TERMS",
                            "SETTLEMENT_AMOUNT",
                        ];

                        const validate = validations.allIn(
                            subTags,
                            validValues,
                        );

                        if (!validate) {
                            return [
                                {
                                    valid: false,
                                    code: 30000,
                                    description: `- **condition validate_tag_2_SETTLEMENT_TERMS**: every element of $.message.order.payments[*].tags[?(@.descriptor.code=='SETTLEMENT_TERMS')].list[*].descriptor.code must be in ["SETTLEMENT_WINDOW", "SETTLEMENT_BASIS", "SETTLEMENT_TYPE", "MANDATORY_ARBITRATION", "COURT_JURISDICTION", "DELAY_INTEREST", "STATIC_TERMS", "SETTLEMENT_AMOUNT"]`,
                                },
                            ];
                        }

                        delete testObj._EXTERNAL;
                    }
                    return [{ valid: valid, code: 200 }, ...subResults];
                }

                const testFunctions: testFunctionArray = [
                    Attri_Required_10_ORDER_ID,
                    Attri_Required_11_ORDER_STATUS,
                    Attri_Required_12_ITEMS_ID,
                    Attri_Required_13_DESCRIPTOR_NAME,
                    Attri_Required_14_PRICE_CURRENCY,
                    Attri_Required_15_PRICE_VALUE,
                    Attri_Required_16_SELECTED_COUNT,
                    Attri_Required_17_ITEMS_FULFILLMENT_IDS,
                    Attri_Required_18_TIME_LABEL,
                    Attri_Required_19_TIME_DURATION,
                    Attri_Required_20_PROVIDER_ID,
                    Attri_Required_21_DESCRIPTOR_NAME,
                    Attri_Required_22_FULFILLMENTS_ID,
                    Attri_Required_23_LOCATION_GPS,
                    Attri_Required_24_FULFILLMENTS_ID,
                    Attri_Required_25_PRICE_VALUE,
                    Attri_Required_26_PRICE_CURRENCY,
                    Attri_Required_27_ITEM_ID,
                    Attri_Required_28_PAYMENTS_ID,
                    Attri_Required_29_PARAMS_TRANSACTION_ID,
                    Attri_Required_30_PARAMS_CURRENCY,
                    Attri_Required_31_PARAMS_AMOUNT,
                    Attri_Required_32_CANCEL_BY_DURATION,
                    Attri_Required_33_ITEMS_CATEGORY_IDS,
                    Attri_Required_34_RANGE_START,
                    Attri_Required_35_RANGE_END,
                    Attri_Required_36_PRICE_CURRENCY,
                    Attri_Required_37_PRICE_VALUE,
                    Attri_Required_38_SELECTED_COUNT,
                    Attri_Required_39_EXTERNAL_REF_URL,
                    Attri_Required_40_EXTERNAL_REF_MIMETYPE,
                    Attri_Required_41_ORDER_CREATED_AT,
                    Attri_Required_42_ORDER_UPDATED_AT,
                    Enum_Required_47_DESCRIPTOR_CODE,
                    Enum_Required_48_VEHICLE_CATEGORY,
                    Enum_Required_49_FULFILLMENTS_TYPE,
                    Enum_Required_50_FULFILLMENTS_TYPE,
                    Enum_Required_51_AUTHORIZATION_TYPE,
                    Enum_Required_52_AUTHORIZATION_STATUS,
                    Enum_Required_53_PAYMENTS_STATUS,
                    Enum_Required_54_PAYMENTS_COLLECTED_BY,
                    Enum_Required_55_PAYMENTS_TYPE,
                    Enum_Required_56_BREAKUP_TITLE,
                    ROUTE_INFO_Tag_Required_57_DESCRIPTOR_CODE,
                    validate_tag_0_ROUTE_INFO,
                    validate_tag_0_TICKET_INFO,
                    validate_tag_0_TRIP_DETAILS,
                    FARE_POLICY_Tag_Required_61_DESCRIPTOR_CODE,
                    validate_tag_1_FARE_POLICY,
                    BUYER_FINDER_FEES_Tag_Required_63_DESCRIPTOR_CODE,
                    validate_tag_2_BUYER_FINDER_FEES,
                    validate_tag_2_SETTLEMENT_TERMS,
                ];

                let invalidResults: validationOutput = [];
                for (const fn of testFunctions) {
                    const subResult = fn(input);
                    // .filter(r => !r.valid);
                    invalidResults = [...invalidResults, ...subResult];
                    if (
                        !input.config.runAllValidations &&
                        invalidResults.length > 0
                    ) {
                        return invalidResults;
                    }
                }
                if (invalidResults.length > 0) {
                    // return invalidResults;
                    subResults = invalidResults;
                    valid = subResults.every((r) => r.valid);
                }

                delete testObj._EXTERNAL;
            }
            return [{ valid: valid, code: 200 }, ...subResults];
        }

        const testFunctions: testFunctionArray = [
            Attri_Required_1_CONTEXT_TIMESTAMP,
            Attri_Required_2_CONTEXT_BAP_ID,
            Attri_Required_3_CONTEXT_TRANSACTION_ID,
            Attri_Required_4_CONTEXT_MESSAGE_ID,
            Attri_Required_5_CONTEXT_VERSION,
            Attri_Required_6_CONTEXT_BAP_URI,
            Attri_Required_7_CONTEXT_TTL,
            Attri_Required_8_CONTEXT_BPP_ID,
            Attri_Required_9_CONTEXT_BPP_URI,
            Enum_Required_43_CONTEXT_ACTION,
            Enum_Required_44_COUNTRY_CODE,
            Enum_Required_45_CITY_CODE,
            Enum_Required_46_CONTEXT_DOMAIN,
            on_status_Message_TESTS,
        ];

        let invalidResults: validationOutput = [];
        for (const fn of testFunctions) {
            const subResult = fn(input);
            // .filter(r => !r.valid);
            invalidResults = [...invalidResults, ...subResult];
            if (!input.config.runAllValidations && invalidResults.length > 0) {
                return invalidResults;
            }
        }
        if (invalidResults.length > 0) {
            // return invalidResults;
            subResults = invalidResults;
            valid = subResults.every((r) => r.valid);
        }

        delete testObj._EXTERNAL;
    }
    return [{ valid: valid, code: 200 }, ...subResults];
}
