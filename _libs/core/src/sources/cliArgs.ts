import { buildCliNameMap } from "../deriveName.js";
import { enumerateLeafPaths } from "../enumerateLeafPaths.js";
import { setPath } from "../setPath.js";
import type { Source } from "../source.js";

export interface CliArgsOptions {
    argv?: string[];
}

export function cliArgs(options: CliArgsOptions = {}): Source {
    const argv = options.argv ?? process.argv.slice(2);
    return {
        name: "cliArgs",
        load: ({ schema }) => {
            const parsed = parseArgv(argv);
            const entries = buildCliNameMap(enumerateLeafPaths(schema));
            const result: Record<string, unknown> = {};
            for (const entry of entries) {
                const value = parsed.get(entry.cliName);
                if (value === undefined) {
                    continue;
                }
                setPath(result, entry.path, value);
            }
            return result;
        },
    };
}

function parseArgv(argv: string[]): Map<string, string> {
    const result = new Map<string, string>();
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === undefined || !arg.startsWith("--")) {
            continue;
        }
        const body = arg.slice(2);
        if (body === "") {
            continue;
        }
        const eq = body.indexOf("=");
        if (eq !== -1) {
            result.set(body.slice(0, eq), body.slice(eq + 1));
            continue;
        }
        const next = argv[i + 1];
        if (next === undefined || next.startsWith("--")) {
            result.set(body, "true");
            continue;
        }
        result.set(body, next);
        i++;
    }
    return result;
}
