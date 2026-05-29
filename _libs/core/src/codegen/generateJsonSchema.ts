import { z } from "zod";

// Emit JSON Schema from the config's Zod schema. `unrepresentable: "any"` keeps types like
// z.coerce.date() from throwing. Any node carrying `secret: true` (from `.meta({ secret: true })`)
// has its default/examples stripped so no secret value leaks into the generated schema.
export function generateJsonSchema(schema: z.ZodType): string {
    const json = z.toJSONSchema(schema, { unrepresentable: "any" }) as Record<string, unknown>;
    scrubSecrets(json);
    return `${JSON.stringify(json, null, 4)}\n`;
}

function scrubSecrets(node: unknown): void {
    if (Array.isArray(node)) {
        for (const item of node) {
            scrubSecrets(item);
        }
        return;
    }
    if (node === null || typeof node !== "object") {
        return;
    }
    const object = node as Record<string, unknown>;
    if (object["secret"] === true) {
        delete object["default"];
        delete object["examples"];
    }
    for (const value of Object.values(object)) {
        scrubSecrets(value);
    }
}
