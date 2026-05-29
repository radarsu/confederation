//! Envelope wire format — byte-identical to `_libs/core/src/crypto/format.ts`.
//!
//! An encrypted value is the literal prefix `encrypted:v1:` followed by the base64url
//! (no padding) encoding of `[kemCt:768][nonce:12][tag:16][ct:N]`.

use base64::Engine;

pub const ENVELOPE_PREFIX: &str = "encrypted:v1:";
pub const KEM_CT_LEN: usize = 768;
pub const NONCE_LEN: usize = 12;
pub const GCM_TAG_LEN: usize = 16;
pub const HEADER_LEN: usize = KEM_CT_LEN + NONCE_LEN + GCM_TAG_LEN;

pub struct Envelope {
    pub kem_ct: Vec<u8>,
    pub nonce: Vec<u8>,
    pub tag: Vec<u8>,
    pub ct: Vec<u8>,
}

pub fn encode_envelope(kem_ct: &[u8], nonce: &[u8], tag: &[u8], ct: &[u8]) -> String {
    assert_eq!(kem_ct.len(), KEM_CT_LEN, "kemCt must be {KEM_CT_LEN} bytes");
    assert_eq!(nonce.len(), NONCE_LEN, "nonce must be {NONCE_LEN} bytes");
    assert_eq!(tag.len(), GCM_TAG_LEN, "tag must be {GCM_TAG_LEN} bytes");
    let mut body = Vec::with_capacity(HEADER_LEN + ct.len());
    body.extend_from_slice(kem_ct);
    body.extend_from_slice(nonce);
    body.extend_from_slice(tag);
    body.extend_from_slice(ct);
    format!("{ENVELOPE_PREFIX}{}", base64url_encode(&body))
}

pub fn decode_envelope(value: &str) -> Result<Envelope, String> {
    let Some(payload) = value.strip_prefix(ENVELOPE_PREFIX) else {
        return Err(format!("decodeEnvelope: expected prefix \"{ENVELOPE_PREFIX}\""));
    };
    let body = base64url_decode(payload)?;
    if body.len() < HEADER_LEN {
        return Err(format!("decodeEnvelope: payload too short ({} < {HEADER_LEN})", body.len()));
    }
    Ok(Envelope {
        kem_ct: body[0..KEM_CT_LEN].to_vec(),
        nonce: body[KEM_CT_LEN..KEM_CT_LEN + NONCE_LEN].to_vec(),
        tag: body[KEM_CT_LEN + NONCE_LEN..HEADER_LEN].to_vec(),
        ct: body[HEADER_LEN..].to_vec(),
    })
}

/// Loose prefix match — mirrors `isEnvelope` (`format.ts:49`), which keys off `encrypted:` only.
pub fn is_envelope(value: &str) -> bool {
    value.starts_with("encrypted:")
}

pub fn base64url_encode(bytes: &[u8]) -> String {
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

/// Decode base64url. Lenient: accepts URL-safe input with or without padding (Node's `base64url`
/// decoder is itself forgiving), so values produced by either implementation round-trip.
pub fn base64url_decode(text: &str) -> Result<Vec<u8>, String> {
    let trimmed = text.trim_end_matches('=');
    base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(trimmed)
        .map_err(|err| format!("base64url decode failed: {err}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base64url_is_no_pad_and_url_safe() {
        // Matches Node `Buffer.from([0,1,2,254,255]).toString("base64url")`.
        assert_eq!(base64url_encode(&[0, 1, 2, 254, 255]), "AAEC_v8");
        assert_eq!(base64url_decode("AAEC_v8").unwrap(), vec![0, 1, 2, 254, 255]);
    }

    #[test]
    fn round_trips_envelope() {
        let kem = vec![1u8; KEM_CT_LEN];
        let nonce = vec![2u8; NONCE_LEN];
        let tag = vec![3u8; GCM_TAG_LEN];
        let ct = vec![4u8, 5, 6];
        let env = encode_envelope(&kem, &nonce, &tag, &ct);
        assert!(env.starts_with(ENVELOPE_PREFIX));
        let decoded = decode_envelope(&env).unwrap();
        assert_eq!(decoded.kem_ct, kem);
        assert_eq!(decoded.nonce, nonce);
        assert_eq!(decoded.tag, tag);
        assert_eq!(decoded.ct, ct);
    }

    #[test]
    fn rejects_bad_prefix_and_short_payload() {
        assert!(decode_envelope("nope").is_err());
        assert!(decode_envelope("encrypted:v1:AAAA").is_err());
    }
}
