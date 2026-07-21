---
name: erp-module-audit
description: Structured deep-dive exploration of an ERP module covering models, services, controllers, routes, migrations, and frontend pages
---

# ERP Module Audit

Perform a structured exploration of a specific ERP module. Read-only investigation — no code changes.

## When to use

- User asks to "explore", "audit", "check", or "understand" a specific module
- Before implementing changes to understand existing architecture
- When onboarding to a module's codebase
- When user asks "how does X work?" or "check this and explain"

## Procedure

### Step 1: Identify scope
Determine which module to audit. Common modules in this ERP:
- Purchase (RFQ, Purchase Order, Bill, Purchase Return)
- Sale (Quotation, Invoice, Sale Order, Sale Return)
- Accounting (Chart of Accounts, Journal Entries, Account Balances)
- Inventory (Stock Balances, Stock Movements, Stock Transfers, Stock Adjustments, Warehouse Towers)
- Fixed Assets
- Expenses
- Customer / Supplier / Employee / Package Master / Service

### Step 2: Backend layer (read-only)
For the target module, find and read:
1. **Models** (`app/Models/`) — relationships, fillable fields, constants, scopes, accessors/mutators
2. **Services** (`app/Services/`) — public methods, business logic, journal entry triggers
3. **Controllers** (`app/Http/Controllers/`) — CRUD methods, authorization, request validation
4. **Routes** (`routes/api.php`) — API endpoints registered for this module
5. **Migrations** (`database/migrations/`) — table structure, indexes, foreign keys
6. **Accounting integration** — check if the module creates journal entries (look for `JournalEntryService::post()` or `postForXxx()` calls)

### Step 3: Frontend layer (read-only)
For the target module, find and read:
1. **Index page** (`resources/js/pages/Module/Index.jsx`) — table columns, filters, actions (View, Edit, Delete, etc.), branch filtering
2. **Create page** (`resources/js/pages/Module/Create.jsx`) — form fields, item type handling, submit payload
3. **Edit page** (`resources/js/pages/Module/Edit.jsx`) — form fields, data loading, differences from Create
4. **Show page** (`resources/js/pages/Module/Show.jsx`) — detail view, available actions, tabs
5. **Tab files** (`resources/js/pages/Module/tabs/`) — related sub-lists (e.g., Customer has InvoicesTab, QuotationsTab, etc.)
6. **Routes** (`resources/js/routes.jsx`) — frontend route registration

### Step 4: Cross-cutting concerns
Check for:
- **Gate::authorize** calls — which methods have permission checks
- **Branch filtering** — how the module handles branch_id (nullable vs required)
- **Status lifecycle** — draft → confirmed → posted → paid, etc.
- **Document numbering** — how document numbers are generated (branch+type with lockForUpdate)
- **Email/notification** — any SendEmail or notification triggers
- **Stock impact** — does this module move stock (StockService::record)?
- **Payment handling** — any payment recording or modal integration

### Step 5: Report
Produce a structured report:

```
## [ModuleName] Module Audit

### Backend
- **Model**: [key fields, relationships, constants]
- **Service**: [public methods, business logic summary]
- **Controller**: [CRUD methods, authorization status]
- **Routes**: [list of API endpoints]
- **Migrations**: [table structure summary]
- **Accounting**: [which journal entry methods are triggered]

### Frontend
- **Index**: [columns, filters, action buttons]
- **Create**: [form fields, item type handling]
- **Edit**: [form fields, differences from Create]
- **Show**: [available actions, tabs]
- **Routes**: [frontend route paths]

### Cross-cutting
- **Permissions**: [Gate::authorize usage]
- **Branch handling**: [nullable branch_id pattern]
- **Status flow**: [status lifecycle]
- **Stock impact**: [yes/no, which movements]
- **Payment**: [payment integration details]

### Issues found
- [list any bugs, inconsistencies, or missing features]
```

## Project conventions

- **Unified document tables**: Sale serves quotation/order/invoice; Purchase serves RFQ/PO/Bill via document_type column
- **Account config keys**: Always resolve via `AccountConfiguration::getAccount($key)`, never hardcode account IDs
- **Branch filtering**: Use `->when($branchId, fn($q) => $q->where('branch_id', $branchId))` for nullable branch
- **Polymorphic items**: purchase_items use item_type + item_id; sale_items use Laravel morphs()
- **No events/listeners/queues**: All processing synchronous in HTTP request lifecycle
- **No Form Requests or DTOs**: Validation inline in controllers
- **Discount**: Percentage (0-100), converted internally by TaxCalculationService

## Example usage

User: "explore the accounting module"
Agent: Execute Steps 1-5 for Chart of Accounts, Journal Entries, Account Balances

User: "check why the purchase return doesn't affect stock"
Agent: Execute Steps 2-4 focused on PurchaseReturn model, its controller, stock impact, and accounting
