# Analytics Phase 2 — Session & Event Tracking

**Status: implemented**

Phase 1 analytics (`GET /api/admin/analytics`) uses transactional data.
Phase 2 adds storefront session/event tracking via `POST /api/analytics/collect`.

## Planned tables

### `store_sessions`

| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| session_id | VARCHAR(64) UNIQUE | Client-generated UUID in localStorage |
| user_id | INT NULL | Logged-in user |
| referrer | VARCHAR(500) NULL | document.referrer |
| utm_source | VARCHAR(100) NULL | |
| utm_medium | VARCHAR(100) NULL | |
| utm_campaign | VARCHAR(100) NULL | |
| device_type | ENUM('mobile','desktop','tablet','other') | Parsed from user_agent |
| country | VARCHAR(80) NULL | Geo from IP (optional) |
| city | VARCHAR(80) NULL | |
| landing_path | VARCHAR(300) | First page path |
| started_at | DATETIME | |
| last_seen_at | DATETIME | |

### `store_events`

| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| session_id | VARCHAR(64) | FK to store_sessions.session_id |
| event_name | VARCHAR(50) | page_view, add_to_cart, begin_checkout, purchase |
| path | VARCHAR(300) NULL | |
| product_id | INT NULL | |
| metadata | JSON NULL | quantity, cart value, etc. |
| created_at | DATETIME | |

## Planned API

- `POST /api/analytics/collect` — public, rate-limited event ingest
- Extend `analyticsController.getAnalytics` to merge `phase2` object with real series

## Frontend tracker

`frontend/src/utils/analyticsTracker.js`:

- Create/reuse `session_id` in localStorage
- On route change: `page_view`
- On add to cart / checkout start: fire corresponding events
- Copy UTM params from URL on first visit; persist on session

## Order attribution

At checkout completion, copy `referrer` / UTM fields from session onto `orders` (new JSON column `attribution`).

## Widgets unlocked in Phase 2

- Sessions over time
- Conversion rate over time / breakdown funnel
- Sessions by device type
- Sessions by location (visit geo)
- Sessions by referrer / social referrer
- Total sales by social referrer
- Total sales by referrer / referring channel

POS widgets remain empty (no POS integration).
