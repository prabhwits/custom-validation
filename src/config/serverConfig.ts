import dotenv from "dotenv";
import path from "node:path";
dotenv.config();

function loadEnv() {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
  const requiredKeys = [
    "VERSION",
    "NODE_ENV",
    "PORT",
    "SIGN_PRIVATE_KEY",
    "SIGN_PUBLIC_KEY",
    "SUBSCRIBER_ID",
    "UKID",
    "SUBSCRIBER_URL",
    "REDIS_HOST",
    "REDIS_PORT",
    "REDIS_PASSWORD",
    "REDIS_USERNAME",
    "MOCK_SERVER_URL",
    "DATA_BASE_URL",
    "CONFIG_SERVICE_URL",
  ];
  const missingKeys = requiredKeys.filter((key) => !process.env[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(", ")}`
    );
  }
 
  // Return env values as object (optional)
  const env: Record<string, string | undefined> = {};
  for (const key of requiredKeys) {
    env[key] = process.env[key];
  }

  return env;
}

export default loadEnv;
export const config = {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || "development",
};
