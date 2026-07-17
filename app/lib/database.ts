import { env } from "cloudflare:workers";

export function database(): D1Database {
  if (!env.DB) throw new Error("ActivePlus database is not configured");
  return env.DB;
}

export async function ensureSchema() {
  const db = database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, phone TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT 'rider', name TEXT, created_at INTEGER NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS rides (id TEXT PRIMARY KEY NOT NULL, rider_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL, pickup_name TEXT NOT NULL, pickup_lng_e6 INTEGER NOT NULL, pickup_lat_e6 INTEGER NOT NULL, dropoff_name TEXT NOT NULL, dropoff_lng_e6 INTEGER NOT NULL, dropoff_lat_e6 INTEGER NOT NULL, distance_meters INTEGER NOT NULL, duration_seconds INTEGER NOT NULL, fare_cents INTEGER NOT NULL, stripe_session_id TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS ride_events (id TEXT PRIMARY KEY NOT NULL, ride_id TEXT NOT NULL REFERENCES rides(id), type TEXT NOT NULL, detail TEXT, created_at INTEGER NOT NULL)`),
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users(phone)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS rides_rider_idx ON rides(rider_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS rides_status_idx ON rides(status)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS ride_events_ride_idx ON ride_events(ride_id)`),
  ]);
  return db;
}
