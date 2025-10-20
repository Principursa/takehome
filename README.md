# Project for Nika.Finance

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Router, Hono, TRPC, and more.

## Stack Used

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Hono** - Lightweight, performant server framework
- **tRPC** - End-to-end type-safe APIs
- **Bun** - Used as Runtime, Bundler, Test Runner and File server
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system
- **PGLite** - In memory postgres instance for easily running integration tests
- **Caddy Docker Proxy** - Docker based reverse proxying. No Caddy or Nginx files laying around the repo
- **Github Actions** - For CI/CD, deployments to vps and automatically running tests
- **Cloudflare** - DNS and Proxying
- **NixOS** - Hetzner Based Linux NixOS instance for easy server and user init
- **Docker** - Orchestration of separate services

## Getting Started

First, install the dependencies:

```bash
bun install
```
## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:
```bash
bun db:push
```


Then, run the development server:

```bash
bun dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).







## Project Structure

```
takehome/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   └── server/      # Backend API (Hono, TRPC)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications
- `bun dev:web`: Start only the web application
- `bun dev:server`: Start only the server
- `bun check-types`: Check TypeScript types across all apps
- `bun db:push`: Push schema changes to database
- `bun db:studio`: Open database studio UI
- `bun test`: Run Tests

## API Documentation
- GET /api/referral/generate - generates unique code and ensures idempotency
- GET /api/referral/getMyCode - get authenticated user's referral code
- GET /api/referral/validateCode - validates referral code for registration 
- POST /api/referral/register - register user with referral code
- GET /api/referral/trades - Get trades with commision breakdown
- GET /api/referral/network - Get user's referral network
- GET /api/referral/getDownlineTree - Get detailed downline tree
- GET /api/referral/earnings - Get earnings summary for authenticated user
- GET /api/referral/earningsHistory - Get earnings history with pagination
- GET /api/referral/getClaimable - get claimable earnings
- POST /api/referral/claimCommissions - claim individual commisions
- POST /api/referral/claimCashback - claims cashback
- POST /api/referral/claim - Claim all unclaimed earnings of a particular token type
- POST /api/webhook/trade - Simulates trading activity and comission distribution
