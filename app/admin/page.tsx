import { requireAdminPage } from "@/app/lib/admin";
import Link from "next/link";
import AdminPortal from "./AdminPortal";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user, allowed } = await requireAdminPage("/admin");
  if (!allowed) return <main className="admin-denied"><div className="denied-card"><div className="denied-mark">A+</div><p>ACTIVEPLUS SECURITY</p><h1>Access not authorised</h1><span>Your identity was verified, but <b>{user.email}</b> is not on the administrator allowlist.</span><a href="/api/admin/auth/logout">Sign out and use another account</a><Link className="back-link" href="/">Return to ActivePlus</Link></div></main>;
  return <AdminPortal initialAdmin={{ name: user.name, email: user.email }} />;
}
