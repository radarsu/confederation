import type { z } from "zod";
import { schemaType, unwrapSchema } from "./unwrapSchema.js";

export interface Wrappers {
    optional: boolean;
    nullable: boolean;
    hasDefault: boolean;
    defaultValue: unknown;
    hasCatch: boolean;
}

export function collectWrappers(outer: z.ZodType): Wrappers {
    const wrappers: Wrappers = { optional: false, nullable: false, hasDefault: false, defaultValue: undefined, hasCatch: false };
    let current: z.ZodType | undefined = outer;
    let forcedRequired = false;
    while (current !== undefined) {
        const type = schemaType(current);
        if (type === "optional") {
            wrappers.optional = true;
        } else if (type === "nonoptional") {
            forcedRequired = true;
        } else if (type === "nullable") {
            wrappers.nullable = true;
        } else if (type === "default" || type === "prefault") {
            wrappers.hasDefault = true;
            wrappers.defaultValue = readDefaultValue(current);
        } else if (type === "catch") {
            wrappers.hasCatch = true;
        }
        current = unwrapSchema(current);
    }
    if (forcedRequired) {
        wrappers.optional = false;
    }
    return wrappers;
}

export function isRequired(outer: z.ZodType): boolean {
    const wrappers = collectWrappers(outer);
    return !wrappers.optional && !wrappers.hasDefault && !wrappers.hasCatch;
}

function readDefaultValue(schema: z.ZodType): unknown {
    const raw = (schema as unknown as { _zod?: { def?: { defaultValue?: unknown } } })._zod?.def?.defaultValue;
    if (typeof raw !== "function") {
        return raw;
    }
    try {
        return (raw as () => unknown)();
    } catch {
        return undefined;
    }
}
