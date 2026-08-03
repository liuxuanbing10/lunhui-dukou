import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // 默认 LLM_MOCK=1（零消耗 mock）。test:live 用 cross-env LLM_MOCK=0 覆盖。
    env: {
      LLM_MOCK: process.env.LLM_MOCK ?? '1',
    },
    include: ['src/**/*.test.ts'],
  },
});
