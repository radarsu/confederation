import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateJsonSchema } from "./generateJsonSchema.js";

const schema = z.object({
    apiKey: z.string().default("dev-key").meta({ secret: true }),
    port: z.coerce.number().int(),
    host: z.string().default("0.0.0.0"),
});

describe("generateJsonSchema", () => {
    const out = generateJsonSchema(schema);
    const json = JSON.parse(out) as { type: string; additionalProperties: boolean; properties: Record<string, Record<string, unknown>> };

    it("emits a closed object schema", () => {
        expect(json.type).toBe("object");
        expect(json.additionalProperties).toBe(false);
    });

    it("strips the default of a secret field but keeps its secret flag", () => {
        expect(out).not.toContain("dev-key");
        expect(json.properties.apiKey?.["secret"]).toBe(true);
        expect(json.properties.apiKey?.["default"]).toBeUndefined();
    });

    it("keeps non-secret defaults", () => {
        expect(json.properties.host?.["default"]).toBe("0.0.0.0");
    });
});
