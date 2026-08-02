/**
 * 种子导入：从 @lunhui/engine 的 resident-loader 读取 SOUL.md → 写入 residents 表
 * 幂等：INSERT OR REPLACE，可重复执行
 */
import type { Database } from 'better-sqlite3';
import { loadAllResidents } from '@lunhui/engine';
import { upsertResident } from './repository.js';

/** 导入全部居民（返回导入数量） */
export function seedResidents(db: Database): number {
  const residents = loadAllResidents();
  for (const r of residents) {
    upsertResident(db, r);
  }
  return residents.length;
}
