import { describe, expect, it } from "vitest";
import { z } from "zod";
import { type LeafValidation, validateValues } from "./validateValues.js";

function leaf(report: { leaves: LeafValidation[] }, envName: string): LeafValidation {
    const found = report.leaves.find((entry) => entry.envName === envName);
    if (found === undefined) {
        throw new Error(`no validation for ${envName}`);
    }
    return found;
}

const schema = z.object({
    nodeEnv: z.string(),
    server: z.object({
        port: z.coerce.number().int(),
        host: z.string().default("0.0.0.0"),
    }),
    database: z.object({ url: z.url() }),
    debug: z.coerce.boolean().optional(),
});

describe("validateValues", () => {
    it("accepts a complete, coercible set of values", () => {
        const report = validateValues(schema, {
            NODE_ENV: "production",
            SERVER_PORT: "8080",
            DATABASE_URL: "https://example.com",
        });
        expect(report.leaves.every((entry) => entry.ok)).toBe(true);
        expect(report.formError).toBeUndefined();
    });

    it("flags a missing required value", () => {
        const report = validateValues(schema, { SERVER_PORT: "8080", DATABASE_URL: "https://example.com" });
        expect(leaf(report, "NODE_ENV").ok).toBe(false);
        expect(leaf(report, "NODE_ENV").message).toMatch(/missing/i);
    });

    it("treats missing optional and defaulted values as ok", () => {
        const report = validateValues(schema, {
            NODE_ENV: "production",
            SERVER_PORT: "8080",
            DATABASE_URL: "https://example.com",
        });
        expect(leaf(report, "SERVER_HOST").ok).toBe(true);
        expect(leaf(report, "DEBUG").ok).toBe(true);
    });

    it("flags invalid values with the zod message", () => {
        const report = validateValues(schema, {
            NODE_ENV: "production",
            SERVER_PORT: "not-a-number",
            DATABASE_URL: "not-a-url",
        });
        expect(leaf(report, "SERVER_PORT").ok).toBe(false);
        expect(leaf(report, "DATABASE_URL").ok).toBe(false);
    });

    it("surfaces cross-field refinements as a form error", () => {
        const refined = z
            .object({ min: z.coerce.number(), max: z.coerce.number() })
            .refine((value) => value.min <= value.max, { message: "min must not exceed max" });
        const report = validateValues(refined, { MIN: "10", MAX: "1" });
        expect(report.leaves.every((entry) => entry.ok)).toBe(true);
        expect(report.formError).toMatch(/min must not exceed max/);
    });
});
