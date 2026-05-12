use agent_common::{RiskLevel, ToolMetadata};

pub fn metadata() -> ToolMetadata {
    ToolMetadata {
        name: "sandbox-runner".to_string(),
        risk_level: RiskLevel::Medium,
    }
}
