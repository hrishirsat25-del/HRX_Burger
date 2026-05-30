import { useState, useEffect, useRef } from "react";
import {
  css, EXTRAS, SAUCES, ACHIEVEMENTS,
  getRank, getNextRank, genRefCode, timeAgo, initials,
  EmptyState, Toast,
} from "./theme";
import {
  watchMenu, watchCustomers, watchSettings,
  addOrder, updateOrder, deleteOrder,
  saveCustomer, saveCustomers, getCustomerOnce,
} from "./store";

export default function CustomerApp() {
  const [menu, setMenu] = useState([]);
  const [customers, setCustomers] = useState({});
  const [settings, setSettings] = useState({ freeAt: 10, redeemAt: 2000, referralPointsPer: 100, referralThreshold: 10 });
  const [cStep, setCStep] = useState("enroll");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [refCodeInput, setRefCodeInput] = useState("");
  const [currentCust, setCurrentCust] = useState(null);
  const [cart, setCart] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedSauces, setSelectedSauces] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ food: 0, service: 0, taste: 0, comment: "" });
  const [showPopup, setShowPopup] = useState(null);
  const [modifyTimer, setModifyTimer] = useState(null);
  const modifyIntervalRef = useRef(null);
  const [pendingOrderFbId, setPendingOrderFbId] = useState(null);
  const [toast, setToast] = useState("");
  const [custTab, setCustTab] = useState("menu");

  const showToast = (msg, dur = 2500) => { setToast(msg); setTimeout(() => setToast(""), dur); };

  useEffect(() => {
    const u1 = watchMenu(setMenu);
    const u2 = watchCustomers(setCustomers);
    const u3 = watchSettings(setSettings);
    return () => { u1(); u2(); u3(); };
  }, []);

  const liveCustomer = currentCust ? (customers[currentCust.phone.replace(/\D/g, '')] || currentCust) : null;
  const ordersDone = liveCustomer?.orderCount || 0;
  const freeAvailable = (liveCustomer?.freeEarned || 0) - (liveCustomer?.freeUsed || 0);
  const progressInCycle = ordersDone % settings.freeAt;
  const referralPoints = liveCustomer?.referralPoints || 0;
  const xp = liveCustomer?.xp || 0;
  const rank = getRank(xp);
  const nextRank = getNextRank(xp);
  const xpInCurrentTier = xp - rank.minXP;
  const xpNeededForTier = (nextRank ? nextRank.minXP : xp) - rank.minXP;
  const xpPct = nextRank ? Math.min(100, (xpInCurrentTier / xpNeededForTier) * 100) : 100;

  const cartQty = (id) => cart.find(c => c.id === id)?.qty || 0;
  const extrasTotal = selectedExtras.reduce((s, id) => { const e = EXTRAS.find(x => x.id === id); return s + (e?.price || 0); }, 0);
  const saucesTotal = selectedSauces.reduce((s, id) => { const e = SAUCES.find(x => x.id === id); return s + (e?.price || 0); }, 0);
  const cartItemTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartTotal = cartItemTotal + extrasTotal + saucesTotal;
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const addItem = (item) => setCart(prev => {
    const ex = prev.find(c => c.id === item.id);
    return ex ? prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c) : [...prev, { ...item, qty: 1 }];
  });
  const removeItem = (id) => setCart(prev => {
    const ex = prev.find(c => c.id === id);
    if (!ex) return prev;
    return ex.qty === 1 ? prev.filter(c => c.id !== id) : prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c);
  });
  const toggleExtra = (id) => setSelectedExtras(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSauce = (id) => setSelectedSauces(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const checkAchievements = (c) => {
    const earned = c.achievements || [];
    const newEarned = [...earned];
    let xpBonus = 0;
    for (const a of ACHIEVEMENTS) {
      if (!earned.includes(a.id) && a.check(c)) {
        newEarned.push(a.id);
        xpBonus += 25;
        setTimeout(() => showToast(`🏆 Achievement: ${a.name}! +25 XP`, 3000), 800);
      }
    }
    return { achievements: newEarned, xpBonus };
  };

  const awardXP = (custData, amount) => {
    const newXP = (custData.xp || 0) + amount;
    const oldRank = getRank(custData.xp || 0);
    const newRankData = getRank(newXP);
    if (newRankData.minXP > oldRank.minXP) {
      setTimeout(() => setShowPopup({ type: "rankUp", rank: newRankData }), 600);
    }
    return newXP;
  };

  const handleEnroll = async () => {
    if (phone.length < 10) return;
    const p = phone.trim().replace(/\D/g, '');
    const existing = customers[p];
    if (existing) {
      setCurrentCust(existing);
      if (existing.hasFreeReferralBurger > 0) {
        setTimeout(() => setShowPopup({ type: "referralReward" }), 500);
      }
    } else {
      let referredBy = null;
      if (refCodeInput) {
        const refPhone = Object.keys(customers).find(ph => genRefCode(ph) === refCodeInput.trim().toUpperCase());
        if (refPhone) referredBy = refPhone;
      }
      const newCust = {
        phone: p, name: name.trim() || "Guest",
        orderCount: 0, freeEarned: 0, freeUsed: 0,
        xp: 0, referralPoints: 0, successfulReferrals: 0,
        referredBy: referredBy || null, refCode: genRefCode(p),
        cheeseCount: 0, saucesTriedSet: [], saucesTriedCount: 0,
        achievements: [], orderHistory: [], hasFreeReferralBurger: 0,
      };
      await saveCustomer(p, newCust);
      setCurrentCust(newCust);
    }
    setCStep("menu");
    setCustTab("menu");
  };

  const placeOrder = async (isFree = false) => {
    if (cart.length === 0) return;
    const p = currentCust?.phone?.replace(/\D/g, '');
    const extraItems = selectedExtras.map(id => EXTRAS.find(e => e.id === id)).filter(Boolean);
    const sauceItems = selectedSauces.map(id => SAUCES.find(e => e.id === id)).filter(Boolean);

    const order = {
      items: cart,
      extras: extraItems,
      sauces: sauceItems,
      total: isFree ? 0 : cartTotal,
      isFree,
      customerPhone: p,
      customerName: liveCustomer?.name || "Guest",
      status: "pending",
      locked: false,
      timestamp: Date.now(),
      placedBy: "customer",
    };

    const result = await addOrder(order);
    const fbId = result.key;

    if (p) {
      const c = { ...(customers[p] || {}) };
      if (selectedExtras.includes("cheese")) c.cheeseCount = (c.cheeseCount || 0) + 1;
      const triedSet = new Set(c.saucesTriedSet || []);
      sauceItems.forEach(s => triedSet.add(s.id));
      c.saucesTriedSet = [...triedSet];
      c.saucesTriedCount = c.saucesTriedSet.length;

      let xpEarned = 0;
      if (isFree) {
        c.freeUsed = (c.freeUsed || 0) + 1;
        xpEarned += 5;
      } else {
        c.orderCount = (c.orderCount || 0) + 1;
        xpEarned += 20;
        const newFreeEarned = Math.floor(c.orderCount / settings.freeAt);
        if (newFreeEarned > (c.freeEarned || 0)) {
          c.freeEarned = newFreeEarned;
          setTimeout(() => setShowPopup({ type: "freeBurger" }), 1000);
        }
        if (c.referredBy && c.orderCount === settings.referralThreshold) {
          const refPhone = c.referredBy;
          if (customers[refPhone]) {
            const refC = { ...customers[refPhone] };
            refC.referralPoints = (refC.referralPoints || 0) + settings.referralPointsPer;
            refC.successfulReferrals = (refC.successfulReferrals || 0) + 1;
            refC.xp = awardXP(refC, 50);
            if (refC.referralPoints >= settings.redeemAt) {
              refC.hasFreeReferralBurger = (refC.hasFreeReferralBurger || 0) + Math.floor(refC.referralPoints / settings.redeemAt);
              refC.referralPoints = refC.referralPoints % settings.redeemAt;
            }
            const achRef = checkAchievements(refC);
            refC.achievements = achRef.achievements;
            refC.xp = (refC.xp || 0) + achRef.xpBonus;
            await saveCustomer(refPhone, refC);
          }
        }
      }

      c.xp = awardXP(c, xpEarned);
      c.orderHistory = [{ id: fbId, total: order.total, isFree: order.isFree, items: cart.map(i => i.name).join(", "), ts: Date.now() }, ...(c.orderHistory || [])].slice(0, 20);
      const ach = checkAchievements(c);
      c.achievements = ach.achievements;
      c.xp = (c.xp || 0) + ach.xpBonus;
      await saveCustomer(p, c);
      setCurrentCust(c);
    }

    setLastOrder({ ...order, firebaseId: fbId });
    setCart([]); setSelectedExtras([]); setSelectedSauces([]);
    setCStep("success");
    setPendingOrderFbId(fbId);
    setModifyTimer(60);
    if (modifyIntervalRef.current) clearInterval(modifyIntervalRef.current);
    modifyIntervalRef.current = setInterval(() => {
      setModifyTimer(prev => {
        if (prev <= 1) {
          clearInterval(modifyIntervalRef.current);
          updateOrder(fbId, { locked: true });
          setPendingOrderFbId(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelOrder = async () => {
    if (!pendingOrderFbId) return;
    clearInterval(modifyIntervalRef.current);
    await deleteOrder(pendingOrderFbId);
    const p = currentCust?.phone?.replace(/\D/g, '');
    if (p && customers[p]) {
      const c = { ...customers[p] };
      if (!lastOrder?.isFree && c.orderCount > 0) { c.orderCount--; c.freeEarned = Math.floor(c.orderCount / settings.freeAt); }
      if (lastOrder?.isFree) { c.freeUsed = Math.max(0, (c.freeUsed || 0) - 1); }
      await saveCustomer(p, c);
      setCurrentCust(c);
    }
    setPendingOrderFbId(null); setModifyTimer(null);
    showToast("❌ Order cancelled");
    setCStep("menu"); setLastOrder(null);
  };

  const submitReview = async () => {
    const p = currentCust?.phone?.replace(/\D/g, '');
    if (!p) return;
    const c = { ...customers[p] };
    c.xp = (c.xp || 0) + 5;
    c.reviews = [...(c.reviews || []), { ...reviewData, ts: Date.now() }];
    await saveCustomer(p, c);
    setCurrentCust(c);
    setShowReviewModal(false);
    showToast("⭐ Review submitted! +5 XP");
  };

  const redeemReferralBurger = async () => {
    const p = currentCust?.phone?.replace(/\D/g, '');
    if (!p) return;
    const c = { ...customers[p] };
    c.hasFreeReferralBurger = Math.max(0, (c.hasFreeReferralBurger || 0) - 1);
    await saveCustomer(p, c);
    setCurrentCust(c);
    setShowPopup(null);
    showToast("🎁 Free burger coupon added!", 3000);
  };

  const availableMenu = menu.filter(item => item.available !== false);

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <div className="hdr">
          <div className="logo">HRX<span>.</span>BURGER</div>
          {liveCustomer && cStep === "menu" && (
            <div className="rank-badge" style={{ background: rank.bg, color: rank.color, border: `1px solid ${rank.color}40`, cursor: "pointer" }}
              onClick={() => setCustTab("dashboard")}>
              {rank.icon} {rank.rank}
            </div>
          )}
        </div>

        {/* ENROLL */}
        {cStep === "enroll" && (
          <>
            <div style={{ background: "linear-gradient(160deg,#1a0800,#0d0500)", borderBottom: "1px solid var(--border)", padding: "28px 20px 24px" }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, letterSpacing: 3, lineHeight: .95, marginBottom: 10 }}>
                ORDER YOUR<br /><span style={{ color: "var(--org)" }}>SMASH</span><br />BURGER
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 24 }}>
                Enter your phone to order · earn stamps · level up · get free burgers 🔥
              </div>
              <div style={{ marginBottom: 12 }}>
                <div className="input-label">PHONE NUMBER</div>
                <input className="input-field" type="tel" maxLength={10} placeholder="10-digit number"
                  value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} />
              </div>
              {phone.length >= 10 && !customers[phone.replace(/\D/g, '')] && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div className="input-label">YOUR NAME (OPTIONAL)</div>
                    <input className="input-field" type="text" placeholder="What should we call you?" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div className="input-label">REFERRAL CODE (OPTIONAL)</div>
                    <input className="input-field" type="text" placeholder="e.g. HRX1234" value={refCodeInput} onChange={e => setRefCodeInput(e.target.value)} />
                  </div>
                </>
              )}
              {phone.length >= 10 && customers[phone.replace(/\D/g, '')] && (
                <div style={{ background: "rgba(255,184,0,.08)", border: "1px solid rgba(255,184,0,.2)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: "var(--amb)", fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>WELCOME BACK!</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{customers[phone.replace(/\D/g, '')].name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{customers[phone.replace(/\D/g, '')].orderCount || 0} orders · {getRank(customers[phone.replace(/\D/g, '')].xp || 0).icon} {getRank(customers[phone.replace(/\D/g, '')].xp || 0).rank}</div>
                </div>
              )}
              <button className="btn btn-org btn-full" onClick={handleEnroll} disabled={phone.length < 10}>CONTINUE →</button>
            </div>
            <div style={{ padding: 16, fontSize: 12, color: "var(--muted)", textAlign: "center", lineHeight: 2 }}>
              {availableMenu.map(i => `${i.name} ₹${i.price}`).join(" · ")}
            </div>
          </>
        )}

        {/* MENU STEP */}
        {cStep === "menu" && (
          <>
            <div className="tabs">
              {[{ id: "menu", label: "🍔 MENU" }, { id: "dashboard", label: "🏆 PROFILE" }, { id: "referral", label: "🤝 REFERRAL" }].map(t => (
                <div key={t.id} className={`tab ${custTab === t.id ? "active" : ""}`} onClick={() => setCustTab(t.id)}>{t.label}</div>
              ))}
            </div>

            {custTab === "menu" && (
              <>
                <div className="scroll-area" style={{ paddingTop: 12, paddingBottom: 140 }}>
                  <div style={{ padding: "0 12px 12px" }}>
                    {freeAvailable > 0 ? (
                      <div className="free-banner">
                        <div style={{ fontSize: 28 }}>🎁</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--grn)" }}>YOU HAVE {freeAvailable} FREE BURGER{freeAvailable > 1 ? "S" : ""}!</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>Use it when you order below</div>
                        </div>
                      </div>
                    ) : (
                      <div className="card2" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ fontSize: 24 }}>🏅</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--amb)", letterSpacing: 1, marginBottom: 4 }}>BURGER STAMPS</div>
                          <div className="dots">
                            {Array.from({ length: settings.freeAt }).map((_, i) => (
                              <div key={i} className={`dot ${i < progressInCycle ? "done" : "empty"}`}>{i < progressInCycle ? "✓" : ""}</div>
                            ))}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{progressInCycle}/{settings.freeAt} to next free burger</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "0 12px 12px" }}>
                    <div className="card2" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ fontSize: 22 }}>{rank.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: rank.color }}>{rank.name} {rank.rank}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{xp} XP</div>
                        </div>
                        <div className="progress-track"><div className="xp-bar-fill" style={{ width: `${xpPct}%`, background: `linear-gradient(90deg,${rank.color},var(--amb))` }} /></div>
                        {nextRank && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>{xpNeededForTier - xpInCurrentTier} XP to {nextRank.name} {nextRank.rank}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="section-title">MENU</div>
                  <div className="card" style={{ margin: "0 12px", padding: 0, overflow: "hidden" }}>
                    {availableMenu.map(item => (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--border)", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          {item.tag && <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: "var(--amb)", marginBottom: 3 }}>{item.tag}</div>}
                          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{item.desc}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: "var(--org)" }}>₹{item.price}</div>
                          <div className="qty-ctrl">
                            {cartQty(item.id) > 0 ? (
                              <>
                                <button className="qty-btn minus" onClick={() => removeItem(item.id)}>−</button>
                                <span className="qty-num">{cartQty(item.id)}</span>
                                <button className="qty-btn plus" onClick={() => addItem(item)}>+</button>
                              </>
                            ) : <button className="qty-btn plus" onClick={() => addItem(item)}>+</button>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {cartCount > 0 && (
                    <>
                      <div className="section-title">ADD EXTRAS</div>
                      <div style={{ padding: "0 12px" }}>
                        <div className="extras-grid">
                          {EXTRAS.map(e => (
                            <div key={e.id} className={`extra-chip ${selectedExtras.includes(e.id) ? "selected" : ""}`} onClick={() => toggleExtra(e.id)}>
                              <div style={{ fontSize: 20, marginBottom: 4 }}>{e.icon}</div>
                              <div style={{ fontSize: 11, fontWeight: 700 }}>{e.name}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>+₹{e.price}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="section-title">SAUCES</div>
                      <div style={{ padding: "0 12px 12px" }}>
                        <div className="extras-grid">
                          {SAUCES.map(s => (
                            <div key={s.id} className={`extra-chip ${selectedSauces.includes(s.id) ? "selected" : ""}`} onClick={() => toggleSauce(s.id)}>
                              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                              <div style={{ fontSize: 11, fontWeight: 700 }}>{s.name}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>+₹{s.price}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {cartCount > 0 && (
                  <div className="cart-bar">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{cartCount} item{cartCount > 1 ? "s" : ""}{selectedExtras.length > 0 ? ` + ${selectedExtras.length} extra` : ""}{selectedSauces.length > 0 ? ` + ${selectedSauces.length} sauce` : ""}</div>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: "var(--amb)" }}>₹{cartTotal}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {freeAvailable > 0 && <button className="btn btn-amb" onClick={() => placeOrder(true)}>🎁 Free</button>}
                        <button className="btn btn-org" onClick={() => placeOrder(false)}>ORDER →</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {custTab === "dashboard" && liveCustomer && (
              <div className="scroll-area">
                <div style={{ margin: 12, background: rank.bg, border: `1px solid ${rank.color}40`, borderRadius: 16, padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 52, marginBottom: 8 }} className="pop-anim">{rank.icon}</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, letterSpacing: 3, color: rank.color }}>{rank.name}</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: rank.color, opacity: .7, letterSpacing: 2 }}>{rank.rank}</div>
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
                      <span>{xp} XP</span>{nextRank && <span>{nextRank.minXP} XP</span>}
                    </div>
                    <div className="progress-track"><div className="xp-bar-fill" style={{ width: `${xpPct}%`, background: `linear-gradient(90deg,${rank.color},var(--amb))` }} /></div>
                    {nextRank && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{xpNeededForTier - xpInCurrentTier} XP to {nextRank.name} {nextRank.rank}</div>}
                  </div>
                </div>
                <div style={{ padding: "0 12px 12px" }}>
                  <div className="stat-grid">
                    {[
                      { label: "Burgers Bought", val: ordersDone, color: "var(--org)" },
                      { label: "Free Earned", val: liveCustomer.freeEarned || 0, color: "var(--grn)" },
                      { label: "Referral Points", val: referralPoints, color: "var(--pur)" },
                      { label: "Lifetime XP", val: xp, color: "var(--amb)" },
                    ].map(s => (
                      <div className="stat-cell" key={s.label}>
                        <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
                        <div className="stat-lbl">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "0 12px 12px" }}>
                  <div className="card">
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1, marginBottom: 10 }}>BURGER STAMPS</div>
                    <div className="dots">
                      {Array.from({ length: settings.freeAt }).map((_, i) => (
                        <div key={i} className={`dot ${i < progressInCycle ? "done" : "empty"}`}>{i < progressInCycle ? "✓" : i + 1}</div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
                      {freeAvailable > 0 ? <span style={{ color: "var(--grn)" }}>🎁 {freeAvailable} free burger{freeAvailable > 1 ? "s" : ""} ready!</span> : `${progressInCycle}/${settings.freeAt} — ${settings.freeAt - progressInCycle} more to unlock`}
                    </div>
                  </div>
                </div>
                <div className="section-title">ACHIEVEMENTS</div>
                <div style={{ padding: "0 12px 12px" }}>
                  {ACHIEVEMENTS.map(a => {
                    const earned = (liveCustomer.achievements || []).includes(a.id);
                    return (
                      <div key={a.id} className={`achievement-card ${earned ? "earned" : "locked"}`}>
                        <div style={{ fontSize: 28 }}>{a.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{a.desc}</div>
                        </div>
                        {earned && <div style={{ fontSize: 10, color: "var(--amb)", fontWeight: 800 }}>EARNED ✓</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="section-title">ORDER HISTORY</div>
                <div style={{ padding: "0 12px 12px" }}>
                  <div className="card">
                    {(liveCustomer.orderHistory || []).length === 0 ? (
                      <div style={{ textAlign: "center", padding: 20, color: "var(--muted)", fontSize: 13 }}>No orders yet</div>
                    ) : (liveCustomer.orderHistory || []).slice(0, 10).map(h => (
                      <div className="hist-item" key={h.id}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{h.items}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)" }}>{timeAgo(h.ts)}</div>
                        </div>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: h.isFree ? "var(--grn)" : "var(--amb)" }}>
                          {h.isFree ? "FREE" : `₹${h.total}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {custTab === "referral" && liveCustomer && (
              <div className="scroll-area">
                <div style={{ padding: "12px 12px 0" }}>
                  <div className="card" style={{ background: "linear-gradient(135deg,#160a24,#1f0a35)", borderColor: "rgba(168,85,247,.3)", marginBottom: 12 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "var(--pur)", marginBottom: 6 }}>REFERRAL POINTS</div>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 56, color: "var(--pur)", lineHeight: 1 }}>{referralPoints}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0" }}>{settings.redeemAt - referralPoints} more to unlock FREE burger</div>
                      <div className="progress-track" style={{ margin: "0 8px" }}>
                        <div className="xp-bar-fill" style={{ width: `${Math.min(100, (referralPoints / settings.redeemAt) * 100)}%`, background: "linear-gradient(90deg,var(--pur),var(--blue))" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{referralPoints}/{settings.redeemAt} points</div>
                    </div>
                  </div>
                  <div className="ref-code-box" style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1, marginBottom: 8 }}>YOUR REFERRAL CODE</div>
                    <div className="ref-code">{liveCustomer.refCode || genRefCode(liveCustomer.phone)}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>Share with friends · earn {settings.referralPointsPer} points after they buy {settings.referralThreshold} burgers</div>
                    <button className="btn btn-amb" style={{ marginTop: 12, width: "100%" }} onClick={() => { navigator.clipboard?.writeText(liveCustomer.refCode || genRefCode(liveCustomer.phone)); showToast("📋 Code copied!"); }}>COPY CODE</button>
                  </div>
                  <div className="card">
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1, marginBottom: 10 }}>REFERRAL STATS</div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      {[
                        { val: liveCustomer.successfulReferrals || 0, label: "REFERRALS", color: "var(--pur)" },
                        { val: referralPoints, label: "POINTS", color: "var(--amb)" },
                        { val: liveCustomer.hasFreeReferralBurger || 0, label: "FREE BURGERS", color: "var(--grn)" },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: s.color }}>{s.val}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* SUCCESS */}
        {cStep === "success" && (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <div className="pop-anim" style={{ fontSize: 72, marginBottom: 12 }}>{lastOrder?.isFree ? "🎁" : "🍔"}</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, letterSpacing: 2, lineHeight: 1, marginBottom: 8 }}>
              {lastOrder?.isFree ? "FREE ORDER PLACED!" : "ORDER PLACED!"}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20, lineHeight: 1.6 }}>
              {lastOrder?.isFree ? "Your free burger is coming right up! 🙏" : "Your order is being prepared!"}
            </div>
            {modifyTimer !== null && (
              <div className="card2" style={{ marginBottom: 16, textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--org)" }}>⏱ MODIFICATION WINDOW</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: "var(--org)" }}>{modifyTimer}s</div>
                </div>
                <div className="progress-track">
                  <div style={{ height: "100%", borderRadius: 3, transition: "width 1s linear", width: `${(modifyTimer / 60) * 100}%`, background: modifyTimer > 20 ? "var(--grn)" : modifyTimer > 10 ? "var(--amb)" : "var(--org)" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>Modify or cancel within 60 seconds</div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn btn-red" style={{ flex: 1 }} onClick={cancelOrder}>❌ Cancel</button>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { clearInterval(modifyIntervalRef.current); setModifyTimer(null); setCStep("menu"); }}>✏️ Modify</button>
                </div>
              </div>
            )}
            <div className="card2" style={{ textAlign: "left", marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--muted)", marginBottom: 8 }}>ORDER SUMMARY</div>
              {lastOrder?.items?.map(i => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                  <span>{i.qty}× {i.name}</span><span style={{ color: "var(--muted)" }}>₹{i.price * i.qty}</span>
                </div>
              ))}
              {lastOrder?.extras?.map(e => <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", color: "var(--muted)" }}><span>+ {e.name}</span><span>₹{e.price}</span></div>)}
              {lastOrder?.sauces?.map(s => <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", color: "var(--muted)" }}><span>+ {s.name}</span><span>₹{s.price}</span></div>)}
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: lastOrder?.isFree ? "var(--grn)" : "var(--amb)" }}>{lastOrder?.isFree ? "FREE 🎁" : `₹${lastOrder?.total}`}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowReviewModal(true)}>⭐ Rate Order</button>
              <button className="btn btn-org" style={{ flex: 1 }} onClick={() => { setCStep("menu"); setCart([]); setCustTab("menu"); }}>ORDER MORE</button>
            </div>
          </div>
        )}

        {/* REVIEW MODAL */}
        {showReviewModal && (
          <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: 2, marginBottom: 4 }}>RATE YOUR EXPERIENCE</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>+5 XP for submitting a review</div>
              {[{ key: "food", label: "🍔 Food Quality" }, { key: "service", label: "👋 Service" }, { key: "taste", label: "😋 Taste" }].map(({ key, label }) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{label}</div>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} className={`star ${reviewData[key] >= n ? "active" : ""}`} onClick={() => setReviewData(r => ({ ...r, [key]: n }))}>⭐</div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>💬 Comment (optional)</div>
                <textarea className="input-field" style={{ height: 80, resize: "none" }} placeholder="Tell us what you loved..."
                  value={reviewData.comment} onChange={e => setReviewData(r => ({ ...r, comment: e.target.value }))} />
              </div>
              <button className="btn btn-org btn-full" onClick={submitReview}>SUBMIT REVIEW +5 XP</button>
            </div>
          </div>
        )}

        {/* POPUP */}
        {showPopup && (
          <div className="modal-overlay" onClick={() => setShowPopup(null)}>
            <div className="modal-sheet" style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
              {showPopup.type === "freeBurger" && (
                <>
                  <div style={{ fontSize: 72, marginBottom: 12 }} className="pop-anim">🎁</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, letterSpacing: 2, marginBottom: 8 }}>FREE BURGER UNLOCKED!</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>You've bought {settings.freeAt} burgers and earned a FREE one!</div>
                  <button className="btn btn-org btn-full" onClick={() => setShowPopup(null)}>CLAIM REWARD 🔥</button>
                </>
              )}
              {showPopup.type === "rankUp" && (
                <>
                  <div style={{ fontSize: 72, marginBottom: 12 }} className="pop-anim">{showPopup.rank?.icon}</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, letterSpacing: 2, color: showPopup.rank?.color, marginBottom: 8 }}>RANK UP!</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, marginBottom: 8 }}>{showPopup.rank?.name} {showPopup.rank?.rank}</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>Keep ordering to reach the next tier!</div>
                  <button className="btn btn-org btn-full" onClick={() => setShowPopup(null)}>LET'S GO 💪</button>
                </>
              )}
              {showPopup.type === "referralReward" && (
                <>
                  <div style={{ fontSize: 72, marginBottom: 12 }} className="pop-anim">🏆</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, letterSpacing: 2, marginBottom: 8 }}>FREE BURGER EARNED!</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>Your referrals paid off! Redeem your reward.</div>
                  <button className="btn btn-grn btn-full" style={{ marginBottom: 8 }} onClick={redeemReferralBurger}>REDEEM FREE BURGER</button>
                  <button className="btn btn-ghost btn-full" onClick={() => setShowPopup(null)}>Later</button>
                </>
              )}
            </div>
          </div>
        )}

        <Toast msg={toast} />
      </div>
    </>
  );
}
