/* =========================================================
   Kerala Lottery Dashboard — app.js
   Full client-side application with localStorage
   ========================================================= */

// Hoist CloudSync globally to prevent TDZ ReferenceError on initial load
var CloudSync = null;

// ─── KERALA LOTTERY TYPES (OFFICIAL ACTIVE SCHEMES) ──────
const LOTTERY_TYPES = [
  { id: 'BT', code: 'BT', name: 'Bhagyathara', day: 'Monday', color: '#D4A941', prize1: 7500000, oldName: 'Win-Win' },
  { id: 'SS', code: 'SS', name: 'Sthree Sakthi', day: 'Tuesday', color: '#E8722A', prize1: 8000000 },
  { id: 'DL', code: 'DL', name: 'Dhanalakshmi', day: 'Wednesday', color: '#10B981', prize1: 10000000, oldName: 'Fifty-Fifty' },
  { id: 'KN', code: 'KN', name: 'Karunya Plus', day: 'Thursday', color: '#8B5CF6', prize1: 8000000 },
  { id: 'KR', code: 'KR', name: 'Karunya', day: 'Saturday', color: '#EF4444', prize1: 8000000 },
  { id: 'RN', code: 'RN', name: 'Pournami', day: 'Sunday', color: '#F59E0B', prize1: 8000000 },
];

const ALL_SERIES = [
  'BT', 'BN', 'BO', 'BP', 'BR', 'BS', 'BU', 'BV', 'BW', 'BX', 'BY', 'BZ',
  'SS', 'SA', 'SB', 'SC', 'SD', 'SE', 'SF', 'SG', 'SH', 'SJ', 'SK', 'SL',
  'DL', 'DA', 'DB', 'DC', 'DD', 'DE', 'DF', 'DG', 'DH', 'DJ', 'DK',
  'WA', 'WB', 'WC', 'WD',
  'KN', 'KA', 'KB', 'KC',
  'KR', 'RN', 'A', 'B', 'C', 'D', 'E', 'F', 'G'
];

const PRIZE_TIERS = [
  { rank: '1', label: '1st Prize', amount: 7000000, count: 1, series: false },
  { rank: 'C', label: 'Consolation Prize', amount: 8000, count: 7, series: true },
  { rank: '2', label: '2nd Prize', amount: 500000, count: 1, series: false },
  { rank: '3', label: '3rd Prize', amount: 100000, count: 2, series: true },
  { rank: '4', label: '4th Prize', amount: 5000, count: 4, series: false },
  { rank: '5', label: '5th Prize', amount: 2000, count: 4, series: false },
  { rank: '6', label: '6th Prize', amount: 1000, count: 5, series: false },
  { rank: '7', label: '7th Prize', amount: 500, count: 14, series: false },
  { rank: '8', label: '8th Prize', amount: 200, count: 20, series: false },
  { rank: '9', label: '9th Prize', amount: 100, count: 140, series: false },
];

// ─── SECURITY & CREDENTIAL ENCRYPTION ─────────────────────
const Security = {
  SECRET_SALT: 'KL_SEC_2026_@KeralaGov$Lottery_Secure#AuthKey99',
  DEFAULT_ADMIN_KEY: 'ENC$bnsddndxKRcCABNsAW5XQAAIDC4BUxZ+SkY3QEBLLHZXUVBBJAZzRx8EFBNLHAt5aWgX', // encrypted 'admin'
  DEFAULT_ADMIN_PASS: 'ENC$bnsddndxKRcCABNsAW5XQCAIDC4BUxB8XURGU1dLbXZXIFBAV1BkR0ZNeCRcCwsgIAAld2ZtABUFcg==', // encrypted 'Admin@2026'
  DEFAULT_OFFICER_KEY: 'ENC$bnsddndxKRcCABNsAW5XQA4KBy4ME1ZpXUZRVzFcbWEWRkdAQBAAUEZaIAkmTwtufm12cgc=', // encrypted 'officer'
  DEFAULT_OFFICER_PASS: 'ENC$bnsddndxKRcCABNsAW5XQC4KBy4ME1ZpW0RGVUBPemFXRkcxQBFzBlFaeUBKeBx5fjQ/GjVtFwIAE2gE', // encrypted 'Officer@2026'

  // Symmetric encryption for usernames and passwords
  encrypt(text) {
    if (!text || typeof text !== 'string') return '';
    try {
      const payload = JSON.stringify({ v: text, s: 'kl_v2' });
      const encoded = encodeURIComponent(payload);
      let out = '';
      for (let i = 0; i < encoded.length; i++) {
        const k = this.SECRET_SALT.charCodeAt(i % this.SECRET_SALT.length);
        const c = encoded.charCodeAt(i) ^ k;
        out += String.fromCharCode(c);
      }
      return 'ENC$' + btoa(out);
    } catch {
      return text;
    }
  },

  // Decryption back to plaintext
  decrypt(token) {
    if (!token || typeof token !== 'string') return '';
    if (!token.startsWith('ENC$')) return token; // Not encrypted, return plain
    try {
      const raw = atob(token.slice(4));
      let out = '';
      for (let i = 0; i < raw.length; i++) {
        const k = this.SECRET_SALT.charCodeAt(i % this.SECRET_SALT.length);
        const c = raw.charCodeAt(i) ^ k;
        out += String.fromCharCode(c);
      }
      const data = JSON.parse(decodeURIComponent(out));
      return data.v;
    } catch {
      return '';
    }
  },

  // Securely verify an entered password against a stored password
  verifyPassword(inputPass, storedPass) {
    if (!inputPass || !storedPass) return false;
    const decrypted = this.decrypt(storedPass);
    if (decrypted && decrypted === inputPass) return true;
    if (storedPass === inputPass) return true;
    return false;
  },

  // Find user by username (matches plain or encrypted usernames)
  findUser(enteredUsername, dbUsers) {
    if (!enteredUsername || !dbUsers) return null;
    const target = enteredUsername.trim().toLowerCase();
    for (const [key, val] of Object.entries(dbUsers)) {
      const rawKey = this.decrypt(key).toLowerCase();
      const rawUser = val.username ? this.decrypt(val.username).toLowerCase() : rawKey;
      if (key.toLowerCase() === target || rawKey === target || rawUser === target) {
        return {
          key: key,
          user: val,
          plainUsername: val.username ? this.decrypt(val.username) : (rawKey || key),
          plainPassword: this.decrypt(val.password)
        };
      }
    }
    return null;
  }
};

// ─── DATABASE ─────────────────────────────────────────────
const DB_KEY = 'kerala_lottery_db';

function loadDB() {
  try {
    let db = JSON.parse(localStorage.getItem(DB_KEY));
    if (db) db = migrateDB(db);
    return db || {};
  } catch {
    return {};
  }
}
function saveDB(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }
  try {
    const cs = (typeof window !== 'undefined' && window.CloudSync) ? window.CloudSync : (typeof CloudSync !== 'undefined' ? CloudSync : null);
    const isMobileApp = (typeof window !== 'undefined' && window.Android && typeof window.Android.isAndroidApp === 'function' && window.Android.isAndroidApp());
    // Never allow mobile client to push automatically from saveDB unless admin is explicitly logged in
    if (cs && typeof cs.isEnabled === 'function' && cs.isEnabled()) {
      if (!isMobileApp || (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'admin')) {
        cs.lastLocalEditTimestamp = Date.now();
        cs.pushToCloud(db);
      }
    }
  } catch (syncErr) {
    console.warn('CloudSync call in saveDB deferred:', syncErr);
  }
}

function notifyDataChanged() {
  try {
    DB = loadDB();
  } catch (e) {
    console.warn('loadDB error in notifyDataChanged:', e);
  }
  const safeRun = (fn, name) => {
    try {
      if (typeof fn === 'function') fn();
    } catch (err) {
      console.warn(`Render error in ${name || 'component'}:`, err);
    }
  };
  safeRun(renderDrawsTable, 'renderDrawsTable');
  safeRun(refreshDashboard, 'refreshDashboard');
  safeRun(renderResultCards, 'renderResultCards');
  safeRun(renderPublicResults, 'renderPublicResults');
  safeRun(renderRibbon, 'renderRibbon');
  safeRun(populatePublicFilters, 'populatePublicFilters');
  safeRun(populateEntrySelect, 'populateEntrySelect');
  safeRun(updateNotifBadge, 'updateNotifBadge');
}

window.addEventListener('storage', e => {
  if (!e.key || e.key === DB_KEY) {
    notifyDataChanged();
  }
});

const BASE_DRAW_NUMBERS = {
  'BT': 74,
  'SS': 540,
  'DL': 72,
  'KN': 643,
  'SK': 71,
  'KR': 770,
  'SM': 75
};

function getNextDrawNumber(lotteryId) {
  if (!lotteryId) return 'DRAW-101';
  const db = loadDB();
  let maxNum = BASE_DRAW_NUMBERS[lotteryId] || 70;

  Object.values(db.draws || {}).forEach(d => {
    if (d.lotteryId === lotteryId && d.drawNo) {
      const match = d.drawNo.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= maxNum) maxNum = num;
      }
    }
  });

  return `${lotteryId}-${maxNum + 1}`;
}

function migrateDB(db) {
  if (!db) return db;
  if (!db.draws) db.draws = {};
  if (!db.deletedDrawIds) db.deletedDrawIds = {};
  let changed = false;

  // Purge any draw recorded in tombstones (deletedDrawIds)
  Object.keys(db.deletedDrawIds).forEach(delId => {
    if (db.draws[delId]) {
      delete db.draws[delId];
      changed = true;
    }
  });

  const isDeleted = (id) => !!(db.deletedDrawIds && db.deletedDrawIds[id]);

  Object.values(db.draws).forEach(d => {
    if (d.lotteryId === 'WIN') { d.lotteryId = 'BT'; changed = true; }
    if (d.lotteryId === 'AK') { d.lotteryId = 'SM'; changed = true; }
    if (d.lotteryId === 'NR') { d.lotteryId = 'SK'; changed = true; }
    if (d.lotteryId === 'FF') { d.lotteryId = 'DL'; changed = true; }
  });

  // Upgrade initial sample draws ONCE to v2 schema without re-creating deleted draws
  if (!db._v2) {
    db._v2 = true;
    if (!isDeleted('DRW001') && db.draws['DRW001']) db.draws['DRW001'] = getOfficialBT74DrawData();
    if (!isDeleted('DRW002') && db.draws['DRW002']) db.draws['DRW002'] = getOfficialSS540DrawData();
    if (!isDeleted('DRW003') && db.draws['DRW003']) db.draws['DRW003'] = getOfficialDL72DrawData();
    changed = true;
  }

  // Upgrade to v5: auto-publish and seed official weekly draws up to today (only if not deleted)
  if (!db._v5_sync) {
    db._v5_sync = true;
    if (!isDeleted('DRW004') && (!db.draws['DRW004'] || !db.draws['DRW004'].prizes?.length)) db.draws['DRW004'] = getOfficialKN643DrawData();
    if (!isDeleted('DRW005') && (!db.draws['DRW005'] || !db.draws['DRW005'].prizes?.length)) db.draws['DRW005'] = getOfficialSK71DrawData();
    if (!isDeleted('DRW006') && (!db.draws['DRW006'] || !db.draws['DRW006'].prizes?.length)) db.draws['DRW006'] = getOfficialKR770DrawData();
    if (!isDeleted('DRW007') && (!db.draws['DRW007'] || !db.draws['DRW007'].prizes?.length)) db.draws['DRW007'] = getOfficialSM75DrawData();
    if (!isDeleted('DRW008') && !db.draws['DRW008']) db.draws['DRW008'] = getOfficialBT75DrawData();

    Object.values(db.draws).forEach(d => {
      if (d.status === 'draft' && d.prizes && d.prizes.length > 0) {
        d.status = 'published';
      }
    });
    changed = true;
  }

  // Upgrade & encrypt all credentials: no plaintext usernames or passwords in storage
  const hasUnencrypted = db.users && Object.values(db.users).some(u => !u.password?.startsWith('ENC$') || !u.username?.startsWith('ENC$'));
  if (!db._creds_enc_v3 || hasUnencrypted) {
    db._creds_enc_v3 = true;
    if (!db.users) db.users = {};

    const upgradedUsers = {};
    Object.entries(db.users).forEach(([key, user]) => {
      // If already encrypted, preserve directly
      if (key.startsWith('ENC$') && user.username?.startsWith('ENC$') && user.password?.startsWith('ENC$')) {
        upgradedUsers[key] = user;
        return;
      }

      const plainUser = user.username ? Security.decrypt(user.username) : Security.decrypt(key);
      let plainPass = Security.decrypt(user.password);
      if (plainUser === 'admin' && (!plainPass || plainPass === 'admin123')) plainPass = 'Admin@2026';
      if (plainUser === 'officer' && (!plainPass || plainPass === 'ker123')) plainPass = 'Officer@2026';

      const encKey = Security.encrypt(plainUser || key);
      const encPass = Security.encrypt(plainPass || user.password || 'Admin@2026');
      upgradedUsers[encKey] = {
        ...user,
        username: encKey,
        password: encPass
      };
    });

    if (!Security.findUser('admin', upgradedUsers)) {
      upgradedUsers[Security.DEFAULT_ADMIN_KEY] = {
        username: Security.DEFAULT_ADMIN_KEY,
        password: Security.DEFAULT_ADMIN_PASS,
        role: 'admin',
        name: 'Admin Officer'
      };
    }
    if (!Security.findUser('officer', upgradedUsers)) {
      upgradedUsers[Security.DEFAULT_OFFICER_KEY] = {
        username: Security.DEFAULT_OFFICER_KEY,
        password: Security.DEFAULT_OFFICER_PASS,
        role: 'officer',
        name: 'District Officer'
      };
    }

    db.users = upgradedUsers;
    changed = true;
  }

  if (changed) saveDB(db);
  return db;
}

function getOfficialBT74DrawData() {
  return {
    id: 'DRW001', drawNo: 'BT-74', lotteryId: 'BT',
    drawDate: '2026-10-05', publishDate: '2026-10-05', venue: 'GORKY BHAVAN, NEAR BAKERY JUNCTION, THIRUVANANTHAPURAM',
    status: 'published', publishedAt: '2026-10-05 16:34:58',
    prizes: [
      { rank: '1', label: '1st Prize', amount: 10000000, numbers: [{ series: 'BT', number: '886602', location: 'GURUVAYOOR' }] },
      {
        rank: 'C', label: 'Consolation Prize', amount: 5000, numbers: [
          { series: 'BN', number: '886602' }, { series: 'BO', number: '886602' }, { series: 'BP', number: '886602' },
          { series: 'BR', number: '886602' }, { series: 'BS', number: '886602' }, { series: 'BU', number: '886602' },
          { series: 'BV', number: '886602' }, { series: 'BW', number: '886602' }, { series: 'BX', number: '886602' },
          { series: 'BY', number: '886602' }, { series: 'BZ', number: '886602' }
        ]
      },
      { rank: '2', label: '2nd Prize', amount: 3000000, numbers: [{ series: 'BS', number: '774822', location: 'PALAKKAD' }] },
      { rank: '3', label: '3rd Prize', amount: 500000, numbers: [{ series: 'BN', number: '619978', location: 'KOLLAM' }] },
      { rank: '4', label: '4th Prize', amount: 5000, numbers: ['0101', '0575', '0653', '0820', '0971', '1032', '1419', '1978', '2238', '2310', '3784', '4147', '5276', '5302', '5333', '5589', '8252', '8385', '9154'].map(n => ({ series: 'ALL', number: n })) },
      { rank: '5', label: '5th Prize', amount: 2000, numbers: ['0143', '0873', '2490', '3284', '5997', '7720'].map(n => ({ series: 'ALL', number: n })) },
      { rank: '6', label: '6th Prize', amount: 1000, numbers: ['0328', '1664', '1783', '1972', '2019', '2055', '2064', '2545', '3296', '3963', '3995', '4504', '5043', '6379', '6389', '6707', '7298', '7526', '8135', '8306', '8987', '9024', '9050', '9769', '9987'].map(n => ({ series: 'ALL', number: n })) },
      { rank: '7', label: '7th Prize', amount: 500, numbers: ['0207', '0366', '0367', '0421', '0427', '0489', '0515', '0586', '0831', '0902', '0976', '1168', '1247', '1426', '1506', '1514', '1667', '1679', '1764', '1914'].map(n => ({ series: 'ALL', number: n })) },
      { rank: '8', label: '8th Prize', amount: 200, numbers: ['0012', '0145', '0289', '0356', '0478', '0512', '0634', '0789', '0823', '0945', '1056', '1178', '1289', '1312', '1434', '1556', '1678', '1789', '1812', '1934'].map(n => ({ series: 'ALL', number: n })) },
    ]
  };
}

function getOfficialSS540DrawData() {
  return {
    id: 'DRW002', drawNo: 'SS-540', lotteryId: 'SS',
    drawDate: '2026-10-06', publishDate: '2026-10-06', venue: 'Gorky Bhavan, Thiruvananthapuram',
    status: 'published', publishedAt: '2026-10-06 15:30:00',
    prizes: [
      { rank: '1', label: '1st Prize', amount: 8000000, numbers: [{ series: 'SS', number: '551234', location: 'KOZHIKODE' }] },
      { rank: 'C', label: 'Consolation Prize', amount: 8000, numbers: [{ series: 'SA', number: '551234' }, { series: 'SB', number: '551234' }, { series: 'SC', number: '551234' }, { series: 'SD', number: '551234' }] },
      { rank: '2', label: '2nd Prize', amount: 500000, numbers: [{ series: 'ALL', number: '440099', location: 'KANNUR' }] },
      { rank: '3', label: '3rd Prize', amount: 100000, numbers: [{ series: 'SA', number: '112233' }, { series: 'SB', number: '445566' }] },
    ]
  };
}

function getOfficialDL72DrawData() {
  return {
    id: 'DRW003', drawNo: 'DL-72', lotteryId: 'DL',
    drawDate: '2026-10-07', publishDate: '2026-10-07', venue: 'Civil Station, Ernakulam',
    status: 'published', publishedAt: '2026-10-07 16:00:00',
    prizes: [
      { rank: '1', label: '1st Prize', amount: 10000000, numbers: [{ series: 'DL', number: '789012', location: 'ERNAKULAM' }] },
      { rank: 'C', label: 'Consolation Prize', amount: 8000, numbers: [{ series: 'DA', number: '789012' }, { series: 'DB', number: '789012' }] },
      { rank: '2', label: '2nd Prize', amount: 500000, numbers: [{ series: 'ALL', number: '678901', location: 'KOTTAYAM' }] },
    ]
  };
}

function getOfficialKN643DrawData() {
  return {
    id: 'DRW004', drawNo: 'KN-643', lotteryId: 'KN',
    drawDate: '2026-10-08', publishDate: '2026-10-08', venue: 'Gorky Bhavan, Thiruvananthapuram',
    status: 'published', publishedAt: '2026-10-08 15:30:00',
    prizes: [
      { rank: '1', label: '1st Prize', amount: 8000000, numbers: [{ series: 'KN', number: '765432', location: 'THIRUVANANTHAPURAM' }] },
      { rank: 'C', label: 'Consolation Prize', amount: 8000, numbers: [{ series: 'KA', number: '765432' }, { series: 'KB', number: '765432' }, { series: 'KC', number: '765432' }] },
      { rank: '2', label: '2nd Prize', amount: 1000000, numbers: [{ series: 'ALL', number: '654321', location: 'ERNAKULAM' }] },
      { rank: '3', label: '3rd Prize', amount: 100000, numbers: [{ series: 'ALL', number: '543210' }, { series: 'ALL', number: '432109' }] },
    ]
  };
}

function getOfficialSK71DrawData() {
  return {
    id: 'DRW005', drawNo: 'SK-71', lotteryId: 'SK',
    drawDate: '2026-10-09', publishDate: '2026-10-09', venue: 'Gorky Bhavan, Thiruvananthapuram',
    status: 'published', publishedAt: '2026-10-09 15:30:00',
    prizes: [
      { rank: '1', label: '1st Prize', amount: 7000000, numbers: [{ series: 'SK', number: '654321', location: 'KOLLAM' }] },
      { rank: 'C', label: 'Consolation Prize', amount: 8000, numbers: [{ series: 'SA', number: '654321' }, { series: 'SB', number: '654321' }] },
      { rank: '2', label: '2nd Prize', amount: 1000000, numbers: [{ series: 'ALL', number: '321098', location: 'ALAPPUZHA' }] },
    ]
  };
}

function getOfficialKR770DrawData() {
  return {
    id: 'DRW006', drawNo: 'KR-770', lotteryId: 'KR',
    drawDate: '2026-10-10', publishDate: '2026-10-10', venue: 'Gorky Bhavan, Thiruvananthapuram',
    status: 'published', publishedAt: '2026-10-10 15:30:00',
    prizes: [
      { rank: '1', label: '1st Prize', amount: 8000000, numbers: [{ series: 'KR', number: '543210', location: 'THRISSUR' }] },
      { rank: 'C', label: 'Consolation Prize', amount: 8000, numbers: [{ series: 'KA', number: '543210' }, { series: 'KB', number: '543210' }] },
      { rank: '2', label: '2nd Prize', amount: 500000, numbers: [{ series: 'ALL', number: '210987', location: 'PALAKKAD' }] },
    ]
  };
}

function getOfficialSM75DrawData() {
  return {
    id: 'DRW007', drawNo: 'SM-75', lotteryId: 'SM',
    drawDate: '2026-10-11', publishDate: '2026-10-11', venue: 'Gorky Bhavan, Thiruvananthapuram',
    status: 'published', publishedAt: '2026-10-11 15:30:00',
    prizes: [
      { rank: '1', label: '1st Prize', amount: 10000000, numbers: [{ series: 'SM', number: '432109', location: 'MALAPPURAM' }] },
      { rank: 'C', label: 'Consolation Prize', amount: 8000, numbers: [{ series: 'SA', number: '432109' }, { series: 'SB', number: '432109' }] },
      { rank: '2', label: '2nd Prize', amount: 1000000, numbers: [{ series: 'ALL', number: '109876', location: 'KANNUR' }] },
    ]
  };
}

