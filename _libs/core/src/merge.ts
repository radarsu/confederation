import type { z } from "zod";
import { isPlainObject } from "./setPath.js";
import type { Source } from "./source.js";

export function mergeSources(sources: Source[], schema: z.ZodType): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const source of sources) {
        const loaded = source.load({ schema });
        walkAndMerge(merged, loaded);
    }
    return merged;
}

function walkAndMerge(target: Record<string, unknown>, incoming: Record<string, unknown>): void {
    for (const key of Object.keys(incoming)) {
        const value = incoming[key];
        if (isPlainObject(value)) {
            const existing = target[key];
            if (!isPlainObject(existing)) {
                target[key] = {};
            }
            walkAndMerge(target[key] as Record<string, unknown>, value);
            continue;
        }
        target[key] = value;
    }
}
