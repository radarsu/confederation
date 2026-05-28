import { isPlainObject } from "../setPath.js";

export function getPath(source: Record<string, unknown>, path: string[]): unknown {
    let cursor: unknown = source;
    for (const segment of path) {
        if (!isPlainObject(cursor)) {
            return undefined;
        }
        cursor = cursor[segment];
    }
    return cursor;
}
