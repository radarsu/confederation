import { h } from "../dom.js";
import { icon } from "../icons.js";
import type { AppState } from "../state.js";

export function renderBanner(state: AppState): HTMLElement {
    const landscape = state.landscape;
    if (landscape === undefined) {
        return h("header", { class: "banner" });
    }
    const files = Object.values(landscape.files);
    const missing = files.reduce((sum, file) => sum + file.missingRequired, 0);
    const invalid = files.reduce((sum, file) => sum + file.invalid, 0);
    const dirtyCount = files.filter((file) => file.dirty).length;
    const services = new Set(landscape.matrix.map((section) => section.service)).size;

    const ok = missing === 0 && invalid === 0;
    const title = ok ? "All required variables present" : `${missing} missing required variable${missing === 1 ? "" : "s"}`;
    const detail = `${invalid} invalid across ${services} service${services === 1 ? "" : "s"}.`;

    const message = h("div", { class: "banner-message" }, [
        h("span", { class: "banner-title", text: title }),
        h("span", { class: "banner-detail", text: detail }),
    ]);
    const actions = h("div", { class: "banner-actions" }, [
        h("button", { class: "btn", "data-action": "save-all", title: "Save all changed .env files" }, [
            `Save all${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`,
        ]),
    ]);
    return h("header", { class: `banner banner-${ok ? "ok" : "error"}` }, [
        h("span", { class: "banner-icon" }, [icon(ok ? "check" : "alert")]),
        message,
        actions,
    ]);
}
