// Minimal element helper. Text content is always set via textContent (never innerHTML) so user
// data from .env files can never inject markup under the webview CSP.
type Attrs = Record<string, string | undefined>;
type Child = Node | string | undefined;

export function h(tag: string, attrs: Attrs = {}, children: Child[] = []): HTMLElement {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined) {
            continue;
        }
        if (key === "class") {
            node.className = value;
        } else if (key === "text") {
            node.textContent = value;
        } else {
            node.setAttribute(key, value);
        }
    }
    for (const child of children) {
        if (child !== undefined) {
            node.append(child);
        }
    }
    return node;
}

export function clear(node: HTMLElement): void {
    while (node.firstChild !== null) {
        node.firstChild.remove();
    }
}
