import { describe, expect, it } from "vitest";
import { z } from "zod";
import { mergeSources } from "./merge.js";
import type { Source } from "./source.js";

function src(name: string, data: Record<string, unknown>): Source {
    return { name, load: () => data };
}

const placeholderSchema = z.object({});

describe("mergeSources", () => {
    it("applies last-source-wins precedence at the leaf", () => {
        const merged = mergeSources([src("a", { port: "1" }), src("b", { port: "2" }), src("c", { port: "3" })], placeholderSchema);
        expect(merged.port).toBe("3");
    });

    it("deep-merges nested objects", () => {
        const merged = mergeSources(
            [src("a", { server: { host: "0.0.0.0", port: "1" } }), src("b", { server: { port: "2" } })],
            placeholderSchema,
        );
        expect(merged).toEqual({ server: { host: "0.0.0.0", port: "2" } });
    });

    it("replaces arrays wholesale instead of merging element-wise", () => {
        const merged = mergeSources([src("a", { items: ["x", "y"] }), src("b", { items: ["z"] })], placeholderSchema);
        expect(merged.items).toEqual(["z"]);
    });
});
