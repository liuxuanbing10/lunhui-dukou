// Vitest workspace 定义：列出三个子包，根 `npm test`（vitest run）据此统一驱动。
// 每个包使用自己的 vitest.config.ts（engine/server 用 node 环境，web 用 jsdom）。
// 注：vitest v4 的 `vitest/config` 未导出 defineWorkspace，这里直接导出项目数组。
export default ['packages/*'];
