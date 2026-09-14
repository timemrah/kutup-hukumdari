import * as THREE from 'three';
import { buildWorld } from './world.js';
import { makePolarBear, setWoundLevel, animateBear } from './bears.js';
import { makePenguin, makeWolf, makeFox, makeWalrus, makeFish, makeMeat, showWounds, makeHpBar } from './wildlife.js';
import { clawPose, bitePose, CLAW_STRIKE_P, BITE_SNAP_P } from './attacks.js';
import { collectSave, applySave, hasSave, loadSave, writeSave, clearSave } from './save.js';
import { GameAudio } from './audio.js';
import { moveVector, inAttackArc, separationDelta, clampToCircle, homeDirection } from './movement.js';
import { actionForKey, actionForMouseButton, resolveInsideE } from './bindings.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe0ec, 60, 260);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 1500);

const audio = new GameAudio();
const settings = Object.assign({ quality: 'medium', snow: 60, sound: 70, sens: 100 }, JSON.parse(localStorage.getItem('kh-settings') || '{}'));
function applySettingsToInputs() {
  document.getElementById('set-quality').value = settings.quality;
  document.getElementById('set-snow').value = settings.snow;
  document.getElementById('set-sound').value = settings.sound;
  document.getElementById('set-sens').value = settings.sens;
}
applySettingsToInputs();
audio.vol = settings.sound / 100;

let W = buildWorld(scene, { quality: settings.quality });
function setSize() { renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, settings.quality === 'low' ? 1 : 2)); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
setSize();
addEventListener('resize', setSize);

// ---------- OYUN DURUMU ----------
const S = {
  running: false, paused: false, dead: false,
  hp: 100, maxHp: 100, hunger: 100, xp: 0, level: 1, power: 1.0, fish: 0,
  time: 8.0, day: 1, timeSpeed: 0.55, // oyun saati: 1 gerçek sn ≈ 0.55 oyun dk
  clawDmg: 12, biteDmg: 24,
  yaw: 0, pitch: 0.32, dist: 9,
  facing: Math.PI,
  keys: {}, attackCd: 0, biteCd: 0, hurtCd: 0, eatCd: 0,
  clawHitDone: true, clawFxDone: true, biteHitDone: true,
  inside: null, outsidePos: null, sleptToday: false, kills: 0, bossesDown: 0,
  started: false,
};
const player = makePolarBear({});
player.group.position.set(-8, 0, 44);
scene.add(player.group);

const female = makePolarBear({ female: true });
female.group.position.set(-4, 0, 48);
female.group.rotation.y = -0.6;
scene.add(female.group);

// penguenler
const penguins = [];
for (let i = 0; i < 7; i++) {
  const m = makePenguin();
  const a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 30;
  const x = 20 + Math.cos(a) * r, z = 10 + Math.sin(a) * r;
  m.position.set(x, W.groundY(x, z), z);
  m.rotation.y = Math.random() * 6;
  scene.add(m);
  penguins.push({ mesh: m, home: new THREE.Vector3(x, 0, z), t: Math.random() * 10, dir: Math.random() * 6 });
}

// düşmanlar: kurt x4, tilki x3, mors x2 + 2 boss
const enemies = [];
function spawnEnemy(kind, x, z, boss = false) {
  let model;
  const base = kind === 'wolf' ? { hp: 55, dmg: 9, speed: 5.2, xp: 25, range: 2.4 }
    : kind === 'fox' ? { hp: 30, dmg: 5, speed: 7.0, xp: 15, range: 2.0 }
    : kind === 'walrus' ? { hp: 120, dmg: 16, speed: 2.6, xp: 45, range: 2.8 }
    : { hp: 60, dmg: 10, speed: 5, xp: 20, range: 2.4 };
  if (kind === 'wolf') model = makeWolf({ alpha: boss });
  else if (kind === 'fox') model = makeFox();
  else model = makeWalrus({ boss });
  if (boss) { base.hp *= 3.2; base.dmg *= 1.6; base.xp *= 4; base.speed *= 1.1; }
  model.group.position.set(x, W.groundY(x, z), z);
  scene.add(model.group);
  // yüzen can barı (hasar alınca / kapışırken görünür)
  const barY = boss ? (kind === 'walrus' ? 4.4 : 3.0) : kind === 'walrus' ? 2.8 : kind === 'wolf' ? 2.0 : 1.4;
  const bar = makeHpBar(boss ? 2.6 : 1.5, boss ? 0xffb03a : 0xe5484d);
  bar.group.position.set(0, barY, 0);
  model.group.add(bar.group);
  // vuruş parlaması için emissive malzemeler
  const mats = new Set();
  model.group.traverse(o => {
    if (o.isMesh) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) { if (m && 'emissive' in m) mats.add(m); }
    }
  });
  const radius = (kind === 'wolf' ? 1.0 : kind === 'fox' ? 0.65 : 1.5) * (boss ? 1.4 : 1);
  const e = { kind, boss, ...base, maxHp: base.hp, model, atkCd: Math.random(), wander: Math.random() * 6, alive: true, bar, mats: [...mats], flash: 0, lunge: 0, lastHit: -99, radius, roomIndex: null, home: { x, z }, name: boss ? (kind === 'wolf' ? 'Alfa Kurt' : 'Dev Mors') : ({ wolf: 'Kutup Kurdu', fox: 'Kutup Tilkisi', walrus: 'Mors' })[kind] };
  enemies.push(e);
  return e;
}
spawnEnemy('wolf', 40, -10); spawnEnemy('wolf', -50, -20); spawnEnemy('fox', 15, 40);
spawnEnemy('fox', -20, -35); spawnEnemy('walrus', 34, 26); spawnEnemy('wolf', -10, -60);
spawnEnemy('fox', 55, 45);
// morslar gölet bekçisidir: her gölette bir tane
spawnEnemy('walrus', -30, 24); spawnEnemy('walrus', 10, -38);
// Boss'lar mağara İÇLERİNDE hüküm sürer (E ile girilen ayrı arenalar)
const bossDefs = [{ kind: 'wolf', room: 1 }, { kind: 'walrus', room: 2 }];
for (const b of bossDefs) {
  const room = W.interiors[b.room];
  const e = spawnEnemy(b.kind, room.x + 3, room.z - 2, true);
  e.roomIndex = b.room;
  e.model.group.position.y = room.floorY;
}

