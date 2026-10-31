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
The Notes feature stores each user's notes in the additive `UserNote` table.
The logistics Fleet Management feature adds the `Vehicle` table and vehicle
assignment fields to delivery orders. Apply and verify schema changes using the
deployment's approved database change process before enabling these features
against another environment.

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

## Login

Login uses the registered account's email and password. Login OTP email
verification is currently disabled, so Resend credentials are not required for
authentication.

Purchase Order QR codes use the public `/verify/po/<code>` page. In production,
set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin of the deployed app;
the internal bind address such as `0.0.0.0` must not be used as a public URL.
Regenerate PDFs that were created before changing this setting so their printed
QR codes also point to the verification page.

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

For material tickets, Logistics checks live warehouse balances before opening
the DO confirmation and selects an active Mover. If stock is missing or
insufficient, the selected pending items can be switched from `WAREHOUSE` to
`PURCHASE` and continued through the vendor PO flow. DO creation rechecks and
decrements stock atomically to protect against concurrent inventory changes.
Finance payments for tickets, purchase orders, and direct stock purchases are
stored as separate `PaymentTransaction` records. The remaining balance is
calculated from paid records; a direct purchase receives `paidAt` when its
balance reaches zero.

Movers can add up to five JPG, PNG, or WEBP delivery-proof photos per upload
(5 MB each), repeat uploads while a DO is in transit, and complete the delivery
with or without adding a final set of photos. Proof photos are stored per DO;
the first photo remains available through the existing single-receipt field for
backward compatibility.

Vehicle master data includes model and the latest odometer. Existing fleet
records must have their starting KM initialized by Logistics before Mover can
select them. Mover departures
capture the starting odometer, and completing a DO records its ending odometer
and creates one linked trip log in the same transaction. Fuel is estimated as
distance divided by 12 km/L, rounded to two decimal places. After Logistics
assigns a vehicle to an internal DO, the Mover can request fuel funds using
the SPBU rate (Rp10,000/L) or retail rate (Rp14,000/L), attaching a required
pre-fill odometer photo. Finance records approval and disbursement; the Mover
then submits a required post-fill odometer photo and an optional receipt.
Finance can view trip and fuel requests in the Finance Hub. Logistics can
also record a non-DO trip, provided its starting KM matches the vehicle's
latest odometer.

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
# Skala-011
