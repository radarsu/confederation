//! Locate the committed `puristic.schema.json` that governs a directory — the JSON-Schema analog of
//! `findNearestConfig` (`_libs/cli/src/discoverConfig.ts`), walking up to the filesystem root.

use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::schema::{parse_schema, LeafDescriptor};

pub const SCHEMA_NAME: &str = "puristic.schema.json";

/// Names of the TypeScript/JS config the Node CLI evaluates — used only for error messages.
pub const CONFIG_NAMES: [&str; 6] =
    ["env.config.ts", "env.config.mts", "env.config.cts", "env.config.js", "env.config.mjs", "env.config.cjs"];

pub fn find_nearest_schema(start_dir: &Path) -> Option<PathBuf> {
    let mut current = start_dir.to_path_buf();
    loop {
        let candidate = current.join(SCHEMA_NAME);
        if candidate.exists() {
            return Some(candidate);
        }
        match current.parent() {
            Some(parent) if parent != current => current = parent.to_path_buf(),
            _ => return None,
        }
    }
}

pub fn load_schema(path: &Path) -> Result<Vec<LeafDescriptor>, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    let json: Value = serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))?;
    Ok(parse_schema(&json))
}

pub fn schema_missing_error(dir: &Path) -> String {
    format!(
        "No {SCHEMA_NAME} found at or above {}. Run `puristic gen --json` (Node CLI) and commit it, or pass --schema <path>.",
        dir.display()
    )
}