// balıklar (her gölette 5)
const fishes = [];
for (const w of W.waters) {
  for (let i = 0; i < 5; i++) {
    const f = makeFish();
    const a = Math.random() * Math.PI * 2, r = Math.random() * w.r * 0.6;
    f.position.set(w.x + Math.cos(a) * r, w.y - 0.45, w.z + Math.sin(a) * r);
    scene.add(f);
    fishes.push({ mesh: f, water: w, t: Math.random() * 10, alive: true });
  }
}
const meats = [];
function dropMeat(x, z, big = false) {
  const m = makeMeat();
  const y = W.groundY(x, z);
  m.position.set(x, y + 0.35, z);
  if (big) m.scale.setScalar(1.6);
  scene.add(m);
  meats.push({ mesh: m, big });
}

// partiküller (kan / kar sıçraması / ısırık)
const particles = [];
function burst(p, color = 0xc81e2b, n = 12, spd = 4) {
  const geo = new THREE.SphereGeometry(0.09, 6, 5);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }));
    m.position.copy(p);
    const v = new THREE.Vector3((Math.random() - 0.5) * spd, Math.random() * spd, (Math.random() - 0.5) * spd);
    scene.add(m);
    particles.push({ mesh: m, vel: v, life: 0.7 });
  }
}

// ---------- GİRİŞLER ----------
const promptEl = document.getElementById('prompt');
let promptText = '';
function setPrompt(t) { promptText = t; promptEl.style.display = t ? 'block' : 'none'; promptEl.textContent = t; }
function toast(t, ms = 2600) {
  const w = document.getElementById('toast-wrap');
  const d = document.createElement('div');
  d.className = 'toast'; d.textContent = t;
  w.appendChild(d);
  setTimeout(() => d.remove(), ms);
}
addEventListener('keydown', e => {
  S.keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault(); // sayfa kaymasın
  const a = actionForKey(e.code);
  if (a === 'pause' && S.started && !S.dead) togglePause();
  if (a === 'bite') doBite();
  if (a === 'interact') doInteract();
  if (a === 'action') doAction();
  if (e.code === 'Escape' && S.started) togglePause(false);
});
addEventListener('keyup', e => { S.keys[e.code] = false; });
let dragging = false, lx = 0, ly = 0;
// Sol tık = pençe. Sağ tık boşta (kamera sürükleme için basılı tutulabilir).
canvas.addEventListener('mousedown', e => { dragging = true; lx = e.clientX; ly = e.clientY; audio.ensure(); if (S.started && !S.paused && actionForMouseButton(e.button) === 'claw') doClaw(); });
addEventListener('mouseup', () => dragging = false);
addEventListener('mousemove', e => {
  if (!dragging) return;
  const s = 0.0042 * (settings.sens / 100);
  S.yaw -= (e.clientX - lx) * s; S.pitch += (e.clientY - ly) * s * 0.7;
  S.pitch = Math.max(0.05, Math.min(1.1, S.pitch));
  lx = e.clientX; ly = e.clientY;
});
addEventListener('wheel', e => { S.dist = Math.max(5, Math.min(18, S.dist + e.deltaY * 0.01)); });
addEventListener('contextmenu', e => e.preventDefault());
// dokunmatik: sürükle kamera, çift dokunuş pençe
let lastTap = 0;
canvas.addEventListener('touchstart', () => { audio.ensure(); const n = Date.now(); if (n - lastTap < 320) doClaw(); lastTap = n; }, { passive: true });

// ---------- SAVAŞ ----------
let clawAnim = 0, biteAnim = 0;
function playerForward() { return new THREE.Vector3(Math.sin(S.yaw + Math.PI), 0, Math.cos(S.yaw + Math.PI)); }
function damageEnemy(e, dmg, kind) {
  if (!e.alive) return;
  e.hp -= dmg;
  e.lastHit = performance.now() / 1000; // can barını göster
  e.flash = 1; // beyaz vuruş parlaması
  showWounds(e.model.wounds, e.hp / e.maxHp);
  burst(e.model.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xc81e2b, kind === 'bite' ? 16 : 10, 5);
  // geri savrulma: vuruşun hissedilmesi için
  const away = e.model.group.position.clone().sub(player.group.position);
  away.y = 0;
  if (away.lengthSq() > 1e-6) {
    away.normalize();
    e.model.group.position.addScaledVector(away, e.boss ? 0.5 : 1.5);
    if (e.roomIndex != null) {
      const r = W.interiors[e.roomIndex];
      const c = clampToCircle(e.model.group.position.x, e.model.group.position.z, r.x, r.z, r.r);
      if (c) { e.model.group.position.x = c.x; e.model.group.position.z = c.z; }
      e.model.group.position.y = r.floorY;
    } else {
      collide(e.model.group.position, 1.0);
      e.model.group.position.y = W.groundY(e.model.group.position.x, e.model.group.position.z);
    }
  }
  audio.ensure();
  if (e.hp <= 0) {
    e.alive = false;
    scene.remove(e.model.group);
    S.kills++;
    gainXp(e.xp);
    dropMeat(e.model.group.position.x, e.model.group.position.z, e.boss);
    toast(e.boss ? '👑 ' + e.name + ' devrildi! Mağara senin. (+' + e.xp + ' XP)' : e.name + ' avlandı! Et düştü. E ile ye. (+' + e.xp + ' XP)');
    if (e.boss) { S.bossesDown++; audio.win(); document.getElementById('bossbar').classList.add('hidden'); writeSave(collectSave(S, player.group.position)); }
    if (S.bossesDown >= 2) { showEnd(true, 'İki mağaranın da hükümdarı sensin. Dişi ayı ve yavrularınla buz artık güvenli.'); }
  }
}
function faceCameraForward() {
  const fw = playerForward();
  S.facing = Math.atan2(fw.x, fw.z);
  player.group.rotation.y = S.facing;
}

