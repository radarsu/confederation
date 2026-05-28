import type { z } from "zod";
import { isSecretSchema, SECRET } from "./secret.js";
import { schemaType, unwrapSchema } from "./unwrapSchema.js";

export function findSecretPaths(schema: z.ZodType): Set<string> {
    const result = new Set<string>();
    walk(schema, [], result);
    return result;
}

function walk(schema: z.ZodType, path: string[], out: Set<string>): void {
    if ((schema as unknown as Record<symbol, unknown>)[SECRET] === true || isSecretSchema(schema)) {
        if (path.length > 0) {
            out.add(path.join("."));
        }
        return;
    }
    if (schemaType(schema) === "object") {
        const shape = (schema as unknown as { shape: Record<string, z.ZodType> }).shape;
        for (const key of Object.keys(shape)) {
            const child = shape[key];
            if (child === undefined) {
                continue;
            }
            walk(child, [...path, key], out);
        }
        return;
    }
    const inner = unwrapSchema(schema);
    if (inner !== undefined) {
        walk(inner, path, out);
    }
}
