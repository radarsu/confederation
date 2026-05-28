import type { z } from "zod";

const UNWRAPPABLE = new Set(["optional", "nullable", "default", "prefault", "nonoptional", "catch", "readonly"]);

export function unwrapSchema(schema: z.ZodType): z.ZodType | undefined {
    const type = schemaType(schema);
    if (type === undefined || !UNWRAPPABLE.has(type)) {
        return undefined;
    }
    const fn = (schema as unknown as { unwrap?: () => z.ZodType }).unwrap;
    if (typeof fn !== "function") {
        return undefined;
    }
    return fn.call(schema);
}

export function unwrapToInner(schema: z.ZodType): z.ZodType {
    let current = schema;
    while (true) {
        const inner = unwrapSchema(current);
        if (inner === undefined) {
            return current;
        }
        current = inner;
    }
}

export function schemaType(schema: z.ZodType): string | undefined {
    return (schema as unknown as { _zod?: { def?: { type?: string } } })._zod?.def?.type;
}
