use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use ml_kem::kem::Decapsulate;
use ml_kem::{Ciphertext, Encoded, EncodedSizeUser, MlKem512};

use super::format::decode_envelope;
use super::Dk;

/// Decrypt an `encrypted:v1:...` envelope with `private_key` (raw 1632-byte ML-KEM-512
/// decapsulation key bytes). Returns an error on a wrong key or tampered ciphertext (GCM tag).
pub fn decrypt(envelope: &str, private_key: &[u8]) -> Result<String, String> {
    let env = decode_envelope(envelope)?;
    let encoded = Encoded::<Dk>::try_from(private_key).map_err(|_| "invalid private key length".to_string())?;
    let dk = Dk::from_bytes(&encoded);

    let kem_ct = Ciphertext::<MlKem512>::try_from(env.kem_ct.as_slice()).map_err(|_| "invalid KEM ciphertext length".to_string())?;
    let shared = dk.decapsulate(&kem_ct).map_err(|_| "ML-KEM decapsulation failed".to_string())?;

    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(shared.as_slice()));
    let mut ct_and_tag = env.ct;
    ct_and_tag.extend_from_slice(&env.tag);
    let plaintext = cipher
        .decrypt(Nonce::from_slice(&env.nonce), ct_and_tag.as_slice())
        .map_err(|_| "decryption failed: wrong key or tampered data".to_string())?;
    String::from_utf8(plaintext).map_err(|_| "decrypted value is not valid UTF-8".to_string())
}
