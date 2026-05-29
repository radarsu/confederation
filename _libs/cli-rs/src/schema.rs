//! Parse a committed `puristic.schema.json` (the JSON Schema `gen --json` emits via `z.toJSONSchema`)
//! into a flat list of leaf descriptors — the JS-free substitute for `inspectSchema` + `deriveName`.
//!
//! Env names are derived from the property path exactly as `_libs/core/src/deriveName.ts`:
//! each segment is camel→SCREAMING_SNAKE, joined with `_`. Note: `z.toJSONSchema` (output mode)
//! lists defaulted fields in the parent `required` array, so `required` is computed as
//! `(key ∈ required) && !has_default` to match `inspectSchema` semantics.

use std::collections::HashSet;
use std::sync::OnceLock;

use regex::Regex;
use serde_json::Value;

#[derive(Debug, Clone)]
pub struct LeafDescriptor {
    pub env_name: String,
    pub type_tag: String,
    pub required: bool,
    pub has_default: bool,
    pub default: Option<Value>,
    pub secret: bool,
    pub enum_values: Option<Vec<String>>,
    pub pattern: Option<String>,
    pub minimum: Option<f64>,
    pub maximum: Option<f64>,
    pub exclusive_minimum: Option<f64>,
    pub exclusive_maximum: Option<f64>,
    pub min_length: Option<u64>,
    pub max_length: Option<u64>,
}

pub fn parse_schema(root: &Value) -> Vec<LeafDescriptor> {
    let mut out = Vec::new();
    walk(root, &[], &mut out);
    out
}

fn walk(node: &Value, path: &[String], out: &mut Vec<LeafDescriptor>) {
    let Some(properties) = node.get("properties").and_then(Value::as_object) else {
        return;
    };
    let required: HashSet<&str> = node
        .get("required")
        .and_then(Value::as_array)
        .map(|items| items.iter().filter_map(Value::as_str).collect())
        .unwrap_or_default();

    for (key, child) in properties {
        let mut child_path = path.to_vec();
        child_path.push(key.clone());

        let type_tag = child.get("type").and_then(Value::as_str).unwrap_or("unknown");
        if type_tag == "object" && child.get("properties").is_some() {
            walk(child, &child_path, out);
            continue;
        }

        let has_default = child.get("default").is_some();
        out.push(LeafDescriptor {
            env_name: child_path.iter().map(|s| camel_to_screaming_snake(s)).collect::<Vec<_>>().join("_"),
            type_tag: type_tag.to_string(),
            required: required.contains(key.as_str()) && !has_default,
            has_default,
            default: child.get("default").cloned(),
            secret: child.get("secret").and_then(Value::as_bool).unwrap_or(false),
            enum_values: read_enum(child),
            pattern: child.get("pattern").and_then(Value::as_str).map(str::to_string),
            minimum: child.get("minimum").and_then(Value::as_f64),
            maximum: child.get("maximum").and_then(Value::as_f64),
            exclusive_minimum: child.get("exclusiveMinimum").and_then(Value::as_f64),
            exclusive_maximum: child.get("exclusiveMaximum").and_then(Value::as_f64),
            min_length: child.get("minLength").and_then(Value::as_u64),
            max_length: child.get("maxLength").and_then(Value::as_u64),
        });
    }
}

fn read_enum(child: &Value) -> Option<Vec<String>> {
    let values = child.get("enum").and_then(Value::as_array)?;
    Some(values.iter().map(value_to_string).collect())
}

/// Render a JSON default/enum value the way `String(value)` does in JS (used for `--defaults`).
pub fn value_to_string(value: &Value) -> String {
    match value {
        Value::String(s) => s.clone(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        Value::Null => "null".to_string(),
        other => other.to_string(),
    }
}

pub fn camel_to_screaming_snake(value: &str) -> String {
    static RE1: OnceLock<Regex> = OnceLock::new();
    static RE2: OnceLock<Regex> = OnceLock::new();
    let re1 = RE1.get_or_init(|| Regex::new(r"([a-z0-9])([A-Z])").unwrap());
    let re2 = RE2.get_or_init(|| Regex::new(r"([A-Z]+)([A-Z][a-z])").unwrap());
    let step1 = re1.replace_all(value, "${1}_${2}");
    let step2 = re2.replace_all(&step1, "${1}_${2}");
    step2.to_uppercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn env_name_derivation_matches_node() {
        assert_eq!(camel_to_screaming_snake("nodeEnv"), "NODE_ENV");
        assert_eq!(camel_to_screaming_snake("apiKey"), "API_KEY");
        assert_eq!(camel_to_screaming_snake("port"), "PORT");
    }

    #[test]
    fn parses_nested_schema_with_defaults_and_secrets() {
        let json: Value = serde_json::from_str(
            r#"{
                "type":"object",
                "properties":{
                    "nodeEnv":{"type":"string"},
                    "server":{"type":"object","properties":{
                        "port":{"type":"integer"},
                        "host":{"type":"string","default":"0.0.0.0"}
                    },"required":["port","host"]},
                    "database":{"type":"object","properties":{
                        "url":{"type":"string","secret":true}
                    },"required":["url"]}
                },
                "required":["nodeEnv","server","database"]
            }"#,
        )
        .unwrap();
        let leaves = parse_schema(&json);
        let by_name = |n: &str| leaves.iter().find(|l| l.env_name == n).unwrap();

        assert!(by_name("NODE_ENV").required);
        let host = by_name("SERVER_HOST");
        assert!(host.has_default && !host.required, "defaulted field is not required");
        assert!(by_name("SERVER_PORT").required);
        assert!(by_name("DATABASE_URL").secret);
    }
}
