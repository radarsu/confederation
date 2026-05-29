// A round-trip .env parser/serializer. Unlike the load-time parser in ./sources/envFile.js
// (which returns a lossy record), this preserves comments, blank lines, key order, quote style,
// `export` prefixes, inline comments, BOM and EOL — so surgical edits leave the rest of the file
// byte-identical.

export type QuoteStyle = '"' | "'" | "";

export type EnvLine =
    | { kind: "blank"; raw: string }
    | { kind: "comment"; raw: string }
    | { kind: "raw"; raw: string }
    | {
          kind: "entry";
          raw: string;
          key: string;
          value: string;
          quote: QuoteStyle;
          exported: boolean;
          inlineComment: string;
          dirty: boolean;
      };

export interface EnvDocument {
    eol: "\n" | "\r\n";
    bom: boolean;
    lines: EnvLine[];
}

export function parseEnv(text: string): EnvDocument {
    const bom = text.charCodeAt(0) === 0xfeff;
    const body = bom ? text.slice(1) : text;
    const eol: "\n" | "\r\n" = body.includes("\r\n") ? "\r\n" : "\n";
    // Keep every split segment (including the trailing "" a final newline produces) so that
    // join() during serialization reproduces the original terminator exactly.
    const rawLines = body.split(/\r\n|\n/);
    return { eol, bom, lines: rawLines.map(parseLine) };
}

export function serializeEnv(doc: EnvDocument): string {
    const text = doc.lines.map(serializeLine).join(doc.eol);
    return doc.bom ? `﻿${text}` : text;
}

export function getValue(doc: EnvDocument, key: string): string | undefined {
    let found: string | undefined;
    for (const line of doc.lines) {
        if (line.kind === "entry" && line.key === key) {
            found = line.value; // last occurrence wins (matches dotenv semantics)
        }
    }
    return found;
}

export function listEntries(doc: EnvDocument): { key: string; value: string }[] {
    const result: { key: string; value: string }[] = [];
    for (const line of doc.lines) {
        if (line.kind === "entry") {
            result.push({ key: line.key, value: line.value });
        }
    }
    return result;
}

export function setValue(doc: EnvDocument, key: string, value: string): EnvDocument {
    const lines = doc.lines.slice();
    let lastIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line?.kind === "entry" && line.key === key) {
            lastIndex = i;
        }
    }
    if (lastIndex === -1) {
        return appendEntry(doc, key, value);
    }
    const target = lines[lastIndex] as Extract<EnvLine, { kind: "entry" }>;
    lines[lastIndex] = { ...target, value, quote: pickQuote(value, target.quote), dirty: true };
    return { ...doc, lines };
}

export function addKey(doc: EnvDocument, key: string, value: string): EnvDocument {
    if (doc.lines.some((line) => line.kind === "entry" && line.key === key)) {
        return setValue(doc, key, value);
    }
    return appendEntry(doc, key, value);
}

export function removeKey(doc: EnvDocument, key: string): EnvDocument {
    return { ...doc, lines: doc.lines.filter((line) => !(line.kind === "entry" && line.key === key)) };
}

function appendEntry(doc: EnvDocument, key: string, value: string): EnvDocument {
    const entry: EnvLine = {
        kind: "entry",
        raw: "",
        key,
        value,
        quote: pickQuote(value, ""),
        exported: false,
        inlineComment: "",
        dirty: true,
    };
    const lines = doc.lines.slice();
    // Insert before a run of trailing blank lines so a final newline stays at the end.
    let insertAt = lines.length;
    while (insertAt > 0 && lines[insertAt - 1]?.kind === "blank") {
        insertAt--;
    }
    lines.splice(insertAt, 0, entry);
    return { ...doc, lines };
}

function parseLine(raw: string): EnvLine {
    const trimmed = raw.trim();
    if (trimmed === "") {
        return { kind: "blank", raw };
    }
    if (trimmed.startsWith("#")) {
        return { kind: "comment", raw };
    }

    let working = raw.replace(/^\s+/, "");
    let exported = false;
    const exportMatch = working.match(/^export\s+/);
    if (exportMatch) {
        exported = true;
        working = working.slice(exportMatch[0].length);
    }

    const eq = working.indexOf("=");
    if (eq === -1) {
        return { kind: "raw", raw };
    }
    const key = working.slice(0, eq).trim();
    if (key === "" || !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(key)) {
        return { kind: "raw", raw };
    }

    const rest = working.slice(eq + 1).replace(/^\s+/, "");
    const parsed = parseValue(rest);
    return { kind: "entry", raw, key, value: parsed.value, quote: parsed.quote, exported, inlineComment: parsed.inlineComment, dirty: false };
}

function parseValue(rest: string): { value: string; quote: QuoteStyle; inlineComment: string } {
    const first = rest[0];
    if (first === '"' || first === "'") {
        const close = rest.indexOf(first, 1);
        if (close !== -1) {
            const after = rest.slice(close + 1).trim();
            const inlineComment = after.startsWith("#") ? after : "";
            return { value: rest.slice(1, close), quote: first, inlineComment };
        }
    }
    const commentAt = rest.search(/\s#/);
    if (commentAt !== -1) {
        return { value: rest.slice(0, commentAt).trim(), quote: "", inlineComment: rest.slice(commentAt + 1).trim() };
    }
    return { value: rest.trimEnd(), quote: "", inlineComment: "" };
}

function serializeLine(line: EnvLine): string {
    if (line.kind !== "entry") {
        return line.raw;
    }
    if (!line.dirty) {
        return line.raw;
    }
    const prefix = line.exported ? "export " : "";
    const valuePart = renderValue(line.value, line.quote);
    const comment = line.inlineComment === "" ? "" : ` ${line.inlineComment}`;
    return `${prefix}${line.key}=${valuePart}${comment}`;
}

function renderValue(value: string, quote: QuoteStyle): string {
    if (quote === '"') {
        return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    if (quote === "'") {
        return `'${value}'`;
    }
    return value;
}

function pickQuote(value: string, current: QuoteStyle): QuoteStyle {
    if (current !== "") {
        return current;
    }
    if (/[\s#"']/.test(value) || value === "") {
        return '"';
    }
    return "";
}
