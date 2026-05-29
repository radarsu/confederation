import * as vscode from "vscode";

export function toUri(folder: vscode.WorkspaceFolder, relativeId: string): vscode.Uri {
    return vscode.Uri.joinPath(folder.uri, ...relativeId.split("/"));
}

export function relativeId(folder: vscode.WorkspaceFolder, uri: vscode.Uri): string {
    return uri.path.slice(folder.uri.path.length).replace(/^\/+/, "");
}

export function isEnvUri(uri: vscode.Uri): boolean {
    return /(^|\/)\.env(\.[^/]+)?$/.test(uri.path);
}

export function openDocumentFor(uri: vscode.Uri): vscode.TextDocument | undefined {
    return vscode.workspace.textDocuments.find((document) => document.uri.toString() === uri.toString());
}

export async function readText(uri: vscode.Uri): Promise<{ text: string; dirty: boolean }> {
    const open = openDocumentFor(uri);
    if (open !== undefined) {
        return { text: open.getText(), dirty: open.isDirty };
    }
    const bytes = await vscode.workspace.fs.readFile(uri);
    return { text: Buffer.from(bytes).toString("utf8"), dirty: false };
}
