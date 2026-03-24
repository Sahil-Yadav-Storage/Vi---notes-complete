# Vi-Notes

Vi-Notes is an authenticity verification platform for writing. It combines live keyboard-behavior tracking with session-level analysis to help distinguish natural human composition from suspicious, non-human writing patterns.

This repository contains the current production-ready implementation of the core system as a TypeScript monorepo.

## Project Vision

The original idea behind Vi-Notes is simple: authenticity is stronger when content and behavior agree.

- Human writing usually includes pauses, rewrites, bursts, hesitation, and corrections.
- AI-assisted or pasted content can show mismatches between the text and the way it was produced.
- Vi-Notes captures behavioral metadata in real time and pairs it with session analytics for verifiable authorship evidence.

Mentor: Jinal Gupta

## What Was Requested Originally

The initial feature requests defined five core milestones:

1. Basic writing editor
2. User registration and login
3. Keystroke timing capture (without storing typed characters)
4. Paste detection
5. Save writing sessions with typing metadata

## Original Features and How They Are Implemented

### 1) Basic Writing Editor

Implemented.

- A distraction-free textarea-based editor is provided in the client.
- The editor focuses on plain text composition without formatting controls.
- Input events are captured in the background while keeping writing flow uninterrupted.

### 2) User Login and Registration

Implemented.

- Email/password registration and login are supported.
- The server issues JWT access tokens and HTTP-only refresh cookies.
- The client supports automatic token refresh during active usage.

### 3) Capture Keystroke Timing

Implemented.

- The client records key down and key up timestamps.
- Press duration is computed from down/up timing when available.
- Only behavioral metadata is stored, never the actual typed characters.
- On the backend, normalization keeps both raw and smoothed timing values.

### 4) Detect Pasted Text

Implemented.

- Paste events are detected directly from editor paste handlers.
- Each event stores paste length and selection range metadata.
- Additional tracking marks whether pasted segments were edited later.

### 5) Save Writing Session Data

Implemented.

- Sessions are created and incrementally updated via authenticated API routes.
- Keystrokes are persisted in MongoDB under the owning user.
- Sessions can be listed, fetched by id, and formally closed with analytics.

## Additional Features Implemented Beyond Original Scope

### Auth-Gated UI and Routing

- Separate routes for auth and dashboard: /login, /register, /dashboard
- Guest-only and protected route guards to enforce access control
- Navbar and writing dashboard shell render only for authenticated users
- Root route redirects by auth state for predictable entry flow

### UI System and Theme Updates

- Tailwind CSS tooling and shadcn-style component primitives integrated in client
- New app header/navbar with Dashboard, theme toggle, Contact, and Logout actions
- Light mode base background: #F8F8F6
- Dark mode base background: #22221F (static, no gradient overlay)
- Guest pages use tighter top spacing for improved visual centering

### Authentication and Security Hardening

- Refresh token rotation with server-side revocation tracking
- Hashed refresh token persistence (SHA-256)
- Login and registration rate limiting
- Protected session endpoints via bearer-token middleware

### Privacy and Data Protection

- Keystroke sanitization middleware strips content fields from payloads
- Event model stores structural and timing metadata, not raw text keystrokes
- Cookie security defaults include httpOnly and sameSite protections

### Reliability and Sync Resilience

- Durable client-side keystroke queue in IndexedDB
- Offline-first buffering with automatic replay on reconnect
- Sync retries with exponential backoff and user-facing error toasts
- Deferred session close when unsynced data remains

### Session Intelligence and Analysis

- Session close computes analytics snapshot and stores it with the session
- Metrics include pause frequency, edit ratio, paste ratio, and WPM variance
- Re-closing an already closed session returns prior analytics safely

### Developer Experience

- Monorepo workspaces: client, server, shared
- Shared TypeScript contracts used across frontend and backend
- Type-safe API payloads and response contracts

## High-Level Architecture

| Layer    | Stack                                  | Responsibility                                           |
| -------- | -------------------------------------- | -------------------------------------------------------- |
| Client   | React, Vite, TypeScript, Axios         | Editor UI, event capture, auth, sync scheduling          |
| Server   | Node.js, Express, TypeScript, Mongoose | Auth, session APIs, validation, normalization, analytics |
| Shared   | TypeScript workspace package           | Cross-package auth/session/keystroke types               |
| Database | MongoDB                                | Users, refresh tokens, sessions, analytics               |

