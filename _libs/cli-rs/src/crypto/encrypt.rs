use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use ml_kem::kem::Encapsulate;
use ml_kem::{Encoded, EncodedSizeUser};
use rand_core::{OsRng, RngCore};

use super::format::{encode_envelope, GCM_TAG_LEN, NONCE_LEN};
use super::Ek;

/// Encrypt `plaintext` to `public_key` (raw 800-byte ML-KEM-512 encapsulation key bytes),
/// producing an `encrypted:v1:...` envelope.
pub fn encrypt(plaintext: &str, public_key: &[u8]) -> Result<String, String> {
    let encoded = Encoded::<Ek>::try_from(public_key).map_err(|_| "invalid public key length".to_string())?;
    let ek = Ek::from_bytes(&encoded);
    let (kem_ct, shared) = ek.encapsulate(&mut OsRng).map_err(|_| "ML-KEM encapsulation failed".to_string())?;

    let mut nonce = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce);

    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(shared.as_slice()));
    let mut ct_and_tag = cipher
        .encrypt(Nonce::from_slice(&nonce), plaintext.as_bytes())
        .map_err(|_| "AES-256-GCM encryption failed".to_string())?;
    // The aead crate appends the 16-byte tag after the ciphertext; the envelope orders tag before ct.
    let tag = ct_and_tag.split_off(ct_and_tag.len() - GCM_TAG_LEN);
    Ok(encode_envelope(kem_ct.as_slice(), &nonce, &tag, &ct_and_tag))
}
