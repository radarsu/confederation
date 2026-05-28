export const ENVELOPE_PREFIX = "encrypted:v1:";

export const KEM_CT_LEN = 768;
export const NONCE_LEN = 12;
export const GCM_TAG_LEN = 16;
const HEADER_LEN = KEM_CT_LEN + NONCE_LEN + GCM_TAG_LEN;

export interface Envelope {
    kemCt: Uint8Array;
    nonce: Uint8Array;
    tag: Uint8Array;
    ct: Uint8Array;
}

export function encodeEnvelope(kemCt: Uint8Array, nonce: Uint8Array, tag: Uint8Array, ct: Uint8Array): string {
    if (kemCt.length !== KEM_CT_LEN) {
        throw new Error(`encodeEnvelope: kemCt must be ${KEM_CT_LEN} bytes, got ${kemCt.length}`);
    }
    if (nonce.length !== NONCE_LEN) {
        throw new Error(`encodeEnvelope: nonce must be ${NONCE_LEN} bytes, got ${nonce.length}`);
    }
    if (tag.length !== GCM_TAG_LEN) {
        throw new Error(`encodeEnvelope: tag must be ${GCM_TAG_LEN} bytes, got ${tag.length}`);
    }
    const body = new Uint8Array(HEADER_LEN + ct.length);
    body.set(kemCt, 0);
    body.set(nonce, KEM_CT_LEN);
    body.set(tag, KEM_CT_LEN + NONCE_LEN);
    body.set(ct, HEADER_LEN);
    return ENVELOPE_PREFIX + base64urlEncode(body);
}

export function decodeEnvelope(value: string): Envelope {
    if (!value.startsWith(ENVELOPE_PREFIX)) {
        throw new Error(`decodeEnvelope: expected prefix "${ENVELOPE_PREFIX}"`);
    }
    const body = base64urlDecode(value.slice(ENVELOPE_PREFIX.length));
    if (body.length < HEADER_LEN) {
        throw new Error(`decodeEnvelope: payload too short (${body.length} < ${HEADER_LEN})`);
    }
    return {
        kemCt: body.subarray(0, KEM_CT_LEN),
        nonce: body.subarray(KEM_CT_LEN, KEM_CT_LEN + NONCE_LEN),
        tag: body.subarray(KEM_CT_LEN + NONCE_LEN, HEADER_LEN),
        ct: body.subarray(HEADER_LEN),
    };
}

export function isEnvelope(value: unknown): value is string {
    return typeof value === "string" && value.startsWith("encrypted:");
}

export function base64urlEncode(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString("base64url");
}

export function base64urlDecode(text: string): Uint8Array {
    return new Uint8Array(Buffer.from(text, "base64url"));
}
