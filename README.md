<div align="center">

# Bazarnet ERP

**A multi-tenant ERP for inventory, sales, purchasing and accounting — with a public storefront.**

Laravel 12 · React 19 · Vite · Tailwind CSS · MySQL / SQLite

English · دری (Dari) · پښتو (Pashto)

</div>

---

Bazarnet is a complete business-management platform built for small and medium businesses that run
one company across several branches — and for businesses that want to sell online. It combines a
full back-office ERP (inventory, purchasing, sales, returns, accounts, expenses, income, reporting)
with a public product marketplace where guests can browse products, leave comments, like items and
place orders.

It is designed from the ground up as a **multi-tenant** system:

```
Super Admin (platform owner)
   └── Company
         └── Branch
               └── Users  ──  Roles  ──  Permissions
```

Each company is fully isolated: a user of Company A can never read or modify Company B's data.
The backend enforces tenant isolation independently of the frontend.

---

## ✨ Features

### Back office (per branch / per company)

- **Inventory & products** — products, categories, barcodes, units, unit categories and unit conversion
- **Purchasing** — purchase orders, purchase returns, supplier payments and receipts
- **Sales** — sales orders, delivery, confirmations, sale returns, customer payments and receipts
- **Stock management** — real-time stock balances and a full stock-transaction ledger
- **Valuation** — average-cost and FIFO inventory valuation
- **Accounts / wallets** — cash & bank accounts, deposits, withdrawals, transfers (with reversal), full ledger
- **Expenses** — categories, types, approval/payment/cancellation workflow
- **Income** — income categories and other income
- **Parties** — suppliers and customers with balances and payment history
- **Reports** — sales, purchase and profit/loss reports with filters and export
- **Dashboards** — branch dashboard, company dashboard and platform dashboard

### Organization

- **Users, roles & permissions** — per-branch role-based access control (RBAC)
- **Branch management** — branches per company, with usage limits
- **Company management** — platform-level companies, status and usage
- **Impersonation** — company admins can impersonate branch users (with a marker that cannot be hidden)

### Public storefront (marketplace)

- Public product listings (only products a branch explicitly publishes)
- Guest likes, comments and orders on public products
- Order status workflow managed by the owning company
- Public order placement without an account

### Platform

- **PWA / offline** — installable, works offline after first load
- **Multilingual UI** — English, Dari (Persian) and Pashto, with RTL support
- **Database backup** — full SQL dump, restricted to the platform Super Admin
- **Seeder** — fictional demo data so a fresh install is immediately explorable

---

## 🏗 Architecture

| Layer | Technology |
| --- | --- |
| Backend | Laravel 12 (PHP ≥ 8.2), Eloquent ORM, REST API |
| Auth | Laravel Sanctum (bearer tokens, stored in `localStorage`) |
| Frontend | React 19 SPA, Vite, Tailwind CSS, React Router, Axios, react-i18next |
| Database | MySQL (recommended) or SQLite (local development / tests) |
| Background | Laravel queues (database driver) |
| PWA | Service worker + Vite PWA plugin (offline asset precache) |

### Key directories

```
app/
├── Http/Controllers/          # API + web controllers
├── Http/Controllers/API/      # Auth, backup, super admin, company admin
├── Models/                    # Eloquent models
├── Policies/                  # Authorization policies
├── Services/                  # StockService, AccountTransferService
└── Helpers/                   # AuthHelper (tenant resolution)
database/migrations/           # Schema (all tenant tables carry company_id/branch_id)
database/seeders/              # Fictional demo data
resources/js/                  # React SPA (pages, layouts, services, i18n)
routes/api.php                 # All API routes
tests/                         # Feature tests (security + regression)
```

---

## 📋 Requirements

- **PHP** ≥ 8.2 (with `pdo_mysql` or `pdo_sqlite`)
- **Composer** ≥ 2
- **Node.js** ≥ 18 and **npm** ≥ 9
- **MySQL** ≥ 5.7 / 8.x (or SQLite ≥ 3.8 for local use)

---

## 🚀 Installation (local)

