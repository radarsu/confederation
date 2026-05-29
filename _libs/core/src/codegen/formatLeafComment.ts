import type { LeafDescriptorPublic } from "../inspectSchema.js";

// One-line human description of a leaf, shared by the .d.ts and .env.example generators.
// e.g. "number (int) — required", "string — optional — default: \"0.0.0.0\"", "string (url) — required — secret".
export function formatLeafComment(descriptor: LeafDescriptorPublic): string {
    const parts = [typeLabel(descriptor), descriptor.required ? "required" : "optional"];
    if (descriptor.hasDefault && descriptor.default !== undefined) {
        parts.push(`default: ${JSON.stringify(descriptor.default)}`);
    }
    if (descriptor.secret) {
        parts.push("secret");
    }
    return parts.join(" — ");
}

function typeLabel(descriptor: LeafDescriptorPublic): string {
    if (descriptor.enumValues !== undefined) {
        return `enum (${descriptor.enumValues.join(" | ")})`;
    }
    if (descriptor.constraints.length === 0) {
        return descriptor.type;
    }
    return `${descriptor.type} (${descriptor.constraints.map((constraint) => constraint.label).join(", ")})`;
}
