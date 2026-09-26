import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/random-pick/',
  test: {
    environment: 'jsdom',
  },
})
