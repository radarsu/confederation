import { describe, expect, it } from "vitest";
import type * as vscode from "vscode";
import { EditHistory } from "./editHistory.js";

// EditHistory only reads `.uri` opaquely, so a bare stand-in suffices.
const uri = {} as vscode.Uri;

// `current` is where the document text already sits; record() does no I/O, so tests can record
// snapshots that match that state directly.
function makeHistory(current: string): { history: EditHistory; text: () => string } {
    const store = { value: current };
    const history = new EditHistory(
        () => Promise.resolve(store.value),
        (_uri, text) => {
            store.value = text;
            return Promise.resolve();
        },
    );
    return { history, text: () => store.value };
}

describe("EditHistory", () => {
    it("undoes and redoes recorded edits in order", async () => {
        const { history, text } = makeHistory("c");
        history.record({ uri, before: "a", after: "b" });
        history.record({ uri, before: "b", after: "c" });

        await history.undo();
        expect(text()).toBe("b");
        await history.undo();
        expect(text()).toBe("a");
        await history.redo();
        expect(text()).toBe("b");
        await history.redo();
        expect(text()).toBe("c");
    });

    it("clears the stacks when the document changed out from under it", async () => {
        const { history, text } = makeHistory("unexpected");
        history.record({ uri, before: "a", after: "b" });

        await history.undo(); // current "unexpected" !== expected "b" → bail without writing
        expect(text()).toBe("unexpected");
        await history.redo(); // stacks were dropped → no-op
        expect(text()).toBe("unexpected");
    });

    it("is a no-op on empty stacks", async () => {
        const { history, text } = makeHistory("a");
        await history.undo();
        await history.redo();
        expect(text()).toBe("a");
    });
});
