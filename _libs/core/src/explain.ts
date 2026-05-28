import { type ProvenanceShadow, provenanceStore } from "./provenance.js";
import { isPlainObject } from "./setPath.js";

export interface Explanation {
    value: unknown;
    source: string;
    raw: unknown;
    shadowed: ProvenanceShadow[];
}

const REDACTED = "[REDACTED]";

export function explain<T extends object>(config: T, path: string): Explanation {
    const record = provenanceStore.get(config);
    if (record === undefined) {
        throw new Error("No provenance data registered for this config object — did you pass the value returned by load()/defineConfig()?");
    }
    const entry = record.provenance.get(path);
    if (entry === undefined) {
        throw new Error(`No provenance recorded for path: ${path}`);
    }
    const isSecret = isSecretPath(record.secrets, path);
    return {
        value: isSecret ? REDACTED : getPath(config, path),
        source: entry.source,
        raw: isSecret ? REDACTED : entry.raw,
        shadowed: isSecret
            ? entry.shadowed.map((s) => ({ source: s.source, raw: REDACTED }))
            : entry.shadowed.map((s) => ({ source: s.source, raw: s.raw })),
    };
}

function isSecretPath(secrets: Set<string>, path: string): boolean {
    if (secrets.has(path)) {
        return true;
    }
    for (const secretPath of secrets) {
        if (path.startsWith(`${secretPath}.`)) {
            return true;
        }
    }
    return false;
}

function getPath(config: object, path: string): unknown {
    const segments = path.split(".");
    let cursor: unknown = config;
    for (const segment of segments) {
        if (!isPlainObject(cursor)) {
            return undefined;
        }
        cursor = cursor[segment];
    }
    return cursor;
}
