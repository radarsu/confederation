import { ml_kem512 } from "@noble/post-quantum/ml-kem.js";
import { createCipheriv, randomBytes } from "node:crypto";
import { base64urlDecode, encodeEnvelope } from "./format.js";

export function encrypt(plaintext: string, publicKey: string | Uint8Array): string {
    const pk = typeof publicKey === "string" ? base64urlDecode(publicKey) : publicKey;
    const { cipherText: kemCt, sharedSecret } = ml_kem512.encapsulate(pk);
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", sharedSecret, nonce);
    const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return encodeEnvelope(kemCt, nonce, tag, ct);
}
