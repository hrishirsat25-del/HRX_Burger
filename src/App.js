import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const FREE_AT = 10;
const REFERRAL_POINTS_PER = 100;
const REFERRAL_THRESHOLD = 10; // referred customer must buy 10 burgers
const REDEEM_AT = 2000;

const RANKS = [
  { name: "Rookie",         rank: "E-Rank",       minXP: 0,    color: "#888",    icon: "⚪", bg: "#1a1a1a" },
  { name: "Hunter",         rank: "D-Rank",       minXP: 100,  color: "#4CAF50", icon: "🟢", bg: "#0a1f0a" },
  { name: "Hunter",         rank: "C-Rank",       minXP: 300,  color: "#2196F3", icon: "🔵", bg: "#0a0f1f" },
  { name: "Hunter",         rank: "B-Rank",       minXP: 700,  color: "#9C27B0", icon: "🟣", bg: "#160a1f" },
  { name: "Hunter",         rank: "A-Rank",       minXP: 1500, color: "#FF9800", icon: "🟠", bg: "#1f110a" },
  { name: "Elite",          rank: "S-Rank",       minXP: 3000, color: "#FFD700", icon: "🟡", bg: "#1f1a0a" },
  { name: "Shadow Monarch", rank: "MONARCH",      minXP: 6000, color: "#FF4500", icon: "👑", bg: "#1f0a0a" },
];

const ACHIEVEMENTS = [
  { id: "first",    icon: "🍔", name: "First Burger",    desc: "Placed your first order",          check: (c) => c.orderCount >= 1 },
  { id: "addict",   icon: "🔥", name: "Burger Addict",   desc: "Bought 25 burgers",                check: (c) => c.orderCount >= 25 },
  { id: "master",   icon: "💪", name: "Smash Master",    desc: "Bought 50 burgers",                check: (c) => c.orderCount >= 50 },
  { id: "cheese",   icon: "🧀", name: "Cheese Lover",    desc: "Added extra cheese 5 times",       check: (c) => (c.cheeseCount || 0) >= 5 },
  { id: "sauce",    icon: "🌶️", name: "Sauce King",      desc: "Tried all 4 sauces",               check: (c) => (c.saucesTriedCount || 0) >= 4 },
  { id: "referral", icon: "🤝", name: "Referral Hero",   desc: "Successfully referred 5 people",   check: (c) => (c.successfulReferrals || 0) >= 5 },
  { id: "monarch",  icon: "👑", name: "Shadow Monarch",  desc: "Reached Shadow Monarch rank",       check: (c) => (c.xp || 0) >= 6000 },
];

const EXTRAS = [
  { id: "cheese",    name: "Extra Cheese",    icon: "🧀", price: 20 },
  { id: "fries",     name: "Crispy Fries",    icon: "🍟", price: 49 },
  { id: "dietcoke",  name: "Diet Coke",       icon: "🥤", price: 39 },
  { id: "sigdrink",  name: "Signature Drink", icon: "🍹", price: 59 },
];

const SAUCES = [
  { id: "mustard",  name: "Mustard Sauce",  icon: "💛", price: 15 },
  { id: "periperi", name: "Peri Peri",      icon: "🌶️", price: 15 },
  { id: "garlic",   name: "Garlic Aioli",   icon: "🤍", price: 15 },
  { id: "bbq",      name: "Smoky BBQ",      icon: "🍫", price: 15 },
];

const MENU = [
  { id: "classic",   name: "Classic Smash",   full: "Classic Smash Burger",  price: 99,  tag: "BESTSELLER",  desc: "Single smashed patty · special sauce · pickles · onions", isBurger: true },
  { id: "double",    name: "Double Smash",    full: "Double Smash Burger",   price: 149, tag: "POPULAR",     desc: "Two smashed patties · double cheese · caramelized onions", isBurger: true },
  { id: "signature", name: "Signature",       full: "HRX Signature Burger",  price: 129, tag: "CHEF'S PICK", desc: "Secret HRX recipe · the one everyone talks about", isBurger: true },
  { id: "fries_m",   name: "Crispy Fries",    full: "Crispy Fries",          price: 49,  tag: null,          desc: "Golden shoestring · lightly seasoned", isBurger: false },
];

const SK_C = "hrx-customers-v2";
const SK_O = "hrx-orders-v2";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}
function initials(name) {
  return name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}
function getRank(xp = 0) {
  let r = RANKS[0];
  for (const rank of RANKS) { if (xp >= rank.minXP) r = rank; }
  return r;
}
function getNextRank(xp = 0) {
  for (const rank of RANKS) { if (xp < rank.minXP) return rank; }
  return null;
}
function genRefCode(phone) {
  return "HRX" + phone.slice(-4) + Math.floor(phone.slice(0,4) * 7 % 100);
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --org:#FF4500;--amb:#FFB800;--grn:#22C55E;--pur:#A855F7;--blue:#3B82F6;
  --bg:#080808;--card:#141414;--card2:#1c1c1c;--card3:#242424;
  --txt:#F0E8D8;--muted:#666;--border:#252525;--border2:#333;
}
body{background:var(--bg);color:var(--txt);font-family:'Outfit',sans-serif;min-height:100vh;overflow-x:hidden}
.wrap{max-width:430px;margin:0 auto;min-height:100vh;position:relative}

