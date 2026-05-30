import { useState, useEffect, useRef, useCallback } from "react";
import {
  css, EXTRAS, SAUCES, ACHIEVEMENTS,
  getRank, getNextRank, genRefCode, timeAgo, initials,
  EmptyState, Toast,
} from "./theme";
import {
  watchMenu, watchCustomers, watchSettings,
  addOrder, updateOrder, deleteOrder,
  saveCustomer,
} from "./store";

// ─── ANIMATION CSS ────────────────────────────────────────────────────────────
const animCss = `
@keyframes floatUp{0%{transform:translateY(0) rotate(0deg) scale(1);opacity:.7}100%{transform:translateY(-120vh) rotate(360deg) scale(.5);opacity:0}}
@keyframes fadeInUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes stampPop{0%{transform:scale(0) rotate(-20deg)}60%{transform:scale(1.3) rotate(5deg)}80%{transform:scale(.9)}100%{transform:scale(1) rotate(0)}}
@keyframes cartBounce{0%,100%{transform:scale(1)}30%{transform:scale(1.25)}60%{transform:scale(.9)}80%{transform:scale(1.1)}}
@keyframes plusFloat{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-60px);opacity:0}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 12px rgba(255,69,0,.3),0 0 30px rgba(255,69,0,.1)}50%{box-shadow:0 0 25px rgba(255,69,0,.7),0 0 60px rgba(255,69,0,.3)}}
@keyframes shimmerSlide{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
@keyframes rankGlow{0%,100%{text-shadow:0 0 10px currentColor}50%{text-shadow:0 0 30px currentColor,0 0 60px currentColor}}
@keyframes heroTitle{0%{transform:translateY(-40px) skewY(-3deg);opacity:0}100%{transform:translateY(0) skewY(0);opacity:1}}
@keyframes heroPulse{0%,100%{opacity:.06}50%{opacity:.14}}
@keyframes menuSlide{from{transform:translateX(-20px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes cartGlow{0%,100%{box-shadow:0 -4px 20px rgba(255,69,0,.2)}50%{box-shadow:0 -4px 40px rgba(255,69,0,.5)}}
@keyframes readyPop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes badgePop{0%{transform:scale(0) translateY(20px);opacity:0}60%{transform:scale(1.15) translateY(-4px)}100%{transform:scale(1) translateY(0);opacity:1}}

.anim-fade-up{animation:fadeInUp .5s ease forwards}
.anim-hero-title{animation:heroTitle .7s cubic-bezier(.34,1.2,.64,1) forwards}
.anim-rank-glow{animation:rankGlow 2s ease-in-out infinite}
.cart-bar-active{animation:cartGlow 2s ease-in-out infinite}
.btn-pulse{animation:glowPulse 2s ease-in-out infinite}
.shimmer-bar{background:linear-gradient(90deg,var(--org) 0%,var(--amb) 40%,#fff 50%,var(--amb) 60%,var(--org) 100%);background-size:200% 100%;animation:shimmerSlide 2s linear infinite}
`;

// ─── CONFETTI COMPONENT ───────────────────────────────────────────────────────
function Confetti({ active }) {
  const pieces = useRef([]);
  if (pieces.current.length === 0 && active) {
    pieces.current = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.5}s`,
      dur: `${1.5 + Math.random() * 2}s`,
      color: ["var(--org)", "var(--amb)", "var(--grn)", "var(--pur)", "var(--blue)", "#fff"][Math.floor(Math.random() * 6)],
      size: `${6 + Math.random() * 10}px`,
      shape: Math.random() > .5 ? "50%" : "2px",
    }));
  }
  if (!active) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 400, overflow: "hidden" }}>
      {pieces.current.map(p => (
        <div key={p.id} style={{
          position: "absolute", top: -20, left: p.left,
          width: p.size, height: p.size,
          background: p.color, borderRadius: p.shape,
          animation: `confettiFall ${p.dur} ${p.delay} ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

// ─── FLOATING EMOJIS BACKGROUND ──────────────────────────────────────────────
function FloatingEmojis() {
  const emojis = ["🍔", "🔥", "🧀", "⭐", "🍟", "💥", "🌶️", "✨"];
  const items = useRef(Array.from({ length: 12 }, (_, i) => ({
    id: i,
    emoji: emojis[i % emojis.length],
    left: `${5 + (i * 8) % 90}%`,
    delay: `${(i * 1.3) % 8}s`,
    dur: `${8 + (i * 1.7) % 8}s`,
    size: `${16 + (i * 4) % 20}px`,
  }))).current;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {items.map(f => (
        <div key={f.id} style={{
          position: "absolute", bottom: -40, left: f.left,
          fontSize: f.size, opacity: .12,
          animation: `floatUp ${f.dur} ${f.delay} ease-in infinite`,
        }}>{f.emoji}</div>
      ))}
    </div>
  );
}

