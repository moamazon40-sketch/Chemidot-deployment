# Chemidot Workspace

## Overview

Chemidot is a B2B chemical marketplace for the Middle East (Saudi Arabia focus). pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + wouter + TanStack Query + Tailwind CSS + shadcn/ui + @tanstack/react-table
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec`)
- **Build**: esbuild (CJS bundle)

## Dashboard Layout (Akhdar-inspired)

`DashboardLayout.tsx` uses the shadcn `Sidebar` primitive system (`SidebarProvider`, `Sidebar collapsible="icon"`, `SidebarInset`) to match the Akhdar admin dashboard pattern:

- **Collapsible icon sidebar**: collapses to icon-only mode with tooltips; expands to full labels. Uses `collapsible="icon"` prop.
- **Role-grouped nav**: Admin gets Management + Account groups; Buyer gets Sourcing + Account; Supplier gets Sales + Account.
- **TopNav**: sticky header with `SidebarTrigger`, greeting, role badge, and avatar dropdown (profile settings + logout).
- **DataTable** (`src/components/ui/data-table.tsx`): reusable TanStack Table wrapper with sorting, column visibility toggle, search filter, and built-in pagination. Used in Admin console user management.

## Artifacts

- `artifacts/chemidot` — React + Vite frontend (preview path `/`)
- `artifacts/api-server` — Express 5 API server (preview path `/api`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Seed Accounts

All passwords: `password123`
- `admin@chemidot.com` — admin
- `buyer1@example.com`, `buyer2@example.com` — buyers
- `supplier1@example.com`, `supplier2@example.com`, `supplier3@example.com` — suppliers

## Pages & Routes

### Public
- `/` — Landing page (full-bleed hero, image-backed category cards, projects teaser, collective orders highlight)
- `/marketplace` — Product catalog (full-bleed image hero, image-backed industry cards, filters, search)
- `/marketplace/:id` — Product detail + Contact Supplier dialog
- `/suppliers` — Supplier directory with search/filter
- `/suppliers/:id` — Brand Shop (Knowde-style: left sidebar nav, 5 tabs: Storefront/Products/Brands/Documents/Experts)
- `/collective-orders` — Collective order listings
- `/collective-orders/:id` — Collective order detail + join form
- `/about` — About page (hero, stats, mission/vision, values, leadership team, timeline, office photos)
- `/projects` — Projects & Case Studies list (image hero, industry filter pills, project card grid)
- `/projects/:id` — Project/Case Study detail (hero image, summary, chemicals used, full article, CTA)
- `/auth/login`, `/auth/register` — Authentication

### Dashboard (authenticated)
- `/dashboard` — Home/overview
- `/dashboard/rfqs` — RFQ list + Create RFQ modal (buyer) / Submit quotation (supplier)
- `/dashboard/rfqs/:id` — RFQ detail + accept quotation (buyer) / submit quotation (supplier)
- `/dashboard/orders` — Order tracking
- `/dashboard/messages` — Conversations + messaging
- `/dashboard/collective` — Collective order participations (buyer) / listings + Create modal (supplier)
- `/dashboard/products` — Product management (supplier only)
- `/dashboard/settings` — Profile settings + change password
- `/dashboard/admin` — Admin panel (admin only)

## API Endpoints (key)

- `POST /api/auth/login` — JWT login
- `GET /api/auth/me` — Current user
- `PUT /api/auth/profile` — Update profile
- `POST /api/auth/change-password` — Change password
- `GET/POST /api/rfqs` — List/create RFQs
- `GET /api/rfqs/:id` — RFQ detail with quotations
- `POST /api/rfqs/:id/quotations` — Submit quotation
- `POST /api/rfqs/:id/quotations/:qid/accept` — Accept quotation → creates order
- `GET/POST /api/messages` — Conversations
- `POST /api/messages/start` — Start new conversation with supplier
- `GET /api/messages/:id` — Get messages in conversation
- `POST /api/messages/:id` — Send message
- `GET/POST /api/collective-orders` — List/create collective orders
- `POST /api/collective-orders/:id/join` — Join a collective order
- `GET /api/suppliers` — Supplier directory
- `GET /api/suppliers/:id` — Supplier profile
- `GET /api/suppliers/:id/brands` — Supplier brand list
- `GET /api/suppliers/:id/documents` — Supplier document list
- `GET /api/suppliers/:id/experts` — Supplier expert list
- `GET /api/products` — Product catalog
- `GET/POST /api/orders` — Orders
- `GET /api/notifications` — User notifications
- `GET /api/projects` — Project/case study list
- `GET /api/projects/:id` — Single project detail

## DB Schema (lib/db/src/schema)

Tables: `users`, `suppliers`, `products`, `categories`, `rfqs`, `quotations`, `orders`, `conversations`, `messages`, `collective_orders`, `collective_order_participants`, `notifications`, `reviews`, `product_reviews`, `supplier_brands`, `supplier_documents`, `supplier_experts`, `projects`

Notable: `orders` table has nullable `productId`, and has `rfqId`, `quotationId`, `productName`, `deliveryAddress` columns.

## Production Hardening

- **Security headers**: Helmet middleware on all responses
- **Rate limiting**: Global 300 req/15min on `/api`, strict 20 req/15min on `/api/auth/login` and `/api/auth/register`
- **Body size limits**: `express.json({ limit: "1mb" })` and `express.urlencoded({ limit: "1mb" })`
- **CORS**: Configurable via `ALLOWED_ORIGINS` env var (comma-separated), defaults to permissive for dev
- **JWT secret**: `SESSION_SECRET` env var is **required** — server throws on startup if missing (no hardcoded fallback)
- **Global error handler**: All unhandled errors caught by Express error middleware, logged via pino, returns 500
- **Async error handling**: All route handlers wrapped in `asyncHandler()` to catch DB/async errors gracefully
- **Authorization checks**: Product update/delete verifies supplier ownership; message routes verify conversation membership; RFQ detail/quotation endpoints enforce buyer ownership; order detail checks buyer/supplier/admin access; quotation acceptance verifies quotation belongs to the RFQ
- **File upload security**: Multer file filter restricts to JPEG/PNG/WebP/GIF/PDF by both MIME type and extension
- **Search input sanitization**: `%`, `_`, `\` characters escaped in ILIKE patterns to prevent wildcard abuse
- **Database indexes**: 30+ indexes added across products, suppliers, rfqs, orders, messages, notifications, reviews, collective_orders tables for query performance
- **Dashboard stats**: All Math.random() and hardcoded fake values replaced with real database queries

## Auth Pattern

JWT in `Authorization: Bearer <token>` header. Token stored in `localStorage` as `chemidot_token`. Middleware in `artifacts/api-server/src/middlewares/auth.ts`: `requireAuth`, `requireRole("admin"|"supplier"|"buyer")`.

## Orval Hook Patterns

- Query hooks: `useListXxx(params)`, `useGetXxx(id, { query: { enabled: !!id } as any })`
- Mutation hooks: `useCreateXxx()`, `useDeleteXxx()` — call `.mutate({ id, data: {...} })` (id + data in same object)
- `useSendMessage()` → `.mutate({ conversationId, data: { content } })`
- `useJoinCollectiveOrder()` → `.mutate({ id, data: { quantity, deliveryDestination } })`

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
