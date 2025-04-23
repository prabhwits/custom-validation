export const on_rating = {
    type: "object",
    additionalProperties: false,
    properties: {
        context: {
            allOf: [
                {
                    description:
                        "Every API call in beckn protocol has a context. It provides a high-level overview to the receiver about the nature of the intended transaction. Typically, it is the BAP that sets the transaction context based on the consumer's location and action on their UI. But sometimes, during unsolicited callbacks, the BPP also sets the transaction context but it is usually the same as the context of a previous full-cycle, request-callback interaction between the BAP and the BPP. The context object contains four types of fields. <ol><li>Demographic information about the transaction using fields like `domain`, `country`, and `region`.</li><li>Addressing details like the sending and receiving platform's ID and API URL.</li><li>Interoperability information like the protocol version that implemented by the sender and,</li><li>Transaction details like the method being called at the receiver's endpoint, the transaction_id that represents an end-to-end user session at the BAP, a message ID to pair requests with callbacks, a timestamp to capture sending times, a ttl to specifiy the validity of the request, and a key to encrypt information if necessary.</li></ol> This object must be passed in every interaction between a BAP and a BPP. In HTTP/S implementations, it is not necessary to send the context during the synchronous response. However, in asynchronous protocols, the context must be sent during all interactions,",
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        domain: {
                            description:
                                "Domain code that is relevant to this transaction context",
                            allOf: [
                                {
                                    type: "string",
                                    description:
                                        "Standard code representing the domain. The standard is usually published as part of the network policy. Furthermore, the network facilitator should also provide a mechanism to provide the supported domains of a network.",
                                },
                            ],
                        },
                        location: {
                            description:
                                "The location where the transaction is intended to be fulfilled.",
                            allOf: [
                                {
                                    description:
                                        "The physical location of something",
                                    type: "object",
                                    additionalProperties: false,
                                    properties: {
                                        id: {
                                            type: "string",
                                        },
                                        descriptor: {
                                            description:
                                                "Physical description of something.",
                                            type: "object",
                                            additionalProperties: false,
                                            properties: {
                                                name: {
                                                    type: "string",
                                                },
                                                code: {
                                                    type: "string",
                                                },
                                                short_desc: {
                                                    type: "string",
                                                },
                                                long_desc: {
                                                    type: "string",
                                                },
                                                additional_desc: {
                                                    type: "object",
                                                    additionalProperties: false,
                                                    properties: {
                                                        url: {
                                                            type: "string",
                                                        },
                                                        content_type: {
                                                            type: "string",
                                                        },
                                                    },
                                                },
                                                media: {
                                                    type: "array",
                                                    items: {
                                                        description:
                                                            "This object contains a url to a media file.",
                                                        type: "object",
                                                        additionalProperties:
                                                            false,
                                                        properties: {
                                                            mimetype: {
                                                                description:
                                                                    "indicates the nature and format of the document, file, or assortment of bytes. MIME types are defined and standardized in IETF's RFC 6838",
                                                                type: "string",
                                                            },
                                                            url: {
                                                                description:
                                                                    "The URL of the file",
                                                                type: "string",
                                                                format: "uri",
                                                            },
                                                            signature: {
                                                                description:
                                                                    "The digital signature of the file signed by the sender",
                                                                type: "string",
                                                            },
                                                            dsa: {
                                                                description:
                                                                    "The signing algorithm used by the sender",
                                                                type: "string",
                                                            },
                                                        },
                                                    },
                                                },
                                                images: {
                                                    type: "array",
                                                    items: {
                                                        description:
                                                            "Describes an image",
                                                        type: "object",
                                                        additionalProperties:
                                                            false,
                                                        properties: {
                                                            url: {
                                                                description:
                                                                    "URL to the image. This can be a data url or an remote url",
                                                                type: "string",
                                                                format: "uri",
                                                            },
                                                            size_type: {
                                                                description:
                                                                    "The size of the image. The network policy can define the default dimensions of each type",
                                                                type: "string",
                                                            },
                                                            width: {
                                                                description:
                                                                    "Width of the image in pixels",
                                                                type: "string",
                                                            },
                                                            height: {
                                                                description:
                                                                    "Height of the image in pixels",
                                                                type: "string",
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        map_url: {
                                            description:
                                                "The url to the map of the location. This can be a globally recognized map url or the one specified by the network policy.",
                                            type: "string",
                                            format: "uri",
                                        },
                                        gps: {
                                            description:
                                                "The GPS co-ordinates of this location.",
                                            allOf: [
                                                {
                                                    description:
                                                        "Describes a GPS coordinate",
                                                    type: "string",
                                                    pattern:
                                                        "^[-+]?([1-8]?\\d(\\.\\d+)?|90(\\.0+)?),\\s*[-+]?(180(\\.0+)?|((1[0-7]\\d)|([1-9]?\\d))(\\.\\d+)?)$",
                                                },
                                            ],
                                        },
                                        updated_at: {
                                            type: "string",
                                            format: "date-time",
                                        },
                                        address: {
                                            description:
                                                "The address of this location.",
                                            allOf: [
                                                {
                                                    description:
                                                        "Describes a postal address.",
                                                    type: "string",
                                                },
                                            ],
                                        },
                                        city: {
                                            description:
                                                "The city this location is, or is located within",
                                            allOf: [
                                                {
                                                    description:
                                                        "Describes a city",
                                                    type: "object",
                                                    additionalProperties: false,
                                                    properties: {
                                                        name: {
                                                            description:
                                                                "Name of the city",
                                                            type: "string",
                                                        },
                                                        code: {
                                                            description:
                                                                "City code",
                                                            type: "string",
                                                        },
                                                    },
                                                },
                                            ],
                                        },
                                        district: {
                                            description:
                                                "The state this location is, or is located within",
                                            type: "string",
                                        },
                                        state: {
                                            description:
                                                "The state this location is, or is located within",
                                            allOf: [
                                                {
                                                    description:
                                                        "A bounded geopolitical region of governance inside a country.",
                                                    type: "object",
                                                    additionalProperties: false,
                                                    properties: {
                                                        name: {
                                                            type: "string",
                                                            description:
                                                                "Name of the state",
                                                        },
                                                        code: {
                                                            type: "string",
                                                            description:
                                                                "State code as per country or international standards",
                                                        },
                                                    },
                                                },
                                            ],
                                        },
                                        country: {
                                            description:
                                                "The country this location is, or is located within",
                                            allOf: [
                                                {
                                                    description:
                                                        "Describes a country",
                                                    type: "object",
                                                    additionalProperties: false,
                                                    properties: {
                                                        name: {
                                                            type: "string",
                                                            description:
                                                                "Name of the country",
                                                        },
                                                        code: {
                                                            type: "string",
                                                            description:
                                                                "Country code as per ISO 3166-1 and ISO 3166-2 format",
                                                        },
                                                    },
                                                },
                                            ],
                                        },
                                        area_code: {
                                            type: "string",
                                        },
                                        circle: {
                                            description:
                                                "Describes a circular region of a specified radius centered at a specified GPS coordinate.",
                                            type: "object",
                                            additionalProperties: false,
                                            properties: {
                                                gps: {
                                                    description:
                                                        "Describes a GPS coordinate",
                                                    type: "string",
                                                    pattern:
                                                        "^[-+]?([1-8]?\\d(\\.\\d+)?|90(\\.0+)?),\\s*[-+]?(180(\\.0+)?|((1[0-7]\\d)|([1-9]?\\d))(\\.\\d+)?)$",
                                                },
                                                radius: {
                                                    description:
                                                        "Describes a scalar",
                                                    type: "object",
                                                    additionalProperties: false,
                                                    properties: {
                                                        type: {
                                                            type: "string",
                                                        },
                                                        value: {
                                                            description:
                                                                "Describes a numerical value in decimal form",
                                                            type: "string",
                                                            pattern:
                                                                "[+-]?([0-9]*[.])?[0-9]+",
                                                        },
                                                        estimated_value: {
                                                            description:
                                                                "Describes a numerical value in decimal form",
                                                            type: "string",
                                                            pattern:
                                                                "[+-]?([0-9]*[.])?[0-9]+",
                                                        },
                                                        computed_value: {
                                                            description:
                                                                "Describes a numerical value in decimal form",
                                                            type: "string",
                                                            pattern:
                                                                "[+-]?([0-9]*[.])?[0-9]+",
                                                        },
                                                        range: {
                                                            type: "object",
                                                            additionalProperties:
                                                                false,
                                                            properties: {
                                                                min: {
                                                                    description:
                                                                        "Describes a numerical value in decimal form",
                                                                    type: "string",
                                                                    pattern:
                                                                        "[+-]?([0-9]*[.])?[0-9]+",
                                                                },
                                                                max: {
                                                                    description:
                                                                        "Describes a numerical value in decimal form",
                                                                    type: "string",
                                                                    pattern:
                                                                        "[+-]?([0-9]*[.])?[0-9]+",
                                                                },
                                                            },
                                                        },
                                                        unit: {
                                                            type: "string",
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        polygon: {
                                            description:
                                                "The boundary polygon of this location",
                                            type: "string",
                                        },
                                        "3dspace": {
                                            description:
                                                "The three dimensional region describing this location",
                                            type: "string",
                                        },
                                        rating: {
                                            description:
                                                "The rating of this location",
                                            allOf: [
                                                {
                                                    description:
                                                        "Rating value given to the object. This can be a single value or can also contain an inequality operator like gt, gte, lt, lte. This can also contain an inequality expression containing logical operators like && and ||.",
                                                    type: "string",
                                                },
                                            ],
                                        },
                                    },
                                },
                            ],
                        },
                        action: {
                            description:
                                "The Beckn protocol method being called by the sender and executed at the receiver.",
                            type: "string",
                        },
                        version: {
                            type: "string",
                            description:
                                "Version of transaction protocol being used by the sender.",
                        },
                        bap_id: {
                            description: "Subscriber ID of the BAP",
                            allOf: [
                                {
                                    description:
                                        "A globally unique identifier of the platform, Typically it is the fully qualified domain name (FQDN) of the platform.",
                                    type: "string",
                                },
                            ],
                        },
                        bap_uri: {
                            description:
                                "Subscriber URL of the BAP for accepting callbacks from BPPs.",
                            allOf: [
                                {
                                    description:
                                        "The callback URL of the Subscriber. This should necessarily contain the same domain name as set in `subscriber_id``.",
                                    type: "string",
                                    format: "uri",
                                },
                            ],
                        },
                        bpp_id: {
                            description: "Subscriber ID of the BPP",
                            allOf: [
                                {
                                    description:
                                        "A globally unique identifier of the platform, Typically it is the fully qualified domain name (FQDN) of the platform.",
                                    type: "string",
                                },
                            ],
                        },
                        bpp_uri: {
                            description:
                                "Subscriber URL of the BPP for accepting calls from BAPs.",
                            allOf: [
                                {
                                    description:
                                        "The callback URL of the Subscriber. This should necessarily contain the same domain name as set in `subscriber_id``.",
                                    type: "string",
                                    format: "uri",
                                },
                            ],
                        },
                        transaction_id: {
                            description:
                                "This is a unique value which persists across all API calls from `search` through `confirm`. This is done to indicate an active user session across multiple requests. The BPPs can use this value to push personalized recommendations, and dynamic offerings related to an ongoing transaction despite being unaware of the user active on the BAP.",
                            type: "string",
                            format: "uuid",
                        },
                        message_id: {
                            description:
                                "This is a unique value which persists during a request / callback cycle. Since beckn protocol APIs are asynchronous, BAPs need a common value to match an incoming callback from a BPP to an earlier call. This value can also be used to ignore duplicate messages coming from the BPP. It is recommended to generate a fresh message_id for every new interaction. When sending unsolicited callbacks, BPPs must generate a new message_id.",
                            type: "string",
                            format: "uuid",
                        },
                        timestamp: {
                            description:
                                "Time of request generation in RFC3339 format",
                            type: "string",
                            format: "date-time",
                        },
                        key: {
                            description:
                                "The encryption public key of the sender",
                            type: "string",
                        },
                        ttl: {
                            description:
                                "The duration in ISO8601 format after timestamp for which this message holds valid",
                            type: "string",
                        },
                    },
                },
                {
                    type: "object",
                    properties: {
                        action: {},
                    },
                },
            ],
        },
        message: {
            type: "object",
            properties: {
                feedback_form: {
                    description:
                        "A feedback form to allow the user to provide additional information on the rating provided",
                    allOf: [
                        {
                            description:
                                "Contains any additional or extended inputs required to confirm an order. This is typically a Form Input. Sometimes, selection of catalog elements is not enough for the BPP to confirm an order. For example, to confirm a flight ticket, the airline requires details of the passengers along with information on baggage, identity, in addition to the class of ticket. Similarly, a logistics company may require details on the nature of shipment in order to confirm the shipping. A recruiting firm may require additional details on the applicant in order to confirm a job application. For all such purposes, the BPP can choose to send this object attached to any object in the catalog that is required to be sent while placing the order. This object can typically be sent at an item level or at the order level. The item level XInput will override the Order level XInput as it indicates a special requirement of information for that particular item. Hence the BAP must render a separate form for the Item and another form at the Order level before confirmation.",
                            type: "object",
                            additionalProperties: false,
                            properties: {
                                head: {
                                    description:
                                        "Provides the header information for the xinput.",
                                    type: "object",
                                    additionalProperties: false,
                                    properties: {
                                        descriptor: {
                                            description:
                                                "Physical description of something.",
                                            type: "object",
                                            additionalProperties: false,
                                            properties: {
                                                name: {
                                                    type: "string",
                                                },
                                                code: {
                                                    type: "string",
                                                },
                                                short_desc: {
                                                    type: "string",
                                                },
                                                long_desc: {
                                                    type: "string",
                                                },
                                                additional_desc: {
                                                    type: "object",
                                                    additionalProperties: false,
                                                    properties: {
                                                        url: {
                                                            type: "string",
                                                        },
                                                        content_type: {
                                                            type: "string",
                                                        },
                                                    },
                                                },
                                                media: {
                                                    type: "array",
                                                    items: {
                                                        description:
                                                            "This object contains a url to a media file.",
                                                        type: "object",
                                                        additionalProperties:
                                                            false,
                                                        properties: {
                                                            mimetype: {
                                                                description:
                                                                    "indicates the nature and format of the document, file, or assortment of bytes. MIME types are defined and standardized in IETF's RFC 6838",
                                                                type: "string",
                                                            },
                                                            url: {
                                                                description:
                                                                    "The URL of the file",
                                                                type: "string",
                                                                format: "uri",
                                                            },
                                                            signature: {
                                                                description:
                                                                    "The digital signature of the file signed by the sender",
                                                                type: "string",
                                                            },
                                                            dsa: {
                                                                description:
                                                                    "The signing algorithm used by the sender",
                                                                type: "string",
                                                            },
                                                        },
                                                    },
                                                },
                                                images: {
                                                    type: "array",
                                                    items: {
                                                        description:
                                                            "Describes an image",
                                                        type: "object",
                                                        additionalProperties:
                                                            false,
                                                        properties: {
                                                            url: {
                                                                description:
                                                                    "URL to the image. This can be a data url or an remote url",
                                                                type: "string",
                                                                format: "uri",
                                                            },
                                                            size_type: {
                                                                description:
                                                                    "The size of the image. The network policy can define the default dimensions of each type",
                                                                type: "string",
                                                            },
                                                            width: {
                                                                description:
                                                                    "Width of the image in pixels",
                                                                type: "string",
                                                            },
                                                            height: {
                                                                description:
                                                                    "Height of the image in pixels",
                                                                type: "string",
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        index: {
                                            type: "object",
                                            additionalProperties: false,
                                            properties: {
                                                min: {
                                                    type: "integer",
                                                },
                                                cur: {
                                                    type: "integer",
                                                },
                                                max: {
                                                    type: "integer",
                                                },
                                            },
                                        },
                                        headings: {
                                            type: "array",
                                            items: {
                                                type: "string",
                                                description:
                                                    "The heading names of the forms",
                                            },
                                        },
                                    },
                                },
                                form: {
                                    description: "Describes a form",
                                    type: "object",
                                    additionalProperties: false,
                                    properties: {
                                        id: {
                                            description: "The form identifier.",
                                            type: "string",
                                        },
                                        url: {
                                            description:
                                                "The URL from where the form can be fetched. The content fetched from the url must be processed as per the mime_type specified in this object. Once fetched, the rendering platform can choosed to render the form as-is as an embeddable element; or process it further to blend with the theme of the application. In case the interface is non-visual, the the render can process the form data and reproduce it as per the standard specified in the form.",
                                            type: "string",
                                            format: "uri",
                                        },
                                        data: {
                                            description:
                                                "The form submission data",
                                            type: "object",
                                            additionalProperties: {
                                                type: "string",
                                            },
                                        },
                                        mime_type: {
                                            description:
                                                "This field indicates the nature and format of the form received by querying the url. MIME types are defined and standardized in IETF's RFC 6838.",
                                            type: "string",
                                        },
                                        resubmit: {
                                            type: "boolean",
                                        },
                                        multiple_sumbissions: {
                                            type: "boolean",
                                        },
                                    },
                                },
                                form_response: {
                                    description:
                                        "Describes the response to a form submission",
                                    type: "object",
                                    additionalProperties: false,
                                    properties: {
                                        status: {
                                            description:
                                                "Contains the status of form submission.",
                                            type: "string",
                                        },
                                        signature: {
                                            type: "string",
                                        },
                                        submission_id: {
                                            type: "string",
                                        },
                                        errors: {
                                            type: "array",
                                            items: {
                                                description:
                                                    "Describes an error object that is returned by a BAP, BPP or BG as a response or callback to an action by another network participant. This object is sent when any request received by a network participant is unacceptable. This object can be sent either during Ack or with the callback.",
                                                type: "object",
                                                additionalProperties: false,
                                                properties: {
                                                    code: {
                                                        type: "string",
                                                        description:
                                                            'Standard error code. For full list of error codes, refer to docs/protocol-drafts/BECKN-005-ERROR-CODES-DRAFT-01.md of this repo"',
                                                    },
                                                    paths: {
                                                        type: "string",
                                                        description:
                                                            "Path to json schema generating the error. Used only during json schema validation errors",
                                                    },
                                                    message: {
                                                        type: "string",
                                                        description:
                                                            "Human readable message describing the error. Used mainly for logging. Not recommended to be shown to the user.",
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                                required: {
                                    description:
                                        "Indicates whether the form data is mandatorily required by the BPP to confirm the order.",
                                    type: "boolean",
                                },
                            },
                        },
                    ],
                },
            },
        },
        error: {
            description:
                "Describes an error object that is returned by a BAP, BPP or BG as a response or callback to an action by another network participant. This object is sent when any request received by a network participant is unacceptable. This object can be sent either during Ack or with the callback.",
            type: "object",
            additionalProperties: false,
            properties: {
                code: {
                    type: "string",
                    description:
                        'Standard error code. For full list of error codes, refer to docs/protocol-drafts/BECKN-005-ERROR-CODES-DRAFT-01.md of this repo"',
                },
                paths: {
                    type: "string",
                    description:
                        "Path to json schema generating the error. Used only during json schema validation errors",
                },
                message: {
                    type: "string",
                    description:
                        "Human readable message describing the error. Used mainly for logging. Not recommended to be shown to the user.",
                },
            },
        },
    },
};