function getOfficialBT75DrawData() {
  return {
    id: 'DRW008', drawNo: 'BT-75', lotteryId: 'BT',
    drawDate: '2026-10-12', publishDate: '2026-10-12', venue: 'Gorky Bhavan, Thiruvananthapuram',
    status: 'published', publishedAt: '2026-10-12 15:00:00',
    prizes: [
      { rank: '1', label: '1st Prize', amount: 10000000, numbers: [{ series: 'BT', number: '321098', location: 'KOZHIKODE' }] },
      { rank: 'C', label: 'Consolation Prize', amount: 5000, numbers: [{ series: 'BA', number: '321098' }, { series: 'BB', number: '321098' }, { series: 'BC', number: '321098' }] },
      { rank: '2', label: '2nd Prize', amount: 3000000, numbers: [{ series: 'ALL', number: '987654', location: 'WAYANAD' }] },
      { rank: '3', label: '3rd Prize', amount: 500000, numbers: [{ series: 'ALL', number: '876543' }] }
    ]
  };
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function uid() { return Math.random().toString(36).substr(2, 8).toUpperCase(); }

function pastDate(days) {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
function futureDate(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function initDB() {
  let db = loadDB();
  if (db._init) return db;

  const deleted = (db && db.deletedDrawIds) ? db.deletedDrawIds : {};
  const isDeleted = (id) => !!deleted[id];

  const defaultDraws = {};
  if (!isDeleted('DRW001')) defaultDraws['DRW001'] = getOfficialBT74DrawData();
  if (!isDeleted('DRW002')) defaultDraws['DRW002'] = getOfficialSS540DrawData();
  if (!isDeleted('DRW003')) defaultDraws['DRW003'] = getOfficialDL72DrawData();
  if (!isDeleted('DRW004')) defaultDraws['DRW004'] = getOfficialKN643DrawData();
  if (!isDeleted('DRW005')) defaultDraws['DRW005'] = getOfficialSK71DrawData();
  if (!isDeleted('DRW006')) defaultDraws['DRW006'] = getOfficialKR770DrawData();
  if (!isDeleted('DRW007')) defaultDraws['DRW007'] = getOfficialSM75DrawData();
  if (!isDeleted('DRW008')) defaultDraws['DRW008'] = getOfficialBT75DrawData();

  db = {
    _init: true,
    _creds_enc_v3: true,
    cronTime: '04:00',
    users: {
      [Security.DEFAULT_ADMIN_KEY]: {
        username: Security.DEFAULT_ADMIN_KEY,
        password: Security.DEFAULT_ADMIN_PASS,
        role: 'admin',
        name: 'Admin Officer'
      },
      [Security.DEFAULT_OFFICER_KEY]: {
        username: Security.DEFAULT_OFFICER_KEY,
        password: Security.DEFAULT_OFFICER_PASS,
        role: 'officer',
        name: 'District Officer'
      },
    },
    draws: defaultDraws,
    deletedDrawIds: deleted,
    notifications: [
      { id: 'N001', title: 'Bhagyathara BT-74 Results Published', body: 'The results for Bhagyathara BT-74 (05 Oct 2026) are now live. 1st Prize: BT 886602 (GURUVAYOOR)', type: 'result', icon: '🏆', sentAt: '2026-10-05' },
      { id: 'N002', title: 'Sthree Sakthi SS-540 Results Live', body: 'Sthree Sakthi SS-540 (06 Oct 2026) draw results have been published.', type: 'result', icon: '🏆', sentAt: '2026-10-06' },
      { id: 'N003', title: 'Dhanalakshmi DL-72 Results Live', body: 'Dhanalakshmi DL-72 (07 Oct 2026) draw results are live.', type: 'result', icon: '🏆', sentAt: '2026-10-07' },
      { id: 'N004', title: 'Bhagyathara BT-75 Live Results Available', body: 'Bhagyathara BT-75 (12 Oct 2026) draw results are now live.', type: 'result', icon: '🏆', sentAt: '2026-10-12' },
    ],
  };
  saveDB(db);
  return db;
}

let DB = initDB();
let currentUser = null;
let csvData = [];

// ─── AUTH & SESSION PERSISTENCE ───────────────────────────
const AUTH_KEY = 'kerala_lottery_auth';

function saveSession(user, panel) {
  try {
    if (!user) {
      localStorage.removeItem(AUTH_KEY);
      return;
    }
    const sessionData = {
      username: user.username,
      name: user.name,
      role: user.role,
      activePanel: panel || user.activePanel || 'dashboard',
      savedAt: Date.now()
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(sessionData));
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

function clearSession() {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch (e) {
    console.error('Failed to clear session:', e);
  }
}

function getSavedSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const db = loadDB();
    if (session && session.username && db.users) {
      const match = Security.findUser(session.username, db.users);
      if (match) {
        return {
          ...match.user,
          username: match.plainUsername,
          activePanel: session.activePanel || 'dashboard'
        };
      }
    }
  } catch (e) {
    console.error('Failed to retrieve session:', e);
  }
  return null;
}

function updateAuthUI() {
  const pubBtn = document.getElementById('pub-admin-btn');
  if (pubBtn) pubBtn.style.display = 'none';
  const indivBtn = document.getElementById('btn-indiv-admin');
  if (indivBtn) indivBtn.style.display = 'none';
}

// ─── THEME MANAGEMENT ──────────────────────────────────────
const THEME_KEY = 'kerala_lottery_theme';

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  setTheme(savedTheme, false);

  ['theme-select-login', 'theme-select-admin', 'theme-select-public'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      sel.value = savedTheme;
      sel.addEventListener('change', e => setTheme(e.target.value, true));
    }
  });
}

function setTheme(themeName, showToast = true) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem(THEME_KEY, themeName);

  ['theme-select-login', 'theme-select-admin', 'theme-select-public'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) sel.value = themeName;
  });

  if (showToast) {
    const themeLabels = { dark: '🌙 Dark Sapphire', light: '☀️ Clean Light', emerald: '🌿 Emerald Gold' };
    toast(`Theme changed to ${themeLabels[themeName] || themeName}`, 'info', 2000);
  }
}

// ─── DYNAMIC LOTTERY TYPES MANAGEMENT (DAY/DATE-WISE ORDER) ──
const DAY_ORDER = {
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
  'Sunday': 7,
  'Bumper Draw': 8,
  'Special Draw': 9,
};

function getLotteryTypes(sortOrder = 'day', includeHidden = false) {
  const db = loadDB();
  let types = (db && db.customLotteryTypes && Array.isArray(db.customLotteryTypes) && db.customLotteryTypes.length > 0)
    ? db.customLotteryTypes
    : LOTTERY_TYPES;

  if (!includeHidden) {
    types = types.filter(t => !t.hidden);
  }

  return sortLotteryTypes(types, sortOrder);
}

function sortLotteryTypes(types, sortOrder = 'day') {
  return [...types].sort((a, b) => {
    if (sortOrder === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortOrder === 'prize') return (b.prize1 || 0) - (a.prize1 || 0);

    // Default: Weekly Day/Date-Wise Order (Monday -> Sunday)
    const dayA = DAY_ORDER[a.day] || 99;
    const dayB = DAY_ORDER[b.day] || 99;
    if (dayA !== dayB) return dayA - dayB;
    return (a.name || '').localeCompare(b.name || '');
  });
}

// ─── UTILITIES ────────────────────────────────────────────
function getLotteryById(id) {
  const allTypes = getLotteryTypes('day', true);
  if (!id) return allTypes[0] || LOTTERY_TYPES[0];
  const legacyMap = { 'WIN': 'BT', 'AK': 'SM', 'NR': 'SK', 'FF': 'DL' };
  const targetId = legacyMap[id] || id;
  return allTypes.find(l =>
    l.id === targetId ||
    l.code === targetId ||
    l.name.toLowerCase() === targetId.toLowerCase() ||
    (l.oldName && l.oldName.toLowerCase() === targetId.toLowerCase())
  ) || allTypes[0] || LOTTERY_TYPES[0];
}
function formatDate(d) {
  if (!d) return '—';
  const o = new Date(d);
  return o.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function formatCurrency(n) {
  if (n === null || n === undefined || n === '' || isNaN(Number(n))) return '₹0';
  const val = typeof n === 'string' ? parseFloat(n.replace(/,/g, '')) : Number(n);
  if (isNaN(val)) return '₹' + n;

  const hasDecimals = (val % 1 !== 0);

  if (val >= 10000000) {
    const cr = val / 10000000;
    const crFormatted = (cr % 1 === 0) ? cr : cr.toFixed(2).replace(/\.?0+$/, '');
    return '₹' + crFormatted + ' Cr';
  }
  if (val >= 100000) {
    const lk = val / 100000;
    const lkFormatted = (lk % 1 === 0) ? lk : lk.toFixed(2).replace(/\.?0+$/, '');
    return '₹' + lkFormatted + ' Lakh';
  }
  return '₹' + val.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}

function toast(msg, type = 'info', ms = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => { el.style.animation = 'slideOut .3s forwards'; setTimeout(() => el.remove(), 300); }, ms);
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  updateAuthUI();
  if (id === 'page-public') {
    renderPublicResults();
    renderRibbon();
  }
  if (window.GoogleAds && typeof window.GoogleAds.renderAllSlots === 'function') {
    setTimeout(() => window.GoogleAds.renderAllSlots(), 40);
  }
}
function openModal(id) {
  document.getElementById('modal-bg').classList.add('on');
  document.getElementById(id).classList.add('on');
}
function closeModal(id) {
  document.getElementById('modal-bg').classList.remove('on');
  document.getElementById(id).classList.remove('on');
}

function switchPanel(name) {
  const validPanels = ['dashboard', 'draws', 'entry', 'results', 'csv', 'notifications', 'lottery-types', 'settings', 'mobile-sync'];
  if (!validPanels.includes(name)) name = 'dashboard';

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'));
  const panel = document.getElementById(`panel-${name}`);
  if (panel) panel.classList.add('active');
  const nav = document.getElementById(`nav-${name}`);
  if (nav) nav.classList.add('active');

  const meta = {
    dashboard: ['Dashboard', 'Kerala Lottery Results System'],
    draws: ['Lottery Draws', 'Manage all lottery draws and schedules'],
    entry: ['Result Entry', 'Enter prize-wise winning numbers'],
    results: ['Published Results', 'View and manage published draw results'],
    csv: ['CSV Import', 'Bulk import lottery results via CSV'],
    notifications: ['Notifications', 'Push notification log'],
    'lottery-types': ['Lottery Schemes', 'Add or edit lottery schemes and schedules'],
    settings: ['Account Settings', 'Manage administrator credentials, profile & password'],
    'mobile-sync': ['Mobile App & Sync', 'Configure real-time Android APK sync, notice banner & live updates'],
  };
  const t = meta[name] || [name, ''];
  document.getElementById('panel-title').textContent = t[0];
  document.getElementById('panel-crumb').textContent = t[1];

  if (name === 'dashboard') refreshDashboard();
  if (name === 'draws') renderDrawsTable();
  if (name === 'entry') populateEntrySelect();
  if (name === 'results') { populateResultFilters(); renderResultCards(); }
  if (name === 'notifications') renderNotifications();
  if (name === 'lottery-types') renderLotteryTypesTable();
  if (name === 'settings') populateAccountSettingsPanel();
  if (name === 'mobile-sync') populateMobileSyncPanel();
  closeSidebar();

  if (currentUser) {
    currentUser.activePanel = name;
    saveSession(currentUser, name);
    try {
      history.replaceState(null, '', `#admin/${name}`);
    } catch (_) {}
  }
}

function showPublicPortal() {
  showPage('page-public');
  populatePublicFilters();
  renderPublicResults();
  renderRibbon();
  try {
    // Cleanly update URL to #public so refreshing never reopens a previously viewed draw!
    history.replaceState(null, '', window.location.pathname + '#public');
  } catch (_) {
    try {
      window.location.hash = 'public';
    } catch (_) {}
  }
  updateAuthUI();
}

// ─── LOGIN, THEME, QR & LOTTERY TYPES INIT ───────────────
initTheme();
initQRScanner();
initLotteryTypesManager();

document.getElementById('pw-toggle').addEventListener('click', () => {
  const i = document.getElementById('l-pass');
  i.type = i.type === 'password' ? 'text' : 'password';
});

document.querySelectorAll('.role-tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.role-tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const isPublic = t.dataset.role === 'public';
    document.getElementById('hint-public')?.classList.toggle('hidden', !isPublic);
    document.getElementById('login-btn').textContent = isPublic ? 'Check Results →' : 'Sign In →';
  });
});

document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault();
  const activeTab = document.querySelector('.role-tab.active');
  if (activeTab?.dataset.role === 'public') { showPublicPortal(); return; }

  DB = loadDB();
  const u = document.getElementById('l-user').value.trim();
  const p = document.getElementById('l-pass').value;

  if (!DB.users) {
    DB = initDB();
  }

  const matched = Security.findUser(u, DB.users);
  if (!matched) {
    toast('Invalid username or password', 'error');
    return;
  }

  const isValidPassword = Security.verifyPassword(p, matched.user.password);
  // Also accept legacy fallback if user types old demo password
  const isLegacyAdmin = (matched.plainUsername === 'admin' && p === 'admin123');
  const isLegacyOfficer = (matched.plainUsername === 'officer' && p === 'ker123');

  if (!isValidPassword && !isLegacyAdmin && !isLegacyOfficer) {
    toast('Invalid username or password', 'error');
    return;
  }

  // If logged in with legacy, auto re-encrypt password
  if (isLegacyAdmin || isLegacyOfficer) {
    matched.user.password = Security.encrypt(p);
    saveDB(DB);
  }

  currentUser = { ...matched.user, username: matched.plainUsername, activePanel: 'dashboard' };
  saveSession(currentUser, 'dashboard');
  try {
    history.replaceState(null, '', '#admin/dashboard');
  } catch (_) {}
  loadAdmin('dashboard');
  toast(`Welcome, ${matched.user.name || 'Officer'}!`, 'success');
});

document.getElementById('go-public-btn').addEventListener('click', () => {
  try {
    history.replaceState(null, '', '#public');
  } catch (_) {}
  showPublicPortal();
});

document.getElementById('pub-admin-btn')?.addEventListener('click', () => {
  if (currentUser) {
    loadAdmin(currentUser.activePanel || 'dashboard');
  } else {
    try {
      history.replaceState(null, '', window.location.pathname);
    } catch (_) {}
    showPage('page-login');
    document.getElementById('l-user').value = '';
    document.getElementById('l-pass').value = '';
    const uInput = document.getElementById('l-user');
    if (uInput) uInput.focus();
  }
});

// ─── ADMIN PANEL ──────────────────────────────────────────
function loadAdmin(targetPanel = 'dashboard') {
  if (!currentUser) {
    const session = getSavedSession();
    if (session) {
      currentUser = session;
    } else {
      showPage('page-login');
      return;
    }
  }
  showPage('page-admin');
  document.getElementById('admin-name').textContent = currentUser.name;
  document.getElementById('admin-avatar').textContent = currentUser.name[0];
  document.getElementById('admin-role').textContent = currentUser.role === 'admin' ? 'Administrator' : 'District Officer';
  document.getElementById('cron-time').value = DB.cronTime || '04:00';
  const panel = targetPanel || currentUser.activePanel || 'dashboard';
  switchPanel(panel);
  startCronSimulator();
  updateAuthUI();
}

// DASHBOARD
function refreshDashboard() {
  DB = loadDB();
  const draws = Object.values(DB.draws);
  const published = draws.filter(d => d.status === 'published');
  const drafts = draws.filter(d => d.status !== 'published');
  const prizeCount = draws.reduce((t, d) => t + (d.prizes ? d.prizes.reduce((s, p) => s + p.numbers.length, 0) : 0), 0);

  document.getElementById('s-draws').textContent = draws.length;
  document.getElementById('s-pub').textContent = published.length;
  document.getElementById('s-draft').textContent = drafts.length;
  document.getElementById('s-prizes').textContent = prizeCount;

  // Recent draws
  const rd = document.getElementById('recent-draws');
  if (rd) {
    const savedRdLayout = localStorage.getItem('kl_layout_recent_draws') || 'rows';
    if (savedRdLayout === 'cols') {
      rd.classList.add('view-cols');
      rd.classList.remove('view-rows');
    } else {
      rd.classList.add('view-rows');
      rd.classList.remove('view-cols');
    }
    rd.innerHTML = draws.sort((a, b) => (b.drawDate || '').localeCompare(a.drawDate || '')).slice(0, 6).map(d => {
      const lt = getLotteryById(d.lotteryId);
      return `<div class="draw-recent-item">
        <div class="dri-left">
          <span class="dri-name">${lt ? lt.name : d.lotteryId} — ${d.drawNo}</span>
          <span class="dri-sub">${formatDate(d.drawDate)} &bull; ${d.venue || '—'}</span>
        </div>
        <span class="pill ${d.status === 'published' ? 'pill-green' : 'pill-orange'}">${d.status}</span>
      </div>`;
    }).join('') || '<p style="color:var(--text2);font-size:13px;padding:8px 0">No draws yet</p>';
  }

  // Lottery schedule
  const sc = document.getElementById('lottery-schedule');
  if (sc) {
    const types = getLotteryTypes();
    sc.innerHTML = types.map(lt =>
      `<div class="schedule-item">
        <div>
          <div class="schedule-name">${lt.name}</div>
          <div class="schedule-day">${lt.day}</div>
        </div>
        <span class="schedule-code">${lt.code}</span>
      </div>`
    ).join('');
  }

  updateNotifBadge();
}

// DRAWS TABLE
function populateLotterySelect(selId, allOpt = '', includeHidden = false) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  const prev = sel.value;
  const types = getLotteryTypes('day', includeHidden);
  sel.innerHTML = (allOpt ? `<option value="">${allOpt}</option>` : '') +
    types.map(l => `<option value="${l.id}">${l.name} (${l.code})${l.hidden ? ' [Hidden]' : ''}</option>`).join('');
  sel.value = prev;
}

function renderDrawsTable() {
  DB = loadDB();
  populateLotterySelect('draw-type-filter', 'All Lotteries', true);
  const typeF = document.getElementById('draw-type-filter')?.value || '';
  const statusF = document.getElementById('draw-status-filter')?.value || '';
  const sortO = document.getElementById('draws-sort-order')?.value || 'desc';
  const tbody = document.getElementById('draws-tbody');
  if (!tbody) return;

  let draws = Object.values(DB.draws || {})
    .filter(d => (!typeF || d.lotteryId === typeF) && (!statusF || d.status === statusF))
    .sort((a, b) => {
      if (sortO === 'asc') return (a.drawDate || '').localeCompare(b.drawDate || '');
      return (b.drawDate || '').localeCompare(a.drawDate || '');
    });

  tbody.innerHTML = draws.map(d => {
    const lt = getLotteryById(d.lotteryId);
    const prizes = d.prizes ? d.prizes.reduce((s, p) => s + p.numbers.length, 0) : 0;
    return `<tr>
      <td><code class="mono" style="color:var(--gold-l)">${d.drawNo}</code></td>
      <td><b>${lt ? lt.name : d.lotteryId}</b></td>
      <td>${formatDate(d.drawDate)}</td>
      <td>${formatDate(d.publishDate)}</td>
      <td><span class="pill ${d.status === 'published' ? 'pill-green' : 'pill-orange'}">${d.status}</span></td>
      <td>${prizes} numbers</td>
      <td><div class="tact">
        <button class="abtn view" onclick="viewDraw('${d.id}')">View</button>
        <button class="abtn edit" onclick="editDraw('${d.id}')">Edit</button>
        ${d.status !== 'published' ? `<button class="abtn pub" onclick="publishDraw('${d.id}')">Publish</button>` : ''}
        <button class="abtn del" onclick="deleteDraw('${d.id}')">Del</button>
      </div></td>
    </tr>`;
  }).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text2);padding:32px">No draws found</td></tr>`;
}

document.getElementById('draw-type-filter')?.addEventListener('change', renderDrawsTable);
document.getElementById('draw-status-filter')?.addEventListener('change', renderDrawsTable);
document.getElementById('draws-sort-order')?.addEventListener('change', renderDrawsTable);

document.getElementById('add-draw-btn').addEventListener('click', () => {
  document.getElementById('draw-modal-title').textContent = 'New Draw';
  document.getElementById('draw-form').reset();
  document.getElementById('d-id').value = '';
  document.getElementById('d-date').value = todayStr();
  document.getElementById('d-publish').value = todayStr();
  const statusEl = document.getElementById('d-status');
  if (statusEl) statusEl.value = 'published';
  const delBtn = document.getElementById('btn-modal-delete-draw');
  if (delBtn) delBtn.style.display = 'none';
  populateLotterySelect('d-lottery');
  const selLot = document.getElementById('d-lottery').value;
  if (selLot) {
    document.getElementById('d-no').value = getNextDrawNumber(selLot);
  }
  openModal('modal-draw');
});

document.getElementById('d-lottery')?.addEventListener('change', e => {
  const lotId = e.target.value;
  const drawId = document.getElementById('d-id').value;
  if (lotId && !drawId) {
    document.getElementById('d-no').value = getNextDrawNumber(lotId);
  }
});

function editDraw(id) {
  DB = loadDB();
  const d = DB.draws[id];
  if (!d) return;
  document.getElementById('draw-modal-title').textContent = 'Edit Draw';
  document.getElementById('d-id').value = d.id;
  document.getElementById('d-no').value = d.drawNo;
  document.getElementById('d-date').value = d.drawDate;
  document.getElementById('d-publish').value = d.publishDate;
  document.getElementById('d-venue').value = d.venue || '';
  const statusEl = document.getElementById('d-status');
  if (statusEl) statusEl.value = d.status || 'published';
  populateLotterySelect('d-lottery', '', true);
  document.getElementById('d-lottery').value = d.lotteryId;

  const delBtn = document.getElementById('btn-modal-delete-draw');
  if (delBtn) {
    delBtn.style.display = 'inline-flex';
    delBtn.onclick = () => deleteDraw(id);
  }

  openModal('modal-draw');
}

function deleteDraw(id) {
  if (!id) return;
  if (!confirm('Are you sure you want to delete this draw and all its prize numbers?')) return;
  DB = loadDB();
  if (!DB.draws || !DB.draws[id]) {
    toast('Draw not found or already deleted', 'warning');
    return;
  }
  const drawNo = DB.draws[id].drawNo || id;

  // 1. Delete from in-memory draws
  delete DB.draws[id];

  // 2. Track permanently in tombstones (deletedDrawIds) so mobile app removes it immediately
  if (!DB.deletedDrawIds) DB.deletedDrawIds = {};
  DB.deletedDrawIds[id] = Date.now();

  // 3. Save to localStorage
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
  } catch (e) {}

  // 4. Delete directly in Firebase node & push updated database to Cloud
  const cs = (typeof window !== 'undefined' && window.CloudSync) ? window.CloudSync : (typeof CloudSync !== 'undefined' ? CloudSync : null);
  if (cs && typeof cs.isEnabled === 'function' && cs.isEnabled()) {
    cs.lastLocalEditTimestamp = Date.now();
    if (typeof cs.deleteDrawFromCloud === 'function') {
      cs.deleteDrawFromCloud(id);
    }
    cs.pushToCloud(DB);
  }

  closeModal('modal-draw');
  toast(`🗑 Draw ${drawNo} deleted & synced with Firebase and Mobile App!`, 'info');
  notifyDataChanged();
}

function publishDraw(id) {
  DB = loadDB();
  const d = DB.draws[id];
  if (!d) return;
  const hasPrizes = d.prizes && d.prizes.length > 0;
  if (!hasPrizes) {
    const proceed = confirm(`Draw ${d.drawNo} has no prize numbers entered yet.\n\nDo you want to publish it now as an upcoming / live draw? It will show on the app with 'Pending Draw Results' until prize numbers are entered.`);
    if (!proceed) return;
  }
  DB.draws[id].status = 'published';
  DB.draws[id].publishedAt = todayStr();
  saveDB(DB);
  toast(`${d.drawNo} published live to app!`, 'success');
  const lt = getLotteryById(d.lotteryId);
  addNotification(`${lt ? lt.name : ''} ${d.drawNo} Results Live`, `Draw results for ${d.drawNo} on ${formatDate(d.drawDate)} are now live on the app. Check your tickets!`);
  notifyDataChanged();
}

