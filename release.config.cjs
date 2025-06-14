module.exports = {
  branches: ["main", { name: "next", prerelease: true }],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    [
      "@semantic-release/npm",
      {
        pkgRoot: "./build", // This tells semantic-release where to find the final package.json
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: ["build/dist/**"],
      },
    ],
    "@semantic-release/git",
  ],
};
