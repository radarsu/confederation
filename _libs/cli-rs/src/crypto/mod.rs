//! Post-quantum secret encryption — ML-KEM-512 (FIPS 203) + AES-256-GCM, byte-compatible with
//! `@puristic/env` (`@noble/post-quantum` `ml_kem512`). The 32-byte ML-KEM shared secret is used
//! directly as the AES-256 key (no KDF), so envelopes interoperate across the two implementations.

pub mod decrypt;
pub mod encrypt;
pub mod format;
pub mod keygen;

use ml_kem::{KemCore, MlKem512};

pub(crate) type Ek = <MlKem512 as KemCore>::EncapsulationKey;
pub(crate) type Dk = <MlKem512 as KemCore>::DecapsulationKey;
