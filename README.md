# Tailwind Admin - Free Tailwind CSS & Next.js Admin Dashboard Website Template

#### Preview

 - [Demo](https://themewagon.github.io/tailwindadmin-nextjs/)

#### Download
 - [Download from ThemeWagon](https://themewagon.com/themes/tailwindadmin-nextjs/)

## Getting Started

1. Clone Repository
```
git clone https://github.com/themewagon/tailwindadmin-nextjs.git
```
2. Install Dependencies
```
npm i
```
3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Local authentication setup

Copy `.env.example` to `.env`, set `DATABASE_URL`, and generate a private
`AUTH_SECRET` (for example, with `openssl rand -base64 32`). Apply the additive
schema changes and generate Prisma Client:

```bash
npx prisma db push
npx prisma generate
```

The connected database has older applied migrations that are not present in
this repository. Do not run `prisma migrate dev` against it until those
migration files are restored; Prisma may otherwise request a schema reset.

To create the first administrator, set `ADMIN_NAME`, `ADMIN_EMAIL`, and a
unique `ADMIN_PASSWORD` of at least 12 characters in
`.env`, then run:

```bash
npm run db:seed
```

The seed command creates an `ADMINISTRATIONS` account only if that email does
not already exist. It does not reset an existing account's password or role.
New accounts and role assignments should be provisioned by an administrator;
public registration is disabled. Login uses the account email.

## Ticket workflow

The Tickets page reads ticket data in its Server Component and scopes it by the
authenticated role: Directors see tickets pending approval, Finance and
Logistics see tickets assigned to their processing queues, requesters see
their own tickets, and Administrations can inspect all tickets. New requests
are saved as drafts with line items and a creation audit entry. Only the
requester can submit a draft; Director approval routes material requests to
Logistics and cost/operational requests to Finance. The assigned department
can complete its tickets. State transitions and audit entries are committed
atomically by Server Actions.

The existing database has no ticket rows, so the ticket status/amount schema
was upgraded in place. Restore the repository's historical Prisma migration
files before using `prisma migrate dev` against this database.

Ticket requests support `MATERIAL`, `COST`, and `OPERATIONAL` with priorities
from low to urgent. Submit moves a draft into the Director queue. Director
approval routes material to Logistics and cost/operational requests to
Finance. Queue actions record actor, action, notes, and timestamp in the audit
timeline. The request form accepts an optional project and HTTP(S) quotation
URL, repeatable line items, quantities, units, and estimated unit prices.

## Author 
```
Design and code is completely written by tailwind-admin and development team. 
```

## License

 - Design and Code is Copyright &copy; <a href="https://tailwind-admin.com" target="_blank">tailwind-admin</a>
 - Licensed cover under [MIT]
 - Distributed by <a href="https://themewagon.com" target="_blank">ThemeWagon</a>
# Skala-Prioritas
# Skala-Prioritas
