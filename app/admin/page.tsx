import { requireAdminPage } from "@/app/lib/admin";
import AdminPortal from "./AdminPortal";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user, allowed } = await requireAdminPage("/admin");
  if (!allowed) return <main className="admin-denied"><div className="denied-card"><div className="denied-mark">A+</div><p>ACTIVEPLUS SECURITY</p><h1>Access not authorised</h1><span>Your identity was verified, but <b>{user.email}</b> is not on the administrator allowlist.</span><a href="/signout-with-chatgpt?return_to=/admin">Sign out and use another account</a><a className="back-link" href="/">Return to ActivePlus</a></div></main>;
  return <AdminPortal initialAdmin={{ name: user.displayName, email: user.email }} />;
}
