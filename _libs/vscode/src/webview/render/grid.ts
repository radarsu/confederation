import type { FileView, VarRow, VarStatus } from "../../shared/protocol.js";
import { h } from "../dom.js";
import { type AppState, revealKey } from "../state.js";
import { STATUS_ICON, STATUS_LABEL } from "./status.js";

const ERROR_STATUSES = new Set<VarStatus>(["missing-required", "invalid", "secret-plaintext"]);

export function renderGrid(state: AppState, file: FileView): HTMLElement {
    const container = h("div", { class: "grid" });
    container.append(renderGridHeader(file));

    if (!file.hasSchema) {
        const note =
            file.configError !== undefined
                ? `Config failed to load: ${file.configError}`
                : "No confederation.config governs this directory — editing as plain key/value.";
        container.append(h("div", { class: `notice ${file.configError !== undefined ? "notice-error" : "notice-info"}`, text: note }));
    }

    const rows = file.rows.filter((row) => matchesFilter(row, state.filter));
    if (rows.length === 0) {
        container.append(h("div", { class: "empty", text: "No variables match the filter." }));
        return container;
    }

    let currentGroup: string | undefined;
    for (const row of rows) {
        if (row.group !== currentGroup) {
            currentGroup = row.group;
            container.append(h("div", { class: "group-header", text: currentGroup === "" ? "(top level)" : currentGroup }));
        }
        container.append(renderRow(state, file.fileId, row));
    }
    return container;
}

function renderGridHeader(file: FileView): HTMLElement {
    const actions = h("div", { class: "grid-actions" }, [
        h("button", { class: "btn", "data-action": "add-all", "data-file": file.fileId, title: "Add every missing/defaulted key to this file" }, [
            "Add all missing",
        ]),
        file.dirty ? h("button", { class: "btn", "data-action": "save", "data-file": file.fileId }, ["Save"]) : undefined,
        h("button", { class: "btn btn-ghost", "data-action": "open-text", "data-file": file.fileId, title: "Open as plain text" }, ["Plain text"]),
    ]);
    return h("div", { class: "grid-header" }, [h("div", { class: "grid-title", text: file.fileId }), actions]);
}

function renderRow(state: AppState, fileId: string, row: VarRow): HTMLElement {
    const name = h("div", { class: "cell-name", title: row.envName }, [
        h("span", { class: "var-display", text: row.displayName }, [
            row.required ? h("span", { class: "required", title: "required", text: " *" }) : undefined,
        ]),
        row.typeLabel === "" ? undefined : h("span", { class: "var-type", text: row.typeLabel }),
    ]);

    const value = h("div", { class: "cell-value" }, [
        renderControl(state, fileId, row),
        row.message === undefined
            ? undefined
            : h("div", { class: `field-message${ERROR_STATUSES.has(row.status) ? " error" : ""}`, text: row.message }),
    ]);

    const status = h("div", { class: "cell-status" }, [
        h("span", { class: `chip chip-${row.status}`, title: row.message ?? STATUS_LABEL[row.status] }, [
            `${STATUS_ICON[row.status]} ${STATUS_LABEL[row.status]}`.trim(),
        ]),
    ]);

    return h("div", { class: `row row-${row.status}`, role: "row" }, [name, value, status, renderActions(state, fileId, row)]);
}

function renderControl(state: AppState, fileId: string, row: VarRow): HTMLElement {
    if (row.secret) {
        return renderSecretControl(state, fileId, row);
    }
    if (row.enumValues !== undefined) {
        return renderSelect(fileId, row, row.enumValues);
    }
    if (row.control === "boolean") {
        return renderSelect(fileId, row, ["true", "false"]);
    }
    return h("input", {
        class: "value-input",
        type: row.control,
        "data-action": "set",
        "data-file": fileId,
        "data-env": row.envName,
        value: row.rawValue ?? "",
        placeholder: row.defaultValue ?? "",
        spellcheck: "false",
        min: row.min !== undefined ? String(row.min) : undefined,
        max: row.max !== undefined ? String(row.max) : undefined,
        step: row.step !== undefined ? String(row.step) : undefined,
        minlength: row.minLength !== undefined ? String(row.minLength) : undefined,
        maxlength: row.maxLength !== undefined ? String(row.maxLength) : undefined,
    });
}

function renderSelect(fileId: string, row: VarRow, options: string[]): HTMLSelectElement {
    const select = h("select", { class: "value-input", "data-action": "set", "data-file": fileId, "data-env": row.envName }) as HTMLSelectElement;
    select.append(h("option", { value: "" }, [row.present ? "" : "(unset)"]));
    for (const option of options) {
        select.append(h("option", { value: option }, [option]));
    }
    select.value = row.rawValue ?? "";
    return select;
}

function renderSecretControl(state: AppState, fileId: string, row: VarRow): HTMLElement {
    const revealed = state.revealed.get(revealKey(fileId, row.envName));
    if (revealed !== undefined) {
        return h("input", {
            class: "value-input",
            type: "text",
            "data-action": "encrypt-set",
            "data-file": fileId,
            "data-env": row.envName,
            value: revealed,
            spellcheck: "false",
        });
    }
    const placeholder = row.isEncrypted ? "encrypted (type to replace)" : "enter secret value";
    return h("input", {
        class: "value-input",
        type: "password",
        "data-action": "encrypt-set",
        "data-file": fileId,
        "data-env": row.envName,
        placeholder,
        spellcheck: "false",
    });
}

function renderActions(state: AppState, fileId: string, row: VarRow): HTMLElement {
    const actions = h("div", { class: "cell-actions" });
    if (row.secret) {
        const isRevealed = state.revealed.get(revealKey(fileId, row.envName)) !== undefined;
        if (isRevealed) {
            actions.append(h("button", { class: "btn btn-ghost", "data-action": "hide", "data-file": fileId, "data-env": row.envName }, ["Hide"]));
        } else if (row.present) {
            actions.append(
                h(
                    "button",
                    {
                        class: "btn btn-ghost",
                        "data-action": "reveal",
                        "data-file": fileId,
                        "data-env": row.envName,
                        title: "Decrypt (needs a private key)",
                    },
                    ["Reveal"],
                ),
            );
        }
    }
    if (row.status === "using-default" && row.defaultValue !== undefined) {
        actions.append(
            h(
                "button",
                {
                    class: "btn btn-ghost",
                    "data-action": "use-default",
                    "data-file": fileId,
                    "data-env": row.envName,
                    "data-default": row.defaultValue,
                },
                ["Use default"],
            ),
        );
    }
    if (row.status === "unknown") {
        actions.append(h("button", { class: "btn btn-ghost", "data-action": "remove", "data-file": fileId, "data-env": row.envName }, ["Remove"]));
    }
    if (!row.secret && row.present && row.hasDefault) {
        actions.append(
            h(
                "button",
                {
                    class: "btn btn-ghost",
                    "data-action": "reset",
                    "data-file": fileId,
                    "data-env": row.envName,
                    title: "Remove override, fall back to schema default",
                },
                ["Reset"],
            ),
        );
    }
    if (row.status === "secret-plaintext" && row.rawValue !== undefined) {
        actions.append(
            h(
                "button",
                { class: "btn", "data-action": "encrypt-existing", "data-file": fileId, "data-env": row.envName, "data-plaintext": row.rawValue },
                ["Encrypt"],
            ),
        );
    }
    return actions;
}

function matchesFilter(row: VarRow, filter: string): boolean {
    if (filter === "") {
        return true;
    }
    const needle = filter.toLowerCase();
    return row.envName.toLowerCase().includes(needle) || row.displayName.toLowerCase().includes(needle);
}
