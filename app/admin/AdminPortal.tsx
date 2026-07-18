"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Ride = { id: string; status: string; pickupName: string; dropoffName: string; distanceMeters: number; durationSeconds: number; fareCents: number; stripeSessionId: string | null; createdAt: number; updatedAt: number; riderPhone: string };
type Customer = { id: string; phone: string; role: string; name: string | null; createdAt: number; rideCount: number; spendCents: number };
type Audit = { id: string; actorEmail: string; action: string; entityType: string; entityId: string; detail: string | null; createdAt: number };
type Dashboard = { admin: { name: string; email: string }; summary: { totalRides?: number; activeCustomers?: number; grossCents?: number; avgDuration?: number }; statuses: Array<{ status: string; count: number }>; rides: Ride[]; customers: Customer[]; audits: Audit[]; providerHealth: Record<string, boolean> };

const money = (cents = 0) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
const dateTime = (value: number) => new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" }).format(value);
const labels: Record<string, string> = { payment_pending: "Payment pending", requested: "Requested", matched: "Matched", driver_arriving: "Driver arriving", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled", refunded: "Refunded" };
const transitions: Record<string, string[]> = { payment_pending: ["cancelled"], requested: ["matched", "cancelled"], matched: ["driver_arriving", "cancelled"], driver_arriving: ["in_progress", "cancelled"], in_progress: ["completed", "cancelled"], completed: [], cancelled: [], refunded: [] };

export default function AdminPortal({ initialAdmin }: { initialAdmin: { name: string; email: string } }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [section, setSection] = useState("overview");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Ride | null>(null);
  const [nextStatus, setNextStatus] = useState("");
  const [note, setNote] = useState("");
  const [refundMode, setRefundMode] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setBusy(true); setError("");
    try { const response = await fetch("/api/admin/overview", { cache: "no-store" }); const json = await response.json(); if (!response.ok) throw new Error(json.error || "Dashboard unavailable"); setData(json); setLastUpdated(new Date()); }
    catch (e) { setError(e instanceof Error ? e.message : "Dashboard unavailable"); }
    finally { if (!quiet) setBusy(false); }
  }, []);

  useEffect(() => { load(); const timer = window.setInterval(() => load(true), 30000); return () => window.clearInterval(timer); }, [load]);

  const rides = useMemo(() => (data?.rides ?? []).filter((ride) => (status === "all" || ride.status === status) && `${ride.id} ${ride.pickupName} ${ride.dropoffName} ${ride.riderPhone}`.toLowerCase().includes(query.toLowerCase())), [data, status, query]);
  const customers = useMemo(() => (data?.customers ?? []).filter((customer) => `${customer.phone} ${customer.name ?? ""} ${customer.role}`.toLowerCase().includes(query.toLowerCase())), [data, query]);
  const liveTrips = data?.rides.filter((ride) => ["requested", "matched", "driver_arriving", "in_progress"].includes(ride.status)).length ?? 0;

  function openRide(ride: Ride) { setSelected(ride); setNextStatus(transitions[ride.status]?.[0] ?? ""); setNote(""); setRefundMode(false); setRefundReason(""); setError(""); }
  function closeDrawer() { if (!busy) { setSelected(null); setRefundMode(false); } }

  async function updateRide() {
    if (!selected || !nextStatus) return; setBusy(true); setError("");
    try { const response = await fetch(`/api/admin/rides/${encodeURIComponent(selected.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus, note }) }); const json = await response.json(); if (!response.ok) throw new Error(json.error || "Update failed"); await load(true); setSelected(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Update failed"); }
    finally { setBusy(false); }
  }

  async function refundRide() {
    if (!selected) return; setBusy(true); setError("");
    try { const response = await fetch(`/api/admin/rides/${encodeURIComponent(selected.id)}/refund`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: refundReason }) }); const json = await response.json(); if (!response.ok) throw new Error(json.error || "Refund failed"); await load(true); setSelected(null); setRefundMode(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Refund failed"); }
    finally { setBusy(false); }
  }

  return <main className="admin-shell">
    <aside className="admin-sidebar"><a className="admin-brand" href="/admin"><span>A+</span><div>ACTIVEPLUS<small>COMMAND</small></div></a><p className="side-label">Operations</p>
      <nav>{[["overview","▦","Overview"],["rides","⌁","Live rides"],["customers","♙","Customers"],["security","◈","Security"],["audit","≡","Audit trail"]].map(([id, icon, label]) => <button key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)}><i>{icon}</i>{label}{id === "rides" && liveTrips > 0 && <b>{liveTrips}</b>}</button>)}</nav>
      <div className="side-health"><div><i/>System status</div><strong>{data && Object.values(data.providerHealth).every(Boolean) ? "Operational" : "Setup required"}</strong><span>{data ? `${Object.values(data.providerHealth).filter(Boolean).length}/4 services online` : "Checking services"}</span></div>
      <div className="side-user"><span>{initialAdmin.name.slice(0,2).toUpperCase()}</span><div><b>{initialAdmin.name}</b><small>Administrator</small></div><a href="/signout-with-chatgpt?return_to=/admin" title="Sign out">↗</a></div>
    </aside>

    <section className="admin-workspace"><header className="admin-topbar"><div><span className="env-badge"><i/>PRODUCTION</span><b>Netherlands Operations</b></div><div className="top-tools"><button className="refresh" onClick={() => load()} disabled={busy}>↻ <span>{busy ? "Refreshing" : "Refresh"}</span></button><span className="updated">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}` : "Loading live data"}</span><a href="/" target="_blank">Open rider app ↗</a></div></header>
      <div className="admin-content">
        {error && <div className="admin-error"><span>!</span>{error}<button onClick={() => setError("")}>×</button></div>}
        {section === "overview" && <Overview data={data} rides={rides} liveTrips={liveTrips} openRide={openRide} setSection={setSection} />}
        {section === "rides" && <Rides data={data} rides={rides} query={query} setQuery={setQuery} status={status} setStatus={setStatus} openRide={openRide} />}
        {section === "customers" && <Customers customers={customers} query={query} setQuery={setQuery} />}
        {section === "security" && <Security data={data} admin={initialAdmin} />}
        {section === "audit" && <AuditTrail audits={data?.audits ?? []} />}
      </div>
    </section>

    {selected && <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeDrawer()}><aside className="ride-drawer"><header><div><small>TRIP CONTROL</small><h2>{selected.id}</h2></div><button onClick={closeDrawer}>×</button></header><div className="drawer-body">
      <div className="drawer-status"><span className={`status-pill ${selected.status}`}>{labels[selected.status]}</span><small>Last change {dateTime(selected.updatedAt)}</small></div>
      <div className="route-timeline"><div><i/><b/><i/></div><section><small>PICKUP</small><strong>{selected.pickupName}</strong><small>DESTINATION</small><strong>{selected.dropoffName}</strong></section></div>
      <div className="drawer-metrics"><span><b>{(selected.distanceMeters/1000).toFixed(1)} km</b><small>Distance</small></span><span><b>{Math.round(selected.durationSeconds/60)} min</b><small>Duration</small></span><span><b>{money(selected.fareCents)}</b><small>Fare</small></span></div>
      <div className="info-list"><div><span>Rider</span><b>{selected.riderPhone}</b></div><div><span>Requested</span><b>{dateTime(selected.createdAt)}</b></div><div><span>Payment record</span><b>{selected.stripeSessionId ? "Attached" : "Not attached"}</b></div></div>
      {!refundMode && transitions[selected.status]?.length > 0 && <div className="action-box"><label>Change trip status</label><select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>{transitions[selected.status].map((value) => <option value={value} key={value}>{labels[value]}</option>)}</select><label>Operational note <span>optional</span></label><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Reason or dispatch context…"/><button className="primary-action" onClick={updateRide} disabled={busy || !nextStatus}>{busy ? "Updating…" : `Update to ${labels[nextStatus] ?? "status"}`}</button></div>}
      {!refundMode && selected.stripeSessionId && !["payment_pending","refunded"].includes(selected.status) && <button className="refund-link" onClick={() => setRefundMode(true)}>Issue Stripe refund</button>}
      {refundMode && <div className="refund-box"><div><b>Issue full refund</b><button onClick={() => setRefundMode(false)}>Cancel</button></div><p>This sends {money(selected.fareCents)} back through Stripe and permanently marks the ride as refunded. The action is idempotent and audited.</p><label>Required refund reason</label><textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} maxLength={450} placeholder="Explain why this refund is authorised…"/><button onClick={refundRide} disabled={busy || refundReason.trim().length < 8}>{busy ? "Processing…" : `Refund ${money(selected.fareCents)}`}</button></div>}
    </div></aside></div>}
  </main>;
}