```bash
# 1. Install backend dependencies
composer install

# 2. Configure environment
cp .env.example .env
php artisan key:generate

# 3. Database — SQLite (quickest)
touch database/database.sqlite
# ...or MySQL: edit .env, e.g.
#   DB_CONNECTION=mysql
#   DB_DATABASE=bazarnet
#   DB_USERNAME=root
#   DB_PASSWORD=

# 4. Run migrations and seed fictional demo data
php artisan migrate --seed

# 5. Frontend
npm install
npm run build        # production build
# or for development:
npm run dev

# 6. Serve
php artisan serve    # http://127.0.0.1:8000
```

The SPA is served by Laravel at the app root; `/welcome` is the public marketplace and
`/login` is the sign-in page.

### Demo credentials (seeder — local sandbox only!)

| Role | Email | Password |
| --- | --- | --- |
| Super Admin (platform owner) | `superadmin@gmail.com` | `admin` |
| Company admin | `admin@gmail.com` | `admin@123` |
| Branch user | `user1@gmail.com` | `admin@123` |

> ⚠️ These are **fictional demo credentials**. Change them immediately on any shared or
> production deployment (the seeded accounts are regular accounts — update them through the UI
> or the seeder).

---

## 🧪 Testing

```bash
php artisan test
```

The test suite runs against an **in-memory SQLite** database and is guarded so it refuses to run
against a real MySQL/PostgreSQL database (it uses `RefreshDatabase`, which would wipe it).
Tests cover tenant isolation (cross-company access), marketplace security, backup authorization
and accounting regressions.

---

## 🔐 Security

- **Tenant isolation** — every company-scoped query is filtered by the caller's `company_id`
  and `branch_id`; record-level checks exist where needed.
- **Public endpoints are minimal** — guests can only place orders and interact with *public*
  products; listing/reading orders requires authentication and is scoped to the caller's company.
- **Rate limiting** — login, guest comments/likes, order placement and email checks are throttled.
- **Backups** — the full-database dump endpoint is restricted to the platform Super Admin.
- **RBAC** — permissions are enforced in backend gates for the core management modules; the
  frontend hides UI elements, but the backend remains authoritative.

See [SECURITY.md](SECURITY.md) for the full policy and how to report a vulnerability.

---

## 🌍 Localization

The UI ships with English, Dari (Persian) and Pashto translations and RTL layout support.
The active language is stored per user. Translation files live under `resources/js/`.

---

## 📦 Deployment (production)

1. Set `APP_ENV=production`, `APP_DEBUG=false` and generate a fresh `APP_KEY`.
2. Use MySQL, run `php artisan migrate --force`.
3. Build the frontend (`npm ci && npm run build`).
4. Configure a queue worker if you use queued jobs:
   `php artisan queue:work --tries=3`.
5. Serve `public/` from your web server (Nginx/Apache) with PHP-FPM.
6. Set up HTTPS, storage symlink (`php artisan storage:link`) and scheduled tasks
   (`php artisan schedule:work` or a cron entry pointing to `schedule:run`).
7. **Change or remove the seeded demo credentials**.
8. Never commit a real `.env` file.

---

## 🧭 API overview

- All `/api/*` routes return JSON.
- Authenticated routes use a Sanctum bearer token: `Authorization: Bearer <token>`.
- Public routes (no token): `POST /api/login`, `GET /api/publications/public`,
  `POST /api/orders`, comments/likes on public products, `GET /api/customers/check-email`.
- Authenticated routes are scoped to the caller's tenant automatically.

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) first. In short:

1. Fork the repository and create a feature branch.
2. Keep changes minimal and preserve existing behavior.
3. Add regression tests for security fixes.
4. Run `php artisan test` and `npm run build` before submitting.
5. Open a pull request with a clear description.

---

## 🛡 Security reporting

Found a vulnerability? Do **not** open a public issue. Email the maintainer or use GitHub's
private security advisory (see [SECURITY.md](SECURITY.md)).

---

## ⚖️ License

Bazarnet ERP is open-source software released under the [MIT license](LICENSE).
