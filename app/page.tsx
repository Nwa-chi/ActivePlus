"use client";

import { useMemo, useState } from "react";

const Icon = ({ name, size = 18 }: { name: string; size?: number }) => {
  const icons: Record<string, string> = {
    grid: "▦", map: "⌖", users: "♧", car: "◆", shield: "◈", chart: "↗",
    bell: "●", search: "⌕", pin: "●", clock: "◷", bolt: "ϟ", arrow: "→",
    wallet: "▣", star: "★", headset: "◉", home: "⌂", briefcase: "▰",
  };
  return <span style={{ fontSize: size }} aria-hidden="true">{icons[name] || "•"}</span>;
};

const rides = [
  { id: "AP-4821", rider: "Maya Chen", driver: "Jonas K.", route: "Mitte → BER Airport", fare: "€34.80", status: "En route", eta: "12 min", tone: "green" },
  { id: "AP-4819", rider: "Luca Weber", driver: "Amara O.", route: "Kreuzberg → Charlottenburg", fare: "€18.40", status: "Pickup", eta: "3 min", tone: "blue" },
  { id: "AP-4817", rider: "Nora Schmidt", driver: "David R.", route: "Wedding → Alexanderplatz", fare: "€14.20", status: "En route", eta: "8 min", tone: "green" },
  { id: "AP-4814", rider: "Elias Bauer", driver: "Unassigned", route: "Neukölln → Tempelhof", fare: "€11.90", status: "Matching", eta: "—", tone: "amber" },
];

const drivers = [
  { name: "Jonas K.", car: "Tesla Model 3", rating: "4.96", state: "On trip", avatar: "JK" },
  { name: "Amara O.", car: "Toyota Corolla", rating: "4.92", state: "Pickup", avatar: "AO" },
  { name: "David R.", car: "VW ID.4", rating: "4.89", state: "On trip", avatar: "DR" },
  { name: "Sofia M.", car: "Hyundai Ioniq", rating: "4.98", state: "Available", avatar: "SM" },
];