document.getElementById('draw-form').addEventListener('submit', e => {
  e.preventDefault();
  DB = loadDB();
  const id = document.getElementById('d-id').value || ('DRW' + uid());
  const drawNo = document.getElementById('d-no').value.trim().toUpperCase();
  const lotId = document.getElementById('d-lottery').value;
  const date = document.getElementById('d-date').value;
  const pub = document.getElementById('d-publish').value;
  const venue = document.getElementById('d-venue').value.trim();
  const status = document.getElementById('d-status')?.value || 'published';
  const existing = DB.draws[id];
  DB.draws[id] = {
    id, drawNo, lotteryId: lotId, drawDate: date, publishDate: pub, venue,
    status: status,
    publishedAt: status === 'published' ? (existing?.publishedAt || todayStr()) : null,
    prizes: existing ? existing.prizes : [],
  };
  saveDB(DB);
  closeModal('modal-draw');
  toast(status === 'published' ? `Draw ${drawNo} published live to app!` : `Draw ${drawNo} saved as draft!`, 'success');
  const lt = getLotteryById(lotId);
  if (status === 'published' && (!existing || existing.status !== 'published')) {
    addNotification(`${lt ? lt.name : ''} ${drawNo} Live on App`, `New lottery draw ${drawNo} (${formatDate(date)}) is now published live on the app.`);
  }
  notifyDataChanged();
});

// ─── RESULT VIEW ──────────────────────────────────────────
function viewDraw(id) {
  DB = loadDB();
  const d = DB.draws[id];
  if (!d) return;
  const lt = getLotteryById(d.lotteryId);

  const prizeHTML = d.prizes && d.prizes.length > 0
    ? d.prizes.map(p => {
      const rankClass = p.rank === '1' ? 'pr-1st' : p.rank === '2' ? 'pr-2nd' : p.rank === '3' ? 'pr-3rd' : 'pr-other';
      const numsHTML = p.numbers.map(n => {
        const seriesStr = (n.series && n.series !== 'ALL') ? `${n.series}-` : '';
        const locStr = n.location ? ` <span class="loc-tag">(${n.location})</span>` : '';
        return `<span class="rc-num ${p.rank === 'C' ? 'with-series' : ''}" data-series="${n.series}">${seriesStr}${n.number}${locStr}</span>`;
      }).join('');
      return `<div class="rc-prize-block">
          <div class="rc-prize-title">
            <span class="prize-rank-badge ${rankClass}">${p.rank}</span>
            <span class="rc-prize-name">${p.label}</span>
            <span class="rc-prize-amt">${formatCurrency(p.amount)}</span>
          </div>
          <div class="rc-numbers">${numsHTML}</div>
        </div>`;
    }).join('')
    : '<p style="color:var(--text2);text-align:center;padding:24px 0">No prize numbers entered yet</p>';

  document.getElementById('result-view-content').innerHTML = `
    <div class="rc-wrap" id="printable-result">
      <div class="rc-top rc-top-border">
        <div>
          <div class="rc-lottery">${lt ? lt.name : d.lotteryId}</div>
          <div class="rc-draw-info">Draw No: <b>${d.drawNo}</b></div>
          <div class="rc-draw-info">Venue: ${d.venue || 'Kerala'}</div>
        </div>
        <div class="rc-date-col">
          <div class="rc-date-label">Draw Date</div>
          <div class="rc-date-val">${formatDate(d.drawDate)}</div>
          <div class="rc-venue"><span class="pill ${d.status === 'published' ? 'pill-green' : 'pill-orange'}">${d.status}</span></div>
        </div>
      </div>
      <div class="rc-prizes-section" style="padding-top:16px">${prizeHTML}</div>
      <div class="rc-footer">
        <span>Department of State Lotteries &mdash; Government of Kerala</span>
        <span>Published: ${d.publishedAt || formatDate(d.drawDate)}</span>
      </div>
    </div>`;
  openModal('modal-result-view');
}

document.getElementById('print-result-btn').addEventListener('click', () => window.print());
document.getElementById('pdf-result-btn').addEventListener('click', () => {
  toast('Opening print dialog — Save as PDF', 'info');
  setTimeout(() => window.print(), 500);
});

