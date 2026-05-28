export function setPath(target: Record<string, unknown>, path: string[], value: unknown): void {
    if (path.length === 0) {
        return;
    }
    let cursor = target;
    for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i];
        if (segment === undefined || segment === "") {
            return;
        }
        const existing = cursor[segment];
        if (existing === undefined || !isPlainObject(existing)) {
            const next: Record<string, unknown> = {};
            cursor[segment] = next;
            cursor = next;
            continue;
        }
        cursor = existing;
    }
    const leaf = path[path.length - 1];
    if (leaf === undefined || leaf === "") {
        return;
    }
    cursor[leaf] = value;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== "object") {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
