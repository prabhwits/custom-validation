import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import logger from "./utils/logger";
import loadEnv, { config } from "./config/serverConfig";
import apiRouter from "./routes/public-routes";
import testRoutes from "./routes/test-routes";
import { setAckResponse, setBadRequestNack } from "./utils/ackUtils";
import mockRouter from "./routes/private-routes";
let envVariables: any;
const createServer = (): Application => {
	const app = express();
	
	try{
		envVariables = loadEnv();
	} catch(err: any){
		logger.error("Error loading config from API:", err);
	}


	// Middleware
	app.use(express.json({ limit: "50mb" }));
	app.use(cors());

	// Log all requests in development
	if (config.port !== "production") {
		app.use((req: Request, res: Response, next: NextFunction) => {
			logger.debug(`${req.method} ${req.url}`);
			next();
		});
	}
	

	var domain = process.env.DOMAIN;
	var version = process.env.VERSION;
	if (!domain || !version) {
		throw new Error("Domain and version are required in env");
	}

	const base = `/api-service/${domain}/${version}`;
	// Routes
	// app.use(`${base}/api`, routes);
	app.use(`${base}/buyer`, apiRouter);
	app.use(`${base}/seller`, apiRouter);
	app.use(`${base}/mock`, mockRouter);
	app.use(`${base}/test`, testRoutes);

	// Health Check
	app.get(`${base}/health`, (req: Request, res: Response) => {
		res.status(200).send(setAckResponse(true, req.body));
	});

	// Error Handling Middleware
	app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
		logger.error(err.message, { stack: err.stack });
		res.status(200).send(setBadRequestNack(err.message));
	});

	return app;
};
// module.exports = envVariables;
export {envVariables}
export default createServer;
