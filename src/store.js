import { ref, onValue, set, push, update, remove } from 'firebase/database';
import { db } from './firebase';
import { DEFAULT_MENU, DEFAULT_SETTINGS } from './theme';

// ─── MENU ──────────────────────────────────────────────────────────────────
export const watchMenu = (cb) => {
  return onValue(ref(db, 'menu'), snap => {
    const val = snap.val();
    if (val) {
      const menu = Array.isArray(val) ? val : Object.values(val);
      cb(menu);
    } else {
      // Initialize with defaults
      set(ref(db, 'menu'), DEFAULT_MENU);
      cb(DEFAULT_MENU);
    }
  });
};

export const saveMenu = (menu) => set(ref(db, 'menu'), menu);

// ─── ORDERS ────────────────────────────────────────────────────────────────
export const watchOrders = (cb) => {
  return onValue(ref(db, 'orders'), snap => {
    const val = snap.val();
    if (val) {
      const orders = Object.entries(val)
        .map(([fid, o]) => ({ ...o, firebaseId: fid }))
        .sort((a, b) => b.timestamp - a.timestamp);
      cb(orders);
    } else {
      cb([]);
    }
  });
};

export const addOrder = (order) => push(ref(db, 'orders'), order);
export const updateOrder = (firebaseId, data) => update(ref(db, `orders/${firebaseId}`), data);
export const deleteOrder = (firebaseId) => remove(ref(db, `orders/${firebaseId}`));

// ─── CUSTOMERS ─────────────────────────────────────────────────────────────
export const watchCustomers = (cb) => {
  return onValue(ref(db, 'customers'), snap => {
    cb(snap.val() || {});
  });
};

export const saveCustomer = (phone, data) => {
  const key = phone.replace(/\D/g, '');
  return set(ref(db, `customers/${key}`), data);
};

export const saveCustomers = (customers) => set(ref(db, 'customers'), customers);

export const getCustomerOnce = (phone) =>
  new Promise((res) => {
    const key = phone.replace(/\D/g, '');
    onValue(ref(db, `customers/${key}`), snap => res(snap.val()), { onlyOnce: true });
  });

// ─── SETTINGS ──────────────────────────────────────────────────────────────
export const watchSettings = (cb) => {
  return onValue(ref(db, 'settings'), snap => {
    const val = snap.val();
    if (val) {
      cb({ ...DEFAULT_SETTINGS, ...val });
    } else {
      set(ref(db, 'settings'), DEFAULT_SETTINGS);
      cb(DEFAULT_SETTINGS);
    }
  });
};

export const saveSettings = (settings) => set(ref(db, 'settings'), settings);
