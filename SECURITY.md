# Security Policy

## Supported Versions

kwikk is pre-1.0 and under active development. Security fixes are only
guaranteed for the latest commit on `main`.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately via
[GitHub Security Advisories](https://github.com/its-banana-coder/kwikk/security/advisories/new)
for this repository. Include:

- A description of the vulnerability and its potential impact
- Steps to reproduce (a minimal repro is ideal)
- Affected version/commit

You should expect an initial response within a few days. If the issue is
confirmed, we'll work with you on a fix and disclosure timeline before any
public write-up.

## Scope notes

kwikk's API server (`apps/api`) handles project/asset data and calls
out to user-configured LLM/embedding providers and external asset sources
(Pixabay). Relevant classes of issue include (non-exhaustive): injection via
the `EditorOperation` pipeline, SSRF via asset ingestion or export URLs,
path traversal in asset/font storage, and auth/authorization gaps in
`apps/api` routes.
