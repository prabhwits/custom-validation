import { RequestProperties } from "./cache-types";
import { Request } from "express";

export interface ApiServiceRequest extends Request {
	requestProperties?: RequestProperties;
}
