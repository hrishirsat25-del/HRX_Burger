import { useState, useEffect } from "react";
import { css, EXTRAS, SAUCES, getRank, timeAgo, initials, EmptyState, Toast } from "./theme";
import { watchMenu, watchOrders, watchCustomers, watchSettings, addOrder, updateOrder } from "./store";

export default function StaffApp() {
  const [authed, setAuthed] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState({});
  const [settings, setSettings] = useState({ staffPin: "1234", freeAt: 10 });
  const [tab, setTab] = useState("orders");
  const [toast, setToast] = useState("");

  // Walk-in order state
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [walkInCart, setWalkInCart] = useState([]);
  const [walkInExtras, setWalkInExtras] = useState([]);
  const [walkInSauces, setWalkInSauces] = useState([]);
  const [walkInStep, setWalkInStep] = useState("phone"); // phone | menu | confirm

  const showToast = (msg, dur = 2500) => { setToast(msg); setTimeout(() => setToast(""), dur); };

  useEffect(() => {
    if (!authed) return;
    const u1 = watchMenu(setMenu);
    const u2 = watchOrders(setOrders);
    const u3 = watchCustomers(setCustomers);
    const u4 = watchSettings(setSettings);
    return () => { u1(); u2(); u3(); u4(); };
  }, [authed]);

  const handlePin = () => {
    if (pinInput === settings.staffPin || pinInput === "1234") {
      setAuthed(true); setPinError(false);
    } else {
      setPinError(true); setPinInput("");
    }
  };

  const markReady = async (order) => {
    await updateOrder(order.firebaseId, { status: "ready" });
    showToast("✅ Order marked ready!");
  };

  const lockOrder = async (order) => {
    await updateOrder(order.firebaseId, { locked: true });
    showToast("🔒 Order locked!");
  };

  // Walk-in order helpers
  const wQty = (id) => walkInCart.find(c => c.id === id)?.qty || 0;
  const wAdd = (item) => setWalkInCart(prev => {
    const ex = prev.find(c => c.id === item.id);
    return ex ? prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c) : [...prev, { ...item, qty: 1 }];
  });
  const wRemove = (id) => setWalkInCart(prev => {
    const ex = prev.find(c => c.id === id);
    if (!ex) return prev;
    return ex.qty === 1 ? prev.filter(c => c.id !== id) : prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c);
  });
  const wExtrasTotal = walkInExtras.reduce((s, id) => { const e = EXTRAS.find(x => x.id === id); return s + (e?.price || 0); }, 0);
  const wSaucesTotal = walkInSauces.reduce((s, id) => { const e = SAUCES.find(x => x.id === id); return s + (e?.price || 0); }, 0);
  const wCartTotal = walkInCart.reduce((s, c) => s + c.price * c.qty, 0) + wExtrasTotal + wSaucesTotal;
  const wCartCount = walkInCart.reduce((s, c) => s + c.qty, 0);

  const placeWalkInOrder = async () => {
    if (walkInCart.length === 0) return;
    const p = walkInPhone.replace(/\D/g, '');
    const extraItems = walkInExtras.map(id => EXTRAS.find(e => e.id === id)).filter(Boolean);
    const sauceItems = walkInSauces.map(id => SAUCES.find(e => e.id === id)).filter(Boolean);
    const custName = customers[p]?.name || walkInName || "Walk-in";

    const order = {
      items: walkInCart,
      extras: extraItems,
      sauces: sauceItems,
      total: wCartTotal,
      isFree: false,
      customerPhone: p || "walkin",
      customerName: custName,
      status: "pending",
      locked: true, // Staff orders lock immediately
      timestamp: Date.now(),
      placedBy: "staff",
    };

    await addOrder(order);
    setWalkInCart([]); setWalkInExtras([]); setWalkInSauces([]);
    setWalkInPhone(""); setWalkInName(""); setWalkInStep("phone");
    setTab("orders");
    showToast(`✅ Order placed for ${custName}!`);
  };

  const pendingOrders = orders.filter(o => o.status === "pending");
  const memberList = Object.values(customers).sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));

  // PIN SCREEN
  if (!authed) {
    return (
      <>
        <style>{css}</style>
        <div className="wrap" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 3, color: "var(--muted)", marginBottom: 8 }}>STAFF ACCESS</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, letterSpacing: 3, marginBottom: 8 }}>HRX<span style={{ color: "var(--org)" }}>.</span>BURGER</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 32 }}>Enter your staff PIN to continue</div>
          <div style={{ width: "100%", maxWidth: 280 }}>
            <input
              className="input-field"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter PIN"
              value={pinInput}
              onChange={e => { setPinInput(e.target.value); setPinError(false); }}
              onKeyDown={e => e.key === "Enter" && handlePin()}
              style={{ textAlign: "center", fontSize: 24, letterSpacing: 8, marginBottom: 12 }}
              autoFocus
            />
            {pinError && <div style={{ color: "var(--org)", fontSize: 12, textAlign: "center", marginBottom: 12 }}>❌ Incorrect PIN. Try again.</div>}
            <button className="btn btn-org btn-full" onClick={handlePin}>UNLOCK →</button>
          </div>
          <div style={{ marginTop: 20, fontSize: 11, color: "var(--muted)" }}>Default PIN: 1234 (change in Admin settings)</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <div className="hdr">
          <div className="logo">HRX<span>.</span>STAFF</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {pendingOrders.length > 0 && (
              <div style={{ background: "var(--org)", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                {pendingOrders.length}
              </div>
            )}
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => setAuthed(false)}>LOCK</button>
          </div>
        </div>

        <div className="tabs">
          {[
            { id: "orders", label: `📋 ORDERS${pendingOrders.length > 0 ? ` (${pendingOrders.length})` : ""}` },
            { id: "walkin", label: "➕ NEW ORDER" },
            { id: "members", label: "👥 MEMBERS" },
          ].map(t => (
            <div key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</div>
          ))}
        </div>

        <div className="scroll-area">
          {/* ORDERS TAB */}
          {tab === "orders" && (
            orders.length === 0
              ? <EmptyState icon="🍔" text="No orders yet. Waiting for customers!" />
              : orders.map(order => (
                <div key={order.firebaseId} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 15, margin: "0 12px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1 }}>ORDER #{String(order.firebaseId).slice(-4).toUpperCase()}</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{order.customerName}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{timeAgo(order.timestamp)} · {order.placedBy === "staff" ? "👨‍🍳 Staff" : "📱 Customer"}</div>
                    </div>
                    <span className={`status-badge ${order.status === "ready" ? "ready" : order.locked ? "locked" : "pending"}`}>
                      {order.status === "ready" ? "✅ READY" : order.locked ? "🔒 LOCKED" : "⏳ OPEN"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.8, marginBottom: 8 }}>
                    {order.items?.map(i => <div key={i.id}>{i.qty}× {i.name}</div>)}
                    {order.extras?.map(e => <div key={e.id}>+ {e.name}</div>)}
                    {order.sauces?.map(s => <div key={s.id}>+ {s.name}</div>)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: order.isFree ? "var(--grn)" : "var(--amb)" }}>
                      {order.isFree ? "FREE 🎁" : `₹${order.total}`}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {!order.locked && order.status !== "ready" && (
                        <button className="btn btn-ghost" style={{ fontSize: 11, padding: "7px 12px" }} onClick={() => lockOrder(order)}>🔒 Lock</button>
                      )}
                      {order.locked && order.status === "pending" && (
                        <button className="btn btn-grn" onClick={() => markReady(order)}>✅ Mark Ready</button>
                      )}
                      {order.status === "ready" && (
                        <div style={{ fontSize: 11, color: "var(--grn)", fontWeight: 700 }}>Served ✓</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
          )}

          {/* WALK-IN ORDER TAB */}
          {tab === "walkin" && (
            <div style={{ padding: "12px" }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 2, marginBottom: 16, padding: "0 4px" }}>PLACE ORDER FOR CUSTOMER</div>

              {walkInStep === "phone" && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="input-label" style={{ marginBottom: 8 }}>CUSTOMER PHONE (OPTIONAL)</div>
                  <input className="input-field" type="tel" maxLength={10} placeholder="For loyalty tracking"
                    value={walkInPhone} onChange={e => setWalkInPhone(e.target.value.replace(/\D/g, ''))} style={{ marginBottom: 12 }} />
                  {walkInPhone.length >= 10 && customers[walkInPhone] && (
                    <div style={{ background: "rgba(255,184,0,.08)", border: "1px solid rgba(255,184,0,.2)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: "var(--amb)", fontWeight: 800, letterSpacing: 1, marginBottom: 2 }}>MEMBER FOUND</div>
                      <div style={{ fontWeight: 700 }}>{customers[walkInPhone].name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{customers[walkInPhone].orderCount || 0} orders · {getRank(customers[walkInPhone].xp || 0).icon} {getRank(customers[walkInPhone].xp || 0).rank}</div>
                    </div>
                  )}
                  {walkInPhone.length >= 10 && !customers[walkInPhone] && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="input-label">CUSTOMER NAME</div>
                      <input className="input-field" type="text" placeholder="Name for order" value={walkInName} onChange={e => setWalkInName(e.target.value)} />
                    </div>
                  )}
                  <button className="btn btn-org btn-full" onClick={() => setWalkInStep("menu")}>
                    {walkInPhone.length >= 10 ? "SELECT ITEMS →" : "SKIP & SELECT ITEMS →"}
                  </button>
                </div>
              )}

              {walkInStep === "menu" && (
                <>
                  <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
                    {menu.filter(i => i.available !== false).map(item => (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border)", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: "var(--org)" }}>₹{item.price}</div>
                        </div>
                        <div className="qty-ctrl">
                          {wQty(item.id) > 0 ? (
                            <>
                              <button className="qty-btn minus" onClick={() => wRemove(item.id)}>−</button>
                              <span className="qty-num">{wQty(item.id)}</span>
                              <button className="qty-btn plus" onClick={() => wAdd(item)}>+</button>
                            </>
                          ) : <button className="qty-btn plus" onClick={() => wAdd(item)}>+</button>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {wCartCount > 0 && (
                    <>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 2, color: "var(--muted)", marginBottom: 8 }}>EXTRAS</div>
                      <div className="extras-grid" style={{ marginBottom: 12 }}>
                        {EXTRAS.map(e => (
                          <div key={e.id} className={`extra-chip ${walkInExtras.includes(e.id) ? "selected" : ""}`} onClick={() => setWalkInExtras(prev => prev.includes(e.id) ? prev.filter(x => x !== e.id) : [...prev, e.id])}>
                            <div style={{ fontSize: 18, marginBottom: 3 }}>{e.icon}</div>
                            <div style={{ fontSize: 11, fontWeight: 700 }}>{e.name}</div>
                            <div style={{ fontSize: 10, color: "var(--muted)" }}>+₹{e.price}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 2, color: "var(--muted)", marginBottom: 8 }}>SAUCES</div>
                      <div className="extras-grid" style={{ marginBottom: 16 }}>
                        {SAUCES.map(s => (
                          <div key={s.id} className={`extra-chip ${walkInSauces.includes(s.id) ? "selected" : ""}`} onClick={() => setWalkInSauces(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}>
                            <div style={{ fontSize: 18, marginBottom: 3 }}>{s.icon}</div>
                            <div style={{ fontSize: 11, fontWeight: 700 }}>{s.name}</div>
                            <div style={{ fontSize: 10, color: "var(--muted)" }}>+₹{s.price}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setWalkInStep("phone"); setWalkInCart([]); setWalkInExtras([]); setWalkInSauces([]); }}>← Back</button>
                    <button className="btn btn-org" style={{ flex: 2, opacity: wCartCount === 0 ? .4 : 1 }} disabled={wCartCount === 0} onClick={placeWalkInOrder}>
                      PLACE ORDER ₹{wCartTotal} →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* MEMBERS TAB */}
          {tab === "members" && (
            <>
              <div className="section-title">LOYALTY MEMBERS ({memberList.length})</div>
              {memberList.length === 0
                ? <EmptyState icon="👥" text="No members yet." />
                : memberList.map(m => {
                  const free = (m.freeEarned || 0) - (m.freeUsed || 0);
                  const r = getRank(m.xp || 0);
                  return (
                    <div key={m.phone} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "13px 15px", margin: "0 12px 9px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="member-avatar" style={{ width: 42, height: 42, fontSize: 14, background: `linear-gradient(135deg,${r.color},var(--amb))` }}>{initials(m.name)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                          <div className="rank-badge" style={{ background: r.bg, color: r.color, fontSize: 9, padding: "2px 7px" }}>{r.icon} {r.rank}</div>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.phone}</div>
                        {free > 0 && <div style={{ fontSize: 10, color: "var(--grn)", fontWeight: 700, marginTop: 2 }}>🎁 {free} FREE BURGER{free > 1 ? "S" : ""} available</div>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: "var(--org)", lineHeight: 1 }}>{m.orderCount || 0}</div>
                        <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>ORDERS</div>
                      </div>
                    </div>
                  );
                })
              }
            </>
          )}
        </div>
        <Toast msg={toast} />
      </div>
    </>
  );
}
