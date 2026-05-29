// Operate on workspace-relative POSIX paths ("/"-separated), as produced by vscode.workspace.asRelativePath.

export function dirOf(fileId: string): string {
    const idx = fileId.lastIndexOf("/");
    return idx === -1 ? "" : fileId.slice(0, idx);
}

export function baseName(fileId: string): string {
    const idx = fileId.lastIndexOf("/");
    return idx === -1 ? fileId : fileId.slice(idx + 1);
}

export function isAncestorOrSame(ancestorDir: string, dir: string): boolean {
    if (ancestorDir === "") {
        return true;
    }
    return dir === ancestorDir || dir.startsWith(`${ancestorDir}/`);
}
