import { existsSync, readFileSync } from "node:fs";
import { buildEnvNameMap } from "../deriveName.js";
import { enumerateLeafPaths } from "../enumerateLeafPaths.js";
import { setPath } from "../setPath.js";
import type { Source } from "../source.js";

export interface EnvFileOptions {
    prefix?: string;
}

export function envFile(path: string, options: EnvFileOptions = {}): Source {
    return {
        name: `envFile(${path})`,
        load: ({ schema }) => {
            if (!existsSync(path)) {
                return {};
            }
            const parsed = parseEnvFile(readFileSync(path, "utf8"));
            const entries = buildEnvNameMap(enumerateLeafPaths(schema), options.prefix);
            const result: Record<string, unknown> = {};
            for (const entry of entries) {
                const value = parsed.get(entry.envName);
                if (value === undefined || value === "") {
                    continue;
                }
                setPath(result, entry.path, value);
            }
            return result;
        },
    };
}

function parseEnvFile(content: string): Map<string, string> {
    const result = new Map<string, string>();
    for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        if (line === "" || line.startsWith("#")) {
            continue;
        }
        const eq = line.indexOf("=");
        if (eq === -1) {
            continue;
        }
        const key = line.slice(0, eq).trim();
        if (key === "") {
            continue;
        }
        result.set(key, unquote(line.slice(eq + 1).trim()));
    }
    return result;
}

function unquote(value: string): string {
    if (value.length < 2) {
        return value;
    }
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        return value.slice(1, -1);
    }
    return value;
}
