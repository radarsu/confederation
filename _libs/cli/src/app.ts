import { buildApplication, buildRouteMap } from "@stricli/core";
import { decryptCommand } from "./commands/decrypt.js";
import { encryptCommand } from "./commands/encrypt.js";
import { encryptAllCommand } from "./commands/encryptAll.js";
import { genCommand } from "./commands/gen.js";
import { keygenCommand } from "./commands/keygen.js";
import { rotateCommand } from "./commands/rotate.js";
import { validateCommand } from "./commands/validate.js";

const root = buildRouteMap({
    routes: {
        keygen: keygenCommand,
        encrypt: encryptCommand,
        "encrypt-all": encryptAllCommand,
        decrypt: decryptCommand,
        rotate: rotateCommand,
        validate: validateCommand,
        gen: genCommand,
    },
    docs: { brief: "Confederation CLI — validate config, generate types, and manage encrypted secrets" },
});

export const app = buildApplication(root, {
    name: "confederation",
    versionInfo: { currentVersion: "0.0.0" },
});
