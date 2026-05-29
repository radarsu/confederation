import { describe, expect, it } from "vitest";
import { usesConfederation } from "./detectConfederation.js";

describe("usesConfederation", () => {
    it("is true when a confederation.config file exists", () => {
        expect(usesConfederation([], ["confederation.config.ts"])).toBe(true);
    });

    it("is true when a package depends on an @confederation package", () => {
        expect(usesConfederation([{ dependencies: { "@confederation/core": "workspace:*" } }], [])).toBe(true);
        expect(usesConfederation([{ devDependencies: { "@confederation/core": "1.0.0" } }], [])).toBe(true);
    });

    it("is false for an unrelated workspace", () => {
        expect(usesConfederation([{ dependencies: { zod: "4.0.0" } }], [])).toBe(false);
    });
});
