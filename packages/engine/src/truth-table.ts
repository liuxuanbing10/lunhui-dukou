/**
 * truth-table.ts — 服务端兼容层
 * ----------------------------------------------------------------------------
 * 纯判定逻辑已迁至 ./truth（浏览器安全，无 node:fs / 无 resident-loader）。
 * 本文件仅作「再导出」层，保证历史 `import { matchFact } from './truth-table.js'`
 * 仍然可用；居民数据的 fs 加载职责留在 ./resident-loader（服务端用）。
 *
 * 浏览器 / 离线场景请直接 `import { judgeAsk } from '@lunhui/engine/truth'`，
 * 该子路径产物（dist/truth.js）不含任何 Node 专属 API。
 */
export * from './truth.js';