// ─── INDIVIDUAL LOTTERY RESULT PAGE ───────────────────────
function showIndividualDraw(id) {
  DB = loadDB();
  const d = DB.draws[id];
  if (!d) { toast('Draw results not found', 'warning'); return; }
  const lt = getLotteryById(d.lotteryId);

  const p1 = d.prizes ? d.prizes.find(p => p.rank === '1') : null;
  const p1Ticket = p1 && p1.numbers && p1.numbers[0] ? p1.numbers[0] : null;
  const p1Amt = p1 ? formatCurrency(p1.amount) : (lt ? formatCurrency(lt.prize1) : '₹75,00,000');
  const pCons = d.prizes ? d.prizes.find(p => p.rank === 'C') : null;
  const p2 = d.prizes ? d.prizes.find(p => p.rank === '2') : null;
  const p3 = d.prizes ? d.prizes.find(p => p.rank === '3') : null;
  const otherPrizes = d.prizes ? d.prizes.filter(p => !['1', 'C', '2', '3'].includes(p.rank)) : [];

  // Update topbar titles
  const titleEl = document.getElementById('indiv-top-title');
  if (titleEl) titleEl.textContent = `${lt ? lt.name : d.lotteryId} (${d.drawNo})`;
  const subEl = document.getElementById('indiv-top-sub');
  if (subEl) subEl.textContent = `Official Gazette Result • ${formatDate(d.drawDate)}`;

  // Consolation tickets HTML
  const consolHTML = pCons && pCons.numbers.length > 0 ? `
    <div class="indiv-sec-card" data-prize-amt="${pCons.amount}">
      <div class="indiv-sec-hdr">
        <div class="indiv-sec-title"><span>🏅</span> Consolation Prize: <b style="color:var(--gold-l)">${formatCurrency(pCons.amount)}</b></div>
        <span style="font-size:12px;color:var(--text2)">${pCons.numbers.length} Winning Series</span>
      </div>
      <div class="indiv-consol-grid">
        ${pCons.numbers.map(n => `
          <div class="indiv-consol-item indiv-num-item" data-num="${n.number}" data-digits="${String(n.number).length}" data-series="${n.series || 'ALL'}" data-prize="Consolation Prize">
            <span class="indiv-consol-ser">${n.series && n.series !== 'ALL' ? n.series : 'ALL'}</span>
            <span class="indiv-consol-num mono">${n.number}</span>
            ${n.location ? `<span class="loc-tag">(${n.location})</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>` : '';

  // 2nd Prize HTML
  const p2HTML = p2 && p2.numbers.length > 0 ? `
    <div class="indiv-sec-card" data-prize-amt="${p2.amount}">
      <div class="indiv-sec-hdr">
        <div class="indiv-sec-title"><span>🥈</span> 2nd Prize: <b style="color:var(--gold-l)">${formatCurrency(p2.amount)}</b></div>
        <span style="font-size:12px;color:var(--text2)">${p2.numbers.length} Ticket${p2.numbers.length > 1 ? 's' : ''}</span>
      </div>
      <div class="indiv-consol-grid">
        ${p2.numbers.map(n => `
          <div class="indiv-consol-item indiv-num-item" data-num="${n.number}" data-digits="${String(n.number).length}" data-series="${n.series || 'ALL'}" data-prize="2nd Prize" style="border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.05)">
            <span class="indiv-consol-ser" style="background:var(--green);color:#fff">${n.series && n.series !== 'ALL' ? n.series : 'ALL'}</span>
            <span class="indiv-consol-num mono" style="font-size:16px">${n.number}</span>
            ${n.location ? `<span class="loc-tag" style="background:rgba(16,185,129,.2);color:var(--green-l)">(${n.location})</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>` : '';

  // 3rd Prize HTML
  const p3HTML = p3 && p3.numbers.length > 0 ? `
    <div class="indiv-sec-card" data-prize-amt="${p3.amount}">
      <div class="indiv-sec-hdr">
        <div class="indiv-sec-title"><span>🥉</span> 3rd Prize: <b style="color:var(--gold-l)">${formatCurrency(p3.amount)}</b></div>
        <span style="font-size:12px;color:var(--text2)">${p3.numbers.length} Ticket${p3.numbers.length > 1 ? 's' : ''}</span>
      </div>
      <div class="indiv-consol-grid">
        ${p3.numbers.map(n => `
          <div class="indiv-consol-item indiv-num-item" data-num="${n.number}" data-digits="${String(n.number).length}" data-series="${n.series || 'ALL'}" data-prize="3rd Prize">
            <span class="indiv-consol-ser">${n.series && n.series !== 'ALL' ? n.series : 'ALL'}</span>
            <span class="indiv-consol-num mono">${n.number}</span>
            ${n.location ? `<span class="loc-tag">(${n.location})</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>` : '';

  // Other prizes (4th - 8th) HTML
  const otherHTML = otherPrizes.map(p => `
    <div class="indiv-sec-card" data-prize-amt="${p.amount}">
      <div class="indiv-sec-hdr">
        <div class="indiv-sec-title"><span>🎁</span> ${p.label}: <b style="color:var(--gold-l)">${formatCurrency(p.amount)}</b></div>
        <span style="font-size:12px;color:var(--text2)">${p.numbers.length} Winning Numbers</span>
      </div>
      <div class="indiv-nums-grid">
        ${p.numbers.map(n => `<span class="indiv-num-box indiv-num-item" data-num="${n.number}" data-digits="${String(n.number).length}" data-prize="${p.label}">${n.number}</span>`).join('')}
      </div>
    </div>
  `).join('');

  const content = document.getElementById('indiv-result-content');
  if (!content) return;

  content.innerHTML = `
    <div class="indiv-sheet" id="printable-indiv-sheet">
      <div class="indiv-gazette-head">
        <div class="indiv-gov-badge">🏛️ Government of Kerala • Directorate of State Lotteries</div>
        <h1 class="indiv-title">${lt ? lt.name.toUpperCase() : d.lotteryId} LOTTERY RESULT</h1>
        <div class="indiv-sub">Official Gazette Publication • Prize Winning Numbers List</div>
        <div class="indiv-meta-grid">
          <div class="indiv-meta-item">
            <span class="indiv-meta-label">Draw Number</span>
            <span class="indiv-meta-val" style="color:var(--gold-l)">${d.drawNo}</span>
          </div>
          <div class="indiv-meta-item">
            <span class="indiv-meta-label">Draw Date</span>
            <span class="indiv-meta-val">${formatDate(d.drawDate)}</span>
          </div>
          <div class="indiv-meta-item">
            <span class="indiv-meta-label">Venue / Place</span>
            <span class="indiv-meta-val">${d.venue || 'Gorky Bhavan, Near Gandhari Amman Kovil, Thiruvananthapuram'}</span>
          </div>
          <div class="indiv-meta-item">
            <span class="indiv-meta-label">Publication Status</span>
            <span class="indiv-meta-val" style="color:var(--green-l)">✓ ${d.status.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <!-- Quick Number Live Finder -->
      <div class="indiv-toolbar">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-weight:700;font-size:13px;color:var(--gold-l)">🔍 Fast Number Finder:</span>
          <input type="text" id="indiv-num-search" class="indiv-search-input mono" placeholder="Enter 6-digit ticket, 4-digit number, or decimal..." maxlength="15"/>
        </div>
        <span id="indiv-match-counter" style="font-size:13px;font-weight:600"></span>
      </div>

      <!-- 1st Prize Showcase -->
      <div class="indiv-1st-card" data-prize-amt="${p1 ? p1.amount : ''}">
        <div class="indiv-1st-badge">
          <span>🏆 OFFICIAL 1ST PRIZE WINNER</span>
          <span class="indiv-1st-amt">${p1Amt}</span>
        </div>
        <div class="indiv-1st-ticket-wrap indiv-num-item" data-num="${p1Ticket ? p1Ticket.number : ''}" data-digits="${p1Ticket ? String(p1Ticket.number).length : 6}" data-series="${p1Ticket ? p1Ticket.series : ''}" data-prize="1st Prize">
          ${p1Ticket ? `
            <span class="indiv-1st-series">${p1Ticket.series && p1Ticket.series !== 'ALL' ? p1Ticket.series : ''}</span>
            <span class="indiv-1st-no mono">${p1Ticket.number}</span>
            ${p1Ticket.location ? `<span class="indiv-1st-loc">📍 Agent / Location: ${p1Ticket.location}</span>` : ''}
          ` : '<span style="color:var(--text2);font-weight:700">1st Prize details pending</span>'}
        </div>
      </div>

      <!-- Consolation Prize -->
      ${consolHTML}

      <!-- 2nd Prize -->
      ${p2HTML}

      <!-- 3rd Prize -->
      ${p3HTML}

      <!-- 4th - 8th Prizes -->
      ${otherHTML}

      <!-- Statutory Rules & Signatures -->
      <div class="indiv-statutory">
        <p><b>Statutory Notice:</b> The prize winners are advised to verify the winning numbers with the results published in the Kerala Government Gazette and surrender the winning tickets within 30 days from the date of draw.</p>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;padding-top:16px;border-top:1px dashed var(--border);flex-wrap:wrap;gap:16px;text-align:left">
          <div>
            <b>Directorate of State Lotteries</b><br/>
            Vikas Bhavan, Thiruvananthapuram, Kerala - 695033<br/>
            Phone: 0471-2305230 | www.keralalotteries.com
          </div>
          <div style="text-align:right">
            <b>Joint Director / Director</b><br/>
            Directorate of State Lotteries<br/>
            <small style="color:var(--text3)">Government of Kerala</small>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach search listener - strictly 6-digit, 4-digit, and decimal values
  const searchInp = document.getElementById('indiv-num-search');
  const counter = document.getElementById('indiv-match-counter');
  if (searchInp) {
    searchInp.addEventListener('input', (e) => {
      const rawQ = e.target.value.trim();
      const allItems = content.querySelectorAll('.indiv-num-item, .indiv-num-box');
      const allCards = content.querySelectorAll('.indiv-sec-card, .indiv-1st-card');

      // Clear previous matches
      allItems.forEach(el => el.classList.remove('matched'));
      allCards.forEach(el => el.classList.remove('card-matched'));

      if (!rawQ) {
        if (counter) counter.textContent = '';
        return;
      }

      // Check decimal prize amount search (e.g. 5000.00, 1000.50, 500.50, 7500000)
      let decVal = null;
      if (rawQ.includes('.')) {
        const parsed = parseFloat(rawQ);
        if (!isNaN(parsed)) decVal = parsed;
      }

      // Check if user entered prize amount with decimals or exact amount search
      if (decVal !== null) {
        let matchedCards = 0;
        let firstCard = null;
        allCards.forEach(card => {
          const cardAmt = parseFloat(card.getAttribute('data-prize-amt') || '0');
          if (cardAmt && Math.abs(cardAmt - decVal) < 0.001) {
            card.classList.add('card-matched');
            matchedCards++;
            if (!firstCard) firstCard = card;
          }
        });
        if (matchedCards > 0) {
          if (counter) {
            counter.textContent = `💰 Matched Prize Tier: ${formatCurrency(decVal)} (${matchedCards} section${matchedCards > 1 ? 's' : ''})`;
            counter.style.color = 'var(--gold-l)';
          }
          if (firstCard) firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }

      // Ticket number search: Handle decimal representations like 886602.00 or 0101.00
      let cleanQ = rawQ;
      if (cleanQ.includes('.')) {
        cleanQ = cleanQ.split('.')[0];
      }
      cleanQ = cleanQ.replace(/\D/g, '');

      // Rule: Winning number find six digit and four digit only!
      if (cleanQ.length < 4) {
        if (counter) {
          counter.textContent = `⌨️ Enter 4 or 6 digits to find winning numbers (${cleanQ.length}/4 digits)`;
          counter.style.color = 'var(--text3)';
        }
        return;
      }

      if (cleanQ.length === 5 || cleanQ.length > 6) {
        if (counter) {
          counter.textContent = `⚠️ Kerala winning numbers are 6-digit or 4-digit only (${cleanQ.length} entered)`;
          counter.style.color = '#FC8181';
        }
        return;
      }

      // Now cleanQ is exactly 4 digits or exactly 6 digits!
      let matches = 0;
      let firstEl = null;

      allItems.forEach(item => {
        const itemNum = (item.getAttribute('data-num') || item.textContent).trim();
        const digits = parseInt(item.getAttribute('data-digits') || itemNum.length, 10);
        let isMatch = false;

        if (cleanQ.length === 4) {
          // 4-digit query: matches exact 4-digit winning numbers or 6-digit tickets ending in these 4 digits
          if (digits === 4 && itemNum === cleanQ) {
            isMatch = true;
          } else if (digits === 6 && itemNum.endsWith(cleanQ)) {
            isMatch = true;
          }
        } else if (cleanQ.length === 6) {
          // 6-digit query: matches exact 6-digit winning numbers or 4-digit prizes matching last 4 digits
          if (digits === 6 && itemNum === cleanQ) {
            isMatch = true;
          } else if (digits === 4 && cleanQ.endsWith(itemNum)) {
            isMatch = true;
          }
        }

        if (isMatch) {
          item.classList.add('matched');
          matches++;
          if (!firstEl) firstEl = item;
        }
      });

      if (counter) {
        if (matches > 0) {
          const typeLabel = cleanQ.length === 6 ? '6-digit ticket' : '4-digit winning number';
          counter.textContent = `🎉 Found ${matches} match${matches > 1 ? 'es' : ''} for ${typeLabel} "${cleanQ}"`;
          counter.style.color = 'var(--green-l)';
        } else {
          counter.textContent = `❌ No winning matches found for "${cleanQ}" in this draw`;
          counter.style.color = '#FC8181';
        }
      }

      if (firstEl) firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  showPage('page-individual-result');
  window.location.hash = 'draw/' + id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Navigation and Action Handlers for Individual Result Page
document.getElementById('btn-back-to-public')?.addEventListener('click', () => {
  // If the user arrived here from within the application, navigate back in history
  if (window.history.length > 1 && window.location.hash.startsWith('#draw/')) {
    window.history.back();
    // Safety fallback in case history.back() does not leave #draw/ (e.g. direct link or fresh tab)
    setTimeout(() => {
      if (window.location.hash.startsWith('#draw/')) {
        try {
          history.replaceState(null, '', window.location.pathname + '#public');
        } catch (_) {
          window.location.hash = 'public';
        }
        showPublicPortal();
      }
    }, 150);
  } else {
    try {
      history.replaceState(null, '', window.location.pathname + '#public');
    } catch (_) {
      window.location.hash = 'public';
    }
    showPublicPortal();
  }
});

document.getElementById('btn-indiv-home-brand')?.addEventListener('click', () => {
  document.getElementById('btn-back-to-public')?.click();
});

document.getElementById('btn-indiv-admin')?.addEventListener('click', () => {
  if (currentUser) {
    loadAdmin(currentUser.activePanel || 'dashboard');
  } else {
    try {
      history.replaceState(null, '', window.location.pathname);
    } catch (_) {}
    showPage('page-login');
  }
});

document.getElementById('btn-print-indiv')?.addEventListener('click', () => window.print());

document.getElementById('btn-pdf-indiv')?.addEventListener('click', () => {
  toast('Opening print dialog — Select "Save as PDF"', 'info');
  setTimeout(() => window.print(), 500);
});

document.getElementById('btn-share-indiv')?.addEventListener('click', () => {
  const url = window.location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      toast('🔗 Shareable result link copied to clipboard!', 'success');
    });
  } else {
    prompt('Copy this link to share:', url);
  }
});

document.getElementById('theme-select-indiv')?.addEventListener('change', e => {
  setTheme(e.target.value);
});

// URL Routing Support & Session Restoration
function handleAppRouting() {
  const hash = window.location.hash;
  const session = getSavedSession();
  if (session) {
    currentUser = session;
  }

  // 1. Direct link to individual draw result (#draw/...)
  if (hash.startsWith('#draw/')) {
    const drawId = hash.replace('#draw/', '').trim();
    if (drawId) {
      showIndividualDraw(drawId);
      updateAuthUI();
      return;
    }
  }

  // 2. Admin routes (#admin, #admin/...)
  if (hash === '#admin' || hash.startsWith('#admin/')) {
    if (currentUser) {
      let targetPanel = currentUser.activePanel || 'dashboard';
      if (hash.startsWith('#admin/')) {
        const panelFromHash = hash.replace('#admin/', '').trim();
        if (panelFromHash) targetPanel = panelFromHash;
      }
      loadAdmin(targetPanel);
    } else {
      showPage('page-login');
    }
    updateAuthUI();
    return;
  }

  // 3. Login routes (#login, #signin)
  if (hash === '#login' || hash === '#signin') {
    if (currentUser) {
      loadAdmin(currentUser.activePanel || 'dashboard');
    } else {
      showPage('page-login');
    }
    updateAuthUI();
    return;
  }

  // 4. DEFAULT FOR ALL VISITORS: Always show public portal!
  showPublicPortal();
  updateAuthUI();
}

window.addEventListener('hashchange', handleAppRouting);

// ─── RESULT ENTRY ─────────────────────────────────────────
function populateEntrySelect() {
  DB = loadDB();
  const sel = document.getElementById('entry-draw-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select Draw</option>' +
    Object.values(DB.draws || {})
      .sort((a, b) => (b.drawDate || '').localeCompare(a.drawDate || ''))
      .map(d => {
        const lt = getLotteryById(d.lotteryId);
        return `<option value="${d.id}">${d.drawNo} — ${lt ? lt.name : ''} (${formatDate(d.drawDate)}) [${d.status}]</option>`;
      }).join('');
}

document.getElementById('load-entry-btn').addEventListener('click', () => {
  DB = loadDB();
  const drawId = document.getElementById('entry-draw-select').value;
  if (!drawId) { toast('Select a draw first', 'warning'); return; }
  const d = DB.draws[drawId];
  if (!d) return;
  const lt = getLotteryById(d.lotteryId);

  // Get prize 1 amount for this lottery type
  const prize1Amt = lt ? lt.prize1 : 7500000;

  const area = document.getElementById('prize-entry-area');
  area.innerHTML = PRIZE_TIERS.map(tier => {
    const existing = d.prizes ? d.prizes.find(p => p.rank === tier.rank) : null;
    const amt = existing ? existing.amount : (tier.rank === '1' ? prize1Amt : tier.amount);
    const rankClass = tier.rank === '1' ? 'pr-1st' : tier.rank === '2' ? 'pr-2nd' : tier.rank === '3' ? 'pr-3rd' : 'pr-other';

    // Build number rows
    const numRowsHTML = existing && existing.numbers.length > 0
      ? existing.numbers.map((n, i) => buildNumberRow(tier.rank, n.series, n.number, n.location || '', i > 0)).join('')
      : buildNumberRow(tier.rank, '', '', '', false);

    return `<div class="prize-section" data-rank="${tier.rank}">
      <div class="prize-section-header">
        <div class="prize-rank-badge ${rankClass}">${tier.rank}</div>
        <div style="flex:1">
          <div class="prize-label" style="font-weight:700;font-size:15px">${tier.label}</div>
          <div style="font-size:11px;color:var(--text2)">Edit Prize Amount &amp; Winning Numbers</div>
        </div>
        <div class="fgroup" style="display:flex;align-items:center;gap:8px;margin-bottom:0">
          <label style="font-size:12px;color:var(--text2);font-weight:600;white-space:nowrap">Prize ₹:</label>
          <input type="number" step="any" class="finput sm prize-amt-input mono" data-rank="${tier.rank}" value="${amt}" placeholder="e.g. 7500000" style="width:140px;font-weight:700;color:var(--gold-l)"/>
        </div>
      </div>
      <div class="prize-numbers-area" id="nums-${tier.rank}">${numRowsHTML}</div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button type="button" class="btn btn-sm btn-ghost" onclick="addNumberRow('${tier.rank}')">+ Add Single Number</button>
        <button type="button" class="btn btn-sm btn-outline" onclick="bulkPasteNumbers('${tier.rank}')">⚡ Bulk Paste Rank ${tier.rank} Numbers</button>
      </div>
    </div>`;
  }).join('');

  document.getElementById('entry-actions').style.display = 'flex';
  document.getElementById('entry-actions').dataset.drawId = drawId;
  const topActions = document.getElementById('entry-actions-top');
  if (topActions) topActions.style.display = 'flex';
});

function openEntryForDraw(drawId) {
  switchPanel('entry');
  const sel = document.getElementById('entry-draw-select');
  if (sel) {
    sel.value = drawId;
    document.getElementById('load-entry-btn')?.click();
  }
}

document.getElementById('open-bulk-paste-btn')?.addEventListener('click', () => {
  const drawId = document.getElementById('entry-draw-select').value;
  if (!drawId) { toast('Please select and load a draw first', 'warning'); return; }
  document.getElementById('bulk-paste-text').value = '';
  openModal('modal-bulk-paste');
});

document.getElementById('btn-apply-bulk-paste')?.addEventListener('click', () => {
  const text = document.getElementById('bulk-paste-text').value;
  parseAndApplyBulkResultText(text);
});

document.getElementById('btn-apply-box-paste')?.addEventListener('click', () => {
  applySeriesAndNumbersBox();
});

function applySeriesAndNumbersBox() {
  const drawId = document.getElementById('entry-actions')?.dataset?.drawId || document.getElementById('entry-draw-select')?.value;
  if (!drawId) {
    toast('Please select and load a draw in Result Entry first', 'warning');
    return;
  }

  const rank = document.getElementById('bulk-target-rank')?.value || '1';
  const rawSeries = document.getElementById('bulk-series-input')?.value.trim() || '';
  const rawNumbers = document.getElementById('bulk-numbers-input')?.value.trim() || '';

  if (!rawNumbers) {
    toast('Please enter winning ticket numbers in the Numbers Box', 'warning');
    return;
  }

  // Parse series list
  const seriesList = rawSeries
    ? rawSeries.split(/[\s,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
    : [];

  // Parse numbers tokens
  const numTokens = rawNumbers.split(/[\s,;\n]+/).map(s => s.trim()).filter(Boolean);
  if (numTokens.length === 0) {
    toast('No valid ticket numbers found in Numbers Box', 'warning');
    return;
  }

  const container = document.getElementById(`nums-${rank}`);
  if (!container) {
    toast(`Rank ${rank} section not found. Make sure draw is loaded.`, 'warning');
    return;
  }

  // Clear container if it has only 1 empty row
  const existingRows = container.querySelectorAll('.number-row');
  if (existingRows.length === 1 && !existingRows[0].querySelector('.num-input')?.value) {
    container.innerHTML = '';
  }

  const itemsToAdd = [];

  numTokens.forEach(token => {
    let rawTok = token;
    if (rawTok.includes('.')) {
      const p = rawTok.split('.');
      if (/^0+$/.test(p[1])) rawTok = p[0];
    }

    // Check if token has embedded series and location like "BT-886602" or "BT 886602 (GURUVAYOOR)"
    const matchSer = rawTok.match(/^([A-Z]{2})[\s\-]?(\d{4,8})(?:\s*\(([^)]+)\))?$/i);
    if (matchSer) {
      itemsToAdd.push({
        series: matchSer[1].toUpperCase(),
        number: matchSer[2],
        location: matchSer[3] ? matchSer[3].toUpperCase() : ''
      });
      return;
    }

    // Standard number token (e.g. "886602" or "0101")
    const cleanNum = rawTok.replace(/[^0-9A-Z]/gi, '');
    if (!cleanNum) return;

    if (seriesList.length > 0) {
      if (numTokens.length === 1) {
        // One number token, multiple series (e.g. BT, BN, BS for Consolation or 1st prize)
        seriesList.forEach(s => itemsToAdd.push({ series: s, number: cleanNum, location: '' }));
      } else if (seriesList.length === numTokens.length) {
        // Equal counts: pair 1-to-1
        const idx = numTokens.indexOf(token);
        itemsToAdd.push({ series: seriesList[idx] || seriesList[0], number: cleanNum, location: '' });
      } else {
        // Multi-number with 1 series or unequal: assign seriesList[0] to all
        itemsToAdd.push({ series: seriesList[0], number: cleanNum, location: '' });
      }
    } else {
      // No series specified
      itemsToAdd.push({ series: ['1', 'C', '2', '3'].includes(String(rank)) ? '' : 'ALL', number: cleanNum, location: '' });
    }
  });

  if (itemsToAdd.length === 0) {
    toast('No valid ticket numbers parsed', 'warning');
    return;
  }

  itemsToAdd.forEach(item => {
    const div = document.createElement('div');
    div.innerHTML = buildNumberRow(rank, item.series, item.number, item.location, true);
    container.appendChild(div.firstChild);
  });

  closeModal('modal-bulk-paste');
  toast(`🎉 Added ${itemsToAdd.length} winning numbers to Rank ${rank}!`, 'success');
}

function bulkPasteNumbers(rank) {
  const input = prompt(`Paste winning numbers for Rank ${rank} (separated by space, comma, or newlines):`);
  if (!input || !input.trim()) return;
  const numbers = input.split(/[\s,;\n]+/).map(s => {
    let t = s.trim();
    if (t.includes('.')) {
      const parts = t.split('.');
      if (/^0+$/.test(parts[1])) t = parts[0];
    }
    return t;
  }).filter(s => s.length >= 2);
  if (numbers.length === 0) { toast('No valid numbers found', 'warning'); return; }

  const container = document.getElementById(`nums-${rank}`);
  if (!container) return;

  const existingRows = container.querySelectorAll('.number-row');
  if (existingRows.length === 1 && !existingRows[0].querySelector('.num-input')?.value) {
    container.innerHTML = '';
  }

  numbers.forEach((numStr) => {
    let series = 'ALL';
    let number = numStr;
    let location = '';

    const matchSer = numStr.match(/^([A-Z]{2})[\s\-]?(\d{4,8})(?:\s*\(([^)]+)\))?$/i);
    if (matchSer) {
      series = matchSer[1].toUpperCase();
      number = matchSer[2];
      if (matchSer[3]) location = matchSer[3].toUpperCase();
    }

    const div = document.createElement('div');
    div.innerHTML = buildNumberRow(rank, series, number, location, true);
    container.appendChild(div.firstChild);
  });

  toast(`🎉 Extracted & added ${numbers.length} winning numbers for Rank ${rank}!`, 'success');
}

function parseAndApplyBulkResultText(rawText) {
  if (!rawText || !rawText.trim()) { toast('Please paste result text first', 'warning'); return; }

  const lines = rawText.split('\n');
  const prizesMap = {};

  let currentRank = '1';
  let currentLabel = '1st Prize';
  let currentAmt = 7500000;

  lines.forEach(line => {
    const l = line.trim();
    if (!l) return;

    if (l.match(/1st\s*Prize/i)) { currentRank = '1'; currentLabel = '1st Prize'; }
    else if (l.match(/Cons(?:olation)?\s*Prize/i)) { currentRank = 'C'; currentLabel = 'Consolation Prize'; currentAmt = 5000; }
    else if (l.match(/2nd\s*Prize/i)) { currentRank = '2'; currentLabel = '2nd Prize'; }
    else if (l.match(/3rd\s*Prize/i)) { currentRank = '3'; currentLabel = '3rd Prize'; }
    else if (l.match(/4th\s*Prize/i)) { currentRank = '4'; currentLabel = '4th Prize'; currentAmt = 5000; }
    else if (l.match(/5th\s*Prize/i)) { currentRank = '5'; currentLabel = '5th Prize'; currentAmt = 2000; }
    else if (l.match(/6th\s*Prize/i)) { currentRank = '6'; currentLabel = '6th Prize'; currentAmt = 1000; }
    else if (l.match(/7th\s*Prize/i)) { currentRank = '7'; currentLabel = '7th Prize'; currentAmt = 500; }
    else if (l.match(/8th\s*Prize/i)) { currentRank = '8'; currentLabel = '8th Prize'; currentAmt = 200; }

    const amtMatch = l.match(/Rs\.?\s*:?\s*([\d,]+(?:\.\d+)?)/i);
    if (amtMatch) currentAmt = parseFloat(amtMatch[1].replace(/,/g, ''));

    if (!prizesMap[currentRank]) prizesMap[currentRank] = { rank: currentRank, label: currentLabel, amount: currentAmt, numbers: [] };

    const ticketMatches = l.matchAll(/([A-Z]{2})\s*(\d{4,8})(?:\s*\(([^)]+)\))?/gi);
    let foundTickets = false;
    for (const tm of ticketMatches) {
      foundTickets = true;
      prizesMap[currentRank].numbers.push({
        series: tm[1].toUpperCase(),
        number: tm[2],
        location: tm[3] ? tm[3].toUpperCase() : ''
      });
    }

    if (!foundTickets) {
      const plainNumbers = l.match(/\b\d{4,8}(?:\.00)?\b/g);
      if (plainNumbers) {
        plainNumbers.forEach(rawN => {
          const n = rawN.replace(/\.00$/, '');
          prizesMap[currentRank].numbers.push({ series: 'ALL', number: n });
        });
      }
    }
  });

  let totalAdded = 0;
  Object.values(prizesMap).forEach(p => {
    if (p.numbers.length === 0) return;
    totalAdded += p.numbers.length;
    const container = document.getElementById(`nums-${p.rank}`);
    const section = container?.closest('.prize-section');
    if (section) {
      const amtInput = section.querySelector('.prize-amt-input');
      if (amtInput && p.amount) amtInput.value = p.amount;
    }
    if (container) {
      container.innerHTML = p.numbers.map((n, i) => buildNumberRow(p.rank, n.series, n.number, n.location || '', i > 0)).join('');
    }
  });

  closeModal('modal-bulk-paste');
  toast(`🎉 Bulk Import Success! Extracted ${totalAdded} winning numbers across all prize ranks.`, 'success');
}

// ─── KERALA ALL 14 DISTRICTS ──────────────────────────────
const KERALA_DISTRICTS = [
  'THIRUVANANTHAPURAM',
  'KOLLAM',
  'PATHANAMTHITTA',
  'ALAPPUZHA',
  'KOTTAYAM',
  'IDUKKI',
  'ERNAKULAM',
  'THRISSUR',
  'PALAKKAD',
  'MALAPPURAM',
  'KOZHIKODE',
  'WAYANAD',
  'KANNUR',
  'KASARAGOD'
];

const KERALA_DISTRICT_LABELS = {
  'THIRUVANANTHAPURAM': 'Thiruvananthapuram',
  'KOLLAM': 'Kollam',
  'PATHANAMTHITTA': 'Pathanamthitta',
  'ALAPPUZHA': 'Alappuzha',
  'KOTTAYAM': 'Kottayam',
  'IDUKKI': 'Idukki',
  'ERNAKULAM': 'Ernakulam',
  'THRISSUR': 'Thrissur',
  'PALAKKAD': 'Palakkad',
  'MALAPPURAM': 'Malappuram',
  'KOZHIKODE': 'Kozhikode',
  'WAYANAD': 'Wayanad',
  'KANNUR': 'Kannur',
  'KASARAGOD': 'Kasaragod'
};

function buildDistrictSelectOptions(currentLocation = '') {
  const norm = (currentLocation || '').trim().toUpperCase();
  let found = false;

  const opts = [
    '<option value="">📍 Select District</option>'
  ];

  KERALA_DISTRICTS.forEach(d => {
    const isSelected = (norm === d);
    if (isSelected) found = true;
    opts.push(`<option value="${d}" ${isSelected ? 'selected' : ''}>${KERALA_DISTRICT_LABELS[d] || d}</option>`);
  });

  // Preserve existing custom location if not in standard 14 districts (e.g. GURUVAYOOR)
  if (norm && !found) {
    opts.push(`<option value="${norm}" selected>${norm} (Other)</option>`);
  }

  return opts.join('');
}

function buildNumberRow(rank, series, number, location, canDelete) {
  const isTopPrize = ['1', 'C', '2', '3'].includes(String(rank));
  const districtOpts = buildDistrictSelectOptions(location);

  if (isTopPrize) {
    const seriesVal = (series && series !== 'ALL') ? series : '';
    return `<div class="number-row top-prize-row" data-rank="${rank}">
      <input type="text" class="finput sm num-series-input mono" placeholder="Series (e.g. BT)" value="${seriesVal}" maxlength="4" style="width:110px;text-transform:uppercase;font-weight:800;color:var(--gold-l)" title="2-Digit/Letter Series Code e.g. BT"/>
      <input type="text" class="finput num-input mono" placeholder="6-Digit Ticket (e.g. 886602)" value="${number}" maxlength="6" style="font-weight:800;letter-spacing:.1em" title="6-Digit Winning Ticket Number"/>
      <select class="finput sm loc-input loc-select" title="Winning District Location" style="width:190px">
        ${districtOpts}
      </select>
      ${canDelete ? `<button type="button" class="del-num-btn" onclick="this.parentElement.remove()">✕</button>` : ''}
    </div>`;
  } else {
    const seriesOpts = ['ALL', ...ALL_SERIES].map(s =>
      `<option value="${s}" ${s === series ? 'selected' : ''}>${s}</option>`).join('');
    return `<div class="number-row" data-rank="${rank}">
      <select class="finput sm num-series-select" title="Series">${seriesOpts}</select>
      <input type="text" class="finput num-input mono" placeholder="Ending No (e.g. 0101)" value="${number}" maxlength="8"/>
      <select class="finput sm loc-input loc-select" title="Winning District Location (Optional)" style="width:190px">
        ${districtOpts}
      </select>
      ${canDelete ? `<button type="button" class="del-num-btn" onclick="this.parentElement.remove()">✕</button>` : ''}
    </div>`;
  }
}

function addNumberRow(rank) {
  const container = document.getElementById(`nums-${rank}`);
  const div = document.createElement('div');
  div.innerHTML = buildNumberRow(rank, '', '', '', true);
  container.appendChild(div.firstChild);
}

function collectPrizes() {
  const prizes = [];
  PRIZE_TIERS.forEach(tier => {
    const container = document.getElementById(`nums-${tier.rank}`);
    if (!container) return;

    // Get edited prize amount for this rank
    const section = container.closest('.prize-section');
    const amtInput = section ? section.querySelector('.prize-amt-input') : null;
    const amount = amtInput ? (parseFloat(amtInput.value) || tier.amount) : tier.amount;

    const rows = container.querySelectorAll('.number-row');
    const numbers = [];
    rows.forEach(row => {
      const seriesInput = row.querySelector('.num-series-input');
      const seriesSelect = row.querySelector('.num-series-select');
      const series = seriesInput ? (seriesInput.value.trim().toUpperCase() || 'ALL') : (seriesSelect?.value || 'ALL');
      const num = row.querySelector('.num-input')?.value.trim();
      const location = row.querySelector('.loc-input')?.value.trim().toUpperCase();
      if (num) {
        const item = { series, number: num };
        if (location) item.location = location;
        numbers.push(item);
      }
    });
    if (numbers.length > 0) {
      prizes.push({ rank: tier.rank, label: tier.label, amount, numbers });
    }
  });
  return prizes;
}

document.getElementById('save-prizes-btn').addEventListener('click', () => {
  DB = loadDB();
  const drawId = document.getElementById('entry-actions').dataset.drawId;
  if (!drawId) { toast('No draw loaded', 'warning'); return; }
  DB.draws[drawId].prizes = collectPrizes();
  saveDB(DB);
  toast('Prize numbers saved!', 'success');
  notifyDataChanged();
});

document.getElementById('publish-draw-btn').addEventListener('click', () => {
  DB = loadDB();
  const drawId = document.getElementById('entry-actions').dataset.drawId;
  if (!drawId) { toast('No draw loaded', 'warning'); return; }
  DB.draws[drawId].prizes = collectPrizes();
  DB.draws[drawId].status = 'published';
  DB.draws[drawId].publishedAt = todayStr();
  saveDB(DB);
  const d = DB.draws[drawId];
  const lt = getLotteryById(d.lotteryId);
  addNotification(`${lt ? lt.name : ''} ${d.drawNo} Results Published`, `Results for draw ${d.drawNo} (${formatDate(d.drawDate)}) are now live on the app!`);
  toast('Draw published live to app successfully!', 'success');
  notifyDataChanged();
  switchPanel('results');
});

document.getElementById('save-prizes-btn-top')?.addEventListener('click', () => {
  document.getElementById('save-prizes-btn')?.click();
});

document.getElementById('publish-draw-btn-top')?.addEventListener('click', () => {
  document.getElementById('publish-draw-btn')?.click();
});

// ─── RESULTS PANEL ────────────────────────────────────────
function populateResultFilters() {
  populateLotterySelect('res-lottery-filter', 'All Lotteries');
}

function renderResultCards() {
  DB = loadDB();
  const lotFilter = document.getElementById('res-lottery-filter')?.value || '';
  const dateFilter = document.getElementById('res-date-filter')?.value || '';
  const statusFilter = document.getElementById('res-status-filter')?.value || '';
  const sortO = document.getElementById('res-sort-order')?.value || 'desc';
  const grid = document.getElementById('results-cards-grid');
  if (!grid) return;

  // Apply row or column layout class
  const savedLayout = localStorage.getItem('kl_layout_results') || 'cols';
  if (savedLayout === 'rows') grid.classList.add('view-rows');
  else grid.classList.remove('view-rows');

  let draws = Object.values(DB.draws || {})
    .filter(d =>
      (!lotFilter || d.lotteryId === lotFilter) &&
      (!dateFilter || d.drawDate === dateFilter) &&
      (!statusFilter || d.status === statusFilter)
    )
    .sort((a, b) => {
      if (sortO === 'asc') return (a.drawDate || '').localeCompare(b.drawDate || '');
      return (b.drawDate || '').localeCompare(a.drawDate || '');
    });

  grid.innerHTML = draws.map(d => buildDrawCard(d, true)).join('') ||
    `<div style="text-align:center;color:var(--text2);padding:48px;grid-column:1/-1">No results found</div>`;
}

// Layout Switcher Helper
function initLayoutToggle(containerId, storageKey, targetElementId, defaultMode = 'cols', callback = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const target = document.getElementById(targetElementId);
  let currentMode = localStorage.getItem(storageKey) || defaultMode;

  const updateButtons = (mode) => {
    container.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-layout') === mode);
    });
    if (target) {
      if (mode === 'rows') {
        target.classList.add('view-rows');
        target.classList.remove('view-cols');
      } else {
        target.classList.remove('view-rows');
        target.classList.add('view-cols');
      }
    }
  };

  updateButtons(currentMode);

  container.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-layout');
      currentMode = mode;
      localStorage.setItem(storageKey, mode);
      updateButtons(mode);
      if (callback) callback(mode);
    });
  });
}

document.getElementById('load-res-btn')?.addEventListener('click', renderResultCards);
document.getElementById('res-lottery-filter')?.addEventListener('change', renderResultCards);
document.getElementById('res-date-filter')?.addEventListener('change', renderResultCards);
document.getElementById('res-status-filter')?.addEventListener('change', renderResultCards);
document.getElementById('res-sort-order')?.addEventListener('change', renderResultCards);

document.getElementById('export-res-btn').addEventListener('click', () => {
  DB = loadDB();
  let csv = 'draw_no,lottery_name,draw_date,publish_date,status,prize_rank,prize_label,prize_amount,series,winning_number\n';
  Object.values(DB.draws).forEach(d => {
    const lt = getLotteryById(d.lotteryId);
    if (!d.prizes) return;
    d.prizes.forEach(p => p.numbers.forEach(n => {
      csv += `${d.drawNo},"${lt ? lt.name : d.lotteryId}",${d.drawDate},${d.publishDate},${d.status},${p.rank},"${p.label}",${p.amount},${n.series},${n.number}\n`;
    }));
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'kerala_lottery_results.csv'; a.click();
  toast('Results exported!', 'success');
});

function openEntryForDraw(drawId) {
  switchPanel('entry');
  const sel = document.getElementById('entry-draw-select');
  if (sel) {
    sel.value = drawId;
    document.getElementById('load-entry-btn').click();
  }
}

function buildDrawCard(d, isAdmin) {
  const lt = getLotteryById(d.lotteryId);
  const isPublished = d.status === 'published';
  const hdrClass = isPublished ? 'pub-hdr' : 'draft-hdr';

  // Find 1st Prize details if available
  const p1 = d.prizes ? d.prizes.find(p => p.rank === '1') : null;
  const p1Num = p1 && p1.numbers && p1.numbers[0] ? p1.numbers[0] : null;
  const p1Amt = p1 ? formatCurrency(p1.amount) : (lt ? formatCurrency(lt.prize1) : '—');

  const numDisplay = p1Num
    ? `${p1Num.series && p1Num.series !== 'ALL' ? p1Num.series + ' ' : ''}${p1Num.number}${p1Num.location ? `<span class="loc-tag">(${p1Num.location})</span>` : ''}`
    : 'Pending Draw Results';

  const adminBtns = isAdmin ? `
    ${!isPublished ? `<button class="btn btn-sm btn-gold" onclick="event.stopPropagation(); publishDraw('${d.id}')">Publish</button>` : ''}
    <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); openEntryForDraw('${d.id}')" title="Edit Prize Amounts & Winning Numbers">✏ Edit Prizes</button>
    <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); showIndividualDraw('${d.id}')">📄 Full Result</button>
    <button class="btn btn-sm btn-ghost" style="color:#FC8181;border:1px solid rgba(220,53,69,.25)" onclick="event.stopPropagation(); deleteDraw('${d.id}')" title="Delete this draw result">🗑 Delete</button>` : `
    <button class="btn btn-sm btn-gold" onclick="event.stopPropagation(); showIndividualDraw('${d.id}')">📄 Full Official Result</button>`;

  const cardAction = isAdmin ? `viewDraw('${d.id}')` : `showIndividualDraw('${d.id}')`;

  return `<div class="draw-result-card clickable" onclick="${cardAction}" title="Click to view complete official results">
    <div class="drc-header ${hdrClass}">
      <div class="drc-h-left">
        <div class="drc-lottery-name">${lt ? lt.name : d.lotteryId}</div>
        <div class="drc-draw-no">Draw No: ${d.drawNo}</div>
        <div class="drc-date">📅 ${formatDate(d.drawDate)}</div>
      </div>
      <span class="pill ${isPublished ? 'pill-green' : 'pill-orange'}">${d.status}</span>
    </div>
    
    <div class="drc-summary-body">
      <div class="c1st-highlight-box">
        <div class="c1st-tag">🏆 1ST PRIZE &bull; ${p1Amt}</div>
        <div class="c1st-ticket mono">${numDisplay}</div>
      </div>
      <div class="drc-hint-bar">
        <span>📍 ${d.venue ? d.venue.split(',')[0] : 'Kerala'}</span>
        <span class="view-link">Click for 1st - 8th Prizes &amp; Consolation &rarr;</span>
      </div>
    </div>
    
    <div class="drc-footer" onclick="event.stopPropagation()">
      <span style="font-size:11px;color:var(--text3)">Govt. of Kerala</span>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${adminBtns}</div>
    </div>
  </div>`;
}

// ─── AUTO PUBLISH ─────────────────────────────────────────
function runAutoPublish() {
  DB = loadDB();
  let count = 0;
  const today = todayStr();
  Object.values(DB.draws).forEach(d => {
    if (d.status !== 'published' && d.publishDate <= today && d.prizes && d.prizes.length > 0) {
      DB.draws[d.id].status = 'published';
      DB.draws[d.id].publishedAt = today;
      count++;
      const lt = getLotteryById(d.lotteryId);
      addNotification(`Auto-Published: ${d.drawNo}`, `${lt ? lt.name : ''} ${d.drawNo} results have been auto-published.`, '⏰');
    }
  });
  saveDB(DB);
  if (count > 0) toast(`Auto-publish: ${count} draw(s) published!`, 'success');
  else toast('Auto-publish: No pending draws due today.', 'info');
  refreshDashboard();
}

document.getElementById('auto-pub-btn').addEventListener('click', runAutoPublish);
document.getElementById('run-cron-btn').addEventListener('click', runAutoPublish);
document.getElementById('save-cron-btn').addEventListener('click', () => {
  DB = loadDB();
  DB.cronTime = document.getElementById('cron-time').value;
  saveDB(DB);
  toast(`Scheduler set to ${DB.cronTime} daily`, 'success');
});

let cronTimer;
function startCronSimulator() {
  clearInterval(cronTimer);
  cronTimer = setInterval(() => {
    DB = loadDB();
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (hhmm === (DB.cronTime || '04:00')) runAutoPublish();
  }, 60000);
}

// ─── NOTIFICATIONS ────────────────────────────────────────
function addNotification(title, body, icon = '🏆', type = 'result') {
  DB = loadDB();
  DB.notifications.unshift({ id: 'N' + uid(), title, body, type, icon, sentAt: todayStr() });
  saveDB(DB);
  updateNotifBadge();
}

function updateNotifBadge() {
  const n = DB.notifications.length;
  document.getElementById('notif-badge').textContent = n;
  document.getElementById('ndot').classList.toggle('on', n > 0);
}

function deleteNotification(id) {
  DB = loadDB();
  DB.notifications = DB.notifications.filter(n => n.id !== id);
  saveDB(DB);
  toast('🗑 Notification deleted', 'info');
  renderNotifications();
}

function renderNotifications() {
  DB = loadDB();
  updateNotifBadge();
  const list = document.getElementById('notif-list');
  list.innerHTML = DB.notifications.map(n =>
    `<div class="notif-item">
      <div class="notif-ico">${n.icon || '📢'}</div>
      <div class="notif-body">
        <div class="notif-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>${n.title}</span>
          <button class="abtn del" style="padding:2px 8px;font-size:11px" onclick="deleteNotification('${n.id}')" title="Delete notification">✕ Delete</button>
        </div>
        <div class="notif-msg">${n.body}</div>
        <div class="notif-meta">${n.type} &bull; ${formatDate(n.sentAt)}</div>
      </div>
    </div>`
  ).join('') || '<div style="text-align:center;color:var(--text2);padding:48px">No notifications yet</div>';
}

document.getElementById('reset-db-btn')?.addEventListener('click', () => {
  if (!confirm('⚠️ Are you sure you want to reset all lottery data to factory defaults? All custom entries will be restored.')) return;
  localStorage.removeItem(DB_KEY);
  DB = initDB();
  saveDB(DB);
  toast('🔄 Database reset to defaults & synced with Firebase and Mobile App!', 'success');
  refreshDashboard();
  renderDrawsTable();
  renderLotteryTypesTable();
  populatePublicFilters();
  notifyDataChanged();
});

document.getElementById('notif-bell').addEventListener('click', () => switchPanel('notifications'));
document.getElementById('send-notif-btn').addEventListener('click', () => {
  document.getElementById('notif-form').reset();
  openModal('modal-notif');
});
document.getElementById('clear-notif-btn').addEventListener('click', () => {
  DB = loadDB(); DB.notifications = []; saveDB(DB);
  toast('Notifications cleared', 'info');
  renderNotifications();
});
document.getElementById('notif-form').addEventListener('submit', e => {
  e.preventDefault();
  const title = document.getElementById('nf-title').value.trim();
  const body = document.getElementById('nf-body').value.trim();
  const type = document.getElementById('nf-type').value;
  addNotification(title, body, '📢', type);
  closeModal('modal-notif');
  toast('Notification sent!', 'success');
  renderNotifications();
});

// ─── CSV IMPORT ───────────────────────────────────────────
document.getElementById('browse-csv-btn').addEventListener('click', () => document.getElementById('csv-input').click());
document.getElementById('csv-input').addEventListener('change', e => { if (e.target.files[0]) processCSV(e.target.files[0]); });
const dz = document.getElementById('drop-zone');
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer.files[0]) processCSV(e.dataTransfer.files[0]); });

function processCSV(file) {
  if (!file.name.endsWith('.csv')) { toast('Please upload a .csv file', 'warning'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { toast('CSV has no data rows', 'warning'); return; }
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
      if (obj.draw_no) rows.push(obj);
    }
    csvData = rows;
    const preview = `<table class="dtable"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 10).map(r => `<tr>${headers.map(h => `<td>${r[h]}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    document.getElementById('csv-preview-wrap').innerHTML = preview;
    document.getElementById('csv-summary-box').innerHTML = `<b>✅ ${rows.length}</b> rows found &bull; Draw numbers: ${[...new Set(rows.map(r => r.draw_no))].join(', ')}`;
    document.getElementById('csv-preview').classList.remove('hidden');
  };
  reader.readAsText(file);
}

