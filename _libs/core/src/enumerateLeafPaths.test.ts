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

    it("collects meta from a plain leaf schema", () => {
        const schema = z.object({ password: z.string().meta({ secret: true }) });
        const [leaf] = enumerateLeafPaths(schema);
        expect(leaf?.meta).toEqual({ secret: true });
    });

    it("collects meta when set on the inner schema and wrapped after", () => {
        const schema = z.object({ password: z.string().meta({ secret: true }).optional() });
        const [leaf] = enumerateLeafPaths(schema);
        expect(leaf?.meta).toEqual({ secret: true });
    });

    it("collects meta when set on the outer wrapper", () => {
        const schema = z.object({ password: z.string().optional().meta({ secret: true }) });
        const [leaf] = enumerateLeafPaths(schema);
        expect(leaf?.meta).toEqual({ secret: true });
    });

    it("merges meta across wrappers with outer winning conflicts (most recent annotation overrides)", () => {
        const schema = z.object({
            password: z.string().meta({ secret: true, label: "inner" }).optional().meta({ label: "outer" }),
        });
        const [leaf] = enumerateLeafPaths(schema);
        expect(leaf?.meta).toEqual({ secret: true, label: "outer" });
    });

    it("leaves meta undefined when none is attached", () => {
        const schema = z.object({ port: z.number() });
        const [leaf] = enumerateLeafPaths(schema);
        expect(leaf?.meta).toBeUndefined();
    });
});