// Pençe izi efekti: kameraya dönük, büyüyüp sönen 3 yay
const slashGeo = new THREE.TorusGeometry(1.5, 0.055, 8, 32, 1.15);
const slashFx = [];
function spawnSlash() {
  const fw = playerForward();
  const base = player.group.position.clone().addScaledVector(fw, 2.3);
  base.y = player.group.position.y + 1.6;
  const grp = new THREE.Group();
  grp.position.copy(base);
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(slashGeo, new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.z = 0.5 + i * 0.35;
    m.position.set((i - 1) * 0.25, (1 - i) * 0.3, -i * 0.15);
    grp.add(m);
  }
  scene.add(grp);
  slashFx.push({ grp, life: 0.3, max: 0.3 });
}
function hitEnemies(dmg, range, arc = 1.2) {
  const pp = player.group.position;
  const fw = playerForward();
  let hit = false;
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = e.model.group.position.clone().sub(pp);
    const dist = Math.hypot(d.x, d.z);
    if (dist > range) continue;
    if (inAttackArc(d.x, d.z, fw.x, fw.z, arc)) { damageEnemy(e, dmg, range > 3 ? 'claw' : 'bite'); hit = true; }
  }
  return hit;
}
const CLAW_DUR = 0.5, BITE_DUR = 0.7;
function doClaw() {
  // Hasar vuruş anında (CLAW_STRIKE_P) işler; animasyon önce kolları kaldırır.
  if (!S.started || S.paused || S.dead || S.attackCd > 0) return;
  S.attackCd = 0.5; clawAnim = 1;
  S.clawHitDone = false; S.clawFxDone = false;
  faceCameraForward();
}
function doBite() {
  // Hasar çene kapanırken (BITE_SNAP_P) işler.
  if (!S.started || S.paused || S.dead || S.biteCd > 0) return;
  S.biteCd = 0.9; biteAnim = 1;
  S.biteHitDone = false;
  faceCameraForward();
}
function gainXp(n) {
  S.xp += n;
  const need = S.level * 60;
  if (S.xp >= need) {
    S.xp -= need; S.level++;
    S.maxHp += 12; S.hp = Math.min(S.maxHp, S.hp + 30);
    S.clawDmg += 3; S.biteDmg += 5; S.power = 1 + (S.level - 1) * 0.12;
    toast('⬆ Seviye ' + S.level + '! Pençen sertleşti. Güç x' + S.power.toFixed(2));
    audio.win();
  }
  updateObjective();
}
function eatFood(heal, xp, label) {
  if (S.eatCd > 0) return;
  S.eatCd = 0.5;
  S.hp = Math.min(S.maxHp, S.hp + heal);
  S.hunger = Math.min(100, S.hunger + heal * 0.8);
  audio.eat();
  burst(player.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xd88a4a, 8, 2.5);
  gainXp(xp);
  toast(label + ' yedin. (+' + heal + ' can, +' + xp + ' XP)');
}
// İn kapısı (dışarıda, inin ağzı önü)
function denDoorPos() { return { x: W.denPos.x, z: W.denPos.z + 7 }; }
// Mağara ağzı yakınlık testi -> mağara indisi, yoksa -1
function caveMouthIndex(pp) {
  for (let i = 0; i < W.caves.length; i++) {
    const m = W.caves[i].mouth;
    if (Math.hypot(pp.x - m.x, pp.z - m.z) < 9) return i;
  }
  return -1;
}
function enterInterior(i) {
  const room = W.interiors[i];
  S.outsidePos = player.group.position.clone();
  S.inside = { type: room.id, index: i, room };
  player.group.position.set(room.x, room.floorY, room.z + room.r * 0.4);
  // kamera arkanda, yüzün oda merkezine dönük
  S.yaw = Math.atan2(player.group.position.x - room.x, player.group.position.z - room.z);
  S.facing = Math.atan2(room.x - player.group.position.x, room.z - player.group.position.z);
  audio.ensure();
  toast(room.id === 'den' ? '🛖 İnindesin. F ile uyu, E ile dışarı çık.' : '🕳 ' + room.name + 'ndesin! ' + room.boss + ' burada hüküm sürüyor… E ile kaçabilirsin.');
}
function exitInterior() {
  if (!S.inside) return;
  player.group.position.copy(S.outsidePos);
  S.outsidePos = null;
  S.inside = null;
  player.group.position.y = W.groundY(player.group.position.x, player.group.position.z);
  toast('Dışarı çıktın. Buz seni bekliyor.');
}
function tryEatMeat(pp) {
  for (let i = meats.length - 1; i >= 0; i--) {
    if (meats[i].mesh.position.distanceTo(pp) < 3) {
      const big = meats[i].big;
      scene.remove(meats[i].mesh); meats.splice(i, 1);
      eatFood(big ? 45 : 25, big ? 40 : 20, big ? 'Boss eti' : 'Et');
      return true;
    }
  }
  return false;
}
function doInteract() {
  if (!S.started || S.paused || S.dead) return;
  const pp = player.group.position;
  // içerideyken E: yakında et varsa ye, yoksa dışarı çık
  if (S.inside) {
    if (resolveInsideE(meats.some(m => m.mesh.position.distanceTo(pp) < 3)) === 'eat') { tryEatMeat(pp); return; }
    exitInterior(); return;
  }
  // in / mağara girişi (E ile girilir)
  const dd = denDoorPos();
  if (Math.hypot(pp.x - dd.x, pp.z - dd.z) < 7) { enterInterior(0); return; }
  const ci = caveMouthIndex(pp);
  if (ci >= 0) { enterInterior(1 + ci); return; }
  // yerde et
  if (tryEatMeat(pp)) return;
  // balık tutma
  for (const w of W.waters) {
    const d = Math.hypot(pp.x - w.x, pp.z - w.z);
    if (d < w.r + 2.5) {
      const f = fishes.find(f => f.alive && f.mesh.position.distanceTo(pp) < 4.5);
      if (f) {
        f.alive = false; scene.remove(f.mesh);
        S.fish++;
        audio.splash(); audio.eat();
        eatFood(18, 15, 'Taze balık');
        document.getElementById('fish-count').textContent = '🐟 ' + S.fish;
        setTimeout(() => respawnFish(w), 12000);
      } else toast('Balığa biraz daha yaklaş… su kenarında bekle.');
      return;
    }
  }
  // dişi ayı ile etkileşim
  if (female.group.position.distanceTo(pp) < 4) {
    S.hp = Math.min(S.maxHp, S.hp + 10);
    toast('Dişi ayı seni karşıladı. Moral +10 can. “Mağaralara dikkat et…”');
    audio.sleep();
  }
}
function respawnFish(w) {
  const f = makeFish();
  f.position.set(w.x + (Math.random() - 0.5) * w.r, w.y - 0.45, w.z + (Math.random() - 0.5) * w.r);
  scene.add(f);
  fishes.push({ mesh: f, water: w, t: 0, alive: true });
}
function doAction() {
  // F = uyu (inde: dış kapıda ya da iç odada). Mağaraya giriş E ile.
  if (!S.started || S.paused || S.dead) return;
  const pp = player.group.position;
  if (S.inside) {
    if (S.inside.type === 'den') sleep();
    return;
  }
  if (pp.distanceTo(W.denPos) < 9) { sleep(); return; }
}
function sleep() {
  const evening = S.time > 17 || S.time < 6;
  S.time = 7.5; S.day++;
  S.hp = S.maxHp; S.hunger = Math.max(S.hunger, 70);
  writeSave(collectSave(S, player.group.position)); // uyku = kayıt noktası
  setWoundLevel(player, 1);
  audio.sleep();
  toast(evening ? '🌙 İninde derin bir uyku… Sabah dinç uyandın. Yaraların kapandı.' : '☀ Kısa bir kestirme… Canın doldu. (Akşam uyursan gün ilerler)');
  updateObjective();
}