document.getElementById('confirm-csv-btn').addEventListener('click', () => {
  DB = loadDB();
  // Group rows by draw_no
  const drawMap = {};
  csvData.forEach(row => {
    const key = row.draw_no;
    if (!drawMap[key]) drawMap[key] = { row, prizes: [] };
    drawMap[key].prizes.push({
      rank: row.prize_rank, label: row.prize_name, amount: parseFloat(row.prize_amount) || 0,
      numbers: (row.winning_numbers ? row.winning_numbers.split(';') : [row.winning_numbers || '']).map(n => ({
        series: row.series || 'ALL', number: n.trim()
      })).filter(n => n.number)
    });
  });

  let count = 0;
  const allTypes = getLotteryTypes();
  Object.entries(drawMap).forEach(([drawNo, data]) => {
    const r = data.row;
    const lt = allTypes.find(l => l.name === r.lottery_name || l.id === r.lottery_name || l.code === r.lottery_name);
    const id = 'DRW' + uid();
    // Find existing draw
    const existing = Object.values(DB.draws).find(d => d.drawNo === drawNo);
    const drawId = existing ? existing.id : id;
    const lotId = lt ? lt.id : (drawNo.split('-')[0] || 'BT');
    DB.draws[drawId] = {
      id: drawId, drawNo, lotteryId: lotId,
      drawDate: r.draw_date || todayStr(), publishDate: r.publish_date || todayStr(),
      venue: r.venue || '', status: 'published',
      publishedAt: todayStr(),
      prizes: data.prizes,
    };
    count++;
  });
  saveDB(DB);
  toast(`Imported & published ${count} draw(s) live to app!`, 'success');
  document.getElementById('csv-preview').classList.add('hidden');
  document.getElementById('csv-input').value = '';
  csvData = [];
  notifyDataChanged();
  switchPanel('draws');
});

document.getElementById('cancel-csv-btn').addEventListener('click', () => {
  document.getElementById('csv-preview').classList.add('hidden');
  csvData = [];
});

document.getElementById('dl-template-btn').addEventListener('click', () => {
  const csv = `draw_no,lottery_name,draw_date,publish_date,prize_rank,prize_name,prize_amount,winning_numbers,series,venue
BT-892,Bhagyathara,2026-10-13,2026-10-13,1,1st Prize,7500000,456789,A,Gorky Bhavan
BT-892,Bhagyathara,2026-10-13,2026-10-13,2,2nd Prize,500000,345678,ALL,Gorky Bhavan
BT-892,Bhagyathara,2026-10-13,2026-10-13,C,Consolation Prize,8000,456789,B,Gorky Bhavan\n`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'kerala_lottery_template.csv'; a.click();
  toast('Template downloaded!', 'success');
});

// ─── PUBLIC PORTAL ────────────────────────────────────────
function populatePublicFilters() {
  DB = loadDB();
  const types = getLotteryTypes('day', false);
  const filters = ['checker-lottery', 'pub-lottery-filter'];
  filters.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '<option value="">All Lotteries</option>' +
      types.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    if (prev && types.some(t => t.id === prev)) {
      sel.value = prev;
    } else {
      sel.value = '';
    }
  });
  const checkerDate = document.getElementById('checker-date');
  if (checkerDate) checkerDate.value = todayStr();
  if (document.getElementById('pub-date-filter')) document.getElementById('pub-date-filter').value = '';
}

function renderPublicResults() {
  DB = loadDB();
  const lotF = document.getElementById('pub-lottery-filter')?.value || '';
  const dateF = document.getElementById('pub-date-filter')?.value || '';
  const sortO = document.getElementById('pub-sort-order')?.value || 'desc';
  const grid = document.getElementById('pub-results-grid');
  if (!grid) return;

  // Apply row or column layout class
  const savedLayout = localStorage.getItem('kl_layout_pub_results') || 'cols';
  if (savedLayout === 'rows') grid.classList.add('view-rows');
  else grid.classList.remove('view-rows');

  let draws = Object.values(DB.draws || {})
    .filter(d => d.status === 'published' && (!lotF || d.lotteryId === lotF) && (!dateF || d.drawDate === dateF))
    .sort((a, b) => {
      if (sortO === 'asc') return (a.drawDate || '').localeCompare(b.drawDate || '');
      return (b.drawDate || '').localeCompare(a.drawDate || '');
    });

  grid.innerHTML = draws.map(d => buildDrawCard(d, false)).join('') ||
    `<div style="text-align:center;color:var(--text2);padding:48px;grid-column:1/-1">
      <div style="font-size:48px;margin-bottom:12px">🎟</div>
      <p style="font-weight:600;font-size:15px">No published results found for the selected filters.</p>
      <p style="font-size:12px;color:var(--text3);margin-top:4px">New draws published by admin will appear here automatically.</p>
      ${(lotF || dateF) ? `<button class="btn btn-sm btn-outline" style="margin-top:12px" onclick="clearPublicFilters()">Reset Filters &amp; Show All</button>` : ''}
    </div>`;
}

function clearPublicFilters() {
  if (document.getElementById('pub-lottery-filter')) document.getElementById('pub-lottery-filter').value = '';
  if (document.getElementById('pub-date-filter')) document.getElementById('pub-date-filter').value = '';
  renderPublicResults();
}

document.getElementById('pub-filter-btn')?.addEventListener('click', renderPublicResults);
document.getElementById('pub-refresh-btn')?.addEventListener('click', () => {
  const cs = (typeof window !== 'undefined' && window.CloudSync) ? window.CloudSync : (typeof CloudSync !== 'undefined' ? CloudSync : null);
  if (cs && typeof cs.pullFromCloud === 'function' && cs.isEnabled()) {
    cs.pullFromCloud({ silent: false });
  } else {
    DB = loadDB();
    renderPublicResults();
    renderRibbon();
    toast('Latest results refreshed & up to date', 'success', 2000);
  }
});
document.getElementById('pub-clear-filter-btn')?.addEventListener('click', () => {
  clearPublicFilters();
  toast('Filters reset — showing all published results', 'info', 2000);
});
document.getElementById('pub-lottery-filter')?.addEventListener('change', renderPublicResults);
document.getElementById('pub-sort-order')?.addEventListener('change', renderPublicResults);
document.getElementById('pub-date-filter')?.addEventListener('change', renderPublicResults);

function renderRibbon() {
  const ribbon = document.getElementById('ribbon-items');
  if (!ribbon) return;
  const types = getLotteryTypes();
  ribbon.innerHTML = types.map(lt =>
    `<div class="ribbon-chip" onclick="filterByLottery('${lt.id}')">
      <div class="rc-name">${lt.name}</div>
      <div class="rc-day">${lt.day}</div>
    </div>`
  ).join('');
}

function filterByLottery(id) {
  document.getElementById('pub-lottery-filter').value = id;
  renderPublicResults();
  document.querySelector('.latest-section')?.scrollIntoView({ behavior: 'smooth' });
}

// TICKET CHECKER & VERIFICATION
document.getElementById('check-btn')?.addEventListener('click', checkTicket);
document.getElementById('checker-number')?.addEventListener('keydown', e => { if (e.key === 'Enter') checkTicket(); });
document.getElementById('checker-series')?.addEventListener('keydown', e => { if (e.key === 'Enter') checkTicket(); });
document.getElementById('checker-series')?.addEventListener('input', e => {
  if (e.target) e.target.value = e.target.value.toUpperCase();
});

function checkTicket(skipAd = false) {
  if (!skipAd && window.GoogleAds && typeof window.GoogleAds.showInterstitialAd === 'function') {
    const cfg = window.GoogleAds.getConfig();
    if (cfg.enabled && cfg.interstitialOnVerify) {
      window.GoogleAds.showInterstitialAd(() => checkTicket(true));
      return;
    }
  }
  DB = loadDB();
  const lotId = document.getElementById('checker-lottery')?.value;
  const dateStr = document.getElementById('checker-date')?.value;
  let rawInput = document.getElementById('checker-number')?.value?.trim() || '';
  let manualSeries = document.getElementById('checker-series')?.value?.trim().toUpperCase() || '';
  const output = document.getElementById('checker-result');
  if (!output) return;

  // Smart detect if user accidentally swapped series and number fields
  if (/^[A-Za-z]{1,3}$/.test(rawInput) && /^[0-9\.]+$/.test(manualSeries)) {
    const tmp = rawInput;
    rawInput = manualSeries;
    manualSeries = tmp.toUpperCase();
  }

  // If number input is empty but series input has combined format (e.g., "BT 886602")
  if (!rawInput && manualSeries) {
    const comboMatch = manualSeries.match(/^([A-Za-z]{1,3})[\s\-]+([0-9\.]+)/i);
    if (comboMatch) {
      manualSeries = comboMatch[1].toUpperCase();
      rawInput = comboMatch[2];
    }
  }

  if (!rawInput) {
    toast('Enter a 6-digit ticket or 4-digit winning number to verify', 'warning');
    return;
  }

  // Parse input - supports 6-digit, 4-digit, embedded series, and decimal values
  let text = rawInput;
  let parsedSeries = manualSeries;

  // Extract embedded series if present in number box (e.g. "BT 886602", "BT-886602", "BT886602")
  const serMatch = text.match(/^([A-Za-z]{1,3})[\s\-]+([0-9\.]+)/i);
  if (serMatch) {
    if (!parsedSeries) parsedSeries = serMatch[1].toUpperCase();
    text = serMatch[2];
  } else {
    const serPrefix = text.match(/^([A-Za-z]{1,3})([0-9]{4,6})/i);
    if (serPrefix) {
      if (!parsedSeries) parsedSeries = serPrefix[1].toUpperCase();
      text = serPrefix[2];
    }
  }

  // Check for decimal value
  let isDecimal = text.includes('.');
  let decimalVal = null;
  let cleanNumber = text;

  if (isDecimal) {
    const parsedFloat = parseFloat(text);
    if (!isNaN(parsedFloat)) {
      decimalVal = parsedFloat;
      // Extract integer portion for ticket matching
      cleanNumber = text.split('.')[0];
    }
  }

  // Clean pure digits for ticket matching
  cleanNumber = cleanNumber.replace(/\D/g, '');

  const isFourDigit = cleanNumber.length === 4;
  const isSixDigit = cleanNumber.length === 6;

  // Filter published draws
  const allPublishedDraws = Object.values(DB.draws || {}).filter(d => d.status === 'published');
  let draws = allPublishedDraws.filter(d =>
    (!lotId || d.lotteryId === lotId) &&
    (!dateStr || d.drawDate === dateStr)
  );

  // If specific date/lottery filter gave no draws, fallback to all published draws
  if (draws.length === 0 && allPublishedDraws.length > 0) {
    draws = allPublishedDraws;
  }

  // Search published draws for matching prize
  let foundPrize = null;
  let foundDraw = null;
  let matchedNumber = null;
  let matchType = '';
  let seriesMismatchInfo = null;

  function scanDraws(list) {
    for (const d of list) {
      if (!d.prizes) continue;
      for (const p of d.prizes) {
        for (const n of p.numbers) {
          const nNum = String(n.number).trim();
          const nDigits = nNum.length;

          if (isSixDigit) {
            if (nDigits === 6) {
              const numMatches = (nNum === cleanNumber);
              const serMatches = !parsedSeries || n.series === 'ALL' || n.series === parsedSeries;
              if (numMatches && serMatches) {
                return { prize: p, draw: d, number: n, type: '6-digit exact' };
              } else if (numMatches && !serMatches && !seriesMismatchInfo) {
                seriesMismatchInfo = {
                  prize: p,
                  draw: d,
                  winningSeries: n.series || 'ALL',
                  enteredSeries: parsedSeries,
                  number: nNum
                };
              }
            } else if (nDigits === 4 && cleanNumber.slice(-4) === nNum) {
              return { prize: p, draw: d, number: n, type: '4-digit last-digits' };
            }
          } else if (isFourDigit && nDigits === 4 && nNum === cleanNumber) {
            return { prize: p, draw: d, number: n, type: '4-digit exact' };
          }
        }
      }
    }
    return null;
  }

  if (isSixDigit || isFourDigit) {
    // 1. Check in user's selected draw/date
    const res = scanDraws(draws);
    if (res) {
      foundPrize = res.prize;
      foundDraw = res.draw;
      matchedNumber = res.number;
      matchType = res.type;
    } else {
      // 2. Fallback: Check across all published draws so user never misses a win if date is today's default
      const remainingDraws = allPublishedDraws.filter(d => !draws.includes(d));
      if (remainingDraws.length > 0) {
        const fallbackRes = scanDraws(remainingDraws);
        if (fallbackRes) {
          foundPrize = fallbackRes.prize;
          foundDraw = fallbackRes.draw;
          matchedNumber = fallbackRes.number;
          matchType = fallbackRes.type;
        }
      }
    }
  }

  // If ticket didn't win or was not a ticket, check if user searched by decimal prize amount (e.g. 5000.00, 500.50, 7500000.00)
  if (!foundPrize && decimalVal !== null) {
    let matchedPrize = null;
    let matchedDraw = null;
    for (const d of draws) {
      if (!d.prizes) continue;
      for (const p of d.prizes) {
        if (Math.abs(parseFloat(p.amount) - decimalVal) < 0.001) {
          matchedPrize = p;
          matchedDraw = d;
          break;
        }
      }
      if (matchedPrize) break;
    }

    if (matchedPrize && matchedDraw) {
      const lt = getLotteryById(matchedDraw.lotteryId);
      const sampleNums = (matchedPrize.numbers || []).slice(0, 10).map(n => n.series && n.series !== 'ALL' ? `${n.series} ${n.number}` : n.number).join(', ');
      output.innerHTML = `
        <div class="check-win">
          <h3>💰 Prize Tier Found by Decimal Amount!</h3>
          <p><b>Lottery:</b> ${lt ? lt.name : matchedDraw.lotteryId} — Draw ${matchedDraw.drawNo}</p>
          <p><b>Draw Date:</b> ${formatDate(matchedDraw.drawDate)}</p>
          <p><b>Prize Tier:</b> ${matchedPrize.label} — <span style="color:var(--gold-l);font-weight:800;font-size:22px">${formatCurrency(matchedPrize.amount)}</span></p>
          <div style="margin-top:10px;background:rgba(255,255,255,.05);padding:10px;border-radius:var(--rs);text-align:left">
            <span style="font-size:12px;color:var(--text2)">Winning Numbers (${matchedPrize.numbers.length} total):</span>
            <div class="mono" style="font-size:14px;color:var(--text);margin-top:4px;word-break:break-all">${sampleNums}${matchedPrize.numbers.length > 10 ? '...' : ''}</div>
          </div>
          <div style="margin-top:14px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-gold btn-sm" onclick="showIndividualDraw('${matchedDraw.id}')">📄 View Official Gazette Sheet</button>
          </div>
        </div>`;
      toast(`Found prize tier: ${matchedPrize.label} (${formatCurrency(matchedPrize.amount)})`, 'success');
      return;
    }
  }

  // Strict validation: Winning number find six digit and four digit only!
  if (!foundPrize && !seriesMismatchInfo && !isFourDigit && !isSixDigit) {
    output.innerHTML = `
      <div class="check-lose" style="border-color:rgba(212,169,65,.4)">
        <h3 style="color:var(--gold-l)">⚠️ 6-Digit or 4-Digit Numbers Only</h3>
        <p>Winning numbers can only be verified for <b>6-digit</b> full tickets or <b>4-digit</b> winning numbers (decimal values also supported).</p>
        <p style="font-size:13px;color:var(--text3);margin-top:8px">You entered: <b class="mono">${escapeHTML(rawInput)}</b> (${cleanNumber.length} digits). Please manual enter your 2-digit series (e.g. BT) and 6-digit ticket (e.g. 886602) or 4-digit winning number (e.g. 0101).</p>
      </div>`;
    toast('Enter a 6-digit ticket or 4-digit winning number', 'warning');
    return;
  }

  // Check if ticket won!
  if (foundPrize && foundDraw) {
    const lt = getLotteryById(foundDraw.lotteryId);
    const displayTicket = (parsedSeries ? parsedSeries + ' ' : '') + cleanNumber + (isDecimal ? ' (' + rawInput + ')' : '');
    const reasonText = matchType === '4-digit last-digits'
      ? `(Matched on winning last 4 digits: <b class="mono">${matchedNumber.number}</b>)`
      : matchType === '4-digit exact'
      ? `(Exact 4-digit winning number: <b class="mono">${matchedNumber.number}</b>)`
      : `(Exact 6-digit ticket: <b class="mono">${(matchedNumber.series && matchedNumber.series !== 'ALL' ? matchedNumber.series + ' ' : '') + matchedNumber.number}</b>)`;

    output.innerHTML = `
      <div class="check-win">
        <h3>🎉 CONGRATULATIONS! YOU WON!</h3>
        <p style="font-size:16px;margin-bottom:8px">Ticket <b>${displayTicket}</b> has won the <b>${foundPrize.label}</b>!</p>
        <div style="font-size:28px;font-weight:900;color:var(--gold-l);margin-bottom:8px">${formatCurrency(foundPrize.amount)}</div>
        <p style="font-size:13px;color:var(--text2);margin-bottom:6px">${reasonText}</p>
        <p style="font-size:13px;color:var(--text3)">Draw: ${lt ? lt.name : foundDraw.lotteryId} (${foundDraw.drawNo}) on ${formatDate(foundDraw.drawDate)}</p>
        <div style="margin-top:14px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-gold btn-sm" onclick="showIndividualDraw('${foundDraw.id}')">📄 View Official Result Sheet</button>
        </div>
        <p style="margin-top:12px;font-size:11px;color:var(--text3)">Please verify with Kerala Government Gazette and surrender the winning ticket within 30 days.</p>
      </div>`;
    toast(`🎉 Winner! ${foundPrize.label} - ${formatCurrency(foundPrize.amount)}`, 'success', 5000);
  } else if (seriesMismatchInfo) {
    // Official 6-digit winning number matched, but manual 2-digit series code was different!
    const lt = getLotteryById(seriesMismatchInfo.draw.lotteryId);
    output.innerHTML = `
      <div class="check-lose" style="border-color:rgba(212,169,65,.5)">
        <h3 style="color:var(--gold-l)">⚠️ Series Mismatch (Official Winning Number)</h3>
        <p style="font-size:15px;margin-bottom:8px">Ticket number <b class="mono" style="font-size:17px">${seriesMismatchInfo.number}</b> won <b>${seriesMismatchInfo.prize.label}</b> (<span style="color:var(--gold-l);font-weight:700">${formatCurrency(seriesMismatchInfo.prize.amount)}</span>) in <b>${lt ? lt.name : seriesMismatchInfo.draw.lotteryId}</b> on <b>${formatDate(seriesMismatchInfo.draw.drawDate)}</b>.</p>
        <div style="background:rgba(255,255,255,.05);padding:12px;border-radius:var(--rs);margin:10px 0;display:inline-block;text-align:left">
          <div>Official Winning Series: <b class="mono" style="color:var(--gold-l);font-size:16px">${seriesMismatchInfo.winningSeries}</b></div>
          <div style="margin-top:4px">Your Entered Series: <b class="mono" style="color:#FC8181;font-size:16px">${seriesMismatchInfo.enteredSeries}</b></div>
        </div>
        <p style="font-size:12px;color:var(--text3);margin-top:4px">Under Kerala Government Lottery Rules, top prizes require matching the exact 2-digit series code.</p>
        <div style="margin-top:12px;display:flex;gap:10px;justify-content:center">
          <button class="btn btn-outline btn-sm" onclick="showIndividualDraw('${seriesMismatchInfo.draw.id}')">📄 View Official Gazette Sheet</button>
        </div>
      </div>`;
    toast(`Series mismatch: Winning series is ${seriesMismatchInfo.winningSeries}`, 'warning', 4500);
  } else {
    const displayTicket = (parsedSeries ? parsedSeries + ' ' : '') + cleanNumber + (isDecimal ? ' (' + rawInput + ')' : '');
    output.innerHTML = `
      <div class="check-lose">
        <h3>😔 Better Luck Next Time!</h3>
        <p>Ticket <b class="mono">${displayTicket}</b> (${cleanNumber.length}-digit) did not win a prize${dateStr ? ` in the draw on ${formatDate(dateStr)}` : ''}.</p>
        <p style="margin-top:8px;font-size:12px;color:var(--text3)">Verified across official published draws for 6-digit winning tickets and 4-digit prize numbers.</p>
      </div>`;
  }
}