export default function Home() {
  const [surface, setSurface] = useState<"ops" | "rider" | "driver">("ops");
  const [activeNav, setActiveNav] = useState("Overview");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(true);
  const [destination, setDestination] = useState("BER Airport, Terminal 1");

  const filtered = useMemo(() => rides.filter(r => `${r.id} ${r.rider} ${r.driver} ${r.route}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const act = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">A+</span><span>ActivePlus</span></div>
        <nav aria-label="Main navigation">
          <p className="eyebrow">Workspace</p>
          {[ ["Overview","grid"], ["Live operations","map"], ["Riders","users"], ["Drivers","car"], ["Safety center","shield"], ["Finance","chart"] ].map(([label, icon]) => (
            <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => { setActiveNav(label); setSurface("ops"); }}>
              <Icon name={icon}/><span>{label}</span>{label === "Safety center" && <b className="nav-count">3</b>}
            </button>
          ))}
        </nav>
        <div className="city-card"><div className="city-top"><span>Berlin market</span><span className="live-dot">Live</span></div><strong>98.4%</strong><small>Service health</small><div className="health"><i /></div></div>
        <div className="sidebar-foot"><button className="nav-item"><Icon name="headset"/><span>Support desk</span></button><div className="profile"><div className="avatar">KW</div><div><strong>Kenneth W.</strong><small>Admin</small></div><button aria-label="Profile menu">•••</button></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="surface-switch" aria-label="Choose product surface">
            <button className={surface === "ops" ? "selected" : ""} onClick={() => setSurface("ops")}>Operations</button>
            <button className={surface === "rider" ? "selected" : ""} onClick={() => setSurface("rider")}>Rider app</button>
            <button className={surface === "driver" ? "selected" : ""} onClick={() => setSurface("driver")}>Driver app</button>
          </div>
          <div className="top-actions"><label className="search"><Icon name="search"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search trips, people, IDs" /></label><button className="icon-button" aria-label="Notifications"><Icon name="bell"/><i /></button><button className="primary" onClick={() => act("New ride request opened")}>+ New ride</button></div>
        </header>

        {surface === "ops" && <OpsView filtered={filtered} activeNav={activeNav} act={act} />}
        {surface === "rider" && <RiderView destination={destination} setDestination={setDestination} act={act} />}
        {surface === "driver" && <DriverView online={online} setOnline={setOnline} act={act} />}
      </section>
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}

function OpsView({ filtered, activeNav, act }: { filtered: typeof rides; activeNav: string; act: (s: string) => void }) {
  return <div className="content">
    <div className="page-heading"><div><p className="overline">Monday, 13 July · Berlin</p><h1>{activeNav === "Overview" ? "Good morning, Kenneth" : activeNav}</h1><p>Here’s what’s happening across ActivePlus right now.</p></div><div className="heading-actions"><button className="secondary" onClick={() => act("Report generated")}>Export report</button><button className="primary" onClick={() => act("Dispatch console ready")}>Open dispatch <Icon name="arrow"/></button></div></div>
    <section className="metrics">
      <Metric label="Gross bookings" value="€48,320" change="+12.4%" detail="vs. last Monday" accent="purple" bars={[28,38,31,48,42,62,70]} />
      <Metric label="Active trips" value="1,284" change="+8.1%" detail="86 awaiting pickup" accent="blue" bars={[38,42,35,58,52,64,55]} />
      <Metric label="Online drivers" value="742" change="+5.7%" detail="82% utilization" accent="green" bars={[30,35,42,39,48,58,64]} />
      <Metric label="Avg. pickup" value="4m 18s" change="−32s" detail="Target: under 5m" accent="amber" bars={[65,58,61,52,49,42,36]} />
    </section>
    <section className="ops-grid">
      <div className="panel map-panel"><div className="panel-head"><div><h2>Live demand</h2><p>Requests and driver supply</p></div><div className="legend"><span><i className="req"/>Requests</span><span><i className="drv"/>Drivers</span><button>⌄</button></div></div><div className="map">
        <div className="road r1"/><div className="road r2"/><div className="road r3"/><div className="road r4"/><div className="river"/>
        <span className="district d1">Wedding</span><span className="district d2">Mitte</span><span className="district d3">Kreuzberg</span><span className="district d4">Neukölln</span><span className="district d5">Friedrichshain</span>
        {["p1","p2","p3","p4","p5","p6","p7"].map((p,i)=><i key={p} className={`map-pin ${p} ${i%3===0?"hot":""}`}>{i%3===0?"8":""}</i>)}
        {["c1","c2","c3","c4","c5","c6"].map(p=><i key={p} className={`car-dot ${p}`}>◆</i>)}
        <div className="map-stat"><span>Demand balance</span><strong>+6.2%</strong><small>Healthy supply</small></div><div className="zoom"><button>+</button><button>−</button></div>
      </div></div>
      <div className="panel pulse-panel"><div className="panel-head"><div><h2>Market pulse</h2><p>Live performance</p></div><button>•••</button></div><div className="pulse-score"><div className="ring"><span>92</span><small>/100</small></div><div><strong>Excellent</strong><p>All core metrics are within target range.</p></div></div>
        <Pulse label="Request completion" value="96.8%" width="97%"/><Pulse label="Driver acceptance" value="88.2%" width="88%"/><Pulse label="Rider satisfaction" value="4.89" width="94%"/>
        <div className="surge"><div><span className="surge-icon">ϟ</span><div><strong>Surge active</strong><small>2 zones · max 1.4×</small></div></div><button onClick={() => act("Surge zones opened")}>View zones</button></div>
      </div>
    </section>
    <section className="panel trips"><div className="panel-head"><div><h2>Live trips</h2><p>{filtered.length} matching journeys</p></div><div className="trip-tabs"><button className="on">All trips</button><button>Needs attention <b>3</b></button><button>Completed</button></div></div>
      <div className="table"><div className="tr th"><span>Trip</span><span>Rider & driver</span><span>Route</span><span>Fare</span><span>Status</span><span>ETA</span><span/></div>{filtered.map(r=><div className="tr" key={r.id}><span><strong>{r.id}</strong><small>Today, 10:{r.id.slice(-2)}</small></span><span><strong>{r.rider}</strong><small>{r.driver}</small></span><span className="route">{r.route}</span><span><strong>{r.fare}</strong></span><span><b className={`status ${r.tone}`}>{r.status}</b></span><span>{r.eta}</span><button aria-label={`Actions for ${r.id}`}>•••</button></div>)}</div>
    </section>
  </div>
}

function Metric({label,value,change,detail,accent,bars}:{label:string;value:string;change:string;detail:string;accent:string;bars:number[]}) { return <article className={`metric ${accent}`}><div><p>{label}</p><h3>{value}</h3><span className="change">{change}</span><small>{detail}</small></div><div className="spark">{bars.map((h,i)=><i key={i} style={{height:h}} />)}</div></article> }
function Pulse({label,value,width}:{label:string;value:string;width:string}) { return <div className="pulse"><div><span>{label}</span><strong>{value}</strong></div><div><i style={{width}} /></div></div> }

function RiderView({destination,setDestination,act}:{destination:string;setDestination:(s:string)=>void;act:(s:string)=>void}) { return <div className="product-stage"><div className="product-copy"><p className="overline">ActivePlus Rider</p><h1>Go anywhere.<br/>Right on time.</h1><p>Book trusted rides across Berlin with clear prices, safer pickups, and support that stays with you.</p><div className="trust-row"><span>4.9 ★ rating</span><span>24/7 safety support</span><span>Upfront pricing</span></div></div><div className="phone rider-phone"><div className="phone-bar"><strong>A+</strong><span>09:41</span><span>● ● ●</span></div><div className="mini-map"><div className="route-line"/><i className="from"/><i className="to"/><span className="map-label one">Rosenthaler Platz</span><span className="map-label two">BER Airport</span></div><div className="ride-sheet"><span className="grab"/><h2>Where to?</h2><label><i className="current"/><input defaultValue="Rosenthaler Platz 1" /></label><label><i className="destination"/><input value={destination} onChange={e=>setDestination(e.target.value)} /></label><div className="quick"><button><Icon name="home"/>Home</button><button><Icon name="briefcase"/>Work</button><button><Icon name="clock"/>Later</button></div><h3>Choose a ride</h3><button className="ride-option chosen"><span className="ride-emoji">◆</span><span><strong>Active</strong><small>4 min away · 4 seats</small></span><span><strong>€34.80</strong><small>€38.20</small></span></button><button className="ride-option"><span className="ride-emoji eco">✦</span><span><strong>Active Green</strong><small>7 min away · Electric</small></span><span><strong>€31.40</strong></span></button><button className="book" onClick={()=>act("Ride booked — Jonas arrives in 4 min")}>Book Active · €34.80</button></div></div></div> }

function DriverView({online,setOnline,act}:{online:boolean;setOnline:(v:boolean)=>void;act:(s:string)=>void}) { return <div className="product-stage driver-stage"><div className="product-copy"><p className="overline">ActivePlus Driver</p><h1>Drive your day.<br/>Own your time.</h1><p>See demand, earnings, and trip details in one calm workspace designed to keep drivers moving.</p><div className="earnings-card"><span>Today’s earnings</span><strong>€184.60</strong><small>6h 24m online · 14 trips</small><div><i style={{width:"78%"}}/></div><p><b>€28.84/hr</b><span>+16% vs. weekly avg.</span></p></div></div><div className="phone driver-phone"><div className="driver-map"><div className="phone-bar dark"><strong>A+</strong><span>09:41</span><span>● ● ●</span></div><div className="heat h1"/><div className="heat h2"/><div className="heat h3"/><span className="district dx1">Mitte</span><span className="district dx2">Kreuzberg</span><div className="driver-marker">◆</div><div className="driver-top"><span>{online?"You’re online":"You’re offline"}</span><button className={online?"toggle on":"toggle"} onClick={()=>setOnline(!online)}><i/></button></div></div><div className="driver-sheet"><span className="grab"/><div className="request-head"><div><p>New trip request</p><strong>€18–€22</strong></div><span>12<small>sec</small></span></div><div className="request-route"><div><i/><b/><i/></div><p><strong>2 min (0.7 km) away</strong><small>Kastanienallee 22</small><strong>18 min (8.4 km) trip</strong><small>Kantstraße 74</small></p></div><div className="request-meta"><span><b>4.92</b> ★ rider</span><span><b>Active</b> ride</span><span><b>€3.40</b> bonus</span></div><button className="accept" disabled={!online} onClick={()=>act("Trip accepted — navigating to pickup")}>{online?"Accept trip":"Go online to accept"}</button><button className="decline" onClick={()=>act("Trip declined")}>Decline</button></div></div></div> }
