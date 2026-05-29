import { h } from "../dom.js";
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

    const summary =
        missing === 0 && invalid === 0
            ? `All required variables present across ${services} service${services === 1 ? "" : "s"}.`
            : `${missing} missing, ${invalid} invalid across ${services} service${services === 1 ? "" : "s"}.`;

    const tone = missing > 0 || invalid > 0 ? "error" : "ok";
    const actions = h("div", { class: "banner-actions" }, [
        h("button", { class: "btn", "data-action": "save-all", title: "Save all changed .env files" }, [
            `Save all${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`,
        ]),
    ]);

    return h("header", { class: "banner" }, [h("div", { class: `summary summary-${tone}`, text: summary }), actions]);
}
