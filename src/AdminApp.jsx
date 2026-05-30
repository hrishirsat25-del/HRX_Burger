import { useState, useEffect } from "react";
import { css, DEFAULT_MENU, DEFAULT_SETTINGS, getRank, timeAgo, initials, EmptyState, Toast } from "./theme";
import { watchMenu, watchOrders, watchCustomers, watchSettings, saveMenu, saveSettings, saveCustomers } from "./store";

export default function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState("");

  // Menu edit state
  const [editItem, setEditItem] = useState(null); // null = closed, {} = new, item = editing
  const [editForm, setEditForm] = useState({});

  // Settings edit
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const showToast = (msg, dur = 2500) => { setToast(msg); setTimeout(() => setToast(""), dur); };

  useEffect(() => {
    if (!authed) return;
    const u1 = watchMenu(setMenu);
    const u2 = watchOrders(setOrders);
    const u3 = watchCustomers(setCustomers);
    const u4 = watchSettings((s) => { setSettings(s); setSettingsForm(s); });
    return () => { u1(); u2(); u3(); u4(); };
  }, [authed]);

  const handleLogin = () => {
    if (pwInput === settings.adminPassword || pwInput === "hrxadmin") {
      setAuthed(true); setPwError(false);
    } else {
      setPwError(true); setPwInput("");
    }
  };

  // Menu ops
  const toggleAvailability = async (id) => {
    const updated = menu.map(i => i.id === id ? { ...i, available: !i.available } : i);
    await saveMenu(updated);
    showToast("✅ Menu updated!");
  };

  const openAddItem = () => {
    setEditForm({ name: "", price: "", desc: "", tag: "", isBurger: true, available: true });
    setEditItem("new");
  };

  const openEditItem = (item) => {
    setEditForm({ ...item });
    setEditItem(item.id);
  };

  const saveItem = async () => {
    if (!editForm.name || !editForm.price) return;
    let updated;
    if (editItem === "new") {
      const newItem = { ...editForm, id: Date.now().toString(), price: Number(editForm.price), available: true };
      updated = [...menu, newItem];
    } else {
      updated = menu.map(i => i.id === editItem ? { ...i, ...editForm, price: Number(editForm.price) } : i);
    }
    await saveMenu(updated);
    setEditItem(null);
    showToast(editItem === "new" ? "🍔 Item added!" : "✅ Item updated!");
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    const updated = menu.filter(i => i.id !== id);
    await saveMenu(updated);
    showToast("🗑️ Item removed!");
  };

  const resetMenu = async () => {
    if (!window.confirm("Reset to default menu?")) return;
    await saveMenu(DEFAULT_MENU);
    showToast("↩️ Menu reset to defaults!");
  };

  // Settings save
  const handleSaveSettings = async () => {
    await saveSettings(settingsForm);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
    showToast("⚙️ Settings saved!");
  };

  // Stats
  const totalRevenue = orders.filter(o => !o.isFree).reduce((s, o) => s + (o.total || 0), 0);
  const memberList = Object.values(customers).sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
  const pendingCount = orders.filter(o => o.status === "pending").length;
  const freeRedeemed = orders.filter(o => o.isFree).length;
  const todayOrders = orders.filter(o => {
    const d = new Date(o.timestamp);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  });

  // LOGIN SCREEN
  if (!authed) {
    return (
      <>
        <style>{css}</style>
        <div className="wrap" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 3, color: "var(--muted)", marginBottom: 8 }}>SUPER ADMIN</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, letterSpacing: 3, marginBottom: 8 }}>HRX<span style={{ color: "var(--org)" }}>.</span>BURGER</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 32 }}>Enter your admin password to continue</div>
          <div style={{ width: "100%", maxWidth: 280 }}>
            <input
              className="input-field"
              type="password"
              placeholder="Admin password"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{ textAlign: "center", fontSize: 16, letterSpacing: 2, marginBottom: 12 }}
              autoFocus
            />
            {pwError && <div style={{ color: "var(--org)", fontSize: 12, textAlign: "center", marginBottom: 12 }}>❌ Incorrect password. Try again.</div>}
            <button className="btn btn-org btn-full" onClick={handleLogin}>LOGIN →</button>
          </div>
          <div style={{ marginTop: 20, fontSize: 11, color: "var(--muted)" }}>Default password: hrxadmin</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <div className="hdr">
          <div className="logo">HRX<span>.</span>ADMIN</div>
          <button className="btn btn-red" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => setAuthed(false)}>LOGOUT</button>
        </div>

        <div className="tabs">
          {[
            { id: "dashboard", label: "📊 STATS" },
            { id: "menu", label: "🍔 MENU" },
            { id: "members", label: "👥 MEMBERS" },
            { id: "orders", label: "📋 ORDERS" },
            { id: "settings", label: "⚙️ SETTINGS" },
          ].map(t => (
            <div key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</div>
          ))}
        </div>

        <div className="scroll-area">

          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <div style={{ padding: 12 }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 2, color: "var(--muted)", marginBottom: 12 }}>OVERVIEW</div>
              <div className="stat-grid" style={{ marginBottom: 12 }}>
                {[
                  { label: "Total Revenue", val: `₹${totalRevenue}`, color: "var(--grn)" },
                  { label: "Total Orders", val: orders.length, color: "var(--org)" },
                  { label: "Members", val: memberList.length, color: "var(--amb)" },
                  { label: "Today's Orders", val: todayOrders.length, color: "var(--blue)" },
                  { label: "Pending", val: pendingCount, color: "var(--pur)" },
                  { label: "Free Redeemed", val: freeRedeemed, color: "var(--grn)" },
                ].map(s => (
                  <div className="stat-cell" key={s.label}>
                    <div className="stat-val" style={{ color: s.color, fontSize: s.label === "Total Revenue" ? 22 : 30 }}>{s.val}</div>
                    <div className="stat-lbl">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--muted)", marginBottom: 12 }}>TOP CUSTOMERS</div>
                {memberList.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 16, color: "var(--muted)", fontSize: 13 }}>No members yet</div>
                ) : memberList.slice(0, 5).map((m, i) => (
                  <div key={m.phone} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: "var(--muted)", width: 22 }}>#{i + 1}</div>
                    <div className="member-avatar" style={{ width: 32, height: 32, fontSize: 12, background: `linear-gradient(135deg,${getRank(m.xp || 0).color},var(--amb))` }}>{initials(m.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)" }}>{getRank(m.xp || 0).rank}</div>
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: "var(--org)" }}>{m.orderCount || 0}</div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--muted)", marginBottom: 12 }}>MENU ITEMS ({menu.length})</div>
                {menu.map(item => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</span>
                      {!item.available && <span style={{ fontSize: 10, color: "var(--org)", marginLeft: 8, fontWeight: 700 }}>UNAVAILABLE</span>}
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: "var(--org)" }}>₹{item.price}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MENU MANAGEMENT */}
          {tab === "menu" && (
            <div style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 2, color: "var(--muted)" }}>MENU ITEMS</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: "7px 12px" }} onClick={resetMenu}>↩️ Reset</button>
                  <button className="btn btn-org" style={{ fontSize: 12, padding: "8px 14px" }} onClick={openAddItem}>+ ADD ITEM</button>
                </div>
              </div>

              {menu.map(item => (
                <div key={item.id} className="card" style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</div>
                        {item.tag && <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: "var(--amb)" }}>{item.tag}</div>}
                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: "2px 8px", borderRadius: 20, background: item.available ? "#0f2d1a" : "#2d0f0f", color: item.available ? "var(--grn)" : "var(--org)" }}>
                          {item.available ? "LIVE" : "HIDDEN"}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.desc}</div>
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: "var(--org)", marginLeft: 12 }}>₹{item.price}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" style={{ flex: 1, fontSize: 12, padding: "8px" }} onClick={() => toggleAvailability(item.id)}>
                      {item.available ? "🙈 Hide" : "👁️ Show"}
                    </button>
                    <button className="btn btn-amb" style={{ flex: 1, fontSize: 12, padding: "8px" }} onClick={() => openEditItem(item)}>✏️ Edit</button>
                    <button className="btn btn-red" style={{ flex: 1, fontSize: 12, padding: "8px" }} onClick={() => deleteItem(item.id)}>🗑️ Delete</button>
                  </div>
                </div>
              ))}

              {/* ADD/EDIT MODAL */}
              {editItem !== null && (
                <div className="modal-overlay" onClick={() => setEditItem(null)}>
                  <div className="modal-sheet" onClick={e => e.stopPropagation()}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 2, marginBottom: 16 }}>
                      {editItem === "new" ? "ADD MENU ITEM" : "EDIT ITEM"}
                    </div>
                    {[
                      { key: "name", label: "ITEM NAME", placeholder: "e.g. Spicy Smash Burger" },
                      { key: "price", label: "PRICE (₹)", placeholder: "e.g. 129", type: "number" },
                      { key: "desc", label: "DESCRIPTION", placeholder: "Short description" },
                      { key: "tag", label: "TAG (OPTIONAL)", placeholder: "e.g. NEW! or BESTSELLER" },
                    ].map(f => (
                      <div key={f.key} style={{ marginBottom: 12 }}>
                        <div className="input-label">{f.label}</div>
                        <input className="input-field" type={f.type || "text"} placeholder={f.placeholder}
                          value={editForm[f.key] || ""}
                          onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
                      <input type="checkbox" id="isBurger" checked={editForm.isBurger || false}
                        onChange={e => setEditForm(prev => ({ ...prev, isBurger: e.target.checked }))} />
                      <label htmlFor="isBurger" style={{ fontSize: 13, cursor: "pointer" }}>Counts as a burger (for loyalty stamps)</label>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditItem(null)}>Cancel</button>
                      <button className="btn btn-org" style={{ flex: 2 }} onClick={saveItem} disabled={!editForm.name || !editForm.price}>
                        {editItem === "new" ? "ADD ITEM +" : "SAVE CHANGES"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MEMBERS */}
          {tab === "members" && (
            <>
              <div className="section-title">ALL MEMBERS ({memberList.length})</div>
              {memberList.length === 0
                ? <EmptyState icon="👥" text="No members yet." />
                : memberList.map(m => {
                  const r = getRank(m.xp || 0);
                  const free = (m.freeEarned || 0) - (m.freeUsed || 0);
                  return (
                    <div key={m.phone} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", margin: "0 12px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                        <div className="member-avatar" style={{ width: 44, height: 44, fontSize: 15, background: `linear-gradient(135deg,${r.color},var(--amb))` }}>{initials(m.name)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                            <div className="rank-badge" style={{ background: r.bg, color: r.color, fontSize: 9, padding: "2px 7px" }}>{r.icon} {r.rank}</div>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.phone}</div>
                        </div>
                      </div>
                      <div className="stat-grid">
                        {[
                          { label: "Orders", val: m.orderCount || 0, color: "var(--org)" },
                          { label: "XP", val: m.xp || 0, color: "var(--amb)" },
                          { label: "Free Burgers", val: free, color: "var(--grn)" },
                          { label: "Referrals", val: m.successfulReferrals || 0, color: "var(--pur)" },
                        ].map(s => (
                          <div className="stat-cell" key={s.label} style={{ padding: 8 }}>
                            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: s.color }}>{s.val}</div>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: .5, color: "var(--muted)" }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      {(m.achievements || []).length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
                          Achievements: {(m.achievements || []).map(id => {
                            const badges = { first: "🍔", addict: "🔥", master: "💪", cheese: "🧀", sauce: "🌶️", referral: "🤝", monarch: "👑" };
                            return badges[id] || "";
                          }).join(" ")}
                        </div>
                      )}
                    </div>
                  );
                })
              }
            </>
          )}

          {/* ORDERS */}
          {tab === "orders" && (
            <>
              <div className="section-title">ALL ORDERS ({orders.length})</div>
              {orders.length === 0
                ? <EmptyState icon="📋" text="No orders yet." />
                : orders.map(order => (
                  <div key={order.firebaseId} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 15, margin: "0 12px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1 }}>#{String(order.firebaseId).slice(-4).toUpperCase()}</div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{order.customerName}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>{timeAgo(order.timestamp)} · {order.placedBy === "staff" ? "👨‍🍳 Staff" : "📱 Customer"}</div>
                      </div>
                      <span className={`status-badge ${order.status === "ready" ? "ready" : order.locked ? "locked" : "pending"}`}>
                        {order.status === "ready" ? "✅ READY" : order.locked ? "🔒 LOCKED" : "⏳ PENDING"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.8 }}>
                      {order.items?.map(i => <div key={i.id}>{i.qty}× {i.name}</div>)}
                      {order.extras?.map(e => <div key={e.id}>+ {e.name}</div>)}
                      {order.sauces?.map(s => <div key={s.id}>+ {s.name}</div>)}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: order.isFree ? "var(--grn)" : "var(--amb)" }}>
                        {order.isFree ? "FREE 🎁" : `₹${order.total}`}
                      </div>
                      {order.isFree && <span style={{ fontSize: 10, fontWeight: 800, color: "var(--grn)", background: "#0a2015", padding: "3px 8px", borderRadius: 20 }}>LOYALTY FREE</span>}
                    </div>
                  </div>
                ))
              }
            </>
          )}

          {/* SETTINGS */}
          {tab === "settings" && (
            <div style={{ padding: 12 }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 2, color: "var(--muted)", marginBottom: 12 }}>SETTINGS</div>

              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--amb)", letterSpacing: 1, marginBottom: 14 }}>🍔 LOYALTY PROGRAM</div>
                {[
                  { key: "freeAt", label: "Stamps needed for free burger", type: "number" },
                  { key: "referralPointsPer", label: "Points per successful referral", type: "number" },
                  { key: "referralThreshold", label: "Referred customer must buy N burgers", type: "number" },
                  { key: "redeemAt", label: "Points needed to redeem free burger", type: "number" },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 12 }}>
                    <div className="input-label">{f.label.toUpperCase()}</div>
                    <input className="input-field" type={f.type} value={settingsForm[f.key] || ""}
                      onChange={e => setSettingsForm(prev => ({ ...prev, [f.key]: Number(e.target.value) }))} />
                  </div>
                ))}
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--pur)", letterSpacing: 1, marginBottom: 14 }}>🔐 ACCESS CONTROL</div>
                {[
                  { key: "staffPin", label: "Staff PIN (numbers only)" },
                  { key: "adminPassword", label: "Admin Password" },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 12 }}>
                    <div className="input-label">{f.label.toUpperCase()}</div>
                    <input className="input-field" type="text" value={settingsForm[f.key] || ""}
                      onChange={e => setSettingsForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>

              <button className="btn btn-org btn-full" style={{ marginBottom: 8 }} onClick={handleSaveSettings}>
                {settingsSaved ? "✅ SAVED!" : "SAVE SETTINGS"}
              </button>

              <div className="card" style={{ marginTop: 20, background: "linear-gradient(135deg,#1a0a0a,#0d0505)", borderColor: "rgba(239,68,68,.2)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--red)", letterSpacing: 1, marginBottom: 10 }}>⚠️ DANGER ZONE</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>These actions cannot be undone. Use with extreme caution.</div>
                <button className="btn btn-red" style={{ width: "100%", marginBottom: 8 }}
                  onClick={async () => { if (window.confirm("Clear ALL orders? This cannot be undone!")) { const { ref, set } = await import('firebase/database'); const { db } = await import('./firebase'); await set(ref(db, 'orders'), null); showToast("🗑️ All orders cleared!"); } }}>
                  🗑️ Clear All Orders
                </button>
                <button className="btn btn-red" style={{ width: "100%" }}
                  onClick={async () => { if (window.confirm("Clear ALL members? This cannot be undone!")) { await saveCustomers({}); showToast("🗑️ All members cleared!"); } }}>
                  🗑️ Clear All Members
                </button>
              </div>
            </div>
          )}
        </div>
        <Toast msg={toast} />
      </div>
    </>
  );
}