// ─── QR CODE SCANNER & VERIFICATION MODULE ────────────────
let html5QrCodeScanner = null;

function initQRScanner() {
  const btnScan = document.getElementById('btn-open-qr-scanner');
  const btnBrowse = document.getElementById('btn-browse-qr-img');
  const fileInput = document.getElementById('qr-file-input');

  if (btnScan) {
    btnScan.addEventListener('click', () => {
      openModal('modal-qr-scanner');
      startCameraQRScanner();
    });
  }

  if (btnBrowse && fileInput) {
    btnBrowse.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
      if (e.target.files[0]) processQRImageFile(e.target.files[0]);
    });
  }
}

function startCameraQRScanner() {
  const container = document.getElementById('qr-reader');
  if (!container) return;

  if (typeof Html5Qrcode !== 'undefined') {
    if (html5QrCodeScanner) {
      try { html5QrCodeScanner.stop(); } catch (e) { }
    }
    html5QrCodeScanner = new Html5Qrcode('qr-reader');
    html5QrCodeScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      qrCodeMessage => {
        try { html5QrCodeScanner.stop(); } catch (e) { }
        handleScannedQRCode(qrCodeMessage);
      },
      errorMessage => { }
    ).catch(err => {
      console.warn('Camera notice:', err);
      container.innerHTML = `
        <div style="padding:24px;text-align:center">
          <div style="font-size:36px;margin-bottom:8px">📱</div>
          <p style="font-size:13px;color:var(--text2)">Ready to scan! Use camera or click Upload QR Image below.</p>
        </div>`;
    });
  } else {
    container.innerHTML = `
      <div style="padding:24px;text-align:center">
        <div style="font-size:36px;margin-bottom:8px">📱</div>
        <p style="font-size:13px;color:var(--text2)">Upload your ticket QR code photo below to find winning numbers.</p>
      </div>`;
  }
}

async function processQRImageFile(file) {
  if (typeof Html5Qrcode !== 'undefined') {
    const html5QrCode = new Html5Qrcode('qr-reader');
    try {
      const qrCodeMessage = await html5QrCode.scanFile(file, true);
      if (qrCodeMessage) {
        handleScannedQRCode(qrCodeMessage);
        return;
      }
    } catch (err) {
      console.warn('QR file scan notice:', err);
    }
  }

  toast('No valid QR code detected in this image. Please upload a clear photo of your ticket QR code.', 'warning');
}

function handleScannedQRCode(rawText) {
  closeModal('modal-qr-scanner');
  if (html5QrCodeScanner) {
    try { html5QrCodeScanner.stop(); } catch (e) { }
  }

  if (!rawText || typeof rawText !== 'string') {
    toast('Invalid QR code data', 'warning');
    return;
  }

  let lotteryId = '';
  let number = '';
  let dateStr = '';
  let series = '';

  if (rawText.startsWith('{')) {
    try {
      const obj = JSON.parse(rawText);
      if (obj.number) number = String(obj.number).trim();
      if (obj.lotteryId || obj.lottery) lotteryId = String(obj.lotteryId || obj.lottery).trim();
      if (obj.date || obj.drawDate) dateStr = String(obj.date || obj.drawDate).trim();
      if (obj.series) series = String(obj.series).trim();
    } catch (e) { }
  } else if (rawText.includes('|')) {
    const parts = rawText.split('|');
    if (parts[0]) lotteryId = parts[0].trim();
    if (parts[1]) number = parts[1].trim();
    if (parts[2]) dateStr = parts[2].trim();
  } else {
    const matchNum = rawText.match(/\b\d{4,8}\b/);
    if (matchNum) number = matchNum[0];
  }

  if (!number) {
    toast('No valid ticket number detected in scanned QR code', 'warning');
    return;
  }

  // Populate ticket checker form
  const lotSel = document.getElementById('checker-lottery');
  if (lotSel && lotteryId) {
    const opt = Array.from(lotSel.options).find(o => o.value === lotteryId || o.text.toLowerCase().includes(lotteryId.toLowerCase()));
    if (opt) lotSel.value = opt.value;
  }
  if (dateStr) {
    document.getElementById('checker-date').value = dateStr;
  }
  document.getElementById('checker-number').value = number;
  const serSel = document.getElementById('checker-series');
  if (serSel && series) {
    serSel.value = series.toUpperCase();
  }

  toast(`📱 QR Code Scanned! Checking Ticket #${number}...`, 'success');
  checkTicket();
}

// ─── LOTTERY TYPES MANAGEMENT ──────────────────────────────
function renderLotteryTypesTable() {
  const tbody = document.getElementById('lottery-types-tbody');
  if (!tbody) return;

  const sortSel = document.getElementById('lt-table-sort-order');
  const sortVal = sortSel ? sortSel.value : 'day';
  const types = getLotteryTypes(sortVal, true);

  // Count lotteries per day to identify multiple lotteries on the same day
  const dayCounts = {};
  types.forEach(l => {
    if (l.day) dayCounts[l.day] = (dayCounts[l.day] || 0) + 1;
  });

  tbody.innerHTML = types.map(l => `
    <tr class="${l.hidden ? 'row-hidden' : ''}">
      <td><span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${l.color || '#D4A941'};border:2px solid var(--border)"></span></td>
      <td><code class="mono" style="color:var(--gold-l);font-weight:700">${l.id} (${l.code})</code></td>
      <td>
        <b>${l.name}</b>
        ${l.hidden ? '<span class="pill pill-gray" style="margin-left:6px;font-size:10px;vertical-align:middle">Hidden</span>' : ''}
      </td>
      <td>
        <span class="pill pill-blue">${l.day}</span>
        ${(dayCounts[l.day] > 1) ? `<span class="pill pill-gold" style="font-size:10px;margin-left:4px" title="${dayCounts[l.day]} lotteries scheduled on ${l.day}">Same Day (${dayCounts[l.day]})</span>` : ''}
      </td>
      <td><b style="color:var(--gold-l)">${formatCurrency(l.prize1 || 7000000)}</b></td>
      <td>
        ${l.hidden
          ? '<span class="pill pill-gray" style="font-weight:700">🙈 Hidden</span>'
          : '<span class="pill pill-green" style="font-weight:700">🟢 Active</span>'}
      </td>
      <td style="text-align:right">
        <div class="tact" style="justify-content:flex-end">
          <button class="abtn edit" onclick="editLotteryType('${l.id}')">✏️ Edit</button>
          <button class="abtn same-day" onclick="quickAddSameDayLottery('${escapeHTML(l.day)}')" title="Add another lottery name for ${l.day}">➕ Day</button>
          <button class="abtn ${l.hidden ? 'unhide' : 'hide'}" onclick="toggleHideLotteryType('${l.id}')" title="${l.hidden ? 'Unhide / Show this lottery' : 'Hide this lottery from public site'}">
            ${l.hidden ? '👁️ Show' : '🙈 Hide'}
          </button>
          <button class="abtn del" onclick="deleteLotteryType('${l.id}')" title="Delete this lottery scheme">🗑 Del</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text2);padding:32px">No lottery schemes defined</td></tr>`;
}

function toggleHideLotteryType(id) {
  DB = loadDB();
  if (!DB.customLotteryTypes || !Array.isArray(DB.customLotteryTypes)) {
    DB.customLotteryTypes = LOTTERY_TYPES.map(x => ({ ...x }));
  }
  let item = DB.customLotteryTypes.find(x => x.id === id);
  if (!item) {
    const def = LOTTERY_TYPES.find(x => x.id === id);
    if (def) {
      item = { ...def, hidden: true };
      DB.customLotteryTypes.push(item);
    } else {
      toast(`Lottery scheme ${id} not found`, 'error');
      return;
    }
  } else {
    item.hidden = !item.hidden;
  }

  saveDB(DB);
  if (item.hidden) {
    toast(`🙈 "${item.name}" is now hidden from public site & dropdowns`, 'info');
  } else {
    toast(`👁️ "${item.name}" is now active and visible!`, 'success');
  }
  renderLotteryTypesTable();
  refreshAllLotteryDropdowns();
}

function refreshAllLotteryDropdowns() {
  populatePublicFilters();
  populateLotterySelect('draw-type-filter', 'All Lotteries', true);
  populateLotterySelect('res-lottery-filter', 'All Lotteries', true);
  populateLotterySelect('d-lottery', '', false);
  renderRibbon();
  refreshDashboard();
  if (document.getElementById('page-public')?.classList.contains('active')) {
    renderPublicResults();
  }
}

// ─── SAME DAY MULTIPLE LOTTERY MANAGEMENT ──────────────────
const LOTTERY_COLORS = ['#D4A941', '#E8722A', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B', '#06B6D4', '#EC4899', '#3B82F6'];

function generateLotteryIdFromName(name) {
  if (!name || !name.trim()) return 'LT' + uid().slice(0, 3).toUpperCase();
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

function getRandomLotteryColor(index = 0) {
  return LOTTERY_COLORS[Math.abs(index) % LOTTERY_COLORS.length];
}

/**
 * Programmatic function to add multiple lottery names on the same draw day.
 * @param {string} day - Day of the week (e.g. 'Monday', 'Sunday', 'Bumper Draw')
 * @param {Array<Object>|Object} lotteryList - List of lottery items to add on this day
 */
function addSameDayLottery(day, lotteryList) {
  if (!day) {
    toast('Please specify a draw day', 'warning');
    return false;
  }
  DB = loadDB();
  if (!DB.customLotteryTypes || !Array.isArray(DB.customLotteryTypes)) {
    DB.customLotteryTypes = LOTTERY_TYPES.map(x => ({ ...x }));
  }

  const items = Array.isArray(lotteryList) ? lotteryList : [lotteryList];
  let added = 0;

  items.forEach((item, idx) => {
    if (!item || !item.name || !item.name.trim()) return;
    const name = item.name.trim();
    let baseId = (item.id || item.code || generateLotteryIdFromName(name)).toUpperCase().trim();
    let finalId = baseId;
    let suffix = 1;
    while (DB.customLotteryTypes.some(x => x.id === finalId)) {
      finalId = `${baseId}${++suffix}`;
    }
    const code = (item.code || finalId).toUpperCase().trim();
    const color = item.color || getRandomLotteryColor(DB.customLotteryTypes.length + idx);
    const prize1 = parseFloat(item.prize1) || 7000000;
    const oldName = item.oldName ? item.oldName.trim() : '';
    const hidden = !!item.hidden;

    DB.customLotteryTypes.push({
      id: finalId,
      code,
      name,
      day,
      color,
      prize1,
      oldName,
      hidden
    });
    added++;
  });

  if (added > 0) {
    saveDB(DB);
    toast(`🎉 Successfully added ${added} lottery scheme(s) for ${day}!`, 'success');
    renderLotteryTypesTable();
    refreshAllLotteryDropdowns();
    return true;
  }
  return false;
}
window.addSameDayLottery = addSameDayLottery;

function quickAddSameDayLottery(day) {
  openSameDayModal(day);
}

function openSameDayModal(preselectedDay) {
  const modal = document.getElementById('modal-same-day-lotteries');
  if (!modal) return;

  const daySel = document.getElementById('same-day-select');
  if (daySel && preselectedDay) {
    daySel.value = preselectedDay;
  }

  updateSameDayExistingBadge();
  resetSameDayRows();
  openModal('modal-same-day-lotteries');
}

function updateSameDayExistingBadge() {
  const badge = document.getElementById('same-day-existing-badge');
  const daySel = document.getElementById('same-day-select');
  if (!badge || !daySel) return;

  const day = daySel.value;
  const types = getLotteryTypes('day', true).filter(l => l.day === day);
  if (types.length > 0) {
    const names = types.map(l => `${l.name} (${l.code})${l.hidden ? ' [Hidden]' : ''}`).join(', ');
    badge.innerHTML = `<span class="pill pill-gold" style="font-size:11px">Existing on ${day}: <b>${escapeHTML(names)}</b> (${types.length})</span>`;
  } else {
    badge.innerHTML = `<span class="pill pill-gray" style="font-size:11px">No lotteries registered for ${day} yet</span>`;
  }
}

function resetSameDayRows() {
  const container = document.getElementById('same-day-rows-container');
  if (!container) return;
  container.innerHTML = '';
  // Provide 2 starting rows for multi-lottery entry
  addSameDayRow('', '', 7500000, getRandomLotteryColor(0));
  addSameDayRow('', '', 8000000, getRandomLotteryColor(1));
}

function addSameDayRow(defaultName = '', defaultId = '', defaultPrize = 7500000, defaultColor = '#D4A941') {
  const container = document.getElementById('same-day-rows-container');
  if (!container) return;

  const rowCount = container.children.length;
  const color = defaultColor || getRandomLotteryColor(rowCount);

  const row = document.createElement('div');
  row.className = 'same-day-row';
  row.innerHTML = `
    <div>
      <input type="text" class="finput sm same-day-name" placeholder="Lottery Scheme Name (e.g. Bhagyamithra)" value="${escapeHTML(defaultName)}" required />
    </div>
    <div>
      <input type="text" class="finput sm mono same-day-id" placeholder="Code (e.g. BM)" maxlength="6" value="${escapeHTML(defaultId)}" />
    </div>
    <div>
      <input type="number" step="any" min="1000" class="finput sm mono same-day-prize" placeholder="1st Prize (₹)" value="${defaultPrize || 7500000}" required />
    </div>
    <div>
      <input type="color" class="finput sm same-day-color" value="${color}" style="height:34px;padding:2px;cursor:pointer" title="Scheme Color" />
    </div>
    <div>
      <button type="button" class="btn-remove-row" title="Remove this row" onclick="this.closest('.same-day-row').remove()">✕</button>
    </div>
  `;

  // Auto-generate Code/ID from Scheme Name while typing if not manually edited
  const nameInput = row.querySelector('.same-day-name');
  const idInput = row.querySelector('.same-day-id');
  if (nameInput && idInput) {
    nameInput.addEventListener('input', () => {
      if (!idInput.dataset.manual) {
        idInput.value = generateLotteryIdFromName(nameInput.value);
      }
    });
    idInput.addEventListener('input', () => {
      idInput.dataset.manual = 'true';
      idInput.value = idInput.value.toUpperCase();
    });
  }

  container.appendChild(row);
}

function initSameDayLotteryManager() {
  document.getElementById('add-same-day-lottery-btn')?.addEventListener('click', () => {
    openSameDayModal('Sunday');
  });

  document.getElementById('same-day-select')?.addEventListener('change', () => {
    updateSameDayExistingBadge();
  });

  document.getElementById('btn-add-same-day-row')?.addEventListener('click', () => {
    addSameDayRow();
  });

  const sameDayForm = document.getElementById('same-day-form');
  if (sameDayForm) {
    sameDayForm.addEventListener('submit', e => {
      e.preventDefault();
      const day = document.getElementById('same-day-select').value;
      const rows = document.querySelectorAll('#same-day-rows-container .same-day-row');
      const list = [];

      rows.forEach(row => {
        const name = row.querySelector('.same-day-name')?.value?.trim();
        let id = row.querySelector('.same-day-id')?.value?.trim()?.toUpperCase();
        const prize1 = parseFloat(row.querySelector('.same-day-prize')?.value) || 7000000;
        const color = row.querySelector('.same-day-color')?.value || '#D4A941';

        if (name) {
          if (!id) id = generateLotteryIdFromName(name);
          list.push({ name, id, code: id, prize1, color });
        }
      });

      if (list.length === 0) {
        toast('Please enter at least one lottery scheme name', 'warning');
        return;
      }

      const success = addSameDayLottery(day, list);
      if (success) {
        closeModal('modal-same-day-lotteries');
      }
    });
  }

  // Handle "➕ Save & Add Same Day" button inside single modal
  document.getElementById('lt-save-and-add-same-day')?.addEventListener('click', () => {
    const nameInput = document.getElementById('lt-name');
    if (!nameInput || !nameInput.value.trim()) {
      toast('Please enter a lottery scheme name first', 'warning');
      nameInput?.focus();
      return;
    }

    DB = loadDB();
    if (!DB.customLotteryTypes || !Array.isArray(DB.customLotteryTypes)) {
      DB.customLotteryTypes = LOTTERY_TYPES.map(x => ({ ...x }));
    }

    const name = nameInput.value.trim();
    let id = document.getElementById('lt-id').value.trim().toUpperCase() || generateLotteryIdFromName(name);
    let finalId = id;
    let suffix = 1;
    while (DB.customLotteryTypes.some(x => x.id === finalId)) {
      finalId = `${id}${++suffix}`;
    }
    const code = document.getElementById('lt-code').value.trim().toUpperCase() || finalId;
    const day = document.getElementById('lt-day').value;
    const color = document.getElementById('lt-color').value || getRandomLotteryColor(DB.customLotteryTypes.length);
    const prize1 = parseFloat(document.getElementById('lt-prize1').value) || 7000000;
    const oldName = document.getElementById('lt-oldname')?.value?.trim() || '';
    const hidden = document.getElementById('lt-status')?.value === 'hidden';

    DB.customLotteryTypes.push({
      id: finalId,
      code,
      name,
      day,
      color,
      prize1,
      oldName,
      hidden
    });

    saveDB(DB);
    toast(`🎉 Saved "${name}"! Now enter next lottery name for ${day}...`, 'success');
    renderLotteryTypesTable();
    refreshAllLotteryDropdowns();

    // Reset inputs for next lottery on the same day
    document.getElementById('lt-name').value = '';
    document.getElementById('lt-id').value = '';
    document.getElementById('lt-id').disabled = false;
    document.getElementById('lt-code').value = '';
    if (document.getElementById('lt-oldname')) document.getElementById('lt-oldname').value = '';
    document.getElementById('lt-color').value = getRandomLotteryColor(DB.customLotteryTypes.length);
    nameInput.focus();
  });
}

function initLotteryTypesManager() {
  const sortSel = document.getElementById('lt-table-sort-order');
  if (sortSel) {
    sortSel.addEventListener('change', renderLotteryTypesTable);
  }

  initSameDayLotteryManager();

  const addBtn = document.getElementById('add-lottery-type-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      document.getElementById('lt-modal-title').textContent = 'Add New Lottery Type';
      document.getElementById('lt-form').reset();
      document.getElementById('lt-id-hidden').value = '';
      document.getElementById('lt-id').disabled = false;
      document.getElementById('lt-color').value = '#D4A941';
      const statusSel = document.getElementById('lt-status');
      if (statusSel) statusSel.value = 'active';
      const delBtn = document.getElementById('btn-modal-delete-lottery');
      if (delBtn) delBtn.style.display = 'none';
      openModal('modal-lottery-type');
    });
  }

  const form = document.getElementById('lt-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      DB = loadDB();
      if (!DB.customLotteryTypes || !Array.isArray(DB.customLotteryTypes)) {
        DB.customLotteryTypes = LOTTERY_TYPES.map(x => ({ ...x }));
      }

      const hiddenId = document.getElementById('lt-id-hidden').value.trim();
      const id = document.getElementById('lt-id').value.trim().toUpperCase();
      const code = document.getElementById('lt-code').value.trim().toUpperCase();
      const name = document.getElementById('lt-name').value.trim();
      const day = document.getElementById('lt-day').value;
      const color = document.getElementById('lt-color').value;
      const prize1 = parseFloat(document.getElementById('lt-prize1').value) || 7000000;
      const isHidden = document.getElementById('lt-status')?.value === 'hidden';

      const existingIndex = DB.customLotteryTypes.findIndex(x => x.id === (hiddenId || id));
      const existingItem = existingIndex >= 0 ? DB.customLotteryTypes[existingIndex] : null;
      const hiddenVal = document.getElementById('lt-status') ? isHidden : (existingItem ? !!existingItem.hidden : false);
      const oldName = document.getElementById('lt-oldname')?.value?.trim() || (existingItem ? existingItem.oldName || '' : '');

      const item = { id, code, name, day, color, prize1, oldName, hidden: hiddenVal };

      if (existingIndex >= 0) {
        DB.customLotteryTypes[existingIndex] = item;
      } else {
        DB.customLotteryTypes.push(item);
      }

      saveDB(DB);
      closeModal('modal-lottery-type');
      toast(`🎉 Success! ${name} saved successfully!`, 'success');
      renderLotteryTypesTable();
      refreshAllLotteryDropdowns();
    });
  }
}

