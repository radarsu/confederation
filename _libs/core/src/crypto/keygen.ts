import { ml_kem512 } from "@noble/post-quantum/ml-kem.js";
import { base64urlEncode } from "./format.js";

export interface Keypair {
    publicKey: string;
    privateKey: string;
}

export function generateKeypair(): Keypair {
    const { publicKey, secretKey } = ml_kem512.keygen();
    return {
        publicKey: base64urlEncode(publicKey),
        privateKey: base64urlEncode(secretKey),
    };
}
