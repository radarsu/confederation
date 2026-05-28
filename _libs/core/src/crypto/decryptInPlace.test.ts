import { describe, expect, it } from "vitest";
import { z } from "zod";
import { decryptSecretsInPlace } from "./decryptInPlace.js";
import { encrypt } from "./encrypt.js";
import { base64urlDecode } from "./format.js";
import { generateKeypair } from "./keygen.js";

describe("decryptSecretsInPlace", () => {
    it("decrypts encrypted values at leaves marked secret", () => {
        const { publicKey, privateKey } = generateKeypair();
        const schema = z.object({ password: z.string().meta({ secret: true }) });
        const record: Record<string, unknown> = { password: encrypt("real-password", publicKey) };
        decryptSecretsInPlace(record, schema, () => base64urlDecode(privateKey));
        expect(record["password"]).toBe("real-password");
    });

    it("leaves plaintext values at secret leaves untouched (pass-through)", () => {
        const { privateKey } = generateKeypair();
        const schema = z.object({ password: z.string().meta({ secret: true }) });
        const record: Record<string, unknown> = { password: "plain-value" };
        decryptSecretsInPlace(record, schema, () => base64urlDecode(privateKey));
        expect(record["password"]).toBe("plain-value");
    });

    it("does not touch non-secret leaves", () => {
        const { publicKey, privateKey } = generateKeypair();
        const schema = z.object({
            password: z.string().meta({ secret: true }),
            host: z.string(),
        });
        const record: Record<string, unknown> = {
            password: encrypt("real-password", publicKey),
            host: "encrypted:something-that-looks-like-but-is-not",
        };
        decryptSecretsInPlace(record, schema, () => base64urlDecode(privateKey));
        expect(record["password"]).toBe("real-password");
        expect(record["host"]).toBe("encrypted:something-that-looks-like-but-is-not");
    });

    it("decrypts nested secrets", () => {
        const { publicKey, privateKey } = generateKeypair();
        const schema = z.object({
            database: z.object({ url: z.string().meta({ secret: true }) }),
        });
        const record: Record<string, unknown> = {
            database: { url: encrypt("postgres://hidden", publicKey) },
        };
        decryptSecretsInPlace(record, schema, () => base64urlDecode(privateKey));
        expect((record["database"] as Record<string, unknown>)["url"]).toBe("postgres://hidden");
    });

    it("resolves the key lazily — never called when no ciphertext is present", () => {
        const schema = z.object({ password: z.string().meta({ secret: true }) });
        const record: Record<string, unknown> = { password: "plain" };
        let resolveCalls = 0;
        decryptSecretsInPlace(record, schema, () => {
            resolveCalls++;
            throw new Error("should not be called");
        });
        expect(resolveCalls).toBe(0);
    });

    it("throws when a ciphertext is present but the resolver fails", () => {
        const { publicKey } = generateKeypair();
        const schema = z.object({ password: z.string().meta({ secret: true }) });
        const record: Record<string, unknown> = { password: encrypt("v", publicKey) };
        expect(() =>
            decryptSecretsInPlace(record, schema, () => {
                throw new Error("no key");
            }),
        ).toThrow(/Cannot decrypt secret at path "password"/);
    });
});
