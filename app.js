/* MICU HANDOVER — daily morning and evening ICU handover
   Data: Firebase (Auth + Firestore). Without a Firebase config it runs in demo mode on this device. */

const CFG = window.HANDOVER_CONFIG || {};
const DEMO = !(CFG.firebase && CFG.firebase.apiKey) || !!CFG.forceDemo;
const APP_VERSION = '3.3.1';

/* ---------------- small helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
function toISO(dt) { return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`; }
function addDays(s, n) { const d = parseISO(s); d.setUTCDate(d.getUTCDate() + n); return toISO(d); }
function diffDays(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 864e5); }
function validISO(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || ''); }
function fmtShort(s) { if (!validISO(s)) return ''; const [y, m, d] = s.split('-'); return `${d}.${m}.${y.slice(2)}`; }
function fmtNice(s) { return parseISO(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
function fmtDM(s) { return parseISO(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }); }
function ordinal(n) { const j = n % 10, k = n % 100; if (j === 1 && k !== 11) return 'ST'; if (j === 2 && k !== 12) return 'ND'; if (j === 3 && k !== 13) return 'RD'; return 'TH'; }
const sidOf = (date, hhmm) => `${date}-${hhmm}`;
const sidDate = sid => String(sid || '').slice(0, 10);
const sidHM = sid => { const t = String(sid || '').slice(11, 15); return /^\d{4}$/.test(t) ? t : '0800'; };
function fmtClock(hhmm) { let h = +hhmm.slice(0, 2); const m = hhmm.slice(2, 4), ap = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; return `${h}:${m} ${ap}`; }
function fmtSid(sid) { return `${fmtNice(sidDate(sid))} · ${fmtClock(sidHM(sid))}`; }
function fmtSidShort(sid) { return `${fmtDM(sidDate(sid))}, ${fmtClock(sidHM(sid))}`; }
function fmtTime(ms) { if (!ms) return ''; const d = new Date(ms); return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function newId() { return (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Date.now().toString(36) + Math.random().toString(36).slice(2)).slice(0, 20); }
function htmlToText(h) {
  const d = document.createElement('div');
  d.innerHTML = String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|p)>/gi, '\n');
  return (d.textContent || '').replace(/ /g, ' ').trim();
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function naturalCmp(a, b) { return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }); }

/* ---------------- icons ---------------- */
const IC = {
  logo: '<path d="M9 3h6v4H9z"/><path d="M8 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M12 11v6M9 14h6"/>',
  left: '<path d="m15 18-6-6 6-6"/>', up: '<path d="m18 15-6-6-6 6"/>', right: '<path d="m9 18 6-6-6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>', copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>', bed: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>', clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>', upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-7"/>', lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>'
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;

/* ---------------- constants ---------------- */
const THEMES = [
  { id: 'pastel', name: 'Pastel', c: ['#f3f5fb', '#4f6bed', '#ffffff'] },
  { id: 'mint', name: 'Mint', c: ['#edf8f3', '#0f9a72', '#ffffff'] },
  { id: 'peach', name: 'Peach', c: ['#fdf2ec', '#e0662e', '#ffffff'] },
  { id: 'lavender', name: 'Lavender', c: ['#f3f0fc', '#7451e0', '#ffffff'] },
  { id: 'ocean', name: 'Deep Ocean', c: ['#0d2540', '#4cc3ff', '#143456'] },
  { id: 'plum', name: 'Deep Plum', c: ['#251330', '#ef7fd0', '#33193f'] },
  { id: 'forest', name: 'Deep Forest', c: ['#10251c', '#5fe0a2', '#173327'] },
  { id: 'night', name: 'Night', c: ['#121418', '#7aa2ff', '#1b1e24'] },
  { id: 'midnight', name: 'Midnight', c: ['#000000', '#b693ff', '#0e0f12'] }
];
const FONTS = { Lato: "'Lato',system-ui,sans-serif", Roboto: "'Roboto',system-ui,sans-serif", Poppins: "'Poppins',system-ui,sans-serif", System: "system-ui,-apple-system,'Segoe UI',sans-serif" };
const OUTCOMES = [
  { id: 'active', label: 'Still in ICU' }, { id: 'discharged', label: 'Discharged' }, { id: 'ward', label: 'Shifted to ward' },
  { id: 'dama', label: 'DAMA' }, { id: 'death', label: 'Death' }, { id: 'transfer', label: 'Transferred' }
];
const DEFAULT_CATEGORIES = [
  { id: 'sepsis', name: 'Sepsis / Shock', color: '#e5484d' }, { id: 'resp', name: 'Respiratory', color: '#3b82f6' },
  { id: 'cardiac', name: 'Cardiac', color: '#d6409f' }, { id: 'renal', name: 'Renal / Metabolic', color: '#f59e0b' },
  { id: 'neuro', name: 'Neuro / Trauma', color: '#8b5cf6' }, { id: 'infection', name: 'Dengue / Infection', color: '#10b981' },
  { id: 'postop', name: 'Post-op', color: '#0ea5e9' }, { id: 'other', name: 'Other', color: '#64748b' }
];
const DEFAULT_SOURCES = ['ER', 'WARD/CABIN'];
const DEFAULT_DX_TAGS = ['SEPSIS', 'SEPTIC SHOCK', 'B/L PNEUMONIA', 'ASPIRATION PNEUMONIA', 'ARDS', 'TYPE 1 RF', 'TYPE 2 RF', 'AKI', 'CKD', 'DKA', 'DM', 'HTN', 'IHD', 'CHRONIC AF', 'COPD', 'BRONCHIAL ASTHMA', 'STROKE', 'HEAD INJURY', 'DENGUE SHOCK SYNDROME', 'UROSEPSIS', 'CARDIOGENIC SHOCK', 'HYPONATRAEMIA', 'HYPOKALAEMIA', 'HYPOTHYROIDISM', 'MODS', 'METABOLIC ACIDOSIS'];
const DEFAULT_ABX_TAGS = ['MERO', 'MOXI', 'LEVO', 'CEFTAZIDIME-AVIBACTAM', 'COLISTIN', 'TIGECYCLINE', 'CLINDA', 'PIP-TAZO', 'VANCO', 'LINEZOLID', 'CEFTRIAXONE', 'AZITHRO', 'METRO'];
const DEFAULT_DRUG_TAGS = ['CLEXANE', 'LASIX', 'ASPIRIN', 'CLOPID', 'DIGOXIN', 'THYROX', 'AMIODARONE', 'PANTO', 'INSULIN', 'NORAD'];
const DEFAULT_SETTINGS = () => ({ beds: (CFG.defaultBeds || []).slice(), categories: clone(DEFAULT_CATEGORIES), sources: DEFAULT_SOURCES.slice(), consultants: [], dxTags: DEFAULT_DX_TAGS.slice(), abxTags: DEFAULT_ABX_TAGS.slice(), drugTags: DEFAULT_DRUG_TAGS.slice() });
const RICH_FIELDS = ['diagnosis', 'investigations', 'history', 'plan', 'drugs'];
const isAdminEmail = e => (CFG.adminEmails || []).map(x => x.toLowerCase()).includes(String(e || '').toLowerCase());

/* ---------------- prefs (per device) ---------------- */
const PREF_KEY = 'handover-prefs-v3';
const DEFAULT_PREFS = { theme: 'pastel', font: 'Lato', weight: '400', fontSize: 16, cardSize: 'm', sort: 'bed', exportFont: 'Calibri', exportSize: 10, includeLeft: true, printInterim: false };
function loadPrefs() { try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch { return { ...DEFAULT_PREFS }; } }

/* ---------------- state ---------------- */
const S = {
  store: null, user: null, profile: null, settings: DEFAULT_SETTINGS(),
  date: todayISO(), sid: null, sheetList: [], listReady: false, sheet: undefined, entries: [], prevInfo: null,
  prefs: loadPrefs(), search: '', subs: [], sheetUnsub: null, mainOn: false, online: navigator.onLine
};
const isAdmin = () => S.profile && S.profile.role === 'admin' && S.profile.status === 'approved';
const catOf = () => ({ id: 'other', name: '', color: 'var(--primary)' });
const catOfOld = id => S.settings.categories.find(c => c.id === id) || S.settings.categories.find(c => c.id === 'other') || { id: 'other', name: 'Other', color: '#64748b' };

function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(S.prefs)); } catch { } applyPrefs(); }
function applyPrefs() {
  const r = document.documentElement, p = S.prefs;
  r.dataset.theme = p.theme;
  r.style.setProperty('--font', FONTS[p.font] || FONTS.Lato);
  r.style.setProperty('--fw', p.weight);
  r.style.setProperty('--fs', p.fontSize + 'px');
  const t = THEMES.find(x => x.id === p.theme) || THEMES[0];
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t.c[0];
}

/* ---------------- toast ---------------- */
let toastT;
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }

/* =================================================================
   DATA STORES
   ================================================================= */
class DemoStore {
  constructor() {
    this.key = 'handover-demo-v6'; this.mem = null; this.listeners = new Set();
    try { this.mem = JSON.parse(localStorage.getItem(this.key) || 'null'); } catch { }
    if (!this.mem) this.mem = demoSeed();
    this.mem.logs ||= {};
  }
  persist() { try { localStorage.setItem(this.key, JSON.stringify(this.mem)); } catch { } this.listeners.forEach(f => f()); }
  async init() { }
  onAuth(cb) { setTimeout(() => cb({ uid: 'demo-admin', email: 'demo@handover.local', name: 'Demo Admin', emailVerified: true }), 0); return () => { }; }
  async ensureProfile(u) { return clone(this.mem.users.find(x => x.uid === u.uid)); }
  watchProfile(uid, cb) { const f = () => { const u = this.mem.users.find(x => x.uid === uid); if (u) cb(clone(u)); }; this.listeners.add(f); return () => this.listeners.delete(f); }
  watchSettings(cb) { const f = () => cb(this.mem.settings || null); f(); this.listeners.add(f); return () => this.listeners.delete(f); }
  async saveSettings(s) { this.mem.settings = { ...(this.mem.settings || {}), ...clone(s) }; this.persist(); }
  watchSheet(sid, cb) {
    const f = () => cb(this.mem.sheets[sid] ? clone(this.mem.sheets[sid]) : null, Object.values(clone(this.mem.entries[sid] || {})));
    setTimeout(f, 0); this.listeners.add(f); return () => this.listeners.delete(f);
  }
  watchSheetList(cb) {
    const f = () => cb(Object.keys(this.mem.sheets).sort().reverse().map(k => ({ sid: k, ...clone(this.mem.sheets[k]) })));
    setTimeout(f, 0); this.listeners.add(f); return () => this.listeners.delete(f);
  }
  async latestSheetBefore(sid) {
    const d = Object.keys(this.mem.sheets).filter(x => x < sid).sort().pop();
    return d ? { sid: d, date: sidDate(d), entries: Object.values(clone(this.mem.entries[d] || {})) } : null;
  }
  async getSheet(sid) { return this.mem.sheets[sid] ? { sid, date: sidDate(sid), sheet: clone(this.mem.sheets[sid]), entries: Object.values(clone(this.mem.entries[sid] || {})) } : null; }
  addLogs(date, logs) { (this.mem.logs[date] ||= []).push(...(logs || []).map(clone)); }
  async createSheet(sid, meta, entries, logs) {
    this.mem.sheets[sid] = { ...meta, sid, date: sidDate(sid) }; this.mem.entries[sid] = {};
    entries.forEach(e => { this.mem.entries[sid][e.id] = clone(e); });
    this.addLogs(sid, logs); this.persist();
  }
  async importSheet(sid, meta, entries, removeIds, logs) {
    const date = sid;
    this.mem.sheets[date] = { ...(this.mem.sheets[date] || {}), ...meta, sid, date: sidDate(sid) };
    const m = (this.mem.entries[date] ||= {});
    removeIds.forEach(id => delete m[id]); entries.forEach(e => { m[e.id] = clone(e); });
    this.addLogs(date, logs); this.persist();
  }
  async saveSheetMeta(sid, patch) { this.mem.sheets[sid] = { ...(this.mem.sheets[sid] || { sid, date: sidDate(sid) }), ...patch }; this.persist(); }
  async saveEntry(date, e, log) { (this.mem.entries[date] ||= {})[e.id] = clone(e); Object.assign(this.mem.sheets[date], { updatedAt: Date.now(), updatedBy: e.updatedBy }); this.addLogs(date, log ? [log] : []); this.persist(); }
  async deleteEntry(date, id, log) { delete (this.mem.entries[date] || {})[id]; Object.assign(this.mem.sheets[date] || {}, { updatedAt: Date.now() }); this.addLogs(date, log ? [log] : []); this.persist(); }
  async deleteSheet(date) { delete this.mem.sheets[date]; delete this.mem.entries[date]; delete this.mem.logs[date]; this.persist(); }
  async getLog(date) { return clone(this.mem.logs[date] || []).sort((a, b) => b.at - a.at); }
  async listPatients() {
    const map = {};
    Object.keys(this.mem.entries).sort().forEach(d => Object.values(this.mem.entries[d]).forEach(e => {
      const p = map[e.id] ||= { id: e.id, sheets: [] };
      Object.assign(p, patientSummary(d, e)); p.sheets.push(d);
      if (e.outcome !== 'active') p.outcomeDate = sidDate(d);
    }));
    return Object.values(map).map(p => ({ ...p, lastSheet: p.sheets[p.sheets.length - 1] }));
  }
  async getPatient(id) { return (await this.listPatients()).find(p => p.id === id) || null; }
  async loadRange(from, to) {
    return Object.keys(this.mem.sheets).filter(d => sidDate(d) >= from && sidDate(d) <= to).sort()
      .map(d => ({ sid: d, date: sidDate(d), sheet: clone(this.mem.sheets[d]), entries: Object.values(clone(this.mem.entries[d] || {})) }));
  }
  async sheetsSince(from) { return Object.keys(this.mem.sheets).filter(d => sidDate(d) >= from).sort().map(d => ({ sid: d, ...clone(this.mem.sheets[d]) })); }
  async rGet(col, id) { return clone(((this.mem.research || {})[col] || {})[id] || null); }
  async rSet(col, id, data) { ((this.mem.research ||= {})[col] ||= {})[id] = clone(data); this.persist(); }
  async rDel(col, id) { delete ((this.mem.research || {})[col] || {})[id]; this.persist(); }
  async rList(col, field, val) { return Object.values(clone((this.mem.research || {})[col] || {})).filter(d => !field || d[field] === val); }
  async listUsers() { return clone(this.mem.users); }
  async setUser(uid, patch) { const u = this.mem.users.find(x => x.uid === uid); if (u) Object.assign(u, clone(patch)); this.persist(); }
  async signOut() { toast('Demo mode: sign-out is turned off'); }
}

function patientSummary(sid, e) {
  const date = sidDate(sid);
  return { id: e.id, name: e.name || '', age: e.age || '', uhid: e.uhid || '', bed: e.bed || '', category: e.category || 'other', doa: e.doa || '', micuDate: e.micuDate || '', consultant: e.consultant || '', diagnosisText: htmlToText(e.diagnosis).slice(0, 600), outcome: e.outcome || 'active', outcomeDate: e.outcome && e.outcome !== 'active' ? date : '', lastSheet: sid, updatedAt: Date.now() };
}

class FirebaseStore {
  async init() {
    const fb = this.fb = await import('./lib/firebase.js');
    this.app = fb.initializeApp(CFG.firebase);
    this.auth = fb.getAuth(this.app);
    try { this.db = fb.initializeFirestore(this.app, { localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() }) }); }
    catch (e) { console.warn('offline cache unavailable', e); this.db = fb.getFirestore(this.app); }
  }
  mapUser(u) { return u ? { uid: u.uid, email: u.email, name: u.displayName || '', emailVerified: u.emailVerified } : null; }
  onAuth(cb) { return this.fb.onAuthStateChanged(this.auth, u => cb(this.mapUser(u))); }
  signIn(e, p) { return this.fb.signInWithEmailAndPassword(this.auth, e, p); }
  async signUp(name, e, p) {
    this.pendingName = name;
    const c = await this.fb.createUserWithEmailAndPassword(this.auth, e, p);
    try { await this.fb.updateProfile(c.user, { displayName: name }); } catch { }
    return c;
  }
  resetPassword(e) { return this.fb.sendPasswordResetEmail(this.auth, e); }
  signOut() { return this.fb.signOut(this.auth); }
  resendVerification() { return this.fb.sendEmailVerification(this.auth.currentUser); }
  async reloadUser() { const u = this.auth.currentUser; await u.reload(); await u.getIdToken(true); return this.mapUser(this.auth.currentUser); }
  uref(uid) { return this.fb.doc(this.db, 'users', uid); }
  async ensureProfile(user) {
    const { getDoc, setDoc } = this.fb;
    const snap = await getDoc(this.uref(user.uid));
    if (snap.exists()) return snap.data();
    const name = user.name || this.pendingName || user.email.split('@')[0];
    if (isAdminEmail(user.email)) {
      const p = { uid: user.uid, email: user.email, name, role: 'admin', status: 'approved', createdAt: Date.now() };
      await setDoc(this.uref(user.uid), p); return p;
    }
    const p = { uid: user.uid, email: user.email, name, role: 'mo', status: 'pending', createdAt: Date.now() };
    await setDoc(this.uref(user.uid), p); return p;
  }
  watchProfile(uid, cb) { return this.fb.onSnapshot(this.uref(uid), s => cb(s.exists() ? s.data() : null), e => console.warn(e)); }
  watchSettings(cb) { return this.fb.onSnapshot(this.fb.doc(this.db, 'settings', 'main'), s => cb(s.exists() ? s.data() : null), e => console.warn(e)); }
  saveSettings(s) { return this.fb.setDoc(this.fb.doc(this.db, 'settings', 'main'), clone(s), { merge: true }); }
  sref(date) { return this.fb.doc(this.db, 'sheets', date); }
  eref(date, id) { return this.fb.doc(this.db, 'sheets', date, 'entries', id); }
  pref(id) { return this.fb.doc(this.db, 'patients', id); }
  lref(date) { return this.fb.doc(this.fb.collection(this.db, 'sheets', date, 'log')); }
  watchSheet(date, cb) {
    const { onSnapshot, collection } = this.fb;
    let sheet, entries, gotS = false, gotE = false;
    const fire = () => { if (gotS && gotE) cb(sheet, entries); };
    const onErr = e => { console.warn(e); toast('Could not load: ' + (e.code || e.message)); };
    const u1 = onSnapshot(this.sref(date), s => { sheet = s.exists() ? s.data() : null; gotS = true; fire(); }, onErr);
    const u2 = onSnapshot(collection(this.db, 'sheets', date, 'entries'), q => { entries = q.docs.map(d => d.data()); gotE = true; fire(); }, onErr);
    return () => { u1(); u2(); };
  }
  watchSheetList(cb) {
    const { onSnapshot, query, collection, orderBy, limit } = this.fb;
    return onSnapshot(query(collection(this.db, 'sheets'), orderBy('sid', 'desc'), limit(400)), q => cb(q.docs.map(d => ({ sid: d.id, ...d.data() }))), e => { console.warn(e); toast('Could not load handovers: ' + (e.code || e.message)); });
  }
  async entriesOf(date) { const es = await this.fb.getDocs(this.fb.collection(this.db, 'sheets', date, 'entries')); return es.docs.map(x => x.data()); }
  async latestSheetBefore(sid) {
    const { query, collection, where, orderBy, limit, getDocs } = this.fb;
    const q = await getDocs(query(collection(this.db, 'sheets'), where('sid', '<', sid), orderBy('sid', 'desc'), limit(1)));
    if (q.empty) return null;
    const d = q.docs[0].data().sid;
    return { sid: d, date: sidDate(d), entries: await this.entriesOf(d) };
  }
  async getSheet(sid) {
    const s = await this.fb.getDoc(this.sref(sid));
    return s.exists() ? { sid, date: sidDate(sid), sheet: s.data(), entries: await this.entriesOf(sid) } : null;
  }
  putPatient(b, date, e) { b.set(this.pref(e.id), { ...patientSummary(date, e), sheets: this.fb.arrayUnion(date) }, { merge: true }); }
  putLogs(b, date, logs) { (logs || []).forEach(l => b.set(this.lref(date), clone(l))); }
  async createSheet(date, meta, entries, logs) {
    const b = this.fb.writeBatch(this.db);
    b.set(this.sref(date), { ...meta, sid: date, date: sidDate(date) });
    entries.forEach(e => { b.set(this.eref(date, e.id), clone(e)); this.putPatient(b, date, e); });
    this.putLogs(b, date, logs);
    await b.commit();
  }
  async importSheet(date, meta, entries, removeIds, logs) {
    const b = this.fb.writeBatch(this.db);
    b.set(this.sref(date), { ...meta, sid: date, date: sidDate(date) }, { merge: true });
    removeIds.forEach(id => b.delete(this.eref(date, id)));
    entries.forEach(e => { b.set(this.eref(date, e.id), clone(e)); this.putPatient(b, date, e); });
    this.putLogs(b, date, logs);
    await b.commit();
  }
  saveSheetMeta(date, patch) { return this.fb.setDoc(this.sref(date), patch, { merge: true }); }
  async saveEntry(date, e, log) {
    const b = this.fb.writeBatch(this.db);
    b.set(this.eref(date, e.id), clone(e));
    b.set(this.sref(date), { updatedAt: Date.now(), updatedBy: e.updatedBy || '' }, { merge: true });
    this.putPatient(b, date, e);
    this.putLogs(b, date, log ? [log] : []);
    await b.commit();
  }
  async deleteEntry(date, id, log) {
    const b = this.fb.writeBatch(this.db);
    b.delete(this.eref(date, id));
    b.set(this.sref(date), { updatedAt: Date.now() }, { merge: true });
    this.putLogs(b, date, log ? [log] : []);
    await b.commit();
  }
  async deleteSheet(date) {
    const { getDocs, collection, writeBatch } = this.fb;
    const es = await getDocs(collection(this.db, 'sheets', date, 'entries'));
    const ls = await getDocs(collection(this.db, 'sheets', date, 'log'));
    const b = writeBatch(this.db); es.docs.forEach(d => b.delete(d.ref)); ls.docs.forEach(d => b.delete(d.ref)); b.delete(this.sref(date)); await b.commit();
  }
  async getLog(date) { const q = await this.fb.getDocs(this.fb.collection(this.db, 'sheets', date, 'log')); return q.docs.map(d => d.data()).sort((a, b) => b.at - a.at); }
  async listPatients() { const q = await this.fb.getDocs(this.fb.collection(this.db, 'patients')); return q.docs.map(d => d.data()); }
  async getPatient(id) { const s = await this.fb.getDoc(this.pref(id)); return s.exists() ? s.data() : null; }
  async sheetsSince(from, to) {
    const { query, collection, where, orderBy, getDocs } = this.fb;
    const cons = [where('date', '>=', from)]; if (to) cons.push(where('date', '<=', to));
    const q = await getDocs(query(collection(this.db, 'sheets'), ...cons, orderBy('date')));
    return q.docs.map(d => ({ sid: d.id, ...d.data() })).sort((a, b) => a.sid.localeCompare(b.sid));
  }
  async loadRange(from, to) {
    const sheets = await this.sheetsSince(from, to);
    return Promise.all(sheets.map(async s => ({ sid: s.sid, date: s.date, sheet: s, entries: await this.entriesOf(s.sid) })));
  }
  async rGet(col, id) { const s = await this.fb.getDoc(this.fb.doc(this.db, col, id)); return s.exists() ? s.data() : null; }
  rSet(col, id, data) { return this.fb.setDoc(this.fb.doc(this.db, col, id), clone(data)); }
  rDel(col, id) { return this.fb.deleteDoc(this.fb.doc(this.db, col, id)); }
  async rList(col, field, val) { const { getDocs, collection, query, where } = this.fb; const q = field ? query(collection(this.db, col), where(field, '==', val)) : collection(this.db, col); const r = await getDocs(q); return r.docs.map(d => d.data()); }
  async listUsers() { const q = await this.fb.getDocs(this.fb.collection(this.db, 'users')); return q.docs.map(d => d.data()); }
  setUser(uid, patch) { return this.fb.updateDoc(this.uref(uid), patch); }
}

/* ---------------- demo data (fictional patients) ---------------- */
function demoResearch(t, y, y2) {
  const at = Date.now(), by = 'Demo Admin';
  return {
    rpatients: {
      demo3: { pid: 'demo3', name: 'MD KAMRUL HASAN', uhid: '', updatedAt: at, updatedBy: by,
        labs: { cols: [{ id: 'c1', at: y2 + 'T08:00' }, { id: 'c2', at: y + 'T08:00' }, { id: 'c3', at: t + 'T07:00' }],
          vals: { c1: { crp: { v: '186', c: '' }, pct: { v: '12.4', c: '' }, tlc: { v: '21.6', c: '' }, creat: { v: '3.4', c: '' }, na: { v: '124', c: '' }, lact: { v: '4.1', c: '' } },
            c2: { crp: { v: '142', c: '' }, pct: { v: '7.9', c: '' }, tlc: { v: '17.2', c: '' }, creat: { v: '2.6', c: '' }, na: { v: '127', c: '' } },
            c3: { crp: { v: '88', c: '' }, pct: { v: '3.1', c: '' }, tlc: { v: '12.8', c: '' }, creat: { v: '1.9', c: '' }, na: { v: '131', c: 'yellow' }, lact: { v: '1.6', c: '' } } } },
        sero: [{ id: 's1', test: 'CMV', at: y + 'T10:00', result: 'Negative', detail: '', c: '' }],
        cultures: [{ id: 'k1', specimen: 'Urine', sent: y2, reported: y, result: 'Growth', organism: 'Escherichia coli', count: '>10⁵ CFU/mL', sens: [{ ab: 'Meropenem', r: 'S' }, { ab: 'Amikacin', r: 'S' }, { ab: 'Ceftriaxone', r: 'R' }, { ab: 'Ciprofloxacin', r: 'R' }, { ab: 'Ceftazidime-avibactam', r: 'S' }], note: '' },
          { id: 'k2', specimen: 'Blood', sent: y2, reported: t, result: 'No growth', organism: '', count: '', sens: [], note: '' }],
        abx: [{ id: 'a1', drug: 'Ceftriaxone', dose: '2 g IV daily', start: addDays(y2, -1), stop: y2, reason: 'Empirical start', note: 'Started in ER' },
          { id: 'a2', drug: 'Meropenem', dose: '1 g IV 8 hourly', start: y2, stop: y, reason: 'Escalation', note: '' },
          { id: 'a3', drug: 'Ceftazidime-avibactam', dose: '2.5 g IV 8 hourly', start: y, stop: '', reason: 'Culture-guided change', note: '' }] },
      demo1: { pid: 'demo1', name: 'MST RAHIMA KHATUN', uhid: '', updatedAt: at, updatedBy: by, labs: { cols: [], vals: {} },
        sero: [{ id: 's2', test: 'Respiratory panel PCR', at: y + 'T15:00', result: 'Detected', detail: 'Influenza A (H1N1)', c: '' }, { id: 's3', test: 'Dengue NS1', at: y + 'T15:00', result: 'Negative', detail: '', c: '' }],
        cultures: [], abx: [{ id: 'a4', drug: 'Meropenem', dose: '', start: y, stop: '', reason: 'Empirical start', note: '' }, { id: 'a5', drug: 'Moxifloxacin', dose: '', start: y, stop: '', reason: 'Empirical start', note: '' }] }
    },
    cpr: {
      c1: { id: 'c1', pid: 'demo5', name: 'MD RAFIQUL ISLAM', age: '58', uhid: '', date: y, time: '17:00', place: 'ICU', from: 'Emergency', minutes: '25', rosc: 'no', outcome: 'died', note: '', updatedAt: at, updatedBy: by },
      c2: { id: 'c2', pid: 'demo4', name: 'MRS. SHAHANA PARVIN', age: '70', uhid: '', date: addDays(t, -4), time: '02:30', place: 'Ward', from: 'Ward', minutes: '8', rosc: 'yes', outcome: 'still', note: 'Hyperkalaemia', updatedAt: at, updatedBy: by }
    },
    studies: { st1: { id: 'st1', name: 'Urosepsis outcome (demo)', desc: 'Made-up example', fields: [{ id: 'f1', label: 'Shock on admission', type: 'yesno', options: [] }, { id: 'f2', label: 'Lactate on ICU day 1 (mmol/L)', type: 'num', options: [] }, { id: 'f3', label: 'Source of sepsis', type: 'choice', options: ['Urine', 'Lung', 'Abdomen', 'Skin', 'Other'] }], pids: ['demo3', 'demo1'], codes: { demo3: 'S001', demo1: 'S002' }, createdAt: at, createdBy: by } },
    studyrec: { 'st1__demo3': { key: 'st1__demo3', studyId: 'st1', pid: 'demo3', values: { f1: 'Yes', f2: '4.1', f3: 'Urine' }, note: '', updatedAt: at, updatedBy: by } }
  };
}
function demoSeed() {
  const t = todayISO(), y = addDays(t, -1), y2 = addDays(t, -2), y5 = addDays(t, -5);
  const by = 'Demo Admin', at = Date.now();
  const P = [
    { id: 'demo1', bed: '2205', name: 'MST RAHIMA KHATUN', age: '82', category: 'sepsis', doa: y, micuDate: y, consultant: 'DR. ZAMAN', source: 'ER', referral: '',
      diagnosis: 'B/L PNEUMONIA, SEPSIS, SEPTIC SHOCK, DM, HTN, CHRONIC AF WITH FVR, H/O SUBCLINICAL HYPOTHYROIDISM',
      investigations: 'ECHO: EF 60%,<br>NWMA (OUTSIDE)<br>DENGUE RT PCR:<br>RESP PANEL:',
      history: 'H/O FEVER AND DRY COUGH FOR 7 DAYS, H/O SOB FOR LAST 2 DAYS, WAS ADMITTED IN ANOTHER HOSPITAL, THEN TOOK DAMA AND CAME TO ER, BP WAS LOW, WITH INOTROPE SUPPORT AND 5 L O2 SHIFTED TO MICU',
      plan: 'GCS 14, BUT RESTLESS, 5L O2 F/M, CV LINE DONE, INOTROPE (STOPPED), AF WITH FVR, ON CALL CARDIO SEEN, AMIODARONE ON GOING AS MAINTENANCE<br><b>ENSURE CARDIOLOGY REF.</b>',
      drugs: 'MERO<br>MOXI<br>Clexane<br><br>H/O TAKING<br>DIGOXIN<br>APIXABAN' },
    { id: 'demo2', bed: '2206', name: 'MD TANVIR AHMED', age: '17', category: 'neuro', doa: y, micuDate: y, consultant: 'DR. NAHAR', source: 'ER', referral: '',
      diagnosis: 'RTA FOLLOWED BY DROWNING, ASPIRATION PNEUMONIA, SEPTIC SHOCK, HEAD INJURY OF LEFT SCALP',
      investigations: 'TRAUMA SCAN DONE',
      history: 'H/O RTA FOLLOWED BY DROWNING 3 DAYS BACK, ADMITTED IN ANOTHER MEDICAL COLLEGE, INTUBATED THERE DUE TO LOW GCS AND TYPE 1 RF, THEN SHIFTED TO MICU WITH INOTROPE SUPPORT',
      plan: 'NOW ON AC MODE, FIO2 50%, WITH REMIFENTANIL WITH INT. NORAD, GOT 500ML FLUID BOLUS, THEN 80ML/HR, DESEDATION ON GOING, DUAL INOTROPE SUPPORT STARTED,<br><b>ENSURE NEURO SURG, MAXILLOFACIAL REF.</b>',
      drugs: 'AVYCEF<br>MOXI<br>METHYLPRED' },
    { id: 'demo3', bed: '2210', name: 'MD KAMRUL HASAN', age: '64', category: 'renal', doa: y2, micuDate: y2, consultant: 'DR. NAHAR', source: 'ER', referral: '',
      diagnosis: 'ACIDOSIS, UROSEPSIS, SHOCK, AKI, URINARY INCONTINENCE, CERVICAL MYELOPATHY, DM, HTN, IHD, HYPONATRAEMIA, RECURRENT UTI',
      investigations: '<b>RESP PANEL: NAD</b><br><b>ECHO:</b><br><b>USG W/A + CHEST DONE</b>',
      history: 'H/O VOMITING, LOOSE MOTION, GENERALIZED WEAKNESS AND HEADACHE FOR LAST 2-3 DAYS. DEVELOPED SOB AND LOW BP AND CAME TO ER.',
      plan: 'CONSCIOUS, ORIENTED ON 1L OXYGEN SUPPORT. HAD BRADYCARDIA WITH NODAL RHYTHM, DOPAMINE AND NOR-AD STOPPED, ORAL FEEDING TOLERATING. <b>ENSURE CARDIO REF WITH ECHO.</b><br><br><b>DR. NAHAR:</b> STOP MOXI, ADD MEROPENEM, 2 MORE DAYS<br><b>DR. KARIM:</b> ADD TOLVAPTAN (REFUSED).<br><b>DR. HOSSAIN:</b> CLAMP (4HR) AND UNCLAMP (5MIN) OF CATHETER, CATH WILL STAY FOR ANOTHER 1-2 WEEKS',
      drugs: 'ZAVICEFTA<br>CEFTAROLINE' },
    { id: 'demo4', bed: '2211', name: 'MRS. SHAHANA PARVIN', age: '70', category: 'renal', doa: y5, micuDate: y5, consultant: 'DR. SAMAD', source: 'ER', referral: 'DR. RAHMAN',
      diagnosis: 'CKD, FLUID OVERLOAD, EI, PNEUMONIA, DM, HTN, HYPOTHYROIDISM, IHD, S/P: PCI',
      investigations: 'ECHO: 35%, GLOBAL HYPO<br>RESPIRATORY PANEL: NEGATIVE<br>USG CHEST: BIL 200-300 ML FLUID',
      history: 'SOB, THEN TO ER TO MICU WITH 11L HFM O2, GOT ANTI HYPER K AT ER',
      plan: 'GCS: 15. VITALS STABLE, NOW ON RA, WAS ON HFNC, FEMORAL HD LINE DONE, GOT 3RD HD.<br><b>HD TODAY FOR 8 HOURS</b><br><br><b>DR. SAMAD:</b> PLAN HD TODAY.<br><b>DR. RAHMAN:</b> CONT CURRENT MEDICATION.',
      drugs: 'MERO<br>LEVO<br>CLINDA' }
  ].map(p => ({ uhid: '', outcome: 'active', outcomeNote: '', carried: false, updatedBy: by, updatedAt: at, ...p }));
  const ys = sidOf(y, '0745'), ts = sidOf(t, '0740');
  const sheets = {
    [ys]: { sid: ys, date: y, doctors: 'DR. MAMUN/DR. RIAD/DR. FARUK', createdBy: by, createdAt: at },
    [ts]: { sid: ts, date: t, doctors: 'DR. MAMUN/DR. RIAD/DR. FARUK/DR. FARSHIM', createdBy: by, createdAt: at, updatedAt: at, updatedBy: by }
  };
  const entries = { [ys]: {}, [ts]: {} };
  P.filter(p => p.id !== 'demo1').forEach(p => { entries[ys][p.id] = { ...p }; });
  P.forEach(p => { entries[ts][p.id] = { ...p, carried: !!entries[ys][p.id] }; });
  entries[ys].demo5 = { id: 'demo5', interim: true, bed: '2212', name: 'MD RAFIQUL ISLAM', age: '58', uhid: '', category: 'cardiac', doa: y, micuDate: y, inAt: y + 'T13:10', outAt: y + 'T17:40', outcome: 'death', outcomeNote: 'Cardiac arrest at 5 PM, CPR 25 min, no ROSC', source: 'ER', consultant: 'DR. ZAMAN', referral: '', diagnosis: 'ACUTE ANTERIOR MI, CARDIOGENIC SHOCK', investigations: '', history: '', plan: '', drugs: '', carried: false, updatedBy: by, updatedAt: at };
  return {
    settings: { ...DEFAULT_SETTINGS(), consultants: ['DR. ZAMAN', 'DR. NAHAR', 'DR. SAMAD', 'DR. KARIM', 'DR. HOSSAIN', 'DR. RAHMAN'] }, sheets, entries, logs: {}, research: demoResearch(t, y, y2),
    users: [
      { uid: 'demo-admin', name: 'Demo Admin', email: 'demo@handover.local', role: 'admin', status: 'approved' },
      { uid: 'u2', name: 'Dr. Riad', email: 'riad@example.com', role: 'mo', status: 'approved', devices: [{ id: 'dx1', name: 'iPhone · Safari (installed)', addedAt: at, lastSeen: at }, { id: 'dx2', name: 'Windows · Chrome', addedAt: at, lastSeen: at }] },
      { uid: 'u3', name: 'Dr. Farshim', email: 'farshim@example.com', role: 'mo', status: 'pending' }
    ]
  };
}

