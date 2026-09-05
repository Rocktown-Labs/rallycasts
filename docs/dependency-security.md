# Dependency security

RallyCasts uses the following repository-level controls:

- GitHub dependency graph and Dependabot security updates are enabled.
- `.github/dependabot.yml` checks Bun workspace and GitHub Actions dependencies weekly.
- `.github/workflows/dependency-review.yml` blocks pull requests that introduce high or critical dependency advisories.
- `bun install --frozen-lockfile` remains the reproducible install check in CI.

## `image-size` override

The repository overrides the transitive `image-size` dependency with
`image-size-next@2.1.1`. It is pulled by Expo Metro tooling, not by the
production server. The fork's package metadata states that it fixes
CVE-2025-71329 and CVE-2025-71330, which are denial-of-service issues in the
original parser. The server also limits uploaded images to 5 MB, validates
content signatures, and does not use this package for request-time image
parsing.

This is a temporary override. Re-evaluate it when the official `image-size`
package publishes a release containing the fixes, and review Dependabot PRs
that touch the override rather than accepting them automatically.

## Scanner limitation

`bun pm scan` is not available without a configured third-party scanner. The
repository therefore relies on GitHub's dependency graph, Dependabot alerts,
and dependency-review action for CI enforcement. A Bun install-time scanner
should only be added after its network behavior and CI failure policy are
validated; an unverified scanner must not block reproducible production
installs.
