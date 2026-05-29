use ml_kem::{EncodedSizeUser, KemCore, MlKem512};
use rand_core::OsRng;

use super::format::base64url_encode;

pub struct Keypair {
    pub public_key: String,
    pub private_key: String,
}

/// Generate a fresh ML-KEM-512 keypair, base64url-encoded (public key 800 B, secret key 1632 B).
pub fn generate_keypair() -> Keypair {
    let (dk, ek) = MlKem512::generate(&mut OsRng);
    Keypair {
        public_key: base64url_encode(ek.as_bytes().as_slice()),
        private_key: base64url_encode(dk.as_bytes().as_slice()),
    }
}
