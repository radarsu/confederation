import { encrypt as encryptValue, resolvePublicKey } from "@confederation/core/index.js";

export function encrypt(plaintext: string, cwd: string = process.cwd()): string {
    return encryptValue(plaintext, resolvePublicKey(cwd));
}
