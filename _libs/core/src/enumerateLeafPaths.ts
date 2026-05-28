import type { z } from "zod";
import { schemaType, unwrapToInner } from "./unwrapSchema.js";

export interface LeafDescriptor {
    path: string[];
    schema: z.ZodType;
    meta: Record<string, unknown> | undefined;
}

export function enumerateLeafPaths(schema: z.ZodType): LeafDescriptor[] {
    const result: LeafDescriptor[] = [];
    walk(schema, [], result);
    return result;
}

function walk(schema: z.ZodType, path: string[], out: LeafDescriptor[]): void {
    const inner = unwrapToInner(schema);
    if (schemaType(inner) === "object") {
        const shape = (inner as unknown as { shape: Record<string, z.ZodType> }).shape;
        for (const key of Object.keys(shape)) {
            const child = shape[key];
            if (child === undefined) {
                continue;
            }
            walk(child, [...path, key], out);
        }
        return;
    }
    if (path.length === 0) {
        return;
    }
    out.push({ path, schema: inner, meta: readMeta(inner) });
}

function readMeta(schema: z.ZodType): Record<string, unknown> | undefined {
    const fn = (schema as unknown as { meta?: () => Record<string, unknown> | undefined }).meta;
    if (typeof fn !== "function") {
        return undefined;
    }
    return fn.call(schema);
}
