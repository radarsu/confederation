import type { z } from "zod";
import { findSecretPaths } from "./findSecretPaths.js";
import { deepFreeze } from "./freeze.js";
import { mergeSources } from "./merge.js";
import { provenanceStore } from "./provenance.js";
import type { Source } from "./source.js";

export interface ConfigDefinition<S extends z.ZodType> {
    schema: S;
    sources: Source[];
}

export interface ConfigHandle<S extends z.ZodType> {
    load: () => z.infer<S>;
    get: () => z.infer<S>;
}

export function createConfig<S extends z.ZodType>(definition: ConfigDefinition<S>): ConfigHandle<S> {
    let holder: z.infer<S> | undefined;
    return {
        load(): z.infer<S> {
            const { merged, provenance } = mergeSources(definition.sources, definition.schema);
            const parsed = definition.schema.parse(merged) as z.infer<S>;
            const frozen = deepFreeze(parsed);
            if (typeof frozen === "object" && frozen !== null) {
                provenanceStore.set(frozen, { provenance, secrets: findSecretPaths(definition.schema) });
            }
            holder = frozen;
            return frozen;
        },
        get(): z.infer<S> {
            if (holder === undefined) {
                throw new Error("Config not loaded — call load() in your bootstrap before accessing config values");
            }
            return holder;
        },
    };
}
