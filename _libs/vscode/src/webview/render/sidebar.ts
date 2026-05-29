import type { DirView } from "../../shared/protocol.js";
import { h } from "../dom.js";
import type { AppState } from "../state.js";
import { BADGE_ICON } from "./status.js";

export function renderSidebar(state: AppState): HTMLElement {
    const landscape = state.landscape;
    const sidebar = h("nav", { class: "sidebar", "aria-label": "Environment files" });
    if (landscape === undefined) {
        return sidebar;
    }
    if (landscape.dirs.length === 0) {
        sidebar.append(h("div", { class: "sidebar-empty", text: "No .env files found." }));
        return sidebar;
    }
    for (const dir of landscape.dirs) {
        sidebar.append(renderDir(state, dir));
    }
    return sidebar;
}

function renderDir(state: AppState, dir: DirView): HTMLElement {
    const header = h("div", { class: `dir-header badge-${dir.badge}` }, [
        h("span", { class: `badge badge-${dir.badge}`, text: BADGE_ICON[dir.badge], title: dir.badge }),
        h("span", { class: "dir-label", text: dir.label, title: dir.dirId }),
    ]);
    const files = dir.fileIds.map((fileId) => renderFile(state, fileId));
    return h("section", { class: "dir" }, [header, ...files]);
}

function renderFile(state: AppState, fileId: string): HTMLElement {
    const file = state.landscape?.files[fileId];
    if (file === undefined) {
        return h("div");
    }
    const selected = state.selectedFileId === fileId;
    return h("button", { class: `file-item badge-${file.badge}${selected ? " selected" : ""}`, "data-action": "select-file", "data-file": fileId }, [
        h("span", { class: `badge badge-${file.badge}`, text: BADGE_ICON[file.badge] }),
        h("span", { class: "file-name", text: file.fileName }),
        file.dirty ? h("span", { class: "dirty-dot", title: "Unsaved changes", text: "●" }) : undefined,
    ]);
}
