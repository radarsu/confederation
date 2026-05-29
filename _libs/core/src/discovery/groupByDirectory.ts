import { dirOf } from "./paths.js";

export function groupByDirectory(fileIds: string[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const fileId of fileIds) {
        const dir = dirOf(fileId);
        const existing = groups.get(dir);
        if (existing === undefined) {
            groups.set(dir, [fileId]);
            continue;
        }
        existing.push(fileId);
    }
    return groups;
}
