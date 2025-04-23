const errors = [
	{ code: 30001, message: "Internal Error Occured" },
	{ code: 30008, message: "The provided city cannot be serviced" },
	{ code: 50002, message: "Cancellation not possible for the selected item" },
	{
		code: 91201,
		message: "To & from location not serviceable by Seller application",
	},
	{
		code: 91202,
		message: "Origin/To station not operational or unavailable",
	},
	{
		code: 91203,
		message: "Destination/From station not operational or unavailable",
	},
	{ code: 91204, message: "Maximum order qty exceeded" },
	{
		code: 91205,
		message: "Tracking not enabled for any fulfillment in the order",
	},
	{
		code: 91206,
		message: "Service temporarily unavailable from seller side",
	},
	{ code: 91207, message: "Payment transaction failed" },
	{
		code: 91208,
		message: "Ticketing not allowed during un-operational hours",
	},
	{ code: 91209, message: "Unable to retrieve ticket details" },
	{ code: 91210, message: "Unable to retrieve station list and data" },
	{
		code: 91211,
		message: "Cannot fetch fare details for the selected route",
	},
	{ code: 91212, message: "Cannot process the transaction" },
	{
		code: 91213,
		message: "The action for the transaction has been already processed",
	},
	{
		code: 91214,
		message:
			"The fare collected does not match with the actual fare of the selected item",
	},
	{ code: 91215, message: "No item found for the given item_id" },
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
