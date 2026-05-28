import { describe, expect, it } from "vitest";
import { decodeEnvelope, encodeEnvelope, ENVELOPE_PREFIX, GCM_TAG_LEN, isEnvelope, KEM_CT_LEN, NONCE_LEN } from "./format.js";

function bytes(len: number, fill = 1): Uint8Array {
    return new Uint8Array(len).fill(fill);
}

describe("envelope codec", () => {
    it("round-trips bytes through encode/decode", () => {
        const kemCt = bytes(KEM_CT_LEN, 7);
        const nonce = bytes(NONCE_LEN, 8);
        const tag = bytes(GCM_TAG_LEN, 9);
        const ct = bytes(64, 10);
        const envelope = encodeEnvelope(kemCt, nonce, tag, ct);
        const decoded = decodeEnvelope(envelope);
        expect(Buffer.from(decoded.kemCt).equals(Buffer.from(kemCt))).toBe(true);
        expect(Buffer.from(decoded.nonce).equals(Buffer.from(nonce))).toBe(true);
        expect(Buffer.from(decoded.tag).equals(Buffer.from(tag))).toBe(true);
        expect(Buffer.from(decoded.ct).equals(Buffer.from(ct))).toBe(true);
    });

    it("produces strings starting with the v1 prefix", () => {
        const envelope = encodeEnvelope(bytes(KEM_CT_LEN), bytes(NONCE_LEN), bytes(GCM_TAG_LEN), bytes(8));
        expect(envelope.startsWith(ENVELOPE_PREFIX)).toBe(true);
    });

    it("rejects wrong-sized inputs at encode", () => {
        expect(() => encodeEnvelope(bytes(KEM_CT_LEN - 1), bytes(NONCE_LEN), bytes(GCM_TAG_LEN), bytes(0))).toThrow(/kemCt/);
        expect(() => encodeEnvelope(bytes(KEM_CT_LEN), bytes(NONCE_LEN - 1), bytes(GCM_TAG_LEN), bytes(0))).toThrow(/nonce/);
        expect(() => encodeEnvelope(bytes(KEM_CT_LEN), bytes(NONCE_LEN), bytes(GCM_TAG_LEN - 1), bytes(0))).toThrow(/tag/);
    });

    it("rejects strings without the v1 prefix", () => {
        expect(() => decodeEnvelope("encrypted:v2:AAAA")).toThrow(/prefix/);
        expect(() => decodeEnvelope("not-encrypted")).toThrow(/prefix/);
    });

    it("rejects payloads shorter than the fixed header", () => {
        expect(() => decodeEnvelope(`${ENVELOPE_PREFIX}AAAA`)).toThrow(/too short/);
    });

    it("isEnvelope recognizes the loose `encrypted:` prefix", () => {
        expect(isEnvelope("encrypted:v1:abc")).toBe(true);
        expect(isEnvelope("encrypted:something")).toBe(true);
        expect(isEnvelope("plain")).toBe(false);
        expect(isEnvelope(undefined)).toBe(false);
        expect(isEnvelope(123)).toBe(false);
    });
});