/* =================================================================
   BOOT + ROUTING
   ================================================================= */
async function boot() {
  applyPrefs();
  render(`<div class="loading"><div class="spinner"></div></div>`);
  S.store = DEMO ? new DemoStore() : new FirebaseStore();
  try { await S.store.init(); }
  catch (e) { console.error(e); return renderFatal('Could not start the app. Check your internet and the Firebase settings in config.js.', e); }
  S.store.onAuth(async user => {
    stopMain(); S.subs.forEach(u => u()); S.subs = [];
    S.user = user;
    if (!user) { S.profile = null; return renderAuth('signin'); }
    render(`<div class="loading"><div class="spinner"></div></div>`);
    try {
      S.profile = await S.store.ensureProfile(user);
      try { await registerDevice(); } catch (e) { console.warn('device', e); }
      route();
      S.subs.push(S.store.watchProfile(user.uid, p => {
        if (!p) return;
        const key = x => [x.status, x.role, deviceAllowedFor(x)].join('|');
        const changed = !S.profile || key(p) !== key(S.profile);
        S.profile = p; if (changed) route();
      }));
    } catch (e) { console.error(e); renderFatal('Could not load your account. If this continues, contact the admin.', e); }
  });
  window.addEventListener('online', () => { S.online = true; updateNet(); });
  window.addEventListener('offline', () => { S.online = false; updateNet(); });
  registerSW();
}

function route() {
  const st = S.profile && S.profile.status;
  if (st === 'approved') {
    if (!deviceAllowed()) {
      if ((S.profile.devices || []).length < maxDevices()) { registerDevice().then(route).catch(e => renderFatal('Could not register this device.', e)); return; }
      stopMain(); return renderDevices();
    }
    return startMain();
  }
  stopMain();
  if (st === 'unverified') return renderVerify();
  if (st === 'blocked') return renderWaiting('blocked');
  renderWaiting('pending');
}

function render(html) { $('#app').innerHTML = html; }
function renderFatal(msg, e) {
  render(`<div class="auth-wrap"><div class="auth-card"><div class="auth-logo">${icon('logo')}</div><h1>Something went wrong</h1><p class="sub">${esc(msg)}</p><p class="help">${esc(e && (e.code || e.message) || '')}</p><button class="btn primary block" onclick="location.reload()">Try again</button></div></div>`);
}

/* ---------------- auth screens ---------------- */
function authErr(e) {
  const c = (e && e.code) || '';
  const map = {
    'auth/invalid-credential': 'Email or password is not correct.', 'auth/wrong-password': 'Email or password is not correct.',
    'auth/user-not-found': 'No account with this email. Please sign up.', 'auth/email-already-in-use': 'This email already has an account. Please sign in.',
    'auth/weak-password': 'Password must be at least 6 characters.', 'auth/invalid-email': 'Please enter a valid email.',
    'auth/too-many-requests': 'Too many tries. Please wait a few minutes.', 'auth/network-request-failed': 'No internet connection.'
  };
  return map[c] || (e && e.message) || 'Something went wrong.';
}
function renderAuth(mode) {
  const up = mode === 'signup';
  render(`<div class="auth-wrap"><form class="auth-card" id="authForm" autocomplete="on">
    <div class="auth-logo">${icon('logo')}</div>
    <h1>${esc(CFG.appName || 'MICU HANDOVER')}</h1>
    <p class="sub">${up ? 'Create your account. The admin will approve it once.' : 'Sign in with your email and password.'}</p>
    ${up ? `<label class="field"><span>Full name</span><input class="input" name="name" required placeholder="Dr. ..." autocomplete="name"></label>` : ''}
    <label class="field"><span>Email</span><input class="input" type="email" name="email" required autocomplete="email" inputmode="email"></label>
    <label class="field"><span>Password</span><input class="input" type="password" name="password" required minlength="6" autocomplete="${up ? 'new-password' : 'current-password'}"></label>
    <div class="err" id="authErr"></div>
    <button class="btn primary block" type="submit">${up ? 'Create account' : 'Sign in'}</button>
    <div class="auth-switch">${up ? 'Already have an account?' : 'New here?'} <button type="button" class="link" data-action="auth-mode" data-v="${up ? 'signin' : 'signup'}">${up ? 'Sign in' : 'Create account'}</button></div>
    ${up ? '' : `<div class="auth-switch"><button type="button" class="link" data-action="forgot">Forgot password?</button></div>`}
  </form></div>`);
  $('#authForm').onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target), btn = ev.target.querySelector('[type=submit]');
    btn.disabled = true; $('#authErr').textContent = '';
    try {
      if (up) await S.store.signUp(String(f.get('name')).trim(), String(f.get('email')).trim(), String(f.get('password')));
      else await S.store.signIn(String(f.get('email')).trim(), String(f.get('password')));
    } catch (e) { $('#authErr').textContent = authErr(e); btn.disabled = false; }
  };
}
function renderWaiting(kind) {
  const blocked = kind === 'blocked';
  render(`<div class="auth-wrap"><div class="auth-card">
    <div class="auth-logo">${icon(blocked ? 'x' : 'clock')}</div>
    <h1>${blocked ? 'Access stopped' : 'Waiting for approval'}</h1>
    <p class="sub">${blocked ? 'The admin has stopped access for this account.' : 'Your account is created. The admin needs to approve it once. This page will open by itself after approval.'}</p>
    <div class="notice"><b>${esc(S.profile?.name || '')}</b><br>${esc(S.profile?.email || '')}</div>
    <button class="btn block" data-action="sign-out">${icon('out')} Sign out</button>
  </div></div>`);
}
function renderVerify() {
  render(`<div class="auth-wrap"><div class="auth-card">
    <div class="auth-logo">${icon('mail')}</div>
    <h1>Verify the admin email</h1>
    <p class="sub">A verification link was sent to <b>${esc(S.user.email)}</b>. Open it, then tap the button below.</p>
    <div class="err" id="vErr"></div>
    <button class="btn primary block" data-action="verify-check">I have verified</button>
    <div class="auth-switch"><button class="link" data-action="verify-resend">Send the link again</button> · <button class="link" data-action="sign-out">Sign out</button></div>
  </div></div>`);
}

/* =================================================================
   MAIN SCREEN
   ================================================================= */
function startMain() {
  renderShell();
  if (!S.mainOn) {
    S.mainOn = true; S.listReady = false;
    S.mainSubs = [
      S.store.watchSettings(s => { S.settings = { ...DEFAULT_SETTINGS(), ...(s || {}) }; if (S.settings.categories?.length === 0) S.settings.categories = clone(DEFAULT_CATEGORIES); renderSheetArea(); setTimeout(autoArchive, 4000); }),
      S.store.watchSheetList(list => {
        S.sheetList = list || [];
        if (!S.listReady) { S.listReady = true; openSheet(S.sid && S.sheetList.some(x => x.sid === S.sid) ? S.sid : (S.sheetList[0] ? S.sheetList[0].sid : null)); }
        else if (!S.sid && S.sheetList[0]) openSheet(S.sheetList[0].sid);
        else { updateNav(); if (!S.sheet) renderSheetArea(); }
      })
    ];
  } else if (S.listReady) openSheet(S.sid || (S.sheetList[0] || {}).sid || null);
}
function stopMain() {
  if (!S.mainOn) return;
  S.mainOn = false; (S.mainSubs || []).forEach(u => u()); S.mainSubs = [];
  if (S.sheetUnsub) { S.sheetUnsub(); S.sheetUnsub = null; }
  closeModal();
}

function renderShell() {
  const p = S.prefs;
  render(`
  <header class="topbar">
    <div class="brand"><div class="logo">${icon('logo')}</div>
      <div style="min-width:0"><div class="app-name">${esc(CFG.appName || 'MICU HANDOVER')}</div><div class="app-sub">Handover sheets</div></div></div>
    <span class="chip net" id="net"></span>
    <button class="icon-btn" data-action="menu" aria-label="Export, import and more">${icon('more')}</button>
    <button class="icon-btn" data-action="settings" aria-label="Settings">${icon('gear')}</button>
  </header>
  ${DEMO ? `<div class="demo-banner"><b>Demo mode.</b> Firebase is not set up yet, so data stays on this device only. Patients shown are made-up examples.</div>` : ''}
  <div class="wrap">
    <div class="datebar">
      <button class="icon-btn" data-action="nav" data-v="older" id="navOlder" aria-label="Earlier handover">${icon('left')}</button>
      <button class="date-pick" data-action="handovers" aria-label="All handovers"><span id="dateLabel">…</span></button>
      <button class="icon-btn" data-action="nav" data-v="newer" id="navNewer" aria-label="Later handover">${icon('right')}</button>
      <button class="btn soft" data-action="latest" id="latestBtn">Latest</button>
    </div>
    <button class="btn primary block new-ho" data-action="new-handover">${icon('plus')} New handover</button>
    <div id="sheetHead"></div>
    <div class="controls" id="controls">
      <label class="search">${icon('search')}<input id="q" type="search" placeholder="Search this handover: name, bed, diagnosis…" value="${esc(S.search)}" autocomplete="off"><button type="button" class="all-days" data-action="search-all">All days</button></label>
      <div class="seg" role="group" aria-label="Sort">
        ${[['bed', 'Bed'], ['az', 'A–Z']].map(([v, l]) => `<button data-action="sort" data-v="${v}" class="${p.sort === v ? 'on' : ''}">${l}</button>`).join('')}
      </div>
      <div class="seg" role="group" aria-label="Card size">
        ${[['s', 'S'], ['m', 'M'], ['l', 'L']].map(([v, l]) => `<button data-action="size" data-v="${v}" class="${p.cardSize === v ? 'on' : ''}">${l}</button>`).join('')}
      </div>
    </div>
    <div id="sheetBody"></div>
  </div>
  <button class="fab hidden" data-action="add" aria-label="Add patient">${icon('plus')}</button>`);
  $('#q').addEventListener('input', e => { S.search = e.target.value; renderGrid(); });
  updateNet();
}
function updateNet() {
  const n = $('#net'); if (!n) return;
  n.className = 'chip net ' + (S.online ? '' : 'off');
  n.textContent = S.online ? (DEMO ? 'Demo' : 'Synced') : 'Offline';
  n.title = S.online ? '' : 'Changes are saved on this device and will sync when internet returns';
}
function navIndex() { return (S.sheetList || []).findIndex(x => x.sid === S.sid); }
function updateNav() {
  const lbl = $('#dateLabel'); if (!lbl) return;
  const list = S.sheetList || [], i = navIndex();
  lbl.innerHTML = S.sid ? `${sidDate(S.sid) === todayISO() ? '<i class="today-dot"></i>' : ''}${esc(fmtSid(S.sid))}` : 'No handovers yet';
  const older = $('#navOlder'), newer = $('#navNewer'), latest = $('#latestBtn');
  if (older) older.disabled = !(i >= 0 && i < list.length - 1);
  if (newer) newer.disabled = !(i > 0);
  if (latest) latest.classList.toggle('hidden', !(i > 0));
}

function openSheet(sid) {
  if (S.sheetUnsub) { S.sheetUnsub(); S.sheetUnsub = null; }
  S.sid = sid || null; S.date = sid ? sidDate(sid) : todayISO(); S.sheet = sid ? undefined : null; S.entries = [];
  updateNav(); renderSheetArea();
  if (!sid) return;
  S.sheetUnsub = S.store.watchSheet(sid, (sheet, entries) => {
    if (S.sid !== sid) return;
    S.sheet = sheet; S.entries = entries || [];
    renderSheetArea();
    if (S.pendingOpen && S.pendingOpen.sid === sid) {
      const id = S.pendingOpen.id; S.pendingOpen = null; const e = S.entries.find(x => x.id === id);
      if (e) e.interim ? openInterim(id) : openEditor(id);
    }
  });
}

function renderSheetArea() {
  const head = $('#sheetHead'), body = $('#sheetBody'), ctr = $('#controls'), fab = $('.fab');
  if (!head) return;
  if (S.sheet === undefined) { head.innerHTML = ''; ctr.classList.add('hidden'); fab.classList.add('hidden'); body.innerHTML = `<div class="loading"><div class="spinner"></div></div>`; return; }
  if (!S.sheet) {
    head.innerHTML = ''; ctr.classList.add('hidden'); fab.classList.add('hidden');
    body.innerHTML = !S.listReady ? `<div class="loading"><div class="spinner"></div></div>` : S.sid
      ? `<div class="empty-state"><h2>This handover is no longer here</h2><p>It may have been deleted.</p><div class="actions"><button class="btn primary" data-action="latest">Open the latest handover</button></div></div>`
      : `<div class="empty-state"><div class="auth-logo" style="margin:0 auto 6px">${icon('file')}</div><h2>No handovers yet</h2><p>Start the first handover with the patients now in ICU.</p><div class="actions"><button class="btn primary" data-action="new-handover">${icon('plus')} Start the first handover</button><button class="btn" data-action="import">${icon('upload')} Import a Word handover sheet</button></div></div>`;
    return;
  }
  ctr.classList.remove('hidden'); fab.classList.remove('hidden');
  const inp = $('#doctors');
  if (!inp || document.activeElement !== inp) {
    const main = S.entries.filter(e => !e.interim);
    const act = main.filter(e => e.outcome === 'active'), left = main.filter(e => e.outcome !== 'active'), interim = S.entries.filter(e => e.interim);
    head.innerHTML = `<div class="sheet-head">
      <label for="doctors">Doctors on duty</label>
      <textarea id="doctors" class="doctors" rows="1" placeholder="DR. A/DR. B/DR. C" autocomplete="off" autocapitalize="characters">${esc(S.sheet.doctors || '')}</textarea>
      <div class="stats">
        <span class="stat"><b>${main.length}</b> on handover</span>
        <span class="stat"><b>${main.filter(e => !e.carried).length}</b> new</span>
        ${left.length ? `<span class="stat"><b>${left.length}</b> left after</span>` : ''}
        ${interim.length ? `<span class="stat"><b>${interim.length}</b> came &amp; left</span>` : ''}
        <span class="stat"><b>${Math.max(0, S.settings.beds.length - new Set(act.map(e => e.bed)).size)}</b> free beds</span>
        ${S.sheet.updatedAt ? `<span class="stat">${icon('clock')} ${esc(fmtTime(S.sheet.updatedAt))}${S.sheet.updatedBy ? ' · ' + esc(S.sheet.updatedBy) : ''}</span>` : ''}
      </div></div>`;
    const d = $('#doctors');
    d.addEventListener('change', () => { settle(S.store.saveSheetMeta(S.sid, { doctors: d.value.trim().toUpperCase(), updatedAt: Date.now(), updatedBy: S.profile.name || S.user.email })).then(r => toast(savedMsg(r))).catch(saveFail); });
    const fit = () => { d.style.height = 'auto'; d.style.height = d.scrollHeight + 'px'; };
    d.addEventListener('input', fit); requestAnimationFrame(fit); window.onresize = fit;
    d.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); d.blur(); } });
  }
  renderGrid();
}

function searchBlob(e) {
  if (e._blob) return e._blob;
  const c = catOf(e.category);
  return (e._blob = [e.bed, e.name, e.age, e.uhid, e.consultant, e.referral, e.source, c.name, ...RICH_FIELDS.map(f => htmlToText(e[f]))].join(' \n ').toLowerCase());
}
function sortEntries(list) {
  const beds = S.settings.beds, bi = b => { const i = beds.indexOf(b); return i < 0 ? 999 : i; };
  const byBed = (a, b) => bi(a.bed) - bi(b.bed) || naturalCmp(a.bed, b.bed) || naturalCmp(a.name, b.name);
  if (S.prefs.sort === 'az') return list.sort((a, b) => naturalCmp(a.name, b.name));
  if (false) { const ci = id => { const i = S.settings.categories.findIndex(c => c.id === id); return i < 0 ? 999 : i; }; return list.sort((a, b) => ci(a.category) - ci(b.category) || byBed(a, b)); }
  return list.sort(byBed);
}
function icuDay(e) { return validISO(e.micuDate) ? diffDays(e.micuDate, S.date) + 1 : null; }
function drugChips(e) {
  const t = htmlToText(e.drugs).split('\n').map(x => x.trim()).filter(Boolean);
  const stop = t.findIndex(x => /^H\/O/i.test(x));
  return (stop >= 0 ? t.slice(0, stop) : t).slice(0, 8);
}
const CARD_HUES = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16', '#6366f1', '#f97316', '#14b8a6', '#d946ef', '#0ea5e9', '#eab308', '#22c55e', '#a855f7'];
function bedColor(bed) {
  const beds = (S.settings && S.settings.beds) || [];
  let i = beds.indexOf(bed);
  if (i < 0) { i = 0; for (const ch of String(bed || '')) i = (i * 31 + ch.charCodeAt(0)) >>> 0; }
  return CARD_HUES[i % CARD_HUES.length];
}
function ageText(a) { return a ? (/^\d+$/.test(String(a).trim()) ? a + ' Y' : a) : ''; }
function cardHTML(e) {
  const c = { color: bedColor(e.bed) }, day = icuDay(e), left = e.outcome !== 'active';
  const out = OUTCOMES.find(o => o.id === e.outcome);
  const age = ageText(e.age);
  return `<article class="card ${left ? 'left' : ''}" style="--c:${esc(c.color)}" data-action="edit" data-id="${esc(e.id)}" tabindex="0">
    <div class="card-head">
      <div class="bedbox">${esc(e.bed || '—')}</div>
      <div class="who"><div class="name">${esc(e.name || 'Unnamed')}</div>
        <div class="meta">${age ? `<span>${esc(age)}</span>` : ''}${day && day > 0 ? `<span><b>ICU D${day}</b></span>` : ''}${e.consultant ? `<span>${esc(e.consultant)}</span>` : ''}</div></div>
      <div class="badges">${left ? `<span class="badge left">${esc(out ? out.label : e.outcome)}</span>` : (!e.carried ? '<span class="badge new">New</span>' : '')}${e.uhid ? `<span class="badge">${esc(e.uhid)}</span>` : ''}</div>
    </div>
    ${e.diagnosis ? `<div class="sec"><div class="lbl">Diagnosis</div><div class="clamp" style="--lines:3">${esc(htmlToText(e.diagnosis))}</div></div>` : ''}
    ${e.plan ? `<div class="sec extra"><div class="lbl">Status &amp; plan</div><div class="clamp" style="--lines:5">${esc(htmlToText(e.plan))}</div></div>` : ''}
    ${pendingTasks(e).length ? `<div class="todos">${pendingTasks(e).map(t => `<span class="todo">${icon('flag')}${esc(t)}</span>`).join('')}</div>` : ''}
    ${drugChips(e).length ? `<div class="drugs">${drugChips(e).map(d => `<span class="drug">${esc(d)}</span>`).join('')}</div>` : ''}
    <div class="card-foot">${e.referral ? `<span>Ref: ${esc(e.referral)}</span>` : ''}${e.updatedBy ? `<span>${esc(e.updatedBy)} · ${esc(fmtTime(e.updatedAt))}</span>` : ''}</div>
  </article>`;
}
function fmtDT(v) { if (!v) return ''; const d = new Date(v); return isNaN(d) ? v : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }); }
function interimCard(e) {
  const c = catOf(e.category), out = OUTCOMES.find(o => o.id === e.outcome);
  return `<article class="card interim" style="--c:${esc(c.color)}" data-action="interim-edit" data-id="${esc(e.id)}" tabindex="0">
    <div class="card-head"><div class="bedbox">${esc(e.bed || '—')}</div>
      <div class="who"><div class="name">${esc(e.name || 'Unnamed')}</div><div class="meta">${ageText(e.age) ? `<span>${esc(ageText(e.age))}</span>` : ''}<span>Came ${esc(fmtDT(e.inAt))}</span><span>Left ${esc(fmtDT(e.outAt))}</span></div></div>
      <div class="badges"><span class="badge left">${esc(out ? out.label : e.outcome)}</span></div></div>
    ${e.diagnosis ? `<div class="sec"><div class="clamp" style="--lines:2">${esc(htmlToText(e.diagnosis))}</div></div>` : ''}
  </article>`;
}
function renderGrid() {
  const body = $('#sheetBody'); if (!body || !S.sheet) return;
  S.entries.forEach(e => delete e._blob);
  const q = S.search.trim().toLowerCase();
  let list = S.entries.slice();
  if (q) list = list.filter(e => q.split(/\s+/).every(w => searchBlob(e).includes(w)));
  const interim = list.filter(e => e.interim).sort((a, b) => String(a.inAt).localeCompare(String(b.inAt)));
  list = list.filter(e => !e.interim);
  const active = sortEntries(list.filter(e => e.outcome === 'active')), left = sortEntries(list.filter(e => e.outcome !== 'active'));
  let html = '';
  if (S.prefs.sort === 'bed' && !q) {
    const used = new Set();
    S.settings.beds.forEach(b => {
      const here = active.filter(e => e.bed === b);
      if (here.length) here.forEach(e => { used.add(e.id); html += cardHTML(e); });
      else html += `<button class="card empty" data-action="new" data-bed="${esc(b)}"><div class="bedbox">${esc(b)}</div><div><b>Empty bed</b><div style="font-size:.8em">Tap to add a patient</div></div></button>`;
    });
    active.filter(e => !used.has(e.id)).forEach(e => { html += cardHTML(e); });
  } else if (false) {
    let cur = null;
    active.forEach(e => { if (e.category !== cur) { cur = e.category; const c = catOf(cur); html += `<div class="group-title" style="--c:${esc(c.color)}"><i></i>${esc(c.name)}</div>`; } html += cardHTML(e); });
  } else active.forEach(e => { html += cardHTML(e); });
  if (left.length) html += `<div class="group-title" style="--c:var(--danger)"><i></i>Left ICU after this handover</div>` + left.map(cardHTML).join('');
  if (interim.length) html += `<div class="group-title" style="--c:var(--warn)"><i></i>Came and left before the next handover</div>` + interim.map(interimCard).join('');
  if (!html) html = `<div class="empty-state" style="grid-column:1/-1"><p style="margin:0">${q ? 'Nothing matches your search.' : 'No patients on this handover yet. Tap + to add.'}</p></div>`;
  body.innerHTML = `<div class="grid ${esc(S.prefs.cardSize)}">${html}</div>`;
}
function sortByBed(list) { const beds = S.settings.beds, bi = b => { const i = beds.indexOf(b); return i < 0 ? 999 : i; }; return list.sort((a, b) => bi(a.bed) - bi(b.bed) || naturalCmp(a.bed, b.bed)); }

/* ---------------- add chooser ---------------- */
function openAddChooser() {
  openModal(`<div class="modal-head"><h3>Add to this handover</h3><button class="icon-btn" data-action="close" aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body"><div class="menu-list">
      <button class="menu-item" data-action="new"><span class="mi-ic">${icon('bed')}</span><span>Patient on this handover<small>In ICU at handover time</small></span></button>
      <button class="menu-item" data-action="interim-new"><span class="mi-ic">${icon('clock')}</span><span>Came and left before the next handover<small>Admitted after this handover and gone before the next one (death, discharge, DAMA…)</small></span></button>
    </div></div>`, 'small');
}

