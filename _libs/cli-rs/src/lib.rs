pub mod crypto;
pub mod env_text;
pub mod expand_env;
pub mod resolve_key;

#[cfg(test)]
mod crypto_roundtrip {
    use crate::crypto::{decrypt::decrypt, encrypt::encrypt, format::base64url_decode, keygen::generate_keypair};

    #[test]
    fn encrypt_then_decrypt_round_trips_unicode() {
        let kp = generate_keypair();
        let pk = base64url_decode(&kp.public_key).unwrap();
        let sk = base64url_decode(&kp.private_key).unwrap();
        assert_eq!(pk.len(), 800);
        assert_eq!(sk.len(), 1632);

        for plaintext in ["", "hello", "hełło 世界 🚀", &"x".repeat(5000)] {
            let envelope = encrypt(plaintext, &pk).unwrap();
            assert!(envelope.starts_with("encrypted:v1:"));
            assert_eq!(decrypt(&envelope, &sk).unwrap(), plaintext);
        }
    }

    #[test]
    fn wrong_key_or_tampered_envelope_fails() {
        let kp = generate_keypair();
        let pk = base64url_decode(&kp.public_key).unwrap();
        let other = generate_keypair();
        let other_sk = base64url_decode(&other.private_key).unwrap();
        let envelope = encrypt("secret", &pk).unwrap();
        assert!(decrypt(&envelope, &other_sk).is_err());
        assert!(decrypt(&format!("{envelope}AAAA"), &base64url_decode(&kp.private_key).unwrap()).is_err());
    }
}
