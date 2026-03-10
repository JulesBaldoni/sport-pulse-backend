// @ts-check

export default {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer', // determines version bump from commits
    '@semantic-release/release-notes-generator', // generates release notes
    '@semantic-release/changelog', // updates CHANGELOG.md
    ['@semantic-release/npm', { npmPublish: false }], // bumps package.json version only (no publish)
    '@semantic-release/github', // creates GitHub release with notes and assets
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        // [skip ci] prevents triggering another CI run after the release commit
        message: 'chore(release): ${nextRelease.version} [skip ci]',
      },
    ],
  ],
}

