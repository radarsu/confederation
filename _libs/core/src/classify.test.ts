import { describe, expect, it } from "vitest";
import { classify } from "./classify.js";
import type { LeafDescriptorPublic } from "./inspectSchema.js";

function descriptor(overrides: Partial<LeafDescriptorPublic>): LeafDescriptorPublic {
    return {
        path: ["x"],
        envName: "X",
        cliName: "--x",
        type: "string",
        coerce: false,
        required: true,
        optional: false,
        nullable: false,
        hasDefault: false,
        secret: false,
        constraints: [],
        ...overrides,
    };
}

const absent = { present: false, isEncrypted: false, validationOk: undefined, validationMessage: undefined };
const present = { present: true, isEncrypted: false, validationOk: true, validationMessage: undefined };

describe("classify", () => {
    it("unknown when the key has no descriptor", () => {
        expect(classify({ descriptor: undefined, ...present }).status).toBe("unknown");
    });

    it("missing-required when a required value is absent", () => {
        expect(classify({ descriptor: descriptor({ required: true }), ...absent }).status).toBe("missing-required");
    });

    it("using-default when an optional/defaulted value is absent", () => {
        const result = classify({ descriptor: descriptor({ required: false, hasDefault: true, default: "0.0.0.0" }), ...absent });
        expect(result.status).toBe("using-default");
        expect(result.message).toContain("0.0.0.0");
    });

    it("ok when present and valid", () => {
        expect(classify({ descriptor: descriptor({}), ...present }).status).toBe("ok");
    });

    it("invalid with a coercion hint for a non-coerced number", () => {
        const result = classify({
            descriptor: descriptor({ type: "number", coerce: false }),
            present: true,
            isEncrypted: false,
            validationOk: false,
            validationMessage: "Invalid input",
        });
        expect(result.status).toBe("invalid");
        expect(result.message).toContain("z.coerce.number()");
    });

    it("secret-encrypted when a secret holds an envelope", () => {
        expect(
            classify({
                descriptor: descriptor({ secret: true }),
                present: true,
                isEncrypted: true,
                validationOk: undefined,
                validationMessage: undefined,
            }).status,
        ).toBe("secret-encrypted");
    });

    it("secret-plaintext when a secret holds a plaintext value", () => {
        expect(
            classify({
                descriptor: descriptor({ secret: true }),
                present: true,
                isEncrypted: false,
                validationOk: undefined,
                validationMessage: undefined,
            }).status,
        ).toBe("secret-plaintext");
    });

    it("missing-required for a required secret that is absent", () => {
        expect(classify({ descriptor: descriptor({ secret: true, required: true }), ...absent }).status).toBe("missing-required");
    });
});
