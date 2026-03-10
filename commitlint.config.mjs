// @ts-check

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Types allowed
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'chore',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'ci',
        'build',
        'revert',
      ],
    ],
    // Scope must be lowercase if provided
    'scope-case': [2, 'always', 'lower-case'],
    // Subject must be lowercase
    'subject-case': [2, 'always', 'lower-case'],
    // No period at the end of description
    'subject-full-stop': [2, 'never', '.'],
    // Max 100 chars for description
    'subject-max-length': [2, 'always', 100],
    // Header max length
    'header-max-length': [2, 'always', 120],
  },
}