function PageTitle({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) { return <div className="admin-heading"><div><small>{eyebrow}</small><h1>{title}</h1><p>{text}</p></div>{action}</div> }
function Overview({ data, rides, liveTrips, openRide, setSection }: { data: Dashboard | null; rides: Ride[]; liveTrips: number; openRide: (r: Ride) => void; setSection: (s:string)=>void }) {
  const s = data?.summary; return <><PageTitle eyebrow="LIVE COMMAND CENTER" title="Good morning, Nwachi" text="Monitor service performance, payments, customers, and active journeys across the Netherlands." action={<button className="header-action" onClick={() => setSection("rides")}>Open dispatch →</button>}/>
    <div className="admin-kpis"><Kpi label="Gross bookings" value={money(Number(s?.grossCents ?? 0))} note="Paid ride value" tone="violet"/><Kpi label="Active trips" value={String(liveTrips)} note={`${data?.statuses.find((x)=>x.status==="requested")?.count ?? 0} awaiting dispatch`} tone="cyan"/><Kpi label="Customers" value={String(s?.activeCustomers ?? 0)} note={`${s?.totalRides ?? 0} total bookings`} tone="green"/><Kpi label="Avg. journey" value={`${Math.round(Number(s?.avgDuration ?? 0)/60)} min`} note="Across all records" tone="amber"/></div>
    <div className="overview-grid"><section className="admin-panel live-panel"><div className="panel-title"><div><h2>Live operations</h2><p>Most recent journeys requiring attention</p></div><button onClick={() => setSection("rides")}>View all →</button></div><RideTable rides={rides.slice(0,7)} openRide={openRide}/></section>
    <section className="admin-panel market-panel"><div className="panel-title"><div><h2>Service pulse</h2><p>Provider and trip health</p></div></div><div className="health-ring"><div><b>{data ? Math.round(Object.values(data.providerHealth).filter(Boolean).length/4*100) : 0}</b><span>%</span></div><p><strong>{data && Object.values(data.providerHealth).every(Boolean) ? "All systems ready" : "Activation incomplete"}</strong><small>Production service dependencies</small></p></div>{data && Object.entries(data.providerHealth).map(([key, ok]) => <div className="health-row" key={key}><span>{key.replace(/([A-Z])/g," $1")}</span><b className={ok ? "good" : "warn"}>{ok ? "Operational" : "Configure"}</b></div>)}<div className="secure-note"><i>◈</i><div><b>Admin security enforced</b><span>SIWC identity + server allowlist</span></div></div></section></div>
  </>;
}
function Kpi({label,value,note,tone}:{label:string;value:string;note:string;tone:string}) { return <article className={`admin-kpi ${tone}`}><span>{label}</span><b>{value}</b><small>{note}</small><i>↗</i></article> }
function RideTable({rides,openRide}:{rides:Ride[];openRide:(r:Ride)=>void}) { return <div className="admin-table"><div className="table-row table-head"><span>Trip</span><span>Route</span><span>Rider</span><span>Fare</span><span>Status</span><span/></div>{rides.length ? rides.map((ride)=><button className="table-row" key={ride.id} onClick={()=>openRide(ride)}><span><b>{ride.id}</b><small>{dateTime(ride.createdAt)}</small></span><span><b>{ride.pickupName}</b><small>to {ride.dropoffName}</small></span><span>{ride.riderPhone}</span><span><b>{money(ride.fareCents)}</b></span><span><i className={`status-pill ${ride.status}`}>{labels[ride.status]}</i></span><span>›</span></button>) : <div className="table-empty">No rides match this view.</div>}</div> }
function Rides({data,rides,query,setQuery,status,setStatus,openRide}:{data:Dashboard|null;rides:Ride[];query:string;setQuery:(s:string)=>void;status:string;setStatus:(s:string)=>void;openRide:(r:Ride)=>void}) { return <><PageTitle eyebrow="DISPATCH & FULFILMENT" title="Ride operations" text="Inspect journeys, progress valid lifecycle transitions, resolve exceptions, and issue audited refunds."/><div className="filters"><label>⌕<input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search trip, route or rider"/></label><div><button className={status==="all"?"active":""} onClick={()=>setStatus("all")}>All <b>{data?.rides.length ?? 0}</b></button>{["requested","matched","in_progress","completed","cancelled"].map((s)=><button key={s} className={status===s?"active":""} onClick={()=>setStatus(s)}>{labels[s]} <b>{data?.statuses.find((x)=>x.status===s)?.count ?? 0}</b></button>)}</div></div><section className="admin-panel full-table"><RideTable rides={rides} openRide={openRide}/></section></> }
function Customers({customers,query,setQuery}:{customers:Customer[];query:string;setQuery:(s:string)=>void}) { return <><PageTitle eyebrow="CUSTOMER OPERATIONS" title="Customers" text="Review verified rider accounts and service history. Phone numbers remain masked in this interface."/><div className="filters customer-filter"><label>⌕<input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search masked phone or role"/></label></div><section className="admin-panel customer-grid">{customers.map((c)=><article key={c.id}><div className="customer-avatar">{c.name?.slice(0,2).toUpperCase() || "AP"}</div><span className="role-tag">{c.role}</span><h3>{c.name || "ActivePlus rider"}</h3><p>{c.phone}</p><div><span><b>{c.rideCount}</b><small>Rides</small></span><span><b>{money(Number(c.spendCents))}</b><small>Spend</small></span></div><footer>Joined {dateTime(c.createdAt)}</footer></article>)}{!customers.length && <div className="table-empty">No customers match this search.</div>}</section></> }
function Security({data,admin}:{data:Dashboard|null;admin:{name:string;email:string}}) { return <><PageTitle eyebrow="ZERO-TRUST ADMINISTRATION" title="Security center" text="Administrator access is isolated from rider authentication and enforced on every server request."/><div className="security-grid"><section className="admin-panel security-main"><div className="shield-orbit"><div>◈</div><i/><i/><i/></div><h2>Protected operations perimeter</h2><p>The admin portal uses ChatGPT identity for authentication and an exact server-side email allowlist for authorisation. Customer OTP sessions cannot access this surface.</p><div className="security-checks"><span><i>✓</i><b>Identity verified</b><small>{admin.email}</small></span><span><i>✓</i><b>Server allowlist</b><small>Checked on every API request</small></span><span><i>✓</i><b>Audit logging</b><small>Mutations recorded with actor and time</small></span><span><i>✓</i><b>No-store responses</b><small>Operational data is never cached</small></span></div></section><section className="admin-panel security-side"><h2>Service credentials</h2><p>Only configuration state is shown. Secret values never reach the browser.</p>{data && Object.entries(data.providerHealth).map(([key,ok])=><div className="credential-row" key={key}><span><i className={ok?"online":"offline"}/>{key.replace(/([A-Z])/g," $1")}</span><b>{ok?"Configured":"Missing"}</b></div>)}<div className="security-warning"><b>Production requirement</b><p>Use separate least-privilege provider keys, rotate secrets regularly, and review the audit trail after every incident.</p></div></section></div></> }
function AuditTrail({audits}:{audits:Audit[]}) { return <><PageTitle eyebrow="ACCOUNTABILITY" title="Audit trail" text="Immutable operational records for status changes, refunds, and administrative actions."/><section className="admin-panel audit-list"><div className="audit-head"><span>Timestamp</span><span>Administrator</span><span>Action</span><span>Entity</span><span>Detail</span></div>{audits.map((a)=><article key={a.id}><span>{dateTime(a.createdAt)}</span><span><b>{a.actorEmail}</b></span><span><i>{a.action}</i></span><span>{a.entityType} · {a.entityId}</span><span>{a.detail || "—"}</span></article>)}{!audits.length&&<div className="table-empty">No administrative actions have been recorded yet.</div>}</section></> }
