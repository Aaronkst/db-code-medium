pub fn parse_json(json_string: &str) -> serde_json::Value {
    let json_quotes = regex::Regex::new(r"(\w+)(:)").unwrap(); // Regex pattern to match unquoted keys

    let corrected_json_string = json_quotes.replace_all(json_string, r#""$1"$2"#);

    let parsed_json: serde_json::Value =
        serde_json::from_str(&corrected_json_string).unwrap_or_else(|_| serde_json::json!({}));

    parsed_json
}

pub fn trim_quotes(s: &str) -> &str {
    s.trim_matches(&['\'', '"'][..])
}
