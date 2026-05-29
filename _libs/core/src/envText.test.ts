import { describe, expect, it } from "vitest";
import { addKey, getValue, parseEnv, removeKey, serializeEnv, setValue } from "./envText.js";

function roundTrip(text: string): string {
    return serializeEnv(parseEnv(text));
}

describe("envText round-trip", () => {
    it("preserves comments, blanks, quotes, export and inline comments verbatim", () => {
        const text = ["# top comment", "", "export NODE_ENV=production", 'DATABASE_URL="postgres://a/b" # db', "PORT=8080", ""].join("\n");
        expect(roundTrip(text)).toBe(text);
    });

    it("preserves CRLF and trailing newline", () => {
        const text = "A=1\r\nB=2\r\n";
        expect(roundTrip(text)).toBe(text);
    });

    it("preserves absence of a trailing newline", () => {
        const text = "A=1\nB=2";
        expect(roundTrip(text)).toBe(text);
    });

    it("keeps a leading BOM", () => {
        const text = "﻿A=1\n";
        expect(roundTrip(text)).toBe(text);
    });
});

describe("envText parsing", () => {
    it("reads values, stripping quotes and inline comments", () => {
        const doc = parseEnv(["KEY=plain # note", 'QUOTED="a b#c"', "EXPORTED=1", "export FOO=bar"].join("\n"));
        expect(getValue(doc, "KEY")).toBe("plain");
        expect(getValue(doc, "QUOTED")).toBe("a b#c");
        expect(getValue(doc, "FOO")).toBe("bar");
    });

    it("keeps `=` inside an unquoted value", () => {
        expect(getValue(parseEnv("DSN=a=b=c"), "DSN")).toBe("a=b=c");
    });

    it("returns the last value for duplicate keys", () => {
        expect(getValue(parseEnv("A=1\nA=2"), "A")).toBe("2");
    });
});

describe("envText edits", () => {
    it("updates only the targeted entry and leaves the rest byte-identical", () => {
        const text = "# header\nA=1\nB=2\n";
        const out = serializeEnv(setValue(parseEnv(text), "A", "99"));
        expect(out).toBe("# header\nA=99\nB=2\n");
    });

    it("quotes a value that needs quoting when updating", () => {
        const out = serializeEnv(setValue(parseEnv("A=1\n"), "A", "has space"));
        expect(out).toBe('A="has space"\n');
    });

    it("appends a new key before the trailing newline", () => {
        const out = serializeEnv(addKey(parseEnv("A=1\n"), "B", "2"));
        expect(out).toBe("A=1\nB=2\n");
    });

    it("setValue appends when the key is absent", () => {
        const out = serializeEnv(setValue(parseEnv("A=1\n"), "C", "3"));
        expect(out).toBe("A=1\nC=3\n");
    });

    it("removes all occurrences of a key", () => {
        const out = serializeEnv(removeKey(parseEnv("A=1\nB=2\nA=3\n"), "A"));
        expect(out).toBe("B=2\n");
    });
});
