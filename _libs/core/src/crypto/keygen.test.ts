import { describe, expect, it } from "vitest";
import { base64urlDecode } from "./format.js";
import { generateKeypair } from "./keygen.js";

describe("generateKeypair", () => {
    it("produces a base64url public/private key pair with ML-KEM-512 sizes", () => {
        const { publicKey, privateKey } = generateKeypair();
        expect(base64urlDecode(publicKey).length).toBe(800);
        expect(base64urlDecode(privateKey).length).toBe(1632);
    });

    it("produces a different keypair on each call", () => {
        const a = generateKeypair();
        const b = generateKeypair();
        expect(a.publicKey).not.toBe(b.publicKey);
        expect(a.privateKey).not.toBe(b.privateKey);
    });
});
