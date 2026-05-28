import { describe, expect, it } from "vitest";
import { decrypt } from "./decrypt.js";
import { encrypt } from "./encrypt.js";
import { base64urlDecode, base64urlEncode, decodeEnvelope, encodeEnvelope } from "./format.js";
import { generateKeypair } from "./keygen.js";

describe("encrypt + decrypt", () => {
    it("round-trips a plaintext through the v1 envelope", () => {
        const { publicKey, privateKey } = generateKeypair();
        const plaintext = "postgres://user:pass@localhost:5432/db";
        const envelope = encrypt(plaintext, publicKey);
        expect(envelope.startsWith("encrypted:v1:")).toBe(true);
        expect(decrypt(envelope, privateKey)).toBe(plaintext);
    });

    it("accepts raw Uint8Array keys as well as base64url strings", () => {
        const { publicKey, privateKey } = generateKeypair();
        const envelope = encrypt("hello", base64urlDecode(publicKey));
        expect(decrypt(envelope, base64urlDecode(privateKey))).toBe("hello");
    });

    it("produces different ciphertexts for the same plaintext (fresh KEM randomness)", () => {
        const { publicKey } = generateKeypair();
        const a = encrypt("same", publicKey);
        const b = encrypt("same", publicKey);
        expect(a).not.toBe(b);
    });

    it("throws on a tampered ciphertext (GCM auth tag check)", () => {
        const { publicKey, privateKey } = generateKeypair();
        const envelope = encrypt("secret-value", publicKey);
        const parts = decodeEnvelope(envelope);
        const tamperedCt = new Uint8Array(parts.ct);
        tamperedCt[0] = (tamperedCt[0] ?? 0) ^ 0xff;
        const tampered = encodeEnvelope(parts.kemCt, parts.nonce, parts.tag, tamperedCt);
        expect(() => decrypt(tampered, privateKey)).toThrow();
    });

    it("decrypting with the wrong key yields garbled shared secret and fails GCM auth", () => {
        const { publicKey } = generateKeypair();
        const { privateKey: otherSk } = generateKeypair();
        const envelope = encrypt("hi", publicKey);
        expect(() => decrypt(envelope, otherSk)).toThrow();
    });

    it("round-trips UTF-8 content", () => {
        const { publicKey, privateKey } = generateKeypair();
        const plaintext = "hełło 世界 🚀";
        expect(decrypt(encrypt(plaintext, publicKey), privateKey)).toBe(plaintext);
    });

    it("base64url helpers round-trip", () => {
        const bytes = new Uint8Array([0, 1, 2, 254, 255]);
        expect(base64urlDecode(base64urlEncode(bytes))).toEqual(bytes);
    });
});
