import type * as vscode from "vscode";

export interface Snapshot {
    uri: vscode.Uri;
    before: string;
    after: string;
}

// A per-session undo/redo stack for webview-driven edits. VSCode's native `undo` command is a
// no-op while the webview holds focus (microsoft/vscode#175297), so the webview forwards Ctrl+Z
// here and we revert by re-writing the document text — itself a WorkspaceEdit, so dirty/save stay
// native. `read`/`write` are injected (the document's current text and documentWrites.writeText).
export class EditHistory {
    private readonly undoStack: Snapshot[] = [];
    private readonly redoStack: Snapshot[] = [];

    constructor(
        private readonly read: (uri: vscode.Uri) => Promise<string>,
        private readonly write: (uri: vscode.Uri, text: string) => Promise<void>,
    ) {}

    record(snapshot: Snapshot): void {
        this.undoStack.push(snapshot);
        this.redoStack.length = 0;
    }

    async undo(): Promise<void> {
        const snapshot = this.undoStack.pop();
        if (snapshot === undefined) {
            return;
        }
        // The document moved out from under us (external edit) — our stacks are stale, drop them.
        if ((await this.read(snapshot.uri)) !== snapshot.after) {
            this.reset();
            return;
        }
        await this.write(snapshot.uri, snapshot.before);
        this.redoStack.push(snapshot);
    }

    async redo(): Promise<void> {
        const snapshot = this.redoStack.pop();
        if (snapshot === undefined) {
            return;
        }
        if ((await this.read(snapshot.uri)) !== snapshot.before) {
            this.reset();
            return;
        }
        await this.write(snapshot.uri, snapshot.after);
        this.undoStack.push(snapshot);
    }

    private reset(): void {
        this.undoStack.length = 0;
        this.redoStack.length = 0;
    }
}
