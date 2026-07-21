---
name: create-edit-parity-audit
description: Compare Create.jsx and Edit.jsx form fields across ERP modules to find field mismatches and inconsistencies
---

# Create/Edit Page Parity Audit

Audit Create.jsx and Edit.jsx page pairs across ERP modules to find fields that exist in one but not the other.

## When to use

- After adding new fields to a Create form, verify they were also added to the Edit form
- Periodic audit to catch drift between Create and Edit pages
- When user reports a field works on create but not on edit

## Procedure

1. **List all modules** under `resources/js/pages/` that have both `Create.jsx` and `Edit.jsx`.

2. **For each module pair**, compare:
   - Form state initialization (`useState` with form field names) — which fields are initialized in Create vs Edit
   - Form field definitions (inputs, selects, textareas, checkboxes, radio buttons)
   - `useEffect` that loads data for Edit (what fields are populated from the API response)
   - Submit handler payload — what fields are sent to the backend in each case
   - Any conditional rendering that differs between Create and Edit

3. **Report format** — a table per module:

   ```
   ## ModuleName
   | Field | In Create | In Edit | Notes |
   |-------|-----------|---------|-------|
   | field_name | ✅ | ❌ | Missing from Edit |
   ```

4. **Summary** at the end: count of modules with mismatches, total missing fields.

## Scope

- Default: all modules under `resources/js/pages/`
- User may specify a subset (e.g., "just Customer and Supplier")
- Also check tab files under `resources/js/pages/ModuleName/tabs/` if they exist

## What to compare

Focus on these aspects:
- **Form fields**: inputs, selects, textareas, date pickers, checkboxes, radio buttons
- **Form sections**: grouped sections (e.g., "Basic Info", "Accounting", "Address")
- **Conditional fields**: fields that appear based on other field values
- **Validation**: required field markers, client-side validation rules
- **Default values**: initial form state differences

## Notes

- Create.jsx often has more fields than Edit.jsx (e.g., type selectors shown only on create)
- Some differences are intentional (e.g., status fields only editable on certain pages)
- Flag only unintentional mismatches — where a field was added to Create but Edit was not updated
- This project uses React with Vite; pages are JSX files
