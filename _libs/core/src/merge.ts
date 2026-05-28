import type { z } from "zod";
import type { ProvenanceMap } from "./provenance.js";
import { isPlainObject } from "./setPath.js";
import type { Source } from "./source.js";

export interface MergeResult {
    merged: Record<string, unknown>;
    provenance: ProvenanceMap;
}

export function mergeSources(sources: Source[], schema: z.ZodType): MergeResult {
    const merged: Record<string, unknown> = {};
    const provenance: ProvenanceMap = new Map();
    for (const source of sources) {
        const loaded = source.load({ schema });
        walkAndMerge(merged, loaded, [], source.name, provenance);
    }
    return { merged, provenance };
}

function walkAndMerge(
    target: Record<string, unknown>,
    incoming: Record<string, unknown>,
    path: string[],
    sourceName: string,
    provenance: ProvenanceMap,
): void {
    for (const key of Object.keys(incoming)) {
        const value = incoming[key];
        const nextPath = [...path, key];
        if (isPlainObject(value)) {
            const existing = target[key];
            if (!isPlainObject(existing)) {
                target[key] = {};
            }
            walkAndMerge(target[key] as Record<string, unknown>, value, nextPath, sourceName, provenance);
            continue;
        }
        target[key] = value;
        const dotted = nextPath.join(".");
        const prior = provenance.get(dotted);
        if (prior === undefined) {
            provenance.set(dotted, { source: sourceName, raw: value, shadowed: [] });
            continue;
        }
        prior.shadowed.push({ source: prior.source, raw: prior.raw });
        prior.source = sourceName;
        prior.raw = value;
    }
}
