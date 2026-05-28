import type { z } from "zod";
import { unwrapSchema } from "./unwrapSchema.js";

export const SECRET = Symbol.for("confederation.secret");

export function secret<T extends z.ZodType>(schema: T): T {
    (schema as unknown as Record<symbol, unknown>)[SECRET] = true;
    return schema;
}

export function isSecretSchema(schema: z.ZodType): boolean {
    let current: z.ZodType = schema;
    while (true) {
        if ((current as unknown as Record<symbol, unknown>)[SECRET] === true) {
            return true;
        }
        const inner = unwrapSchema(current);
        if (inner === undefined) {
            return false;
        }
        current = inner;
    }
}
