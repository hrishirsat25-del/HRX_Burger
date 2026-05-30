// ─── SHARED THEME + CONSTANTS ─────────────────────────────────────────────────

export const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --org:#FF4500;--amb:#FFB800;--grn:#22C55E;--pur:#A855F7;--blue:#3B82F6;--red:#EF4444;
  --bg:#080808;--card:#141414;--card2:#1c1c1c;--card3:#242424;
  --txt:#F0E8D8;--muted:#666;--border:#252525;--border2:#333;
}
body{background:var(--bg);color:var(--txt);font-family:'Outfit',sans-serif;min-height:100vh;overflow-x:hidden}
.wrap{max-width:430px;margin:0 auto;min-height:100vh;position:relative}
.hdr{background:rgba(8,8,8,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200}
.logo{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:3px}
.logo span{color:var(--org)}
.tabs{display:flex;border-bottom:1px solid var(--border);background:#0e0e0e;overflow-x:auto;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{flex:0 0 auto;padding:11px 14px;font-size:10px;font-weight:800;letter-spacing:1.2px;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap}
.tab.active{color:var(--org);border-bottom-color:var(--org)}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px}
.card2{background:var(--card2);border-radius:10px;padding:12px}
.card3{background:var(--card3);border-radius:8px;padding:10px}
.btn{border:none;border-radius:12px;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:700;transition:all .15s;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:14px}
.btn:active{transform:scale(.96)}
.btn:disabled{opacity:.35;cursor:not-allowed;transform:none!important}
.btn-org{background:var(--org);color:#fff;padding:12px 20px}
.btn-amb{background:var(--amb);color:#000;padding:10px 16px}
.btn-grn{background:var(--grn);color:#fff;padding:9px 14px;font-size:12px}
.btn-red{background:#7f1d1d;color:#fca5a5;padding:9px 14px;font-size:12px}
.btn-ghost{background:var(--card2);color:var(--txt);padding:10px 16px;border:1px solid var(--border)}
.btn-pur{background:var(--pur);color:#fff;padding:10px 16px}
.btn-full{width:100%;padding:14px}
.input-field{width:100%;background:var(--card);border:1.5px solid var(--border2);border-radius:10px;padding:13px 15px;color:var(--txt);font-family:'Outfit',sans-serif;font-size:15px;outline:none;transition:border-color .2s}
.input-field:focus{border-color:var(--org)}
.input-label{font-size:11px;font-weight:700;letter-spacing:1.2px;color:var(--muted);margin-bottom:5px}
.section-title{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:var(--muted);padding:12px 16px 6px}
.scroll-area{padding-top:8px;padding-bottom:120px}
.progress-track{height:6px;background:var(--border);border-radius:3px;overflow:hidden}
.progress-fill{height:100%;border-radius:3px;transition:width .5s ease}
.rank-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:1px}
.status-badge{font-size:9px;font-weight:800;letter-spacing:1px;padding:4px 10px;border-radius:20px}
.status-badge.pending{background:#3a1800;color:#FF6B35}
.status-badge.locked{background:#1a1a3a;color:#818cf8}
.status-badge.ready{background:#0f2d1a;color:#22C55E}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(6px);z-index:300;display:flex;align-items:flex-end;justify-content:center}
.modal-sheet{background:var(--card);border-radius:20px 20px 0 0;padding:24px 20px;width:100%;max-width:430px;animation:slideUp .3s ease}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:100px;font-size:13px;font-weight:700;z-index:999;white-space:nowrap;pointer-events:none;background:#1a1a1a;border:1px solid var(--grn);color:var(--grn)}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.stat-cell{background:var(--card2);border-radius:10px;padding:12px;text-align:center}
.stat-val{font-family:'Bebas Neue',sans-serif;font-size:30px}
.stat-lbl{font-size:10px;font-weight:700;letter-spacing:.8px;color:var(--muted);margin-top:2px}
.qty-ctrl{display:flex;align-items:center;gap:7px}
.qty-btn{width:28px;height:28px;border-radius:50%;border:none;cursor:pointer;font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center;transition:transform .1s;flex-shrink:0}
.qty-btn:active{transform:scale(.85)}
.qty-btn.minus{background:#242424;color:var(--txt)}
.qty-btn.plus{background:var(--org);color:#fff}
.qty-num{font-weight:800;font-size:15px;min-width:14px;text-align:center}
.extras-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.extra-chip{background:var(--card2);border:1.5px solid var(--border2);border-radius:10px;padding:10px;cursor:pointer;transition:all .15s;text-align:center}
.extra-chip.selected{border-color:var(--org);background:rgba(255,69,0,.1)}
.cart-bar{position:sticky;bottom:0;background:rgba(8,8,8,.97);backdrop-filter:blur(12px);border-top:1px solid var(--border);padding:12px 16px;z-index:100}
.dots{display:flex;gap:3px;flex-wrap:wrap;margin-top:8px}
.dot{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;transition:all .3s}
.dot.done{background:var(--org);color:#fff}
.dot.empty{background:var(--border);color:var(--muted)}
.achievement-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;gap:12px;align-items:center;margin-bottom:8px}
.achievement-card.earned{border-color:var(--amb);background:linear-gradient(135deg,#1a1200,#1f1500)}
.achievement-card.locked{opacity:.45}
.stars{display:flex;gap:6px}
.star{font-size:28px;cursor:pointer;transition:transform .1s;opacity:.3}
.star.active{opacity:1}
.hist-item{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px}
.hist-item:last-child{border-bottom:none}
.xp-bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--org),var(--amb));transition:width .8s cubic-bezier(.34,1.2,.64,1)}
.member-avatar{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:#000;flex-shrink:0}
.free-banner{background:linear-gradient(135deg,#0a2015,#0f2a1c);border:1.5px solid var(--grn);border-radius:12px;padding:13px 15px;display:flex;gap:10px;align-items:center}
.ref-code-box{background:var(--card2);border:1.5px dashed var(--amb);border-radius:12px;padding:14px;text-align:center}
.ref-code{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:4px;color:var(--amb)}
@keyframes pop{from{transform:scale(0) rotate(-10deg)}to{transform:scale(1) rotate(0)}}
@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
.pop-anim{animation:pop .4s cubic-bezier(.34,1.56,.64,1)}
.slide-up{animation:slideUp .4s ease forwards}
`;

export const RANKS = [
  { name: "Rookie", rank: "E-Rank", minXP: 0, color: "#888", icon: "⚪", bg: "#1a1a1a" },
  { name: "Hunter", rank: "D-Rank", minXP: 100, color: "#4CAF50", icon: "🟢", bg: "#0a1f0a" },
  { name: "Hunter", rank: "C-Rank", minXP: 300, color: "#2196F3", icon: "🔵", bg: "#0a0f1f" },
  { name: "Hunter", rank: "B-Rank", minXP: 700, color: "#9C27B0", icon: "🟣", bg: "#160a1f" },
  { name: "Hunter", rank: "A-Rank", minXP: 1500, color: "#FF9800", icon: "🟠", bg: "#1f110a" },
  { name: "Elite", rank: "S-Rank", minXP: 3000, color: "#FFD700", icon: "🟡", bg: "#1f1a0a" },
  { name: "Shadow Monarch", rank: "MONARCH", minXP: 6000, color: "#FF4500", icon: "👑", bg: "#1f0a0a" },
];

export const ACHIEVEMENTS = [
  { id: "first", icon: "🍔", name: "First Burger", desc: "Placed your first order", check: (c) => c.orderCount >= 1 },
  { id: "addict", icon: "🔥", name: "Burger Addict", desc: "Bought 25 burgers", check: (c) => c.orderCount >= 25 },
  { id: "master", icon: "💪", name: "Smash Master", desc: "Bought 50 burgers", check: (c) => c.orderCount >= 50 },
  { id: "cheese", icon: "🧀", name: "Cheese Lover", desc: "Added extra cheese 5 times", check: (c) => (c.cheeseCount || 0) >= 5 },
  { id: "sauce", icon: "🌶️", name: "Sauce King", desc: "Tried all 4 sauces", check: (c) => (c.saucesTriedCount || 0) >= 4 },
  { id: "referral", icon: "🤝", name: "Referral Hero", desc: "Successfully referred 5 people", check: (c) => (c.successfulReferrals || 0) >= 5 },
  { id: "monarch", icon: "👑", name: "Shadow Monarch", desc: "Reached Shadow Monarch rank", check: (c) => (c.xp || 0) >= 6000 },
];

export const EXTRAS = [
  { id: "cheese", name: "Extra Cheese", icon: "🧀", price: 20 },
  { id: "fries", name: "Crispy Fries", icon: "🍟", price: 49 },
  { id: "dietcoke", name: "Diet Coke", icon: "🥤", price: 39 },
  { id: "sigdrink", name: "Signature Drink", icon: "🍹", price: 59 },
];

export const SAUCES = [
  { id: "mustard", name: "Mustard Sauce", icon: "💛", price: 15 },
  { id: "periperi", name: "Peri Peri", icon: "🌶️", price: 15 },
  { id: "garlic", name: "Garlic Aioli", icon: "🤍", price: 15 },
  { id: "bbq", name: "Smoky BBQ", icon: "🍫", price: 15 },
];

export const DEFAULT_MENU = [
  { id: "classic", name: "Classic Smash Burger", price: 99, tag: "BESTSELLER", desc: "Single smashed patty · special sauce · pickles · onions", isBurger: true, available: true },
  { id: "double", name: "Double Smash Burger", price: 149, tag: "POPULAR", desc: "Two smashed patties · double cheese · caramelized onions", isBurger: true, available: true },
  { id: "signature", name: "HRX Signature Burger", price: 129, tag: "CHEF'S PICK", desc: "Secret HRX recipe · the one everyone talks about", isBurger: true, available: true },
  { id: "fries_m", name: "Crispy Fries", price: 49, tag: null, desc: "Golden shoestring · lightly seasoned", isBurger: false, available: true },
];

export const DEFAULT_SETTINGS = {
  freeAt: 10,
  referralPointsPer: 100,
  referralThreshold: 10,
  redeemAt: 2000,
  staffPin: "1234",
  adminPassword: "hrxadmin",
};

export function getRank(xp = 0) {
  let r = RANKS[0];
  for (const rank of RANKS) { if (xp >= rank.minXP) r = rank; }
  return r;
}
export function getNextRank(xp = 0) {
  for (const rank of RANKS) { if (xp < rank.minXP) return rank; }
  return null;
}
export function genRefCode(phone) {
  return "HRX" + phone.slice(-4) + Math.floor(phone.slice(0, 4) * 7 % 100);
}
export function timeAgo(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}
export function initials(name) {
  return name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}
export function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}>
      <div style={{ fontSize: 44, marginBottom: 12, opacity: .25 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  );
}
export function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}