// ---------- MENÜLER ----------
const $ = id => document.getElementById(id);
function show(id, on) { $(id).classList.toggle('show', on); }
function updateObjective() {
  const o = $('objective');
  if (S.bossesDown >= 2) o.textContent = 'Efsane tamamlandı — buzun hükümdarısın!';
  else if (S.fish < 2) o.textContent = 'İnce buzda balık yakala (mavi göletlere git, E)';
  else if (S.kills < 2) o.textContent = 'Kurtlara karşı pençeni dene (Sol tık pençe, Space ısırma)';
  else if (S.bossesDown < 1) o.textContent = 'Gizemli mağaraları bul: Fısıltı Mağarası ve Dev Mors İni (E ile gir, boss içeride)';
  else o.textContent = 'Son boss: diğer mağarayı fethet. Akşam ininde uyumayı unutma.';
}
function togglePause(force) {
  if (!S.started || S.dead) return;
  S.paused = force !== undefined ? force : !S.paused;
  show('pause', S.paused);
}
function refreshMenu() {
  show('menu', true);
  $('btn-continue').classList.toggle('hidden', !hasSave());
}
function showEnd(win, text) {
  if (!win) clearSave(); // ölüm kaydı siler, devam taze başlar
  else writeSave(collectSave(S, player.group.position));
  S.dead = true;
  $('end-title').textContent = win ? 'Kutup Hükümdarı Oldun!' : 'Yere Yığıldın';
  $('end-text').textContent = text + ' (' + S.day + '. gün, ' + S.kills + ' av, Sv ' + S.level + ')';
  show('end', true);
}
function startGame(useSave) {
  audio.ensure();
  if (useSave) {
    const sv = loadSave();
    if (sv) {
      applySave(S, sv);
      // kayıt bir iç odadaysa orada devam et (çıkış iniş kapısına döner)
      const ri = W.interiors.findIndex(r => Math.hypot((S.px ?? -8) - r.x, (S.pz ?? 44) - r.z) < r.r + 2);
      if (ri >= 0) {
        const room = W.interiors[ri];
        S.inside = { type: room.id, index: ri, room };
        S.outsidePos = new THREE.Vector3(W.denPos.x, 0, W.denPos.z + 8);
        S.outsidePos.y = W.groundY(S.outsidePos.x, S.outsidePos.z);
        player.group.position.set(S.px, room.floorY, S.pz);
      } else {
        player.group.position.set(S.px ?? -8, 0, S.pz ?? 44);
        player.group.position.y = W.groundY(player.group.position.x, player.group.position.z);
      }
      setWoundLevel(player, S.hp / S.maxHp);
      document.getElementById('fish-count').textContent = '🐟 ' + S.fish;
      toast('Kaldığın yerden devam: ' + S.day + '. gün, Sv ' + S.level + '.');
    }
  } else clearSave();
  show('menu', false); show('loader', false);
  S.started = true;
  $('hud').classList.remove('hidden');
  if (!useSave) toast('Ailen seni bekliyor. Önce gölette balık ye, güçlen.');
  updateObjective();
}
$('btn-start').onclick = () => startGame(false);
$('btn-continue').onclick = () => startGame(true);
$('btn-how').onclick = () => show('howto', true);
$('btn-how-back').onclick = () => show('howto', false);
$('btn-settings').onclick = () => show('settings', true);
$('btn-settings-back').onclick = () => {
  settings.quality = $('set-quality').value; settings.snow = +$('set-snow').value;
  settings.sound = +$('set-sound').value; settings.sens = +$('set-sens').value;
  localStorage.setItem('kh-settings', JSON.stringify(settings));
  audio.setVol(settings.sound / 100);
  show('settings', false);
  toast('Ayarlar kaydedildi.');
};
$('btn-resume').onclick = () => togglePause(false);
$('btn-quit').onclick = () => { togglePause(false); S.started = false; $('hud').classList.add('hidden'); show('pause', false); writeSave(collectSave(S, player.group.position)); refreshMenu(); };
$('btn-again').onclick = () => location.reload();
$('btn-end-menu').onclick = () => location.reload();

