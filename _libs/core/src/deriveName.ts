import type { LeafDescriptor } from "./enumerateLeafPaths.js";

export interface EnvNameEntry {
    path: string[];
    envName: string;
}

export interface CliNameEntry {
    path: string[];
    cliName: string;
}

export function camelToScreamingSnake(value: string): string {
    return value
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
        .toUpperCase();
}

export function camelToKebab(value: string): string {
    return value
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
        .toLowerCase();
}

export function buildEnvNameMap(leaves: LeafDescriptor[], prefix?: string): EnvNameEntry[] {
    const entries: EnvNameEntry[] = [];
    const seen = new Map<string, string[][]>();
    for (const leaf of leaves) {
        const override = readStringMeta(leaf.meta, "env");
        const envName = override ?? `${prefix ?? ""}${leaf.path.map(camelToScreamingSnake).join("_")}`;
        entries.push({ path: leaf.path, envName });
        recordCollision(seen, envName, leaf.path);
    }
    throwOnCollision(seen, "env");
    return entries;
}

export function buildCliNameMap(leaves: LeafDescriptor[]): CliNameEntry[] {
    const entries: CliNameEntry[] = [];
    const seen = new Map<string, string[][]>();
    for (const leaf of leaves) {
        const override = readStringMeta(leaf.meta, "cli");
        const cliName = override ?? leaf.path.map(camelToKebab).join("-");
        entries.push({ path: leaf.path, cliName });
        recordCollision(seen, cliName, leaf.path);
    }
    throwOnCollision(seen, "cli");
    return entries;
}

function readStringMeta(meta: Record<string, unknown> | undefined, key: string): string | undefined {
    if (meta === undefined) {
        return undefined;
    }
    const value = meta[key];
    return typeof value === "string" ? value : undefined;
}

function recordCollision(seen: Map<string, string[][]>, name: string, path: string[]): void {
    const existing = seen.get(name);
    if (existing === undefined) {
        seen.set(name, [path]);
        return;
    }
    existing.push(path);
}

function throwOnCollision(seen: Map<string, string[][]>, kind: "env" | "cli"): void {
    for (const [name, paths] of seen) {
        if (paths.length < 2) {
            continue;
        }
        const formatted = paths.map((p) => p.join(".")).join(", ");
        throw new Error(`ambiguous ${kind} mapping: ${name} ← ${formatted}`);
    }
}
