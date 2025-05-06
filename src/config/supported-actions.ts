import axios from "axios";
import logger from "../utils/logger";

interface Config {
    supportedActions: Record<string, string[]>;
    apiProperties: Record<
        string,
        { async_predecessor: string | null; transaction_partner: string[] }
    >;
}

let supportedActions: Config["supportedActions"];
let apiProperties: Config["apiProperties"];


// Function to load config from API
async function loadConfig(): Promise<void> {
    try {
        const domain = process.env.DOMAIN;
        const version = process.env.VERSION;

        if (!domain || !version) {
            throw new Error(
                "DOMAIN and VERSION must be set in the environment variables."
            );
        }

        const configServiceUrl = process.env.CONFIG_SERVICE_URL;
        if (!configServiceUrl) {
         throw new Error(
             "CONFIG_SERVICE_URL must be set in the environment variables."
         );
        }

        const url = `${configServiceUrl}/api-service/supportedActions?domain=${encodeURIComponent(
         domain
        )}&version=${encodeURIComponent(version)}`;
        logger.info("Loading config from API:", url);
        const response = await axios.get(url);
        const config = response.data.data as Config;
        logger.info("Config loaded from API:", JSON.stringify(config));

        supportedActions = config.supportedActions;
        apiProperties = config.apiProperties;
        console.log("supportedActions", supportedActions)
        console.log("apiProperties", apiProperties)
    } catch (error) {
        console.error("Error loading config from API:", error);
        throw error;
    }
}

// Load the config immediately and export a promise
const configPromise = loadConfig();

// Exporting config variables and the promise
export { configPromise, supportedActions, apiProperties };