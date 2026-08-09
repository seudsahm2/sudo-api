# Admin Dashboard Tracker

Living plan for the secure admin management dashboard. Update this document whenever a milestone changes.

## Goal

Build a highly secure admin dashboard for CRUD operations, search, filtering, sorting, bulk actions, auditability, and safe control of all managed database data.

## Current Status

- Backend content is normalized into dedicated tables for site, home, services, work, and lab sections.
- Both `sudo_api` and `sudo_api_e2e` are synced and seeded.
- Request-path logging middleware is active in the API terminal.
- Phase 1 backend security baseline is implemented and passing lint/build.
- Phase 2 has working admin entity slices for site config, primary navigation, inquiry project types, inquiry budget ranges, home manifesto, home ecosystem tags, home featured projects, home stats, services, work projects, work filters, service pipeline steps, lab principles, lab matrix rows, and lab specs.
- Admin dashboard UI is now production-ready for Phase 3 scope: login/session management, secure shell layout, collection editor routes, dedicated record detail pages, and richer table controls (server-driven sorting, pagination, and page-size chooser) are live.
- Admin dashboard UI includes a dedicated audit activity view with server-side filters and pagination via `/admin/audit`.
- Admin auth is now cookie-backed on the frontend with HttpOnly session cookies, while the backend still enforces session revocation, refresh-token rotation, audit logging, and 2FA.
- Sensitive admin delete and restore actions now use a shared approval dialog before the mutation runs.
- Hard delete is now protected at the backend data layer for top-level content entities; admin UI explicitly exposes archive/restore only.
- Optimistic concurrency control is active for the exposed Phase 2 content slices via `expectedUpdatedAt` checks on update flows.
- Update DTOs now enforce non-empty PATCH payloads for mutable fields, permission denials return explicit missing-permission errors, and update payloads use explicit field allowlists.
- Content backup and restore scripts can export/import the managed content tables as JSON snapshots.

## What Is Already Done

- Replaced the single JSON content approach with table-per-domain storage.
- Added Prisma models for content sections and related child tables.
- Added seeding for both app and test databases.
- Verified content endpoints return DB-backed structured data.
- Verified terminal request logging.

## Admin Dashboard Plan

### Phase 1: Security and Access Control

- [x] Add admin identity models.
- [x] Add roles and permissions.
- [x] Add admin sessions and refresh token rotation.
- [x] Add 2FA for admin users.
- [x] Add audit logging for every mutation.
- [x] Add route guards for all admin API endpoints.

### Phase 2: Admin Data APIs

- [x] Build a dedicated admin API namespace.
- [x] Add list endpoints with server-side pagination.
- [x] Add search, filtering, and multi-column sorting.
- [x] Add create, update, soft delete, and restore flows.
- [x] Add bulk action endpoints.
- [x] Add metadata endpoints so the UI can render forms and tables safely.

### Phase 3: Dashboard UI

- Admin login and session management are in place.
- The secure layout with sidebar navigation is in place.
- Entity table pages for the current content domains are in place through the generic editor routes.
- Advanced table controls are now exposed in the UI: search, status filtering, server-driven sort controls, pagination, and page-size chooser are available in the collection editor.
- Record editing now supports dedicated detail pages via `/admin/detail` in addition to inline editing.
- Audit log and activity views are now in the frontend via the `/admin/audit` route backed by a permission-gated `/api/admin/audit` API.

### Phase 4: Governance and Safety

- [x] Add approval flows for sensitive operations.
- [x] Add hard-delete protection.
- [x] Add optimistic concurrency control.
- [x] Add validation, permission checks, and field allowlists.
- [x] Add backups and restore procedures.

### Phase 5: Testing and Verification

- Add auth and permission tests.
- Add CRUD and bulk-action tests.
- Add search/filter/sort correctness tests.
- Add security regression tests.
- Add performance checks for large tables.

## Next Steps

1. Expand tests for CRUD, bulk actions, permission gates, and safety regressions.

## Update Rule

- Update `Current Status` after each completed milestone.
- Append decisions and blocked items here instead of losing them in chat.
- Keep the doc short, factual, and current.
