import { apiConfig } from "./api-config";

// Imported first from index.js: the CopilotKit packages read these variables when they are evaluated.
if (apiConfig.telemetryOff && typeof process !== "undefined") {
  process.env.COPILOTKIT_TELEMETRY_DISABLED = "true";
  process.env.DO_NOT_TRACK = "1";
}
