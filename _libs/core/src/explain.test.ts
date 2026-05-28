import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineConfig } from "./defineConfig.js";
import { explain } from "./explain.js";
import { secret } from "./secret.js";
import type { Source } from "./source.js";

function src(name: string, data: Record<string, unknown>): Source {
    return { name, load: () => data };
}

describe("explain", () => {
    it("returns winner, raw, and shadowed chain", () => {
        const config = defineConfig({
            schema: z.object({ server: z.object({ port: z.coerce.number() }) }),
            sources: [src("env", { server: { port: "1111" } }), src("cli", { server: { port: "2222" } })],
        });
        const result = explain(config, "server.port");
        expect(result.value).toBe(2222);
        expect(result.source).toBe("cli");
        expect(result.raw).toBe("2222");
        expect(result.shadowed).toEqual([{ source: "env", raw: "1111" }]);
    });

    it("throws on unknown config object", () => {
        expect(() => explain({ unrelated: true }, "anything")).toThrow(/No provenance/);
    });

    it("throws on unknown path", () => {
        const config = defineConfig({
            schema: z.object({ port: z.coerce.number().default(3000) }),
            sources: [],
        });
        expect(() => explain(config, "nonexistent.path")).toThrow(/No provenance recorded/);
    });

    it("redacts secret leaf values and their shadowed raws", () => {
        const config = defineConfig({
            schema: z.object({
                token: secret(z.string()),
            }),
            sources: [src("envFile", { token: "old-token" }), src("env", { token: "new-token" })],
        });
        const result = explain(config, "token");
        expect(result.value).toBe("[REDACTED]");
        expect(result.raw).toBe("[REDACTED]");
        expect(result.source).toBe("env");
        expect(result.shadowed).toEqual([{ source: "envFile", raw: "[REDACTED]" }]);
    });

    it("redacts paths beneath a secret object", () => {
        const config = defineConfig({
            schema: z.object({
                database: secret(z.object({ url: z.string() })),
            }),
            sources: [src("env", { database: { url: "postgres://user:pass@host/db" } })],
        });
        const result = explain(config, "database.url");
        expect(result.value).toBe("[REDACTED]");
        expect(result.raw).toBe("[REDACTED]");
        expect(result.source).toBe("env");
    });
});
