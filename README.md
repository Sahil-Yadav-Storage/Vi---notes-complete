# Vi-Notes

Vi-Notes is a full-stack typing-session tracker built as a TypeScript monorepo. It captures editor interaction events, stores normalized keystroke timelines, and computes session analytics when a session is closed.

This README documents what is currently implemented in the repository.

## What Has Been Implemented

- [x] Monorepo workspace with three packages: client, server, shared.
- [x] React + Vite frontend with login/register flow and editor UI.
- [x] Theme toggle (dark/light) persisted in localStorage.
- [x] Axios API client with automatic access-token refresh and request retry.
- [x] Express backend with MongoDB persistence via Mongoose.
- [x] JWT access token + refresh token authentication system.
- [x] Refresh token rotation with hashed token persistence and revocation tracking.
- [x] Auth rate limiting for register and login endpoints.
- [x] Protected session endpoints using bearer-token middleware.
- [x] Keystroke ingestion pipeline that strips raw text content from payloads.
- [x] Keystroke timing normalization (raw + smoothed timestamps/durations).
- [x] Session close operation that computes and stores analytics snapshot.
- [x] Shared type contracts consumed by both client and server.

## Repository Structure

| Path         | Purpose                                                     |
| ------------ | ----------------------------------------------------------- |
| client       | Frontend app (React 19, Vite 8, Axios)                      |
| server       | API server (Express 5, Mongoose, JWT auth)                  |
| shared       | Shared TypeScript contracts for auth/session/keystroke data |
| package.json | Root workspace scripts for dev, build, typecheck            |

## End-to-End Flow

1. User logs in on the client.
2. Server verifies credentials and returns access token; refresh token is set as an HTTP-only cookie.
3. Client records typing events in the editor: key down/up, paste, and inferred edit diffs.
4. Client debounces sync calls to create or append to a session.
5. Server validates and normalizes event timing before persistence.
6. On page hide/unmount, client flushes pending events and calls close-session endpoint.
7. Server computes analytics and stores them in the session document.

## Backend Details

### Authentication and Session Security

- Access token: signed with JWT_SECRET, expires using JWT_ACCESS_EXPIRES_IN.
- Refresh token: signed with JWT_REFRESH_SECRET, includes tokenId.
- Refresh tokens are hashed (SHA-256) before persistence.
- Rotation marks old refresh token as revoked and links replacement token hash.
- Refresh cookie configuration:
  - httpOnly enabled
  - secure enabled only in production
  - sameSite=lax
  - path=/api/auth
- Login and registration endpoints have rate limits:
  - Login: max 10 requests / 15 minutes
  - Register: max 5 requests / 15 minutes

### Keystroke Capture Model

The system stores event types:

- down
- up
- paste
- edit

Paste and edit events include structural metadata such as paste length and edit ranges. Raw text content fields are explicitly removed at middleware level before processing.

### Timing Normalization

When keystrokes are saved:

- rawTimestamp/rawDuration preserve original client timings.
- timestamp/duration store smoothed values.
- Append operations seed smoothing windows from prior raw values to avoid over-flattening across long sessions.

### Analytics Computed on Session Close

When a session is closed, analytics include:

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

## API Endpoints

Base URL (default local): http://127.0.0.1:3001

### Auth

| Method | Endpoint           | Auth            | Notes                                           |
| ------ | ------------------ | --------------- | ----------------------------------------------- |
| POST   | /api/auth/register | No              | Registers new user                              |
| POST   | /api/auth/login    | No              | Returns accessToken and sets refresh cookie     |
| POST   | /api/auth/refresh  | Cookie          | Rotates refresh token, returns new accessToken  |
| POST   | /api/auth/logout   | Cookie optional | Revokes refresh token if present, clears cookie |

### Sessions

All session routes require Authorization: Bearer <accessToken>

| Method | Endpoint               | Notes                                 |
| ------ | ---------------------- | ------------------------------------- |
| POST   | /api/session           | Creates new session from keystrokes   |
| PATCH  | /api/session/:id       | Appends keystrokes to active session  |
| GET    | /api/session           | Lists user sessions (newest first)    |
| GET    | /api/session/:id       | Gets a single user session            |
| POST   | /api/session/:id/close | Closes session and persists analytics |

## Shared Contracts

The shared package exports:

- Keystroke
- SessionUpsertInput
- SessionAnalytics
- CloseSessionResponse
- AccessTokenResponse

This keeps client-server request/response typing consistent.

## Local Development

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB instance

## Install

Run from repository root:

```bash
npm install
```

## Configure Environment

Create server environment file:

- Copy server/.env.example to server/.env
- Fill in secure values

Expected variables:

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

## Run Development Servers

From repository root:

```bash
npm run dev
```

- Client runs on Vite default port (typically 5173)
- Server runs on configured PORT (default 3001)

## Type Check

```bash
npm run typecheck
```

## Build

Currently implemented root build target compiles client bundle:

```bash
npm run build
```

## Notes on Current Scope

- There is no automated test suite configured yet.
- Root build script currently targets client package build only.
- Session close analytics are computed once and returned as alreadyClosed when re-closed.

## Tech Stack

- Frontend: React 19, Vite 8, TypeScript, Axios
- Backend: Node.js, Express 5, TypeScript, Mongoose, Zod
- Auth/Security: bcrypt, JWT, refresh-token rotation, express-rate-limit
- Shared Contracts: workspace package with common TypeScript types

## License

No license file is currently present in this repository.
