import { describe, expect, it } from "vitest";
import { z } from "zod";
import { enumerateLeafPaths } from "./enumerateLeafPaths.js";

describe("enumerateLeafPaths", () => {
    it("returns dotted paths for every leaf", () => {
        const schema = z.object({
            nodeEnv: z.string(),
            server: z.object({ host: z.string(), port: z.number() }),
        });
        const paths = enumerateLeafPaths(schema).map((l) => l.path.join("."));
        expect(paths).toEqual(["nodeEnv", "server.host", "server.port"]);
    });

    it("unwraps optional/nullable/default around leaves", () => {
        const schema = z.object({
            a: z.string().optional(),
            b: z.string().nullable(),
            c: z.string().default("x"),
            d: z.string().optional().default("y"),
        });
        const paths = enumerateLeafPaths(schema).map((l) => l.path.join("."));
        expect(paths).toEqual(["a", "b", "c", "d"]);
    });

    it("unwraps wrappers around nested objects too", () => {
        const schema = z.object({
            server: z.object({ port: z.number() }).default({ port: 3000 }),
        });
        const paths = enumerateLeafPaths(schema).map((l) => l.path.join("."));
        expect(paths).toEqual(["server.port"]);
    });

    it("returns no leaves for an empty object schema", () => {
        expect(enumerateLeafPaths(z.object({}))).toEqual([]);
    });
});
