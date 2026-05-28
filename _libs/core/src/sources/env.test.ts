import { describe, expect, it } from "vitest";
import { z } from "zod";
import { env } from "./env.js";

describe("env source", () => {
    it("derives SCREAMING_SNAKE names from camelCase schema paths", () => {
        const schema = z.object({ nodeEnv: z.string(), host: z.string() });
        const result = env({ source: { NODE_ENV: "production", HOST: "localhost", IGNORED: "x" } }).load({ schema });
        expect(result).toEqual({ nodeEnv: "production", host: "localhost" });
    });

    it("joins nested paths with single underscore", () => {
        const schema = z.object({ server: z.object({ httpsPort: z.string(), host: z.string() }) });
        const result = env({ source: { SERVER_HTTPS_PORT: "8443", SERVER_HOST: "0.0.0.0" } }).load({ schema });
        expect(result).toEqual({ server: { httpsPort: "8443", host: "0.0.0.0" } });
    });

    it("prepends the prefix to derived names but not to overrides", () => {
        const schema = z.object({
            nodeEnv: z.string(),
            port: z.string().meta({ env: "PORT" }),
        });
        const result = env({
            prefix: "APP_",
            source: { APP_NODE_ENV: "production", PORT: "8080", APP_PORT: "should-not-win" },
        }).load({ schema });
        expect(result).toEqual({ nodeEnv: "production", port: "8080" });
    });

    it("honors .meta({ env }) override on leaves wrapped in optional/default", () => {
        const schema = z.object({
            apiKey: z.string().meta({ env: "API_KEY" }).optional(),
            timeout: z.coerce.number().meta({ env: "TIMEOUT_MS" }).default(5000),
        });
        const result = env({ source: { API_KEY: "secret", TIMEOUT_MS: "1000" } }).load({ schema });
        expect(result).toEqual({ apiKey: "secret", timeout: "1000" });
    });

    it("throws when two leaves derive the same env name", () => {
        const schema = z.object({
            databaseUrl: z.string(),
            database: z.object({ url: z.string() }),
        });
        expect(() => env({ source: {} }).load({ schema })).toThrow(/ambiguous env mapping: DATABASE_URL/);
    });

    it("skips empty values", () => {
        const schema = z.object({ host: z.string() });
        expect(env({ source: { HOST: "" } }).load({ schema })).toEqual({});
    });

    it("ignores process.env keys that don't match any schema path", () => {
        const schema = z.object({ host: z.string() });
        expect(env({ source: { HOST: "localhost", UNKNOWN: "x", PATH: "/usr/bin" } }).load({ schema })).toEqual({ host: "localhost" });
    });

    it("named 'env'", () => {
        expect(env().name).toBe("env");
    });
});
