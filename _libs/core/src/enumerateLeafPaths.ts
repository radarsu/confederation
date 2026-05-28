import type { z } from "zod";
import { schemaType, unwrapToInner } from "./unwrapSchema.js";

export interface LeafDescriptor {
    path: string[];
    schema: z.ZodType;
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
    out.push({ path, schema: inner });
}
