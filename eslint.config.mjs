import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default tseslint.config(
  // Base recommended rules
  js.configs.recommended,
  // TypeScript strict rules
  ...tseslint.configs.strict,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    rules: {
      // No unused variables — hard error
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // No explicit any
      '@typescript-eslint/no-explicit-any': 'error',

      // Non-null assertion operator warns instead of errors
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Enforce import type for type-only imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // No console.log — use Pino instead
      'no-console': 'warn',

      // Require === over ==
      eqeqeq: ['error', 'always'],

      // No floating promises — all async calls must be awaited or handled
      '@typescript-eslint/no-floating-promises': 'error',
    },
    languageOptions: {
      parserOptions: {
        // Use the dedicated ESLint tsconfig (covers both src/ and tests/) via absolute path
        project: resolve(__dirname, 'tsconfig.eslint.json'),
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    // Ignore generated/compiled files
    ignores: ['dist/', 'coverage/', 'src/db/migrations/'],
  },
)
