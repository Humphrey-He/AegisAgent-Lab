import type { Language } from './i18n'

export type GlossaryTerm =
  | 'Agent'
  | 'Trace'
  | 'Skill'
  | 'SkillHub'
  | 'Approval'
  | 'Risk Level'
  | 'Runtime'
  | 'Tool Chain'
  | 'Eval'
  | 'Prompt'
  | 'JSON'
  | 'API'
  | 'CI'

export type GlossaryEntry = {
  term: GlossaryTerm
  zh: string
  en: string
}

export const glossaryEntries: GlossaryEntry[] = [
  {
    term: 'Agent',
    zh: '能够理解任务、规划步骤并调用工具完成工作的智能执行单元。',
    en: 'An intelligent executor that understands a task, plans steps, and calls tools to complete work.',
  },
  {
    term: 'Trace',
    zh: '记录 Agent 执行过程的事件序列，通常包含工具调用、状态变化和关键消息。',
    en: 'An event sequence of an Agent run, usually including tool calls, status changes, and key messages.',
  },
  {
    term: 'Skill',
    zh: '封装特定领域知识、流程或工具用法的能力模块，帮助 Agent 更稳定地完成专项任务。',
    en: 'A capability module that packages domain knowledge, workflows, or tool usage for more reliable specialized work.',
  },
  {
    term: 'SkillHub',
    zh: '集中管理、发现、安装和更新 Skill 的资源中心。',
    en: 'A hub for managing, discovering, installing, and updating Skills.',
  },
  {
    term: 'Approval',
    zh: '对高影响或敏感操作进行人工确认的控制步骤。',
    en: 'A human confirmation step for high-impact or sensitive actions.',
  },
  {
    term: 'Risk Level',
    zh: '用于标记任务潜在影响范围和操作敏感度的等级。',
    en: 'A classification for the potential impact and sensitivity of a task.',
  },
  {
    term: 'Runtime',
    zh: 'Agent 或应用实际运行所依赖的执行环境，包括语言、依赖和系统能力。',
    en: 'The execution environment an Agent or app depends on, including language, dependencies, and system capabilities.',
  },
  {
    term: 'Tool Chain',
    zh: '完成任务时串联使用的一组工具、命令、服务或自动化步骤。',
    en: 'A connected set of tools, commands, services, or automation steps used to complete work.',
  },
  {
    term: 'Eval',
    zh: '用于衡量模型、Agent 或工作流质量的测试集、评分规则或评估流程。',
    en: 'A test set, scoring rule, or evaluation process for measuring model, Agent, or workflow quality.',
  },
  {
    term: 'Prompt',
    zh: '提供给模型的指令、上下文或输入内容，用来引导输出结果。',
    en: 'Instructions, context, or input sent to a model to guide its output.',
  },
  {
    term: 'JSON',
    zh: '一种轻量数据交换格式，常用于 API 请求、配置和结构化模型输出。',
    en: 'A lightweight data interchange format commonly used for API requests, configuration, and structured model output.',
  },
  {
    term: 'API',
    zh: '应用程序接口，定义不同系统之间如何请求数据或触发能力。',
    en: 'An application programming interface that defines how systems request data or trigger capabilities.',
  },
  {
    term: 'CI',
    zh: '持续集成流程，用自动化构建、测试和检查帮助代码稳定合入。',
    en: 'Continuous integration, an automated build, test, and check process that helps merge code reliably.',
  },
]

export function getGlossaryEntry(term: GlossaryTerm): GlossaryEntry | undefined {
  return glossaryEntries.find((entry) => entry.term === term)
}

export function getGlossaryText(term: GlossaryTerm, language: Language = 'zh'): string {
  return getGlossaryEntry(term)?.[language] ?? ''
}