/* ---------------- came-and-left form (works inside other windows) ---------------- */
function nowLocal() { const d = new Date(); return `${todayISO()}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function interimForm(e, { onSave, onDelete } = {}) {
  e = e || {};
  const r = $('#dialog-root');
  const beds = [...new Set([...S.settings.beds, e.bed].filter(Boolean))];
  r.innerHTML = `<div class="modal-backdrop dialog"><div class="modal" role="dialog" aria-modal="true">
    <div class="modal-head"><button class="icon-btn" data-ifx="close" aria-label="Close">${icon('x')}</button><h3>${e.id ? 'Came and left' : 'Came and left before next handover'}</h3><button class="btn primary" data-ifx="save">Save</button></div>
    <div class="modal-body"><div class="panel"><div class="row">
      <label class="field"><span>Bed</span><select class="input" id="if_bed"><option value="">—</option>${beds.map(b => `<option ${b === e.bed ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>
      <label class="field" style="grid-column:span 2"><span>Name</span><input class="input" id="if_name" value="${esc(e.name || '')}" autocapitalize="characters"></label>
      <label class="field"><span>Age</span><input class="input" id="if_age" value="${esc(e.age || '')}"></label>
      <label class="field"><span>Hospital UHID</span><input class="input" id="if_uhid" value="${esc(e.uhid || '')}"></label>
      <label class="field"><span>Came to ICU</span><input class="input" type="datetime-local" id="if_in" value="${esc(e.inAt || nowLocal())}"></label>
      <label class="field"><span>Left ICU</span><input class="input" type="datetime-local" id="if_out" value="${esc(e.outAt || nowLocal())}"></label>
      <label class="field"><span>Why left</span><select class="input" id="if_out_k">${OUTCOMES.filter(o => o.id !== 'active').map(o => `<option value="${o.id}" ${o.id === (e.outcome || 'death') ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>
      <div class="field" style="grid-column:1/-1"><span>From</span><input class="input" id="if_src" list="dlSrc2" value="${esc(e.source || 'ER')}" autocapitalize="characters">${pickChips('#if_src', S.settings.sources, 'set-edit', e.source || 'ER')}</div>
      <div class="field" style="grid-column:1/-1"><span>Consultant</span><input class="input" id="if_cons" value="${esc(e.consultant || '')}" autocapitalize="characters" data-pick-filter>${pickChips('#if_cons', S.settings.consultants, 'set', e.consultant)}</div>
      </div><datalist id="dlSrc2">${S.settings.sources.map(s => `<option value="${esc(s)}">`).join('')}</datalist>
      <div class="field" style="margin-top:10px"><span>Diagnosis</span><textarea class="input" id="if_dx" rows="2">${esc(htmlToText(e.diagnosis || ''))}</textarea>${tagRow('Tap to add', '#if_dx', S.settings.dxTags, 'dx')}</div>
      <label class="field"><span>Note (what happened)</span><textarea class="input" id="if_note" rows="3">${esc(e.outcomeNote || '')}</textarea></label>
      ${onDelete ? `<button class="btn danger block" data-ifx="delete">${icon('trash')} Delete</button>` : ''}
    </div></div></div></div>`;
  const close = () => { r.innerHTML = ''; };
  r.querySelector('[data-ifx="close"]').onclick = close;
  r.querySelector('[data-ifx="save"]').onclick = () => {
    const v = id => $('#' + id).value.trim();
    const name = v('if_name').toUpperCase();
    if (!name) { toast('Please write the patient name'); return; }
    const inAt = v('if_in'), outAt = v('if_out');
    if (inAt && outAt && outAt < inAt) { toast('"Left ICU" is before "Came to ICU"'); return; }
    const by = S.profile.name || S.user.email, inDate = (inAt || nowLocal()).slice(0, 10);
    const out = {
      ...e, id: e.id || newId(), interim: true, bed: v('if_bed'), name, age: v('if_age'), uhid: v('if_uhid'), category: e.category || 'other',
      inAt, outAt, outcome: v('if_out_k'), outcomeNote: v('if_note'), source: v('if_src').toUpperCase(), consultant: v('if_cons').toUpperCase(),
      doa: e.doa || inDate, micuDate: inDate, diagnosis: esc(v('if_dx')).replace(/\n/g, '<br>'), investigations: e.investigations || '', history: e.history || '', plan: e.plan || '', drugs: e.drugs || '', referral: e.referral || '',
      carried: false, updatedBy: by, updatedAt: Date.now()
    };
    close(); onSave && onSave(out);
  };
  const del = r.querySelector('[data-ifx="delete"]'); if (del) del.onclick = () => { close(); onDelete(); };
}
function openInterim(id) {
  const e = id ? S.entries.find(x => x.id === id) : null;
  interimForm(e ? clone(e) : null, {
    onSave: async out => {
      const fields = e ? changedFields(e, out) : [];
      try { const r = await settle(S.store.saveEntry(S.sid, out, logRec(e ? 'edit' : 'add', out, fields, 'came and left'))); closeModal(); toast(savedMsg(r)); } catch (err) { saveFail(err); }
    },
    onDelete: e ? async () => {
      if (!(await ask(`Delete ${e.name} from this handover?`, { ok: 'Delete', danger: true }))) return;
      try { await settle(S.store.deleteEntry(S.sid, e.id, logRec('delete', e))); toast('Deleted'); } catch (err) { saveFail(err); }
    } : null
  });
}

/* ---------------- new handover ---------------- */
const NH = { date: '', time: '', prev: undefined, keep: null, interim: [], doctors: '' };
function nhSid() { return sidOf(NH.date, NH.time.replace(':', '')); }
async function openNewHandover() {
  const d = new Date();
  Object.assign(NH, { date: todayISO(), time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, prev: undefined, keep: null, interim: [], doctors: '' });
  openModal(`<div class="modal-head"><button class="icon-btn" data-action="close" aria-label="Close">${icon('x')}</button><h3>New handover</h3><button class="btn primary" data-action="nh-create" id="nhGo">Start</button></div><div class="modal-body" id="nhBody"></div>`);
  renderNH(); loadNHPrev();
}
async function loadNHPrev() {
  if (!validISO(NH.date) || !/^\d{2}:\d{2}$/.test(NH.time)) return;
  NH.prev = undefined; renderNH();
  try { NH.prev = (await S.store.latestSheetBefore(nhSid())) || null; } catch (e) { console.warn(e); NH.prev = null; }
  NH.keep = {}; nhActive().forEach(e => { NH.keep[e.id] = { stay: true, outcome: 'discharged', note: '' }; });
  renderNH();
}
function nhActive() { return NH.prev && NH.prev.entries ? sortByBed(NH.prev.entries.filter(e => !e.interim && e.outcome === 'active')) : []; }
function renderNH() {
  const b = $('#nhBody'); if (!b) return;
  const active = nhActive(), pv = NH.prev;
  const rows = active.map(e => {
    const k = (NH.keep || {})[e.id] || { stay: true };
    return `<div class="keep-row ${k.stay ? '' : 'gone'}">
      <label class="keep-main"><input type="checkbox" data-keep="${esc(e.id)}" ${k.stay ? 'checked' : ''}><span class="bedbox" style="--c:${esc(bedColor(e.bed))}">${esc(e.bed)}</span><span class="u"><b>${esc(e.name)}</b><small>${esc(htmlToText(e.diagnosis).slice(0, 70))}</small></span></label>
      ${k.stay ? '' : `<div class="keep-out"><select class="input" data-keep-out="${esc(e.id)}">${OUTCOMES.filter(o => o.id !== 'active').map(o => `<option value="${o.id}" ${o.id === k.outcome ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select><input class="input" data-keep-note="${esc(e.id)}" value="${esc(k.note)}" placeholder="Time / where (optional)"></div>`}
    </div>`;
  }).join('');
  const stayN = active.filter(e => ((NH.keep || {})[e.id] || { stay: true }).stay).length;
  b.innerHTML = `
    <div class="panel"><div class="row">
      <label class="field"><span>Date</span><input class="input" type="date" id="nhDate" value="${esc(NH.date)}"></label>
      <label class="field"><span>Time</span><input class="input" type="time" id="nhTime" value="${esc(NH.time)}"></label>
      <label class="field" style="grid-column:1/-1"><span>Doctors on duty</span><input class="input" id="nhDoc" value="${esc(NH.doctors)}" placeholder="DR. A/DR. B/DR. C" autocapitalize="characters"></label>
    </div></div>
    <div class="panel"><h4>Still in ICU?</h4>
      ${pv === undefined ? '<div class="loading" style="min-height:80px"><div class="spinner"></div></div>' : !pv ? '<p class="help">There is no earlier handover. This one starts empty; add patients with +.</p>' : active.length ? `<p class="help" style="margin:0 0 10px">From the <b>${esc(fmtSidShort(pv.sid))}</b> handover. Untick anyone who has left and say why. They keep all their data; they just do not come onto this handover.</p><div class="keep-list">${rows}</div>` : `<p class="help">Nobody was in ICU after the ${esc(fmtSidShort(pv.sid))} handover.</p>`}
    </div>
    <div class="panel"><h4>Came and left in between</h4>
      <p class="help" style="margin:0 0 10px">Anyone admitted after the last handover who has already left (death, discharge, DAMA…)? They are kept in the records but not on this handover.</p>
      ${NH.interim.map((e, i) => `<div class="imp-row"><div class="bedbox" style="--c:${esc(bedColor(e.bed))}">${esc(e.bed || '—')}</div><div class="u"><b>${esc(e.name)}</b><div class="help">${esc(fmtDT(e.inAt))} → ${esc(fmtDT(e.outAt))} · ${esc((OUTCOMES.find(o => o.id === e.outcome) || {}).label || '')}</div></div><button class="icon-btn" data-action="nh-del-interim" data-i="${i}" aria-label="Remove">${icon('trash')}</button></div>`).join('')}
      <button class="btn soft" data-action="nh-add-interim">${icon('plus')} Add a patient who came and left</button>
    </div>
    <p class="help">This handover will start with <b>${stayN}</b> patient${stayN === 1 ? '' : 's'}.</p>`;
  const go = $('#nhGo'); if (go) go.textContent = `Start with ${stayN}`;
  $('#nhDate').addEventListener('change', ev => { NH.date = ev.target.value; loadNHPrev(); });
  $('#nhTime').addEventListener('change', ev => { NH.time = ev.target.value; loadNHPrev(); });
  $('#nhDoc').addEventListener('input', ev => { NH.doctors = ev.target.value; });
}
function sidPlusMin(sid, n) {
  const hm = sidHM(sid), d = new Date(`${sidDate(sid)}T${hm.slice(0, 2)}:${hm.slice(2)}:00`);
  d.setMinutes(d.getMinutes() + n);
  return sidOf(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, pad(d.getHours()) + pad(d.getMinutes()));
}
async function createHandover() {
  if (!validISO(NH.date) || !/^\d{2}:\d{2}$/.test(NH.time)) { toast('Choose the date and time'); return; }
  if (NH.prev === undefined) { toast('Still checking the last handover…'); return; }
  let sid = nhSid();
  for (let i = 0; i < 60 && (S.sheetList || []).some(s => s.sid === sid); i++) sid = sidPlusMin(sid, 1);
  const pv = NH.prev, by = S.profile.name || S.user.email, now = Date.now();
  const stay = [], gone = [];
  nhActive().forEach(e => {
    const k = (NH.keep || {})[e.id] || { stay: true };
    const c = { ...e }; delete c._blob;
    if (k.stay) stay.push({ ...c, carried: true, outcome: 'active', outcomeNote: '', updatedBy: by, updatedAt: now });
    else gone.push({ ...c, outcome: k.outcome || 'discharged', outcomeNote: k.note || '', updatedBy: by, updatedAt: now });
  });
  const btn = $('#nhGo'); if (btn) btn.disabled = true;
  try {
    for (const e of gone) await settle(S.store.saveEntry(pv.sid, e, logRec('edit', e, ['outcome'], 'left ICU, recorded when starting ' + fmtSidShort(sid))));
    const home = pv ? pv.sid : sid;
    await settle(S.store.createSheet(sid, { doctors: NH.doctors.trim().toUpperCase(), createdBy: by, createdAt: now, updatedAt: now, updatedBy: by }, stay,
      [logRec('create', null, [], `${stay.length} patients${pv ? ' from ' + fmtSidShort(pv.sid) : ''}${gone.length ? ', ' + gone.length + ' left ICU' : ''}${NH.interim.length ? ', ' + NH.interim.length + ' came and left' : ''}`)]));
    for (const e of NH.interim) await settle(S.store.saveEntry(home, e, logRec('add', e, [], 'came and left')));
    closeModal(); toast(`Handover started with ${stay.length} patient${stay.length === 1 ? '' : 's'}`);
    openSheet(sid);
  } catch (e) { if (btn) btn.disabled = false; saveFail(e); }
}

/* ---------------- all handovers, by month ---------------- */
const HLIST = { month: "" };
async function openHandoverList(month) {
  HLIST.month = month || HLIST.month || sidDate(S.sid || todayISO()).slice(0, 7) || todayISO().slice(0, 7);
  const [y, m] = HLIST.month.split('-').map(Number);
  const from = `${HLIST.month}-01`, to = `${HLIST.month}-${pad(new Date(y, m, 0).getDate())}`;
  const label = new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const prevM = `${m === 1 ? y - 1 : y}-${pad(m === 1 ? 12 : m - 1)}`, nextM = `${m === 12 ? y + 1 : y}-${pad(m === 12 ? 1 : m + 1)}`;
  openModal(`<div class="modal-head"><h3>All handovers</h3><button class="icon-btn" data-action="close" aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body">
      <div class="datebar" style="margin-top:0"><button class="icon-btn" data-action="hl-month" data-v="${prevM}" aria-label="Previous month">${icon('left')}</button><div class="date-pick">${esc(label)}</div><button class="icon-btn" data-action="hl-month" data-v="${nextM}" aria-label="Next month">${icon('right')}</button></div>
      ${S.settings.driveFolderUrl ? `<p class="help">Saved copies are also in your <a href="${esc(S.settings.driveFolderUrl)}" target="_blank" rel="noopener">Google Drive folder</a>, by year and month.</p>` : ''}
      <div id="hlOut"><div class="loading" style="min-height:100px"><div class="spinner"></div></div></div>
    </div>`, 'small');
  try {
    const list = (await S.store.sheetsSince(from, to)).sort((a, b) => b.sid.localeCompare(a.sid));
    const out = $('#hlOut'); if (!out) return;
    out.innerHTML = list.length ? list.map(s => `<button class="result" data-action="goto" data-sid="${esc(s.sid)}" style="--c:var(--primary)">
      <div class="bedbox" style="font-size:.78em;line-height:1.15;text-align:center">${esc(fmtDM(s.date || sidDate(s.sid)))}<br>${esc(fmtClock(sidHM(s.sid)))}</div>
      <div class="u"><b>${esc(fmtNice(s.date || sidDate(s.sid)))}</b><div class="help">${esc(s.doctors || 'No doctors written')}</div>
      <div class="help">${s.archivedAt ? 'Saved to Drive' : ''}${s.importedFrom ? (s.archivedAt ? ' · ' : '') + 'Imported from Word' : ''}</div></div>
      ${s.sid === S.sid ? '<span class="badge new">Open</span>' : ''}</button>`).join('') : '<p class="help">No handovers in this month.</p>';
  } catch (e) { const out = $('#hlOut'); if (out) out.innerHTML = `<p class="err">${esc(e.code || e.message)}</p>`; }
}

/* Firestore keeps writes on the phone when offline; their promise only finishes once the server has them.
   Wait a moment, then let the user carry on and report any later error. */
async function settle(p, ms = 1500) {
  const r = await Promise.race([p.then(() => 'ok'), new Promise(res => setTimeout(() => res('pending'), ms))]);
  if (r === 'pending') p.catch(saveFail);
  return r;
}
const savedMsg = r => r === 'pending' ? 'Saved on this device. It will sync when internet is back.' : 'Saved';
function saveFail(e) { console.error(e); toast('Could not save: ' + (e.code || e.message || e)); }

/* =================================================================
   MODALS
   ================================================================= */
function openModal(html, cls = '') {
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-close-bg><div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
  document.body.style.overflow = 'hidden';
  const bg = $('[data-close-bg]'); bg.addEventListener('click', e => { if (e.target === bg && !bg.dataset.lock) closeModal(); });
}
function closeModal() { const r = $('#modal-root'); if (r) r.innerHTML = ''; document.body.style.overflow = ''; }

/* ---------------- entry editor ---------------- */
let rteLast = null, rteRange = null;
function rteField(name, ph, tall) { return `<div class="rte ${tall ? 'tall' : ''}" contenteditable="true" data-field="${name}" data-ph="${esc(ph)}"></div>`; }
function openEditor(id, bed) {
  const existing = id ? S.entries.find(e => e.id === id) : null;
  const e = existing ? clone(existing) : { id: newId(), bed: bed || '', name: '', age: '', uhid: '', category: 'other', doa: S.date, micuDate: S.date, consultant: '', source: 'ER', referral: '', diagnosis: '', investigations: '', history: '', plan: '', drugs: '', outcome: 'active', outcomeNote: '', carried: false };
  const all = S.entries;
  const dl = (idn, vals) => `<datalist id="${idn}">${[...new Set(vals.filter(Boolean))].sort().map(v => `<option value="${esc(v)}">`).join('')}</datalist>`;
  const bedOpts = [...new Set([...S.settings.beds, e.bed].filter(Boolean))];
  openModal(`
    <div class="modal-head"><button class="icon-btn" data-action="close" aria-label="Close">${icon('x')}</button><h3>${existing ? 'Edit patient' : 'New patient'}</h3>
      <button class="btn primary" data-action="save-entry">Save</button></div>
    <div class="modal-body" id="edBody">
      <div class="panel"><h4>Patient</h4>
        <div class="row">
          <label class="field"><span>Bed</span><select class="input" name="bed"><option value="">—</option>${bedOpts.map(b => `<option ${b === e.bed ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>
          <label class="field" style="grid-column:span 2"><span>Name</span><input class="input" name="name" value="${esc(e.name)}" placeholder="MST ..." autocapitalize="characters"></label>
          <label class="field"><span>Age</span><input class="input" name="age" value="${esc(e.age)}" placeholder="65" inputmode="text"></label>
          <label class="field"><span>Hospital UHID</span><input class="input" name="uhid" value="${esc(e.uhid || '')}" placeholder="optional"></label>
        </div></div>
      <div class="panel"><h4>Admission</h4>
        <div class="row">
          <label class="field"><span>DOA (hospital)</span><input class="input" type="date" name="doa" value="${esc(e.doa || '')}"></label>
          <label class="field"><span>MICU date</span><input class="input" type="date" name="micuDate" value="${esc(e.micuDate || '')}"></label>
          <div class="field" style="grid-column:1/-1"><span>Consultant</span><input class="input" name="consultant" list="dlCons" value="${esc(e.consultant)}" placeholder="Tap a name below or type" autocapitalize="characters" data-pick-filter>${pickChips('[name="consultant"]', S.settings.consultants, 'set', e.consultant)}</div>
          <div class="field" style="grid-column:1/-1"><span>From</span><input class="input" name="source" list="dlSrc" value="${esc(e.source)}" autocapitalize="characters">${pickChips('[name="source"]', S.settings.sources, 'set-edit', e.source)}</div>
          <div class="field" style="grid-column:1/-1"><span>Referral doctor</span><input class="input" name="referral" value="${esc(e.referral)}" placeholder="Tap names below — you can choose several" autocapitalize="characters" data-multi>${pickChips('[name="referral"]', S.settings.consultants, 'multi', e.referral)}</div>
        </div>
        ${dl('dlCons', [...S.settings.consultants, ...all.map(x => x.consultant), ...all.map(x => x.referral)])}${dl('dlSrc', [...S.settings.sources, ...all.map(x => x.source)])}
      </div>
      <div class="rte-bar" id="rteBar">
        <button data-cmd="bold" title="Bold"><b>B</b></button><button data-cmd="italic" title="Italic"><i>I</i></button><button data-cmd="underline" title="Underline"><u>U</u></button>
        <span class="sep"></span>
        ${['#e5484d', '#2563eb', '#0f9a72', '#ea7a12', '#7c3aed'].map(c => `<button class="sw" data-cmd="foreColor" data-val="${c}" title="Text colour"><span class="swatch" style="background:${c}"></span></button>`).join('')}
        <button data-cmd="hiliteColor" data-val="#fff176" title="Highlight" style="background:#fff176;color:#000">H</button>
        <span class="sep"></span>
        <select data-cmd="fontName" title="Font"><option value="">Font</option><option>Calibri</option><option>Arial</option><option>Times New Roman</option><option>Lato</option><option>Roboto</option><option>Poppins</option></select>
        <select data-cmd="fontSize" title="Size"><option value="">Size</option><option value="2">Small</option><option value="3">Normal</option><option value="4">Large</option><option value="5">X-Large</option></select>
        <button data-cmd="caps" title="Make selected text CAPITAL">AA</button>
        <button data-cmd="removeFormat" title="Clear formatting">${icon('x')}</button>
      </div>
      <div class="panel"><h4>Diagnosis</h4>${rteField('diagnosis', 'Tap the tags below or type')}${tagRow('Tap to add', '.rte[data-field="diagnosis"]', S.settings.dxTags, 'dx')}</div>
      <div class="panel"><h4>Key investigations</h4>${rteField('investigations', 'ECHO: EF …, RESP PANEL: …, USG: …')}</div>
      <div class="panel"><h4>History</h4>${rteField('history', 'H/O FEVER AND COUGH FOR 7 DAYS…', true)}</div>
      <div class="panel"><h4>Current status, consultants' advice &amp; plan</h4>${rteField('plan', 'GCS 15, ON 2L O2… ENSURE CARDIO REF. DR. X: …', true)}</div>
      <div class="panel"><h4>Antibiotics / drugs</h4>${rteField('drugs', 'Tap the tags below or type (one per line)')}${tagRow('Antibiotics', '.rte[data-field="drugs"]', S.settings.abxTags, 'line')}${tagRow('Other drugs', '.rte[data-field="drugs"]', S.settings.drugTags, 'line')}</div>
      <div class="panel"><h4>Left ICU after this handover?</h4>
        <div class="outcomes" id="outcomes">${OUTCOMES.map(o => `<button type="button" data-action="outcome" data-v="${o.id}" class="${o.id === e.outcome ? 'on' : ''}">${esc(o.label)}</button>`).join('')}</div>
        <label class="field" style="margin-top:10px" id="outNoteWrap"><span>Note (time, where to)</span><input class="input" name="outcomeNote" value="${esc(e.outcomeNote || '')}" placeholder="e.g. 2 PM, to medicine ward"></label>
        <p class="help">A patient who leaves stays on this handover (they were here at handover time) but is not carried to the next one. You can also record this when starting the next handover.</p>
        ${existing && existing.updatedBy ? `<div class="updated">Last saved by ${esc(existing.updatedBy)} · ${esc(fmtTime(existing.updatedAt))}</div>` : ''}
      </div>
      ${existing ? '<div class="panel" id="edHistory"><p class="help">Loading history…</p></div>' : ''}
      ${existing ? `<button class="btn danger block" data-action="delete-entry">${icon('trash')} Delete from this handover sheet</button>` : ''}
    </div>`);
  const body = $('#edBody');
  body.dataset.id = e.id; body.dataset.outcome = e.outcome; body.dataset.isnew = existing ? '' : '1';
  body._orig = e;
  RICH_FIELDS.forEach(f => { $(`.rte[data-field="${f}"]`, body).innerHTML = e[f] || ''; });
  $('#outNoteWrap').classList.toggle('hidden', e.outcome === 'active');
  setupRTE(body);
  if (existing) fillEditorHistory(e.id);
  if (!existing) setTimeout(() => { const n = $('[name=name]', body); if (n && !bed) $('[name=bed]', body).focus(); else n && n.focus(); }, 60);
}

function setupRTE(root) {
  try { document.execCommand('styleWithCSS', false, false); } catch { }
  $$('.rte', root).forEach(el => {
    el.addEventListener('focus', () => { rteLast = el; });
    el.addEventListener('paste', ev => {
      ev.preventDefault();
      const t = (ev.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, t);
    });
  });
  const bar = $('#rteBar');
  bar.addEventListener('pointerdown', ev => { if (ev.target.closest('button')) ev.preventDefault(); });
  bar.addEventListener('mousedown', ev => { if (ev.target.closest('button')) ev.preventDefault(); });
  bar.addEventListener('click', ev => { const b = ev.target.closest('button[data-cmd]'); if (b) rteCmd(b.dataset.cmd, b.dataset.val); });
  $$('select', bar).forEach(s => s.addEventListener('change', () => { if (s.value) rteCmd(s.dataset.cmd, s.value); s.value = ''; }));
}
function saveSel() {
  const sel = window.getSelection(); if (!sel || !sel.rangeCount) return;
  const r = sel.getRangeAt(0); const host = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentNode;
  const rte = host && host.closest && host.closest('.rte'); if (rte) { rteLast = rte; rteRange = r.cloneRange(); }
}
function restoreSel() {
  if (!rteLast) return false;
  rteLast.focus({ preventScroll: true });
  if (rteRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(rteRange); }
  return true;
}
function rteCmd(cmd, val) {
  if (!restoreSel()) { toast('Tap inside a text box first'); return; }
  if (cmd === 'caps') {
    const s = window.getSelection(); const t = s.toString();
    if (!t) { toast('Select some text first'); return; }
    document.execCommand('insertText', false, t.toUpperCase()); return;
  }
  if (cmd === 'hiliteColor') {
    const cur = document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor') || '';
    const on = /255,\s*241,\s*118|fff176/i.test(cur);
    document.execCommand('hiliteColor', false, on ? 'transparent' : val); saveSel(); return;
  }
  document.execCommand(cmd, false, val ?? null); saveSel();
}

/* ---------- quick-pick buttons and tags ---------- */
function pickChips(target, items, mode, cur) {
  if (!items || !items.length) return mode === 'set' ? `<p class="help pick-empty">Admin can add names in Settings → Lists.</p>` : '';
  const curList = mode === 'multi' ? splitNames(cur) : [String(cur || '').toUpperCase()];
  return `<div class="pick wrap" data-target="${esc(target)}" data-mode="${mode}">${items.map(v => `<button type="button" class="pk ${curList.includes(v) ? 'on' : ''}" data-pick="${esc(v)}">${mode === 'multi' ? '<i class="tick"></i>' : ''}${esc(v)}</button>`).join('')}</div>`;
}
function splitNames(v) { return String(v || '').split(/\s*[,;\n]\s*/).map(x => x.trim().toUpperCase()).filter(Boolean); }
function tagRow(label, target, items, mode) {
  if (!items || !items.length) return '';
  return `<div class="tagrow"><span class="tag-lbl">${esc(label)}</span><div class="pick wrap ${items.length > 8 ? 'clip' : ''}" data-target="${esc(target)}" data-mode="${mode}">${items.map(v => `<button type="button" class="pk tag" data-pick="${esc(v)}">${esc(v)}</button>`).join('')}</div>${items.length > 8 ? `<button type="button" class="pk-more">Show all ${items.length}</button>` : ''}</div>`;
}
function hasWord(text, w) { return new RegExp('(^|[\\s,;/(])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[\\s,;/.)])', 'i').test(text); }
function addToRich(el, tag, mode) {
  const txt = htmlToText(el.innerHTML);
  if (txt && hasWord(txt, tag)) { toast(tag + ' is already there'); return; }
  if (!txt) { el.innerHTML = esc(tag); return; }
  if (mode === 'line') {
    if (el.lastElementChild && /^(DIV|P)$/.test(el.lastElementChild.tagName)) el.insertAdjacentHTML('beforeend', `<div>${esc(tag)}</div>`);
    else { if (el.lastChild && el.lastChild.nodeName === 'BR') el.lastChild.remove(); el.insertAdjacentHTML('beforeend', '<br>' + esc(tag)); }
    return;
  }
  let t = el; while (t.lastElementChild && /^(DIV|P)$/.test(t.lastElementChild.tagName)) t = t.lastElementChild;
  if (t.lastChild && t.lastChild.nodeName === 'BR') t.lastChild.remove();
  t.insertAdjacentHTML('beforeend', (/[,;]\s*$/.test(txt) ? ' ' : ', ') + esc(tag));
}
function addToPlain(el, tag, mode) {
  const txt = el.value.trim();
  if (txt && hasWord(txt, tag)) { toast(tag + ' is already there'); return; }
  el.value = !txt ? tag : mode === 'line' ? txt + '\n' + tag : txt + (/[,;]$/.test(txt) ? ' ' : ', ') + tag;
}
document.addEventListener('click', ev => {
  const m = ev.target.closest('.pk-more');
  if (m) { ev.preventDefault(); const box = m.previousElementSibling; const open = box.classList.toggle('open'); m.textContent = open ? 'Show less' : `Show all ${box.children.length}`; return; }
  const b = ev.target.closest('.pk[data-pick]'); if (!b) return;
  ev.preventDefault();
  const box = b.closest('.pick'), root = b.closest('.modal') || document, el = root.querySelector(box.dataset.target); if (!el) return;
  const v = b.dataset.pick, mode = box.dataset.mode;
  if (mode === 'multi') {
    let list = splitNames(el.value);
    list = list.includes(v) ? list.filter(x => x !== v) : [...list, v];
    el.value = list.join(', ');
    box.querySelectorAll('.pk').forEach(x => x.classList.toggle('on', list.includes(x.dataset.pick)));
    return;
  }
  if (mode === 'set' || mode === 'set-edit') {
    el.value = v; box.querySelectorAll('.pk').forEach(x => x.classList.toggle('on', x === b));
    if (mode === 'set-edit') { el.focus(); el.setSelectionRange(v.length, v.length); }
    return;
  }
  if (el.isContentEditable) addToRich(el, v, mode); else addToPlain(el, v, mode);
  b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 400);
});
document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.matches && t.matches('[data-multi]')) { const box = t.parentNode.querySelector('.pick'); if (box) { const list = splitNames(t.value); box.querySelectorAll('.pk').forEach(x => x.classList.toggle('on', list.includes(x.dataset.pick))); } return; }
  if (!t.matches || !t.matches('[data-pick-filter]')) return;
  const box = t.parentNode.querySelector('.pick'); if (!box) return;
  const q = t.value.trim().toUpperCase();
  box.querySelectorAll('.pk').forEach(x => { x.classList.toggle('hidden', !!q && !x.dataset.pick.includes(q.replace(/^DR\.?\s*/, ''))); x.classList.toggle('on', x.dataset.pick === q); });
});
function listEd(id, items, ph) { return `<div class="led" id="${id}">${items.map(v => ledRow(v, ph)).join('')}</div><button type="button" class="btn soft" data-action="led-add" data-id="${id}" data-ph="${esc(ph)}">${icon('plus')} Add</button>`; }
function ledRow(v, ph) { return `<div class="led-row"><input class="input" value="${esc(v)}" placeholder="${esc(ph)}" autocapitalize="characters"><button type="button" class="icon-btn" data-action="led-up" aria-label="Move up">${icon('up')}</button><button type="button" class="icon-btn" data-action="led-del" aria-label="Delete">${icon('trash')}</button></div>`; }
function ledVals(id) { return [...new Set($$('#' + id + ' .led-row input').map(i => i.value.trim().toUpperCase()).filter(Boolean))]; }

/* allow-listed formatting only */
const OK_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P', 'SPAN', 'FONT']);
const OK_CSS = ['color', 'background-color', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line'];
function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(`<div id="r">${html || ''}</div>`, 'text/html');
  const root = doc.getElementById('r');
  const walk = node => {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) return;
      if (ch.nodeType !== 1) { ch.remove(); return; }
      walk(ch);
      if (!OK_TAGS.has(ch.tagName)) { ch.replaceWith(...ch.childNodes); return; }
      const keep = {};
      if (ch.tagName === 'FONT') ['color', 'face', 'size'].forEach(a => { if (ch.getAttribute(a)) keep[a] = ch.getAttribute(a); });
      const st = ch.style; const css = OK_CSS.map(p => st.getPropertyValue(p) ? `${p}:${st.getPropertyValue(p)}` : '').filter(Boolean).join(';');
      [...ch.attributes].forEach(a => ch.removeAttribute(a.name));
      Object.entries(keep).forEach(([k, v]) => ch.setAttribute(k, v));
      if (css) ch.setAttribute('style', css);
      if ((ch.tagName === 'SPAN' || ch.tagName === 'FONT') && !ch.attributes.length) ch.replaceWith(...ch.childNodes);
    });
  };
  walk(root);
  let out = root.innerHTML.replace(/&nbsp;/g, ' ');
  out = out.replace(/(<br\s*\/?>|<div><br><\/div>|\s)+$/gi, '');
  return htmlToText(out) ? out : '';
}

async function saveEntry() {
  const body = $('#edBody'); if (!body) return;
  const g = n => { const el = $(`[name="${n}"]`, body); return el ? el.value.trim() : ''; };
  const e = { ...body._orig };
  ['bed', 'name', 'age', 'uhid', 'doa', 'micuDate', 'consultant', 'source', 'referral', 'outcomeNote'].forEach(k => { e[k] = g(k); });
  ['name', 'consultant', 'source', 'referral'].forEach(k => { e[k] = e[k].toUpperCase(); });
  e.referral = splitNames(e.referral).join(', ');
  RICH_FIELDS.forEach(f => { e[f] = sanitizeHtml($(`.rte[data-field="${f}"]`, body).innerHTML); });
  e.outcome = body.dataset.outcome || 'active';
  if (e.outcome === 'active') e.outcomeNote = '';
  if (!e.name) { toast('Please write the patient name'); $('[name=name]', body).focus(); return; }
  if (!e.bed) { toast('Please choose a bed'); $('[name=bed]', body).focus(); return; }
  if (e.outcome === 'active') {
    const clash = S.entries.find(x => x.id !== e.id && x.bed === e.bed && x.outcome === 'active');
    if (clash && !(await ask(`Bed ${e.bed} already has ${clash.name}. Save anyway?\n\nIf ${clash.name} has moved out, mark them as left on their card.`, { ok: 'Save anyway' }))) return;
  }
  e.updatedBy = S.profile.name || S.user.email; e.updatedAt = Date.now();
  delete e._blob;
  const btn = $('[data-action="save-entry"]'); if (btn) btn.disabled = true;
  const isNew = !S.entries.find(x => x.id === e.id);
  const fields = isNew ? [] : changedFields(body._orig, e);
  if (!isNew && !fields.length) { closeModal(); toast('No changes to save'); return; }
  try { const r = await settle(S.store.saveEntry(S.sid, e, logRec(isNew ? 'add' : 'edit', e, fields))); closeModal(); toast(savedMsg(r)); }
  catch (err) { if (btn) btn.disabled = false; saveFail(err); }
}

/* ---------------- export menu ---------------- */
function openExport() {
  if (!S.sheet) { toast('Create the sheet for this day first'); return; }
  const canShare = !!(navigator.canShare && window.File);
  openModal(`<div class="modal-head"><h3>Export · ${esc(fmtNice(S.date))}</h3><button class="icon-btn" data-action="close" aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body"><div class="menu-list">
      <button class="menu-item" data-action="docx"><span class="mi-ic">${icon('file')}</span><span>Download Word (DOCX)<small>Same layout as the printed handover sheet</small></span></button>
      ${canShare ? `<button class="menu-item" data-action="docx-share"><span class="mi-ic">${icon('share')}</span><span>Share DOCX<small>WhatsApp, email, Drive…</small></span></button>` : ''}
      <button class="menu-item" data-action="print"><span class="mi-ic">${icon('print')}</span><span>Print / Save as PDF<small>A4 landscape</small></span></button>
      ${isAdmin() ? `<button class="menu-item" data-action="delete-sheet" style="color:var(--danger)"><span class="mi-ic">${icon('trash')}</span><span>Delete this day's sheet<small>Admin only. Cannot be undone.</small></span></button>` : ''}
    </div>
    <p class="help">${S.prefs.includeLeft ? 'Patients who left ICU on this day are included.' : 'Patients who left ICU on this day are not included.'} Change this and the print font in Settings → Print.</p></div>`, 'small');
}
function exportList() { return exportListOf(S.entries); }
function exportListOf(all) {
  const beds = S.settings.beds, bi = b => { const i = beds.indexOf(b); return i < 0 ? 999 : i; };
  return all.filter(e => !e.interim).filter(e => S.prefs.includeLeft || e.outcome === 'active')
    .sort((a, b) => (a.outcome === 'active' ? 0 : 1) - (b.outcome === 'active' ? 0 : 1) || bi(a.bed) - bi(b.bed) || naturalCmp(a.bed, b.bed));
}
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
async function loadDocx() {
  if (window.docx) return window.docx;
  try { await loadScript(CFG.docxUrl || 'lib/docx.js'); } catch { await loadScript('https://cdn.jsdelivr.net/npm/docx@9.14.0/dist/index.iife.js'); }
  return window.docx;
}
const fileBase = sid => `MICU_Handover_${sidDate(sid)}_${sidHM(sid)}`;
function interimForPrint(all) { return S.prefs.printInterim ? all.filter(e => e.interim).sort((a, b) => String(a.inAt).localeCompare(String(b.inAt))) : []; }
function interimLine(e) { const o = (OUTCOMES.find(x => x.id === e.outcome) || {}).label || ''; return `${e.bed ? e.bed + ' · ' : ''}${e.name}${e.age ? ', ' + (/^\d+$/.test(e.age) ? e.age + ' YRS' : e.age) : ''} — ${htmlToText(e.diagnosis).replace(/\n/g, ' ')} — CAME ${fmtDT(e.inAt)}, LEFT ${fmtDT(e.outAt)}: ${o.toUpperCase()}${e.outcomeNote ? ' (' + e.outcomeNote + ')' : ''}`; }
const fileName = () => fileBase(S.sid) + '.docx';
async function makeDocxBlob() {
  const docx = await loadDocx();
  return buildDocx(docx, { date: S.date, interim: interimForPrint(S.entries), doctors: S.sheet.doctors || '', entries: exportList(), font: S.prefs.exportFont, size: +S.prefs.exportSize || 10 });
}
async function doDocx(share) {
  toast('Preparing DOCX…', 1500);
  try {
    const blob = await makeDocxBlob();
    if (share) {
      const f = new File([blob], fileName(), { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: fileName() }); return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName();
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    toast('DOCX ready');
  } catch (e) { if (e && e.name === 'AbortError') return; console.error(e); toast('Could not make DOCX: ' + (e.message || e)); }
}

/* ---- HTML (rich text) → DOCX paragraphs ---- */
const SIZE_DELTA = { 1: -3, 2: -1.5, 3: 0, 4: 2, 5: 4, 6: 8, 7: 14 };
function toHex(c) {
  if (!c) return null; c = c.trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.slice(1).toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) return c.slice(1).split('').map(x => x + x).join('').toUpperCase();
  const m = c.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/i);
  if (m) { if (m[4] !== undefined && +m[4] === 0) return null; return [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('').toUpperCase(); }
  const named = { red: 'FF0000', blue: '0000FF', green: '008000', black: '000000', yellow: 'FFFF00', orange: 'FFA500', purple: '800080' };
  return named[c.toLowerCase()] || null;
}
function htmlToParagraphs(docx, html, base) {
  const { Paragraph, TextRun, ShadingType } = docx;
  const paras = []; let runs = [];
  const flush = (force) => { if (runs.length || force) paras.push(new Paragraph({ children: runs, spacing: { before: 0, after: 0, line: 240 } })); runs = []; };
  const doc = new DOMParser().parseFromString(`<div id="r">${html || ''}</div>`, 'text/html');
  const walk = (node, st) => {
    node.childNodes.forEach(ch => {
      if (ch.nodeType === 3) {
        const t = ch.nodeValue.replace(/ /g, ' ').replace(/[\r\n]+/g, ' ');
        if (!t) return;
        const o = { text: t, font: st.font || base.font, size: Math.round((base.size + (st.delta || 0)) * 2) };
        if (st.b) o.bold = true; if (st.i) o.italics = true; if (st.u) o.underline = {};
        if (st.color) o.color = st.color;
        if (st.bg) o.shading = { type: ShadingType.CLEAR, color: 'auto', fill: st.bg };
        runs.push(new TextRun(o)); return;
      }
      if (ch.nodeType !== 1) return;
      const tag = ch.tagName; const s = { ...st };
      if (tag === 'BR') { flush(true); return; }
      if (tag === 'B' || tag === 'STRONG') s.b = true;
      if (tag === 'I' || tag === 'EM') s.i = true;
      if (tag === 'U') s.u = true;
      if (tag === 'FONT') {
        if (ch.getAttribute('color')) s.color = toHex(ch.getAttribute('color')) || s.color;
        if (ch.getAttribute('face')) s.font = ch.getAttribute('face').split(',')[0].replace(/["']/g, '').trim();
        if (ch.getAttribute('size')) s.delta = SIZE_DELTA[ch.getAttribute('size')] ?? s.delta;
      }
      const cs = ch.style;
      if (cs) {
        if (/bold|[6-9]00/.test(cs.fontWeight)) s.b = true;
        if (cs.fontStyle === 'italic') s.i = true;
        if (/underline/.test(cs.textDecoration || cs.textDecorationLine || '')) s.u = true;
        if (cs.color) s.color = toHex(cs.color) || s.color;
        if (cs.backgroundColor) { const bg = toHex(cs.backgroundColor); s.bg = bg && bg !== 'FFFFFF' ? bg : s.bg; }
        if (cs.fontFamily) s.font = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      }
      const block = tag === 'DIV' || tag === 'P';
      if (block && runs.length) flush();
      walk(ch, s);
      if (block) flush(false);
    });
  };
  walk(doc.getElementById('r'), {});
  flush(false);
  // drop trailing empty paragraphs
  return paras;
}
function textParas(docx, lines, base, opts = {}) {
  const { Paragraph, TextRun } = docx;
  return lines.map(t => new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, alignment: opts.align, children: t ? [new TextRun({ text: t, font: base.font, size: base.size * 2, bold: !!opts.bold })] : [] }));
}
function buildDocx(docx, data) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, PageOrientation, TabStopType, TableLayoutType, Header, Tab, AlignmentType } = docx;
  const base = { font: data.font || 'Calibri', size: data.size || 10 };
  const PAGE_W = 16838, PAGE_H = 11906, M = 500;
  const TW = PAGE_W - 2 * M;
  const pct = [3.0, 8.3, 9.2, 15.7, 1.7, 46.3, 7.8, 8.0];
  const widths = pct.map(p => Math.round(TW * p / 100)); widths[5] += TW - widths.reduce((a, b) => a + b, 0);
  const B = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const borders = { top: B, bottom: B, left: B, right: B, insideHorizontal: B, insideVertical: B };
  const blank = () => new Paragraph({ spacing: { before: 0, after: 0 }, children: [] });
  const rich = h => htmlToParagraphs(docx, h, base);
  const join = (...parts) => { const out = []; parts.filter(p => p.length).forEach((p, i) => { if (i) out.push(blank()); out.push(...p); }); return out; };
  const cell = (children, i) => new TableCell({ width: { size: widths[i], type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 60, right: 60 }, children: children.length ? children : [blank()] });
  const bedLines = b => { b = String(b || ''); return b.length === 4 ? [b.slice(0, 2), b.slice(2)] : [b]; };
  const ageTxt = a => !a ? '' : /^\d+$/.test(String(a).trim()) ? `${a} YRS` : a;

  const rows = data.entries.map(e => {
    const out = e.outcome !== 'active' ? (OUTCOMES.find(o => o.id === e.outcome) || {}).label : '';
    const c2 = textParas(docx, [[e.name, ageTxt(e.age)].filter(Boolean).join(', ')], base);
    if (e.uhid) c2.push(...textParas(docx, ['', `UHID: ${e.uhid}`], base));
    if (out) c2.push(...textParas(docx, ['', `${out.toUpperCase()}${e.outcomeNote ? ' (' + e.outcomeNote + ')' : ''}`], base, { bold: true }));
    const c3 = textParas(docx, [`DOA:${fmtShort(e.doa)}`, `MICU:${fmtShort(e.micuDate)}`, '', e.consultant || ''], base);
    const src = String(e.source || '').replace(/\s+/g, '');
    return new TableRow({
      cantSplit: true,
      children: [
        cell(textParas(docx, bedLines(e.bed), base), 0),
        cell(c2, 1),
        cell(c3, 2),
        cell(join(rich(e.diagnosis), rich(e.investigations)), 3),
        cell(textParas(docx, src.length <= 3 ? src.split('') : [src], base, { align: AlignmentType.CENTER }), 4),
        cell(join(rich(e.history), rich(e.plan)), 5),
        cell(rich(e.drugs), 6),
        cell(textParas(docx, splitNames(e.referral).length ? splitNames(e.referral) : [''], base), 7)
      ]
    });
  });
  if (!rows.length) rows.push(new TableRow({ children: widths.map((_, i) => cell([], i)) }));

  const d = parseISO(data.date), day = d.getUTCDate();
  const H = { font: base.font, size: 26, bold: true };
  const header = new Header({
    children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: TW }],
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } },
      spacing: { after: 60 },
      children: [
        new TextRun({ ...H, text: (data.doctors || '').toUpperCase() }),
        new TextRun({ ...H, children: [new Tab(), String(day)] }),
        new TextRun({ ...H, text: ordinal(day), superScript: true }),
        new TextRun({ ...H, text: ` ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` })
      ]
    })]
  });
  const table = new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, borders, rows });
  const doc = new Document({
    creator: CFG.appName || 'MICU HANDOVER', title: `MICU Handover ${data.date}`,
    styles: { default: { document: { run: { font: base.font, size: base.size * 2 } } } },
    sections: [{
      properties: { page: { size: { width: PAGE_H, height: PAGE_W, orientation: PageOrientation.LANDSCAPE }, margin: { top: 900, bottom: M, left: M, right: M, header: 300, footer: 300 } } },
      headers: { default: header },
      children: [table, ...(data.interim && data.interim.length ? [new Paragraph({ spacing: { before: 200, after: 60 }, children: [new TextRun({ text: 'CAME AND LEFT BEFORE THE NEXT HANDOVER', bold: true, font: base.font, size: base.size * 2 })] }), ...data.interim.map(e => new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: interimLine(e), font: base.font, size: base.size * 2 })] }))] : [])]
    }]
  });
  return Packer.toBlob(doc);
}

/* ---------------- print / PDF ---------------- */
function doPrint() {
  const list = exportList(), d = parseISO(S.date), day = d.getUTCDate();
  const pct = [3.0, 8.3, 9.2, 15.7, 1.7, 46.3, 7.8, 8.0];
  const lines = arr => arr.map(t => `<div>${t ? esc(t) : '&nbsp;'}</div>`).join('');
  const join = (...h) => h.filter(x => htmlToText(x)).join('<div>&nbsp;</div>');
  const ageTxt = a => !a ? '' : /^\d+$/.test(String(a).trim()) ? `${a} YRS` : a;
  const area = $('#print-area');
  area.style.setProperty('--pfont', `'${S.prefs.exportFont}', Calibri, Arial, sans-serif`);
  area.style.setProperty('--psize', `${S.prefs.exportSize}pt`);
  area.innerHTML = `<div class="ps-head"><span>${esc((S.sheet.doctors || '').toUpperCase())}</span><span>${day}<sup>${ordinal(day)}</sup> ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}</span></div>
  <table class="ps-table"><colgroup>${pct.map(p => `<col style="width:${p}%">`).join('')}</colgroup><tbody>
  ${list.map(e => {
    const out = e.outcome !== 'active' ? (OUTCOMES.find(o => o.id === e.outcome) || {}).label : '';
    const b = String(e.bed || ''); const src = String(e.source || '').replace(/\s+/g, '');
    return `<tr><td>${lines(b.length === 4 ? [b.slice(0, 2), b.slice(2)] : [b])}</td>
    <td>${lines([[e.name, ageTxt(e.age)].filter(Boolean).join(', ')])}${e.uhid ? lines(['', 'UHID: ' + e.uhid]) : ''}${out ? `<div>&nbsp;</div><div><b>${esc(out.toUpperCase())}${e.outcomeNote ? ' (' + esc(e.outcomeNote) + ')' : ''}</b></div>` : ''}</td>
    <td>${lines(['DOA:' + fmtShort(e.doa), 'MICU:' + fmtShort(e.micuDate), '', e.consultant || ''])}</td>
    <td>${join(e.diagnosis, e.investigations)}</td>
    <td style="text-align:center">${lines(src.length <= 3 ? src.split('') : [src])}</td>
    <td>${join(e.history, e.plan)}</td><td>${e.drugs || ''}</td><td>${lines(splitNames(e.referral).length ? splitNames(e.referral) : [''])}</td></tr>`;
  }).join('')}</tbody></table>${interimForPrint(S.entries).length ? `<div class="ps-interim"><b>CAME AND LEFT BEFORE THE NEXT HANDOVER</b>${interimForPrint(S.entries).map(e => `<div>${esc(interimLine(e))}</div>`).join('')}</div>` : ''}`;
  closeModal();
  setTimeout(() => window.print(), 150);
}

/* ---------------- settings ---------------- */
let setTab = 'look';
function openSettings(tab) {
  if (tab) setTab = tab;
  const p = S.prefs, admin = isAdmin();
  const tabs = [['look', 'Look'], ['print', 'Print'], ...(admin ? [['lists', 'Lists'], ['users', 'Users'], ['drive', 'Drive']] : []), ['account', 'Account']];
  if (!tabs.find(t => t[0] === setTab)) setTab = 'look';
  let body = '';
  if (setTab === 'look') body = `
    <div class="panel"><h4>Theme</h4><div class="themes">${THEMES.map(t => `<button class="theme-tile ${p.theme === t.id ? 'on' : ''}" data-action="pref" data-k="theme" data-v="${t.id}"><div class="prev" style="background:${t.c[0]}"><i style="background:${t.c[2]}"></i><i style="background:${t.c[1]}"></i></div>${esc(t.name)}</button>`).join('')}</div></div>
    <div class="panel"><h4>Font</h4><div class="opt-row">${Object.keys(FONTS).map(f => `<button class="opt ${p.font === f ? 'on' : ''}" style="font-family:${FONTS[f]}" data-action="pref" data-k="font" data-v="${f}">${f}</button>`).join('')}</div>
      <h4 style="margin-top:14px">Weight</h4><div class="opt-row"><button class="opt ${p.weight === '400' ? 'on' : ''}" data-action="pref" data-k="weight" data-v="400">Normal</button><button class="opt ${p.weight === '700' ? 'on' : ''}" style="font-weight:700" data-action="pref" data-k="weight" data-v="700">Bold</button></div>
      <h4 style="margin-top:14px">Text size · <span id="fsv">${p.fontSize}</span>px</h4><input type="range" min="14" max="20" step="1" value="${p.fontSize}" id="fsRange" style="width:100%"></div>
    <div class="panel"><h4>Card size</h4><div class="opt-row">${[['s', 'Small'], ['m', 'Medium'], ['l', 'Large']].map(([v, l]) => `<button class="opt ${p.cardSize === v ? 'on' : ''}" data-action="pref" data-k="cardSize" data-v="${v}">${l}</button>`).join('')}</div></div>`;
  if (setTab === 'print') body = `
    <div class="panel"><h4>Font in DOCX / PDF</h4><div class="opt-row">${['Calibri', 'Arial', 'Times New Roman'].map(f => `<button class="opt ${p.exportFont === f ? 'on' : ''}" data-action="pref" data-k="exportFont" data-v="${f}">${f}</button>`).join('')}</div>
      <h4 style="margin-top:14px">Size</h4><div class="opt-row">${[9, 10, 11, 12].map(s => `<button class="opt ${+p.exportSize === s ? 'on' : ''}" data-action="pref" data-k="exportSize" data-v="${s}">${s} pt</button>`).join('')}</div></div>
    <div class="panel"><h4>Came and left before the next handover</h4><div class="opt-row"><button class="opt ${!p.printInterim ? 'on' : ''}" data-action="pref" data-k="printInterim" data-v="0">Only in the app</button><button class="opt ${p.printInterim ? 'on' : ''}" data-action="pref" data-k="printInterim" data-v="1">Also as a short list under the table</button></div></div>
    <div class="panel"><h4>Patients who left ICU after the handover</h4><div class="opt-row"><button class="opt ${!p.includeLeft ? 'on' : ''}" data-action="pref" data-k="includeLeft" data-v="0">Leave them out</button><button class="opt ${p.includeLeft ? 'on' : ''}" data-action="pref" data-k="includeLeft" data-v="1">Print them with their status</button></div></div>`;
  if (setTab === 'lists') {
    const sec = (id, title, items, ph, help, open) => `<details class="panel" ${open ? 'open' : ''}><summary><b>${title}</b> · ${items.length}</summary>${help ? `<p class="help" style="margin:0 0 10px">${help}</p>` : ''}${listEd(id, items, ph)}</details>`;
    body = `<p class="help" style="margin-top:0">These lists appear as quick buttons for everyone. Add, change, delete or move items up, then tap Save.</p>
    ${sec('ledBeds', 'Beds', S.settings.beds, 'Bed number, e.g. 2218', 'Shown in this order on the dashboard and the printed sheet.', true)}
    ${sec('ledCons', 'Consultants', S.settings.consultants, 'e.g. DR. ZAMAN', 'Used for both the Consultant and the Referral doctor boxes.')}
    ${sec('ledSrc', '"From" options', S.settings.sources, 'e.g. WARD/CABIN', 'After tapping one, the doctor can still add where exactly (e.g. WARD/CABIN — MEDICINE UNIT 3).')}
    ${sec('ledDx', 'Diagnosis tags', S.settings.dxTags, 'e.g. SEPTIC SHOCK')}
    ${sec('ledAbx', 'Antibiotic tags', S.settings.abxTags, 'e.g. MERO')}
    ${sec('ledDrug', 'Other drug tags', S.settings.drugTags, 'e.g. CLEXANE')}
    <button class="btn primary block" data-action="save-lists">Save for everyone</button>`;
  }
  if (setTab === 'drive') body = driveTab();
  if (setTab === 'users') body = `<div class="panel" id="usersPanel"><div class="loading" style="min-height:120px"><div class="spinner"></div></div></div>`;
  if (setTab === 'account') body = `
    <div class="panel"><h4>Signed in</h4><b>${esc(S.profile.name || '')}</b><div class="help">${esc(S.profile.email || '')} · ${esc(S.profile.role === 'admin' ? 'Admin' : 'Medical officer')}</div></div>
    <div class="panel"><h4>My devices (${(S.profile.devices || []).length}${limitApplies(S.profile) ? ' of ' + maxDevices() : ''})</h4>${deviceRows(S.profile.devices)}${limitApplies(S.profile) ? `<p class="help">Your account works on up to ${maxDevices()} devices. Remove one to use another phone or computer.</p>` : '<p class="help">Admin accounts have no device limit.</p>'}</div>
    <div class="panel"><h4>Data</h4><div class="help">${DEMO ? 'Demo mode — data is kept on this device only.' : 'Cloud mode — saved to Firebase and shared with your team. Works offline and syncs later.'}</div><div class="help">Version ${APP_VERSION}</div></div>
    ${DEMO ? `<button class="btn danger block" data-action="demo-reset">Reset demo data</button>` : `<button class="btn block" data-action="sign-out">${icon('out')} Sign out</button>`}`;
  openModal(`<div class="modal-head"><h3>Settings</h3><button class="icon-btn" data-action="close" aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body"><div class="tabs">${tabs.map(([k, l]) => `<button class="${setTab === k ? 'on' : ''}" data-action="set-tab" data-v="${k}">${l}</button>`).join('')}</div>${body}</div>`);
  const r = $('#fsRange'); if (r) r.addEventListener('input', () => { S.prefs.fontSize = +r.value; $('#fsv').textContent = r.value; savePrefs(); });
  if (setTab === 'users') loadUsers();
}
function catRow(c) { return `<div class="cat-row" data-id="${esc(c.id)}"><input type="color" value="${esc(c.color)}"><input class="input" value="${esc(c.name)}"><button class="icon-btn" data-action="cat-del" aria-label="Remove">${icon('trash')}</button></div>`; }
async function loadUsers() {
  const panel = $('#usersPanel');
  try {
    const users = (await S.store.listUsers()).sort((a, b) => ({ pending: 0, approved: 1, blocked: 2 }[a.status] ?? 3) - ({ pending: 0, approved: 1, blocked: 2 }[b.status] ?? 3) || naturalCmp(a.name, b.name));
    if (!panel.isConnected) return;
    panel.innerHTML = `<h4>Team (${users.length})</h4>` + users.map(u => {
      const me = u.uid === S.user.uid;
      return `<div class="user-row"><div class="u"><b>${esc(u.name || '—')}</b><small>${esc(u.email)}</small></div>
        <span class="st ${esc(u.status)}">${esc(u.status)}</span>${u.role === 'admin' ? '<span class="st approved">admin</span>' : ''}<span class="chip">${(u.devices || []).length} device${(u.devices || []).length === 1 ? '' : 's'}</span>
        ${!me && (u.devices || []).length ? `<button class="btn" data-action="dev-reset" data-uid="${esc(u.uid)}">Clear devices</button>` : ''}
        ${!me && u.status === 'approved' && u.role !== 'admin' ? `<label class="study-acc">Study <select class="input" data-study-uid="${esc(u.uid)}">${[['', 'No access'], ['view', 'Can view'], ['edit', 'Can edit']].map(([v, l]) => `<option value="${v}" ${(u.study || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
        ${me ? '' : `${u.status !== 'approved' ? `<button class="btn primary" data-action="user" data-uid="${esc(u.uid)}" data-v="approve">Approve</button>` : ''}
        ${u.status !== 'blocked' ? `<button class="btn danger" data-action="user" data-uid="${esc(u.uid)}" data-v="block">Block</button>` : ''}
        ${u.status === 'approved' ? `<button class="btn" data-action="user" data-uid="${esc(u.uid)}" data-v="${u.role === 'admin' ? 'unadmin' : 'admin'}">${u.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>` : ''}`}</div>`;
    }).join('');
  } catch (e) { panel.innerHTML = `<p class="err">Could not load users: ${esc(e.code || e.message)}</p>`; }
}

/* =================================================================
   ACTIONS
   ================================================================= */
const A = {
  'auth-mode': t => renderAuth(t.dataset.v),
  forgot: async () => {
    const email = ($('#authForm [name=email]') || {}).value || prompt('Your email');
    if (!email) { $('#authErr').textContent = 'Write your email above first.'; return; }
    try { await S.store.resetPassword(email.trim()); toast('Password reset link sent to ' + email); } catch (e) { $('#authErr').textContent = authErr(e); }
  },
  'sign-out': async () => { closeModal(); try { await S.store.signOut(); } catch (e) { toast(e.message); } },
  'verify-resend': async () => { try { await S.store.resendVerification(); toast('Link sent'); } catch (e) { $('#vErr').textContent = authErr(e); } },
  'verify-check': async () => {
    try { const u = await S.store.reloadUser(); S.user = u; if (!u.emailVerified) { $('#vErr').textContent = 'Not verified yet. Open the link in the email first.'; return; } S.profile = await S.store.ensureProfile(u); route(); }
    catch (e) { $('#vErr').textContent = authErr(e); }
  },
  nav: t => { const i = navIndex(), l = S.sheetList; const j = t.dataset.v === 'older' ? i + 1 : i - 1; if (i >= 0 && l[j]) openSheet(l[j].sid); },
  latest: () => { if (S.sheetList[0]) openSheet(S.sheetList[0].sid); else openSheet(null); },
  handovers: () => openHandoverList(sidDate(S.sid || todayISO()).slice(0, 7)),
  'hl-month': t => openHandoverList(t.dataset.v),
  'new-handover': () => openNewHandover(),
  'nh-create': () => createHandover(),
  'nh-add-interim': () => interimForm(null, { onSave: out => { NH.interim.push(out); renderNH(); } }),
  'nh-del-interim': t => { NH.interim.splice(+t.dataset.i, 1); renderNH(); },
  add: () => openAddChooser(),
  'interim-new': () => { closeModal(); openInterim(null); },
  'interim-edit': t => openInterim(t.dataset.id),
  sort: t => { S.prefs.sort = t.dataset.v; savePrefs(); $$('[data-action="sort"]').forEach(b => b.classList.toggle('on', b === t)); renderGrid(); },
  size: t => { S.prefs.cardSize = t.dataset.v; savePrefs(); $$('[data-action="size"]').forEach(b => b.classList.toggle('on', b === t)); renderGrid(); },
  create: t => { t.disabled = true; createSheet(t.dataset.v); },
  new: t => openEditor(null, t.dataset.bed),
  edit: t => openEditor(t.dataset.id),
  close: () => closeModal(),
  'save-entry': () => saveEntry(),
  outcome: t => { const body = $('#edBody'); body.dataset.outcome = t.dataset.v; $$('#outcomes button').forEach(b => b.classList.toggle('on', b === t)); $('#outNoteWrap').classList.toggle('hidden', t.dataset.v === 'active'); },
  'delete-entry': async () => {
    const body = $('#edBody'); const e = body._orig;
    if (!(await ask(`Delete ${e.name || 'this patient'} from the ${fmtSid(S.sid)} handover?\n\nOther handovers are not changed. If the patient has left ICU, use "Left ICU after this handover?" instead.`, { ok: 'Delete', danger: true }))) return;
    try { await settle(S.store.deleteEntry(S.sid, e.id, logRec('delete', e))); closeModal(); toast('Deleted'); } catch (err) { saveFail(err); }
  },
  export: () => openMenu(),
  docx: () => { closeModal(); doDocx(false); },
  'docx-share': () => { closeModal(); doDocx(true); },
  print: () => doPrint(),
  'delete-sheet': async () => {
    if (!(await ask(`Delete the whole ${fmtSid(S.sid)} sheet with ${S.entries.length} patients? This cannot be undone.`, { ok: 'Delete sheet', danger: true }))) return;
    try { await S.store.deleteSheet(S.sid); closeModal(); toast('Sheet deleted'); S.sid = null; setTimeout(() => A.latest(), 300); } catch (e) { saveFail(e); }
  },
  settings: () => openSettings(),
  'set-tab': t => openSettings(t.dataset.v),
  pref: t => {
    const k = t.dataset.k; let v = t.dataset.v;
    if (k === 'includeLeft' || k === 'printInterim') v = v === '1'; if (k === 'exportSize') v = +v;
    S.prefs[k] = v; savePrefs();
    if (k === 'cardSize') { $$('[data-action="size"]').forEach(b => b.classList.toggle('on', b.dataset.v === v)); renderGrid(); }
    const sc = $('.modal-body') ? $('.modal-body').scrollTop : 0; openSettings(); if ($('.modal-body')) $('.modal-body').scrollTop = sc;
  },
  'led-add': t => { const box = $('#' + t.dataset.id); box.insertAdjacentHTML('beforeend', ledRow('', t.dataset.ph || '')); const ins = $$('input', box); ins[ins.length - 1].focus(); },
  'led-del': t => t.closest('.led-row').remove(),
  'led-up': t => { const r = t.closest('.led-row'), p = r.previousElementSibling; if (p) r.parentNode.insertBefore(r, p); },
  'cat-add': () => { $('#catList').insertAdjacentHTML('beforeend', catRow({ id: 'c' + Date.now().toString(36), name: '', color: '#0ea5e9' })); $('#catList .cat-row:last-child .input').focus(); },
  'cat-del': t => { const r = t.closest('.cat-row'); if ($$('#catList .cat-row').length <= 1) { toast('Keep at least one category'); return; } r.remove(); },
  'save-lists': async () => {
    const beds = ledVals('ledBeds'), sources = ledVals('ledSrc'), consultants = ledVals('ledCons'), dxTags = ledVals('ledDx'), abxTags = ledVals('ledAbx'), drugTags = ledVals('ledDrug');

    if (!beds.length) { toast('Add at least one bed'); return; }
    try { const r = await settle(S.store.saveSettings({ beds, sources, consultants, dxTags, abxTags, drugTags })); toast(r === 'pending' ? savedMsg(r) : 'Saved for everyone'); } catch (e) { saveFail(e); }
  },
  user: async t => {
    const v = t.dataset.v, uid = t.dataset.uid;
    const patch = v === 'approve' ? { status: 'approved' } : v === 'block' ? { status: 'blocked' } : v === 'admin' ? { role: 'admin' } : { role: 'mo' };
    if (v === 'block' && !(await ask('Stop this person\'s access?', { ok: 'Block', danger: true }))) return;
    try { await S.store.setUser(uid, patch); toast('Updated'); loadUsers(); } catch (e) { saveFail(e); }
  },
  'demo-reset': async () => { if (!(await ask('Reset the demo data on this device?', { ok: 'Reset', danger: true }))) return; try { localStorage.removeItem('handover-demo-v6'); } catch { } location.reload(); },
  menu: () => openMenu(),
  import: () => pickImportFile(),
  'import-go': () => runImport(),
  'imp-missing': t => { IMP.removeMissing = t.dataset.v === 'remove'; $$('[data-action="imp-missing"]').forEach(b => b.classList.toggle('on', b === t)); },
  'drive-now': async () => { closeModal(); toast('Saving to Google Drive…', 2000); try { await archiveSheet(S.sid); toast('Saved to Google Drive'); } catch (e) { console.error(e); toast(e.message || String(e), 5000); } },
  'drv-auto': t => { S.settings.driveAuto = t.dataset.v === '1'; $$('[data-action="drv-auto"]').forEach(b => b.classList.toggle('on', b === t)); },
  'drv-save': async () => { try { await S.store.saveSettings({ driveUrl: $('#drvUrl').value.trim(), driveKey: $('#drvKey').value.trim(), driveAuto: S.settings.driveAuto !== false }); toast('Drive settings saved'); } catch (e) { saveFail(e); } },
  'drv-test': async () => {
    const out = $('#drvOut'); out.textContent = 'Testing…';
    S.settings.driveUrl = $('#drvUrl').value.trim(); S.settings.driveKey = $('#drvKey').value.trim();
    try { const r = await postDrive({ action: 'ping' }); out.innerHTML = `Connected. Folder: <a href="${esc(r.folderUrl)}" target="_blank" rel="noopener">open</a> · Database sheet: <a href="${esc(r.sheetUrl)}" target="_blank" rel="noopener">open</a>`; await S.store.saveSettings({ driveUrl: S.settings.driveUrl, driveKey: S.settings.driveKey, driveAuto: S.settings.driveAuto !== false, driveFolderUrl: r.folderUrl || '', driveSheetUrl: r.sheetUrl || '' }); }
    catch (e) { out.innerHTML = `<span class="err">${esc(e.message || String(e))}</span>`; }
  },
  'search-all': () => openSearch(),
  'sr-mode': t => { SR.mode = t.dataset.v; $$('[data-action="sr-mode"]').forEach(b => b.classList.toggle('on', b === t)); $('#srRange').classList.toggle('hidden', SR.mode !== 'text'); runSearch(); },
  goto: t => { if (t.dataset.sid) goTo(t.dataset.sid, t.dataset.id); },
  activity: () => openActivity(),
  reports: () => openReports(),
  'rp-quick': t => { RP.to = todayISO(); RP.from = addDays(RP.to, -(+t.dataset.v - 1)); RP.data = null; $('#rpFrom').value = RP.from; $('#rpTo').value = RP.to; runReport(); },
  csv: t => downloadCsv(t.dataset.v),
  'dev-remove': t => removeDevice(t.dataset.id, t.dataset.uid),
  'dev-reset': async t => { if (!(await ask('Clear all devices for this person? They can sign in again on up to ' + maxDevices() + ' devices.', { ok: 'Clear', danger: true }))) return; try { await S.store.setUser(t.dataset.uid, { devices: [] }); toast('Devices cleared'); loadUsers(); } catch (e) { saveFail(e); } }
};
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-action]'); if (!t) return;
  const f = A[t.dataset.action]; if (!f) return;
  ev.preventDefault(); f(t, ev);
});
document.addEventListener('selectionchange', saveSel);
document.addEventListener('change', ev => {
  const t = ev.target; if (!NH.keep) return;
  if (t.dataset.keep && NH.keep[t.dataset.keep]) { NH.keep[t.dataset.keep].stay = t.checked; renderNH(); }
  else if (t.dataset.keepOut && NH.keep[t.dataset.keepOut]) NH.keep[t.dataset.keepOut].outcome = t.value;
});
document.addEventListener('input', ev => { const t = ev.target; if (NH.keep && t.dataset.keepNote && NH.keep[t.dataset.keepNote]) NH.keep[t.dataset.keepNote].note = t.value; });
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && $('#modal-root').innerHTML) closeModal();
  if (ev.key === 'Enter' && ev.target.matches && ev.target.matches('.card[data-action]')) ev.target.click();
  if ((ev.metaKey || ev.ctrlKey) && ev.key === 's' && $('#edBody')) { ev.preventDefault(); saveEntry(); }
});

