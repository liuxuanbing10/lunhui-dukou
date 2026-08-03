import { defineConfig } from 'vitest/config';
import projects from './vitest.workspace.ts';

export default defineConfig({
  test: {
    // 统一入口：运行 vitest.workspace.ts 列出的每个包（packages/*），
    // 各自使用自己的 vitest.config.ts（engine/server=node，web=jsdom）。
    // 设置 projects 后 vitest 只跑这些项目，不会把根目录当成默认项目
    // 去收集 dist 产物，也不会用 node 环境跑 web。
    projects,
  },
});
