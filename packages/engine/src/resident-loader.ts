/**
 * ResidentLoader：把 Hermes 风格的角色文件（frontmatter + 正文 JSON 块）
 * 解析为 Resident[]。
 *
 * 文件格式（docs/RESIDENTS.md 同源，Hermes SKILL.md 风格）：
 * ```
 * ---
 * id: r1
 * name: 蓑衣人
 * ...
 * ---
 * ## SecretFacts
 * ```json { ... }
 * ## Relations
 * ```json [ ... ]
 * ```
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import matter from 'gray-matter';
import { load as loadYaml } from 'js-yaml';
import type { Fact, Relation, Resident } from './types.js';

/** 角色文件目录（engine/residents/，src 外，构建后可随包分发） */
const RESIDENTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../residents');

/** 从正文中提取指定标题下的 JSON 代码块 */
function extractJsonBlock(markdown: string, heading: string): string | undefined {
  // 匹配：## Heading 之后第一个 ```json ... ``` 块
  const re = new RegExp(`##\\s*${heading}[\\s\\S]*?\\` + '```json\\s*\\n([\\s\\S]*?)\\n' + '```');
  const m = re.exec(markdown);
  return m?.[1];
}

/** 校验 fact 结构完整 */
function assertFact(f: Fact): asserts f is Fact {
  if (!f.id || !f.statement || typeof f.isKey !== 'boolean') {
    throw new Error(`非法 Fact: ${JSON.stringify(f)}`);
  }
}

/** 解析单个角色文件 */
export function parseResidentFile(filePath: string): Resident {
  const raw = readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  const id: string = data.id;
  const name: string = data.name;
  if (!id || !name) {
    throw new Error(`角色文件缺少 id/name: ${filePath}`);
  }

  const factsBlock = extractJsonBlock(content, 'SecretFacts');
  const relationsBlock = extractJsonBlock(content, 'Relations');
  if (!factsBlock) {
    throw new Error(`角色文件缺少 SecretFacts: ${filePath}`);
  }

  const secretFacts = loadYaml(factsBlock) as { facts: Fact[]; truth: string };
  secretFacts.facts.forEach(assertFact);

  const relations: Relation[] = relationsBlock
    ? (loadYaml(relationsBlock) as Relation[])
    : [];

  return {
    id,
    name,
    archetype: data.archetype ?? '',
    age: data.age ?? 0,
    role: data.role ?? '',
    appearance: data.appearance ?? '',
    persona: data.persona ?? '',
    speechStyle: data.speechStyle ?? '',
    quirks: Array.isArray(data.quirks) ? data.quirks : [],
    secretFacts: {
      facts: secretFacts.facts,
      truth: secretFacts.truth ?? '',
    },
    relations,
  };
}

/** 加载全部居民（扫描 residents 下每个子目录的 SOUL.md，按目录名排序保证 r1..r8 稳定） */
export function loadAllResidents(): Resident[] {
  const dirs = readdirSync(RESIDENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  return dirs.map((dir) => parseResidentFile(path.join(RESIDENTS_DIR, dir, 'SOUL.md')));
}

/** 按 id 查找居民 */
export function getResident(id: string): Resident | undefined {
  return loadAllResidents().find((r) => r.id === id);
}