/* =================================================================
   CONFIRM DIALOG (works inside installed apps and previews)
   ================================================================= */
function ask(msg, { ok = 'OK', cancel = 'Cancel', danger = false, title = '' } = {}) {
  return new Promise(res => {
    const r = $('#ask-root');
    r.innerHTML = `<div class="modal-backdrop dialog" style="z-index:200"><div class="modal small" role="alertdialog" aria-modal="true">
      <div class="modal-body">${title ? `<h3 class="dlg-title">${esc(title)}</h3>` : ''}<p class="dlg-msg">${esc(msg).replace(/\n/g, '<br>')}</p></div>
      <div class="modal-foot"><span class="spacer"></span><button class="btn" data-dlg="0">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-dlg="1">${esc(ok)}</button></div></div></div>`;
    r.querySelectorAll('[data-dlg]').forEach(b => { b.onclick = ev => { ev.stopPropagation(); r.innerHTML = ''; res(b.dataset.dlg === '1'); }; });
  });
}

/* =================================================================
   CHANGE HISTORY
   ================================================================= */
const FIELD_LABELS = { bed: 'Bed', name: 'Name', age: 'Age', uhid: 'UHID', doa: 'DOA', micuDate: 'MICU date', consultant: 'Consultant', source: 'From', referral: 'Referral', diagnosis: 'Diagnosis', investigations: 'Investigations', history: 'History', plan: 'Status & plan', drugs: 'Drugs', outcome: 'Status', outcomeNote: 'Status note' };
function changedFields(a, b) { return Object.keys(FIELD_LABELS).filter(k => String((a || {})[k] ?? '') !== String((b || {})[k] ?? '')); }
function logRec(action, e, fields, note) {
  return { at: Date.now(), by: S.profile.name || S.user.email, uid: S.user.uid, action, entryId: e ? e.id : '', name: e ? e.name || '' : '', bed: e ? e.bed || '' : '', fields: fields || [], note: note || '' };
}
const ACTION_TEXT = { add: 'added', edit: 'edited', delete: 'deleted', create: 'created the sheet', import: 'imported', archive: 'saved to Drive' };
function logLine(l) {
  const who = `<b>${esc(l.by || '')}</b>`;
  const what = l.entryId ? `${esc(ACTION_TEXT[l.action] || l.action)} <b>${esc(l.bed)} ${esc(l.name)}</b>` : esc(ACTION_TEXT[l.action] || l.action);
  const f = l.fields && l.fields.length ? `<div class="help">${l.fields.map(k => esc(FIELD_LABELS[k] || k)).join(', ')}</div>` : '';
  return `<div class="log-row"><span class="log-time">${esc(fmtTime(l.at))}</span><div>${who} ${what}${l.note ? ` <span class="help">· ${esc(l.note)}</span>` : ''}${f}</div></div>`;
}
async function openActivity() {
  openModal(`<div class="modal-head"><h3>Changes · ${esc(fmtSid(S.sid))}</h3><button class="icon-btn" data-action="close" aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body"><div class="panel" id="actList"><div class="loading" style="min-height:100px"><div class="spinner"></div></div></div></div>`, 'small');
  try {
    const logs = await S.store.getLog(S.sid);
    const el = $('#actList'); if (!el) return;
    el.innerHTML = logs.length ? logs.map(logLine).join('') : '<p class="help">No changes recorded for this day yet.</p>';
  } catch (e) { const el = $('#actList'); if (el) el.innerHTML = `<p class="err">${esc(e.code || e.message)}</p>`; }
}
async function fillEditorHistory(id) {
  const box = $('#edHistory'); if (!box) return;
  try {
    const [logs, p] = await Promise.all([S.store.getLog(S.sid), S.store.getPatient(id).catch(() => null)]);
    if (!box.isConnected) return;
    const mine = logs.filter(l => l.entryId === id).slice(0, 15);
    const days = ((p && p.sheets) || []).filter(d => d !== S.sid).sort().reverse().slice(0, 14);
    box.innerHTML = `${days.length ? `<h4>On other handovers</h4><div class="opt-row">${days.map(d => `<button class="chip" data-action="goto" data-sid="${esc(d)}" data-id="${esc(id)}">${esc(fmtSidShort(d))}</button>`).join('')}</div>` : ''}
      <h4 style="margin-top:${days.length ? 14 : 0}px">Changes on this handover</h4>${mine.length ? mine.map(logLine).join('') : '<p class="help">No changes recorded yet.</p>'}`;
  } catch (e) { box.innerHTML = `<p class="help">History is not available right now.</p>`; }
}
function goTo(sid, id) {
  closeModal();
  if (/^\d{4}-\d{2}-\d{2}$/.test(sid)) sid = sidOf(sid, 'AM');
  S.pendingOpen = id ? { sid, id } : null;
  if (sid === S.sid && S.sheet) { if (id && S.entries.find(e => e.id === id)) { S.pendingOpen = null; openEditor(id); } return; }
  openSheet(sid);
}

