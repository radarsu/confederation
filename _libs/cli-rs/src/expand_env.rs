//! Expand `${VAR}` and `$VAR` references inside env values — mirrors `_libs/core/src/expandEnv.ts`.
//! Each reference resolves against the record's own keys first (siblings), then the ambient lookup.
//! `\$` is a literal `$`; an unresolved reference becomes empty; a reference cycle resolves to empty.

use std::collections::HashSet;
use std::sync::OnceLock;

use indexmap::IndexMap;
use regex::{Captures, Regex};

fn reference_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\\\$|\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)").unwrap())
}

pub fn expand_value(value: &str, mut lookup: impl FnMut(&str) -> Option<String>) -> String {
    reference_re()
        .replace_all(value, |caps: &Captures| {
            if &caps[0] == "\\$" {
                return "$".to_string();
            }
            let name = caps.get(1).or_else(|| caps.get(2)).unwrap().as_str();
            lookup(name).unwrap_or_default()
        })
        .into_owned()
}

pub fn expand_env<F: Fn(&str) -> Option<String>>(record: &IndexMap<String, String>, ambient: F) -> IndexMap<String, String> {
    let mut expander = Expander { record, ambient, resolved: IndexMap::new(), resolving: HashSet::new() };
    for name in record.keys() {
        expander.resolve(name);
    }
    expander.resolved
}

struct Expander<'a, F: Fn(&str) -> Option<String>> {
    record: &'a IndexMap<String, String>,
    ambient: F,
    resolved: IndexMap<String, String>,
    resolving: HashSet<String>,
}

impl<F: Fn(&str) -> Option<String>> Expander<'_, F> {
    fn resolve(&mut self, name: &str) -> Option<String> {
        if let Some(value) = self.resolved.get(name) {
            return Some(value.clone());
        }
        let Some(raw) = self.record.get(name) else {
            return (self.ambient)(name);
        };
        if self.resolving.contains(name) {
            return Some(String::new()); // reference cycle — stop rather than loop forever
        }
        self.resolving.insert(name.to_string());
        let raw = raw.clone();
        let expanded = expand_value(&raw, |inner| self.resolve(inner));
        self.resolving.remove(name);
        self.resolved.insert(name.to_string(), expanded.clone());
        Some(expanded)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn record(pairs: &[(&str, &str)]) -> IndexMap<String, String> {
        pairs.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect()
    }

    #[test]
    fn resolves_siblings_then_ambient_with_escape() {
        let rec = record(&[("HOST", "localhost"), ("URL", "http://${HOST}:${PORT}/db")]);
        let out = expand_env(&rec, |name| if name == "PORT" { Some("5432".to_string()) } else { None });
        assert_eq!(out["URL"], "http://localhost:5432/db");
    }

    #[test]
    fn chains_to_fixpoint() {
        let rec = record(&[("A", "${B}"), ("B", "${C}"), ("C", "deep")]);
        let out = expand_env(&rec, |_| None);
        assert_eq!(out["A"], "deep");
        assert_eq!(out["B"], "deep");
    }

    #[test]
    fn cycles_and_missing_become_empty() {
        let rec = record(&[("A", "${B}"), ("B", "${A}"), ("M", "${NOPE}")]);
        let out = expand_env(&rec, |_| None);
        assert_eq!(out["A"], "");
        assert_eq!(out["B"], "");
        assert_eq!(out["M"], "");
    }

    #[test]
    fn escaped_dollar_is_literal() {
        assert_eq!(expand_value("\\$5 and ${HOST}", |n| if n == "HOST" { Some("h".into()) } else { None }), "$5 and h");
    }
}
