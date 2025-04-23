const errors = [
    {
        code: 90201,
        message: "To & from location not serviceable by Seller application",
    },
    {
        code: 90202,
        message: "Tracking not enabled for any fulfillment in the order",
    },
    { code: 90203, message: "Driver not assigned to the order" },
    {
        code: 20006,
        message: "Invalid response does not meet API contract specifications",
    },
    {
        code: 30000,
        message: "Invalid request does not meet API contract specifications",
    },
];

export function getError(code: number) {
    const error = errors.find((error) => error.code === code);
    if (!error) {
        throw new Error(`Error code ${code} not found`);
    }
    return error;
}
