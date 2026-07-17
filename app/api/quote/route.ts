import { Place, routeQuote } from "@/app/lib/services";

const valid = (p?: Place) => p && typeof p.name === "string" && Number.isFinite(p.longitude) && Number.isFinite(p.latitude);
export async function POST(request: Request) {
  try {
    const { pickup, dropoff } = await request.json() as { pickup?: Place; dropoff?: Place };
    if (!valid(pickup) || !valid(dropoff)) throw new Error("Select a valid pickup and destination");
    return Response.json(await routeQuote(pickup!, dropoff!));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Quote failed" }, { status: 400 }); }
}
