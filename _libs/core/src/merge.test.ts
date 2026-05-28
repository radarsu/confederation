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
        const { merged, provenance } = mergeSources([src("a", { port: "1" }), src("b", { port: "2" }), src("c", { port: "3" })], placeholderSchema);
        expect(merged.port).toBe("3");
        const entry = provenance.get("port");
        expect(entry?.source).toBe("c");
        expect(entry?.raw).toBe("3");
        expect(entry?.shadowed).toEqual([
            { source: "a", raw: "1" },
            { source: "b", raw: "2" },
        ]);
    });

    it("deep-merges nested objects", () => {
        const { merged, provenance } = mergeSources(
            [src("a", { server: { host: "0.0.0.0", port: "1" } }), src("b", { server: { port: "2" } })],
            placeholderSchema,
        );
        expect(merged).toEqual({ server: { host: "0.0.0.0", port: "2" } });
        expect(provenance.get("server.host")?.source).toBe("a");
        expect(provenance.get("server.port")?.source).toBe("b");
    });

    it("replaces arrays wholesale instead of merging element-wise", () => {
        const { merged, provenance } = mergeSources([src("a", { items: ["x", "y"] }), src("b", { items: ["z"] })], placeholderSchema);
        expect(merged.items).toEqual(["z"]);
        const entry = provenance.get("items");
        expect(entry?.source).toBe("b");
        expect(entry?.shadowed).toEqual([{ source: "a", raw: ["x", "y"] }]);
    });

    it("records only the winning value when only one source sets a path", () => {
        const { provenance } = mergeSources([src("only", { mode: "dev" })], placeholderSchema);
        const entry = provenance.get("mode");
        expect(entry).toEqual({ source: "only", raw: "dev", shadowed: [] });
    });
});
