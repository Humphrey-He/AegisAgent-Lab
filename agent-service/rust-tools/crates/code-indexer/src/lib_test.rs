use super::*;

#[test]
fn identifies_file_extension_in_lowercase() {
    assert_eq!(file_extension("src/Program.CS"), Some("cs".to_string()));
    assert_eq!(file_extension("README"), None);
}

#[test]
fn scans_files_by_extension() {
    let root = std::env::temp_dir().join(format!("code-indexer-test-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&root);
    std::fs::create_dir_all(root.join("src")).unwrap();
    std::fs::write(root.join("src").join("Program.CS"), "class Program {}").unwrap();
    std::fs::write(root.join("src").join("notes.md"), "# notes").unwrap();
    std::fs::write(root.join("README"), "hello").unwrap();

    let files = scan_files(&root, &["cs"]).unwrap();

    assert_eq!(files, vec!["src/Program.CS".to_string()]);

    std::fs::remove_dir_all(root).unwrap();
}
