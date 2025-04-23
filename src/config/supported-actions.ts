import axios from "axios";
import logger from "../utils/logger";

interface Config {
    supportedActions: Record<string, string[]>;
    apiProperties: Record<
        string,
        { async_predecessor: string | null; transaction_partner: string[] }
    >;
}

let supportedActions: Config["supportedActions"] = {"null":["search"],"search":["on_search"],"on_search":["search","select","init","on_search"],"select":["on_select"],"on_select":["init"],"init":["on_init"],"on_init":["init","confirm"],"confirm":["on_confirm","status"],"on_confirm":["confirm","status","cancel","on_status","track","update"],"update":["on_update"],"on_update":["status","on_status","track","cancel"],"status":["on_status"],"track":["on_track"],"on_track":["on_track","status","on_status"],"on_status":["status","cancel","track","on_status","on_cancel","on_track","update","on_update"],"cancel":["on_cancel","status"],"on_cancel":["cancel","status","on_status"]};
let apiProperties: Config["apiProperties"] = {"search":{"async_predecessor":null,"transaction_partner":[]},"on_search":{"async_predecessor":null,"transaction_partner":["search"]},"select":{"async_predecessor":null,"transaction_partner":[]},"on_select":{"async_predecessor":"select","transaction_partner":["select"]},"init":{"async_predecessor":null,"transaction_partner":[]},"on_init":{"async_predecessor":"init","transaction_partner":["search","on_search","init"]},"confirm":{"async_predecessor":null,"transaction_partner":["search","on_search","init","on_init"]},"on_confirm":{"async_predecessor":"confirm","transaction_partner":["search","on_search","init","on_init","confirm"]},"status":{"async_predecessor":null,"transaction_partner":["search","on_search","init","on_init","confirm"]},"on_status":{"async_predecessor":null,"transaction_partner":["search","on_search","init","on_init","confirm"]},"update":{"async_predecessor":null,"transaction_partner":["search","on_search","init","on_init","confirm"]},"on_update":{"async_predecessor":"update","transaction_partner":["search","on_search","init","on_init","confirm"]},"cancel":{"async_predecessor":null,"transaction_partner":["search","on_search","init","on_init","confirm","on_confirm"]},"on_cancel":{"async_predecessor":null,"transaction_partner":["search","on_search","init","on_init","confirm","on_confirm"]},"track":{"async_predecessor":null,"transaction_partner":["search","on_search","init","on_init","confirm","on_confirm"]},"on_track":{"async_predecessor":null,"transaction_partner":["search","on_search","init","on_init","confirm","on_confirm","track"]}};


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

        // const configServiceUrl = process.env.CONFIG_SERVICE_URL;
        // if (!configServiceUrl) {
        //  throw new Error(
        //      "CONFIG_SERVICE_URL must be set in the environment variables."
        //  );
        // }

        // const url = `${configServiceUrl}/api-service/supportedActions?domain=${encodeURIComponent(
        //  domain
        // )}&version=${encodeURIComponent(version)}`;
        // logger.info("Loading config from API:", url);
        // const response = await axios.get(url);
        // const config = response.data.data as Config;
        // logger.info("Config loaded from API:", JSON.stringify(config));

        // supportedActions = config.supportedActions;
        // apiProperties = config.apiProperties;
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