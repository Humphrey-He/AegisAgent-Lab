use code_indexer::scan_files;
use std::env;
use std::path::PathBuf;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.get(1).map(String::as_str) != Some("scan") {
        print_error("usage: code-indexer scan --root <path> --ext <extension>");
        std::process::exit(1);
    }

    let root = option_value(&args, "--root")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    let extensions: Vec<String> = option_values(&args, "--ext");
    let extension_refs: Vec<&str> = extensions.iter().map(String::as_str).collect();

    match scan_files(&root, &extension_refs) {
        Ok(files) => {
            println!(
                "{{\"summary\":\"scan completed\",\"files\":[{}]}}",
                files
                    .iter()
                    .map(|file| format!("\"{}\"", escape_json(file)))
                    .collect::<Vec<_>>()
                    .join(",")
            );
        }
        Err(err) => {
            print_error(&format!("scan failed: {err}"));
            std::process::exit(1);
        }
    }
}

fn option_value(args: &[String], name: &str) -> Option<String> {
    args.windows(2)
        .find(|window| window[0] == name)
        .map(|window| window[1].clone())
}

fn option_values(args: &[String], name: &str) -> Vec<String> {
    args.windows(2)
        .filter(|window| window[0] == name)
        .map(|window| window[1].clone())
        .collect()
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
