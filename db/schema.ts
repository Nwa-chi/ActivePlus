import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  role: text("role", { enum: ["rider", "driver", "operator"] }).notNull().default("rider"),
  name: text("name"),
  createdAt: integer("created_at").notNull(),
}, (table) => [uniqueIndex("users_phone_unique").on(table.phone)]);

export const rides = sqliteTable("rides", {
  id: text("id").primaryKey(),
  riderId: text("rider_id").notNull().references(() => users.id),
  status: text("status", { enum: ["payment_pending", "requested", "matched", "driver_arriving", "in_progress", "completed", "cancelled", "refunded"] }).notNull(),
  pickupName: text("pickup_name").notNull(),
  pickupLng: integer("pickup_lng_e6").notNull(),
  pickupLat: integer("pickup_lat_e6").notNull(),
  dropoffName: text("dropoff_name").notNull(),
  dropoffLng: integer("dropoff_lng_e6").notNull(),
  dropoffLat: integer("dropoff_lat_e6").notNull(),
  distanceMeters: integer("distance_meters").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  fareCents: integer("fare_cents").notNull(),
  stripeSessionId: text("stripe_session_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("rides_rider_idx").on(table.riderId), index("rides_status_idx").on(table.status)]);

export const rideEvents = sqliteTable("ride_events", {
  id: text("id").primaryKey(),
  rideId: text("ride_id").notNull().references(() => rides.id),
  type: text("type").notNull(),
  detail: text("detail"),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("ride_events_ride_idx").on(table.rideId)]);

export const adminAudit = sqliteTable("admin_audit", {
  id: text("id").primaryKey(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  detail: text("detail"),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("admin_audit_created_idx").on(table.createdAt), index("admin_audit_entity_idx").on(table.entityType, table.entityId)]);
