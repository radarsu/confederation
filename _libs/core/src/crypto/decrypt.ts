import { ml_kem512 } from "@noble/post-quantum/ml-kem.js";
import { createDecipheriv } from "node:crypto";
import { base64urlDecode, decodeEnvelope } from "./format.js";

export function decrypt(envelope: string, privateKey: string | Uint8Array): string {
    const sk = typeof privateKey === "string" ? base64urlDecode(privateKey) : privateKey;
    const { kemCt, nonce, tag, ct } = decodeEnvelope(envelope);
    const sharedSecret = ml_kem512.decapsulate(kemCt, sk);
    const decipher = createDecipheriv("aes-256-gcm", sharedSecret, nonce);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plaintext.toString("utf8");
}
