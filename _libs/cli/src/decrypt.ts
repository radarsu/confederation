import { decrypt as decryptEnvelope, resolvePrivateKey } from "@confederation/core/index.js";

export function decrypt(envelope: string): string {
    return decryptEnvelope(envelope, resolvePrivateKey());
}
