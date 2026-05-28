import { buildEnvNameMap } from "../deriveName.js";
import { enumerateLeafPaths } from "../enumerateLeafPaths.js";
import { setPath } from "../setPath.js";
import type { Source } from "../source.js";

export interface EnvOptions {
    prefix?: string;
    source?: NodeJS.ProcessEnv;
}

export function env(options: EnvOptions = {}): Source {
    const envSource = options.source ?? process.env;
    return {
        name: "env",
        load: ({ schema }) => {
            const entries = buildEnvNameMap(enumerateLeafPaths(schema), options.prefix);
            const result: Record<string, unknown> = {};
            for (const entry of entries) {
                const value = envSource[entry.envName];
                if (value === undefined || value === "") {
                    continue;
                }
                setPath(result, entry.path, value);
            }
            return result;
        },
    };
}
