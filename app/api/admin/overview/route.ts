import { forbidden, requireAdminApi } from "@/app/lib/admin";
import { getAdminOverview } from "@/app/lib/database";

export const dynamic = "force-dynamic";

const maskPhone = (phone: string) => phone.length > 7 ? `${phone.slice(0, 5)}••••${phone.slice(-3)}` : "••••••";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return forbidden();
  const overview = await getAdminOverview();
  const providerHealth = { database: true, phoneVerification: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID), navigation: Boolean(process.env.MAPBOX_ACCESS_TOKEN), payments: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) };
  return Response.json({
    admin: { name: admin.name, email: admin.email }, summary: overview.summary, statuses: overview.statuses,
    rides: overview.rides.map((ride) => ({ ...ride, riderPhone: maskPhone(String(ride.riderPhone)) })),
    customers: overview.customers.map((customer) => ({ ...customer, phone: maskPhone(String(customer.phone)) })), audits: overview.audits, providerHealth,
  }, { headers: { "Cache-Control": "no-store" } });
}
