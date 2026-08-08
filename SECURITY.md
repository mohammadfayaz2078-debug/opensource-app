# Security Policy

We take the security of Bazarnet ERP seriously. Because this is a multi-tenant
application holding financial and personal data, tenant-isolation bugs and
authorization flaws are treated as critical.

## Supported versions

| Version | Supported |
| --- | --- |
| main (latest) | ✅ |
| Previous releases | ❌ |

We recommend always running the latest `main`.

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, report privately using one of:

- **GitHub private security advisory:** navigate to *Security → Report a vulnerability*
  on the repository and follow the prompts.
- **Email:** open an issue asking for the maintainer's contact, or use the
  repository's security advisory link.

Please include:

- The affected endpoint/file and how to reproduce it
- The impact (what an attacker could do)
- Whether you verified the issue against the latest `main`

You will receive an acknowledgement within 5 business days, and we will work
toward a fix and disclosure. Please do not disclose the issue publicly until we
have released a fix and coordinated with you.

## What we consider in scope

- Authentication and authorization bypass
- Cross-company / cross-branch data access (tenant isolation)
- Data exposure through public endpoints
- SQL injection, XSS, CSRF, mass assignment
- File upload / backup / download abuse
- Financial or stock-record integrity issues

## Safe harbour

We will not pursue legal action against researchers who act in good faith,
avoid destroying data, and give us reasonable time to fix the issue before any
public disclosure.

## Security hardening notes for operators

- Always run with `APP_ENV=production` and `APP_DEBUG=false` in production.
- Generate a unique `APP_KEY`.
- Change or remove the demo credentials created by the seeder.
- Use HTTPS everywhere.
- Restrict file-system permissions on `.env`, `storage/` and `bootstrap/cache/`.
- Keep PHP, Composer and npm dependencies up to date (`composer audit`, `npm audit`).