// ---------- GÜN DÖNGÜSÜ ----------
function updateDayCycle(dt) {
  S.time += dt * S.timeSpeed / 60 * 24; // ~2.5 dk = 1 gün
  if (S.time >= 24) { S.time -= 24; S.day++; S.sleptToday = false; toast('🌅 ' + S.day + '. gün. Karnını doyur, güçlen.'); }
  const t = S.time;
  const sunA = ((t - 6) / 12) * Math.PI; // 6:00 doğu, 18:00 batı
  const elev = Math.sin(sunA);
  const az = Math.cos(sunA);
  W.sun.position.set(az * 120, Math.max(elev, -0.25) * 140, 40);
  const dayF = Math.max(0, Math.min(1, elev * 1.6 + 0.15));
  const duskF = Math.max(0, 1 - Math.abs(elev) * 3.2) * (t > 5 && t < 20 ? 1 : 0);
  W.sun.intensity = 0.08 + dayF * 1.55;
  W.sun.color.setHSL(0.1, 0.5 * duskF + 0.08, 0.75 + dayF * 0.2 - duskF * 0.12);
  W.moon.intensity = (1 - dayF) * 0.5;
  W.hemi.intensity = 0.18 + dayF * 0.6;
  const night = 1 - dayF;
  W.stars.material.opacity = night * 0.9;
  W.aurora.uniforms.alpha.value = night * 0.85;
  W.aurora.uniforms.t.value += dt * 0.6;
  W.denLamp.intensity = night * 2.2 + duskF;
  // gökyüzü renkleri
  const top = W.skyMat.uniforms.top.value, bot = W.skyMat.uniforms.bot.value;
  top.setHSL(0.58, 0.5, 0.08 + dayF * 0.28 + duskF * 0.08);
  bot.setHSL(duskF > 0.4 ? 0.05 : 0.55, duskF > 0.4 ? 0.55 : 0.35, 0.12 + dayF * 0.62 + duskF * 0.12);
  W.skyMat.uniforms.sunDir.value.copy(W.sun.position).normalize();
  scene.fog.color.copy(bot);
  renderer.setClearColor(bot);
  // saat
  const hh = String(Math.floor(S.time)).padStart(2, '0'), mm = String(Math.floor((S.time % 1) * 60)).padStart(2, '0');
  const icon = (t < 5 || t > 19) ? '🌙' : (t > 17 ? '🌇' : '☀');
  $('clock').textContent = icon + ' ' + hh + ':' + mm + ' • ' + S.day + '. Gün';
  return { dayF, night, duskF };
}

