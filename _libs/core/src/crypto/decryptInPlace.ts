import type { z } from "zod";
import { enumerateLeafPaths } from "../enumerateLeafPaths.js";
import { setPath } from "../setPath.js";
import { decrypt } from "./decrypt.js";
import { getPath } from "./getPath.js";

export function decryptSecretsInPlace(
    record: Record<string, unknown>,
    schema: z.ZodType,
    resolveKey: () => Uint8Array,
): void {
    const secretLeaves = enumerateLeafPaths(schema).filter((leaf) => leaf.meta?.["secret"] === true);
    let key: Uint8Array | undefined;
    for (const leaf of secretLeaves) {
        const value = getPath(record, leaf.path);
        if (typeof value !== "string" || !value.startsWith("encrypted:")) {
            continue;
        }
        if (key === undefined) {
            try {
                key = resolveKey();
            } catch (cause) {
                throw new Error(`Cannot decrypt secret at path "${leaf.path.join(".")}": ${(cause as Error).message}`);
            }
        }
        setPath(record, leaf.path, decrypt(value, key));
    }
}
