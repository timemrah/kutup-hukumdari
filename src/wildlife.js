import * as THREE from 'three';
import { setWoundLevel } from './bears.js';

export function makePenguin() {
  const g = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.7 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf6fafc, roughness: 0.8 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xe8932e, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 14), black);
  body.scale.set(1, 1.35, 0.95); body.position.y = 0.68;
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), white);
  belly.scale.set(0.85, 1.15, 0.6); belly.position.set(0, 0.62, 0.22);
  g.add(belly);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), black);
  head.position.y = 1.5; g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 8), orange);
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 1.48, 0.36); g.add(beak);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeM);
    e.position.set(sx * 0.13, 1.58, 0.24); g.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    p.position.set(sx * 0.13, 1.58, 0.29); g.add(p);
    const flip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), black);
    flip.scale.set(0.4, 1.4, 0.7); flip.position.set(sx * 0.52, 0.75, 0); flip.rotation.z = sx * -0.25;
    g.add(flip);
  }
  for (const sx of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.3), orange);
    f.position.set(sx * 0.15, 0.05, 0.05); g.add(f);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function makeWolf({ alpha = false } = {}) {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: alpha ? 0x3a3f4a : 0x8b93a0, roughness: 0.95 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c313b, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 1.7), fur);
  body.position.y = 0.85; g.add(body);
  const headG = new THREE.Group(); headG.position.set(0, 1.25, 0.95);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.6), fur); headG.add(skull);
  const sn = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.45), dark); sn.position.set(0, -0.08, 0.45); headG.add(sn);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4), dark);
    ear.position.set(sx * 0.2, 0.38, -0.05); headG.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ color: alpha ? 0xff3b3b : 0xffd34d }));
    eye.position.set(sx * 0.16, 0.08, 0.3); headG.add(eye);
  }
  g.add(headG);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.9), dark);
  tail.rotation.x = 1.1; tail.position.set(0, 1.0, -1.1); g.add(tail);
  const legs = [];
  for (const [lx, lz] of [[-0.25, 0.6], [0.25, 0.6], [-0.25, -0.6], [0.25, -0.6]]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.8), dark);
    l.position.set(lx, 0.4, lz); g.add(l); legs.push(l);
  }
  if (alpha) g.scale.setScalar(1.5);
  const wounds = [];
  const wm = new THREE.MeshBasicMaterial({ color: 0xc81e2b });
  for (let i = 0; i < 3; i++) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), wm.clone());
    w.position.set((Math.random() - 0.5), 1.0, (Math.random() - 0.5) * 1.4);
    w.visible = false; g.add(w); wounds.push(w);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group: g, head: headG, legs, wounds };
}

export function makeFox() {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0xf2f5f7, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), fur);
  body.scale.set(1, 0.85, 1.5); body.position.y = 0.55; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), fur);
  head.position.set(0, 0.85, 0.7); g.add(head);
  const sn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0x222a33 }));
  sn.rotation.x = Math.PI / 2; sn.position.set(0, 0.78, 1.0); g.add(sn);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 4), fur);
    ear.position.set(sx * 0.16, 1.12, 0.62); g.add(ear);
  }
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), fur);
  tail.scale.set(1, 1, 1.8); tail.position.set(0, 0.6, -0.85); g.add(tail);
  const legs = [];
  for (const [lx, lz] of [[-0.2, 0.4], [0.2, 0.4], [-0.2, -0.4], [0.2, -0.4]]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.45), fur);
    l.position.set(lx, 0.22, lz); g.add(l); legs.push(l);
  }
  const wounds = [];
  for (let i = 0; i < 2; i++) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xc81e2b }));
    w.visible = false; w.position.set(0, 0.6, 0); g.add(w); wounds.push(w);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group: g, head, legs, wounds };
}

export function makeWalrus({ boss = false } = {}) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: boss ? 0x6b4a3a : 0x9a7d68, roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(boss ? 1.7 : 1.1, 20, 14), skin);
  body.scale.set(1, 0.85, 1.5); body.position.y = boss ? 1.5 : 1.0; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(boss ? 0.85 : 0.55, 16, 12), skin);
  head.position.set(0, boss ? 1.9 : 1.25, boss ? 2.3 : 1.5); g.add(head);
  const tuskM = new THREE.MeshStandardMaterial({ color: 0xf5efdd, roughness: 0.35 });
  for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, boss ? 1.2 : 0.8), tuskM);
    t.position.set(sx * 0.25, boss ? 1.1 : 0.7, boss ? 2.6 : 1.75); g.add(t);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin);
    f.scale.set(1, 0.4, 1.4); f.position.set(sx * 0.8, 0.35, 0.6); g.add(f);
  }
  const wounds = [];
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xc81e2b }));
    w.visible = false; w.position.set((Math.random() - 0.5) * 2, 1.6, (Math.random() - 0.5) * 2);
    g.add(w); wounds.push(w);
  }
  if (boss) g.scale.setScalar(1.35);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group: g, head, legs: [], wounds };
}

export function makeFish() {
  const g = new THREE.Group();
  const cols = [0x7fb8d4, 0x9fd48a, 0xd4a27f];
  const c = cols[Math.floor(Math.random() * cols.length)];
  const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.3 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), m);
  b.scale.set(0.7, 0.8, 1.6); g.add(b);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 6), m);
  tail.rotation.x = -Math.PI / 2; tail.position.z = -0.6; g.add(tail);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshBasicMaterial({ color: 0x111111 }));
  eye.position.set(0.15, 0.08, 0.3); g.add(eye);
  const eye2 = eye.clone(); eye2.position.x = -0.15; g.add(eye2);
  return g;
}

export function makeMeat() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), new THREE.MeshStandardMaterial({ color: 0xb03a3a, roughness: 0.7 }));
  m.scale.set(1, 0.7, 1.2); g.add(m);
  const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7), new THREE.MeshStandardMaterial({ color: 0xf2ead8 }));
  bone.rotation.z = Math.PI / 2; bone.position.set(0.5, 0.05, 0); g.add(bone);
  return g;
}

export function showWounds(list, frac) {
  const show = frac > 0.7 ? 0 : frac > 0.45 ? 1 : frac > 0.25 ? 2 : list.length;
  list.forEach((w, i) => { w.visible = i < show; });
}

// Yüzen can barı: sprite'lar kameraya her zaman dönüktür, ek güncelleme gerekmez.
// fg.center=(0,0.5) sayesinde bar soldan kısalır.
export function makeHpBar(w = 1.6, color = 0xe5484d) {
  const g = new THREE.Group();
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x10161c, transparent: true, opacity: 0.72, depthTest: false }));
  bg.scale.set(w, 0.18, 1);
  bg.renderOrder = 20;
  g.add(bg);
  const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color, transparent: true, opacity: 0.95, depthTest: false }));
  fg.center.set(0, 0.5);
  fg.position.set(-w / 2, 0, 0);
  fg.scale.set(w, 0.12, 1);
  fg.renderOrder = 21;
  g.add(fg);
  g.visible = false;
  return {
    group: g,
    set(frac) {
      const f = Math.max(0, Math.min(1, frac));
      fg.scale.x = Math.max(0.001, w * f);
    }
  };
}
