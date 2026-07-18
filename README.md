# AttivPlus Netherlands

AttivPlus is a production ride-booking platform designed for customers and operators in the Netherlands. It provides Dutch mobile verification, traffic-aware navigation, euro fare quotes, iDEAL and card payments, customer ride history, and a secured operations portal.

## Product surfaces

- Customer booking with Dutch `+31` phone verification
- Netherlands-focused address search and traffic-aware routing
- Server-calculated upfront pricing in euros
- Stripe Checkout using iDEAL and cards
- Authenticated customer ride history
- Encrypted, durable customer, ride, payment, and audit records
- Verified payment-webhook processing
- Secured administrator operations and audited ride controls

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
copy .env.example .env
npm run dev
```

Open the local URL printed by the development server.

## Configuration

Create `.env` locally and configure the equivalent secret production variables in the selected hosting platform:

- `SESSION_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `MAPBOX_ACCESS_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ADMIN_EMAILS`
- `ACTIVEPLUS_TABLE_NAME`
- `APP_URL`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `COGNITO_DOMAIN`

Set the runtime region explicitly in the production environment. The repository does not assume a country or silently redirect Dutch production data to another jurisdiction.

Register `/api/stripe/webhook` as the Stripe webhook endpoint and subscribe to `checkout.session.completed`.

## Validation

```bash
npm run lint
npm test
npm run build
```

## Launch requirements

Before serving paying customers, complete Dutch transport licensing, driver screening, insurance, GDPR documentation, customer terms, cancellation policies, incident response, and operational support procedures.
