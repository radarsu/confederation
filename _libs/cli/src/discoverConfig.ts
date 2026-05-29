import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const CONFIG_NAMES = [
    "confederation.config.ts",
    "confederation.config.mts",
    "confederation.config.cts",
    "confederation.config.js",
    "confederation.config.mjs",
    "confederation.config.cjs",
];

// Walk up from startDir to the filesystem root, returning the nearest confederation.config.*.
export function findNearestConfig(startDir: string): string | undefined {
    let current = resolve(startDir);
    while (true) {
        for (const name of CONFIG_NAMES) {
            const candidate = join(current, name);
            if (existsSync(candidate)) {
                return candidate;
            }
        }
        const parent = dirname(current);
        if (parent === current) {
            return undefined;
        }
        current = parent;
    }
}
