import type { Landscape } from "../shared/protocol.js";

export type ViewMode = "grid" | "matrix";

export interface AppState {
    landscape: Landscape | undefined;
    selectedFileId: string | undefined;
    mode: ViewMode;
    filter: string;
    revealed: Map<string, string>;
    error: string | undefined;
}

export interface PersistedState {
    selectedFileId: string | undefined;
    mode: ViewMode;
    filter: string;
}

export function revealKey(fileId: string, envName: string): string {
    return `${fileId}::${envName}`;
}