// ─── FLOATING +1 INDICATOR ───────────────────────────────────────────────────
function PlusOne({ show, x, y }) {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed", left: x, top: y, zIndex: 500,
      fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: "var(--org)",
      pointerEvents: "none", animation: "plusFloat .8s ease forwards",
      textShadow: "0 0 10px rgba(255,69,0,.5)",
    }}>+1</div>
  );
}

// ─── ANIMATED STAMP ──────────────────────────────────────────────────────────
function AnimatedDot({ filled, index, newlyFilled }) {
  return (
    <div className={`dot ${filled ? "done" : "empty"}`}
      style={{ animation: newlyFilled ? `stampPop .5s ${index * 0.05}s cubic-bezier(.34,1.56,.64,1) both` : "none" }}>
      {filled ? "✓" : ""}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
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
  const [orderStatus, setOrderStatus] = useState("pending");
  const [orderReadyPopup, setOrderReadyPopup] = useState(false);
  const orderWatcherRef = useRef(null);

  // Animation states
  const [confetti, setConfetti] = useState(false);
  const [plusOne, setPlusOne] = useState({ show: false, x: 0, y: 0 });
  const [prevStamps, setPrevStamps] = useState(0);
  const [newStamps, setNewStamps] = useState([]);
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [addedItems, setAddedItems] = useState({});

  const showToast = (msg, dur = 2500) => { setToast(msg); setTimeout(() => setToast(""), dur); };

  useEffect(() => {
    const u1 = watchMenu((m) => { setMenu(m); setTimeout(() => setMenuLoaded(true), 100); });
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

  const addItem = (item, e) => {
    // Animate +1
    if (e) {
      const rect = e.target.getBoundingClientRect();
      setPlusOne({ show: true, x: rect.left, y: rect.top });
      setTimeout(() => setPlusOne({ show: false, x: 0, y: 0 }), 800);
    }
    // Bounce item
    setAddedItems(prev => ({ ...prev, [item.id]: Date.now() }));
    setTimeout(() => setAddedItems(prev => { const n = { ...prev }; delete n[item.id]; return n; }), 400);

    setCart(prev => {
      const ex = prev.find(c => c.id === item.id);
      return ex ? prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c) : [...prev, { ...item, qty: 1 }];
    });
  };

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
      setTimeout(() => setShowPopup({ type: "rankUp", rank: newRankData }), 800);
    }
    return newXP;
  };

  const handleEnroll = async () => {
    if (phone.length < 10) return;
    const p = phone.trim().replace(/\D/g, '');
    const existing = customers[p];
    if (existing) {
      setCurrentCust(existing);
      if (existing.hasFreeReferralBurger > 0) setTimeout(() => setShowPopup({ type: "referralReward" }), 500);
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
    setPrevStamps(0);
    setCStep("menu");
    setCustTab("menu");
  };

  const placeOrder = async (isFree = false) => {
    if (cart.length === 0) return;
    const p = currentCust?.phone?.replace(/\D/g, '');
    const extraItems = selectedExtras.map(id => EXTRAS.find(e => e.id === id)).filter(Boolean);
    const sauceItems = selectedSauces.map(id => SAUCES.find(e => e.id === id)).filter(Boolean);

    const order = {
      items: cart, extras: extraItems, sauces: sauceItems,
      total: isFree ? 0 : cartTotal, isFree,
      customerPhone: p, customerName: liveCustomer?.name || "Guest",
      status: "pending", locked: false,
      timestamp: Date.now(), placedBy: "customer",
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
      const oldStamps = (c.orderCount || 0) % settings.freeAt;
      if (isFree) {
        c.freeUsed = (c.freeUsed || 0) + 1;
        xpEarned += 5;
      } else {
        c.orderCount = (c.orderCount || 0) + 1;
        xpEarned += 20;
        const newFreeEarned = Math.floor(c.orderCount / settings.freeAt);
        if (newFreeEarned > (c.freeEarned || 0)) {
          c.freeEarned = newFreeEarned;
          setTimeout(() => setShowPopup({ type: "freeBurger" }), 1200);
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

      setPrevStamps(oldStamps);
      const newStampCount = isFree ? oldStamps : (c.orderCount % settings.freeAt);
      const filled = [];
      for (let i = oldStamps; i < newStampCount; i++) filled.push(i);
      setNewStamps(filled);

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
    setOrderStatus("pending"); setOrderReadyPopup(false);
    setCStep("success");

    // Confetti!
    setTimeout(() => { setConfetti(true); setTimeout(() => setConfetti(false), 4000); }, 300);

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

    // Watch order status
    const { ref, onValue } = await import('firebase/database');
    const { db } = await import('./firebase');
    if (orderWatcherRef.current) orderWatcherRef.current();
    orderWatcherRef.current = onValue(ref(db, `orders/${fbId}`), (snap) => {
      const val = snap.val();
      if (val) {
        setOrderStatus(val.status === "ready" ? "ready" : val.locked ? "locked" : "pending");
        if (val.status === "ready") {
          setOrderReadyPopup(true);
          setConfetti(true);
          setTimeout(() => setConfetti(false), 5000);
          if (orderWatcherRef.current) { orderWatcherRef.current(); orderWatcherRef.current = null; }
        }
      }
    });
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
      <style>{css + animCss}</style>
      <PlusOne show={plusOne.show} x={plusOne.x} y={plusOne.y} />
      <Confetti active={confetti} />

      <div className="wrap">
        <div className="hdr" style={{ background: "rgba(8,8,8,.98)" }}>
          <div className="logo" style={{ textShadow: "0 0 20px rgba(255,69,0,.4)" }}>HRX<span>.</span>BURGER</div>
          {liveCustomer && cStep === "menu" && (
            <div className={`rank-badge anim-rank-glow`}
              style={{ background: rank.bg, color: rank.color, border: `1px solid ${rank.color}60`, cursor: "pointer", transition: "all .3s" }}
              onClick={() => setCustTab("dashboard")}>
              {rank.icon} {rank.rank}
            </div>
          )}
        </div>

        {/* ── ENROLL ── */}
        {cStep === "enroll" && (
          <>
            <div style={{ background: "linear-gradient(160deg,#200a00,#0d0500)", borderBottom: "1px solid var(--border)", padding: "28px 20px 28px", position: "relative", overflow: "hidden" }}>
              <FloatingEmojis />
              {/* Glow orb */}
              <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle,rgba(255,69,0,.25) 0%,transparent 70%)", borderRadius: "50%", animation: "heroPulse 3s ease-in-out infinite" }} />
              <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, background: "radial-gradient(circle,rgba(255,184,0,.15) 0%,transparent 70%)", borderRadius: "50%", animation: "heroPulse 3s ease-in-out infinite reverse" }} />

              <div className="anim-hero-title" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 52, letterSpacing: 3, lineHeight: .9, marginBottom: 12, position: "relative" }}>
                ORDER YOUR<br />
                <span style={{ color: "var(--org)", textShadow: "0 0 30px rgba(255,69,0,.5)", fontSize: 64 }}>SMASH</span><br />
                BURGER
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 24, position: "relative" }}>
                Scan · Order · Earn Stamps · Level Up · Get Free Burgers 🔥
              </div>
              <div style={{ marginBottom: 12, position: "relative" }}>
                <div className="input-label">PHONE NUMBER</div>
                <input className="input-field" type="tel" maxLength={10} placeholder="10-digit number"
                  value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                  style={{ fontSize: 18, letterSpacing: 2 }} />
              </div>
              {phone.length >= 10 && !customers[phone.replace(/\D/g, '')] && (
                <div className="anim-fade-up">
                  <div style={{ marginBottom: 12 }}>
                    <div className="input-label">YOUR NAME (OPTIONAL)</div>
                    <input className="input-field" type="text" placeholder="What should we call you?" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div className="input-label">REFERRAL CODE (OPTIONAL)</div>
                    <input className="input-field" type="text" placeholder="e.g. HRX1234" value={refCodeInput} onChange={e => setRefCodeInput(e.target.value)} />
                  </div>
                </div>
              )}
              {phone.length >= 10 && customers[phone.replace(/\D/g, '')] && (
                <div className="anim-fade-up" style={{ background: "rgba(255,184,0,.08)", border: "1px solid rgba(255,184,0,.3)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, boxShadow: "0 0 20px rgba(255,184,0,.1)" }}>
                  <div style={{ fontSize: 10, color: "var(--amb)", fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>👋 WELCOME BACK!</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{customers[phone.replace(/\D/g, '')].name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{customers[phone.replace(/\D/g, '')].orderCount || 0} orders · {getRank(customers[phone.replace(/\D/g, '')].xp || 0).icon} {getRank(customers[phone.replace(/\D/g, '')].xp || 0).rank}</div>
                </div>
              )}
              <button
                className={`btn btn-org btn-full ${phone.length >= 10 ? "btn-pulse" : ""}`}
                onClick={handleEnroll} disabled={phone.length < 10}
                style={{ fontSize: 17, borderRadius: 14, letterSpacing: 2, position: "relative" }}>
                LET'S ORDER 🍔
              </button>
            </div>

            {/* Menu preview pills */}
            <div style={{ padding: "16px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {availableMenu.map((item, i) => (
                <div key={item.id} className="anim-fade-up" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 700, animationDelay: `${i * 0.1}s` }}>
                  {item.name} <span style={{ color: "var(--org)" }}>₹{item.price}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── MENU STEP ── */}
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
                      <div className="free-banner" style={{ animation: "glowPulse 2s ease-in-out infinite", boxShadow: "0 0 20px rgba(34,197,94,.2)" }}>
                        <div style={{ fontSize: 32, animation: "cartBounce 1.5s ease-in-out infinite" }}>🎁</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--grn)" }}>YOU HAVE {freeAvailable} FREE BURGER{freeAvailable > 1 ? "S" : ""}!</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>Use it on your next order 👇</div>
                        </div>
                      </div>
                    ) : (
                      <div className="card2" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ fontSize: 24 }}>🏅</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--amb)", letterSpacing: 1, marginBottom: 6 }}>BURGER STAMPS</div>
                          <div className="dots">
                            {Array.from({ length: settings.freeAt }).map((_, i) => (
                              <AnimatedDot key={i} filled={i < progressInCycle} index={i} newlyFilled={newStamps.includes(i)} />
                            ))}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{progressInCycle}/{settings.freeAt} to next free burger</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* XP Bar */}
                  <div style={{ padding: "0 12px 12px" }}>
                    <div className="card2" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ fontSize: 24, animation: "cartBounce 3s ease-in-out infinite" }}>{rank.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: rank.color }}>{rank.name} {rank.rank}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{xp} XP</div>
                        </div>
                        <div className="progress-track">
                          <div className="shimmer-bar" style={{ width: `${xpPct}%`, height: "100%", borderRadius: 3 }} />
                        </div>
                        {nextRank && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>{xpNeededForTier - xpInCurrentTier} XP to {nextRank.name} {nextRank.rank}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="section-title">MENU</div>
                  <div className="card" style={{ margin: "0 12px", padding: 0, overflow: "hidden" }}>
                    {availableMenu.map((item, idx) => (
                      <div key={item.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "14px 16px", borderBottom: "1px solid var(--border)", gap: 10,
                        animation: menuLoaded ? `menuSlide .4s ${idx * 0.07}s ease both` : "none",
                        transition: "background .2s",
                        background: addedItems[item.id] ? "rgba(255,69,0,.06)" : "transparent",
                      }}>
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
                                <span className="qty-num" style={{ animation: addedItems[item.id] ? "cartBounce .4s ease" : "none" }}>{cartQty(item.id)}</span>
                                <button className="qty-btn plus" onClick={(e) => addItem(item, e)}>+</button>
                              </>
                            ) : (
                              <button className="qty-btn plus" onClick={(e) => addItem(item, e)}>+</button>
                            )}
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
                          {EXTRAS.map((e, i) => (
                            <div key={e.id}
                              className={`extra-chip ${selectedExtras.includes(e.id) ? "selected" : ""}`}
                              style={{ animation: `menuSlide .3s ${i * 0.08}s ease both`, transition: "all .2s" }}
                              onClick={() => toggleExtra(e.id)}>
                              <div style={{ fontSize: 24, marginBottom: 4, transition: "transform .2s", transform: selectedExtras.includes(e.id) ? "scale(1.2)" : "scale(1)" }}>{e.icon}</div>
                              <div style={{ fontSize: 11, fontWeight: 700 }}>{e.name}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>+₹{e.price}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="section-title">SAUCES</div>
                      <div style={{ padding: "0 12px 12px" }}>
                        <div className="extras-grid">
                          {SAUCES.map((s, i) => (
                            <div key={s.id}
                              className={`extra-chip ${selectedSauces.includes(s.id) ? "selected" : ""}`}
                              style={{ animation: `menuSlide .3s ${i * 0.08}s ease both`, transition: "all .2s" }}
                              onClick={() => toggleSauce(s.id)}>
                              <div style={{ fontSize: 24, marginBottom: 4, transition: "transform .2s", transform: selectedSauces.includes(s.id) ? "scale(1.2)" : "scale(1)" }}>{s.icon}</div>
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
                  <div className="cart-bar cart-bar-active">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          {cartCount} item{cartCount > 1 ? "s" : ""}
                          {selectedExtras.length > 0 ? ` + ${selectedExtras.length} extra` : ""}
                          {selectedSauces.length > 0 ? ` + ${selectedSauces.length} sauce` : ""}
                        </div>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: "var(--amb)", textShadow: "0 0 15px rgba(255,184,0,.4)" }}>₹{cartTotal}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {freeAvailable > 0 && <button className="btn btn-amb" onClick={() => placeOrder(true)}>🎁 Free</button>}
                        <button className="btn btn-org btn-pulse" style={{ fontSize: 15, padding: "12px 22px", letterSpacing: 1 }} onClick={() => placeOrder(false)}>
                          ORDER 🔥
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {custTab === "dashboard" && liveCustomer && (
              <div className="scroll-area">
                {/* Rank card */}
                <div className="anim-fade-up" style={{ margin: 12, background: rank.bg, border: `2px solid ${rank.color}60`, borderRadius: 20, padding: 24, textAlign: "center", boxShadow: `0 0 40px ${rank.color}20` }}>
                  <div style={{ fontSize: 60, marginBottom: 8, animation: "cartBounce 3s ease-in-out infinite" }}>{rank.icon}</div>
                  <div className="anim-rank-glow" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, letterSpacing: 3, color: rank.color }}>{rank.name}</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: rank.color, opacity: .6, letterSpacing: 2 }}>{rank.rank}</div>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
                      <span>{xp} XP</span>{nextRank && <span>{nextRank.minXP} XP</span>}
                    </div>
                    <div className="progress-track">
                      <div className="shimmer-bar" style={{ width: `${xpPct}%`, height: "100%", borderRadius: 3 }} />
                    </div>
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
                    ].map((s, i) => (
                      <div className="stat-cell anim-fade-up" key={s.label} style={{ animationDelay: `${i * 0.1}s`, border: "1px solid var(--border)" }}>
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
                        <AnimatedDot key={i} filled={i < progressInCycle} index={i} newlyFilled={newStamps.includes(i)} />
                      ))}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
                      {freeAvailable > 0
                        ? <span style={{ color: "var(--grn)", fontWeight: 700 }}>🎁 {freeAvailable} free burger{freeAvailable > 1 ? "s" : ""} ready!</span>
                        : `${progressInCycle}/${settings.freeAt} — ${settings.freeAt - progressInCycle} more to unlock`}
                    </div>
                  </div>
                </div>

                <div className="section-title">ACHIEVEMENTS</div>
                <div style={{ padding: "0 12px 12px" }}>
                  {ACHIEVEMENTS.map((a, i) => {
                    const earned = (liveCustomer.achievements || []).includes(a.id);
                    return (
                      <div key={a.id} className={`achievement-card ${earned ? "earned" : "locked"} anim-fade-up`}
                        style={{ animationDelay: `${i * 0.07}s`, transition: "all .3s" }}>
                        <div style={{ fontSize: 30, filter: earned ? "none" : "grayscale(1)" }}>{a.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{a.desc}</div>
                        </div>
                        {earned && <div style={{ fontSize: 10, color: "var(--amb)", fontWeight: 800, animation: "badgePop .5s ease" }}>✓ EARNED</div>}
                      </div>
                    );
                  })}
                </div>

                <div className="section-title">ORDER HISTORY</div>
                <div style={{ padding: "0 12px 12px" }}>
                  <div className="card">
                    {(liveCustomer.orderHistory || []).length === 0
                      ? <div style={{ textAlign: "center", padding: 20, color: "var(--muted)", fontSize: 13 }}>No orders yet</div>
                      : (liveCustomer.orderHistory || []).slice(0, 10).map(h => (
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
                  <div className="card anim-fade-up" style={{ background: "linear-gradient(135deg,#160a24,#1f0a35)", borderColor: "rgba(168,85,247,.4)", marginBottom: 12, boxShadow: "0 0 30px rgba(168,85,247,.1)" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "var(--pur)", marginBottom: 6 }}>REFERRAL POINTS</div>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 60, color: "var(--pur)", lineHeight: 1, textShadow: "0 0 30px rgba(168,85,247,.5)" }}>{referralPoints}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0" }}>{settings.redeemAt - referralPoints} more to unlock FREE burger</div>
                      <div className="progress-track" style={{ margin: "0 8px" }}>
                        <div className="shimmer-bar" style={{ width: `${Math.min(100, (referralPoints / settings.redeemAt) * 100)}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg,var(--pur),var(--blue),var(--pur))", backgroundSize: "200% 100%" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{referralPoints}/{settings.redeemAt} points</div>
                    </div>
                  </div>
                  <div className="ref-code-box anim-fade-up" style={{ marginBottom: 12, boxShadow: "0 0 20px rgba(255,184,0,.1)", animationDelay: ".1s" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1, marginBottom: 8 }}>YOUR REFERRAL CODE</div>
                    <div className="ref-code" style={{ textShadow: "0 0 20px rgba(255,184,0,.4)" }}>{liveCustomer.refCode || genRefCode(liveCustomer.phone)}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>Share with friends · earn {settings.referralPointsPer} points after {settings.referralThreshold} burgers</div>
                    <button className="btn btn-amb" style={{ marginTop: 12, width: "100%" }}
                      onClick={() => { navigator.clipboard?.writeText(liveCustomer.refCode || genRefCode(liveCustomer.phone)); showToast("📋 Code copied!"); }}>
                      COPY CODE 📋
                    </button>
                  </div>
                  <div className="card anim-fade-up" style={{ animationDelay: ".2s" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1, marginBottom: 10 }}>REFERRAL STATS</div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      {[
                        { val: liveCustomer.successfulReferrals || 0, label: "REFERRALS", color: "var(--pur)" },
                        { val: referralPoints, label: "POINTS", color: "var(--amb)" },
                        { val: liveCustomer.hasFreeReferralBurger || 0, label: "FREE BURGERS", color: "var(--grn)" },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, color: s.color, textShadow: `0 0 20px ${s.color}40` }}>{s.val}</div>
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

        {/* ── SUCCESS ── */}
        {cStep === "success" && (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            {/* Live order status */}
            <div style={{
              background: orderStatus === "ready" ? "linear-gradient(135deg,#0a2015,#0f3020)" : orderStatus === "locked" ? "linear-gradient(135deg,#0a0f1f,#0f1530)" : "linear-gradient(135deg,#1a0800,#2a1000)",
              border: `2px solid ${orderStatus === "ready" ? "var(--grn)" : orderStatus === "locked" ? "var(--blue)" : "var(--org)"}`,
              borderRadius: 18, padding: "20px 16px", marginBottom: 20,
              transition: "all .6s ease",
              boxShadow: `0 0 30px ${orderStatus === "ready" ? "rgba(34,197,94,.3)" : orderStatus === "locked" ? "rgba(59,130,246,.2)" : "rgba(255,69,0,.2)"}`,
              animation: orderStatus === "ready" ? "readyPop .6s ease" : "none",
            }}>
              <div style={{ fontSize: 52, marginBottom: 8, animation: orderStatus === "locked" ? "spin 3s linear infinite" : orderStatus === "ready" ? "cartBounce .5s ease" : "cartBounce 2s ease-in-out infinite" }}>
                {orderStatus === "ready" ? "✅" : orderStatus === "locked" ? "👨‍🍳" : "⏳"}
              </div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 2, color: orderStatus === "ready" ? "var(--grn)" : orderStatus === "locked" ? "var(--blue)" : "var(--org)" }}>
                {orderStatus === "ready" ? "YOUR ORDER IS READY!" : orderStatus === "locked" ? "BEING PREPARED..." : "ORDER RECEIVED"}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
                {orderStatus === "ready" ? "Collect from counter 🎉" : orderStatus === "locked" ? "Your burger is being made!" : "Waiting for kitchen..."}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
                {[{ label: "RECEIVED", active: true }, { label: "PREPARING", active: orderStatus !== "pending" }, { label: "READY", active: orderStatus === "ready" }].map((s, i) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.active ? "var(--grn)" : "var(--border)", transition: "all .5s", boxShadow: s.active ? "0 0 8px var(--grn)" : "none" }} />
                    <div style={{ fontSize: 8, fontWeight: 700, color: s.active ? "var(--grn)" : "var(--muted)" }}>{s.label}</div>
                    {i < 2 && <div style={{ width: 14, height: 1, background: "var(--border)", marginLeft: 4 }} />}
                  </div>
                ))}
              </div>
            </div>

            <div className="pop-anim" style={{ fontSize: 72, marginBottom: 8 }}>{lastOrder?.isFree ? "🎁" : "🍔"}</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 40, letterSpacing: 2, lineHeight: 1, marginBottom: 8, textShadow: "0 0 30px rgba(255,69,0,.3)" }}>
              {lastOrder?.isFree ? "FREE ORDER PLACED!" : "ORDER PLACED!"}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
              {lastOrder?.isFree ? "Your free burger is coming! 🙏" : "We're on it! 💪"}
            </div>

            {modifyTimer !== null && (
              <div className="card2" style={{ marginBottom: 16, textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--org)" }}>⏱ MODIFICATION WINDOW</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: modifyTimer > 20 ? "var(--grn)" : modifyTimer > 10 ? "var(--amb)" : "var(--org)" }}>{modifyTimer}s</div>
                </div>
                <div className="progress-track">
                  <div style={{ height: "100%", borderRadius: 3, transition: "width 1s linear, background .5s", width: `${(modifyTimer / 60) * 100}%`, background: modifyTimer > 20 ? "var(--grn)" : modifyTimer > 10 ? "var(--amb)" : "var(--org)" }} />
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
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowReviewModal(true)}>⭐ Rate</button>
              <button className="btn btn-org btn-pulse" style={{ flex: 1 }} onClick={() => { setCStep("menu"); setCart([]); setCustTab("menu"); }}>ORDER MORE 🍔</button>
            </div>
          </div>
        )}

        {/* REVIEW MODAL */}
        {showReviewModal && (
          <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: 2, marginBottom: 4 }}>RATE YOUR EXPERIENCE</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>+5 XP for submitting ⭐</div>
              {[{ key: "food", label: "🍔 Food Quality" }, { key: "service", label: "👋 Service" }, { key: "taste", label: "😋 Taste" }].map(({ key, label }) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{label}</div>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} className={`star ${reviewData[key] >= n ? "active" : ""}`}
                        style={{ transition: "all .2s", transform: reviewData[key] >= n ? "scale(1.1)" : "scale(1)" }}
                        onClick={() => setReviewData(r => ({ ...r, [key]: n }))}>⭐</div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>💬 Comment (optional)</div>
                <textarea className="input-field" style={{ height: 80, resize: "none" }} placeholder="Tell us what you loved..."
                  value={reviewData.comment} onChange={e => setReviewData(r => ({ ...r, comment: e.target.value }))} />
              </div>
              <button className="btn btn-org btn-full" onClick={submitReview}>SUBMIT +5 XP ⭐</button>
            </div>
          </div>
        )}

        {/* POPUPS */}
        {showPopup && (
          <div className="modal-overlay" onClick={() => setShowPopup(null)}>
            <div className="modal-sheet" style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
              {showPopup.type === "freeBurger" && (
                <>
                  <div style={{ fontSize: 80, marginBottom: 12 }} className="pop-anim">🎁</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, letterSpacing: 2, marginBottom: 8, color: "var(--grn)" }}>FREE BURGER UNLOCKED!</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>Congratulations! {settings.freeAt} burgers = 1 FREE burger!</div>
                  <button className="btn btn-org btn-full btn-pulse" onClick={() => setShowPopup(null)}>CLAIM REWARD 🔥</button>
                </>
              )}
              {showPopup.type === "rankUp" && (
                <>
                  <div style={{ fontSize: 80, marginBottom: 12 }} className="pop-anim">{showPopup.rank?.icon}</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, letterSpacing: 2, color: showPopup.rank?.color, marginBottom: 4 }}>RANK UP!</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, marginBottom: 16 }}>{showPopup.rank?.name} {showPopup.rank?.rank}</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>You're leveling up! Keep ordering to climb higher!</div>
                  <button className="btn btn-org btn-full" onClick={() => setShowPopup(null)}>LET'S GO 💪</button>
                </>
              )}
              {showPopup.type === "referralReward" && (
                <>
                  <div style={{ fontSize: 80, marginBottom: 12 }} className="pop-anim">🏆</div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, letterSpacing: 2, marginBottom: 8 }}>FREE BURGER EARNED!</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>Your referrals paid off! Claim your reward.</div>
                  <button className="btn btn-grn btn-full" style={{ marginBottom: 8 }} onClick={redeemReferralBurger}>REDEEM FREE BURGER 🎁</button>
                  <button className="btn btn-ghost btn-full" onClick={() => setShowPopup(null)}>Later</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ORDER READY POPUP */}
        {orderReadyPopup && (
          <div className="modal-overlay" onClick={() => setOrderReadyPopup(false)}>
            <div className="modal-sheet" style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 80, marginBottom: 12, animation: "readyPop .6s ease" }}>✅</div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, letterSpacing: 2, color: "var(--grn)", marginBottom: 8 }}>ORDER IS READY!</div>
              <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>
                Please collect your order from the counter. Enjoy! 🍔🔥
              </div>
              <button className="btn btn-grn btn-full btn-pulse" onClick={() => { setOrderReadyPopup(false); setCStep("menu"); setCustTab("menu"); }}>
                COLLECT ORDER 🎉
              </button>
            </div>
          </div>
        )}

        <Toast msg={toast} />
      </div>
    </>
  );
}
