const dotenv = require('dotenv');

// Load environment variables from .env.test file for the test environment
dotenv.config({ path: './.env.test' });

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'], // Reference to the setup file
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  testMatch: ['**/tests/**/*.ts'],
};