/* pending "ENSURE … REF" items shown on cards */
function pendingTasks(e) {
  const out = [];
  htmlToText(e.plan).replace(/\bE[BN]{0,2}SURE\s+([^.\n]{2,60})/gi, (m, g) => { out.push(g.trim().replace(/[,;:]+$/, '')); return m; });
  return out.slice(0, 3);
}

/* =================================================================
   MENU (export, import, drive, data)
   ================================================================= */
function openMenu() {
  const has = !!S.sheet, canShare = !!(navigator.canShare && window.File), drive = !!S.settings.driveUrl;
  const item = (act, ic, title, sub, extra = '') => `<button class="menu-item" data-action="${act}" ${extra}><span class="mi-ic">${icon(ic)}</span><span>${title}<small>${sub}</small></span></button>`;
  openModal(`<div class="modal-head"><h3>${esc(fmtSid(S.sid))}</h3><button class="icon-btn" data-action="close" aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body">
      ${has ? `<div class="menu-group">Print and share</div><div class="menu-list">
        ${item('docx', 'file', 'Download Word (DOCX)', 'Same layout as the printed handover sheet')}
        ${canShare ? item('docx-share', 'share', 'Share DOCX', 'WhatsApp, email, Files…') : ''}
        ${item('print', 'print', 'Print / Save as PDF', 'A4 landscape')}
        ${drive ? item('drive-now', 'cloud', 'Save to Google Drive now', S.sheet.archivedAt ? 'Last saved ' + fmtTime(S.sheet.archivedAt) : 'Not saved to Drive yet') : ''}
      </div>` : ''}
      <div class="menu-group">Bring a sheet in</div><div class="menu-list">
        ${item('import', 'upload', 'Import edited DOCX', 'A sheet edited on a computer or received on WhatsApp')}
      </div>
      <div class="menu-group">Find and review</div><div class="menu-list">
        ${item('search-all', 'search', 'Search all days', 'Any patient, UHID, diagnosis or drug')}
        ${has ? item('activity', 'clock', 'Changes on this handover', 'Who changed what, and when') : ''}
        ${item('reports', 'chart', 'Reports and data', 'Counts, outcomes, CSV for Excel')}
      </div>
      ${canStudy() ? `<div class="menu-group">Study (only you${isAdmin() ? ' and people you allow' : ''})</div><div class="menu-list">${item('study', 'flask', 'Study', 'Investigations, serology, cultures, antibiotics, CPR register, outcome counts, your studies')}</div>` : ''}
      ${has && isAdmin() ? `<div class="menu-group">Admin</div><div class="menu-list">${item('delete-sheet', 'trash', 'Delete this handover sheet', 'Cannot be undone', 'style="color:var(--danger)"')}</div>` : ''}
      ${has ? `<p class="help">${S.prefs.includeLeft ? 'Patients who left ICU after this handover are still printed, with their status.' : 'Patients who left ICU after this handover are left out of DOCX and print.'} Change it in Settings → Print.</p>` : ''}
    </div>`, 'small');
}

/* =================================================================
   IMPORT EDITED DOCX
   ================================================================= */
async function loadFflate() {
  if (window.fflate && window.fflate.unzipSync) return window.fflate;
  try { await loadScript(CFG.fflateUrl || 'lib/fflate.js'); } catch { await loadScript('https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js'); }
  return window.fflate;
}
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const MONTH_RX = '(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|JUN|JUL|AUG|SEPT?|OCT|NOV|DEC)';
const HL = { yellow: 'FFFF00', green: '00FF00', cyan: '00FFFF', magenta: 'FF00FF', blue: '0000FF', red: 'FF0000', darkBlue: '000080', darkCyan: '008080', darkGreen: '008000', darkMagenta: '800080', darkRed: '800000', darkYellow: '808000', lightGray: 'C0C0C0', darkGray: '808080' };
function wAttr(el, n) { if (!el) return null; const v = el.getAttributeNS(W_NS, n); return v !== null && v !== '' ? v : el.getAttribute('w:' + n); }
function wKids(el, n) { return [...el.childNodes].filter(c => c.nodeType === 1 && c.localName === n); }
function wOn(el) { if (!el) return false; const v = wAttr(el, 'val'); return v === null || !/^(0|false|none)$/i.test(v); }
function parsePara(p) {
  const runs = [];
  const visit = node => {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType !== 1) return;
      const n = ch.localName;
      if (n === 'del' || n === 'pPr' || n === 'moveFrom') return;
      if (n !== 'r') { visit(ch); return; }
      const pr = wKids(ch, 'rPr')[0];
      const get = k => pr && wKids(pr, k)[0];
      const color = get('color') ? wAttr(get('color'), 'val') : null;
      const hl = get('highlight') ? HL[wAttr(get('highlight'), 'val')] : null;
      const shd = get('shd') ? wAttr(get('shd'), 'fill') : null;
      const fmt = { b: wOn(get('b')), i: wOn(get('i')), u: get('u') ? wOn(get('u')) : false, color: color && color !== 'auto' && color !== '000000' ? color : null, bg: hl || (shd && shd !== 'auto' && shd.toUpperCase() !== 'FFFFFF' ? shd : null) };
      [...ch.childNodes].forEach(t => {
        if (t.nodeType !== 1) return;
        if (t.localName === 't') runs.push({ ...fmt, text: t.textContent });
        else if (t.localName === 'tab') runs.push({ ...fmt, text: ' ' });
        else if (t.localName === 'br' || t.localName === 'cr') runs.push({ br: true });
      });
    });
  };
  visit(p);
  // merge runs with the same look, build lines (a <w:br> starts a new line)
  const lines = [[]];
  runs.forEach(r => { if (r.br) { lines.push([]); return; } const cur = lines[lines.length - 1], last = cur[cur.length - 1]; if (last && last.b === r.b && last.i === r.i && last.u === r.u && last.color === r.color && last.bg === r.bg) last.text += r.text; else cur.push({ ...r }); });
  return lines.map(segs => {
    const text = segs.map(s => s.text).join('');
    const html = segs.map(s => {
      let h = esc(s.text);
      if (s.color) h = `<font color="#${s.color}">${h}</font>`;
      if (s.bg) h = `<span style="background-color:#${s.bg}">${h}</span>`;
      if (s.u) h = `<u>${h}</u>`; if (s.i) h = `<i>${h}</i>`; if (s.b) h = `<b>${h}</b>`;
      return h;
    }).join('');
    return { text: text.replace(/ /g, ' '), html };
  });
}
function cellLines(tc) { const out = []; wKids(tc, 'p').forEach(p => out.push(...parsePara(p))); return out; }
function trimBlank(lines) { let a = 0, b = lines.length; while (a < b && !lines[a].text.trim()) a++; while (b > a && !lines[b - 1].text.trim()) b--; return lines.slice(a, b); }
function linesHtml(lines) { return trimBlank(lines).map(l => l.html).join('<br>'); }
function splitAtBlank(lines) {
  const t = trimBlank(lines); const i = t.findIndex(l => !l.text.trim());
  return i < 0 ? [t, []] : [t.slice(0, i), trimBlank(t.slice(i + 1))];
}
function parseDMY(s) {
  const m = String(s || '').match(/(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{2,4})/); if (!m) return '';
  let y = +m[3]; if (y < 100) y += 2000;
  const d = +m[1], mo = +m[2]; if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
  return `${y}-${pad(mo)}-${pad(d)}`;
}
function parseHeaderLine(text) {
  const rx = new RegExp(`(\\d{1,2})\\s*(?:ST|ND|RD|TH)?\\s*(?:OF\\s+)?${MONTH_RX}[,\\s]+(\\d{4})`, 'i');
  const m = text.match(rx); if (!m) return null;
  const mi = MONTHS.findIndex(x => x.startsWith(m[2].toUpperCase().slice(0, 3)));
  const date = `${m[3]}-${pad(mi + 1)}-${pad(+m[1])}`;
  let shift = '';
  if (/\b(EVENING|NIGHT|PM)\b/i.test(text)) shift = 'PM'; else if (/\b(MORNING|AM)\b/i.test(text)) shift = 'AM';
  const doctors = text.replace(m[0], '').replace(/\(?\s*\b(MORNING|EVENING|NIGHT)\b\s*\)?/gi, ' ').replace(/\s{2,}/g, ' ').replace(/^[\s,;|()-]+|[\s,;|()-]+$/g, '').trim();
  return { date, doctors, shift };
}
function nameKey(n) { return String(n || '').toUpperCase().replace(/\b(MST|MSS|MD|MOHAMMAD|MOHAMMED|MUHAMMAD|MRS|MR|MS|MISS|BABY|SK|SHEIKH)\b\.?/g, '').replace(/[^A-Z]/g, ''); }
function firstToken(n) { return (String(n || '').toUpperCase().replace(/\b(MST|MD|MRS|MR|MS|MISS)\b\.?/g, '').match(/[A-Z]{2,}/) || [''])[0]; }
function parseHandoverRow(cells) {
  const L = cells.map(cellLines), T = i => trimBlank(L[i] || []).map(l => l.text.trim()).filter(Boolean);
  if (L.length < 6) return null;
  const has8 = L.length >= 8;
  const bed = T(0).join('').replace(/\s+/g, '');
  // name, age, UHID, status
  let lines = T(1), uhid = '', outcome = 'active', outcomeNote = '';
  lines = lines.filter(l => { const u = l.match(/^UHID\s*[:\-]?\s*(\S+)/i); if (u) { uhid = u[1]; return false; } return true; });
  lines = lines.filter(l => {
    const o = l.match(/^(DISCHARGED|SHIFTED TO WARD|DAMA|LAMA|DEATH|DIED|EXPIRED|TRANSFERRED)\b\s*(?:\((.*)\))?/i);
    if (!o) return true;
    const k = o[1].toUpperCase(); outcome = /DISCH/.test(k) ? 'discharged' : /WARD/.test(k) ? 'ward' : /DAMA|LAMA/.test(k) ? 'dama' : /DEATH|DIED|EXPIRED/.test(k) ? 'death' : 'transfer';
    outcomeNote = (o[2] || '').trim(); return false;
  });
  let nameAge = lines.join(' ').replace(/\s+/g, ' ').trim(), age = '';
  const am = nameAge.match(/,?\s*(\d{1,3}(?:\.\d)?)\s*(YRS?|YEARS?|Y|MONTHS?|MTHS?|M|DAYS?|D)\b\.?\s*(?:OLD)?/i);
  if (am) { age = /^Y/i.test(am[2]) ? am[1] : `${am[1]} ${am[2].toUpperCase()}`; nameAge = (nameAge.slice(0, am.index) + nameAge.slice(am.index + am[0].length)).trim(); }
  const name = nameAge.replace(/[,;\s]+$/, '').trim().toUpperCase();
  // dates and consultant
  const c2 = T(2); let doa = '', micu = ''; const cons = [];
  c2.forEach(l => {
    if (/^D\.?\s*O\.?\s*A/i.test(l)) doa = parseDMY(l) || doa;
    else if (/^(M?ICU|HDU|CCU)\b/i.test(l)) micu = parseDMY(l) || micu;
    else cons.push(l);
  });
  const [dx, inv] = splitAtBlank(L[3] || []);
  const [hx, plan] = splitAtBlank(L[5] || []);
  return {
    bed, name, age, uhid, outcome, outcomeNote, doa, micuDate: micu || doa, consultant: cons.join(' ').toUpperCase(),
    diagnosis: linesHtml(dx), investigations: linesHtml(inv), source: T(4).join('').toUpperCase(),
    history: linesHtml(hx), plan: linesHtml(plan), drugs: linesHtml(L[6] || []), referral: has8 ? T(7).join(', ').toUpperCase() : ''
  };
}
async function parseHandoverDocx(buf) {
  const ff = await loadFflate();
  let files; try { files = ff.unzipSync(new Uint8Array(buf)); } catch { throw new Error('This file is not a Word .docx file. If it is an old .doc file, open it in Word and save it as .docx.'); }
  const xml = n => files[n] ? new DOMParser().parseFromString(ff.strFromU8(files[n]), 'application/xml') : null;
  const doc = xml('word/document.xml'); if (!doc) throw new Error('This file is not a Word .docx file.');
  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0];
  // header line: Word page header first, then text above the table
  let head = null;
  const headerFiles = Object.keys(files).filter(n => /^word\/header\d*\.xml$/.test(n)).sort();
  for (const n of headerFiles) { const h = xml(n); for (const p of h.getElementsByTagNameNS(W_NS, 'p')) { const t = parsePara(p).map(l => l.text).join(' '); head = parseHeaderLine(t); if (head) break; } if (head) break; }
  const tables = [...doc.getElementsByTagNameNS(W_NS, 'tbl')].filter(t => t.parentNode === body);
  if (!tables.length) throw new Error('No table found. The file should have the handover table.');
  if (!head) { for (const ch of body.childNodes) { if (ch.localName === 'tbl') break; if (ch.localName === 'p') { head = parseHeaderLine(parsePara(ch).map(l => l.text).join(' ')); if (head) break; } } }
  const rows = [];
  tables.forEach(tbl => wKids(tbl, 'tr').forEach(tr => {
    const r = parseHandoverRow(wKids(tr, 'tc'));
    if (!r || !r.name || /^NAME\b|^PATIENT/i.test(r.name)) return;
    rows.push(r);
  }));
  if (!rows.length) throw new Error('No patients found in the table.');
  return { date: head ? head.date : '', shift: head ? head.shift : '', doctors: head ? head.doctors : '', rows };
}
function matchRows(rows, pool) {
  const used = new Set();
  return rows.map(r => {
    const k = nameKey(r.name);
    let m = pool.find(e => !used.has(e.id) && nameKey(e.name) === k && k);
    if (!m) m = pool.find(e => !used.has(e.id) && e.bed === r.bed && firstToken(e.name) && firstToken(e.name) === firstToken(r.name));
    if (m) used.add(m.id);
    return { row: r, match: m || null };
  });
}
const IMP = { data: null, file: '' };
function pickImportFile() {
  closeModal();
  const inp = document.createElement('input'); inp.type = 'file';
  inp.accept = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  inp.onchange = async () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    toast('Reading ' + f.name + '…', 1500);
    try { const parsed = await parseHandoverDocx(await f.arrayBuffer()); IMP.data = parsed; IMP.file = f.name; if (!parsed.date) parsed.date = (f.name.match(/\d{4}-\d{2}-\d{2}/) || [todayISO()])[0]; const t = f.name.match(/_(\d{2})(\d{2})\.docx$/i); await openImportPreview(parsed.date, null, t ? `${t[1]}:${t[2]}` : '08:00'); }
    catch (e) { console.error(e); toast(e.message || String(e), 5000); }
  };
  inp.click();
}
async function openImportPreview(date, target, hm) {
  const P = IMP.data; if (!P) return;
  const existing = (await S.store.sheetsSince(date, date)).sort((a, b) => b.sid.localeCompare(a.sid));
  if (target === null) target = existing.length ? existing[0].sid : 'new';
  if (target !== 'new' && !existing.some(x => x.sid === target)) target = existing.length ? existing[0].sid : 'new';
  IMP.target = target; IMP.hm = hm || IMP.hm || '08:00';
  const sid = target !== 'new' ? target : sidOf(date, IMP.hm.replace(':', ''));
  P.sid = sid; P.date = date;
  const day = target !== 'new' ? await S.store.getSheet(sid) : null;
  const prev = day ? null : await S.store.latestSheetBefore(sid);
  const pool = day ? day.entries.filter(e => !e.interim) : (prev ? prev.entries.filter(e => !e.interim && e.outcome === 'active') : []);
  const matched = matchRows(P.rows, pool);
  const by = S.profile.name || S.user.email, now = Date.now();
  IMP.plan = matched.map(({ row, match }) => {
    const base = match ? clone(match) : { id: newId(), category: 'other', carried: false };
    const e = { ...base, ...row, uhid: row.uhid || base.uhid || '', id: base.id, category: base.category || 'other', updatedBy: by, updatedAt: now };
    delete e._blob;
    if (!day && match) e.carried = true;
    const fields = match ? changedFields(match, e) : [];
    return { e, status: !match ? 'new' : (day && !fields.length ? 'same' : (day ? 'updated' : 'carried')), fields };
  });
  const inFile = new Set(IMP.plan.map(p => p.e.id));
  IMP.missing = day ? day.entries.filter(e => !e.interim && !inFile.has(e.id)) : [];
  IMP.dayExists = !!day; IMP.sheet = day ? day.sheet : null;
  const cnt = s => IMP.plan.filter(p => p.status === s).length;
  const badge = { new: '<span class="badge new">New</span>', updated: '<span class="badge">Updated</span>', same: '<span class="badge" style="opacity:.6">No change</span>', carried: '<span class="badge">From ' + (prev ? esc(fmtSidShort(prev.sid)) : 'before') + '</span>' };
  openModal(`<div class="modal-head"><button class="icon-btn" data-action="close" aria-label="Close">${icon('x')}</button><h3>Import DOCX</h3><button class="btn primary" data-action="import-go">Import</button></div>
    <div class="modal-body">
      <div class="panel"><h4>${esc(IMP.file)}</h4>
        <div class="row">
          <label class="field"><span>Date</span><input class="input" type="date" id="impDate" value="${esc(date)}"></label>
          <label class="field"><span>Handover</span><select class="input" id="impTarget">${existing.map(x => `<option value="${esc(x.sid)}" ${x.sid === target ? 'selected' : ''}>Update the ${esc(fmtClock(sidHM(x.sid)))} handover</option>`).join('')}<option value="new" ${target === 'new' ? 'selected' : ''}>New handover</option></select></label>
          ${target === 'new' ? `<label class="field"><span>Time</span><input class="input" type="time" id="impTime" value="${esc(IMP.hm)}"></label>` : ''}
          <label class="field" style="grid-column:1/-1"><span>Doctors on duty</span><input class="input" id="impDoctors" value="${esc(P.doctors || (IMP.sheet && IMP.sheet.doctors) || '')}"></label>
        </div>
        <p class="help">${IMP.dayExists ? `The ${esc(fmtSid(sid))} handover already exists in the app. Matching patients will be updated.` : `A new handover for ${esc(fmtSid(sid))} will be created from this file.`}</p>
        <div class="stats" style="margin-top:8px"><span class="stat"><b>${P.rows.length}</b> in file</span><span class="stat"><b>${cnt('new')}</b> new</span>${IMP.dayExists ? `<span class="stat"><b>${cnt('updated')}</b> updated</span><span class="stat"><b>${cnt('same')}</b> no change</span>` : `<span class="stat"><b>${cnt('carried')}</b> matched to the handover before</span>`}</div>
      </div>
      ${IMP.missing.length ? `<div class="panel"><h4>${IMP.missing.length} patient${IMP.missing.length === 1 ? ' is' : 's are'} in the app but not in the file</h4>
        <div class="help" style="margin-bottom:8px">${IMP.missing.map(e => esc(`${e.bed} ${e.name}`)).join(' · ')}</div>
        <div class="opt-row"><button class="opt on" data-action="imp-missing" data-v="keep">Keep them</button><button class="opt" data-action="imp-missing" data-v="remove">Remove them from this handover</button></div></div>` : ''}
      <div class="panel"><h4>Patients</h4>${IMP.plan.map(p => `<div class="imp-row"><div class="bedbox" style="--c:${esc(bedColor(p.e.bed))}">${esc(p.e.bed || '—')}</div><div class="u"><b>${esc(p.e.name)}</b>${p.e.age ? ` <span class="help">${esc(p.e.age)}</span>` : ''}<div class="help">${p.fields.length && p.status === 'updated' ? 'Changed: ' + p.fields.map(k => esc(FIELD_LABELS[k] || k)).join(', ') : esc(htmlToText(p.e.diagnosis).slice(0, 90))}</div></div>${badge[p.status]}</div>`).join('')}</div>
    </div>`);
  IMP.removeMissing = false;
  const re = ev => { const d = $('#impDate').value; if (!validISO(d)) return; IMP.data.doctors = $('#impDoctors').value; const tm = $('#impTime'); openImportPreview(d, ev && ev.target.id === 'impDate' ? null : $('#impTarget').value, tm ? tm.value : IMP.hm); };
  $('#impDate').addEventListener('change', re); $('#impTarget').addEventListener('change', re); if ($('#impTime')) $('#impTime').addEventListener('change', re);
}
async function runImport() {
  let sid = IMP.data.sid; const doctors = ($('#impDoctors') || {}).value || '';
  if (!IMP.dayExists) for (let i = 0; i < 60 && (S.sheetList || []).some(x => x.sid === sid); i++) sid = sidPlusMin(sid, 1);
  const by = S.profile.name || S.user.email, now = Date.now();
  const write = IMP.plan.filter(p => p.status !== 'same').map(p => p.e);
  const removeIds = IMP.removeMissing ? IMP.missing.map(e => e.id) : [];
  const meta = { doctors: doctors.trim().toUpperCase(), updatedAt: now, updatedBy: by, importedAt: now, importedFrom: IMP.file };
  if (!IMP.dayExists) Object.assign(meta, { createdAt: now, createdBy: by });
  const logs = [logRec('import', null, [], `${IMP.file}: ${write.length} saved${removeIds.length ? ', ' + removeIds.length + ' removed' : ''}`),
    ...IMP.plan.filter(p => p.status === 'updated' || p.status === 'new').map(p => logRec(p.status === 'new' ? 'add' : 'edit', p.e, p.fields, 'from DOCX'))];
  const btn = $('[data-action="import-go"]'); if (btn) btn.disabled = true;
  try {
    await settle(S.store.importSheet(sid, meta, write, removeIds, logs));
    IMP.data = null; closeModal(); toast(`Imported ${IMP.plan.length} patients`); goTo(sid);
  } catch (e) { if (btn) btn.disabled = false; saveFail(e); }
}

/* =================================================================
   GOOGLE DRIVE ARCHIVE (through the Apps Script in drive/Code.gs)
   ================================================================= */
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ROW_HEADER = ['Date', 'Time', 'Type', 'Bed', 'Name', 'Age', 'UHID', 'DOA', 'MICU date', 'ICU day', 'Consultant', 'From', 'Referral', 'Diagnosis', 'Investigations', 'History', 'Status & plan', 'Drugs', 'Status', 'Status note', 'Pending', 'Updated by', 'Updated at', 'Patient ID'];
function safeCell(v) { v = String(v ?? ''); return /^[=+@]/.test(v) ? "'" + v : v; }
function rowOf(sid, e) {
  const date = sidDate(sid);
  const day = validISO(e.micuDate) ? diffDays(e.micuDate, date) + 1 : '';
  return [date, fmtClock(sidHM(sid)), e.interim ? 'Came and left' : 'On handover', e.bed, e.name, e.age, e.uhid || '', e.doa || '', e.micuDate || '', day, e.consultant || '', e.source || '', e.referral || '',
    htmlToText(e.diagnosis), htmlToText(e.investigations), htmlToText(e.history), htmlToText(e.plan), htmlToText(e.drugs),
    (OUTCOMES.find(o => o.id === e.outcome) || {}).label || e.outcome, (e.interim ? `Came ${fmtDT(e.inAt)}, left ${fmtDT(e.outAt)}. ` : '') + (e.outcomeNote || ''), pendingTasks(e).join('; '), e.updatedBy || '', e.updatedAt ? new Date(e.updatedAt).toISOString() : '', e.id].map(safeCell);
}
function blobToB64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); }); }
async function postDrive(payload) {
  const url = S.settings.driveUrl;
  if (!url) throw new Error('Google Drive is not set up yet. Admin: Settings → Drive.');
  const r = await fetch(url, { method: 'POST', body: JSON.stringify({ key: S.settings.driveKey || '', ...payload }) });
  let j; try { j = await r.json(); } catch { throw new Error('Drive script did not answer. Check the web app URL and that access is set to "Anyone".'); }
  if (!j.ok) throw new Error(j.error || 'Drive script refused the file');
  return j;
}
async function archiveSheet(sid) {
  const date = sidDate(sid);
  const day = await S.store.getSheet(sid);
  if (!day || !day.sheet) throw new Error('No sheet for ' + fmtSid(sid));
  const docx = await loadDocx();
  const blob = await buildDocx(docx, { date, interim: interimForPrint(day.entries), doctors: day.sheet.doctors || '', entries: exportListOf(day.entries), font: S.prefs.exportFont, size: +S.prefs.exportSize || 10 });
  const json = new Blob([JSON.stringify({ app: 'micu-handover', version: APP_VERSION, sid, date, time: fmtClock(sidHM(sid)), sheet: day.sheet, entries: day.entries.map(e => { const c = { ...e }; delete c._blob; return c; }) }, null, 1)], { type: 'application/json' });
  const res = await postDrive({
    action: 'archive', date, time: fmtClock(sidHM(sid)), header: ROW_HEADER, rows: day.entries.map(e => rowOf(sid, e)),
    files: [{ name: fileBase(sid) + '.docx', mimeType: DOCX_MIME, data: await blobToB64(blob) }, { name: fileBase(sid) + '.json', mimeType: 'application/json', data: await blobToB64(json) }]
  });
  await S.store.saveSheetMeta(sid, { archivedAt: Date.now(), archivedBy: S.profile.name || S.user.email });
  return res;
}
async function autoArchive() {
  if (S.autoArchiveDone || !S.settings.driveUrl || S.settings.driveAuto === false || !S.online || DEMO) return;
  S.autoArchiveDone = true;
  try {
    const today = todayISO();
    const now = (S.sheetList[0] || {}).sid || '9999';
    const list = (await S.store.sheetsSince(addDays(today, -7))).filter(s => s.sid < now && (s.updatedAt || s.createdAt || 0) > (s.archivedAt || 0));
    let n = 0;
    for (const s of list) { try { await archiveSheet(s.sid); n++; } catch (e) { console.warn('archive', s.sid, e); break; } }
    if (n) toast(`Saved ${n} handover${n === 1 ? '' : 's'} to Google Drive`);
  } catch (e) { console.warn('auto archive', e); }
}

/* =================================================================
   SEARCH ALL DAYS
   ================================================================= */