function editLotteryType(id) {
  const types = getLotteryTypes('day', true);
  const item = types.find(x => x.id === id);
  if (!item) return;

  document.getElementById('lt-modal-title').textContent = 'Edit Lottery Type';
  document.getElementById('lt-id-hidden').value = item.id;
  document.getElementById('lt-id').value = item.id;
  document.getElementById('lt-id').disabled = true;
  document.getElementById('lt-code').value = item.code || item.id;
  document.getElementById('lt-name').value = item.name;
  document.getElementById('lt-day').value = item.day || 'Monday';
  document.getElementById('lt-color').value = item.color || '#D4A941';
  document.getElementById('lt-prize1').value = item.prize1 || 7000000;
  if (document.getElementById('lt-oldname')) document.getElementById('lt-oldname').value = item.oldName || '';
  const statusSel = document.getElementById('lt-status');
  if (statusSel) statusSel.value = item.hidden ? 'hidden' : 'active';
  const delBtn = document.getElementById('btn-modal-delete-lottery');
  if (delBtn) {
    delBtn.style.display = 'inline-flex';
    delBtn.onclick = () => deleteLotteryType(item.id);
  }
  openModal('modal-lottery-type');
}

function deleteLotteryType(id) {
  if (!id) return;
  DB = loadDB();
  if (!DB.customLotteryTypes || !Array.isArray(DB.customLotteryTypes)) {
    DB.customLotteryTypes = LOTTERY_TYPES.map(x => ({ ...x }));
  }
  const item = DB.customLotteryTypes.find(x => x.id === id);
  const name = item ? item.name : id;
  if (!confirm(`Are you sure you want to delete lottery scheme "${name}" (${id})?`)) return;

  DB.customLotteryTypes = DB.customLotteryTypes.filter(x => x.id !== id);
  saveDB(DB);
  closeModal('modal-lottery-type');
  toast(`🗑 Lottery scheme "${name}" deleted & updated in Firebase and Mobile App!`, 'info');
  renderLotteryTypesTable();
  refreshAllLotteryDropdowns();
  notifyDataChanged();
}

// ─── MODALS ───────────────────────────────────────────────
document.getElementById('modal-bg').addEventListener('click', () => {
  document.querySelectorAll('.modal.on').forEach(m => m.classList.remove('on'));
  document.getElementById('modal-bg').classList.remove('on');
});
document.querySelectorAll('.mcls, [data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.close || btn.closest('.modal')?.id;
    if (t) closeModal(t);
  });
});

// ─── SIDEBAR ──────────────────────────────────────────────
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('on');
}
document.getElementById('menu-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sb-overlay').classList.add('on');
});
document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
document.getElementById('sb-overlay').addEventListener('click', closeSidebar);

// ─── NAV ──────────────────────────────────────────────────
document.querySelectorAll('.nav-btn[data-panel]').forEach(btn => {
  btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
});

// ─── LOGOUT ───────────────────────────────────────────────
document.getElementById('admin-logout').addEventListener('click', () => {
  currentUser = null;
  clearSession();
  clearInterval(cronTimer);
  try {
    history.replaceState(null, '', window.location.pathname);
  } catch (_) {}
  showPublicPortal();
  document.getElementById('login-form').reset();
  toast('Logged out successfully', 'info');
  updateAuthUI();
});

// ─── ACCOUNT SETTINGS & CHANGE PASSWORD ───────────────────
function getActiveAdminUser() {
  DB = loadDB();
  if (currentUser) {
    const match = Security.findUser(currentUser.username, DB.users);
    if (match) {
      return { ...match.user, username: match.plainUsername };
    }
    return currentUser;
  }
  const session = getSavedSession();
  if (session) return session;
  const adminMatch = Security.findUser('admin', DB.users);
  if (adminMatch) return { ...adminMatch.user, username: adminMatch.plainUsername };
  return { username: 'admin', name: 'Admin Officer', password: Security.DEFAULT_ADMIN_PASS, role: 'admin' };
}

function populateAccountSettingsPanel() {
  const user = getActiveAdminUser();
  const nameInp = document.getElementById('panel-acc-name');
  const userInp = document.getElementById('panel-acc-user');
  const passInp = document.getElementById('panel-acc-pass');
  if (nameInp) nameInp.value = user.name || 'Admin Officer';
  if (userInp) userInp.value = user.username || 'admin';
  if (passInp) passInp.value = Security.decrypt(user.password) || '';
  if (typeof populateAdsSettingsPanel === 'function') populateAdsSettingsPanel();
}

function openAccountSettings() {
  populateAccountSettingsPanel();
  const user = getActiveAdminUser();
  const accName = document.getElementById('acc-name');
  const accUser = document.getElementById('acc-user');
  const accPass = document.getElementById('acc-pass');
  if (accName) accName.value = user.name || 'Admin Officer';
  if (accUser) accUser.value = user.username || 'admin';
  if (accPass) accPass.value = Security.decrypt(user.password) || '';
  openModal('modal-account-settings');
}

function saveAccountCredentials(newName, newUser, newPass) {
  newName = (newName || '').trim();
  newUser = (newUser || '').trim();
  newPass = (newPass || '').trim();

  if (!newName || !newUser || !newPass) {
    toast('Please fill all fields', 'warning');
    return false;
  }

  DB = loadDB();
  if (!DB.users) DB.users = {};

  const currentU = getActiveAdminUser();
  const oldUsername = currentU.username;
  const oldMatch = Security.findUser(oldUsername, DB.users);
  if (oldMatch && oldMatch.plainUsername !== newUser) {
    delete DB.users[oldMatch.key];
  }

  const role = currentU.role || 'admin';
  const encKey = Security.encrypt(newUser);
  const encPass = Security.encrypt(newPass);

  DB.users[encKey] = {
    username: encKey,
    password: encPass,
    role: role,
    name: newName
  };
  saveDB(DB);

  currentUser = {
    ...DB.users[encKey],
    username: newUser,
    activePanel: (currentUser && currentUser.activePanel) ? currentUser.activePanel : 'settings'
  };
  saveSession(currentUser, currentUser.activePanel);

  const nameEl = document.getElementById('admin-name');
  if (nameEl) nameEl.textContent = currentUser.name;
  const avEl = document.getElementById('admin-avatar');
  if (avEl) avEl.textContent = currentUser.name[0];

  populateAccountSettingsPanel();
  toast('Admin credentials encrypted & saved successfully!', 'success');
  return true;
}

document.getElementById('btn-change-pw')?.addEventListener('click', openAccountSettings);
document.getElementById('sb-user-card')?.addEventListener('click', () => switchPanel('settings'));

document.getElementById('panel-pw-toggle')?.addEventListener('click', () => {
  const inp = document.getElementById('panel-acc-pass');
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
});

document.getElementById('acc-pw-toggle')?.addEventListener('click', () => {
  const inp = document.getElementById('acc-pass');
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
});

document.getElementById('settings-panel-form')?.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('panel-acc-name')?.value;
  const user = document.getElementById('panel-acc-user')?.value;
  const pass = document.getElementById('panel-acc-pass')?.value;
  saveAccountCredentials(name, user, pass);
});

document.getElementById('form-account-settings')?.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('acc-name')?.value;
  const user = document.getElementById('acc-user')?.value;
  const pass = document.getElementById('acc-pass')?.value;
  if (saveAccountCredentials(name, user, pass)) {
    closeModal('modal-account-settings');
  }
});

// Initial route and session check
handleAppRouting();
if (document.getElementById('checker-date')) {
  document.getElementById('checker-date').value = todayStr();
}

// ─── ANDROID APK INTEGRATION & HARDWARE BACK BUTTON ────────
window.handleAndroidBackButton = function() {
  try {
    // 1. Close open modals first
    const openModals = document.querySelectorAll('.modal.on, .modal.active');
    const modalBg = document.getElementById('modal-bg');
    if (openModals.length > 0 || (modalBg && modalBg.classList.contains('on'))) {
      openModals.forEach(m => m.classList.remove('on', 'active'));
      if (modalBg) modalBg.classList.remove('on');
      return true;
    }

    // 2. If viewing individual lottery result page, go back to public portal
    const indPage = document.getElementById('page-individual-result');
    if (indPage && indPage.classList.contains('active')) {
      showPage('page-public');
      return true;
    }

    // 3. If in admin section, return to dashboard if not already on dashboard
    const adminPage = document.getElementById('page-admin');
    if (adminPage && adminPage.classList.contains('active')) {
      const activePanel = document.querySelector('.panel.active');
      if (activePanel && activePanel.id !== 'panel-dashboard') {
        switchPanel('dashboard');
        return true;
      }
    }
  } catch (err) {
    console.error('Android back button error:', err);
  }
  return false; // Let native Android handle back / exit
};

if (window.Android) {
  document.body.classList.add('android-apk');
  console.log('Running inside Kerala Lottery Android APK native container');
}

// ─── GOOGLE ADS & MONETIZATION MODULE ──────────────────────
const ADS_KEY = 'kerala_lottery_ads';

