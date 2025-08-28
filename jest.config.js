module.exports = {
  preset: 'ts-jest',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main/main.ts',
    '!src/renderer/index.tsx'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/release/'
  ],
  testTimeout: 30000, // Increase global timeout to 30 seconds
  projects: [
    {
      displayName: 'main',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/main/**/*.test.ts'],
      testTimeout: 30000,
      transform: {
        '^.+\\.ts$': 'ts-jest'
      }
    },
    {
      displayName: 'renderer',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/renderer/**/*.test.ts', '<rootDir>/src/renderer/**/*.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
      testTimeout: 30000,
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest'
      }
    }
  ]
};