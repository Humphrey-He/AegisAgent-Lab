use agent_common::{RiskLevel, ToolMetadata};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

#[cfg(test)]
mod lib_test;

pub fn metadata() -> ToolMetadata {
    ToolMetadata {
        name: "code-indexer".to_string(),
        risk_level: RiskLevel::Low,
    }
}

pub fn file_extension(path: &str) -> Option<String> {
    Path::new(path)
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_lowercase())
}

pub fn scan_files(root: &Path, extensions: &[&str]) -> io::Result<Vec<String>> {
    let normalized_extensions: Vec<String> = extensions
        .iter()
        .map(|extension| extension.trim_start_matches('.').to_lowercase())
        .collect();
    let mut matches = Vec::new();

    scan_directory(root, root, &normalized_extensions, &mut matches)?;
    matches.sort();
    Ok(matches)
}

fn scan_directory(
    root: &Path,
    current: &Path,
    extensions: &[String],
    matches: &mut Vec<String>,
) -> io::Result<()> {
    for entry in fs::read_dir(current)? {
        let entry = entry?;
        let path = entry.path();
        let metadata = entry.metadata()?;

        if metadata.is_dir() {
            scan_directory(root, &path, extensions, matches)?;
            continue;
        }

        if metadata.is_file() && matches_extension(&path, extensions) {
            matches.push(relative_path(root, &path));
        }
    }

    Ok(())
}

fn matches_extension(path: &Path, extensions: &[String]) -> bool {
    if extensions.is_empty() {
        return true;
    }

    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extensions.contains(&extension.to_lowercase()))
        .unwrap_or(false)
}

fn relative_path(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .components()
        .collect::<PathBuf>()
        .to_string_lossy()
        .replace('\\', "/")
}
