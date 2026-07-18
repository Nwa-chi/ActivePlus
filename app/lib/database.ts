import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

export type UserRecord = {
  id: string;
  phone: string;
  role: "rider" | "driver" | "operator";
  name: string | null;
  createdAt: number;
};

export type RideRecord = {
  id: string;
  riderId: string;
  status: string;
  pickupName: string;
  pickupLng: number;
  pickupLat: number;
  dropoffName: string;
  dropoffLng: number;
  dropoffLat: number;
  distanceMeters: number;
  durationSeconds: number;
  fareCents: number;
  stripeSessionId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type AuditRecord = {
  id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: string | null;
  createdAt: number;
};

const region = process.env.AWS_REGION || "eu-central-1";
const tableName = process.env.ACTIVEPLUS_TABLE_NAME || "ActivePlusProduction";
const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});

function rideKey(id: string) {
  return { pk: `RIDE#${id}`, sk: "META" };
}

async function scanEntity<T>(recordType: string): Promise<T[]> {
  const rows: T[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await client.send(new ScanCommand({
      TableName: tableName,
      FilterExpression: "#recordType = :recordType",
      ExpressionAttributeNames: { "#recordType": "recordType" },
      ExpressionAttributeValues: { ":recordType": recordType },
      ExclusiveStartKey,
    }));
    rows.push(...((page.Items ?? []) as T[]));
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return rows;
}

export async function findUserByPhone(phone: string): Promise<UserRecord | null> {
  const lookup = await client.send(new GetCommand({ TableName: tableName, Key: { pk: `PHONE#${phone}`, sk: "LOOKUP" } }));
  if (!lookup.Item?.userId) return null;
  const result = await client.send(new GetCommand({ TableName: tableName, Key: { pk: `USER#${lookup.Item.userId}`, sk: "PROFILE" } }));
  return (result.Item as UserRecord | undefined) ?? null;
}

export async function createRider(phone: string): Promise<UserRecord> {
  const user: UserRecord = { id: crypto.randomUUID(), phone, role: "rider", name: null, createdAt: Date.now() };
  await client.send(new TransactWriteCommand({ TransactItems: [
    { Put: { TableName: tableName, Item: { pk: `PHONE#${phone}`, sk: "LOOKUP", recordType: "PHONE_LOOKUP", userId: user.id }, ConditionExpression: "attribute_not_exists(pk)" } },
    { Put: { TableName: tableName, Item: { pk: `USER#${user.id}`, sk: "PROFILE", recordType: "USER", ...user }, ConditionExpression: "attribute_not_exists(pk)" } },
  ] }));
  return user;
}

export async function listRidesForUser(userId: string, limit = 20): Promise<RideRecord[]> {
  const result = await client.send(new QueryCommand({
    TableName: tableName,
    IndexName: "gsi1",
    KeyConditionExpression: "gsi1pk = :pk",
    ExpressionAttributeValues: { ":pk": `USER#${userId}` },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return (result.Items ?? []) as RideRecord[];
}

export async function createRide(ride: RideRecord) {
  await client.send(new PutCommand({
    TableName: tableName,
    Item: { ...rideKey(ride.id), recordType: "RIDE", gsi1pk: `USER#${ride.riderId}`, gsi1sk: String(ride.createdAt).padStart(16, "0"), ...ride },
    ConditionExpression: "attribute_not_exists(pk)",
  }));
}

export async function attachStripeSession(id: string, stripeSessionId: string) {
  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: rideKey(id),
    UpdateExpression: "SET stripeSessionId = :session, updatedAt = :now",
    ExpressionAttributeValues: { ":session": stripeSessionId, ":now": Date.now() },
    ConditionExpression: "attribute_exists(pk)",
  }));
}

export async function getRide(id: string): Promise<RideRecord | null> {
  const result = await client.send(new GetCommand({ TableName: tableName, Key: rideKey(id) }));
  return (result.Item as RideRecord | undefined) ?? null;
}

export async function updateRideStatus(id: string, from: string, to: string, eventType: string, detail: string | null) {
  const now = Date.now();
  const eventId = crypto.randomUUID();
  await client.send(new TransactWriteCommand({ TransactItems: [
    { Update: {
      TableName: tableName,
      Key: rideKey(id),
      UpdateExpression: "SET #status = :to, updatedAt = :now",
      ConditionExpression: "#status = :from",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":to": to, ":from": from, ":now": now },
    } },
    { Put: { TableName: tableName, Item: { pk: `RIDE#${id}`, sk: `EVENT#${String(now).padStart(16, "0")}#${eventId}`, recordType: "RIDE_EVENT", id: eventId, rideId: id, type: eventType, detail, createdAt: now } } },
  ] }));
}

export async function confirmRidePayment(id: string, stripeSessionId: string | null) {
  try {
    await updateRideStatus(id, "payment_pending", "requested", "payment_confirmed", stripeSessionId);
  } catch (error) {
    if ((error as { name?: string }).name !== "TransactionCanceledException") throw error;
  }
}

export async function recordAudit(record: AuditRecord) {
  await client.send(new PutCommand({ TableName: tableName, Item: {
    pk: "AUDIT",
    sk: `${String(record.createdAt).padStart(16, "0")}#${record.id}`,
    recordType: "AUDIT",
    ...record,
  } }));
}

export async function getAdminOverview() {
  const [rides, users, audits] = await Promise.all([
    scanEntity<RideRecord>("RIDE"),
    scanEntity<UserRecord>("USER"),
    scanEntity<AuditRecord>("AUDIT"),
  ]);
  rides.sort((a, b) => b.createdAt - a.createdAt);
  users.sort((a, b) => b.createdAt - a.createdAt);
  audits.sort((a, b) => b.createdAt - a.createdAt);
  const userById = new Map(users.map((user) => [user.id, user]));
  const countedStatuses = new Map<string, number>();
  const billable = new Set(["requested", "matched", "driver_arriving", "in_progress", "completed"]);
  for (const ride of rides) countedStatuses.set(ride.status, (countedStatuses.get(ride.status) ?? 0) + 1);
  const customerRows = users.slice(0, 100).map((user) => {
    const userRides = rides.filter((ride) => ride.riderId === user.id);
    return { ...user, rideCount: userRides.length, spendCents: userRides.reduce((sum, ride) => sum + (billable.has(ride.status) ? ride.fareCents : 0), 0) };
  });
  return {
    summary: {
      totalRides: rides.length,
      activeCustomers: new Set(rides.map((ride) => ride.riderId)).size,
      grossCents: rides.reduce((sum, ride) => sum + (billable.has(ride.status) ? ride.fareCents : 0), 0),
      avgDuration: rides.length ? rides.reduce((sum, ride) => sum + ride.durationSeconds, 0) / rides.length : 0,
    },
    statuses: [...countedStatuses.entries()].map(([status, count]) => ({ status, count })),
    rides: rides.slice(0, 100).map((ride) => ({ ...ride, riderPhone: userById.get(ride.riderId)?.phone ?? "Unknown" })),
    customers: customerRows,
    audits: audits.slice(0, 30),
  };
}
