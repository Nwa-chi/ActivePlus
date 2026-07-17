# ActivePlus

ActivePlus is a full-stack ride-booking platform for the Netherlands. It provides Dutch mobile verification, Mapbox-powered address search and traffic-aware routing, euro fare quotes, Stripe Checkout with iDEAL and card support, and persistent customer and ride records.

## Product surfaces

- Customer booking and Dutch `+31` phone verification
- Mapbox address search, distance, route duration, and live-traffic estimates
- Server-calculated upfront pricing in euros
- Stripe Checkout using iDEAL and cards
- Authenticated customer ride history
- Durable Cloudflare D1 ride, user, and event records
- Verified Stripe webhook processing
- Driver onboarding and operations foundations

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
copy .env.example .env
npm run dev
```

Open the local URL printed by the development server.

## Configuration

Create `.env` locally and configure the equivalent secret production variables in the hosting platform:

- `SESSION_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `MAPBOX_ACCESS_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Register `/api/stripe/webhook` as the Stripe webhook endpoint and subscribe to `checkout.session.completed`.

## Validation

```bash
npm run db:generate
npm run build
```

Database migrations are stored in `drizzle/`. Hosting and D1 bindings are declared in `.openai/hosting.json`.

## Launch requirements

Before serving paying customers, complete provider activation, Dutch transport licensing, driver screening, insurance, GDPR documentation, customer terms, cancellation policies, incident response, and operational support procedures.
