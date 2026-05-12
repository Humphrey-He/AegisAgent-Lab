use super::*;

#[test]
fn summarizes_log_lines_and_error_counts() {
    let summary = summarize_logs("INFO boot\nWARN slow query\nERROR timeout\nERROR retry failed\n");

    assert_eq!(summary.total_lines, 4);
    assert_eq!(summary.error_lines, 2);
    assert_eq!(summary.warning_lines, 1);
}

#[test]
fn counts_keywords_case_insensitively() {
    let counts = count_keywords(
        "INFO boot\nWARN slow query\nERROR timeout\npanic recovered\nERROR retry timeout\n",
        &["error", "warn", "panic", "timeout"],
    );

    assert_eq!(counts["error"], 2);
    assert_eq!(counts["warn"], 1);
    assert_eq!(counts["panic"], 1);
    assert_eq!(counts["timeout"], 2);
}
