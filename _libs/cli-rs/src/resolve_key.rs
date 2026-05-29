//! Key resolution — mirrors `_libs/core/src/crypto/resolveKey.ts`.
//!
//! Public key: `<project-root>/.config/puristic-pub.key` (project root = nearest ancestor with a
//! package.json). Private key priority: `PURISTIC_PRIVATE_KEY` (inline base64url) →
//! `PURISTIC_PRIVATE_KEY_FILE` (path) → `~/.config/puristic/<project-slug>/private.key`.

use std::env;
use std::fs;
use std::path::{Path, PathBuf};

use crate::crypto::format::base64url_decode;

pub const PUBLIC_KEY_PATH: &str = ".config/puristic-pub.key";

pub fn resolve_public_key(cwd: &Path) -> Result<Vec<u8>, String> {
    let root = find_project_root(cwd)?;
    let path = root.join(PUBLIC_KEY_PATH);
    if !path.exists() {
        return Err(format!("Public key not found at {}. Run `puristic keygen` to create one.", path.display()));
    }
    let text = fs::read_to_string(&path).map_err(|e| format!("{}: {e}", path.display()))?;
    base64url_decode(text.trim())
}

pub fn resolve_private_key(cwd: &Path) -> Result<Vec<u8>, String> {
    if let Some(inline) = non_empty_env("PURISTIC_PRIVATE_KEY") {
        return base64url_decode(&inline);
    }
    if let Some(path) = non_empty_env("PURISTIC_PRIVATE_KEY_FILE") {
        return read_private_key_file(Path::new(&path));
    }
    let default_path = default_private_key_path(cwd)?;
    if default_path.exists() {
        return read_private_key_file(&default_path);
    }
    Err(format!(
        "No private key found. Set PURISTIC_PRIVATE_KEY env var, PURISTIC_PRIVATE_KEY_FILE, or place key at {}.",
        default_path.display()
    ))
}

pub fn default_private_key_path(cwd: &Path) -> Result<PathBuf, String> {
    let root = find_project_root(cwd)?;
    let name = read_project_name(&root)?;
    Ok(home_dir()?.join(".config").join("puristic").join(name).join("private.key"))
}

pub fn resolve_project_name(cwd: &Path) -> Result<String, String> {
    read_project_name(&find_project_root(cwd)?)
}

fn read_private_key_file(path: &Path) -> Result<Vec<u8>, String> {
    if !path.exists() {
        return Err(format!("Private key file not found: {}", path.display()));
    }
    let text = fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    base64url_decode(text.trim())
}

pub fn find_project_root(start: &Path) -> Result<PathBuf, String> {
    let mut current = absolutize(start);
    loop {
        if current.join("package.json").exists() {
            return Ok(current);
        }
        match current.parent() {
            Some(parent) if parent != current => current = parent.to_path_buf(),
            _ => return Err(format!("No package.json found above {}", start.display())),
        }
    }
}

fn read_project_name(project_root: &Path) -> Result<String, String> {
    let pkg_path = project_root.join("package.json");
    let text = fs::read_to_string(&pkg_path).map_err(|e| format!("{}: {e}", pkg_path.display()))?;
    let pkg: serde_json::Value = serde_json::from_str(&text).map_err(|e| format!("{}: {e}", pkg_path.display()))?;
    match pkg.get("name").and_then(|n| n.as_str()) {
        Some(name) if !name.is_empty() => Ok(slugify_project_name(name)),
        _ => Err(format!("package.json at {} has no \"name\" field", pkg_path.display())),
    }
}

pub fn slugify_project_name(name: &str) -> String {
    name.strip_prefix('@').unwrap_or(name).replace('/', "__")
}

fn non_empty_env(key: &str) -> Option<String> {
    env::var(key).ok().filter(|v| !v.is_empty())
}

fn home_dir() -> Result<PathBuf, String> {
    #[cfg(windows)]
    let key = "USERPROFILE";
    #[cfg(not(windows))]
    let key = "HOME";
    env::var_os(key)
        .map(PathBuf::from)
        .filter(|p| !p.as_os_str().is_empty())
        .ok_or_else(|| format!("could not determine home directory ({key} is not set)"))
}

/// Resolve to an absolute path without requiring the path to exist (unlike `canonicalize`).
fn absolutize(path: &Path) -> PathBuf {
    if path.is_absolute() {
        path.to_path_buf()
    } else {
        env::current_dir().map(|cwd| cwd.join(path)).unwrap_or_else(|_| path.to_path_buf())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slugify_matches_node() {
        assert_eq!(slugify_project_name("@puristic/env"), "puristic__env");
        assert_eq!(slugify_project_name("plain"), "plain");
        assert_eq!(slugify_project_name("@scope/a/b"), "scope__a__b");
    }
}
