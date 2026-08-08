# Contributing to Bazarnet ERP

Thank you for your interest in contributing! This project is a real, working
multi-tenant ERP, and we want to keep it that way. Please read this document
before opening an issue or pull request.

## Code of conduct

Be respectful and constructive. This project welcomes contributors of every
background and skill level. Harassment or hostile behaviour is not tolerated.

## Getting started

1. Fork the repository.
2. Clone your fork and install the project locally (see [README.md](README.md)).
3. Create a branch for your work: `git checkout -b feat/my-change` or
   `git checkout -b fix/my-bug`.

## What to work on

- Open issues labelled `bug`, `enhancement` or `good first issue` are good starting points.
- If you plan a large feature, open an issue first to discuss the approach — we prefer
  minimal, focused changes that preserve existing behaviour.

## Development workflow

Backend is Laravel/PHP; frontend is React (Vite + Tailwind).

```bash
# backend
composer install
php artisan test            # must pass (uses in-memory SQLite)

# frontend
npm install
npm run build               # must succeed
```

## Rules for changes

- **Preserve existing behaviour.** Do not "improve" working business logic without a
  strong reason and prior discussion.
- **Keep changes minimal.** Prefer small, focused PRs over large rewrites.
- **Tenant isolation is sacred.** Any change touching a company-scoped model must keep
  `company_id`/`branch_id` scoping intact. Cross-company access is a security bug.
- **Security fixes need regression tests.** If you fix a security issue, add a test that
  reproduces the old behaviour (e.g. in `tests/Feature/`).
- **No secrets.** Never commit `.env`, keys, tokens, database dumps or real personal data.
- **Follow existing conventions.** Match the surrounding code style (Laravel conventions
  on the backend; the existing component patterns on the frontend).

## Committing

- Write clear commit messages describing *why* the change was made.
- Do not commit generated files (`public/build/`, `vendor/`, `node_modules/`, `*.sqlite`).

## Opening a pull request

1. Ensure your branch is up to date with `main`.
2. Run `php artisan test` and `npm run build` locally — both must pass.
3. Open a PR against `main` using the pull-request template.
4. Respond to review feedback. Keep the conversation constructive.

## Reporting bugs

Use the bug-report issue template. Include:

- What you did
- What you expected
- What actually happened (include error output)
- Environment (PHP version, MySQL/SQLite, browser)

## Reporting security issues

**Do not** report security vulnerabilities in public issues. See
[SECURITY.md](SECURITY.md) for how to report privately.
