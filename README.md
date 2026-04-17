# Farm Domain Manager

Internal inventory tool for managing `servers` and `domains` with an operational dashboard, import/export, and bilingual UI.

## Stack

- Next.js 16 App Router
- React 19
- MongoDB via Docker or Atlas
- Tailwind CSS 4

## Local Setup

1. Start Docker Desktop
2. Copy env values if needed

```bash
cp .env.example .env
```

Authentication is enabled by default. Set `AUTH_ENABLED="false"` only in trusted internal or local environments to bypass login with a synthetic admin session.

3. Start MongoDB

```bash
pnpm db:up
```

4. Verify MongoDB connection

```bash
pnpm db:check
```

5. Run the app

```bash
pnpm dev
```

## Auth Toggle

- `AUTH_ENABLED="true"` or unset: standard NextAuth login is enforced.
- `AUTH_ENABLED="false"`: auth is bypassed and the app runs as an internal admin user.
- Keep `AUTH_ENABLED` enabled in production or any untrusted environment.# farm-domain