## End-to-End Flow

1. User signs in and gets an access token plus refresh cookie.
2. Editor captures behavioral events: down, up, paste, edit.
3. Events are buffered locally and synced in batches.
4. Server validates, sanitizes, normalizes, and persists events.
5. On close, server computes analytics and stores final session snapshot.
6. Session evidence can be fetched later for verification/reporting.

## Event and Analytics Model

### Captured Event Types

- down
- up
- paste
- edit

### Analytics Computed at Session Close

- approximateWpmVariance
- pauseFrequency
- editRatio
- pasteRatio
- totalInsertedChars
- totalDeletedChars
- finalChars
- totalPastedChars
- pauseCount
- durationMs
- version

## API Overview

Base URL (local default): http://127.0.0.1:3001

### Auth

| Method | Endpoint           | Auth                    | Purpose                                         |
| ------ | ------------------ | ----------------------- | ----------------------------------------------- |
| POST   | /api/auth/register | No                      | Create user account                             |
| POST   | /api/auth/login    | No                      | Login and issue tokens                          |
| POST   | /api/auth/refresh  | Refresh cookie          | Rotate refresh token and issue new access token |
| POST   | /api/auth/logout   | Optional refresh cookie | Revoke token and clear cookie                   |

### Sessions

All session endpoints require Authorization: Bearer <accessToken>

| Method | Endpoint               | Purpose                             |
| ------ | ---------------------- | ----------------------------------- |
| POST   | /api/session           | Create a new session                |
| PATCH  | /api/session/:id       | Append keystrokes to active session |
| GET    | /api/session           | List user sessions                  |
| GET    | /api/session/:id       | Get session details                 |
| POST   | /api/session/:id/close | Close session and persist analytics |

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- MongoDB

### Installation

From repository root:

```bash
npm install
```

### Environment Setup

Create server environment config:

1. Copy server/.env.example to server/.env
2. Set secure values for secrets and database URI

Supported server environment variables:

| Name                   | Required | Default               |
| ---------------------- | -------- | --------------------- |
| MONGODB_URI            | Yes      | None                  |
| JWT_SECRET             | Yes      | None                  |
| JWT_REFRESH_SECRET     | Yes      | None                  |
| JWT_ACCESS_EXPIRES_IN  | No       | 15m                   |
| REFRESH_TOKEN_TTL_DAYS | No       | 7                     |
| REFRESH_COOKIE_NAME    | No       | refreshToken          |
| CLIENT_ORIGIN          | No       | http://127.0.0.1:5173 |
| NODE_ENV               | No       | development           |
| PORT                   | No       | 3001                  |

Client environment variables (optional):

| Name                            | Purpose             | Default               |
| ------------------------------- | ------------------- | --------------------- |
| VITE_API_BASE_URL               | API base URL        | http://127.0.0.1:3001 |
| VITE_KEYSTROKE_SYNC_INTERVAL_MS | Sync interval in ms | 5000                  |

### Run in Development

From repository root:

```bash
npm run dev
```

- Client: Vite dev server (typically 5173, auto-falls back if busy)
- Server: Express API (default 3001)

### Typecheck

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

## Current Limitations

- No automated test suite is configured yet.
- Root build script currently targets client build output.
- Current application is web-first; native desktop capture layers are not yet added.

## Upcoming Scope

- Richer authenticity reports and visual evidence summaries
- More advanced anomaly detection pipelines
- Progressive adaptation to evolving AI writing assistance patterns
- Native desktop packaging and deeper OS-level telemetry hooks

## Tech Stack

- Frontend: React, TypeScript, Vite, Axios
- Frontend UI: Tailwind CSS and shadcn-style component patterns
- Backend: Node.js, Express, TypeScript, Mongoose, Zod
- Auth and Security: bcrypt, JWT, refresh token rotation, express-rate-limit
- Shared Contracts: workspace package for common TypeScript types

## Repository Structure

| Path         | Purpose                               |
| ------------ | ------------------------------------- |
| client       | Frontend app and editor experience    |
| server       | API, auth, sessions, analytics logic  |
| shared       | Shared type contracts across packages |
| package.json | Root workspace scripts                |

## License

No license file is currently present in this repository.
