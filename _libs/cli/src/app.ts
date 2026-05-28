import { buildApplication, buildRouteMap } from "@stricli/core";
import { encryptCommand } from "./commands/encrypt.js";
import { keygenCommand } from "./commands/keygen.js";

const root = buildRouteMap({
    routes: { keygen: keygenCommand, encrypt: encryptCommand },
    docs: { brief: "Confederation CLI — manage encrypted config secrets" },
});

export const app = buildApplication(root, {
    name: "confederation",
    versionInfo: { currentVersion: "0.0.0" },
});