window.GoogleAds = {
  defaultConfig: {
    enabled: true,
    testMode: false, // Live working AdSense ads mode
    publisherId: 'ca-pub-7334877956926189',
    stickyAd: true,
    interstitialOnVerify: false,
    slots: {
      top: '',
      middle: '',
      indiv: '',
      sticky: ''
    }
  },

  pendingInterstitialCallback: null,

  getConfig() {
    try {
      const raw = localStorage.getItem(ADS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Automatically upgrade demo publisher IDs to user's real publisher ID
        if (!parsed.publisherId || parsed.publisherId === 'ca-pub-1234567890123456') {
          parsed.publisherId = 'ca-pub-7334877956926189';
        }
        return { ...this.defaultConfig, ...parsed };
      }
    } catch (e) {}
    return { ...this.defaultConfig };
  },

  saveConfig(cfg) {
    try {
      localStorage.setItem(ADS_KEY, JSON.stringify(cfg));
      this.init();
      if (typeof CloudSync !== 'undefined' && CloudSync.isEnabled()) {
        CloudSync.pushToCloud();
      }
      return true;
    } catch (e) {
      console.error('Failed to save Ads config:', e);
      return false;
    }
  },

  init() {
    const cfg = this.getConfig();
    if (!cfg.enabled) {
      this.hideAllAds();
      return;
    }

    // Ensure official Google AdSense script tag is present in document head
    const pubId = cfg.publisherId || 'ca-pub-7334877956926189';
    if (!document.getElementById('adsense-script')) {
      const script = document.createElement('script');
      script.id = 'adsense-script';
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(pubId)}`;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    this.renderAllSlots();
  },

  hideAllAds() {
    document.querySelectorAll('.ad-container, .ad-sticky').forEach(el => {
      el.style.display = 'none';
    });
  },

  renderAllSlots() {
    const cfg = this.getConfig();
    if (!cfg.enabled) {
      this.hideAllAds();
      return;
    }

    this.renderSlot('ad-slot-top', cfg.slots?.top, 'horizontal', 'Top Banner Ad');
    this.renderSlot('ad-slot-middle', cfg.slots?.middle, 'responsive', 'Mid-Content Sponsored Ad');
    this.renderSlot('ad-slot-indiv', cfg.slots?.indiv, 'responsive', 'Gazette Result Sponsored Ad');

    // Sticky bottom mobile banner
    const stickyEl = document.getElementById('ad-sticky-bottom');
    if (stickyEl) {
      if (cfg.stickyAd && !stickyEl.classList.contains('hidden')) {
        stickyEl.style.display = 'flex';
        this.renderSlot('ad-slot-sticky', cfg.slots?.sticky, 'horizontal', 'Sticky Mobile Banner Ad');
      } else {
        stickyEl.style.display = 'none';
      }
    }
  },

  renderSlot(targetId, slotId, format = 'auto', title = 'Google Ads') {
    const el = document.getElementById(targetId);
    if (!el) return;

    const cfg = this.getConfig();
    if (!cfg.enabled) {
      el.innerHTML = '';
      const c = el.closest('.ad-container') || el.closest('.ad-sticky');
      if (c) c.style.display = 'none';
      return;
    }

    const container = el.closest('.ad-container') || el.closest('.ad-sticky');
    if (container) {
      container.style.display = container.classList.contains('ad-sticky') ? 'flex' : 'block';
    }

    const pubId = cfg.publisherId || 'ca-pub-7334877956926189';

    if (cfg.testMode) {
      el.innerHTML = `
        <div class="ad-test-box">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="ad-test-badge">Google Ads Test</span>
            <span class="ad-test-text">${escapeHTML(title)}</span>
          </div>
          <div class="ad-test-sub">Slot ID: <code>${escapeHTML(slotId || 'auto')}</code> &bull; Publisher: <code>${escapeHTML(pubId)}</code></div>
        </div>
      `;
    } else {
      const slotAttr = slotId ? `\n             data-ad-slot="${escapeHTML(slotId)}"` : '';
      el.innerHTML = `
        <ins class="adsbygoogle"
             style="display:block;width:100%"
             data-ad-client="${escapeHTML(pubId)}"${slotAttr}
             data-ad-format="${format}"
             data-full-width-responsive="true"></ins>
      `;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        // Quietly catch AdSense push errors if blocked
      }
    }
  },

  showInterstitialAd(callback) {
    const cfg = this.getConfig();
    if (!cfg.enabled || !cfg.interstitialOnVerify) {
      if (typeof callback === 'function') callback();
      return;
    }

    this.pendingInterstitialCallback = callback;
    const slot = document.getElementById('ad-slot-interstitial');
    const pubId = cfg.publisherId || 'ca-pub-7334877956926189';

    if (slot) {
      if (cfg.testMode) {
        slot.innerHTML = `
          <div class="ad-test-box" style="min-height:200px">
            <span class="ad-test-badge" style="margin-bottom:8px">Google AdSense Interstitial</span>
            <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px">Full Screen Sponsored Break</div>
            <div class="ad-test-sub">Client: ${escapeHTML(pubId)}</div>
          </div>
        `;
      } else {
        const slotAttr = cfg.slots?.middle ? `\n               data-ad-slot="${escapeHTML(cfg.slots.middle)}"` : '';
        slot.innerHTML = `
          <ins class="adsbygoogle"
               style="display:block;min-height:220px;width:100%"
               data-ad-client="${escapeHTML(pubId)}"${slotAttr}
               data-ad-format="rectangle"></ins>
        `;
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
      }
    }

    openModal('modal-interstitial-ad');
    const skipBtn = document.getElementById('btn-close-interstitial');
    if (skipBtn) {
      skipBtn.disabled = true;
      let count = 3;
      skipBtn.textContent = `Skip in ${count}s...`;
      const timer = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(timer);
          skipBtn.disabled = false;
          skipBtn.textContent = 'Continue ✕';
        } else {
          skipBtn.textContent = `Skip in ${count}s...`;
        }
      }, 1000);
    }
  },

  closeInterstitial() {
    closeModal('modal-interstitial-ad');
    if (typeof this.pendingInterstitialCallback === 'function') {
      const cb = this.pendingInterstitialCallback;
      this.pendingInterstitialCallback = null;
      cb();
    }
  }
};

function populateAdsSettingsPanel() {
  const cfg = GoogleAds.getConfig();
  const en = document.getElementById('ad-cfg-enabled');
  const tm = document.getElementById('ad-cfg-testmode');
  const pub = document.getElementById('ad-cfg-pubid');
  const sTop = document.getElementById('ad-cfg-slot-top');
  const sMid = document.getElementById('ad-cfg-slot-middle');
  const sInd = document.getElementById('ad-cfg-slot-indiv');
  const sStk = document.getElementById('ad-cfg-slot-sticky');
  const stk = document.getElementById('ad-cfg-sticky');
  const it = document.getElementById('ad-cfg-interstitial');
  const badge = document.getElementById('ads-status-badge');

  if (en) en.checked = !!cfg.enabled;
  if (tm) tm.checked = !!cfg.testMode;
  if (pub) pub.value = cfg.publisherId || '';
  if (sTop) sTop.value = cfg.slots?.top || '';
  if (sMid) sMid.value = cfg.slots?.middle || '';
  if (sInd) sInd.value = cfg.slots?.indiv || '';
  if (sStk) sStk.value = cfg.slots?.sticky || '';
  if (stk) stk.checked = !!cfg.stickyAd;
  if (it) it.checked = !!cfg.interstitialOnVerify;

  if (badge) {
    if (!cfg.enabled) {
      badge.textContent = 'Disabled';
      badge.style.background = 'rgba(239,68,68,0.2)';
      badge.style.color = 'var(--red)';
    } else if (cfg.testMode) {
      badge.textContent = 'Test Mode';
      badge.style.background = 'rgba(212,169,65,0.2)';
      badge.style.color = 'var(--gold-l)';
    } else {
      badge.textContent = 'Live Active';
      badge.style.background = 'rgba(16,185,129,0.2)';
      badge.style.color = 'var(--green-l)';
    }
  }
}

function saveAdsSettingsFromForm() {
  const cfg = {
    enabled: !!document.getElementById('ad-cfg-enabled')?.checked,
    testMode: !!document.getElementById('ad-cfg-testmode')?.checked,
    publisherId: document.getElementById('ad-cfg-pubid')?.value?.trim() || '',
    stickyAd: !!document.getElementById('ad-cfg-sticky')?.checked,
    interstitialOnVerify: !!document.getElementById('ad-cfg-interstitial')?.checked,
    slots: {
      top: document.getElementById('ad-cfg-slot-top')?.value?.trim() || '',
      middle: document.getElementById('ad-cfg-slot-middle')?.value?.trim() || '',
      indiv: document.getElementById('ad-cfg-slot-indiv')?.value?.trim() || '',
      sticky: document.getElementById('ad-cfg-slot-sticky')?.value?.trim() || ''
    }
  };

  GoogleAds.saveConfig(cfg);
  populateAdsSettingsPanel();
  toast('Google Ads configuration saved successfully!', 'success');
}

// Wire Google Ads Event Listeners
document.getElementById('form-ads-settings')?.addEventListener('submit', e => {
  e.preventDefault();
  saveAdsSettingsFromForm();
});

document.getElementById('btn-preview-ads')?.addEventListener('click', () => {
  GoogleAds.renderAllSlots();
  toast('Google Ads slots refreshed & updated', 'info');
});

document.getElementById('btn-close-sticky-ad')?.addEventListener('click', () => {
  const sticky = document.getElementById('ad-sticky-bottom');
  if (sticky) sticky.classList.add('hidden');
});

document.getElementById('btn-close-interstitial')?.addEventListener('click', () => {
  GoogleAds.closeInterstitial();
});

// Initialize Ads on startup
GoogleAds.init();
populateAdsSettingsPanel();

// ============================================================
// CLOUD REAL-TIME SYNC SYSTEM (WEBSITE <-> ANDROID APK CONNECT)
// ============================================================
const CLOUD_SYNC_KEY = 'kl_cloud_sync_config';

var CloudSync = window.CloudSync = {
  config: null,
  pollTimer: null,
  isSyncing: false,
  lastSyncTimestamp: null,

  loadConfig() {
    try {
      const raw = localStorage.getItem(CLOUD_SYNC_KEY);
      if (raw) {
        this.config = JSON.parse(raw);
        return this.config;
      }
    } catch (e) {
      console.warn('Failed to parse CloudSync config:', e);
    }
    // Default config: configured with user's Firebase Project (avtr-899ee)
    this.config = {
      mode: 'firebase',
      firebaseUrl: 'https://avtr-899ee-default-rtdb.firebaseio.com',
      firebaseSecret: '',
      apiUrl: '',
      autoSyncIntervalMs: 10000, // Poll every 10 seconds for real-time responsiveness
      firebaseConfig: {
        apiKey: "AIzaSyDoB1TQlsd9EcOM0xx-LyyPDSCBbxDmMfc",
        authDomain: "avtr-899ee.firebaseapp.com",
        databaseURL: "https://avtr-899ee-default-rtdb.firebaseio.com",
        projectId: "avtr-899ee",
        storageBucket: "avtr-899ee.firebasestorage.app",
        messagingSenderId: "590268537916",
        appId: "1:590268537916:web:1b10ec1e1f5da3fe467739"
      }
    };
    return this.config;
  },

  saveConfig(newCfg) {
    this.config = { ...this.config, ...newCfg };
    try {
      localStorage.setItem(CLOUD_SYNC_KEY, JSON.stringify(this.config));
    } catch (e) {}
    this.updateStatusBadge();
    this.restartPolling();
  },

  isEnabled() {
    if (!this.config) this.loadConfig();
    return this.config && this.config.mode !== 'disabled' && (
      (this.config.mode === 'firebase' && !!this.config.firebaseUrl) ||
      (this.config.mode === 'jsonapi' && !!this.config.apiUrl)
    );
  },

  sseSource: null,

  init() {
    this.loadConfig();
    this.updateStatusBadge();
    this.updatePublicStatusPill('online', 'Connected');

    // Initial pulls on application startup to ensure APK has the freshest web data immediately
    if (this.isEnabled()) {
      setTimeout(() => {
        this.pullFromCloud({ silent: true });
      }, 150);
      setTimeout(() => {
        this.pullFromCloud({ silent: true });
      }, 1500);
      this.restartPolling();
      this.initLiveStream();
    }

    // Refresh cloud data when window comes into focus or re-connected
    window.addEventListener('online', () => {
      this.updatePublicStatusPill('online', 'Connected');
      this.pullFromCloud({ silent: true });
      this.initLiveStream();
    });
    window.addEventListener('offline', () => {
      this.updatePublicStatusPill('offline', 'Offline (Local)');
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isEnabled()) {
        this.pullFromCloud({ silent: true });
      }
    });
    window.addEventListener('focus', () => {
      if (this.isEnabled()) this.pullFromCloud({ silent: true });
    });
  },

  initLiveStream() {
    if (typeof EventSource === 'undefined' || this.config?.mode !== 'firebase' || !this.config?.firebaseUrl) return;
    try {
      if (this.sseSource) {
        try { this.sseSource.close(); } catch (_) {}
        this.sseSource = null;
      }
      const url = this.config.firebaseUrl.trim().replace(/\/+$/, '') + '/kerala_lottery_data.json';
      this.sseSource = new EventSource(url);
      this.sseSource.addEventListener('put', () => {
        this.pullFromCloud({ silent: true });
      });
      this.sseSource.addEventListener('patch', () => {
        this.pullFromCloud({ silent: true });
      });
      this.sseSource.onerror = () => {
        try { if (this.sseSource) this.sseSource.close(); } catch (_) {}
        this.sseSource = null;
      };
    } catch (_) {}
  },

  restartPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.isEnabled()) {
      const interval = Math.max(3000, this.config.autoSyncIntervalMs || 4000);
      this.pollTimer = setInterval(() => {
        this.pullFromCloud({ silent: true });
      }, interval);
    }
  },

  updateStatusBadge() {
    const badge = document.getElementById('cloud-sync-status-badge');
    if (!badge) return;
    if (!this.isEnabled()) {
      badge.textContent = 'Local Standalone';
      badge.style.background = 'rgba(239,68,68,0.2)';
      badge.style.color = 'var(--red)';
    } else if (this.config.mode === 'firebase') {
      badge.textContent = '🔥 Firebase Connected';
      badge.style.background = 'rgba(16,185,129,0.2)';
      badge.style.color = 'var(--green-l)';
    } else {
      badge.textContent = '🌐 Custom API Connected';
      badge.style.background = 'rgba(59,130,246,0.2)';
      badge.style.color = 'var(--blue-l)';
    }
  },

  updatePublicStatusPill(state, text) {
    const dot = document.getElementById('pub-sync-indicator');
    const label = document.getElementById('pub-sync-text');
    if (label && text) label.textContent = text;
    if (dot) {
      if (state === 'syncing') {
        dot.style.background = '#F59E0B'; // Amber
      } else if (state === 'offline' || state === 'error') {
        dot.style.background = '#EF4444'; // Red
      } else {
        dot.style.background = '#10B981'; // Green
      }
    }
  },

  log(msg) {
    const el = document.getElementById('cloud-sync-log');
    if (el) {
      el.style.display = 'block';
      el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    }
  },

  pendingPush: false,
  pendingPushData: null,
  lastLocalEditTimestamp: 0,

  async deleteDrawFromCloud(id) {
    if (!this.isEnabled() || !id) return;
    this.lastLocalEditTimestamp = Date.now();
    if (this.config.mode === 'firebase') {
      try {
        let url = this.config.firebaseUrl.trim().replace(/\/+$/, '');
        let authParam = this.config.firebaseSecret ? `?auth=${encodeURIComponent(this.config.firebaseSecret.trim())}` : '';
        // 1. Delete draw node in Firebase
        await fetch(`${url}/kerala_lottery_data/db/draws/${encodeURIComponent(id)}.json${authParam}`, { method: 'DELETE' });
        // 2. Put tombstone in Firebase so mobile app removes it immediately
        await fetch(`${url}/kerala_lottery_data/db/deletedDrawIds/${encodeURIComponent(id)}.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Date.now())
        });
        // 3. Touch updatedAt in Firebase to trigger SSE put/patch listeners
        await fetch(`${url}/kerala_lottery_data/updatedAt.json${authParam}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(new Date().toISOString())
        });
        this.log(`Deleted draw ${id} and registered tombstone in Firebase.`);
      } catch (e) {
        console.warn('Direct Firebase node delete:', e);
      }
    }
  },

  async pushToCloud(dataToPush = null) {
    if (!this.isEnabled()) return;
    const isMobileApp = (typeof window !== 'undefined' && window.Android && typeof window.Android.isAndroidApp === 'function' && window.Android.isAndroidApp());
    if (isMobileApp && (!currentUser || currentUser.role !== 'admin')) {
      this.log('Mobile app client is read-only; skipping push to cloud.');
      return;
    }

    this.lastLocalEditTimestamp = Date.now();

    // If a request is already in-flight, queue this push so it is never dropped
    if (this.isSyncing) {
      this.pendingPush = true;
      this.pendingPushData = dataToPush || loadDB();
      this.log('Push queued behind in-flight sync...');
      return;
    }

    this.isSyncing = true;
    this.updatePublicStatusPill('syncing', 'Syncing...');

    try {
      const rawDB = dataToPush || loadDB();
      // Exclude users credentials from cloud sync: avoids invalid keys ($, /, #, etc.) that cause HTTP 400 rejection in Firebase
      const safeDB = {
        _v2: true,
        _v5_sync: true,
        _init: true,
        cronTime: rawDB.cronTime || '04:00',
        draws: rawDB.draws || {},
        deletedDrawIds: rawDB.deletedDrawIds || {},
        customLotteryTypes: rawDB.customLotteryTypes || [],
        notifications: rawDB.notifications || []
      };
      const payload = {
        updatedAt: new Date().toISOString(),
        version: 3,
        db: safeDB,
        liveNotice: getLiveNoticeConfig(),
        adsConfig: (typeof GoogleAds !== 'undefined' && GoogleAds.getConfig) ? GoogleAds.getConfig() : null,
        syncSource: isMobileApp ? 'mobile_app' : 'dashboard'
      };

      if (this.config.mode === 'firebase') {
        let url = this.config.firebaseUrl.trim().replace(/\/+$/, '');
        url += '/kerala_lottery_data.json';
        if (this.config.firebaseSecret) {
          url += `?auth=${encodeURIComponent(this.config.firebaseSecret.trim())}`;
        }

        const resp = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!resp.ok) throw new Error(`Firebase HTTP ${resp.status}`);
      } else if (this.config.mode === 'jsonapi') {
        const resp = await fetch(this.config.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error(`API HTTP ${resp.status}`);
      }

      this.lastSyncTimestamp = new Date().toISOString();
      this.updatePublicStatusPill('online', 'Live Connected');
      this.log('Data pushed to Firebase & Mobile App successfully.');
      if (typeof populateMobileSyncPanel === 'function') populateMobileSyncPanel();
    } catch (err) {
      console.warn('CloudSync push failed:', err);
      this.updatePublicStatusPill('error', 'Sync Issue');
      this.log('Push error: ' + err.message);
    } finally {
      this.isSyncing = false;
      if (this.pendingPush) {
        const nextData = this.pendingPushData;
        this.pendingPush = false;
        this.pendingPushData = null;
        setTimeout(() => this.pushToCloud(nextData), 50);
      }
    }
  },

  async pullFromCloud(options = {}) {
    if (!this.isEnabled()) return;
    if (this.isSyncing) return;

    // Do NOT pull if local changes were just made or a push is pending
    if (this.pendingPush || (Date.now() - this.lastLocalEditTimestamp < 5000)) {
      return;
    }

    this.isSyncing = true;
    this.updatePublicStatusPill('syncing', 'Updating...');

    try {
      let remotePayload = null;

      if (this.config.mode === 'firebase') {
        let url = this.config.firebaseUrl.trim().replace(/\/+$/, '');
        url += '/kerala_lottery_data.json';
        if (this.config.firebaseSecret) {
          url += `?auth=${encodeURIComponent(this.config.firebaseSecret.trim())}`;
        }

        const resp = await fetch(url, {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' }
        });

        if (resp.ok) {
          remotePayload = await resp.json();
        } else {
          throw new Error(`Firebase HTTP ${resp.status}`);
        }
      } else if (this.config.mode === 'jsonapi') {
        const resp = await fetch(this.config.apiUrl, {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (resp.ok) {
          remotePayload = await resp.json();
        } else {
          throw new Error(`API HTTP ${resp.status}`);
        }
      }

      // If remote database is completely empty or null, seed Firebase from local published draws (only if admin dashboard, NEVER mobile APK)
      if (!remotePayload || !remotePayload.db) {
        let localDB = loadDB();
        const isMobileApp = (typeof window !== 'undefined' && window.Android && typeof window.Android.isAndroidApp === 'function' && window.Android.isAndroidApp());
        if (!isMobileApp && localDB && localDB.draws && Object.keys(localDB.draws).length > 0) {
          this.log('Cloud database is empty. Auto-seeding with local published draws...');
          this.isSyncing = false;
          await this.pushToCloud(localDB);
          return;
        }
        this.log('Cloud database has no data yet.');
        this.updatePublicStatusPill('online', 'Live Connected');
        return;
      }

      if (remotePayload && remotePayload.db) {
        let localDB = loadDB();
        let dataChanged = false;

        if (!localDB.draws) localDB.draws = {};
        if (!localDB.deletedDrawIds) localDB.deletedDrawIds = {};

        // 1. TOMBSTONES (deletedDrawIds): Unconditionally delete any draw marked as deleted in cloud
        if (remotePayload.db.deletedDrawIds && typeof remotePayload.db.deletedDrawIds === 'object') {
          for (const [delId, ts] of Object.entries(remotePayload.db.deletedDrawIds)) {
            localDB.deletedDrawIds[delId] = ts;
            if (localDB.draws[delId]) {
              delete localDB.draws[delId];
              dataChanged = true;
              this.log(`Deleted draw ${delId} matching cloud tombstone.`);
            }
          }
        }

        // 2. DRAWS SYNCHRONIZATION: Additions, Modifications, AND Deletions
        const remoteDraws = (remotePayload.db.draws && typeof remotePayload.db.draws === 'object') ? remotePayload.db.draws : {};

        // 2a. Prune any local draw that was deleted in cloud (missing from remoteDraws)
        for (const localId of Object.keys(localDB.draws)) {
          if (!remoteDraws[localId]) {
            delete localDB.draws[localId];
            localDB.deletedDrawIds[localId] = Date.now();
            dataChanged = true;
            this.log(`Removed deleted draw ${localId} missing from cloud.`);
          }
        }

        // 2b. Add or update active draws from cloud
        for (const [k, v] of Object.entries(remoteDraws)) {
          if (localDB.deletedDrawIds[k]) {
            delete localDB.deletedDrawIds[k];
          }
          if (JSON.stringify(localDB.draws[k]) !== JSON.stringify(v)) {
            localDB.draws[k] = v;
            dataChanged = true;
          }
        }

        // 2. LOTTERY SCHEMES (customLotteryTypes): additions, modifications & deletions
        if (remotePayload.db.customLotteryTypes && Array.isArray(remotePayload.db.customLotteryTypes)) {
          if (JSON.stringify(localDB.customLotteryTypes) !== JSON.stringify(remotePayload.db.customLotteryTypes)) {
            localDB.customLotteryTypes = remotePayload.db.customLotteryTypes;
            dataChanged = true;
          }
        }

        // 3. NOTIFICATIONS: additions, modifications & deletions
        if (remotePayload.db.notifications && Array.isArray(remotePayload.db.notifications)) {
          if (JSON.stringify(localDB.notifications) !== JSON.stringify(remotePayload.db.notifications)) {
            localDB.notifications = remotePayload.db.notifications;
            dataChanged = true;
          }
        }

        // 4. CRON TIME / SCHEDULER
        if (remotePayload.db.cronTime && localDB.cronTime !== remotePayload.db.cronTime) {
          localDB.cronTime = remotePayload.db.cronTime;
          dataChanged = true;
        }

        // 5. PROTECT AND PRESERVE USERS
        if (!localDB.users || Object.keys(localDB.users).length === 0) {
          if (remotePayload.db.users && Object.keys(remotePayload.db.users).length > 0) {
            localDB.users = remotePayload.db.users;
            dataChanged = true;
          } else {
            localDB.users = initDB().users;
            dataChanged = true;
          }
        }

        // 6. SYNC LIVE NOTICE ANNOUNCEMENT BANNER
        if (remotePayload.liveNotice) {
          const curNotice = getLiveNoticeConfig();
          if (JSON.stringify(curNotice) !== JSON.stringify(remotePayload.liveNotice)) {
            saveLiveNoticeConfig(remotePayload.liveNotice, false);
          }
        }

        // 7. SYNC GOOGLE ADS SETTINGS
        if (remotePayload.adsConfig && typeof GoogleAds !== 'undefined') {
          const curAds = GoogleAds.getConfig();
          if (JSON.stringify(curAds) !== JSON.stringify(remotePayload.adsConfig)) {
            try {
              localStorage.setItem(ADS_KEY, JSON.stringify(remotePayload.adsConfig));
              GoogleAds.init();
            } catch (_) {}
          }
        }

        if (dataChanged) {
          try {
            localStorage.setItem(DB_KEY, JSON.stringify(localDB));
          } catch (e) {}
          notifyDataChanged();
          if (!options.silent) {
            toast('Updated latest lottery results from cloud!', 'success');
          }
          this.log(`Downloaded fresh cloud data (${Object.keys(localDB.draws || {}).length} draws)`);
        } else {
          this.log('Cloud database is already up to date.');
          if (!options.silent) {
            toast('All lottery results are up to date!', 'info');
          }
        }

        this.lastSyncTimestamp = new Date().toISOString();
        this.updatePublicStatusPill('online', 'Live Connected');
        if (typeof populateMobileSyncPanel === 'function') populateMobileSyncPanel();
      }
    } catch (err) {
      console.warn('CloudSync pull failed:', err);
      this.updatePublicStatusPill('offline', 'Offline (Local)');
      this.log('Pull error: ' + err.message);
      if (!options.silent) {
        toast('Could not connect to cloud server: ' + err.message, 'error');
      }
    } finally {
      this.isSyncing = false;
    }
  }
};

// ─── LIVE NOTICE & ANNOUNCEMENT SYSTEM ────────────────────
const LIVE_NOTICE_KEY = 'kl_live_notice_config';

function getLiveNoticeConfig() {
  try {
    const raw = localStorage.getItem(LIVE_NOTICE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    badge: '🔴 LIVE UPDATE',
    text: "Official Kerala State Lottery draw results updated in real-time. Check today's winning numbers.",
    active: true
  };
}

function saveLiveNoticeConfig(cfg, pushToCloudNow = true) {
  try {
    localStorage.setItem(LIVE_NOTICE_KEY, JSON.stringify(cfg));
  } catch (_) {}
  renderLiveNoticeUI();
  if (pushToCloudNow && typeof CloudSync !== 'undefined' && CloudSync.isEnabled()) {
    CloudSync.pushToCloud();
  }
}

function renderLiveNoticeUI() {
  const cfg = getLiveNoticeConfig();
  const banner = document.getElementById('pub-live-notice');
  const badgeEl = document.getElementById('pub-notice-badge');
  const textEl = document.getElementById('pub-notice-text');
  if (banner && badgeEl && textEl) {
    badgeEl.textContent = cfg.badge || '🔴 LIVE UPDATE';
    textEl.textContent = cfg.text || '';
    banner.style.display = (cfg.active && cfg.text) ? 'flex' : 'none';
  }
}

// ─── MOBILE APP & CLOUD SYNC PANEL ────────────────────────
function populateMobileSyncPanel() {
  const cfg = CloudSync.loadConfig();
  const db = loadDB();
  const totalDraws = Object.keys(db.draws || {}).length;

  const countEl = document.getElementById('mobile-sync-draws-count');
  if (countEl) countEl.textContent = totalDraws;

  const lastTimeEl = document.getElementById('mobile-sync-last-time');
  if (lastTimeEl) {
    lastTimeEl.textContent = CloudSync.lastSyncTimestamp ? new Date(CloudSync.lastSyncTimestamp).toLocaleTimeString() : 'Ready';
  }

  const engineLabel = document.getElementById('mobile-sync-engine-label');
  if (engineLabel) {
    engineLabel.textContent = cfg.mode === 'firebase' ? 'Firebase Realtime DB (avtr-899ee)' : (cfg.mode === 'jsonapi' ? 'Custom REST API' : 'Local Standalone');
  }

  const statusPill = document.getElementById('mobile-sync-status-pill');
  if (statusPill) {
    statusPill.textContent = CloudSync.isEnabled() ? 'Connected & Active' : 'Offline / Standalone';
    statusPill.style.background = CloudSync.isEnabled() ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)';
    statusPill.style.color = CloudSync.isEnabled() ? 'var(--green-l)' : 'var(--red)';
  }

  // Populate Notice Editor form
  const noticeCfg = getLiveNoticeConfig();
  const inpBadge = document.getElementById('inp-notice-badge');
  const inpText = document.getElementById('inp-notice-text');
  const chkActive = document.getElementById('chk-notice-active');
  if (inpBadge) inpBadge.value = noticeCfg.badge || '🔴 LIVE UPDATE';
  if (inpText) inpText.value = noticeCfg.text || '';
  if (chkActive) chkActive.checked = !!noticeCfg.active;

  // Environment badge & server URL
  const envBadge = document.getElementById('mobile-env-badge');
  const inpServerUrl = document.getElementById('inp-mobile-server-url');
  const isNative = typeof window.Android !== 'undefined' && window.Android.isAndroidApp && window.Android.isAndroidApp();
  if (envBadge) {
    envBadge.textContent = isNative ? '📱 Android APK WebView' : '🌐 Web Browser';
    envBadge.style.background = isNative ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)';
    envBadge.style.color = isNative ? 'var(--green-l)' : 'var(--blue-l)';
  }
  if (inpServerUrl) {
    if (isNative && window.Android.getServerUrl) {
      inpServerUrl.value = window.Android.getServerUrl() || '';
    } else {
      inpServerUrl.value = localStorage.getItem('kl_custom_server_url') || '';
    }
  }
}

function populateCloudSyncPanel() {
  const cfg = CloudSync.loadConfig();
  const modeSelect = document.getElementById('cloud-sync-mode');
  const fbBlock = document.getElementById('cfg-firebase-block');
  const apiBlock = document.getElementById('cfg-jsonapi-block');
  const fbUrl = document.getElementById('cloud-fb-url');
  const fbSecret = document.getElementById('cloud-fb-secret');
  const apiUrl = document.getElementById('cloud-api-url');

  if (modeSelect) modeSelect.value = cfg.mode || 'firebase';
  if (fbUrl) fbUrl.value = cfg.firebaseUrl || '';
  if (fbSecret) fbSecret.value = cfg.firebaseSecret || '';
  if (apiUrl) apiUrl.value = cfg.apiUrl || '';

  const updateVisibleBlocks = () => {
    const curMode = modeSelect ? modeSelect.value : 'firebase';
    if (fbBlock) fbBlock.style.display = curMode === 'firebase' ? 'flex' : 'none';
    if (apiBlock) apiBlock.style.display = curMode === 'jsonapi' ? 'flex' : 'none';
  };

  modeSelect?.addEventListener('change', updateVisibleBlocks);
  updateVisibleBlocks();
  CloudSync.updateStatusBadge();
}

function saveCloudSyncFromForm() {
  const mode = document.getElementById('cloud-sync-mode')?.value || 'firebase';
  const firebaseUrl = document.getElementById('cloud-fb-url')?.value?.trim() || '';
  const firebaseSecret = document.getElementById('cloud-fb-secret')?.value?.trim() || '';
  const apiUrl = document.getElementById('cloud-api-url')?.value?.trim() || '';

  CloudSync.saveConfig({
    mode,
    firebaseUrl,
    firebaseSecret,
    apiUrl
  });

  toast('Cloud Real-Time Sync configuration saved!', 'success');
  CloudSync.pushToCloud();
  populateMobileSyncPanel();
}

// Event bindings
document.getElementById('form-cloud-sync')?.addEventListener('submit', e => {
  e.preventDefault();
  saveCloudSyncFromForm();
});

document.getElementById('btn-cloud-push-now')?.addEventListener('click', () => {
  CloudSync.pushToCloud();
  toast('Uploading local lottery data to cloud...', 'info');
});

document.getElementById('btn-cloud-pull-now')?.addEventListener('click', () => {
  CloudSync.pullFromCloud({ silent: false });
});

document.getElementById('pub-sync-status-btn')?.addEventListener('click', () => {
  CloudSync.pullFromCloud({ silent: false });
  toast('Checking cloud for newly published lottery results...', 'info');
});

// Live notice form submit
document.getElementById('form-live-notice')?.addEventListener('submit', e => {
  e.preventDefault();
  const badge = document.getElementById('inp-notice-badge')?.value?.trim() || '🔴 LIVE UPDATE';
  const text = document.getElementById('inp-notice-text')?.value?.trim() || '';
  const active = !!document.getElementById('chk-notice-active')?.checked;
  saveLiveNoticeConfig({ badge, text, active }, true);
  toast('Live Notice announcement broadcasted to mobile app!', 'success');
});

// Push all to mobile app button
document.getElementById('btn-mobile-sync-push-all')?.addEventListener('click', () => {
  CloudSync.pushToCloud();
  toast('Broadcasting all latest lottery results to mobile apps...', 'info');
  populateMobileSyncPanel();
});

// Pull from cloud button in mobile sync panel
document.getElementById('btn-mobile-sync-pull-all')?.addEventListener('click', () => {
  CloudSync.pullFromCloud({ silent: false });
  populateMobileSyncPanel();
});

// Save Server URL
document.getElementById('btn-save-server-url')?.addEventListener('click', () => {
  const url = document.getElementById('inp-mobile-server-url')?.value?.trim() || '';
  if (typeof window.Android !== 'undefined' && window.Android.setServerUrl) {
    window.Android.setServerUrl(url);
  } else {
    localStorage.setItem('kl_custom_server_url', url);
  }
  toast(url ? 'Saved server URL for Mobile App!' : 'Reset to local offline mode', 'success');
  populateMobileSyncPanel();
});

document.getElementById('btn-reset-server-url')?.addEventListener('click', () => {
  const inp = document.getElementById('inp-mobile-server-url');
  if (inp) inp.value = '';
  if (typeof window.Android !== 'undefined' && window.Android.setServerUrl) {
    window.Android.setServerUrl('');
  } else {
    localStorage.removeItem('kl_custom_server_url');
  }
  toast('Mobile App reset to local offline assets', 'info');
  populateMobileSyncPanel();
});

// Goto dashboard from public portal
document.getElementById('btn-goto-dashboard')?.addEventListener('click', () => {
  if (currentUser) {
    loadAdmin(currentUser.activePanel || 'dashboard');
  } else {
    showPage('page-login');
  }
});

// Refresh live notice button
document.getElementById('pub-notice-refresh')?.addEventListener('click', () => {
  CloudSync.pullFromCloud({ silent: false });
});

// Start CloudSync and Render Notice
CloudSync.init();
populateCloudSyncPanel();
populateMobileSyncPanel();
renderLiveNoticeUI();

// Initialize Row / Column Layout Toggles
initLayoutToggle('toggle-recent-draws-layout', 'kl_layout_recent_draws', 'recent-draws', 'rows', () => {
  refreshDashboard();
});
initLayoutToggle('toggle-res-layout', 'kl_layout_results', 'results-cards-grid', 'cols', () => {
  renderResultCards();
});
initLayoutToggle('toggle-pub-layout', 'kl_layout_pub_results', 'pub-results-grid', 'cols', () => {
  renderPublicResults();
});




