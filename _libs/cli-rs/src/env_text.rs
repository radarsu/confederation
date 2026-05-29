//! Round-trip .env parser/serializer — mirrors `_libs/core/src/envText.ts`.
//!
//! Preserves comments, blank lines, key order, quote style, `export` prefixes, inline comments,
//! BOM and EOL, so surgical edits (`set_value`) leave the rest of the file byte-identical: only
//! edited entries are re-serialized; every other line is emitted from its original raw text.

use std::sync::OnceLock;

use regex::Regex;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum QuoteStyle {
    Double,
    Single,
    None,
}

#[derive(Clone, Debug)]
pub enum EnvLine {
    Blank {
        raw: String,
    },
    Comment {
        raw: String,
    },
    Raw {
        raw: String,
    },
    Entry {
        raw: String,
        key: String,
        value: String,
        quote: QuoteStyle,
        exported: bool,
        inline_comment: String,
        dirty: bool,
    },
}

pub struct EnvDocument {
    pub eol: String,
    pub bom: bool,
    pub lines: Vec<EnvLine>,
}

fn line_split_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\r\n|\n").unwrap())
}

fn export_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^export\s+").unwrap())
}

fn key_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^[A-Za-z_][A-Za-z0-9_.]*$").unwrap())
}

fn space_hash_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\s#").unwrap())
}

pub fn parse_env(text: &str) -> EnvDocument {
    let bom = text.starts_with('\u{feff}');
    let body = if bom { &text['\u{feff}'.len_utf8()..] } else { text };
    let eol = if body.contains("\r\n") { "\r\n" } else { "\n" }.to_string();
    // Keep every split segment (including the trailing "" a final newline produces) so serialization
    // reproduces the original terminator exactly.
    let lines = line_split_re().split(body).map(parse_line).collect();
    EnvDocument { eol, bom, lines }
}

pub fn serialize_env(doc: &EnvDocument) -> String {
    let text = doc.lines.iter().map(serialize_line).collect::<Vec<_>>().join(&doc.eol);
    if doc.bom {
        format!("\u{feff}{text}")
    } else {
        text
    }
}

impl EnvDocument {
    pub fn list_entries(&self) -> Vec<(String, String)> {
        self.lines
            .iter()
            .filter_map(|line| match line {
                EnvLine::Entry { key, value, .. } => Some((key.clone(), value.clone())),
                _ => None,
            })
            .collect()
    }

    /// Set the value at `key` (last occurrence wins), marking that entry dirty; append if absent.
    pub fn set_value(&mut self, key: &str, value: &str) {
        let mut last_index: Option<usize> = None;
        for (i, line) in self.lines.iter().enumerate() {
            if matches!(line, EnvLine::Entry { key: k, .. } if k == key) {
                last_index = Some(i);
            }
        }
        let Some(index) = last_index else {
            self.append_entry(key, value);
            return;
        };
        if let EnvLine::Entry { value: v, quote, dirty, .. } = &mut self.lines[index] {
            *quote = pick_quote(value, *quote);
            *v = value.to_string();
            *dirty = true;
        }
    }

    fn append_entry(&mut self, key: &str, value: &str) {
        let entry = EnvLine::Entry {
            raw: String::new(),
            key: key.to_string(),
            value: value.to_string(),
            quote: pick_quote(value, QuoteStyle::None),
            exported: false,
            inline_comment: String::new(),
            dirty: true,
        };
        // Insert before a run of trailing blank lines so a final newline stays at the end.
        let mut insert_at = self.lines.len();
        while insert_at > 0 && matches!(self.lines[insert_at - 1], EnvLine::Blank { .. }) {
            insert_at -= 1;
        }
        self.lines.insert(insert_at, entry);
    }
}

fn parse_line(raw: &str) -> EnvLine {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return EnvLine::Blank { raw: raw.to_string() };
    }
    if trimmed.starts_with('#') {
        return EnvLine::Comment { raw: raw.to_string() };
    }

    let mut working = raw.trim_start();
    let mut exported = false;
    if let Some(m) = export_re().find(working) {
        exported = true;
        working = &working[m.end()..];
    }

    let Some(eq) = working.find('=') else {
        return EnvLine::Raw { raw: raw.to_string() };
    };
    let key = working[..eq].trim();
    if key.is_empty() || !key_re().is_match(key) {
        return EnvLine::Raw { raw: raw.to_string() };
    }

    let rest = working[eq + 1..].trim_start();
    let (value, quote, inline_comment) = parse_value(rest);
    EnvLine::Entry {
        raw: raw.to_string(),
        key: key.to_string(),
        value,
        quote,
        exported,
        inline_comment,
        dirty: false,
    }
}

