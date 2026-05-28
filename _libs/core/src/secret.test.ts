import { describe, expect, it } from "vitest";
import { z } from "zod";
import { findSecretPaths } from "./findSecretPaths.js";
import { isSecretSchema, secret } from "./secret.js";

describe("secret", () => {
    it("marks a schema as secret", () => {
        expect(isSecretSchema(secret(z.string()))).toBe(true);
        expect(isSecretSchema(z.string())).toBe(false);
    });

    it("isSecretSchema unwraps optional/nullable/default", () => {
        expect(isSecretSchema(secret(z.string()).optional())).toBe(true);
        expect(isSecretSchema(secret(z.string()).nullable())).toBe(true);
        expect(isSecretSchema(secret(z.string()).default("x"))).toBe(true);
        expect(isSecretSchema(secret(z.string()).optional().nullable())).toBe(true);
    });
});

describe("findSecretPaths", () => {
    it("returns empty set when no secrets are marked", () => {
        const schema = z.object({ port: z.number(), host: z.string() });
        expect(findSecretPaths(schema)).toEqual(new Set());
    });

    it("finds top-level secret fields", () => {
        const schema = z.object({
            port: z.number(),
            token: secret(z.string()),
        });
        expect(findSecretPaths(schema)).toEqual(new Set(["token"]));
    });

    it("finds nested secret objects without enumerating descendants", () => {
        const schema = z.object({
            database: secret(z.object({ url: z.string(), password: z.string() })),
            mode: z.string(),
        });
        expect(findSecretPaths(schema)).toEqual(new Set(["database"]));
    });

    it("handles secret schemas wrapped in optional/default", () => {
        const schema = z.object({
            token: secret(z.string()).optional(),
            apiKey: secret(z.string()).default("x"),
        });
        expect(findSecretPaths(schema)).toEqual(new Set(["token", "apiKey"]));
    });
});
