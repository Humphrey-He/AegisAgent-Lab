const STORAGE_KEY = 'frontend-admin.skills'

export type SkillSource = 'local' | 'url'

export type SkillRecord = {
  id: string
  name: string
  source: SkillSource | string
  content: string
  createdAt: string
  updatedAt: string
}

export type SaveSkillInput = {
  id?: string
  name: string
  source: SkillSource | string
  content: string
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readRawSkills(): unknown {
  if (!canUseLocalStorage()) {
    return []
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : []
}

function isSkillRecord(value: unknown): value is SkillRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<SkillRecord>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.source === 'string' &&
    typeof candidate.content === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string'
  )
}

function createSkillId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `skill-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function loadSkills(): SkillRecord[] {
  try {
    const parsed = readRawSkills()
    return Array.isArray(parsed) ? parsed.filter(isSkillRecord) : []
  } catch {
    return []
  }
}

export function writeSkills(skills: SkillRecord[]): void {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(skills))
}

export function saveSkill(input: SaveSkillInput): SkillRecord {
  const skills = loadSkills()
  const now = new Date().toISOString()
  const existing = input.id ? skills.find((skill) => skill.id === input.id) : undefined
  const record: SkillRecord = {
    id: existing?.id ?? input.id ?? createSkillId(),
    name: input.name,
    source: input.source,
    content: input.content,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const nextSkills = existing
    ? skills.map((skill) => (skill.id === record.id ? record : skill))
    : [record, ...skills]

  writeSkills(nextSkills)
  return record
}

export function deleteSkill(id: string): void {
  writeSkills(loadSkills().filter((skill) => skill.id !== id))
}

export function clearSkills(): void {
  writeSkills([])
}

export async function fetchSkillText(url: string, init?: RequestInit): Promise<string> {
  const response = await fetch(url, init)

  if (!response.ok) {
    throw new Error(`Failed to fetch skill text: ${response.status}`)
  }

  return response.text()
}

export async function importSkillFromUrl(
  url: string,
  name = url.split('/').filter(Boolean).at(-1) ?? 'Imported Skill',
): Promise<SkillRecord> {
  const content = await fetchSkillText(url)
  return saveSkill({
    name,
    source: url,
    content,
  })
}
