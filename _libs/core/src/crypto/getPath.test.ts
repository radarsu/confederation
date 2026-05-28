import { describe, expect, it } from "vitest";
import { getPath } from "./getPath.js";

describe("getPath", () => {
    it("returns the value at a top-level path", () => {
        expect(getPath({ port: "8080" }, ["port"])).toBe("8080");
    });

    it("returns the value at a nested path", () => {
        expect(getPath({ server: { port: "8080" } }, ["server", "port"])).toBe("8080");
    });

    it("returns undefined when a segment is missing", () => {
        expect(getPath({}, ["missing"])).toBeUndefined();
        expect(getPath({ a: {} }, ["a", "b"])).toBeUndefined();
    });

    it("returns undefined when a segment is a non-object", () => {
        expect(getPath({ port: "8080" }, ["port", "deeper"])).toBeUndefined();
    });
});
