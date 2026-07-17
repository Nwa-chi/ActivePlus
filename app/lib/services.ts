export type Place = { name: string; longitude: number; latitude: number };

export async function mapboxSearch(query: string): Promise<Place[]> {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) throw new Error("Mapbox is not configured");
  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", query);
  url.searchParams.set("country", "nl");
  url.searchParams.set("language", "nl");
  url.searchParams.set("types", "address,street,place,postcode");
  url.searchParams.set("limit", "5");
  url.searchParams.set("access_token", token);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Address search is temporarily unavailable");
  const json = await response.json() as { features?: Array<{ properties?: { full_address?: string; name?: string; coordinates?: { longitude?: number; latitude?: number } }; geometry?: { coordinates?: number[] } }> };
  return (json.features ?? []).map((feature) => ({
    name: feature.properties?.full_address ?? feature.properties?.name ?? "Unknown address",
    longitude: feature.properties?.coordinates?.longitude ?? feature.geometry?.coordinates?.[0] ?? 0,
    latitude: feature.properties?.coordinates?.latitude ?? feature.geometry?.coordinates?.[1] ?? 0,
  })).filter((place) => Number.isFinite(place.longitude) && Number.isFinite(place.latitude));
}

export async function routeQuote(pickup: Place, dropoff: Place) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) throw new Error("Mapbox is not configured");
  const coords = `${pickup.longitude},${pickup.latitude};${dropoff.longitude},${dropoff.latitude}`;
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("overview", "simplified");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "false");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Route calculation is temporarily unavailable");
  const json = await response.json() as { routes?: Array<{ distance: number; duration: number; geometry?: { coordinates: number[][] } }> };
  const route = json.routes?.[0];
  if (!route) throw new Error("No drivable route was found");
  const fareCents = Math.max(895, Math.round(350 + route.distance / 1000 * 168 + route.duration / 60 * 29));
  return { distanceMeters: Math.round(route.distance), durationSeconds: Math.round(route.duration), fareCents, geometry: route.geometry?.coordinates ?? [] };
}

export async function twilioForm(path: string, params: Record<string, string>) {
  const account = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!account || !token || !service) throw new Error("Phone verification is not configured");
  const body = new URLSearchParams(params);
  const response = await fetch(`https://verify.twilio.com/v2/Services/${service}/${path}`, { method: "POST", headers: { Authorization: `Basic ${btoa(`${account}:${token}`)}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
  const json = await response.json() as { status?: string; message?: string };
  if (!response.ok) throw new Error(json.message || "Phone verification failed");
  return json;
}

export async function createStripeCheckout(ride: { id: string; fareCents: number; pickupName: string; dropoffName: string }, origin: string) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Stripe is not configured");
  const body = new URLSearchParams();
  body.append("mode", "payment");
  body.append("payment_method_types[]", "card");
  body.append("payment_method_types[]", "ideal");
  body.append("line_items[0][price_data][currency]", "eur");
  body.append("line_items[0][price_data][product_data][name]", "ActivePlus ride");
  body.append("line_items[0][price_data][product_data][description]", `${ride.pickupName} → ${ride.dropoffName}`);
  body.append("line_items[0][price_data][unit_amount]", String(ride.fareCents));
  body.append("line_items[0][quantity]", "1");
  body.append("success_url", `${origin}/?payment=success&ride=${ride.id}`);
  body.append("cancel_url", `${origin}/?payment=cancelled&ride=${ride.id}`);
  body.append("metadata[ride_id]", ride.id);
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
  const json = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !json.id || !json.url) throw new Error(json.error?.message || "Payment could not be started");
  return { id: json.id, url: json.url };
}
