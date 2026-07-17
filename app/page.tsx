"use client";

import { FormEvent, useEffect, useState } from "react";

type Place = { name: string; longitude: number; latitude: number };
type Quote = { distanceMeters: number; durationSeconds: number; fareCents: number; geometry: number[][] };
type Ride = { id: string; status: string; pickupName: string; dropoffName: string; fareCents: number; createdAt: number };

const quickPlaces: Record<string, Place> = {
  "Amsterdam Centraal": { name: "Amsterdam Centraal, Stationsplein, Amsterdam", longitude: 4.9003, latitude: 52.3791 },
  "Schiphol Airport": { name: "Schiphol Airport, Aankomstpassage, Schiphol", longitude: 4.7683, latitude: 52.3105 },
  "Rotterdam Centraal": { name: "Rotterdam Centraal, Stationsplein, Rotterdam", longitude: 4.4699, latitude: 51.9244 },
};

const money = (cents: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);

export default function Home() {
  const [user, setUser] = useState<{ phone: string } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authStep, setAuthStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("06 ");
  const [code, setCode] = useState("");
  const [pickupText, setPickupText] = useState("");
  const [dropoffText, setDropoffText] = useState("");
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [searchTarget, setSearchTarget] = useState<"pickup" | "dropoff" | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then((data) => setUser(data.user)).catch(() => {});
    const payment = new URLSearchParams(window.location.search).get("payment");
    if (payment === "success") setMessage("Payment received. Your ride request is now entering dispatch.");
    if (payment === "cancelled") setMessage("Payment was cancelled. Your ride has not been requested.");
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/rides").then((r) => r.json()).then((data) => setRides(data.rides ?? [])).catch(() => {});
  }, [user, message]);

  async function jsonCall(url: string, options?: RequestInit) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Something went wrong");
    return data;
  }

  async function requestOtp(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await jsonCall("/api/auth/request-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) }); setAuthStep("code"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not send code"); }
    finally { setBusy(false); }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const data = await jsonCall("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code }) }); setUser({ phone: data.user.phone }); setAuthOpen(false); setMessage("You’re signed in. Welcome to ActivePlus."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Verification failed"); }
    finally { setBusy(false); }
  }

  async function findPlaces(target: "pickup" | "dropoff") {
    const query = target === "pickup" ? pickupText : dropoffText;
    if (query.trim().length < 3) { setMessage("Enter at least 3 characters to search."); return; }
    setBusy(true); setSearchTarget(target); setMessage("");
    try { const data = await jsonCall(`/api/places?q=${encodeURIComponent(query)}`); setPlaces(data.places); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Address search failed"); setPlaces([]); }
    finally { setBusy(false); }
  }

  function choosePlace(place: Place) {
    if (searchTarget === "pickup") { setPickup(place); setPickupText(place.name); }
    else { setDropoff(place); setDropoffText(place.name); }
    setPlaces([]); setSearchTarget(null); setQuote(null);
  }

  async function getQuote() {
    if (!pickup || !dropoff) { setMessage("Select both addresses from the search results first."); return; }
    setBusy(true); setMessage("");
    try { setQuote(await jsonCall("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pickup, dropoff }) })); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not calculate fare"); }
    finally { setBusy(false); }
  }

  async function bookRide() {
    if (!user) { setAuthOpen(true); setMessage("Sign in with your Dutch mobile number to continue."); return; }
    if (!pickup || !dropoff || !quote) return;
    setBusy(true); setMessage("");
    try { const data = await jsonCall("/api/rides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pickup, dropoff }) }); window.location.assign(data.checkoutUrl); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Ride booking failed"); }
    finally { setBusy(false); }
  }

  function quickRoute(from: keyof typeof quickPlaces, to: keyof typeof quickPlaces) {
    setPickup(quickPlaces[from]); setPickupText(quickPlaces[from].name); setDropoff(quickPlaces[to]); setDropoffText(quickPlaces[to].name); setQuote(null);
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function logout() { await fetch("/api/auth/session", { method: "DELETE" }); setUser(null); setRides([]); setMessage("Signed out safely."); }

  return <main>
    <div className="ambient-glow glow-one"/><div className="ambient-glow glow-two"/><div className="ambient-glow glow-three"/>
    <nav className="site-nav"><div className="nav-inner">
      <a className="logo" href="#top">ACTIVE<span>PLUS</span><small>MOVE NL</small></a>
      <div className="nav-links"><a href="#how">How it works</a><a href="#safety">Safety</a><a href="#cities">Cities</a><a href="#drivers">Drive</a></div>
      <button className="nav-cta" onClick={() => user ? logout() : setAuthOpen(true)}>{user ? "Sign out" : "Sign in"}</button>
    </div></nav>

    <section className="hero" id="top"><div className="hero-inner">
      <div className="hero-content"><div className="hero-badge"><i/> Now moving across the Netherlands</div><h1><span>YOUR CITY.</span><span>YOUR RIDE.</span><em>right on time</em></h1><p>Book safe, transparent rides from Amsterdam to Rotterdam. Live routes by Mapbox, simple Dutch payments, and verified drivers.</p>
        <div className="hero-stats"><div><b>24/7</b><span>Support</span></div><div><b>€0</b><span>Hidden fees</span></div><div><b>100%</b><span>Verified drivers</span></div></div>
      </div>
      <div className="booking-wrap" id="book"><div className="float-tag tag-one">iDEAL + cards</div><div className="float-tag tag-two">Live traffic ETA</div><div className="booking-card">
        <div className="window-bar"><i/><i/><i/><span>BOOK A RIDE · NL</span></div>
        <div className="route-fields">
          <label><span className="route-icon pickup-icon"/><small>Pickup</small><div><input value={pickupText} onChange={(e) => { setPickupText(e.target.value); setPickup(null); setQuote(null); }} placeholder="Street, station or postcode"/><button onClick={() => findPlaces("pickup")} disabled={busy} aria-label="Search pickup">⌕</button></div></label>
          <label><span className="route-icon dropoff-icon"/><small>Destination</small><div><input value={dropoffText} onChange={(e) => { setDropoffText(e.target.value); setDropoff(null); setQuote(null); }} placeholder="Where are you going?"/><button onClick={() => findPlaces("dropoff")} disabled={busy} aria-label="Search destination">⌕</button></div></label>
        </div>
        {places.length > 0 && <div className="search-results">{places.map((place) => <button key={`${place.longitude}-${place.latitude}`} onClick={() => choosePlace(place)}><i>⌖</i><span>{place.name}</span></button>)}</div>}
        <div className="ride-options"><button className="ride-choice selected"><span className="vehicle">◆</span><span><b>Active</b><small>Everyday comfort · 4 seats</small></span>{quote && <strong>{money(quote.fareCents)}</strong>}</button><button className="ride-choice"><span className="vehicle green">✦</span><span><b>Active Green</b><small>Electric or hybrid</small></span><strong>{quote ? money(Math.max(895, quote.fareCents - 80)) : "—"}</strong></button></div>
        {quote ? <div className="quote-line"><span><b>{Math.round(quote.durationSeconds / 60)} min</b><small>Estimated journey</small></span><span><b>{(quote.distanceMeters / 1000).toFixed(1)} km</b><small>Live traffic route</small></span><span><b>{money(quote.fareCents)}</b><small>Upfront price</small></span></div> : <button className="quote-btn" onClick={getQuote} disabled={busy}>{busy ? "Calculating…" : "Get live price"}<span>→</span></button>}
        {quote && <button className="book-btn" onClick={bookRide} disabled={busy}>{user ? `Continue to payment · ${money(quote.fareCents)}` : "Sign in & book"}<span>→</span></button>}
        <div className="powered"><span>ROUTING BY MAPBOX</span><span>PAYMENTS BY STRIPE</span></div>
      </div></div>
    </div></section>

    {message && <div className="notice" role="status"><span>+</span>{message}<button onClick={() => setMessage("")}>×</button></div>}

    <section className="routes" id="cities"><div className="section-head"><div><small>POPULAR ROUTES</small><h2>MOVE <span>WITHOUT LIMITS</span></h2></div><p>One platform for local trips, airport transfers, and journeys between Dutch cities.</p></div>
      <div className="route-grid">
        <button className="route-card big" onClick={() => quickRoute("Amsterdam Centraal", "Schiphol Airport")}><div className="map-art amsterdam"><i/><b>AMS</b><span>Amsterdam</span></div><div><span>Airport favourite</span><h3>AMSTERDAM → SCHIPHOL</h3><p>Live traffic pricing · usually 18–28 min</p></div></button>
        <button className="route-card" onClick={() => quickRoute("Rotterdam Centraal", "Amsterdam Centraal")}><div className="map-art rotterdam"><i/><b>RTM</b></div><div><span>Intercity</span><h3>ROTTERDAM → AMSTERDAM</h3><p>Comfortable door-to-door travel</p></div></button>
        <article className="route-card metric-card"><div><small>ACTIVE COVERAGE</small><b>12</b><span>Dutch cities</span></div><div className="signal">{[40,58,72,48,86,65,94].map((h) => <i key={h} style={{ height: h }}/>)}</div></article>
      </div>
    </section>

    <section className="steps" id="how"><div className="section-head"><div><small>FROM A TO B</small><h2>THREE STEPS. <span>ZERO FRICTION.</span></h2></div></div><div className="step-grid">
      <article className="step featured"><b>01</b><div className="step-icon">⌖</div><h3>SET YOUR ROUTE</h3><p>Search any Dutch address, station, airport, or postcode. Mapbox calculates a traffic-aware route and ETA.</p><strong>LIVE</strong><small>traffic-aware pricing</small></article>
      <article className="step"><b>02</b><div className="step-icon">◎</div><h3>VERIFY & PAY</h3><p>Secure your account with a one-time SMS code, then pay the upfront fare using iDEAL or your card.</p><strong>+31</strong><small>Dutch mobile login</small></article>
      <article className="step"><b>03</b><div className="step-icon">↗</div><h3>MEET YOUR DRIVER</h3><p>Follow dispatch and trip status from request to arrival. Every trip creates a traceable service record.</p><strong>24/7</strong><small>ride support</small></article>
    </div></section>

    <section className="safety" id="safety"><div className="safety-copy"><small>ACTIVEPLUS SAFETY</small><h2>BUILT FOR TRUST.<br/><span>DESIGNED FOR CONTROL.</span></h2><p>Verified identities, server-side fares, signed sessions, traceable payment events, and a complete trip history form the safety foundation of every ActivePlus journey.</p><div className="safety-list"><span><i>✓</i>Dutch mobile verification</span><span><i>✓</i>Server-calculated pricing</span><span><i>✓</i>Secure Stripe Checkout</span><span><i>✓</i>Auditable ride lifecycle</span></div></div><div className="safety-console"><div className="console-head"><span>TRIP SAFETY LAYER</span><i>ACTIVE</i></div><div className="radar"><div/><div/><div/><b>A+</b><span className="pulse p1"/><span className="pulse p2"/><span className="pulse p3"/></div><div className="console-foot"><span><b>ENCRYPTED</b><small>Session</small></span><span><b>VERIFIED</b><small>Phone</small></span><span><b>TRACEABLE</b><small>Journey</small></span></div></div></section>

    <section className="driver" id="drivers"><div><small>DRIVE WITH ACTIVEPLUS</small><h2>YOUR HOURS.<br/><span>YOUR INCOME.</span></h2><p>We’re onboarding licensed taxi and private-hire partners for our first Netherlands service areas.</p><button onClick={() => setMessage("Driver onboarding opens after the operator licence and screening process are configured.")}>Join the driver waitlist <span>→</span></button></div><div className="driver-stats"><article><small>Transparent</small><b>FARES</b><p>See the route and earnings before accepting.</p></article><article><small>Flexible</small><b>HOURS</b><p>Choose when and where you drive.</p></article><article><small>Local</small><b>SUPPORT</b><p>Human operations support in the Netherlands.</p></article></div></section>

    {user && <section className="account"><div className="section-head"><div><small>YOUR ACCOUNT</small><h2>RECENT <span>RIDES</span></h2></div><p>Signed in as {user.phone}</p></div>{rides.length ? <div className="ride-history">{rides.map((ride) => <article key={ride.id}><span className={`ride-status ${ride.status}`}>{ride.status.replaceAll("_", " ")}</span><b>{ride.pickupName}</b><i>→</i><b>{ride.dropoffName}</b><strong>{money(ride.fareCents)}</strong><small>{ride.id}</small></article>)}</div> : <div className="empty-state">Your first ActivePlus ride will appear here.</div>}</section>}

    <footer><div className="logo">ACTIVE<span>PLUS</span><small>MOVE NL</small></div><p>Transport technology for the Netherlands. Production service is subject to provider activation and local licensing.</p><div><a href="#safety">Safety</a><a href="#drivers">Drive</a><a href="mailto:support@activeplus.nl">Support</a></div><small>© 2026 ActivePlus · Design foundation adapted from TemplateMo Pixel Forge</small></footer>

    {authOpen && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setAuthOpen(false)}><div className="auth-modal"><button className="modal-close" onClick={() => setAuthOpen(false)}>×</button><div className="auth-logo">A+</div><small>ACTIVEPLUS ID</small><h2>{authStep === "phone" ? "YOUR RIDE STARTS HERE" : "CHECK YOUR PHONE"}</h2><p>{authStep === "phone" ? "Enter your Dutch mobile number. We’ll send a one-time verification code by SMS." : `Enter the verification code sent to ${phone}.`}</p>
      {authStep === "phone" ? <form onSubmit={requestOtp}><label>Dutch mobile number</label><div className="phone-input"><span>🇳🇱 +31</span><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoFocus placeholder="06 12345678"/></div><button disabled={busy}>{busy ? "Sending…" : "Send secure code"}<span>→</span></button></form> : <form onSubmit={verifyOtp}><label>Verification code</label><input className="code-input" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoFocus placeholder="••••••"/><button disabled={busy}>{busy ? "Verifying…" : "Verify & continue"}<span>→</span></button><button type="button" className="text-btn" onClick={() => setAuthStep("phone")}>Use another number</button></form>}
      <div className="auth-note">By continuing, you agree to the ActivePlus service terms and privacy notice.</div></div></div>}
  </main>;
}