const SR = { mode: 'patients', q: '', from: '', to: '', range: null, patients: null, at: 0 };
function openSearch() {
  if (!SR.from) { SR.to = todayISO(); SR.from = addDays(SR.to, -30); }
  openModal(`<div class="modal-head"><h3>Search all days</h3><button class="icon-btn" data-action="close" aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body">
      <label class="search" style="margin-bottom:10px">${icon('search')}<input id="srQ" type="search" placeholder="Name, UHID, bed, diagnosis, drug…" value="${esc(SR.q)}" autocomplete="off"></label>
      <div class="seg" style="margin-bottom:10px"><button data-action="sr-mode" data-v="patients" class="${SR.mode === 'patients' ? 'on' : ''}">Patients (all time)</button><button data-action="sr-mode" data-v="text" class="${SR.mode === 'text' ? 'on' : ''}">Everything written</button></div>
      <div id="srRange" class="${SR.mode === 'text' ? '' : 'hidden'}"><div class="row" style="margin-bottom:10px">
        <label class="field"><span>From</span><input class="input" type="date" id="srFrom" value="${esc(SR.from)}"></label>
        <label class="field"><span>To</span><input class="input" type="date" id="srTo" value="${esc(SR.to)}"></label></div></div>
      <div id="srOut"></div>
    </div>`);
  const q = $('#srQ'); q.focus();
  let t; q.addEventListener('input', () => { SR.q = q.value; clearTimeout(t); t = setTimeout(runSearch, 200); });
  ['srFrom', 'srTo'].forEach(id => $('#' + id).addEventListener('change', () => { SR.from = $('#srFrom').value; SR.to = $('#srTo').value; SR.range = null; runSearch(); }));
  runSearch();
}
function snippet(text, words) {
  const t = text.replace(/\s+/g, ' '); const low = t.toLowerCase();
  const i = Math.max(0, low.indexOf(words[0]));
  const s = Math.max(0, i - 50), part = t.slice(s, s + 160);
  let h = esc(part); words.forEach(w => { if (w.length > 1) h = h.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`); });
  return (s ? '…' : '') + h + (s + 160 < t.length ? '…' : '');
}
async function runSearch() {
  const out = $('#srOut'); if (!out) return;
  const words = SR.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (SR.mode === 'patients') {
    if (!SR.patients || Date.now() - SR.at > 120000) {
      out.innerHTML = `<div class="loading" style="min-height:100px"><div class="spinner"></div></div>`;
      try { SR.patients = await S.store.listPatients(); SR.at = Date.now(); } catch (e) { out.innerHTML = `<p class="err">${esc(e.code || e.message)}</p>`; return; }
    }
    let list = SR.patients.slice().sort((a, b) => String(b.lastSheet || '').localeCompare(String(a.lastSheet || '')));
    if (words.length) list = list.filter(p => { const blob = [p.name, p.uhid, p.bed, p.age, p.consultant, p.diagnosisText, catOf(p.category).name, p.outcome].join(' ').toLowerCase(); return words.every(w => blob.includes(w)); });
    const shown = list.slice(0, 80);
    out.innerHTML = `<p class="help" style="margin-bottom:8px">${list.length} patient${list.length === 1 ? '' : 's'}${list.length > 80 ? ' (showing 80, type more to narrow)' : ''}</p>` + shown.map(p => {
      const o = OUTCOMES.find(x => x.id === p.outcome);
      return `<button class="result" data-action="goto" data-sid="${esc(p.lastSheet || '')}" data-id="${esc(p.id)}" style="--c:${esc(bedColor(p.bed))}">
        <div class="bedbox">${esc(p.bed || '—')}</div>
        <div class="u"><b>${esc(p.name)}</b> <span class="help">${esc(p.age ? p.age + (/^\d+$/.test(p.age) ? ' Y' : '') : '')}${p.uhid ? ' · ' + esc(p.uhid) : ''}</span>
          <div class="help">MICU ${esc(fmtShort(p.micuDate))}${p.lastSheet ? ' → last on ' + esc(fmtSidShort(p.lastSheet)) : ''}${p.consultant ? ' · ' + esc(p.consultant) : ''}</div>
          <div class="help clamp" style="--lines:2">${esc(p.diagnosisText || '')}</div></div>
        <span class="badge ${p.outcome === 'active' ? 'new' : 'left'}">${esc(o ? o.label : p.outcome || '')}</span></button>`;
    }).join('');
    return;
  }
  if (!validISO(SR.from) || !validISO(SR.to) || SR.from > SR.to) { out.innerHTML = '<p class="err">Choose a valid date range.</p>'; return; }
  if (diffDays(SR.from, SR.to) > 366) { out.innerHTML = '<p class="err">Please choose one year or less at a time.</p>'; return; }
  if (!SR.range) {
    out.innerHTML = `<div class="loading" style="min-height:100px"><div class="spinner"></div></div>`;
    try { SR.range = await S.store.loadRange(SR.from, SR.to); } catch (e) { out.innerHTML = `<p class="err">${esc(e.code || e.message)}</p>`; return; }
  }
  if (!words.length) { out.innerHTML = `<p class="help">${SR.range.length} handovers loaded. Type a word to search in everything written on them.</p>`; return; }
  const hits = [];
  SR.range.slice().reverse().forEach(day => day.entries.forEach(e => {
    const text = [e.bed, e.name, e.age, e.uhid, e.consultant, e.referral, ...RICH_FIELDS.map(f => htmlToText(e[f]))].join(' · ');
    const low = text.toLowerCase(); if (words.every(w => low.includes(w))) hits.push({ sid: day.sid, date: day.date, e, text });
  }));
  out.innerHTML = `<p class="help" style="margin-bottom:8px">${hits.length} match${hits.length === 1 ? '' : 'es'} in ${SR.range.length} handovers</p>` + hits.slice(0, 120).map(h => `
    <button class="result" data-action="goto" data-sid="${esc(h.sid)}" data-id="${esc(h.e.id)}" style="--c:${esc(bedColor(h.e.bed))}">
      <div class="bedbox" style="font-size:.74em;line-height:1.1;text-align:center">${esc(fmtDM(h.date))}<br>${esc(fmtClock(sidHM(h.sid)))}</div>
      <div class="u"><b>${esc(h.e.bed)} · ${esc(h.e.name)}</b><div class="help">${snippet(h.text, words)}</div></div></button>`).join('');
}

/* =================================================================
   REPORTS AND CSV
   ================================================================= */
const RP = { from: '', to: '', data: null };
function openReports() {
  if (!RP.from) { RP.to = todayISO(); RP.from = addDays(RP.to, -29); }
  openModal(`<div class="modal-head"><h3>Reports and data</h3><button class="icon-btn" data-action="close" aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body">
      <div class="panel"><div class="row">
        <label class="field"><span>From</span><input class="input" type="date" id="rpFrom" value="${esc(RP.from)}"></label>
        <label class="field"><span>To</span><input class="input" type="date" id="rpTo" value="${esc(RP.to)}"></label></div>
        <div class="opt-row" style="margin-top:10px">${[[7, '7 days'], [30, '30 days'], [90, '3 months'], [365, '1 year']].map(([n, l]) => `<button class="opt" data-action="rp-quick" data-v="${n}">${l}</button>`).join('')}</div></div>
      <div id="rpOut"></div>
    </div>`);
  ['rpFrom', 'rpTo'].forEach(id => $('#' + id).addEventListener('change', () => { RP.from = $('#rpFrom').value; RP.to = $('#rpTo').value; RP.data = null; runReport(); }));
  runReport();
}
function summarise(range, from = RP.from, to = RP.to) {
  const pts = {}, seen = new Set(), dates = new Set(); let pdays = 0;
  range.forEach(day => day.entries.forEach(e => {
    const key = e.id + '|' + day.date, fresh = !seen.has(key); seen.add(key); dates.add(day.date);
    if (fresh) pdays++;
    const p = pts[e.id] ||= { e, first: day.date, last: day.date, days: 0 };
    p.e = e; p.last = day.date; if (fresh) p.days++;
    if (e.outcome !== 'active') { p.outcome = e.outcome; p.outDate = e.interim && validISO(String(e.outAt || '').slice(0, 10)) ? String(e.outAt).slice(0, 10) : day.date; }
  }));
  const list = Object.values(pts);
  const outs = {}; OUTCOMES.forEach(o => { if (o.id !== 'active') outs[o.id] = 0; });
  const stays = [];
  list.forEach(p => { if (p.outcome) { outs[p.outcome] = (outs[p.outcome] || 0) + 1; if (validISO(p.e.micuDate)) stays.push(diffDays(p.e.micuDate, p.outDate) + 1); } });
  const cats = {}; list.forEach(p => { cats[p.e.category || 'other'] = (cats[p.e.category || 'other'] || 0) + 1; });
  const admitted = list.filter(p => validISO(p.e.micuDate) && p.e.micuDate >= from && p.e.micuDate <= to).length;
  return { list, pdays, outs, cats, admitted, avgStay: stays.length ? stays.reduce((a, b) => a + b, 0) / stays.length : null, perDay: dates.size ? pdays / dates.size : 0 };
}
async function runReport() {
  const out = $('#rpOut'); if (!out) return;
  if (!validISO(RP.from) || !validISO(RP.to) || RP.from > RP.to) { out.innerHTML = '<p class="err">Choose a valid date range.</p>'; return; }
  if (diffDays(RP.from, RP.to) > 366) { out.innerHTML = '<p class="err">Please choose one year or less at a time.</p>'; return; }
  if (!RP.data) {
    out.innerHTML = `<div class="loading" style="min-height:100px"><div class="spinner"></div></div>`;
    try { RP.data = await S.store.loadRange(RP.from, RP.to); } catch (e) { out.innerHTML = `<p class="err">${esc(e.code || e.message)}</p>`; return; }
  }
  const range = RP.data, s = summarise(range);
  const tile = (n, l) => `<div class="tile"><b>${n}</b><span>${l}</span></div>`;
  const maxC = Math.max(1, ...Object.values(s.cats));
  out.innerHTML = `
    <div class="tiles">${tile(range.length, 'Handovers')}${tile(s.list.length, 'Patients')}${tile(s.admitted, 'New to MICU')}${tile(s.perDay.toFixed(1), 'Patients per day')}${tile(s.avgStay === null ? '—' : s.avgStay.toFixed(1), 'Avg ICU stay (days)')}${tile(s.pdays, 'Patient-days')}</div>
    <div class="panel"><h4>Left ICU</h4><div class="tiles small">${Object.entries(s.outs).map(([k, n]) => tile(n, (OUTCOMES.find(o => o.id === k) || {}).label || k)).join('')}</div>
      ${s.list.length ? `<p class="help">Mortality in this period: ${(100 * (s.outs.death || 0) / s.list.length).toFixed(1)}% of ${s.list.length} patients.</p>` : ''}</div>
    <div class="panel"><h4>Data for Excel</h4><div class="menu-list">
      <button class="menu-item" data-action="csv" data-v="days"><span class="mi-ic">${icon('file')}</span><span>Every handover (CSV)<small>One row per patient per handover: everything written</small></span></button>
      <button class="menu-item" data-action="csv" data-v="pts"><span class="mi-ic">${icon('file')}</span><span>Admissions (CSV)<small>One row per patient: dates, stay, outcome</small></span></button>
    </div></div>`;
}
function csvOf(rows) { return '﻿' + rows.map(r => r.map(v => { v = String(v ?? ''); return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }).join(',')).join('\r\n'); }
function saveBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
function admissionRows(s) {
  return [['Patient ID', 'Name', 'Age', 'UHID', 'DOA', 'MICU date', 'First on sheet', 'Last on sheet', 'Days on sheets', 'ICU stay (days)', 'Status', 'Status date', 'Came and left between handovers', 'Consultant', 'Diagnosis'],
    ...s.list.map(p => [p.e.id, p.e.name, p.e.age, p.e.uhid || '', p.e.doa, p.e.micuDate, p.first, p.last, p.days,
      p.outDate && validISO(p.e.micuDate) ? diffDays(p.e.micuDate, p.outDate) + 1 : '', p.outcome ? (OUTCOMES.find(o => o.id === p.outcome) || {}).label : 'In ICU', p.outDate || '', p.e.interim ? 'Yes' : 'No', p.e.consultant, htmlToText(p.e.diagnosis)].map(safeCell))];
}
function downloadCsv(kind) {
  if (!RP.data) return;
  let rows;
  if (kind === 'days') rows = [ROW_HEADER, ...RP.data.flatMap(d => d.entries.map(e => rowOf(d.sid, e)))];
  else {
    rows = admissionRows(summarise(RP.data));
  }
  saveBlob(new Blob([csvOf(rows)], { type: 'text/csv;charset=utf-8' }), `MICU_${kind === 'days' ? 'handovers' : 'admissions'}_${RP.from}_to_${RP.to}.csv`);
  toast('CSV ready');
}

/* =================================================================
   DEVICES (max 2 per person, admin unlimited)
   ================================================================= */
const DEV_KEY = 'handover-device-id';
function myDeviceId() {
  let id = null; try { id = localStorage.getItem(DEV_KEY); } catch { }
  if (!id) { id = 'd' + newId(); try { localStorage.setItem(DEV_KEY, id); } catch { } }
  return id;
}
function deviceName() {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua) ? 'iPhone' : (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Macintosh|Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Computer';
  const br = /EdgA?\/|Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Browser';
  const app = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  return `${os} · ${br}${app ? ' (installed)' : ''}`;
}
const maxDevices = () => +CFG.maxDevices || 2;
const limitApplies = p => !!p && (p.role !== 'admin' || !!CFG.adminDeviceLimit);
const deviceInList = p => !!(p && (p.devices || []).some(d => d.id === myDeviceId()));
function deviceAllowed() { return !limitApplies(S.profile) || deviceInList(S.profile); }
async function registerDevice() {
  const p = S.profile; if (!p || p.status !== 'approved') return;
  const list = (p.devices || []).slice(), me = myDeviceId(), now = Date.now();
  const i = list.findIndex(d => d.id === me);
  if (i >= 0) {
    if (now - (list[i].lastSeen || 0) > 6 * 3600e3) { list[i] = { ...list[i], lastSeen: now, name: deviceName() }; p.devices = list; S.store.setUser(p.uid, { devices: list }).catch(e => console.warn('device', e)); }
    return;
  }
  if (!limitApplies(p) || list.length < maxDevices()) { list.push({ id: me, name: deviceName(), addedAt: now, lastSeen: now }); p.devices = list; await settle(S.store.setUser(p.uid, { devices: list }), 2500); }
}
function deviceRows(list, opts = {}) {
  return (list || []).map(d => `<div class="user-row"><div class="u"><b>${esc(d.name || 'Device')}${d.id === myDeviceId() ? ' <span class="st approved">this device</span>' : ''}</b><small>Added ${esc(fmtTime(d.addedAt))} · last used ${esc(fmtTime(d.lastSeen))}</small></div>
    ${d.id === myDeviceId() && !opts.allowSelf ? '' : `<button class="btn danger" data-action="dev-remove" data-id="${esc(d.id)}" ${opts.uid ? `data-uid="${esc(opts.uid)}"` : ''}>Remove</button>`}</div>`).join('') || '<p class="help">No devices yet.</p>';
}
function renderDevices() {
  const p = S.profile;
  render(`<div class="auth-wrap"><div class="auth-card">
    <div class="auth-logo">${icon('lock')}</div>
    <h1>Device limit reached</h1>
    <p class="sub">Your account can be used on ${maxDevices()} devices. Remove one of them to use this ${esc(deviceName().split(' · ')[0])}.</p>
    <div class="panel" style="padding:4px 14px">${deviceRows(p.devices)}</div>
    <button class="btn block" data-action="sign-out">${icon('out')} Sign out</button>
  </div></div>`);
}
async function removeDevice(id, uid) {
  const own = !uid || uid === S.user.uid;
  if (!(await ask(own ? 'Remove this device from your account? You can sign in on it again later if there is a free place.' : 'Remove this device from their account?', { ok: 'Remove', danger: true }))) return;
  try {
    if (own) {
      const p = S.profile; let list = (p.devices || []).filter(d => d.id !== id);
      const me = myDeviceId();
      if (limitApplies(p) && !list.some(d => d.id === me) && list.length < maxDevices()) list.push({ id: me, name: deviceName(), addedAt: Date.now(), lastSeen: Date.now() });
      p.devices = list; await S.store.setUser(p.uid, { devices: list });
      toast('Device removed'); if ($('#modal-root').innerHTML) openSettings('account'); else route();
    } else {
      const users = await S.store.listUsers(); const u = users.find(x => x.uid === uid); if (!u) return;
      await S.store.setUser(uid, { devices: (u.devices || []).filter(d => d.id !== id) }); toast('Device removed'); loadUsers();
    }
  } catch (e) { saveFail(e); }
}

/* =================================================================
   DRIVE SETTINGS TAB
   ================================================================= */
function driveTab() {
  const st = S.settings;
  return `<div class="panel"><h4>Google Drive archive</h4>
      <p class="help" style="margin:0 0 10px">Each handover (morning and evening) is saved to your Google Drive as DOCX and JSON, and every patient on it is added as a row in one Google Sheet ("MICU HANDOVER Database"). Set it up once from a laptop: see <b>drive/Code.gs</b> and README.</p>
      <label class="field"><span>Apps Script web app URL</span><input class="input" id="drvUrl" value="${esc(st.driveUrl || '')}" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off"></label>
      <label class="field"><span>Secret key (same as in Code.gs)</span><input class="input" id="drvKey" value="${esc(st.driveKey || '')}" autocomplete="off"></label>
      <div class="opt-row" style="margin-bottom:12px"><button class="opt ${st.driveAuto !== false ? 'on' : ''}" data-action="drv-auto" data-v="1">Save past days automatically</button><button class="opt ${st.driveAuto === false ? 'on' : ''}" data-action="drv-auto" data-v="0">Only when I tap</button></div>
      <div class="opt-row"><button class="btn primary" data-action="drv-save">Save</button><button class="btn" data-action="drv-test">Test connection</button></div>
      <div id="drvOut" class="help" style="margin-top:10px">${st.driveFolderUrl ? `Folder: <a href="${esc(st.driveFolderUrl)}" target="_blank" rel="noopener">open</a>` : ''}${st.driveSheetUrl ? ` · Database sheet: <a href="${esc(st.driveSheetUrl)}" target="_blank" rel="noopener">open</a>` : ''}</div>
    </div>
    <p class="help">With automatic saving on, once a new handover has started, the next time anyone opens the app the earlier handovers of the past week that changed are saved. You can also save any handover from the menu.</p>`;
}

/* =================================================================
   STUDY AREA — admin only (others only when the admin gives access).
   Kept apart from the handover: nothing here is printed or exported with the handover.
   ================================================================= */
function studyRole() {
  if (isAdmin()) return 'edit';
  const r = S.profile && S.profile.study;
  return r === 'edit' || r === 'view' ? r : '';
}
const canStudy = () => !!studyRole();
const canStudyEdit = () => studyRole() === 'edit';

const DEFAULT_CATALOG = () => {
  const t = (id, name, unit, low, high, type) => ({ id, name, unit: unit || '', low: low ?? '', high: high ?? '', type: type || 'num' });
  return {
    labGroups: [
      { id: 'inflam', name: 'Inflammation', tests: [t('crp', 'CRP', 'mg/L', '', '5'), t('pct', 'Procalcitonin', 'ng/mL', '', '0.5')] },
      { id: 'cbc', name: 'CBC', tests: [t('hb', 'Hb', 'g/dL', '12', '16'), t('tlc', 'TLC', '×10³/µL', '4', '11'), t('neut', 'Neutrophil', '%', '40', '75'), t('lymph', 'Lymphocyte', '%', '20', '45'), t('plt', 'Platelet', '×10³/µL', '150', '400'), t('hct', 'HCT', '%', '36', '48'), t('esr', 'ESR', 'mm 1st hr', '', '20')] },
      { id: 'cardiac', name: 'Cardiac', tests: [t('trop', 'Troponin I', 'ng/mL', '', '0.04'), t('bnp', 'BNP', 'pg/mL', '', '100'), t('cpk', 'CPK', 'U/L', '25', '200')] },
      { id: 'renal', name: 'Renal', tests: [t('creat', 'Creatinine', 'mg/dL', '0.6', '1.2'), t('urea', 'Urea', 'mg/dL', '15', '40')] },
      { id: 'elec', name: 'Electrolytes', tests: [t('na', 'Sodium', 'mmol/L', '135', '145'), t('k', 'Potassium', 'mmol/L', '3.5', '5.0'), t('cl', 'Chloride', 'mmol/L', '98', '107'), t('tco2', 'TCO₂', 'mmol/L', '22', '29')] },
      { id: 'dic', name: 'DIC profile', tests: [t('pt', 'PT', 'sec', '11', '13.5'), t('inr', 'INR', '', '0.8', '1.2'), t('aptt', 'APTT', 'sec', '25', '35'), t('ddimer', 'D-dimer', 'µg/mL FEU', '', '0.5'), t('fib', 'Fibrinogen', 'mg/dL', '200', '400')] },
      { id: 'abg', name: 'ABG', tests: [t('ph', 'pH', '', '7.35', '7.45'), t('pco2', 'PaCO₂', 'mmHg', '35', '45'), t('po2', 'PaO₂', 'mmHg', '80', '100'), t('hco3', 'HCO₃', 'mmol/L', '22', '26'), t('be', 'Base excess', 'mmol/L', '-2', '2'), t('lact', 'Lactate', 'mmol/L', '', '2'), t('sao2', 'SaO₂', '%', '95', '100')] },
      { id: 'lft', name: 'Liver function', tests: [t('bil', 'Bilirubin (total)', 'mg/dL', '0.3', '1.2'), t('alt', 'ALT (SGPT)', 'U/L', '', '40'), t('ast', 'AST (SGOT)', 'U/L', '', '40'), t('alp', 'ALP', 'U/L', '40', '130'), t('alb', 'Albumin', 'g/dL', '3.5', '5.0')] },
      { id: 'tft', name: 'Thyroid function', tests: [t('tsh', 'TSH', 'mIU/L', '0.4', '4.0'), t('ft4', 'FT4', 'ng/dL', '0.8', '1.8'), t('ft3', 'FT3', 'pg/mL', '2.3', '4.2')] },
      { id: 'ure', name: 'Urine R/E', tests: [t('ualb', 'Albumin', '', '', '', 'text'), t('usug', 'Sugar', '', '', '', 'text'), t('upus', 'Pus cells', '/HPF', '', '5'), t('urbc', 'RBC', '/HPF', '', '2')] }
    ],
    seroTests: [
      { id: 'dpcr', name: 'Dengue RT-PCR', results: ['Positive', 'Negative', 'Pending'], detail: 'Serotype (DENV-1 to 4)' },
      { id: 'ns1', name: 'Dengue NS1', results: ['Positive', 'Negative', 'Pending'], detail: '' },
      { id: 'igm', name: 'Dengue IgM', results: ['Positive', 'Negative', 'Pending'], detail: '' },
      { id: 'resp', name: 'Respiratory panel PCR', results: ['Detected', 'Not detected', 'Pending'], detail: 'Organisms detected' },
      { id: 'bfblood', name: 'BioFire – blood culture ID', results: ['Detected', 'Not detected', 'Pending'], detail: 'Organisms and resistance genes' },
      { id: 'bfpneu', name: 'BioFire – pneumonia (tracheal)', results: ['Detected', 'Not detected', 'Pending'], detail: 'Organisms, copies and resistance genes' },
      { id: 'bfother', name: 'BioFire – other panel', results: ['Detected', 'Not detected', 'Pending'], detail: 'Panel name and result' },
      { id: 'covid', name: 'COVID-19 RT-PCR', results: ['Positive', 'Negative', 'Pending'], detail: '' },
      { id: 'cmv', name: 'CMV', results: ['Positive', 'Negative', 'Pending'], detail: 'Viral load' },
      { id: 'hiv', name: 'HIV', results: ['Reactive', 'Non-reactive', 'Pending'], detail: '' },
      { id: 'hbs', name: 'Hepatitis B (HBsAg)', results: ['Reactive', 'Non-reactive', 'Pending'], detail: '' },
      { id: 'hcv', name: 'Hepatitis C (anti-HCV)', results: ['Reactive', 'Non-reactive', 'Pending'], detail: '' }
    ],
    specimens: ['Blood', 'Urine', 'Tracheal aspirate', 'Wound swab', 'Pus', 'CSF', 'Catheter tip', 'Other'],
    organisms: ['Klebsiella pneumoniae', 'Acinetobacter baumannii', 'Pseudomonas aeruginosa', 'Escherichia coli', 'Enterobacter spp.', 'Proteus spp.', 'Staphylococcus aureus (MRSA)', 'Staphylococcus aureus (MSSA)', 'Coagulase-negative Staphylococcus', 'Enterococcus spp.', 'Burkholderia cepacia', 'Stenotrophomonas maltophilia', 'Candida spp.'],
    antibiotics: ['Amikacin', 'Gentamicin', 'Ceftriaxone', 'Cefepime', 'Ceftazidime', 'Ceftazidime-avibactam', 'Ceftaroline', 'Cefoperazone-sulbactam', 'Piperacillin-tazobactam', 'Meropenem', 'Imipenem', 'Ertapenem', 'Levofloxacin', 'Ciprofloxacin', 'Moxifloxacin', 'Azithromycin', 'Doxycycline', 'Tigecycline', 'Minocycline', 'Colistin', 'Polymyxin B', 'Vancomycin', 'Teicoplanin', 'Linezolid', 'Clindamycin', 'Metronidazole', 'Cotrimoxazole', 'Fosfomycin', 'Nitrofurantoin', 'Fluconazole', 'Voriconazole', 'Caspofungin', 'Amphotericin B'],
    cprPlaces: ['ICU', 'Emergency', 'Ward', 'OT', 'Other hospital', 'Before arrival'],
    cprFrom: ['Emergency', 'Ward', 'OT', 'HDU / CCU', 'Other hospital', 'Other']
  };
};
const CELL_COLORS = [['', 'Auto'], ['red', 'Red'], ['orange', 'Orange'], ['yellow', 'Yellow'], ['green', 'Green'], ['blue', 'Blue'], ['purple', 'Purple'], ['none', 'No colour']];
const ABX_REASONS = ['Empirical start', 'Escalation', 'De-escalation', 'Culture-guided change', 'Side effect / allergy', 'Course complete', 'Other'];
const CPR_OUT = [{ id: 'alive', label: 'Left ICU alive' }, { id: 'died', label: 'Died' }, { id: 'dama', label: 'DAMA' }, { id: 'still', label: 'Still in ICU' }, { id: 'transfer', label: 'Transferred' }];
const STUDY_TYPES = [['num', 'Number'], ['text', 'Text'], ['yesno', 'Yes / No'], ['choice', 'Choose from list'], ['date', 'Date']];

const ST = { tab: 'patients', pid: null, sub: 'labs', group: 'all', cat: null, patients: null, rp: null, rIds: new Set(), q: '', deid: false, cpr: null, cprRange: 'all', outFrom: '', outTo: '', outData: null, studies: null, study: null, recs: null };

/* ---------- small dialog helper (a window above the Study window) ---------- */
function dlg(title, body, { save, del, saveLabel = 'Save', wide = false } = {}) {
  const r = $('#dialog-root');
  r.innerHTML = `<div class="modal-backdrop dialog"><div class="modal ${wide ? '' : 'small'}" role="dialog" aria-modal="true">
    <div class="modal-head"><button class="icon-btn" data-dx="close" aria-label="Close">${icon('x')}</button><h3>${esc(title)}</h3>${save ? `<button class="btn primary" data-dx="save">${esc(saveLabel)}</button>` : ''}</div>
    <div class="modal-body">${body}${del ? `<button class="btn danger block" data-dx="del" style="margin-top:12px">${icon('trash')} Delete</button>` : ''}</div></div></div>`;
  const close = () => { r.innerHTML = ''; };
  r.querySelector('[data-dx="close"]').onclick = close;
  if (save) r.querySelector('[data-dx="save"]').onclick = async () => { const ok = await save(r); if (ok !== false) close(); };
  if (del) r.querySelector('[data-dx="del"]').onclick = async () => { close(); await del(); };
  return r;
}
const dv = (r, id) => { const el = r.querySelector('#' + id); return el ? el.value.trim() : ''; };
const opt = (list, cur) => list.map(v => { const [val, lab] = Array.isArray(v) ? v : [v, v]; return `<option value="${esc(val)}" ${String(val) === String(cur ?? '') ? 'selected' : ''}>${esc(lab)}</option>`; }).join('');
const colorPick = (cur) => `<div class="opt-row" id="dColor">${CELL_COLORS.map(([v, l]) => `<button type="button" class="opt cc ${v ? 'cc-' + v : ''} ${(cur || '') === v ? 'on' : ''}" data-c="${v}">${l}</button>`).join('')}</div>`;
function wireColor(r) { r.querySelectorAll('#dColor .opt').forEach(b => b.onclick = () => { r.querySelectorAll('#dColor .opt').forEach(x => x.classList.toggle('on', x === b)); }); }
const pickedColor = r => { const b = r.querySelector('#dColor .opt.on'); return b ? b.dataset.c : ''; };
function nowParts() { const d = new Date(); return { date: todayISO(), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }; }
const byWho = () => S.profile.name || S.user.email;

/* ---------- open ---------- */
async function openStudy(tab) {
  if (!canStudy()) { toast('You do not have access to the Study area'); return; }
  if (tab) ST.tab = tab;
  openModal(`<div class="modal-head"><h3>Study</h3><span class="chip">${canStudyEdit() ? 'Can edit' : 'View only'}</span><button class="icon-btn" data-action="close" aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body" id="stBody"><div class="loading"><div class="spinner"></div></div></div>`, 'wide');
  try {
    if (!ST.cat) { const c = await S.store.rGet('rsettings', 'catalog'); ST.cat = { ...DEFAULT_CATALOG(), ...(c || {}) }; }
  } catch (e) { ST.cat = DEFAULT_CATALOG(); console.warn(e); }
  renderStudy();
}
function stTabs() {
  return `<div class="tabs">${[['patients', 'Patients'], ['cpr', 'CPR register'], ['outcomes', 'Outcomes'], ['studies', 'My studies'], ['lists', 'Test lists']].map(([k, l]) => `<button class="${ST.tab === k ? 'on' : ''}" data-action="st-tab" data-v="${k}">${l}</button>`).join('')}</div>`;
}
function stBody(html) { const b = $('#stBody'); if (b) b.innerHTML = html; return b; }
async function renderStudy() {
  if (!$('#stBody')) return;
  if (ST.tab === 'patients') return ST.pid ? renderRPatient() : renderStudyPatients();
  if (ST.tab === 'cpr') return renderCpr();
  if (ST.tab === 'outcomes') return renderOutcomes();
  if (ST.tab === 'studies') return ST.study ? renderOneStudy() : renderStudies();
  if (ST.tab === 'lists') return renderLists();
}
async function loadPatients(force) {
  if (!ST.patients || force) {
    const [pts, rps] = await Promise.all([S.store.listPatients(), S.store.rList('rpatients').catch(() => [])]);
    ST.patients = pts.sort((a, b) => String(b.lastSheet || '').localeCompare(String(a.lastSheet || '')));
    ST.rIds = new Set(rps.map(x => x.pid));
    ST.rAll = rps;
  }
  return ST.patients;
}
const patientById = id => (ST.patients || []).find(p => p.id === id);
const outLabel = id => (OUTCOMES.find(o => o.id === id) || {}).label || id || '';

/* ---------- patients list ---------- */
async function renderStudyPatients() {
  stBody(stTabs() + '<div class="loading"><div class="spinner"></div></div>');
  try { await loadPatients(); } catch (e) { stBody(stTabs() + `<p class="err">${esc(e.code || e.message)}</p>`); return; }
  const words = ST.q.toLowerCase().split(/\s+/).filter(Boolean);
  let list = ST.patients;
  if (words.length) list = list.filter(p => { const b = [p.name, p.uhid, p.bed, p.age, p.diagnosisText, p.consultant, outLabel(p.outcome)].join(' ').toLowerCase(); return words.every(w => b.includes(w)); });
  const b = stBody(stTabs() + `
    <label class="search" style="margin-bottom:10px">${icon('search')}<input id="stQ" type="search" placeholder="Name, UHID, diagnosis…" value="${esc(ST.q)}" autocomplete="off"></label>
    <p class="help" style="margin:0 0 8px">${list.length} patients from the handovers. Tap one to add investigations, serology, cultures and antibiotics. <b>${ST.rIds.size}</b> have study data.</p>
    <div id="stList">${list.slice(0, 120).map(p => `<button class="result" data-action="st-open" data-id="${esc(p.id)}" style="--c:${esc(bedColor(p.bed))}">
      <div class="bedbox">${esc(p.bed || '—')}</div>
      <div class="u"><b>${esc(p.name)}</b> <span class="help">${esc(ageText(p.age))}${p.uhid ? ' · ' + esc(p.uhid) : ''}</span>
        <div class="help">MICU ${esc(fmtShort(p.micuDate))}${p.lastSheet ? ' → ' + esc(fmtSidShort(p.lastSheet)) : ''}</div>
        <div class="help clamp" style="--lines:1">${esc(p.diagnosisText || '')}</div></div>
      <div class="badges">${ST.rIds.has(p.id) ? '<span class="badge new">Study data</span>' : ''}<span class="badge ${p.outcome === 'active' ? '' : 'left'}">${esc(p.outcome === 'active' ? 'In ICU' : outLabel(p.outcome))}</span></div></button>`).join('')}</div>
    <div class="panel" style="margin-top:12px"><h4>Data for Excel / SPSS (all patients)</h4>
      <label class="keep-main" style="margin-bottom:10px"><input type="checkbox" id="stDeid" ${ST.deid ? 'checked' : ''}><span>Leave out names and UHID (use patient codes)</span></label>
      <div class="opt-row">${[['labs', 'Investigations'], ['sero', 'Serology'], ['cult', 'Cultures'], ['abx', 'Antibiotics']].map(([k, l]) => `<button class="btn" data-action="st-csv" data-v="${k}">${icon('file')} ${l} CSV</button>`).join('')}</div></div>`);
  const q = b.querySelector('#stQ'); let tm;
  q.addEventListener('input', () => { ST.q = q.value; clearTimeout(tm); tm = setTimeout(() => { const pos = q.selectionStart; renderStudyPatients().then(() => { const n = $('#stQ'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }); }, 250); });
  b.querySelector('#stDeid').onchange = e => { ST.deid = e.target.checked; };
}

/* ---------- one patient ---------- */
const emptyRP = pid => ({ pid, labs: { cols: [], vals: {} }, sero: [], cultures: [], abx: [] });
async function openRPatient(pid) {
  ST.pid = pid; ST.rp = null; stBody('<div class="loading"><div class="spinner"></div></div>');
  try { await loadPatients(); ST.rp = (await S.store.rGet('rpatients', pid)) || emptyRP(pid); }
  catch (e) { stBody(`<p class="err">${esc(e.code || e.message)}</p>`); return; }
  ST.rp.labs ||= { cols: [], vals: {} }; ST.rp.sero ||= []; ST.rp.cultures ||= []; ST.rp.abx ||= [];
  renderRPatient();
}
async function saveRP() {
  if (!canStudyEdit()) { toast('View only'); return false; }
  const p = patientById(ST.pid) || {};
  Object.assign(ST.rp, { pid: ST.pid, name: p.name || '', uhid: p.uhid || '', updatedAt: Date.now(), updatedBy: byWho() });
  try { const r = await settle(S.store.rSet('rpatients', ST.pid, ST.rp)); ST.rIds.add(ST.pid); toast(savedMsg(r)); return true; } catch (e) { saveFail(e); return false; }
}
function renderRPatient() {
  const p = patientById(ST.pid) || { name: '(not found)' }, rp = ST.rp; if (!rp) return;
  const subs = [['labs', 'Investigations', Object.keys(rp.labs.vals || {}).length ? rp.labs.cols.length : 0], ['sero', 'Serology', rp.sero.length], ['cult', 'Cultures', rp.cultures.length], ['abx', 'Antibiotics', rp.abx.length]];
  let inner = '';
  if (ST.sub === 'labs') inner = labsView(p, rp);
  if (ST.sub === 'sero') inner = seroView(rp);
  if (ST.sub === 'cult') inner = cultView(rp);
  if (ST.sub === 'abx') inner = abxView(p, rp);
  stBody(`<button class="btn ghost" data-action="st-back">${icon('left')} All patients</button>
    <div class="sheet-head" style="margin-top:8px"><div class="card-head"><div class="bedbox" style="--c:${esc(bedColor(p.bed))}">${esc(p.bed || '—')}</div>
      <div class="who"><div class="name">${esc(p.name)}</div><div class="meta"><span>${esc(ageText(p.age))}</span>${p.uhid ? `<span>UHID ${esc(p.uhid)}</span>` : ''}<span>MICU ${esc(fmtShort(p.micuDate))}</span><span>${esc(p.outcome === 'active' ? 'In ICU' : outLabel(p.outcome) + (p.outcomeDate ? ' ' + fmtShort(p.outcomeDate) : ''))}</span></div>
      <div class="help clamp" style="--lines:2;margin-top:4px">${esc(p.diagnosisText || '')}</div></div></div></div>
    <div class="tabs">${subs.map(([k, l, n]) => `<button class="${ST.sub === k ? 'on' : ''}" data-action="st-sub" data-v="${k}">${l}${n ? ` · ${n}` : ''}</button>`).join('')}</div>
    ${inner}`);
}

/* ---- investigations (any number of dates) ---- */
function rangeText(t) { return t.low !== '' && t.high !== '' ? `${t.low}–${t.high}` : t.high !== '' ? `< ${t.high}` : t.low !== '' ? `> ${t.low}` : ''; }
function labFlag(t, v) {
  if (t.type === 'text' || v === '' || v == null) return '';
  const x = parseFloat(String(v).replace(/[<>≤≥]/g, '')); if (isNaN(x)) return '';
  if (t.high !== '' && x > parseFloat(t.high)) return 'H';
  if (t.low !== '' && x < parseFloat(t.low)) return 'L';
  return '';
}
function labsView(p, rp) {
  const groups = ST.cat.labGroups, cols = rp.labs.cols.slice().sort((a, b) => a.at.localeCompare(b.at));
  const show = ST.group === 'all' ? groups : groups.filter(g => g.id === ST.group);
  const edit = canStudyEdit();
  const head = cols.map(c => { const d = c.at.slice(0, 10), day = validISO(p.micuDate) ? diffDays(p.micuDate, d) + 1 : ''; return `<th><button class="colhead" data-action="lab-col" data-id="${esc(c.id)}" ${edit ? '' : 'disabled'}>${esc(fmtDM(d))}<small>${esc(c.at.slice(11, 16))}${day !== '' ? ' · D' + day : ''}</small></button></th>`; }).join('');
  const rows = show.map(g => `${ST.group === 'all' ? `<tr class="grp"><td colspan="${cols.length + 1}">${esc(g.name)}</td></tr>` : ''}${g.tests.map(t => `<tr><th class="tname">${esc(t.name)}<small>${esc(t.unit)}${rangeText(t) ? ' · ' + esc(rangeText(t)) : ''}</small></th>${cols.map(c => {
    const cell = ((rp.labs.vals[c.id] || {})[t.id]) || null, v = cell ? cell.v : '', f = labFlag(t, v);
    const col = cell && cell.c ? cell.c : (f === 'H' ? 'red' : f === 'L' ? 'blue' : '');
    return `<td class="${col && col !== 'none' ? 'cc-' + col : ''}"><button class="cellbtn" data-action="lab-cell" data-col="${esc(c.id)}" data-test="${esc(t.id)}" ${edit ? '' : 'disabled'}>${esc(v)}${f ? `<sup>${f}</sup>` : ''}</button></td>`;
  }).join('')}</tr>`).join('')}`).join('');
  return `<div class="opt-row" style="margin-bottom:10px"><button class="opt ${ST.group === 'all' ? 'on' : ''}" data-action="lab-group" data-v="all">All</button>${groups.map(g => `<button class="opt ${ST.group === g.id ? 'on' : ''}" data-action="lab-group" data-v="${esc(g.id)}">${esc(g.name)}</button>`).join('')}</div>
    ${edit ? `<button class="btn soft" data-action="lab-addcol" style="margin-bottom:10px">${icon('plus')} Add a date</button>` : ''}
    ${cols.length ? `<div class="tablewrap"><table class="labtable"><thead><tr><th class="tname">Test</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
      <p class="help">Tap a box to write the value and pick a colour. Values above the normal range turn red and below it blue unless you choose a colour. Tap a date to change or remove it.</p>`
      : '<p class="help">No dates yet. Tap "Add a date" to make a column, then tap the boxes to write the results. You can add as many dates as you need.</p>'}`;
}
function labColDialog(col) {
  const n = col ? { date: col.at.slice(0, 10), time: col.at.slice(11, 16) } : nowParts();
  const r = dlg(col ? 'Change date' : 'Add a date', `<div class="row"><label class="field"><span>Date</span><input class="input" type="date" id="dDate" value="${esc(n.date)}"></label><label class="field"><span>Time</span><input class="input" type="time" id="dTime" value="${esc(n.time)}"></label></div><p class="help">Use the time the sample was taken. Two columns can share a date (morning and evening samples).</p>`, {
    save: async r => {
      const at = `${dv(r, 'dDate')}T${dv(r, 'dTime') || '00:00'}`; if (!validISO(at.slice(0, 10))) { toast('Choose a date'); return false; }
      if (col) col.at = at; else ST.rp.labs.cols.push({ id: newId().slice(0, 10), at });
      if (await saveRP()) renderRPatient(); else return false;
    },
    del: col ? async () => {
      if (!(await ask('Remove this date and all its values?', { ok: 'Remove', danger: true }))) return;
      ST.rp.labs.cols = ST.rp.labs.cols.filter(c => c.id !== col.id); delete ST.rp.labs.vals[col.id];
      if (await saveRP()) renderRPatient();
    } : null
  });
  return r;
}
function labCellDialog(colId, testId) {
  const t = ST.cat.labGroups.flatMap(g => g.tests).find(x => x.id === testId); if (!t) return;
  const col = ST.rp.labs.cols.find(c => c.id === colId);
  const cur = ((ST.rp.labs.vals[colId] || {})[testId]) || { v: '', c: '' };
  const r = dlg(`${t.name} · ${fmtDM(col.at.slice(0, 10))} ${col.at.slice(11, 16)}`, `
    <label class="field"><span>Value${t.unit ? ' (' + esc(t.unit) + ')' : ''}</span><input class="input" id="dVal" value="${esc(cur.v)}" ${t.type === 'num' ? 'inputmode="decimal"' : ''} autocomplete="off"></label>
    ${rangeText(t) ? `<p class="help">Normal: ${esc(rangeText(t))} ${esc(t.unit)}</p>` : ''}
    <div class="field"><span>Colour</span>${colorPick(cur.c)}</div>`, {
    save: async r => {
      const v = dv(r, 'dVal'), c = pickedColor(r);
      const m = (ST.rp.labs.vals[colId] ||= {});
      if (v === '' && !c) delete m[testId]; else m[testId] = { v, c };
      if (await saveRP()) renderRPatient(); else return false;
    }
  });
  wireColor(r); setTimeout(() => { const i = r.querySelector('#dVal'); i && i.focus(); }, 50);
}

/* ---- serology ---- */
function seroColor(x) { if (x.c) return x.c; return /^(positive|detected|reactive)/i.test(x.result || '') ? 'red' : /^(negative|not detected|non-reactive)/i.test(x.result || '') ? 'green' : ''; }
function seroView(rp) {
  const list = rp.sero.slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return `${canStudyEdit() ? `<button class="btn soft" data-action="sero-edit" style="margin-bottom:10px">${icon('plus')} Add a result</button>` : ''}
    ${list.length ? list.map(x => { const c = seroColor(x); return `<button class="result ${c && c !== 'none' ? 'cc-' + c : ''}" data-action="sero-edit" data-id="${esc(x.id)}" style="--c:var(--primary)">
      <div class="bedbox" style="font-size:.78em;line-height:1.15;text-align:center">${esc(fmtDM(String(x.at).slice(0, 10)))}<br>${esc(String(x.at).slice(11, 16))}</div>
      <div class="u"><b>${esc(x.test)}</b> · <b>${esc(x.result || '')}</b>${x.detail ? `<div class="help">${esc(x.detail)}</div>` : ''}</div></button>`; }).join('') : '<p class="help">No serology or PCR results yet.</p>'}`;
}
function seroDialog(id) {
  const x = id ? ST.rp.sero.find(s => s.id === id) : null, n = x ? { date: String(x.at).slice(0, 10), time: String(x.at).slice(11, 16) } : nowParts();
  const tests = ST.cat.seroTests;
  const cur = x || { test: tests[0] ? tests[0].name : '', result: '', detail: '', c: '' };
  const resOpts = name => { const tt = tests.find(t => t.name === name); return tt ? tt.results : ['Positive', 'Negative', 'Pending']; };
  const detailLabel = name => { const tt = tests.find(t => t.name === name); return tt && tt.detail ? tt.detail : 'Details'; };
  const r = dlg(x ? 'Edit result' : 'Add a result', `
    <label class="field"><span>Test</span><select class="input" id="dTest">${opt([...new Set([...tests.map(t => t.name), cur.test].filter(Boolean))], cur.test)}</select></label>
    <div class="row"><label class="field"><span>Date</span><input class="input" type="date" id="dDate" value="${esc(n.date)}"></label><label class="field"><span>Time</span><input class="input" type="time" id="dTime" value="${esc(n.time)}"></label></div>
    <label class="field" style="margin-top:10px"><span>Result</span><input class="input" id="dRes" list="dlRes" value="${esc(cur.result)}"><datalist id="dlRes">${resOpts(cur.test).map(v => `<option value="${esc(v)}">`).join('')}</datalist></label>
    <label class="field"><span id="dDetLbl">${esc(detailLabel(cur.test))}</span><textarea class="input" id="dDet" rows="2">${esc(cur.detail || '')}</textarea></label>
    <div class="field"><span>Colour</span>${colorPick(cur.c)}</div>`, {
    save: async r => {
      const at = `${dv(r, 'dDate')}T${dv(r, 'dTime') || '00:00'}`;
      const rec = { id: x ? x.id : newId().slice(0, 12), test: dv(r, 'dTest'), at, result: dv(r, 'dRes'), detail: dv(r, 'dDet'), c: pickedColor(r) };
      if (x) Object.assign(x, rec); else ST.rp.sero.push(rec);
      if (await saveRP()) renderRPatient(); else return false;
    },
    del: x ? async () => { ST.rp.sero = ST.rp.sero.filter(s => s.id !== x.id); if (await saveRP()) renderRPatient(); } : null
  });
  wireColor(r);
  r.querySelector('#dTest').onchange = e => { r.querySelector('#dlRes').innerHTML = resOpts(e.target.value).map(v => `<option value="${esc(v)}">`).join(''); r.querySelector('#dDetLbl').textContent = detailLabel(e.target.value); };
}

/* ---- cultures with sensitivity ---- */
function cultView(rp) {
  const list = rp.cultures.slice().sort((a, b) => String(b.sent).localeCompare(String(a.sent)));
  const chip = s => `<span class="sir sir-${esc(s.r)}">${esc(s.ab)} ${esc(s.r)}</span>`;
  return `${canStudyEdit() ? `<button class="btn soft" data-action="cult-edit" style="margin-bottom:10px">${icon('plus')} Add a culture</button>` : ''}
    ${list.length ? list.map(x => `<button class="result ${x.result === 'Growth' ? 'cc-red' : x.result === 'No growth' ? 'cc-green' : ''}" data-action="cult-edit" data-id="${esc(x.id)}" style="--c:var(--primary)">
      <div class="bedbox" style="font-size:.75em;line-height:1.15;text-align:center">${esc(x.sent ? fmtDM(x.sent) : '—')}</div>
      <div class="u"><b>${esc(x.specimen)}</b> · ${esc(x.result || 'Pending')}${x.organism ? ` · <i>${esc(x.organism)}</i>` : ''}${x.count ? ` <span class="help">(${esc(x.count)})</span>` : ''}
        <div class="help">Sent ${esc(fmtShort(x.sent))}${x.reported ? ' · reported ' + esc(fmtShort(x.reported)) : ''}</div>
        ${(x.sens || []).length ? `<div class="sirs">${x.sens.map(chip).join('')}</div>` : ''}</div></button>`).join('') : '<p class="help">No culture reports yet.</p>'}`;
}
function sensRow(s) { return `<div class="sens-row"><input class="input" list="dlAbx" value="${esc(s.ab || '')}" placeholder="Antibiotic"><select class="input">${opt(['S', 'I', 'R'], s.r || 'S')}</select><button type="button" class="icon-btn" data-sdel aria-label="Remove">${icon('x')}</button></div>`; }
function cultDialog(id) {
  const x = id ? ST.rp.cultures.find(c => c.id === id) : null;
  const cur = x || { specimen: ST.cat.specimens[0] || 'Blood', sent: todayISO(), reported: '', result: 'Pending', organism: '', count: '', sens: [], note: '' };
  const r = dlg(x ? 'Edit culture' : 'Add a culture', `
    <div class="row">
      <label class="field"><span>Specimen</span><select class="input" id="dSpec">${opt([...new Set([...ST.cat.specimens, cur.specimen])], cur.specimen)}</select></label>
      <label class="field"><span>Sent</span><input class="input" type="date" id="dSent" value="${esc(cur.sent)}"></label>
      <label class="field"><span>Reported</span><input class="input" type="date" id="dRep" value="${esc(cur.reported || '')}"></label>
      <label class="field"><span>Result</span><select class="input" id="dRes">${opt(['Pending', 'No growth', 'Growth', 'Contaminated'], cur.result)}</select></label>
    </div>
    <label class="field" style="margin-top:10px"><span>Organism</span><input class="input" id="dOrg" list="dlOrg" value="${esc(cur.organism || '')}" placeholder="e.g. Klebsiella pneumoniae"><datalist id="dlOrg">${ST.cat.organisms.map(v => `<option value="${esc(v)}">`).join('')}</datalist></label>
    <label class="field"><span>Colony count / growth amount</span><input class="input" id="dCount" value="${esc(cur.count || '')}" placeholder="e.g. 10⁵ CFU/mL"></label>
    <div class="field"><span>Sensitivity (S = sensitive, I = intermediate, R = resistant)</span><div id="dSens">${(cur.sens || []).map(sensRow).join('')}</div>
      <button type="button" class="btn soft" id="dSensAdd">${icon('plus')} Add antibiotic</button><datalist id="dlAbx">${ST.cat.antibiotics.map(v => `<option value="${esc(v)}">`).join('')}</datalist></div>
    <label class="field"><span>Note</span><textarea class="input" id="dNote" rows="2">${esc(cur.note || '')}</textarea></label>`, {
    wide: true,
    save: async r => {
      const sens = [...r.querySelectorAll('.sens-row')].map(row => ({ ab: row.querySelector('input').value.trim(), r: row.querySelector('select').value })).filter(s => s.ab);
      const rec = { id: x ? x.id : newId().slice(0, 12), specimen: dv(r, 'dSpec'), sent: dv(r, 'dSent'), reported: dv(r, 'dRep'), result: dv(r, 'dRes'), organism: dv(r, 'dOrg'), count: dv(r, 'dCount'), sens, note: dv(r, 'dNote') };
      if (x) Object.assign(x, rec); else ST.rp.cultures.push(rec);
      if (await saveRP()) renderRPatient(); else return false;
    },
    del: x ? async () => { ST.rp.cultures = ST.rp.cultures.filter(c => c.id !== x.id); if (await saveRP()) renderRPatient(); } : null
  });
  r.querySelector('#dSensAdd').onclick = () => { r.querySelector('#dSens').insertAdjacentHTML('beforeend', sensRow({})); const ins = r.querySelectorAll('#dSens input'); ins[ins.length - 1].focus(); };
  r.querySelector('#dSens').addEventListener('click', ev => { const b = ev.target.closest('[data-sdel]'); if (b) b.closest('.sens-row').remove(); });
}

/* ---- antibiotic courses ---- */
function firstCultureReport(rp) { const d = rp.cultures.map(c => c.reported).filter(validISO).sort(); return d[0] || ''; }
function abxStats(p, rp) {
  const end = c => c.stop || (p.outcome && p.outcome !== 'active' && p.outcomeDate) || todayISO();
  const courses = rp.abx.slice().sort((a, b) => String(a.start).localeCompare(String(b.start)));
  const firstRep = firstCultureReport(rp);
  const dot = courses.reduce((n, c) => n + (validISO(c.start) ? Math.max(1, diffDays(c.start, end(c)) + 1) : 0), 0);
  const changes = Math.max(0, courses.length - 1);
  const blind = courses.filter((c, i) => i > 0 && validISO(c.start) && (!firstRep || c.start < firstRep)).length;
  return { courses, firstRep, dot, changes, blind, end };
}
function abxView(p, rp) {
  const st = abxStats(p, rp), edit = canStudyEdit();
  let grid = '';
  if (st.courses.length) {
    const starts = st.courses.map(c => c.start).filter(validISO).sort(), ends = st.courses.map(st.end).filter(validISO).sort();
    if (starts.length) {
      let a = starts[0], z = ends[ends.length - 1]; if (diffDays(a, z) > 44) a = addDays(z, -44);
      const days = []; for (let d = a; d <= z; d = addDays(d, 1)) days.push(d);
      const drugs = [...new Set(st.courses.map(c => c.drug))];
      grid = `<div class="tablewrap"><table class="labtable abxgrid"><thead><tr><th class="tname">Drug</th>${days.map(d => `<th><small>${esc(fmtDM(d))}</small></th>`).join('')}</tr></thead><tbody>${drugs.map(dr => `<tr><th class="tname">${esc(dr)}</th>${days.map(d => `<td>${st.courses.some(c => c.drug === dr && validISO(c.start) && c.start <= d && st.end(c) >= d) ? '<i class="on"></i>' : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
  }
  return `<div class="tiles">${[[st.courses.length, 'Courses'], [new Set(st.courses.map(c => c.drug)).size, 'Different drugs'], [st.changes, 'Changes'], [st.blind, 'Changes before any culture report'], [st.dot, 'Days of therapy']].map(([n, l]) => `<div class="tile"><b>${n}</b><span>${l}</span></div>`).join('')}</div>
    <p class="help" style="margin-top:0">${st.firstRep ? `First culture report: ${esc(fmtShort(st.firstRep))}.` : 'No culture report yet, so every change so far was made without one.'}</p>
    <div class="opt-row" style="margin-bottom:10px">${edit ? `<button class="btn soft" data-action="abx-edit">${icon('plus')} Add an antibiotic</button>` : ''}<button class="btn" data-action="abx-handover">${icon('file')} What the handovers say</button></div>
    ${st.courses.map(c => { const blind = validISO(c.start) && (!st.firstRep || c.start < st.firstRep) && st.courses.indexOf(c) > 0; return `<button class="result" data-action="abx-edit" data-id="${esc(c.id)}" style="--c:var(--primary)">
      <div class="u"><b>${esc(c.drug)}</b>${c.dose ? ` <span class="help">${esc(c.dose)}</span>` : ''}
      <div class="help">${esc(fmtShort(c.start))} → ${c.stop ? esc(fmtShort(c.stop)) : 'ongoing'} · ${validISO(c.start) ? Math.max(1, diffDays(c.start, st.end(c)) + 1) : '?'} days${c.reason ? ' · ' + esc(c.reason) : ''}</div>${c.note ? `<div class="help">${esc(c.note)}</div>` : ''}</div>
      ${blind ? '<span class="badge left">No culture yet</span>' : ''}</button>`; }).join('') || '<p class="help">No antibiotics recorded yet.</p>'}
    ${grid ? `<h4 class="sub-h">Day by day</h4>${grid}` : ''}`;
}
function abxDialog(id) {
  const x = id ? ST.rp.abx.find(c => c.id === id) : null;
  const cur = x || { drug: '', dose: '', start: todayISO(), stop: '', reason: ST.rp.abx.length ? 'Escalation' : 'Empirical start', note: '' };
  dlg(x ? 'Edit antibiotic' : 'Add an antibiotic', `
    <label class="field"><span>Antibiotic</span><input class="input" id="dDrug" list="dlAbx2" value="${esc(cur.drug)}"><datalist id="dlAbx2">${ST.cat.antibiotics.map(v => `<option value="${esc(v)}">`).join('')}</datalist></label>
    <label class="field"><span>Dose / route (optional)</span><input class="input" id="dDose" value="${esc(cur.dose || '')}" placeholder="e.g. 1 g IV 8 hourly"></label>
    <div class="row"><label class="field"><span>Started</span><input class="input" type="date" id="dStart" value="${esc(cur.start)}"></label><label class="field"><span>Stopped (empty = ongoing)</span><input class="input" type="date" id="dStop" value="${esc(cur.stop || '')}"></label></div>
    <label class="field" style="margin-top:10px"><span>Why started or changed</span><select class="input" id="dReason">${opt([...new Set([...ABX_REASONS, cur.reason].filter(Boolean))], cur.reason)}</select></label>
    <label class="field"><span>Note</span><textarea class="input" id="dNote" rows="2">${esc(cur.note || '')}</textarea></label>`, {
    save: async r => {
      const rec = { id: x ? x.id : newId().slice(0, 12), drug: dv(r, 'dDrug'), dose: dv(r, 'dDose'), start: dv(r, 'dStart'), stop: dv(r, 'dStop'), reason: dv(r, 'dReason'), note: dv(r, 'dNote') };
      if (!rec.drug) { toast('Write the antibiotic name'); return false; }
      if (rec.stop && rec.stop < rec.start) { toast('Stop date is before start date'); return false; }
      if (x) Object.assign(x, rec); else ST.rp.abx.push(rec);
      if (await saveRP()) renderRPatient(); else return false;
    },
    del: x ? async () => { ST.rp.abx = ST.rp.abx.filter(c => c.id !== x.id); if (await saveRP()) renderRPatient(); } : null
  });
}
async function abxFromHandovers() {
  const p = patientById(ST.pid); if (!p) return;
  const r = dlg('Drugs written on the handovers', '<div class="loading" style="min-height:80px"><div class="spinner"></div></div>');
  try {
    const sids = (p.sheets || []).slice().sort();
    const rows = [];
    for (const sid of sids.slice(-40)) { const d = await S.store.getSheet(sid); const e = d && d.entries.find(x => x.id === p.id); if (e) rows.push({ sid, drugs: htmlToText(e.drugs) }); }
    const body = r.querySelector('.modal-body'); if (!body) return;
    body.innerHTML = rows.length ? rows.map(x => `<div class="log-row"><span class="log-time">${esc(fmtSidShort(x.sid))}</span><div style="white-space:pre-line">${esc(x.drugs || '—')}</div></div>`).join('') : '<p class="help">This patient is not on any handover.</p>';
  } catch (e) { const body = r.querySelector('.modal-body'); if (body) body.innerHTML = `<p class="err">${esc(e.code || e.message)}</p>`; }
}

/* ---------- CPR register ---------- */
async function renderCpr() {
  stBody(stTabs() + '<div class="loading"><div class="spinner"></div></div>');
  try { await loadPatients(); if (!ST.cpr) ST.cpr = await S.store.rList('cpr'); } catch (e) { stBody(stTabs() + `<p class="err">${esc(e.code || e.message)}</p>`); return; }
  const all = ST.cpr.slice().sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  const ranges = [['30', 'Last 30 days'], ['90', '3 months'], ['365', '1 year'], ['all', 'All']];
  const from = ST.cprRange === 'all' ? '' : addDays(todayISO(), -(+ST.cprRange - 1));
  const list = all.filter(x => !from || x.date >= from);
  const n = list.length, pc = k => n ? Math.round(100 * k / n) : 0;
  const rosc = list.filter(x => x.rosc === 'yes').length, cnt = id => list.filter(x => x.outcome === id).length;
  const places = [...new Set(list.map(x => x.place || 'Not written'))];
  const hint = x => { const p = x.pid && patientById(x.pid); if (!p || p.outcome === 'active') return ''; const map = { death: 'died', dama: 'dama', transfer: 'transfer', discharged: 'alive', ward: 'alive' }; const want = map[p.outcome]; return want && want !== x.outcome ? `<div class="help" style="color:var(--danger)">Handover says: ${esc(outLabel(p.outcome))}. Tap to update.</div>` : ''; };
  stBody(stTabs() + `
    <div class="opt-row" style="margin-bottom:10px">${ranges.map(([v, l]) => `<button class="opt ${ST.cprRange === v ? 'on' : ''}" data-action="cpr-range" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="tiles">
      <div class="tile"><b>${n}</b><span>CPR events</span></div>
      <div class="tile"><b>${rosc}</b><span>ROSC · ${pc(rosc)}%</span></div>
      <div class="tile"><b>${cnt('alive')}</b><span>Left ICU alive · ${pc(cnt('alive'))}%</span></div>
      <div class="tile"><b>${cnt('died')}</b><span>Died · ${pc(cnt('died'))}%</span></div>
      <div class="tile"><b>${cnt('dama')}</b><span>DAMA</span></div>
      <div class="tile"><b>${cnt('still')}</b><span>Still in ICU</span></div>
    </div>
    ${n ? `<div class="panel"><h4>Where the arrest happened</h4><div class="tablewrap"><table class="labtable simple"><thead><tr><th class="tname">Place</th><th>CPR</th><th>ROSC</th><th>Left ICU alive</th><th>Died</th></tr></thead><tbody>${places.map(pl => { const g = list.filter(x => (x.place || 'Not written') === pl); return `<tr><th class="tname">${esc(pl)}</th><td>${g.length}</td><td>${g.filter(x => x.rosc === 'yes').length}</td><td>${g.filter(x => x.outcome === 'alive').length}</td><td>${g.filter(x => x.outcome === 'died').length}</td></tr>`; }).join('')}</tbody></table></div></div>` : ''}
    <div class="opt-row" style="margin-bottom:10px">${canStudyEdit() ? `<button class="btn primary" data-action="cpr-edit">${icon('plus')} Add a CPR</button>` : ''}<button class="btn" data-action="st-csv" data-v="cpr">${icon('file')} CPR CSV</button></div>
    ${list.map(x => { const o = CPR_OUT.find(k => k.id === x.outcome); return `<button class="result ${x.outcome === 'died' ? 'cc-red' : x.outcome === 'alive' ? 'cc-green' : ''}" data-action="cpr-edit" data-id="${esc(x.id)}" style="--c:var(--danger)">
      <div class="bedbox" style="font-size:.75em;line-height:1.15;text-align:center">${esc(fmtDM(x.date))}<br>${esc(x.time || '')}</div>
      <div class="u"><b>${esc(x.name || '—')}</b> <span class="help">${esc(ageText(x.age))}</span>
        <div class="help">Arrest in ${esc(x.place || '?')}${x.from ? ' · came from ' + esc(x.from) : ''} · ${x.minutes ? esc(x.minutes) + ' min CPR · ' : ''}ROSC ${x.rosc === 'yes' ? 'yes' : 'no'}</div>${hint(x)}</div>
      <span class="badge ${x.outcome === 'alive' ? 'new' : x.outcome === 'still' ? '' : 'left'}">${esc(o ? o.label : '')}</span></button>`; }).join('') || '<p class="help">No CPR recorded in this period.</p>'}`);
}
function cprDialog(id) {
  const x = id ? ST.cpr.find(c => c.id === id) : null;
  const n = nowParts();
  const cur = x || { pid: '', name: '', age: '', uhid: '', date: n.date, time: n.time, place: 'ICU', from: '', minutes: '', rosc: 'yes', outcome: 'still', note: '' };
  const label = p => `${p.name} · ${p.bed || ''} · MICU ${fmtShort(p.micuDate)}`;
  const linked = cur.pid ? patientById(cur.pid) : null;
  const r = dlg(x ? 'Edit CPR' : 'Add a CPR', `
    <label class="field"><span>Patient (from the handovers)</span><input class="input" id="dPat" list="dlPat" value="${esc(linked ? label(linked) : '')}" placeholder="Start typing a name"><datalist id="dlPat">${(ST.patients || []).slice(0, 400).map(p => `<option value="${esc(label(p))}">`).join('')}</datalist></label>
    <p class="help" style="margin-top:-6px">Not on any handover? Leave this empty and write the details below.</p>
    <div class="row">
      <label class="field" style="grid-column:span 2"><span>Name</span><input class="input" id="dName" value="${esc(cur.name)}" autocapitalize="characters"></label>
      <label class="field"><span>Age</span><input class="input" id="dAge" value="${esc(cur.age)}"></label>
      <label class="field"><span>UHID</span><input class="input" id="dUhid" value="${esc(cur.uhid || '')}"></label>
      <label class="field"><span>Date</span><input class="input" type="date" id="dDate" value="${esc(cur.date)}"></label>
      <label class="field"><span>Time</span><input class="input" type="time" id="dTime" value="${esc(cur.time)}"></label>
      <label class="field"><span>Where the arrest happened</span><select class="input" id="dPlace">${opt([...new Set([...ST.cat.cprPlaces, cur.place].filter(Boolean))], cur.place)}</select></label>
      <label class="field"><span>Patient came to ICU from</span><select class="input" id="dFrom"><option value=""></option>${opt([...new Set([...ST.cat.cprFrom, cur.from].filter(Boolean))], cur.from)}</select></label>
      <label class="field"><span>CPR duration (minutes)</span><input class="input" id="dMin" inputmode="numeric" value="${esc(cur.minutes)}"></label>
      <label class="field"><span>ROSC</span><select class="input" id="dRosc">${opt([['yes', 'Yes'], ['no', 'No']], cur.rosc)}</select></label>
      <label class="field" style="grid-column:1/-1"><span>Final result</span><select class="input" id="dOut">${opt(CPR_OUT.map(o => [o.id, o.label]), cur.outcome)}</select></label>
    </div>
    <button type="button" class="btn soft" id="dFill" style="margin-top:10px">Fill result from the handover</button>
    <label class="field" style="margin-top:10px"><span>Note</span><textarea class="input" id="dNote" rows="2">${esc(cur.note || '')}</textarea></label>`, {
    wide: true,
    save: async r => {
      const pick = (ST.patients || []).find(p => label(p) === dv(r, 'dPat'));
      const rec = { id: x ? x.id : newId().slice(0, 14), pid: pick ? pick.id : '', name: (dv(r, 'dName') || (pick ? pick.name : '')).toUpperCase(), age: dv(r, 'dAge'), uhid: dv(r, 'dUhid'), date: dv(r, 'dDate'), time: dv(r, 'dTime'), place: dv(r, 'dPlace'), from: dv(r, 'dFrom'), minutes: dv(r, 'dMin'), rosc: dv(r, 'dRosc'), outcome: dv(r, 'dOut'), note: dv(r, 'dNote'), updatedAt: Date.now(), updatedBy: byWho() };
      if (!rec.name) { toast('Choose a patient or write a name'); return false; }
      if (!validISO(rec.date)) { toast('Choose the date'); return false; }
      if (!canStudyEdit()) { toast('View only'); return false; }
      try { await settle(S.store.rSet('cpr', rec.id, rec)); } catch (e) { saveFail(e); return false; }
      if (x) Object.assign(x, rec); else ST.cpr.push(rec);
      renderCpr();
    },
    del: x ? async () => { if (!(await ask('Delete this CPR record?', { ok: 'Delete', danger: true }))) return; try { await settle(S.store.rDel('cpr', x.id)); ST.cpr = ST.cpr.filter(c => c.id !== x.id); renderCpr(); } catch (e) { saveFail(e); } } : null
  });
  const fillFrom = () => { const p = (ST.patients || []).find(q => label(q) === dv(r, 'dPat')); if (!p) return null; r.querySelector('#dName').value = p.name || ''; r.querySelector('#dAge').value = p.age || ''; r.querySelector('#dUhid').value = p.uhid || ''; return p; };
  r.querySelector('#dPat').addEventListener('change', fillFrom);
  r.querySelector('#dFill').onclick = () => {
    const p = fillFrom(); if (!p) { toast('Choose a patient from the handovers first'); return; }
    const map = { active: 'still', death: 'died', dama: 'dama', transfer: 'transfer', discharged: 'alive', ward: 'alive' };
    r.querySelector('#dOut').value = map[p.outcome] || 'still'; toast('Handover says: ' + (p.outcome === 'active' ? 'still in ICU' : outLabel(p.outcome)));
  };
}

/* ---------- outcomes (deaths, DAMA, discharge, ward…) ---------- */
async function renderOutcomes() {
  if (!ST.outFrom) { const t = todayISO(); ST.outFrom = t.slice(0, 8) + '01'; ST.outTo = t; }
  const quick = (() => {
    const t = todayISO(), [y, m] = t.split('-').map(Number), last = new Date(y, m - 1, 0);
    const lm = `${last.getFullYear()}-${pad(last.getMonth() + 1)}`;
    return [['This month', t.slice(0, 8) + '01', t], ['Last month', lm + '-01', `${lm}-${pad(last.getDate())}`], ['3 months', addDays(t, -89), t], ['6 months', addDays(t, -181), t], ['1 year', addDays(t, -364), t]];
  })();
  stBody(stTabs() + `<div class="panel"><div class="row"><label class="field"><span>From</span><input class="input" type="date" id="oFrom" value="${esc(ST.outFrom)}"></label><label class="field"><span>To</span><input class="input" type="date" id="oTo" value="${esc(ST.outTo)}"></label></div>
    <div class="opt-row" style="margin-top:10px">${quick.map(([l, f, t]) => `<button class="opt ${ST.outFrom === f && ST.outTo === t ? 'on' : ''}" data-action="out-quick" data-f="${f}" data-t="${t}">${l}</button>`).join('')}</div></div><div id="oOut"><div class="loading" style="min-height:100px"><div class="spinner"></div></div></div>`);
  ['oFrom', 'oTo'].forEach(id => $('#' + id).addEventListener('change', () => { ST.outFrom = $('#oFrom').value; ST.outTo = $('#oTo').value; ST.outData = null; renderOutcomes(); }));
  if (!validISO(ST.outFrom) || !validISO(ST.outTo) || ST.outFrom > ST.outTo) { $('#oOut').innerHTML = '<p class="err">Choose a valid period.</p>'; return; }
  try { if (!ST.outData || ST.outData.key !== ST.outFrom + ST.outTo) ST.outData = { key: ST.outFrom + ST.outTo, range: await S.store.loadRange(ST.outFrom, ST.outTo) }; }
  catch (e) { $('#oOut').innerHTML = `<p class="err">${esc(e.code || e.message)}</p>`; return; }
  const s = summarise(ST.outData.range, ST.outFrom, ST.outTo), n = s.list.length, pc = k => n ? (100 * k / n).toFixed(1) : '0.0';
  const still = s.list.filter(p => !p.outcome);
  const groups = [...OUTCOMES.filter(o => o.id !== 'active').map(o => [o.id, o.label, s.list.filter(p => p.outcome === o.id)]), ['still', 'Still in ICU at the end', still]];
  $('#oOut').innerHTML = `<div class="tiles">
      <div class="tile"><b>${n}</b><span>Patients</span></div><div class="tile"><b>${s.admitted}</b><span>New to MICU</span></div>
      ${groups.map(([id, l, g]) => `<div class="tile ${id === 'death' ? 'cc-red' : ''}"><b>${g.length}</b><span>${esc(l)} · ${pc(g.length)}%</span></div>`).join('')}
      <div class="tile"><b>${s.avgStay === null ? '—' : s.avgStay.toFixed(1)}</b><span>Average ICU stay (days)</span></div></div>
    ${groups.filter(g => g[2].length).map(([id, l, g]) => `<details class="panel"><summary><b>${esc(l)}</b> · ${g.length}</summary>${g.map(p => `<div class="imp-row"><div class="bedbox" style="--c:${esc(bedColor(p.e.bed))}">${esc(p.e.bed || '—')}</div><div class="u"><b>${esc(p.e.name)}</b> <span class="help">${esc(ageText(p.e.age))}</span><div class="help">MICU ${esc(fmtShort(p.e.micuDate))}${p.outDate ? ' → ' + esc(fmtShort(p.outDate)) : ''} · ${esc(htmlToText(p.e.diagnosis).slice(0, 80))}</div></div></div>`).join('')}</details>`).join('')}
    <button class="btn" data-action="out-csv">${icon('file')} Admissions CSV for this period</button>`;
}

/* ---------- my studies ---------- */
async function renderStudies() {
  stBody(stTabs() + '<div class="loading"><div class="spinner"></div></div>');
  try { await loadPatients(); if (!ST.studies) ST.studies = await S.store.rList('studies'); } catch (e) { stBody(stTabs() + `<p class="err">${esc(e.code || e.message)}</p>`); return; }
  stBody(stTabs() + `<p class="help" style="margin-top:0">Make a study, choose what to record for each patient, add patients, then download everything as one CSV. Age, diagnosis, admission date, ICU stay and outcome come from the handovers by themselves.</p>
    ${canStudyEdit() ? `<button class="btn primary" data-action="study-edit" style="margin-bottom:10px">${icon('plus')} New study</button>` : ''}
    ${ST.studies.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(s => `<button class="result" data-action="study-open" data-id="${esc(s.id)}" style="--c:var(--primary)"><div class="u"><b>${esc(s.name)}</b><div class="help">${(s.pids || []).length} patients · ${(s.fields || []).length} items to record${s.desc ? ' · ' + esc(s.desc) : ''}</div></div></button>`).join('') || '<p class="help">No studies yet.</p>'}`);
}
function fieldRow(f) { return `<div class="sens-row fld-row" data-id="${esc(f.id || '')}"><input class="input" value="${esc(f.label || '')}" placeholder="What to record, e.g. Shock on admission"><select class="input">${opt(STUDY_TYPES, f.type || 'text')}</select><input class="input" value="${esc((f.options || []).join(', '))}" placeholder="Choices, comma separated"><button type="button" class="icon-btn" data-sdel aria-label="Remove">${icon('x')}</button></div>`; }
function studyDialog(s) {
  const cur = s || { name: '', desc: '', fields: [{ id: '', label: '', type: 'yesno', options: [] }] };
  const r = dlg(s ? 'Edit study' : 'New study', `
    <label class="field"><span>Study name</span><input class="input" id="dName" value="${esc(cur.name)}" placeholder="e.g. Dengue shock outcome 2026"></label>
    <label class="field"><span>Short description</span><input class="input" id="dDesc" value="${esc(cur.desc || '')}"></label>
    <div class="field"><span>What to record for each patient</span><div id="dFields">${cur.fields.map(fieldRow).join('')}</div><button type="button" class="btn soft" id="dAddF">${icon('plus')} Add an item</button></div>
    <p class="help">Investigations, serology, cultures and antibiotics are recorded in each patient's own page and have their own CSV files.</p>`, {
    wide: true,
    save: async r => {
      const name = dv(r, 'dName'); if (!name) { toast('Give the study a name'); return false; }
      const fields = [...r.querySelectorAll('.fld-row')].map(row => { const [l, t, o] = row.querySelectorAll('input,select'); return { id: row.dataset.id || newId().slice(0, 8), label: l.value.trim(), type: t.value, options: o.value.split(',').map(x => x.trim()).filter(Boolean) }; }).filter(f => f.label);
      const rec = { ...(s || { id: newId().slice(0, 14), pids: [], codes: {}, createdAt: Date.now(), createdBy: byWho() }), name, desc: dv(r, 'dDesc'), fields, updatedAt: Date.now() };
      try { await settle(S.store.rSet('studies', rec.id, rec)); } catch (e) { saveFail(e); return false; }
      ST.studies = (ST.studies || []).filter(x => x.id !== rec.id).concat(rec); ST.study = rec; ST.recs = null; renderStudy();
    },
    del: s ? async () => {
      if (!(await ask(`Delete the study "${s.name}" and everything recorded in it?`, { ok: 'Delete', danger: true }))) return;
      try { const recs = await S.store.rList('studyrec', 'studyId', s.id); for (const x of recs) await settle(S.store.rDel('studyrec', x.key)); await settle(S.store.rDel('studies', s.id)); ST.studies = ST.studies.filter(x => x.id !== s.id); ST.study = null; renderStudy(); } catch (e) { saveFail(e); }
    } : null
  });
  r.querySelector('#dAddF').onclick = () => r.querySelector('#dFields').insertAdjacentHTML('beforeend', fieldRow({}));
  r.querySelector('#dFields').addEventListener('click', ev => { const b = ev.target.closest('[data-sdel]'); if (b) b.closest('.fld-row').remove(); });
}
async function renderOneStudy() {
  const s = ST.study;
  stBody(stTabs() + '<div class="loading"><div class="spinner"></div></div>');
  try { await loadPatients(); if (!ST.recs) ST.recs = await S.store.rList('studyrec', 'studyId', s.id); } catch (e) { stBody(stTabs() + `<p class="err">${esc(e.code || e.message)}</p>`); return; }
  const recOf = pid => ST.recs.find(x => x.pid === pid);
  const filled = pid => { const r = recOf(pid); return r ? s.fields.filter(f => r.values && r.values[f.id] !== undefined && r.values[f.id] !== '').length : 0; };
  stBody(stTabs() + `<button class="btn ghost" data-action="study-back">${icon('left')} All studies</button>
    <div class="sheet-head" style="margin-top:8px"><div class="name" style="font-weight:900;font-size:1.1em">${esc(s.name)}</div>${s.desc ? `<div class="help">${esc(s.desc)}</div>` : ''}
      <div class="stats"><span class="stat"><b>${(s.pids || []).length}</b> patients</span><span class="stat"><b>${s.fields.length}</b> items</span></div></div>
    <div class="opt-row" style="margin-bottom:10px">${canStudyEdit() ? `<button class="btn primary" data-action="study-add">${icon('plus')} Add patients</button><button class="btn" data-action="study-edit" data-id="${esc(s.id)}">Edit study</button>` : ''}
      <button class="btn" data-action="study-csv">${icon('file')} Download CSV</button></div>
    <label class="keep-main" style="margin-bottom:10px"><input type="checkbox" id="stDeid2" ${ST.deid ? 'checked' : ''}><span>Leave out names and UHID in the CSV (use study codes)</span></label>
    ${(s.pids || []).map(pid => { const p = patientById(pid) || { name: '(not found)' }; const f = filled(pid); return `<button class="result" data-action="study-rec" data-id="${esc(pid)}" style="--c:${esc(bedColor(p.bed))}"><div class="bedbox" style="font-size:.78em">${esc((s.codes || {})[pid] || '')}</div><div class="u"><b>${esc(p.name)}</b> <span class="help">${esc(ageText(p.age))}</span><div class="help clamp" style="--lines:1">${esc(p.diagnosisText || '')}</div></div><span class="badge ${f === s.fields.length && f ? 'new' : ''}">${f}/${s.fields.length}</span></button>`; }).join('') || '<p class="help">No patients in this study yet.</p>'}`);
  const d = $('#stDeid2'); if (d) d.onchange = e => { ST.deid = e.target.checked; };
}
function studyAddDialog() {
  const s = ST.study, inS = new Set(s.pids || []);
  const r = dlg('Add patients', `<label class="search" style="margin-bottom:10px">${icon('search')}<input id="dQ" type="search" placeholder="Name, UHID, diagnosis…" autocomplete="off"></label><div id="dList"></div>`, {
    saveLabel: 'Add', wide: true,
    save: async r => {
      const add = [...r.querySelectorAll('#dList input:checked')].map(i => i.value).filter(id => !inS.has(id));
      if (!add.length) return;
      s.pids = [...(s.pids || []), ...add]; s.codes ||= {};
      let n = Object.keys(s.codes).length; add.forEach(id => { if (!s.codes[id]) s.codes[id] = 'S' + String(++n).padStart(3, '0'); });
      try { await settle(S.store.rSet('studies', s.id, s)); } catch (e) { saveFail(e); return false; }
      renderOneStudy();
    }
  });
  const draw = () => {
    const w = r.querySelector('#dQ').value.toLowerCase().split(/\s+/).filter(Boolean);
    const list = (ST.patients || []).filter(p => !inS.has(p.id) && (!w.length || w.every(x => [p.name, p.uhid, p.diagnosisText, p.bed].join(' ').toLowerCase().includes(x)))).slice(0, 150);
    const keep = new Set([...r.querySelectorAll('#dList input:checked')].map(i => i.value));
    r.querySelector('#dList').innerHTML = list.map(p => `<label class="keep-row keep-main"><input type="checkbox" value="${esc(p.id)}" ${keep.has(p.id) ? 'checked' : ''}><span class="bedbox" style="--c:${esc(bedColor(p.bed))}">${esc(p.bed || '—')}</span><span class="u"><b>${esc(p.name)}</b><small>MICU ${esc(fmtShort(p.micuDate))} · ${esc(p.diagnosisText || '')}</small></span></label>`).join('') || '<p class="help">No more patients match.</p>';
  };
  r.querySelector('#dQ').addEventListener('input', draw); draw();
}
function studyRecDialog(pid) {
  const s = ST.study, p = patientById(pid) || { name: '' };
  const rec = ST.recs.find(x => x.pid === pid) || { key: `${s.id}__${pid}`, studyId: s.id, pid, values: {} };
  const input = f => {
    const v = (rec.values || {})[f.id] ?? '', id = 'f_' + f.id;
    if (f.type === 'yesno') return `<select class="input" id="${id}"><option value=""></option>${opt([['Yes', 'Yes'], ['No', 'No']], v)}</select>`;
    if (f.type === 'choice') return `<select class="input" id="${id}"><option value=""></option>${opt(f.options || [], v)}</select>`;
    if (f.type === 'date') return `<input class="input" type="date" id="${id}" value="${esc(v)}">`;
    if (f.type === 'num') return `<input class="input" id="${id}" inputmode="decimal" value="${esc(v)}">`;
    return `<textarea class="input" id="${id}" rows="2">${esc(v)}</textarea>`;
  };
  dlg(`${(s.codes || {})[pid] || ''} · ${p.name}`, `${s.fields.map(f => `<label class="field"><span>${esc(f.label)}</span>${input(f)}</label>`).join('') || '<p class="help">This study has no items yet. Edit the study to add some.</p>'}
    <label class="field"><span>Note</span><textarea class="input" id="f__note" rows="2">${esc(rec.note || '')}</textarea></label>`, {
    save: async r => {
      if (!canStudyEdit()) { toast('View only'); return false; }
      rec.values = {}; s.fields.forEach(f => { const v = dv(r, 'f_' + f.id); if (v !== '') rec.values[f.id] = v; });
      rec.note = dv(r, 'f__note'); rec.updatedAt = Date.now(); rec.updatedBy = byWho();
      try { await settle(S.store.rSet('studyrec', rec.key, rec)); } catch (e) { saveFail(e); return false; }
      ST.recs = ST.recs.filter(x => x.key !== rec.key).concat(rec); renderOneStudy();
    },
    del: canStudyEdit() ? async () => {
      if (!(await ask(`Take ${p.name} out of this study? What was recorded for them here is deleted.`, { ok: 'Take out', danger: true }))) return;
      s.pids = (s.pids || []).filter(x => x !== pid);
      try { await settle(S.store.rSet('studies', s.id, s)); await settle(S.store.rDel('studyrec', rec.key)); ST.recs = ST.recs.filter(x => x.key !== rec.key); renderOneStudy(); } catch (e) { saveFail(e); }
    } : null
  });
}

/* ---------- test lists (catalog) ---------- */
function renderLists() {
  const c = ST.cat, edit = canStudyEdit();
  const ta = (id, list, lab) => `<div class="panel"><h4>${lab}</h4><textarea class="input" id="${id}" rows="5" ${edit ? '' : 'disabled'}>${esc(list.join('\n'))}</textarea><p class="help">One per line.</p></div>`;
  stBody(stTabs() + `<p class="help" style="margin-top:0">Change names, units and normal ranges to match your hospital. Values already written are kept.</p>
    <div id="lgWrap">${c.labGroups.map((g, gi) => `<div class="panel lg" data-gi="${gi}"><div class="cat-row"><input class="input lg-name" value="${esc(g.name)}" ${edit ? '' : 'disabled'}>${edit ? `<button class="icon-btn" data-action="lg-del" data-gi="${gi}" aria-label="Remove group">${icon('trash')}</button>` : ''}</div>
      <div class="lt-head"><span>Test</span><span>Unit</span><span>Low</span><span>High</span><span>Type</span><span></span></div>
      ${g.tests.map(t => `<div class="lt-row" data-id="${esc(t.id)}"><input class="input" value="${esc(t.name)}" ${edit ? '' : 'disabled'}><input class="input" value="${esc(t.unit)}" ${edit ? '' : 'disabled'}><input class="input" value="${esc(t.low)}" inputmode="decimal" ${edit ? '' : 'disabled'}><input class="input" value="${esc(t.high)}" inputmode="decimal" ${edit ? '' : 'disabled'}><select class="input" ${edit ? '' : 'disabled'}>${opt([['num', 'Number'], ['text', 'Text']], t.type)}</select>${edit ? `<button type="button" class="icon-btn" data-ldel aria-label="Remove">${icon('x')}</button>` : '<span></span>'}</div>`).join('')}
      ${edit ? `<button type="button" class="btn soft" data-action="lt-add" data-gi="${gi}">${icon('plus')} Add test</button>` : ''}</div>`).join('')}</div>
    ${edit ? `<button class="btn soft" data-action="lg-add" style="margin-bottom:12px">${icon('plus')} Add a group</button>` : ''}
    <div class="panel"><h4>Serology / PCR tests</h4><div class="lt-head st"><span>Test</span><span>Possible results (comma)</span><span>Details label</span><span></span></div><div id="srWrap">${c.seroTests.map(t => `<div class="lt-row st" data-id="${esc(t.id)}"><input class="input" value="${esc(t.name)}" ${edit ? '' : 'disabled'}><input class="input" value="${esc((t.results || []).join(', '))}" ${edit ? '' : 'disabled'}><input class="input" value="${esc(t.detail || '')}" ${edit ? '' : 'disabled'}>${edit ? `<button type="button" class="icon-btn" data-ldel aria-label="Remove">${icon('x')}</button>` : '<span></span>'}</div>`).join('')}</div>${edit ? `<button type="button" class="btn soft" data-action="sr-add">${icon('plus')} Add test</button>` : ''}</div>
    ${ta('lsSpec', c.specimens, 'Culture specimens')}${ta('lsOrg', c.organisms, 'Organisms')}${ta('lsAbx', c.antibiotics, 'Antibiotics')}${ta('lsPlace', c.cprPlaces, 'CPR: where the arrest happened')}${ta('lsFrom', c.cprFrom, 'CPR: patient came from')}
    ${edit ? `<button class="btn primary block" data-action="lists-save">Save lists</button>` : ''}`);
  const w = $('#stBody'); w.addEventListener('click', ev => { const b = ev.target.closest('[data-ldel]'); if (b) b.closest('.lt-row').remove(); });
}
function collectLists() {
  const lines = id => $('#' + id).value.split('\n').map(x => x.trim()).filter(Boolean);
  const labGroups = $$('#lgWrap .lg').map(g => ({
    id: ST.cat.labGroups[+g.dataset.gi] ? ST.cat.labGroups[+g.dataset.gi].id : 'g' + newId().slice(0, 6), name: $('.lg-name', g).value.trim() || 'Group',
    tests: $$('.lt-row', g).map(r => { const [n, u, lo, hi, ty] = r.querySelectorAll('input,select'); return { id: r.dataset.id || 't' + newId().slice(0, 6), name: n.value.trim(), unit: u.value.trim(), low: lo.value.trim(), high: hi.value.trim(), type: ty.value }; }).filter(t => t.name)
  }));
  const seroTests = $$('#srWrap .lt-row').map(r => { const [n, res, det] = r.querySelectorAll('input'); return { id: r.dataset.id || 's' + newId().slice(0, 6), name: n.value.trim(), results: res.value.split(',').map(x => x.trim()).filter(Boolean), detail: det.value.trim() }; }).filter(t => t.name);
  return { labGroups, seroTests, specimens: lines('lsSpec'), organisms: lines('lsOrg'), antibiotics: lines('lsAbx'), cprPlaces: lines('lsPlace'), cprFrom: lines('lsFrom') };
}

/* ---------- CSV ---------- */
async function studyCsv(kind) {
  try {
    await loadPatients();
    const pcode = new Proxy({}, { get: (_, id) => typeof id === 'string' && id ? 'P-' + id.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase() : '' });
    const who = (pid, name, uhid) => ST.deid ? [pcode[pid] || ''] : [pcode[pid] || '', name || '', uhid || ''];
    const whoHead = ST.deid ? ['Patient code'] : ['Patient code', 'Name', 'UHID'];
    const base = pid => { const p = patientById(pid) || {}; return [p.age || '', p.micuDate || '', p.outcome === 'active' ? 'In ICU' : outLabel(p.outcome), p.outcomeDate || '']; };
    const baseHead = ['Age', 'MICU date', 'Outcome', 'Outcome date'];
    let rows, name;
    if (kind === 'cpr') {
      const list = ST.cpr || await S.store.rList('cpr');
      rows = [[...whoHead, 'Age', 'Date', 'Time', 'Arrest place', 'Came from', 'CPR minutes', 'ROSC', 'Result', 'On handover', 'Note'],
        ...list.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).map(x => [...(ST.deid ? [x.pid ? pcode[x.pid] : 'CPR-' + x.id.slice(0, 5)] : [x.pid ? pcode[x.pid] : '', x.name, x.uhid]), x.age, x.date, x.time, x.place, x.from, x.minutes, x.rosc === 'yes' ? 'Yes' : 'No', (CPR_OUT.find(o => o.id === x.outcome) || {}).label || '', x.pid ? 'Yes' : 'No', x.note || ''])];
      name = 'MICU_CPR_register';
    } else {
      const all = await S.store.rList('rpatients');
      const tests = Object.fromEntries(ST.cat.labGroups.flatMap(g => g.tests.map(t => [t.id, { ...t, group: g.name }])));
      if (kind === 'labs') {
        rows = [[...whoHead, ...baseHead, 'Date', 'Time', 'ICU day', 'Group', 'Test', 'Value', 'Unit', 'Low', 'High', 'Flag', 'Colour']];
        all.forEach(rp => { const p = patientById(rp.pid) || {}; (rp.labs.cols || []).slice().sort((a, b) => a.at.localeCompare(b.at)).forEach(c => Object.entries(rp.labs.vals[c.id] || {}).forEach(([tid, cell]) => { const t = tests[tid] || { name: tid, unit: '', low: '', high: '', group: '' }; rows.push([...who(rp.pid, rp.name, rp.uhid), ...base(rp.pid), c.at.slice(0, 10), c.at.slice(11, 16), validISO(p.micuDate) ? diffDays(p.micuDate, c.at.slice(0, 10)) + 1 : '', t.group, t.name, cell.v, t.unit, t.low, t.high, labFlag(t, cell.v), cell.c || '']); })); });
        name = 'MICU_investigations';
      } else if (kind === 'sero') {
        rows = [[...whoHead, ...baseHead, 'Date', 'Time', 'Test', 'Result', 'Details']];
        all.forEach(rp => (rp.sero || []).forEach(x => rows.push([...who(rp.pid, rp.name, rp.uhid), ...base(rp.pid), String(x.at).slice(0, 10), String(x.at).slice(11, 16), x.test, x.result, x.detail || ''])));
        name = 'MICU_serology';
      } else if (kind === 'cult') {
        rows = [[...whoHead, ...baseHead, 'Specimen', 'Sent', 'Reported', 'Result', 'Organism', 'Count', 'Sensitive', 'Intermediate', 'Resistant', 'Note']];
        all.forEach(rp => (rp.cultures || []).forEach(x => { const g = k => (x.sens || []).filter(s => s.r === k).map(s => s.ab).join('; '); rows.push([...who(rp.pid, rp.name, rp.uhid), ...base(rp.pid), x.specimen, x.sent, x.reported || '', x.result, x.organism || '', x.count || '', g('S'), g('I'), g('R'), x.note || '']); }));
        name = 'MICU_cultures';
      } else {
        rows = [[...whoHead, ...baseHead, 'Antibiotic', 'Dose / route', 'Started', 'Stopped', 'Days', 'Why', 'Started before any culture report', 'Note']];
        all.forEach(rp => { const p = patientById(rp.pid) || {}; const st = abxStats(p, { cultures: rp.cultures || [], abx: rp.abx || [] }); st.courses.forEach((c, i) => rows.push([...who(rp.pid, rp.name, rp.uhid), ...base(rp.pid), c.drug, c.dose || '', c.start, c.stop || '', validISO(c.start) ? Math.max(1, diffDays(c.start, st.end(c)) + 1) : '', c.reason || '', i > 0 && validISO(c.start) && (!st.firstRep || c.start < st.firstRep) ? 'Yes' : 'No', c.note || ''])); });
        name = 'MICU_antibiotics';
      }
    }
    saveBlob(new Blob([csvOf(rows.map(r => r.map(safeCell)))], { type: 'text/csv;charset=utf-8' }), `${name}_${todayISO()}.csv`);
    toast(`CSV ready · ${rows.length - 1} rows`);
  } catch (e) { console.error(e); toast('Could not make the CSV: ' + (e.code || e.message)); }
}
async function oneStudyCsv() {
  const s = ST.study;
  const recs = ST.recs || await S.store.rList('studyrec', 'studyId', s.id);
  const head = [...(ST.deid ? ['Study code'] : ['Study code', 'Name', 'UHID']), 'Age', 'Diagnosis', 'DOA', 'MICU date', 'Outcome', 'Outcome date', 'ICU stay (days)', ...s.fields.map(f => f.label), 'Note'];
  const rows = [head, ...(s.pids || []).map(pid => {
    const p = patientById(pid) || {}, r = recs.find(x => x.pid === pid) || { values: {} };
    const stay = validISO(p.micuDate) ? diffDays(p.micuDate, p.outcome !== 'active' && validISO(p.outcomeDate) ? p.outcomeDate : todayISO()) + 1 : '';
    return [...(ST.deid ? [(s.codes || {})[pid] || ''] : [(s.codes || {})[pid] || '', p.name || '', p.uhid || '']), p.age || '', p.diagnosisText || '', p.doa || '', p.micuDate || '', p.outcome === 'active' ? 'In ICU' : outLabel(p.outcome), p.outcomeDate || '', stay, ...s.fields.map(f => (r.values || {})[f.id] ?? ''), r.note || ''];
  })];
  saveBlob(new Blob([csvOf(rows.map(r => r.map(safeCell)))], { type: 'text/csv;charset=utf-8' }), `Study_${s.name.replace(/[^\w]+/g, '_')}_${todayISO()}.csv`);
  toast('CSV ready');
}
function outcomesCsv() {
  const s = summarise(ST.outData.range, ST.outFrom, ST.outTo);
  saveBlob(new Blob([csvOf(admissionRows(s))], { type: 'text/csv;charset=utf-8' }), `MICU_admissions_${ST.outFrom}_to_${ST.outTo}.csv`);
  toast('CSV ready');
}

/* ---------- study actions ---------- */
Object.assign(A, {
  study: () => openStudy(),
  'st-tab': t => { ST.tab = t.dataset.v; ST.pid = null; ST.study = null; renderStudy(); },
  'st-open': t => { ST.sub = 'labs'; openRPatient(t.dataset.id); },
  'st-back': () => { ST.pid = null; renderStudy(); },
  'st-sub': t => { ST.sub = t.dataset.v; renderRPatient(); },
  'st-csv': t => studyCsv(t.dataset.v),
  'lab-group': t => { ST.group = t.dataset.v; renderRPatient(); },
  'lab-addcol': () => labColDialog(null),
  'lab-col': t => { const c = ST.rp.labs.cols.find(x => x.id === t.dataset.id); if (c) labColDialog(c); },
  'lab-cell': t => labCellDialog(t.dataset.col, t.dataset.test),
  'sero-edit': t => { if (!t.dataset.id && !canStudyEdit()) return; if (t.dataset.id && !canStudyEdit()) return; seroDialog(t.dataset.id); },
  'cult-edit': t => { if (!canStudyEdit()) return; cultDialog(t.dataset.id); },
  'abx-edit': t => { if (!canStudyEdit()) return; abxDialog(t.dataset.id); },
  'abx-handover': () => abxFromHandovers(),
  'cpr-range': t => { ST.cprRange = t.dataset.v; renderCpr(); },
  'cpr-edit': t => { if (!canStudyEdit()) return; cprDialog(t.dataset.id); },
  'out-quick': t => { ST.outFrom = t.dataset.f; ST.outTo = t.dataset.t; renderOutcomes(); },
  'out-csv': () => outcomesCsv(),
  'study-edit': t => { if (!canStudyEdit()) return; studyDialog(t.dataset.id ? ST.studies.find(x => x.id === t.dataset.id) : null); },
  'study-open': t => { ST.study = ST.studies.find(x => x.id === t.dataset.id); ST.recs = null; renderStudy(); },
  'study-back': () => { ST.study = null; renderStudy(); },
  'study-add': () => studyAddDialog(),
  'study-rec': t => studyRecDialog(t.dataset.id),
  'study-csv': () => oneStudyCsv(),
  'lg-add': () => { ST.cat = collectLists(); ST.cat.labGroups.push({ id: 'g' + newId().slice(0, 6), name: 'New group', tests: [] }); renderLists(); },
  'lg-del': async t => { if (!(await ask('Remove this group from the list? Values already written stay in the records.', { ok: 'Remove', danger: true }))) return; ST.cat = collectLists(); ST.cat.labGroups.splice(+t.dataset.gi, 1); renderLists(); },
  'lt-add': t => { ST.cat = collectLists(); ST.cat.labGroups[+t.dataset.gi].tests.push({ id: 't' + newId().slice(0, 6), name: 'New test', unit: '', low: '', high: '', type: 'num' }); renderLists(); },
  'sr-add': () => { ST.cat = collectLists(); ST.cat.seroTests.push({ id: 's' + newId().slice(0, 6), name: 'New test', results: ['Positive', 'Negative', 'Pending'], detail: '' }); renderLists(); },
  'lists-save': async () => { ST.cat = collectLists(); try { const r = await settle(S.store.rSet('rsettings', 'catalog', ST.cat)); toast(savedMsg(r)); } catch (e) { saveFail(e); } }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.dataset && t.dataset.studyUid) {
    S.store.setUser(t.dataset.studyUid, { study: t.value }).then(() => toast(t.value ? 'Study access: ' + t.value : 'Study access removed')).catch(saveFail);
  }
});

function deviceAllowedFor(p) { return !limitApplies(p) || deviceInList(p); }

/* ---------------- service worker ---------------- */
function registerSW() {
  if (CFG.preview || !('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e));
}

// exposed for testing
window.__handover = { S, buildDocx, sanitizeHtml, htmlToParagraphs, parseHandoverDocx, exportListOf, rowOf, summarise };
boot();
