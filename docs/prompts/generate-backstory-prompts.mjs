/**
 * 生成 8 份居民背景长文提示词。
 * 读取 engine/residents 下各子目录的 SOUL.md（gray-matter + 内嵌 JSON 块），
 * 填充 docs/prompts/backstory-template.md，输出到 docs/prompts/backstory-{id}.md。
 *
 * 用法：node docs/prompts/generate-backstory-prompts.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { load as loadYaml } from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RESIDENTS_DIR = path.join(ROOT, 'packages/engine/residents');
const TEMPLATE_PATH = path.join(ROOT, 'docs/prompts/backstory-template.md');
const OUT_DIR = path.join(ROOT, 'docs/prompts');

function extractJsonBlock(markdown, heading) {
  const re = new RegExp(`##\\s*${heading}[\\s\\S]*?\\` + '```json\\s*\\n([\\s\\S]*?)\\n' + '```');
  const m = re.exec(markdown);
  return m?.[1];
}

function loadSoul(dir) {
  const file = path.join(RESIDENTS_DIR, dir, 'SOUL.md');
  const raw = readFileSync(file, 'utf-8');
  const { data, content } = matter(raw);
  const secretFacts = loadYaml(extractJsonBlock(content, 'SecretFacts'));
  const relations = loadYaml(extractJsonBlock(content, 'Relations'));

  const profile = [
    `- 姓名：${data.name}`,
    `- 类型：${data.archetype}`,
    `- 年龄：${data.age}`,
    `- 身份：${data.role}`,
    `- 外貌：${data.appearance}`,
    `- 人格：${data.persona}`,
    `- 说话风格：${data.speechStyle}`,
    `- 怪癖：${(data.quirks ?? []).join('；')}`,
  ].join('\n');

  const facts = secretFacts.facts
    .map((f) => `- [${f.isKey ? '关键' : '普通'}] ${f.id}：${f.statement}`)
    .join('\n');

  const relationLines = relations.map((r) => `- ${r.targetId}：${r.stance}（${r.note ?? ''}）`).join('\n');

  return { data, profile, facts, truth: secretFacts.truth, relations: relationLines };
}

const template = readFileSync(TEMPLATE_PATH, 'utf-8');
const dirs = readdirSync(RESIDENTS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith('r'))
  .map((d) => d.name)
  .sort();

for (const dir of dirs) {
  const soul = loadSoul(dir);
  const id = soul.data.id; // e.g. 'r1'
  const name = soul.data.name;

  // 由 SOUL.md 内容驱动，保证 prompt_id 与输出名一致
  const out = template
    .replaceAll('{{RESIDENT_ID}}', id)
    .replaceAll('{{RESIDENT_NAME}}', name)
    .replaceAll('{{RESIDENT_DIR}}', dir)
    .replaceAll('{{RESIDENT_PROFILE}}', soul.profile)
    .replaceAll('{{RESIDENT_FACTS}}', soul.facts)
    .replaceAll('{{RESIDENT_TRUTH}}', soul.truth)
    .replaceAll('{{RESIDENT_RELATIONS}}', soul.relations);

  const outFile = path.join(OUT_DIR, `backstory-${dir}.md`);
  writeFileSync(outFile, out, 'utf-8');
  console.log(`✓ ${outFile}`);
}

console.log(`\n完成：${dirs.length} 份提示词已生成 → docs/prompts/`);
