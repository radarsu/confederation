import type { WebviewToHost } from "../shared/protocol.js";

interface VsCodeApi {
    postMessage(message: WebviewToHost): void;
    getState<T>(): T | undefined;
    setState<T>(state: T): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

export const vscode = acquireVsCodeApi();

export function send(message: WebviewToHost): void {
    vscode.postMessage(message);
}
