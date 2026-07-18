import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("uses the AWS-compatible Next.js runtime", async () => {
  const [pkg, database, amplify] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("app/lib/database.ts", root), "utf8"),
    readFile(new URL("amplify.yml", root), "utf8"),
  ]);
  assert.match(pkg, /"build": "next build"/);
  assert.match(pkg, /"next": "15\.5\.20"/);
  assert.match(database, /DynamoDBDocumentClient/);
  assert.doesNotMatch(database, /cloudflare:workers|D1Database/);
  assert.match(amplify, /baseDirectory: \.next/);
});

test("defines retained encrypted storage and Cognito admin identity", async () => {
  const template = await readFile(new URL("infrastructure/aws-production.yml", root), "utf8");
  assert.match(template, /AWS::DynamoDB::Table/);
  assert.match(template, /PointInTimeRecoveryEnabled: true/);
  assert.match(template, /DeletionPolicy: Retain/);
  assert.match(template, /AWS::Cognito::UserPool/);
  assert.match(template, /MfaConfiguration: OPTIONAL/);
  assert.match(template, /Service: amplify\.amazonaws\.com/);
});

test("keeps rider and administrator sessions isolated", async () => {
  const [rider, admin, adminRoute] = await Promise.all([
    readFile(new URL("app/lib/auth.ts", root), "utf8"),
    readFile(new URL("app/lib/admin-session.ts", root), "utf8"),
    readFile(new URL("app/api/admin/auth/callback/route.ts", root), "utf8"),
  ]);
  assert.match(rider, /ap_session/);
  assert.match(admin, /ap_admin_session/);
  assert.match(adminRoute, /CognitoJwtVerifier/);
  assert.match(adminRoute, /email_verified/);
});

test("keeps development progress private and public launch disabled", async () => {
  const [adminGuard, portal] = await Promise.all([
    readFile(new URL("app/lib/admin.ts", root), "utf8"),
    readFile(new URL("app/admin/AdminPortal.tsx", root), "utf8"),
  ]);
  assert.match(adminGuard, /NODE_ENV !== "development"/);
  assert.match(adminGuard, /DEV_ADMIN_EMAIL/);
  assert.match(portal, /Development progress/);
  assert.match(portal, /PUBLIC WEBSITE OFFLINE/);
  assert.match(portal, /Public launch disabled/);
});
