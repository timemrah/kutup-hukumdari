// localStorage kayıt: veritabanı yok, her oyuncu kendi tarayıcısında devam eder.
const KEY = 'kh-save-v1';
const FIELDS = ['hp', 'maxHp', 'hunger', 'xp', 'level', 'power', 'fish', 'day', 'time', 'kills', 'bossesDown', 'clawDmg', 'biteDmg', 'px', 'pz', 'yaw'];

export function collectSave(S, playerPos) {
  const o = {};
  for (const k of FIELDS) o[k] = S[k];
  o.px = playerPos.x;
  o.pz = playerPos.z;
  return o;
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function writeSave(o) {
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* gizli mod vb. */ }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* yok say */ }
}

// Sadece sonlu sayıları uygular; bozuk kayıt oyunu bozmaz.
export function applySave(S, o) {
  if (!o || typeof o !== 'object') return;
  for (const k of FIELDS) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) S[k] = v;
  }
  if (!(S.hp > 0)) S.hp = Math.min(50, S.maxHp);
}
