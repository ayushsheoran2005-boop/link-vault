# LinkVault

A self-hosted URL shortener with account-based link management, click analytics, and an optional Redis cache.

## Requirements

- Node.js 20.19+
- PostgreSQL 14+
- Redis is optional; the application falls back to PostgreSQL when it is not configured or unavailable.

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and a unique `SESSION_SECRET` (at least 32 characters). Set `PUBLIC_BASE_URL` to the URL where the API will be reachable.
2. Create the PostgreSQL database named in `DATABASE_URL` (for example, `psql -U postgres -c "CREATE DATABASE linkvault;"`).
3. Install dependencies and initialize the schema:

   ```sh
   npm install
   npm run db:generate
   npm run db:migrate
   ```

4. Start the API and frontend:

   ```sh
   npm run dev
   ```

   Open `http://localhost:5173`. The Vite development server proxies `/api` and short-link routes to the API at `http://localhost:4000`.

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
# Edit .env and replace SESSION_SECRET, DATABASE_URL credentials as needed.
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Generate a session secret with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Run the API and Vite frontend |
| `npm run build` | Build both production applications |
| `npm run typecheck` | Type-check client and server |
| `npm run lint` | Run ESLint on client and server |
| `npm test` | Run unit and component tests |
| `npm run db:migrate` | Apply development Prisma migrations |
| `npm run db:deploy` | Apply migrations in production |

Production setup: configure all required environment variables, run `npm ci`, `npm run db:generate`, `npm run db:deploy`, and `npm run build`. Serve `client/dist` using a static server and run `npm run start -w server`. Configure the frontend host to proxy `/api` and short-code paths to the API, or deploy both behind one origin. HTTPS is required in production for secure session cookies.

## Environment variables

See `.env.example`. `DATABASE_URL`, `SESSION_SECRET`, `CLIENT_ORIGIN`, and `PUBLIC_BASE_URL` are required. `REDIS_URL` is optional.
