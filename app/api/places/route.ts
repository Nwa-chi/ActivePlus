import { mapboxSearch } from "@/app/lib/services";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 3 || query.length > 160) throw new Error("Enter at least 3 characters");
    return Response.json({ places: await mapboxSearch(query) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Search failed" }, { status: 400 }); }
}