// ---------- HAREKET + YAPAY ZEKA + DÖNGÜ ----------
function collide(p, r = 1.2) {
  for (const c of W.colliders) {
    const dx = p.x - c.x, dz = p.z - c.z;
    const d = Math.hypot(dx, dz);
    if (d < c.r + r && d > 0.001) {
      const push = (c.r + r - d);
      p.x += (dx / d) * push; p.z += (dz / d) * push;
    }
  }
  const lim = 150;
  p.x = Math.max(-lim, Math.min(lim, p.x));
  p.z = Math.max(-lim, Math.min(lim, p.z));
}
// Oyuncuyu zemine oturt: iç odadaysa oda tabanı, yoksa arazi/su.
function snapPlayerToGround(moving) {
  const p = player.group.position;
  if (S.inside) { p.y = S.inside.room.floorY; return; }
  collide(p);
  p.y = W.groundY(p.x, p.z);
  for (const w of W.waters) {
    if (Math.hypot(p.x - w.x, p.z - w.z) < w.r) {
      p.y = w.y - 0.25;
      if (moving && Math.random() < 0.1) burst(p.clone(), 0xbfe9f5, 2, 2);
      break;
    }
  }
}
// Temaslı ayrışma: kimse kimsenin içine girmez, temas eder.
function separateEntities() {
  const P = player.group.position;
  for (let iter = 0; iter < 2; iter++) {
    for (const e of enemies) {
      if (!e.alive) continue;
      const ep = e.model.group.position;
      const d = separationDelta(P.x, P.z, ep.x, ep.z, 1.1 + e.radius - 0.35, 0.7);
      if (d) { P.x += d.ax; P.z += d.az; ep.x += d.bx; ep.z += d.bz; }
    }
    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        const a = enemies[i], b = enemies[j];
        if (!a.alive || !b.alive) continue;
        const ap = a.model.group.position, bp = b.model.group.position;
        const d = separationDelta(ap.x, ap.z, bp.x, bp.z, a.radius + b.radius - 0.35, 0.5);
        if (d) { ap.x += d.ax; ap.z += d.az; bp.x += d.bx; bp.z += d.bz; }
      }
    }
    // penguenler ve dişi ayı yol verir (oyuncu ağır basar)
    if (!S.inside) {
      for (const pg of penguins) {
        const mp = pg.mesh.position;
        const d = separationDelta(P.x, P.z, mp.x, mp.z, 1.1 + 0.5 - 0.3, 1);
        if (d) { mp.x += d.bx; mp.z += d.bz; }
      }
      const fp = female.group.position;
      const df = separationDelta(P.x, P.z, fp.x, fp.z, 1.1 + 0.9 - 0.35, 1);
      if (df) { fp.x += df.bx; fp.z += df.bz; }
    }
  }
  // oda duvarları: içeridekiler odada kalır
  if (S.inside) {
    const r = S.inside.room;
    const c = clampToCircle(P.x, P.z, r.x, r.z, r.r);
    if (c) { P.x = c.x; P.z = c.z; }
  }
  for (const e of enemies) {
    if (!e.alive || e.roomIndex == null) continue;
    const r = W.interiors[e.roomIndex];
    const c = clampToCircle(e.model.group.position.x, e.model.group.position.z, r.x, r.z, r.r);
    if (c) { e.model.group.position.x = c.x; e.model.group.position.z = c.z; }
  }
}
const clock = new THREE.Clock();
let elapsed = 0, loadP = 0, saveTimer = 0;
function updateHUD() {
  $('hp').style.width = (100 * S.hp / S.maxHp) + '%';
  $('hp-t').textContent = Math.ceil(S.hp) + '/' + S.maxHp;
  $('hunger').style.width = S.hunger + '%';
  $('hunger-t').textContent = Math.ceil(S.hunger);
  $('xp').style.width = (100 * S.xp / (S.level * 60)) + '%';
  $('lvl-t').textContent = 'Sv ' + S.level;
  $('power').textContent = 'Pençe ' + Math.round(S.clawDmg * S.power) + ' • Isırma ' + Math.round(S.biteDmg * S.power) + ' • Güç x' + S.power.toFixed(2);
  const dirs = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
  $('compass').textContent = dirs[Math.round(((-S.yaw) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) % 8];
}
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  if (loadP < 100) {
    loadP = Math.min(100, loadP + dt * 40);
    $('loadfill').style.width = loadP + '%';
    if (loadP >= 100) { show('loader', false); refreshMenu(); }
    else $('loadtext').textContent = loadP < 40 ? 'Buzullar şekilleniyor…' : loadP < 75 ? 'Ayılar uyanıyor…' : 'Rüzgar bekleniyor…';
  }
  const cyc = updateDayCycle(S.started && !S.paused ? dt : 0);
  // kar
  {
    const pos = W.snow.geometry.attributes.position;
    const fall = dt * (4 + settings.snow * 0.08);
    const cx = player.group.position.x, cz = player.group.position.z;
    for (let i = 0; i < W.snowCount; i += 2) {
      let y = pos.getY(i) - fall * (0.6 + (i % 5) * 0.15);
      if (y < 0) { y = 55; pos.setX(i, cx + (Math.random() - 0.5) * 200); pos.setZ(i, cz + (Math.random() - 0.5) * 200); }
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(elapsed + i) * dt * 1.2);
    }
    pos.needsUpdate = true;
    W.snow.visible = settings.snow > 2;
  }
  W.denFlag.rotation.y = Math.sin(elapsed * 2) * 0.3;

  if (S.started && !S.paused && !S.dead) {
    saveTimer += dt;
    if (saveTimer > 10) { saveTimer = 0; writeSave(collectSave(S, player.group.position)); }
    // --- oyuncu hareketi ---
    S.attackCd = Math.max(0, S.attackCd - dt);
    S.biteCd = Math.max(0, S.biteCd - dt);
    S.hurtCd = Math.max(0, S.hurtCd - dt);
    S.eatCd = Math.max(0, S.eatCd - dt);
    clawAnim = Math.max(0, clawAnim - dt / CLAW_DUR);
    biteAnim = Math.max(0, biteAnim - dt / BITE_DUR);
    const run = S.keys.ShiftLeft || S.keys.ShiftRight;
    const sp = (run ? 9.5 : 5.2) * (S.hunger < 20 ? 0.7 : 1);
    let mx = 0, mz = 0;
    if (S.keys.KeyW || S.keys.ArrowUp) mz -= 1;
    if (S.keys.KeyS || S.keys.ArrowDown) mz += 1;
    if (S.keys.KeyA || S.keys.ArrowLeft) mx -= 1;
    if (S.keys.KeyD || S.keys.ArrowRight) mx += 1;
    const moving = (mx !== 0 || mz !== 0);
    if (moving) {
      const len = Math.hypot(mx, mz); mx /= len; mz /= len;
      // Kamera-göreli: W kameranın baktığı yöne (kameradan uzağa) götürür.
      const wv = moveVector(mx, mz, S.yaw);
      player.group.position.x += wv.x * sp * dt;
      player.group.position.z += wv.z * sp * dt;
      S.facing = Math.atan2(wv.x, wv.z);
      S.hunger = Math.max(0, S.hunger - dt * (run ? 1.1 : 0.45));
      if (S.hunger <= 0) { S.hp -= dt * 2; setWoundLevel(player, S.hp / S.maxHp); }
    }
    snapPlayerToGround(moving);
    animateBear(player, elapsed, moving, run);
    // --- saldırı pozları (tek pençe + ısırma) ---
    let twist = 0, rear = 0, lean = 0;
    if (clawAnim > 0) {
      const p = 1 - clawAnim;
      const pose = clawPose(p);
      // SAĞ ön pati vurur, sol bacak desteklenir
      player.legs[1].rotation.x = player.legs[1].rotation.x * 0.15 + pose.pawRX;
      player.legs[1].rotation.z = pose.pawRZ;
      player.legs[0].rotation.x += pose.braceRX;
      twist = pose.twist; rear = pose.rear; lean = pose.lean;
      player.head.rotation.x += pose.headRX;
      if (!S.clawFxDone && p >= 0.35) { S.clawFxDone = true; spawnSlash(); }
      if (!S.clawHitDone && p >= CLAW_STRIKE_P) {
        S.clawHitDone = true;
        audio.claw();
        hitEnemies(S.clawDmg * S.power, 3.6, 1.3);
        burst(player.group.position.clone().add(playerForward().multiplyScalar(2)).add(new THREE.Vector3(0, 1.2, 0)), 0xffffff, 6, 2.5);
      }
      if (p > 0.35 && p < 0.65) player.group.position.addScaledVector(playerForward(), 2.2 * dt);
    } else {
      player.legs[1].rotation.z *= 0.8;
    }
    if (biteAnim > 0) {
      const p = 1 - biteAnim;
      const pose = bitePose(p);
      // kafa gömülür, çene açılıp kapanır, vücut atılır
      player.head.rotation.x += pose.headRX;
      player.head.position.y = player.head.userData.basePos.y + pose.headDrop;
      player.head.position.z = player.head.userData.basePos.z + pose.headThrust;
      player.jaw.rotation.x = pose.jaw;
      player.jaw.position.y = player.jaw.userData.basePos.y - pose.jaw * 0.18;
      if (pose.lunge > 0) player.group.position.addScaledVector(playerForward(), pose.lunge * 4.5 * dt);
      if (!S.biteHitDone && p >= BITE_SNAP_P) {
        S.biteHitDone = true;
        audio.bite();
        const hit = hitEnemies(S.biteDmg * S.power, 2.6, 0.9);
        if (hit) burst(player.group.position.clone().add(playerForward().multiplyScalar(1.8)).add(new THREE.Vector3(0, 1.6, 0)), 0xffffff, 6, 3);
      }
    } else {
      player.jaw.rotation.x *= 0.8;
      player.head.position.copy(player.head.userData.basePos);
      player.jaw.position.copy(player.jaw.userData.basePos);
    }
    // saldırı adımı sonrası zemine yeniden oturt
    snapPlayerToGround(moving);
    // gövde kompozisyonu: bakış yönü + vuruş bükülmesi
    player.group.rotation.y = S.facing + twist;
    player.group.rotation.x = rear;
    player.group.rotation.z = lean;

    // dişi ayı: ini bekler, oyuncuya bakar
    female.group.position.y = W.groundY(female.group.position.x, female.group.position.z);
    female.group.lookAt(player.group.position.x, female.group.position.y, player.group.position.z);
    animateBear(female, elapsed + 2, false, false);

    // penguenler: suda-kar arası gezinir
    for (const p of penguins) {
      p.t += dt;
      p.dir += Math.sin(p.t * 0.6) * dt * 0.8;
      const dPlayer = p.mesh.position.distanceTo(player.group.position);
      if (dPlayer < 5) p.dir = Math.atan2(p.mesh.position.x - player.group.position.x, p.mesh.position.z - player.group.position.z);
      p.mesh.position.x += Math.sin(p.dir) * dt * 1.4;
      p.mesh.position.z += Math.cos(p.dir) * dt * 1.4;
      if (p.mesh.position.length() > 120) p.dir += Math.PI * dt;
      collide(p.mesh.position, 0.4);
      p.mesh.position.y = W.groundY(p.mesh.position.x, p.mesh.position.z);
      p.mesh.rotation.y = p.dir;
      p.mesh.position.y += Math.abs(Math.sin(p.t * 6)) * 0.08;
      p.mesh.rotation.z = Math.sin(p.t * 6) * 0.08;
    }
    // balıklar yüzer
    for (const f of fishes) {
      if (!f.alive) continue;
      f.t += dt;
      f.mesh.position.x += Math.sin(f.t * 1.3) * dt * 0.9;
      f.mesh.position.z += Math.cos(f.t * 1.1) * dt * 0.9;
      const dx = f.mesh.position.x - f.water.x, dz = f.mesh.position.z - f.water.z;
      const dd = Math.hypot(dx, dz);
      if (dd > f.water.r * 0.7) { f.mesh.position.x -= dx / dd * dt * 2; f.mesh.position.z -= dz / dd * dt * 2; }
      f.mesh.rotation.y = Math.atan2(Math.sin(f.t * 1.3), Math.cos(f.t * 1.1));
      f.mesh.position.y = f.water.y - 0.45 + Math.sin(f.t * 3) * 0.08;
    }
    // düşman yapay zekası
    let bossNear = null;
    const nowSec = performance.now() / 1000;
    for (const e of enemies) {
      if (!e.alive) continue;
      const ep = e.model.group.position, pp = player.group.position;
      const dist = ep.distanceTo(pp);
      const nightBoost = cyc.night * 0.5 + 1;
      const aggroR = (e.boss ? 26 : 15) * nightBoost;
      e.wander += dt;
      e.atkCd -= dt;
      let mvx = 0, mvz = 0, spd = e.speed;
      if (dist < aggroR) {
        mvx = (pp.x - ep.x) / (dist || 1); mvz = (pp.z - ep.z) / (dist || 1);
        spd *= e.boss ? 1.0 : 1.15;
        if (e.boss && dist < 30) bossNear = e;
        if (dist < e.range && e.atkCd <= 0 && S.hurtCd <= 0) {
          e.atkCd = e.boss ? 1.4 : 1.8;
          e.lastHit = nowSec; // saldıran düşmanın can barını göster
          e.lunge = 1; // üzerine atılma
          S.hp -= e.dmg * (cyc.night > 0.6 ? 1.25 : 1);
          S.hurtCd = 0.6;
          setWoundLevel(player, S.hp / S.maxHp);
          burst(pp.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xc81e2b, 12, 4);
          audio.hurt();
          toast('🩸 ' + e.name + ' saldırdı! (-' + Math.round(e.dmg) + ' can)');
          if (S.hp <= 0) { S.hp = 0; showEnd(false, 'Buz seni aldı. Daha çok ye, seviyeni yükselt ve tekrar dene.'); }
        }
      } else {
        // evden uzaklaşıldıysa geri dön (morslar göletlerinde kalır)
        const hd = homeDirection(ep.x, ep.z, e.home.x, e.home.z, 14);
        if (hd) { mvx = hd.x; mvz = hd.z; spd *= 0.5; }
        else { mvx = Math.sin(e.wander * 0.5); mvz = Math.cos(e.wander * 0.5); spd *= 0.3; }
      }
      ep.x += mvx * spd * dt; ep.z += mvz * spd * dt;
      if (e.lunge > 0) {
        // avına atılma: kısa, hızlı ileri hamle
        e.lunge = Math.max(0, e.lunge - dt * 3);
        ep.x += mvx * 4 * dt * e.lunge; ep.z += mvz * 4 * dt * e.lunge;
      }
      if (e.roomIndex != null) {
        // oda sakini: arenasında kalır, taban düzdür
        const r = W.interiors[e.roomIndex];
        const c = clampToCircle(ep.x, ep.z, r.x, r.z, r.r);
        if (c) { ep.x = c.x; ep.z = c.z; }
        ep.y = r.floorY;
      } else {
        collide(ep, 1.0);
        ep.y = W.groundY(ep.x, ep.z);
      }
      if (mvx || mvz) e.model.group.rotation.y = Math.atan2(mvx, mvz);
      // bacak animasyonu
      if (e.model.legs.length) e.model.legs.forEach((l, i) => { l.rotation.x = Math.sin(elapsed * 9 + i * Math.PI) * 0.5; });
      if (e.model.head) e.model.head.lookAt(pp.x, ep.y + 1, pp.z);
      // can barı: hasarlıyken ve yakınken görünür
      e.bar.set(e.hp / e.maxHp);
      e.bar.group.visible = e.hp < e.maxHp && (nowSec - e.lastHit < 6 || dist < aggroR + 2);
      // vuruş parlaması
      if (e.flash > 0) {
        e.flash = Math.max(0, e.flash - dt * 3.5);
        for (const m of e.mats) { m.emissive.setHex(0xffffff); m.emissiveIntensity = e.flash * 0.55; }
      }
    }
    // temas: kimse kimsenin içine girmez
    separateEntities();
    snapPlayerToGround(moving);
    if (bossNear) {
      $('bossbar').classList.remove('hidden');
      $('bossname').textContent = '👑 ' + bossNear.name;
      $('bosshp').style.width = (100 * Math.max(0, bossNear.hp) / bossNear.maxHp) + '%';
    } else if (!enemies.some(e => e.alive && e.boss && e.model.group.position.distanceTo(player.group.position) < 30)) {
      $('bossbar').classList.add('hidden');
    }

    // partiküller
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.vel.y -= 9 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.material.opacity = Math.max(0, p.life / 0.7);
      if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    }
    // pençe izleri: kameraya dönük büyür ve söner
    for (let i = slashFx.length - 1; i >= 0; i--) {
      const f = slashFx[i];
      f.life -= dt;
      f.grp.quaternion.copy(camera.quaternion);
      const k = 1 - Math.max(0, f.life) / f.max;
      f.grp.scale.setScalar(0.7 + k * 0.7);
      for (const m of f.grp.children) m.material.opacity = 0.85 * Math.max(0, f.life / f.max);
      if (f.life <= 0) {
        scene.remove(f.grp);
        for (const m of f.grp.children) m.material.dispose();
        slashFx.splice(i, 1);
      }
    }

    // bağlam ipuçları
    const pp = player.group.position;
    if (S.inside?.type === 'den') setPrompt('[E] Ye / dışarı çık • [F] Uyu (can dolar, kayıt alınır)');
    else if (S.inside) {
      const rm = S.inside.room;
      setPrompt('[E] Ye / dışarı çık' + (rm.boss ? ' — dikkat, ' + rm.boss + ' burada!' : ''));
    }
    else {
      const dd = denDoorPos();
      const ci = caveMouthIndex(pp);
      if (Math.hypot(pp.x - dd.x, pp.z - dd.z) < 7) setPrompt('[E] İne gir' + (pp.distanceTo(W.denPos) < 9 ? ' • [F] Burada uyu' : ''));
      else if (ci >= 0) setPrompt('[E] ' + W.caves[ci].name + 'ne gir — boss ' + W.caves[ci].boss + ' içeride!');
      else if (W.waters.some(w => Math.hypot(pp.x - w.x, pp.z - w.z) < w.r + 2.5)) setPrompt('[E] Balık yakala — suya yaklaş, balığı bekle');
      else if (meats.some(m => m.mesh.position.distanceTo(pp) < 3.5)) setPrompt('[E] Eti ye — güçlen');
      else if (female.group.position.distanceTo(pp) < 4.5) setPrompt('[E] Dişi ayıyla konuş');
      else if (enemies.some(e => e.alive && e.model.group.position.distanceTo(pp) < 6)) setPrompt('Sol tık: Pençe • Space / V: Isırma');
      else setPrompt('');
    }
    updateHUD();
    // pusula hedefi: en yakın ilgi noktası
    void cyc;
  }

  // --- kamera ---
  {
    const p = player.group.position;
    // iç odada kamera duvar dışına taşmasın
    const effDist = S.inside ? Math.min(S.dist, S.inside.room.r * 0.65) : S.dist;
    const cx = p.x + Math.sin(S.yaw) * Math.cos(S.pitch) * effDist;
    const cz = p.z + Math.cos(S.yaw) * Math.cos(S.pitch) * effDist;
    const cy = p.y + 2 + Math.sin(S.pitch) * effDist;
    camera.position.lerp(new THREE.Vector3(cx, Math.max(cy, p.y - 3), cz), 0.12);
    camera.lookAt(p.x, p.y + 1.8, p.z);
    // gök kubbe iç alanlara ışınlanınca da üstümüzde dursun
    W.skyMesh.position.copy(camera.position);
    W.stars.position.copy(camera.position);
    W.moonMesh.position.set(camera.position.x - 260, camera.position.y + 240, camera.position.z - 240);
    W.auroraMesh.position.set(camera.position.x, camera.position.y + 190, camera.position.z - 320);
  }
  renderer.render(scene, camera);
}
show('loader', true);
updateObjective();
animate();



