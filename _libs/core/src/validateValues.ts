import { z } from "zod";
import { buildEnvNameMap } from "./deriveName.js";
import { enumerateLeafPaths } from "./enumerateLeafPaths.js";
import { setPath } from "./setPath.js";
import { isRequired } from "./wrappers.js";

export interface LeafValidation {
    envName: string;
    path: string[];
    ok: boolean;
    message?: string;
}

export interface ValidationReport {
    leaves: LeafValidation[];
    formError?: string;
}

export function validateValues(schema: z.ZodType, rawValues: Record<string, string>): ValidationReport {
    const leaves = enumerateLeafPaths(schema);
    const envByKey = new Map(buildEnvNameMap(leaves).map((entry) => [entry.path.join(" "), entry.envName]));

    const results: LeafValidation[] = [];
    const erroredPaths = new Set<string>();
    const assembled: Record<string, unknown> = {};

    for (const leaf of leaves) {
        const pathKey = leaf.path.join(" ");
        const envName = envByKey.get(pathKey) ?? "";
        const raw = rawValues[envName];

        if (raw === undefined || raw === "") {
            if (isRequired(leaf.outer)) {
                results.push({ envName, path: leaf.path, ok: false, message: "Required value is missing" });
                erroredPaths.add(pathKey);
            } else {
                results.push({ envName, path: leaf.path, ok: true });
            }
            continue;
        }

        const parsed = leaf.schema.safeParse(raw);
        if (parsed.success) {
            results.push({ envName, path: leaf.path, ok: true });
            setPath(assembled, leaf.path, parsed.data);
            continue;
        }
        results.push({ envName, path: leaf.path, ok: false, message: firstMessage(parsed.error) });
        erroredPaths.add(pathKey);
        setPath(assembled, leaf.path, raw);
    }

    const full = schema.safeParse(assembled);
    if (full.success) {
        return { leaves: results };
    }
    const extra = full.error.issues.filter((issue) => !erroredPaths.has(issue.path.join(" ")));
    if (extra.length === 0) {
        return { leaves: results };
    }
    return { leaves: results, formError: extra.map((issue) => issue.message).join("; ") };
}

function firstMessage(error: z.ZodError): string {
    return error.issues[0]?.message ?? "Invalid value";
}
