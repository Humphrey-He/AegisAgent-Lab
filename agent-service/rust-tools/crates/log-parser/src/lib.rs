use agent_common::{RiskLevel, ToolMetadata};
use std::collections::BTreeMap;

#[cfg(test)]
mod lib_test;

pub fn metadata() -> ToolMetadata {
    ToolMetadata {
        name: "log-parser".to_string(),
        risk_level: RiskLevel::Low,
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LogSummary {
    pub total_lines: usize,
    pub error_lines: usize,
    pub warning_lines: usize,
}

pub fn summarize_logs(logs: &str) -> LogSummary {
    let mut summary = LogSummary {
        total_lines: 0,
        error_lines: 0,
        warning_lines: 0,
    };

    for line in logs.lines() {
        summary.total_lines += 1;

        let normalized = line.to_ascii_lowercase();
        if normalized.contains("error") {
            summary.error_lines += 1;
        }
        if normalized.contains("warn") {
            summary.warning_lines += 1;
        }
    }

    summary
}

pub fn count_keywords(logs: &str, keywords: &[&str]) -> BTreeMap<String, usize> {
    let normalized_logs = logs.to_ascii_lowercase();
    keywords
        .iter()
        .map(|keyword| {
            let normalized_keyword = keyword.to_ascii_lowercase();
            let count = normalized_logs.matches(&normalized_keyword).count();
            (normalized_keyword, count)
        })
        .collect()
}