fn parse_value(rest: &str) -> (String, QuoteStyle, String) {
    let first = rest.chars().next();
    if first == Some('"') || first == Some('\'') {
        let quote_char = first.unwrap();
        if let Some(rel) = rest[1..].find(quote_char) {
            let close = 1 + rel;
            let after = rest[close + 1..].trim();
            let inline_comment = if after.starts_with('#') { after.to_string() } else { String::new() };
            let style = if quote_char == '"' { QuoteStyle::Double } else { QuoteStyle::Single };
            return (rest[1..close].to_string(), style, inline_comment);
        }
    }
    if let Some(m) = space_hash_re().find(rest) {
        // m matches `\s#`; value ends at the whitespace, comment starts at the `#`.
        let value = rest[..m.start()].trim().to_string();
        let inline_comment = rest[m.end() - 1..].trim().to_string();
        return (value, QuoteStyle::None, inline_comment);
    }
    (rest.trim_end().to_string(), QuoteStyle::None, String::new())
}

fn serialize_line(line: &EnvLine) -> String {
    match line {
        EnvLine::Blank { raw } | EnvLine::Comment { raw } | EnvLine::Raw { raw } => raw.clone(),
        EnvLine::Entry { raw, dirty, key, value, quote, exported, inline_comment } => {
            if !dirty {
                return raw.clone();
            }
            let prefix = if *exported { "export " } else { "" };
            let value_part = render_value(value, *quote);
            let comment = if inline_comment.is_empty() { String::new() } else { format!(" {inline_comment}") };
            format!("{prefix}{key}={value_part}{comment}")
        }
    }
}

fn render_value(value: &str, quote: QuoteStyle) -> String {
    match quote {
        QuoteStyle::Double => format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\"")),
        QuoteStyle::Single => format!("'{value}'"),
        QuoteStyle::None => value.to_string(),
    }
}

fn pick_quote(value: &str, current: QuoteStyle) -> QuoteStyle {
    if current != QuoteStyle::None {
        return current;
    }
    if value.is_empty() || value.chars().any(|c| c.is_whitespace() || c == '#' || c == '"' || c == '\'') {
        return QuoteStyle::Double;
    }
    QuoteStyle::None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn round_trip(input: &str) -> String {
        serialize_env(&parse_env(input))
    }

    #[test]
    fn round_trips_byte_identical() {
        for input in [
            "# top comment\n\nexport NODE_ENV=production\nDATABASE_URL=\"postgres://a/b\" # db\nPORT=8080\n",
            "A=1 # comment\n",
            "A=\"plain value with spaces\"\n",
            "no trailing newline=1",
            "\u{feff}WITH_BOM=1\n",
            "CRLF=1\r\nNEXT=2\r\n",
            "A=b=c=d\n",
            "not-a-key line\nALSO raw\n",
        ] {
            assert_eq!(round_trip(input), input, "round-trip mismatch for {input:?}");
        }
    }

    #[test]
    fn set_value_only_touches_target_line() {
        let mut doc = parse_env("# keep\nexport A='x' # note\nB=2\n");
        doc.set_value("B", "9");
        let out = serialize_env(&doc);
        assert!(out.contains("# keep"));
        assert!(out.contains("export A='x' # note"));
        assert!(out.contains("B=9"));
    }

    #[test]
    fn set_value_keeps_existing_quote_and_quotes_when_needed() {
        let mut doc = parse_env("A=\"v\"\nB=plain\n");
        doc.set_value("A", "new");
        doc.set_value("B", "has space");
        let out = serialize_env(&doc);
        assert!(out.contains("A=\"new\""));
        assert!(out.contains("B=\"has space\""));
    }

    #[test]
    fn list_entries_skips_comments_and_blanks() {
        let doc = parse_env("# c\n\nA=1\nB=2\n");
        assert_eq!(doc.list_entries(), vec![("A".into(), "1".into()), ("B".into(), "2".into())]);
    }
}