/* HEADER */
.hdr{background:rgba(8,8,8,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200}
.logo{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:3px;color:var(--txt)}
.logo span{color:var(--org)}
.mode-pill{font-size:10px;font-weight:700;padding:5px 11px;border-radius:20px;border:none;cursor:pointer;letter-spacing:1px;transition:all .2s}
.mode-pill.pos{background:var(--org);color:#fff}
.mode-pill.cust{background:var(--amb);color:#000}

/* TABS */
.tabs{display:flex;border-bottom:1px solid var(--border);background:#0e0e0e;overflow-x:auto;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{flex:0 0 auto;padding:11px 14px;text-align:center;font-size:10px;font-weight:800;letter-spacing:1.2px;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap}
.tab.active{color:var(--org);border-bottom-color:var(--org)}

/* CARDS */
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px}
.card2{background:var(--card2);border-radius:10px;padding:12px}
.card3{background:var(--card3);border-radius:8px;padding:10px}

/* BUTTONS */
.btn{border:none;border-radius:12px;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:700;transition:all .15s;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.btn:active{transform:scale(.96)}
.btn-org{background:var(--org);color:#fff;padding:13px 20px;font-size:14px}
.btn-amb{background:var(--amb);color:#000;padding:11px 16px;font-size:13px}
.btn-grn{background:var(--grn);color:#fff;padding:9px 14px;font-size:12px}
.btn-ghost{background:var(--card2);color:var(--txt);padding:11px 16px;font-size:13px;border:1px solid var(--border)}
.btn-red{background:#7f1d1d;color:#fca5a5;padding:9px 14px;font-size:12px}
.btn-pur{background:var(--pur);color:#fff;padding:11px 16px;font-size:13px}
.btn:disabled{opacity:.35;cursor:not-allowed;transform:none!important}

/* INPUT */
.input-field{width:100%;background:var(--card);border:1.5px solid var(--border2);border-radius:10px;padding:13px 15px;color:var(--txt);font-family:'Outfit',sans-serif;font-size:15px;outline:none;transition:border-color .2s}
.input-field:focus{border-color:var(--org)}
.input-label{font-size:11px;font-weight:700;letter-spacing:1.2px;color:var(--muted);margin-bottom:5px}

/* MENU ITEMS */
.menu-item{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border);gap:10px}
.menu-item:last-child{border-bottom:none}
.item-tag{font-size:9px;font-weight:800;letter-spacing:1.5px;color:var(--amb);margin-bottom:3px}
.item-name{font-weight:700;font-size:15px;margin-bottom:2px}
.item-desc{font-size:11px;color:var(--muted);line-height:1.4}
.item-price{font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--org);white-space:nowrap}
.qty-ctrl{display:flex;align-items:center;gap:7px}
.qty-btn{width:28px;height:28px;border-radius:50%;border:none;cursor:pointer;font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center;transition:transform .1s;flex-shrink:0}
.qty-btn:active{transform:scale(.85)}
.qty-btn.minus{background:var(--card3);color:var(--txt)}
.qty-btn.plus{background:var(--org);color:#fff}
.qty-num{font-weight:800;font-size:15px;min-width:14px;text-align:center}

/* EXTRAS GRID */
.extras-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.extra-chip{background:var(--card2);border:1.5px solid var(--border2);border-radius:10px;padding:10px;cursor:pointer;transition:all .15s;text-align:center}
.extra-chip.selected{border-color:var(--org);background:rgba(255,69,0,.1)}
.extra-chip .icon{font-size:20px;margin-bottom:4px}
.extra-chip .name{font-size:11px;font-weight:700}
.extra-chip .price{font-size:11px;color:var(--muted)}

/* CART BAR */
.cart-bar{position:sticky;bottom:0;background:rgba(8,8,8,.97);backdrop-filter:blur(12px);border-top:1px solid var(--border);padding:12px 16px;z-index:100}

/* PROGRESS */
.progress-track{height:6px;background:var(--border);border-radius:3px;overflow:hidden}
.progress-fill{height:100%;border-radius:3px;transition:width .5s ease}
.dots{display:flex;gap:3px;flex-wrap:wrap;margin-top:8px}
.dot{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;transition:all .3s}
.dot.done{background:var(--org);color:#fff}
.dot.empty{background:var(--border);color:var(--muted)}

/* RANK BADGE */
.rank-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:1px}

/* ORDER CARD */
.order-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:15px;margin:0 12px 10px}
.order-id{font-size:10px;color:var(--muted);letter-spacing:1px}
.order-name{font-size:15px;font-weight:700}
.order-time{font-size:10px;color:var(--muted)}
.status-badge{font-size:9px;font-weight:800;letter-spacing:1px;padding:4px 10px;border-radius:20px}
.status-badge.pending{background:#3a1800;color:#FF6B35}
.status-badge.locked{background:#1a1a3a;color:#818cf8}
.status-badge.ready{background:#0f2d1a;color:#22C55E}

/* MEMBER CARD */
.member-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:13px 15px;margin:0 12px 9px;display:flex;align-items:center;gap:12px}
.member-avatar{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:#000;flex-shrink:0}

/* SUCCESS */
.success-wrap{padding:32px 20px;text-align:center}
@keyframes pop{from{transform:scale(0) rotate(-10deg)}to{transform:scale(1) rotate(0)}}
@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(255,69,0,.3)}50%{box-shadow:0 0 40px rgba(255,69,0,.7)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes xpBar{from{width:0}to{width:var(--target-w)}}
.pop-anim{animation:pop .4s cubic-bezier(.34,1.56,.64,1)}
.slide-up{animation:slideUp .4s ease forwards}

/* COUNTDOWN */
.countdown-ring{position:relative;display:inline-block}
.countdown-ring svg{transform:rotate(-90deg)}
.countdown-ring .count-text{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--org)}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(6px);z-index:300;display:flex;align-items:flex-end;justify-content:center}
.modal-sheet{background:var(--card);border-radius:20px 20px 0 0;padding:24px 20px;width:100%;max-width:430px;animation:slideUp .3s ease}

/* RATING STARS */
.stars{display:flex;gap:6px}
.star{font-size:28px;cursor:pointer;transition:transform .1s;opacity:.3}
.star.active{opacity:1}
.star:active{transform:scale(.85)}

/* ACHIEVEMENT */
.achievement-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;gap:12px;align-items:center;margin-bottom:8px}
.achievement-card.earned{border-color:var(--amb);background:linear-gradient(135deg,#1a1200,#1f1500)}
.achievement-card.locked{opacity:.45}

/* ENROLL */
.enroll-hero{background:linear-gradient(160deg,#1a0800,#0d0500);border-bottom:1px solid var(--border);padding:28px 20px 24px}
.enroll-title{font-family:'Bebas Neue',sans-serif;font-size:48px;letter-spacing:3px;line-height:.95;margin-bottom:10px}

/* XP BAR ANIMATED */
.xp-bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--org),var(--amb));transition:width .8s cubic-bezier(.34,1.2,.64,1)}

/* TOAST */
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:100px;font-size:13px;font-weight:700;z-index:999;white-space:nowrap;animation:pop .25s ease;pointer-events:none}

/* FREE BANNER */
.free-banner{background:linear-gradient(135deg,#0a2015,#0f2a1c);border:1.5px solid var(--grn);border-radius:12px;padding:13px 15px;display:flex;gap:10px;align-items:center}

/* SCROLL */
.scroll-area{padding-top:8px;padding-bottom:120px}
.section-title{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:var(--muted);padding:12px 16px 6px}

/* REFERRAL */
.ref-code-box{background:var(--card2);border:1.5px dashed var(--amb);border-radius:12px;padding:14px;text-align:center}
.ref-code{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:4px;color:var(--amb)}

/* MODIF TIMER */
.mod-timer-bar{height:4px;background:var(--org);transition:width 1s linear;border-radius:2px}

/* DASHBOARD */
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.stat-cell{background:var(--card2);border-radius:10px;padding:12px;text-align:center}
.stat-val{font-family:'Bebas Neue',sans-serif;font-size:30px}
.stat-lbl{font-size:10px;font-weight:700;letter-spacing:.8px;color:var(--muted);margin-top:2px}

/* ORDER HISTORY */
.hist-item{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px}
.hist-item:last-child{border-bottom:none}
`;

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("pos"); // pos | customer
  const [customers, setCustomers] = useState({});
  const [orders, setOrders] = useState([]);

  // Customer flow
  const [cStep, setCStep] = useState("enroll"); // enroll|menu|success|dashboard
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
  const [showPopup, setShowPopup] = useState(null); // { type: "freeBurger"|"referralReward", ... }
  const [modifyTimer, setModifyTimer] = useState(null); // seconds remaining
  const modifyIntervalRef = useRef(null);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [toast, setToast] = useState("");
  const [custTab, setCustTab] = useState("menu"); // menu|dashboard|referral

  // POS
  const [posTab, setPosTab] = useState("orders");

  // Load from storage
  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get(SK_C); if (r) setCustomers(JSON.parse(r.value)); } catch {}
      try { const r = await window.storage.get(SK_O); if (r) setOrders(JSON.parse(r.value)); } catch {}
    })();
  }, []);

  const saveC = useCallback(async (data) => {
    try { await window.storage.set(SK_C, JSON.stringify(data)); } catch {}
  }, []);
  const saveO = useCallback(async (data) => {
    try { await window.storage.set(SK_O, JSON.stringify(data)); } catch {}
  }, []);

  const showToast = (msg, dur = 2500) => { setToast(msg); setTimeout(() => setToast(""), dur); };

  // Live customer
  const liveCustomer = currentCust ? (customers[currentCust.phone] || currentCust) : null;
  const ordersDone = liveCustomer?.orderCount || 0;
  const freeAvailable = (liveCustomer?.freeEarned || 0) - (liveCustomer?.freeUsed || 0);
  const progressInCycle = ordersDone % FREE_AT;
  const referralPoints = liveCustomer?.referralPoints || 0;
  const xp = liveCustomer?.xp || 0;
  const rank = getRank(xp);
  const nextRank = getNextRank(xp);

  // Cart helpers
  const cartQty = (id) => cart.find(c => c.id === id)?.qty || 0;
  const extrasTotal = selectedExtras.reduce((s, id) => {
    const e = EXTRAS.find(x => x.id === id); return s + (e?.price || 0);
  }, 0);
  const saucesTotal = selectedSauces.reduce((s, id) => {
    const e = SAUCES.find(x => x.id === id); return s + (e?.price || 0);
  }, 0);
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

  // Enroll / login
  const handleEnroll = () => {
    if (phone.length < 10) return;
    const p = phone.trim();
    const existing = customers[p];
    if (existing) {
      setCurrentCust(existing);
    } else {
      // check if referred
      let referredBy = null;
      if (refCodeInput) {
        const refPhone = Object.keys(customers).find(ph => genRefCode(ph) === refCodeInput.trim().toUpperCase());
        if (refPhone) referredBy = refPhone;
      }
      const newCust = {
        phone: p, name: name.trim() || "Guest",
        orderCount: 0, freeEarned: 0, freeUsed: 0,
        xp: 0, referralPoints: 0, successfulReferrals: 0,
        referredBy, refCode: genRefCode(p),
        cheeseCount: 0, saucesTriedSet: [], saucesTriedCount: 0,
        achievements: [], orderHistory: [],
      };
      const updated = { ...customers, [p]: newCust };
      setCustomers(updated);
      saveC(updated);
      setCurrentCust(newCust);
    }
    setCStep("menu");
    setCustTab("menu");
  };

  // Award XP helper
  const awardXP = (custData, amount, label = "") => {
    const newXP = (custData.xp || 0) + amount;
    const oldRank = getRank(custData.xp || 0);
    const newRankData = getRank(newXP);
    if (newRankData.minXP > oldRank.minXP) {
      setTimeout(() => setShowPopup({ type: "rankUp", rank: newRankData }), 600);
    }
    return newXP;
  };

  // Check & award achievements
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

  // Place order
  const placeOrder = async (isFree = false) => {
    if (cart.length === 0) return;
    const p = currentCust?.phone;
    const extraItems = selectedExtras.map(id => EXTRAS.find(e => e.id === id)).filter(Boolean);
    const sauceItems = selectedSauces.map(id => SAUCES.find(e => e.id === id)).filter(Boolean);

    const order = {
      id: Date.now(),
      items: [...cart],
      extras: extraItems,
      sauces: sauceItems,
      total: isFree ? 0 : cartTotal,
      isFree,
      customerPhone: p,
      customerName: liveCustomer?.name || "Guest",
      status: "pending",
      locked: false,
      timestamp: new Date().toISOString(),
    };
    const newOrders = [order, ...orders];
    setOrders(newOrders);
    await saveO(newOrders);

    if (p) {
      const updC = { ...customers };
      const c = { ...updC[p] };

      // cheese/sauce tracking
      if (selectedExtras.includes("cheese")) c.cheeseCount = (c.cheeseCount || 0) + 1;
      const triedSet = new Set(c.saucesTriedSet || []);
      sauceItems.forEach(s => triedSet.add(s.id));
      c.saucesTriedSet = [...triedSet];
      c.saucesTriedCount = c.saucesTriedSet.length;

      let xpEarned = 0;
      if (isFree) {
        c.freeUsed = (c.freeUsed || 0) + 1;
        xpEarned += 5; // small xp for redeeming
      } else {
        c.orderCount = (c.orderCount || 0) + 1;
        xpEarned += 20; // 20 XP per order

        // Check if new free earned
        const newFreeEarned = Math.floor(c.orderCount / FREE_AT);
        if (newFreeEarned > (c.freeEarned || 0)) {
          c.freeEarned = newFreeEarned;
          setTimeout(() => setShowPopup({ type: "freeBurger" }), 1000);
        }

        // Referral tracking - check if referred person hit 10 orders
        if (c.referredBy && c.orderCount === REFERRAL_THRESHOLD) {
          const refPhone = c.referredBy;
          if (updC[refPhone]) {
            const refCust = { ...updC[refPhone] };
            refCust.referralPoints = (refCust.referralPoints || 0) + REFERRAL_POINTS_PER;
            refCust.successfulReferrals = (refCust.successfulReferrals || 0) + 1;
            refCust.xp = awardXP(refCust, 50, "referral");
            if (refCust.referralPoints >= REDEEM_AT) {
              // they'll see the popup next time they login
              refCust.hasFreeReferralBurger = (refCust.hasFreeReferralBurger || 0) + Math.floor(refCust.referralPoints / REDEEM_AT);
              refCust.referralPoints = refCust.referralPoints % REDEEM_AT;
            }
            const achRef = checkAchievements(refCust);
            refCust.achievements = achRef.achievements;
            refCust.xp = (refCust.xp || 0) + achRef.xpBonus;
            updC[refPhone] = refCust;
          }
        }
      }

      // XP
      c.xp = awardXP(c, xpEarned);

      // Order history
      c.orderHistory = [{ id: order.id, total: order.total, isFree: order.isFree, items: cart.map(i => i.name).join(", "), ts: order.timestamp }, ...(c.orderHistory || [])].slice(0, 20);

      // Achievements
      const ach = checkAchievements(c);
      c.achievements = ach.achievements;
      c.xp = (c.xp || 0) + ach.xpBonus;

      updC[p] = c;
      setCustomers(updC);
      await saveC(updC);
      setCurrentCust(updC[p]);
    }

    setLastOrder(order);
    setCart([]);
    setSelectedExtras([]);
    setSelectedSauces([]);
    setCStep("success");

    // Start 60s modification window
    setPendingOrderId(order.id);
    setModifyTimer(60);
    if (modifyIntervalRef.current) clearInterval(modifyIntervalRef.current);
    modifyIntervalRef.current = setInterval(() => {
      setModifyTimer(prev => {
        if (prev <= 1) {
          clearInterval(modifyIntervalRef.current);
          // Lock the order
          setOrders(prevOrders => {
            const locked = prevOrders.map(o => o.id === order.id ? { ...o, locked: true } : o);
            saveO(locked);
            return locked;
          });
          setPendingOrderId(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelOrder = async () => {
    if (!pendingOrderId) return;
    clearInterval(modifyIntervalRef.current);
    const updated = orders.filter(o => o.id !== pendingOrderId);
    setOrders(updated);
    await saveO(updated);
    // revert customer counts
    const p = currentCust?.phone;
    if (p && customers[p]) {
      const updC = { ...customers };
      const c = { ...updC[p] };
      if (!lastOrder?.isFree && c.orderCount > 0) {
        c.orderCount--;
        c.freeEarned = Math.floor(c.orderCount / FREE_AT);
      }
      if (lastOrder?.isFree) { c.freeUsed = Math.max(0, (c.freeUsed || 0) - 1); }
      updC[p] = c;
      setCustomers(updC);
      await saveC(updC);
      setCurrentCust(updC[p]);
    }
    setPendingOrderId(null);
    setModifyTimer(null);
    showToast("❌ Order cancelled");
    setCStep("menu");
    setLastOrder(null);
  };

  const markReady = async (id) => {
    const updated = orders.map(o => o.id === id ? { ...o, status: "ready" } : o);
    setOrders(updated);
    await saveO(updated);
    showToast("✅ Order ready!");
  };

  const redeemReferralBurger = async () => {
    const p = currentCust?.phone;
    if (!p) return;
    const updC = { ...customers };
    const c = { ...updC[p] };
    c.hasFreeReferralBurger = Math.max(0, (c.hasFreeReferralBurger || 0) - 1);
    updC[p] = c;
    setCustomers(updC);
    await saveC(updC);
    setCurrentCust(updC[p]);
    setShowPopup(null);
    showToast("🎁 Free burger coupon added!", 3000);
  };

  const submitReview = async () => {
    const p = currentCust?.phone;
    if (!p) return;
    const updC = { ...customers };
    const c = { ...updC[p] };
    c.xp = (c.xp || 0) + 5;
    c.reviews = [...(c.reviews || []), { ...reviewData, ts: new Date().toISOString() }];
    updC[p] = c;
    setCustomers(updC);
    await saveC(updC);
    setCurrentCust(updC[p]);
    setShowReviewModal(false);
    showToast("⭐ Review submitted! +5 XP");
  };

  const switchToCustomer = () => { setView("customer"); setCStep("enroll"); setPhone(""); setName(""); setRefCodeInput(""); setCurrentCust(null); setCart([]); setSelectedExtras([]); setSelectedSauces([]); };
  const switchToPos = () => { setView("pos"); };

  const pendingOrders = orders.filter(o => o.status === "pending");
  const memberList = Object.values(customers).sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));

  // ─── XP PROGRESS ─────────────────────────────────────────────────────────
  const xpForNextRank = nextRank ? nextRank.minXP : rank.minXP;
  const xpInCurrentTier = xp - rank.minXP;
  const xpNeededForTier = (nextRank ? nextRank.minXP : xp) - rank.minXP;
  const xpPct = nextRank ? Math.min(100, (xpInCurrentTier / xpNeededForTier) * 100) : 100;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className="wrap">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="hdr">
          <div className="logo">HRX<span>.</span>BURGER</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {view === "customer" && liveCustomer && (
              <div
                className="rank-badge"
                style={{ background: rank.bg, color: rank.color, border: `1px solid ${rank.color}40`, cursor: "pointer" }}
                onClick={() => { setCustTab("dashboard"); setCStep("menu"); }}
              >
                {rank.icon} {rank.rank}
              </div>
            )}
            {view === "pos"
              ? <button className="mode-pill cust" onClick={switchToCustomer}>📱 Customer</button>
              : <button className="mode-pill pos" onClick={switchToPos}>🖥 POS</button>
            }
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            POS VIEW
        ══════════════════════════════════════════════════════════════════ */}
        {view === "pos" && (
          <>
            <div className="tabs">
              {[
                { id: "orders", label: `ORDERS${pendingOrders.length > 0 ? ` (${pendingOrders.length})` : ""}` },
                { id: "members", label: `MEMBERS (${memberList.length})` },
                { id: "qr", label: "QR CODE" },
                { id: "stats", label: "STATS" },
              ].map(t => (
                <div key={t.id} className={`tab ${posTab === t.id ? "active" : ""}`} onClick={() => setPosTab(t.id)}>{t.label}</div>
              ))}
            </div>
            <div className="scroll-area">
              {posTab === "orders" && (
                orders.length === 0
                  ? <EmptyState icon="🍔" text="No orders yet. Share the QR code!" />
                  : orders.map(order => (
                    <div className="order-card" key={order.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div className="order-id">ORDER #{String(order.id).slice(-4)}</div>
                          <div className="order-name">{order.customerName}</div>
                          <div className="order-time">{timeAgo(order.timestamp)}</div>
                        </div>
                        <span className={`status-badge ${order.locked || order.status === "ready" ? order.status : "pending"}`}>
                          {order.status === "ready" ? "✅ READY" : order.locked ? "🔒 LOCKED" : "⏳ PENDING"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.8 }}>
                        {order.items.map(i => <div key={i.id}>{i.qty}× {i.full || i.name}</div>)}
                        {order.extras?.map(e => <div key={e.id}>+ {e.name}</div>)}
                        {order.sauces?.map(s => <div key={s.id}>+ {s.name}</div>)}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: order.isFree ? "var(--grn)" : "var(--amb)" }}>
                          {order.isFree ? "FREE 🎁" : `₹${order.total}`}
                        </div>
                        {order.status === "pending" && order.locked && (
                          <button className="btn btn-grn" onClick={() => markReady(order.id)}>Mark Ready</button>
                        )}
                        {!order.locked && <span style={{ fontSize: 11, color: "var(--org)" }}>Modification window open...</span>}
                      </div>
                    </div>
                  ))
              )}
              {posTab === "members" && (
                <>
                  <div className="section-title">LOYALTY MEMBERS</div>
                  {memberList.length === 0
                    ? <EmptyState icon="👥" text="No members yet." />
                    : memberList.map(m => {
                      const free = (m.freeEarned || 0) - (m.freeUsed || 0);
                      const r = getRank(m.xp || 0);
                      return (
                        <div className="member-card" key={m.phone}>
                          <div className="member-avatar" style={{ background: `linear-gradient(135deg,${r.color},var(--amb))` }}>{initials(m.name)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                              <div className="rank-badge" style={{ background: r.bg, color: r.color, fontSize: 9, padding: "2px 7px" }}>{r.icon} {r.rank}</div>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.phone}</div>
                            {free > 0 && <div style={{ fontSize: 10, color: "var(--grn)", fontWeight: 700, marginTop: 2 }}>🎁 {free} FREE BURGER{free > 1 ? "S" : ""}</div>}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: "var(--org)", lineHeight: 1 }}>{m.orderCount || 0}</div>
                            <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>ORDERS</div>
                          </div>
                        </div>
                      );
                    })
                  }
                </>
              )}
              {posTab === "qr" && (
                <div style={{ padding: "8px 0" }}>
                  <div className="card" style={{ margin: "12px", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: 2, marginBottom: 4 }}>SCAN TO ORDER</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>Place at your cart or counter</div>
                    <img
                      style={{ width: 160, height: 160, borderRadius: 12, background: "white", padding: 6 }}
                      src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=HRX+Smash+Burger&color=FF4500&bgcolor=FFFFFF"
                      alt="QR"
                    />
                    <div style={{ marginTop: 16 }}>
                      <button className="btn btn-org" style={{ width: "100%" }} onClick={switchToCustomer}>📱 Open Customer View</button>
                    </div>
                  </div>
                  <div className="card" style={{ margin: "0 12px 12px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--muted)", marginBottom: 10 }}>HOW IT WORKS</div>
                    {["🍔 Every burger order = +20 XP + 1 stamp", `🎁 10 stamps = 1 FREE burger`, "🤝 Refer friends = +100 points each", "🏆 Level up through 7 ranks", "⭐ Reviews = +5 XP"].map(t => (
                      <div key={t} style={{ fontSize: 12, lineHeight: 2 }}>{t}</div>
                    ))}
                  </div>
                </div>
              )}
              {posTab === "stats" && (
                <div style={{ padding: "12px" }}>
                  <div className="stat-grid" style={{ marginBottom: 12 }}>
                    {[
                      { label: "Total Orders", val: orders.length, color: "var(--org)" },
                      { label: "Members", val: memberList.length, color: "var(--amb)" },
                      { label: "Pending", val: pendingOrders.length, color: "var(--blue)" },
                      { label: "Free Redeemed", val: orders.filter(o => o.isFree).length, color: "var(--grn)" },
                    ].map(s => (
                      <div className="stat-cell" key={s.label}>
                        <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
                        <div className="stat-lbl">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--muted)", marginBottom: 12 }}>TOP CUSTOMERS</div>
                    {memberList.slice(0, 5).map((m, i) => (
                      <div key={m.phone} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: "var(--muted)", width: 20 }}>#{i + 1}</div>
                        <div className="member-avatar" style={{ width: 32, height: 32, fontSize: 12, background: `linear-gradient(135deg,${getRank(m.xp||0).color},var(--amb))` }}>{initials(m.name)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)" }}>{getRank(m.xp||0).rank}</div>
                        </div>
                        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: "var(--org)" }}>{m.orderCount || 0}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            CUSTOMER VIEW
        ══════════════════════════════════════════════════════════════════ */}
        {view === "customer" && (
          <>
            {/* ENROLL ─────────────────────────────────────────────────── */}
            {cStep === "enroll" && (
              <>
                <div className="enroll-hero">
                  <div className="enroll-title">ORDER YOUR<br /><span style={{ color: "var(--org)" }}>SMASH</span><br />BURGER</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 24 }}>
                    Enter your phone to order · earn stamps · level up · get free burgers 🔥
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div className="input-label">PHONE NUMBER</div>
                    <input className="input-field" type="tel" maxLength={10} placeholder="10-digit number" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/, ""))} />
                  </div>
                  {phone.length >= 10 && !customers[phone] && (
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
                  {phone.length >= 10 && customers[phone] && (
                    <div style={{ background: "rgba(255,184,0,.08)", border: "1px solid rgba(255,184,0,.2)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
                      <div style={{ fontSize: 10, color: "var(--amb)", fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>WELCOME BACK!</div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{customers[phone].name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{customers[phone].orderCount || 0} orders · {getRank(customers[phone].xp||0).icon} {getRank(customers[phone].xp||0).rank}</div>
                    </div>
                  )}
                  <button className="btn btn-org" style={{ width: "100%", padding: 15, fontSize: 15, borderRadius: 14 }} onClick={handleEnroll} disabled={phone.length < 10}>
                    CONTINUE →
                  </button>
                </div>
                <div style={{ padding: "16px", fontSize: 12, color: "var(--muted)", textAlign: "center", lineHeight: 2 }}>
                  🍔 Classic ₹99 &nbsp;·&nbsp; 🔥 Double ₹149 &nbsp;·&nbsp; ⭐ Signature ₹129 &nbsp;·&nbsp; 🍟 Fries ₹49
                </div>
              </>
            )}

            {/* MENU / DASHBOARD / REFERRAL ─────────────────────────────── */}
            {cStep === "menu" && (
              <>
                <div className="tabs">
                  {[{ id: "menu", label: "🍔 MENU" }, { id: "dashboard", label: "🏆 PROFILE" }, { id: "referral", label: "🤝 REFERRAL" }].map(t => (
                    <div key={t.id} className={`tab ${custTab === t.id ? "active" : ""}`} onClick={() => setCustTab(t.id)}>{t.label}</div>
                  ))}
                </div>

                {/* MENU TAB ──────────────────────────────────────────────── */}
                {custTab === "menu" && (
                  <>
                    <div className="scroll-area" style={{ paddingTop: 12, paddingBottom: 140 }}>
                      {/* Loyalty status */}
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
                                {Array.from({ length: FREE_AT }).map((_, i) => (
                                  <div key={i} className={`dot ${i < progressInCycle ? "done" : "empty"}`}>{i < progressInCycle ? "✓" : ""}</div>
                                ))}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{progressInCycle}/{FREE_AT} to your next free burger</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* XP bar */}
                      <div style={{ padding: "0 12px 12px" }}>
                        <div className="card2" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ fontSize: 22 }}>{rank.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: rank.color }}>{rank.name} {rank.rank}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>{xp} XP</div>
                            </div>
                            <div className="progress-track">
                              <div className="xp-bar-fill" style={{ width: `${xpPct}%`, background: `linear-gradient(90deg,${rank.color},var(--amb))` }} />
                            </div>
                            {nextRank && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>{xpNeededForTier - xpInCurrentTier} XP to {nextRank.name} {nextRank.rank}</div>}
                          </div>
                        </div>
                      </div>

                      {/* Menu items */}
                      <div className="section-title">MENU</div>
                      <div className="card" style={{ margin: "0 12px", padding: 0, overflow: "hidden" }}>
                        {MENU.map(item => (
                          <div className="menu-item" key={item.id}>
                            <div style={{ flex: 1 }}>
                              {item.tag && <div className="item-tag">{item.tag}</div>}
                              <div className="item-name">{item.full}</div>
                              <div className="item-desc">{item.desc}</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                              <div className="item-price">₹{item.price}</div>
                              <div className="qty-ctrl">
                                {cartQty(item.id) > 0 ? (
                                  <>
                                    <button className="qty-btn minus" onClick={() => removeItem(item.id)}>−</button>
                                    <span className="qty-num">{cartQty(item.id)}</span>
                                    <button className="qty-btn plus" onClick={() => addItem(item)}>+</button>
                                  </>
                                ) : (
                                  <button className="qty-btn plus" onClick={() => addItem(item)}>+</button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Extras */}
                      {cartCount > 0 && (
                        <>
                          <div className="section-title">ADD EXTRAS</div>
                          <div style={{ padding: "0 12px" }}>
                            <div className="extras-grid">
                              {EXTRAS.map(e => (
                                <div key={e.id} className={`extra-chip ${selectedExtras.includes(e.id) ? "selected" : ""}`} onClick={() => toggleExtra(e.id)}>
                                  <div className="icon">{e.icon}</div>
                                  <div className="name">{e.name}</div>
                                  <div className="price">+₹{e.price}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="section-title">SAUCES</div>
                          <div style={{ padding: "0 12px 12px" }}>
                            <div className="extras-grid">
                              {SAUCES.map(s => (
                                <div key={s.id} className={`extra-chip ${selectedSauces.includes(s.id) ? "selected" : ""}`} onClick={() => toggleSauce(s.id)}>
                                  <div className="icon">{s.icon}</div>
                                  <div className="name">{s.name}</div>
                                  <div className="price">+₹{s.price}</div>
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
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>{cartCount} item{cartCount > 1 ? "s" : ""}
                              {selectedExtras.length > 0 && ` + ${selectedExtras.length} extra`}
                              {selectedSauces.length > 0 && ` + ${selectedSauces.length} sauce`}
                            </div>
                            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 26, color: "var(--amb)" }}>₹{cartTotal}</div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            {freeAvailable > 0 && (
                              <button className="btn btn-amb" onClick={() => placeOrder(true)}>🎁 Free</button>
                            )}
                            <button className="btn btn-org" onClick={() => placeOrder(false)}>ORDER →</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* DASHBOARD TAB ─────────────────────────────────────────── */}
                {custTab === "dashboard" && liveCustomer && (
                  <div className="scroll-area">
                    {/* Rank card */}
                    <div style={{ margin: "12px", background: rank.bg, border: `1px solid ${rank.color}40`, borderRadius: 16, padding: 20, textAlign: "center" }}>
                      <div style={{ fontSize: 52, marginBottom: 8 }} className="pop-anim">{rank.icon}</div>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 3, color: rank.color }}>{rank.name}</div>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: rank.color, opacity: .7, letterSpacing: 2 }}>{rank.rank}</div>
                      <div style={{ marginTop: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
                          <span>{xp} XP</span>
                          {nextRank && <span>{nextRank.minXP} XP</span>}
                        </div>
                        <div className="progress-track">
                          <div className="xp-bar-fill" style={{ width: `${xpPct}%`, background: `linear-gradient(90deg,${rank.color},var(--amb))` }} />
                        </div>
                        {nextRank && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{xpNeededForTier - xpInCurrentTier} XP to {nextRank.name} {nextRank.rank}</div>}
                      </div>
                    </div>

                    {/* Stats */}
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

                    {/* Loyalty stamps */}
                    <div style={{ padding: "0 12px 12px" }}>
                      <div className="card">
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1, marginBottom: 10 }}>BURGER STAMPS</div>
                        <div className="dots">
                          {Array.from({ length: FREE_AT }).map((_, i) => (
                            <div key={i} className={`dot ${i < progressInCycle ? "done" : "empty"}`}>{i < progressInCycle ? "✓" : i + 1}</div>
                          ))}
                        </div>
                        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
                          {freeAvailable > 0
                            ? <span style={{ color: "var(--grn)" }}>🎁 {freeAvailable} free burger{freeAvailable > 1 ? "s" : ""} ready to redeem!</span>
                            : `${progressInCycle}/${FREE_AT} — ${FREE_AT - progressInCycle} more to unlock a free burger`}
                        </div>
                      </div>
                    </div>

                    {/* Achievements */}
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

                    {/* Order History */}
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
                              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: h.isFree ? "var(--grn)" : "var(--amb)" }}>
                                {h.isFree ? "FREE" : `₹${h.total}`}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* REFERRAL TAB ──────────────────────────────────────────── */}
                {custTab === "referral" && liveCustomer && (
                  <div className="scroll-area">
                    <div style={{ padding: "12px 12px 0" }}>
                      {/* Points */}
                      <div className="card" style={{ background: "linear-gradient(135deg,#160a24,#1f0a35)", borderColor: "rgba(168,85,247,.3)", marginBottom: 12 }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "var(--pur)", marginBottom: 6 }}>REFERRAL POINTS</div>
                          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 56, color: "var(--pur)", lineHeight: 1 }}>{referralPoints}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0" }}>{REDEEM_AT - referralPoints} more points to unlock a FREE burger</div>
                          <div className="progress-track" style={{ margin: "0 8px" }}>
                            <div className="xp-bar-fill" style={{ width: `${Math.min(100, (referralPoints / REDEEM_AT) * 100)}%`, background: "linear-gradient(90deg,var(--pur),var(--blue))" }} />
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{referralPoints}/{REDEEM_AT} points</div>
                        </div>
                      </div>

                      {/* Referral code */}
                      <div className="ref-code-box" style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1, marginBottom: 8 }}>YOUR REFERRAL CODE</div>
                        <div className="ref-code">{liveCustomer.refCode || genRefCode(liveCustomer.phone)}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>Share this with friends · each earns you 100 points when they buy 10 burgers</div>
                        <button className="btn btn-amb" style={{ marginTop: 12, width: "100%" }} onClick={() => {
                          navigator.clipboard?.writeText(liveCustomer.refCode || genRefCode(liveCustomer.phone));
                          showToast("📋 Code copied!");
                        }}>COPY CODE</button>
                      </div>

                      {/* How it works */}
                      <div className="card" style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1, marginBottom: 12 }}>HOW REFERRALS WORK</div>
                        {[
                          { n: "1", t: "Share your code with a friend" },
                          { n: "2", t: "They enter your code when signing up" },
                          { n: "3", t: "After they buy 10 burgers, you earn 100 points" },
                          { n: "4", t: "Reach 2000 points → FREE burger!" },
                          { n: "5", t: "Repeats — keep referring forever" },
                        ].map(s => (
                          <div key={s.n} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--pur)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{s.n}</div>
                            <div style={{ fontSize: 13, paddingTop: 2 }}>{s.t}</div>
                          </div>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="card">
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1, marginBottom: 10 }}>YOUR REFERRAL STATS</div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: "var(--pur)" }}>{liveCustomer.successfulReferrals || 0}</div>
                            <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>SUCCESSFUL REFERRALS</div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: "var(--amb)" }}>{referralPoints}</div>
                            <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>TOTAL POINTS</div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: "var(--grn)" }}>{liveCustomer.hasFreeReferralBurger || 0}</div>
                            <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>FREE BURGERS</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* SUCCESS ─────────────────────────────────────────────────── */}
            {cStep === "success" && (
              <div className="success-wrap">
                <div className="pop-anim" style={{ fontSize: 72, marginBottom: 12 }}>{lastOrder?.isFree ? "🎁" : "🍔"}</div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 42, letterSpacing: 2, lineHeight: 1, marginBottom: 8 }}>
                  {lastOrder?.isFree ? "FREE ORDER PLACED!" : "ORDER PLACED!"}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20, lineHeight: 1.6 }}>
                  {lastOrder?.isFree ? "Your free burger is coming right up! 🙏" : "Your order is being prepared!"}
                </div>

                {/* 60s modification bar */}
                {modifyTimer !== null && (
                  <div className="card2" style={{ marginBottom: 16, textAlign: "left" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--org)" }}>⏱ MODIFICATION WINDOW</div>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: "var(--org)" }}>{modifyTimer}s</div>
                    </div>
                    <div className="progress-track">
                      <div className="mod-timer-bar" style={{ width: `${(modifyTimer / 60) * 100}%`, background: modifyTimer > 20 ? "var(--grn)" : modifyTimer > 10 ? "var(--amb)" : "var(--org)" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>You can modify or cancel your order within 60 seconds</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn btn-red" style={{ flex: 1 }} onClick={cancelOrder}>❌ Cancel Order</button>
                      <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { clearInterval(modifyIntervalRef.current); setModifyTimer(null); setCStep("menu"); }}>✏️ Modify</button>
                    </div>
                  </div>
                )}

                {/* Order summary */}
                <div className="card2" style={{ textAlign: "left", marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--muted)", marginBottom: 8 }}>ORDER SUMMARY</div>
                  {lastOrder?.items.map(i => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
                      <span>{i.qty}× {i.full}</span>
                      <span style={{ color: "var(--muted)" }}>₹{i.price * i.qty}</span>
                    </div>
                  ))}
                  {lastOrder?.extras?.map(e => (
                    <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", color: "var(--muted)" }}>
                      <span>+ {e.name}</span><span>₹{e.price}</span>
                    </div>
                  ))}
                  {lastOrder?.sauces?.map(s => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", color: "var(--muted)" }}>
                      <span>+ {s.name}</span><span>₹{s.price}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                    <span>Total</span>
                    <span style={{ color: lastOrder?.isFree ? "var(--grn)" : "var(--amb)" }}>
                      {lastOrder?.isFree ? "FREE 🎁" : `₹${lastOrder?.total}`}
                    </span>
                  </div>
                </div>

                {/* XP earned */}
                <div className="card2" style={{ marginBottom: 16, textAlign: "left" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--muted)", marginBottom: 4 }}>XP EARNED</div>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: "var(--amb)" }}>+{lastOrder?.isFree ? 5 : 20} XP</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>TOTAL XP</div>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: rank.color }}>{xp}</div>
                    </div>
                  </div>
                  <div className="progress-track" style={{ marginTop: 8 }}>
                    <div className="xp-bar-fill" style={{ width: `${xpPct}%`, background: `linear-gradient(90deg,${rank.color},var(--amb))` }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{rank.icon} {rank.name} {rank.rank}</div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowReviewModal(true)}>⭐ Rate Order</button>
                  <button className="btn btn-org" style={{ flex: 1 }} onClick={() => { setCStep("menu"); setCart([]); setCustTab("menu"); }}>ORDER MORE</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── REVIEW MODAL ───────────────────────────────────────────────── */}
        {showReviewModal && (
          <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, marginBottom: 4 }}>RATE YOUR EXPERIENCE</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>+5 XP for submitting a review</div>
              {[
                { key: "food", label: "🍔 Food Quality" },
                { key: "service", label: "👋 Service" },
                { key: "taste", label: "😋 Taste" },
              ].map(({ key, label }) => (
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
                <textarea
                  className="input-field"
                  style={{ height: 80, resize: "none" }}
                  placeholder="Tell us what you loved..."
                  value={reviewData.comment}
                  onChange={e => setReviewData(r => ({ ...r, comment: e.target.value }))}
                />
              </div>
              <button className="btn btn-org" style={{ width: "100%" }} onClick={submitReview}>
                SUBMIT REVIEW +5 XP
              </button>
            </div>
          </div>
        )}

        {/* ── POPUP MODALS ──────────────────────────────────────────────── */}
        {showPopup && (
          <div className="modal-overlay" onClick={() => setShowPopup(null)}>
            <div className="modal-sheet" style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
              {showPopup.type === "freeBurger" && (
                <>
                  <div style={{ fontSize: 72, marginBottom: 12 }} className="pop-anim">🎁</div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 2, marginBottom: 8 }}>FREE BURGER<br />UNLOCKED!</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>Congratulations! You've bought 10 burgers and earned a FREE one. Redeem it on your next order!</div>
                  <button className="btn btn-org" style={{ width: "100%" }} onClick={() => setShowPopup(null)}>CLAIM REWARD 🔥</button>
                </>
              )}
              {showPopup.type === "rankUp" && (
                <>
                  <div style={{ fontSize: 72, marginBottom: 12 }} className="pop-anim">{showPopup.rank?.icon}</div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 36, letterSpacing: 2, color: showPopup.rank?.color, marginBottom: 8 }}>RANK UP!</div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: 2, marginBottom: 8 }}>{showPopup.rank?.name} {showPopup.rank?.rank}</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>You've leveled up! Keep ordering to reach the next tier.</div>
                  <button className="btn btn-org" style={{ width: "100%" }} onClick={() => setShowPopup(null)}>LET'S GO 💪</button>
                </>
              )}
              {showPopup.type === "referralReward" && (
                <>
                  <div style={{ fontSize: 72, marginBottom: 12 }} className="pop-anim">🏆</div>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: 2, marginBottom: 8 }}>YOU EARNED A<br />FREE BURGER!</div>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>Your referrals paid off! Redeem your 2000-point reward for a free burger.</div>
                  <button className="btn btn-grn" style={{ width: "100%", marginBottom: 8 }} onClick={redeemReferralBurger}>REDEEM FREE BURGER</button>
                  <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => setShowPopup(null)}>Later</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* TOAST */}
        {toast && (
          <div className="toast" style={{ background: "#1a1a1a", border: "1px solid var(--grn)", color: "var(--grn)" }}>{toast}</div>
        )}
      </div>
    </>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
      <div style={{ fontSize: 44, marginBottom: 12, opacity: .25 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  );
}
