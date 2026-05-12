use log_parser::{count_keywords, summarize_logs};
use std::env;
use std::fs;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.get(1).map(String::as_str) != Some("summarize") {
        print_error("usage: log-parser summarize --file <path>");
        std::process::exit(1);
    }

    let Some(path) = option_value(&args, "--file") else {
        print_error("missing --file");
        std::process::exit(1);
    };

    match fs::read_to_string(&path) {
        Ok(content) => {
            let summary = summarize_logs(&content);
            let keywords = count_keywords(&content, &["error", "warn", "panic", "timeout"]);
            println!(
                "{{\"summary\":\"log summary completed\",\"total_lines\":{},\"error_lines\":{},\"warning_lines\":{},\"keywords\":{{{}}}}}",
                summary.total_lines,
                summary.error_lines,
                summary.warning_lines,
                keywords
                    .iter()
                    .map(|(key, value)| format!("\"{}\":{}", escape_json(key), value))
                    .collect::<Vec<_>>()
                    .join(",")
            );
        }
        Err(err) => {
            print_error(&format!("read log failed: {err}"));
            std::process::exit(1);
        }
    }
}

fn option_value(args: &[String], name: &str) -> Option<String> {
    args.windows(2)
        .find(|window| window[0] == name)
        .map(|window| window[1].clone())
}

fn print_error(message: &str) {
    println!(
        "{{\"summary\":\"error\",\"error\":\"{}\"}}",
        escape_json(message)
    );
}

fn escape_json(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}
