import * as THREE from 'three';

// Detaylı kutup ayısı: gövde, kafa, burun, kulak, pençeler, kuyruk, kürk hissi
export function makePolarBear({ female = false, scale = 1 } = {}) {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ'; // önce gövde pitch/roll, sonra yön: şahlanma doğal olur
  const s = female ? 0.82 * scale : 1.0 * scale;
  const fur = new THREE.MeshStandardMaterial({ color: female ? 0xf6f1e6 : 0xf4f8fa, roughness: 0.95 });
  const furDark = new THREE.MeshStandardMaterial({ color: 0xe2ebf1, roughness: 0.95 });
  const noseMat = new THREE.MeshStandardMaterial({ color: 0x1c222b, roughness: 0.4 });
  const clawMat = new THREE.MeshStandardMaterial({ color: 0x2b333d, roughness: 0.35 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 18), fur);
  body.scale.set(1, 0.95, 1.55);
  body.position.y = 1.55;
  g.add(body);
  // omuz hörgücü
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.85, 18, 14), fur);
  hump.position.set(0, 2.05, 0.75);
  g.add(hump);
  // kafa grubu (ısırma animasyonu için)
  const headG = new THREE.Group();
  headG.position.set(0, 2.25, 1.95);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.62, 22, 16), fur);
  skull.scale.set(1, 0.92, 1.05);
  headG.add(skull);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), furDark);
  snout.scale.set(1, 0.75, 1.15);
  snout.position.set(0, -0.14, 0.55);
  headG.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), noseMat);
  nose.position.set(0, -0.06, 0.92);
  headG.add(nose);
  // alt çene (ısırma)
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), furDark);
  jaw.scale.set(0.9, 0.45, 1.1);
  jaw.position.set(0, -0.38, 0.5);
  headG.add(jaw);
  headG.userData.jaw = jaw;
  // gözler
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.15 });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), eyeMat);
    eye.position.set(sx * 0.26, 0.12, 0.5);
    headG.add(eye);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), fur);
    ear.position.set(sx * 0.42, 0.52, -0.05);
    headG.add(ear);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), furDark);
    inner.position.set(sx * 0.42, 0.52, 0.06);
    headG.add(inner);
  }
  if (female) {
    // kirpik + pembemsi burun çevresi (dişi ayı ayırt edici)
    const lashMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    for (const sx of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), lashMat);
      l.position.set(sx * 0.28, 0.22, 0.5);
      l.rotation.z = sx * -0.3;
      headG.add(l);
    }
  }
  // dişler
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xfffdf4, roughness: 0.3 });
  for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), toothMat);
    t.rotation.x = Math.PI;
    t.position.set(sx * 0.14, -0.32, 0.78);
    headG.add(t);
  }
  g.add(headG);

  // bacaklar
  const legs = [];
  const legGeo = new THREE.CylinderGeometry(0.30, 0.36, 1.35, 12);
  const pawGeo = new THREE.SphereGeometry(0.38, 14, 10);
  const legPos = [[-0.62, 0.85], [0.62, 0.85], [-0.62, -0.85], [0.62, -0.85]];
  legPos.forEach(([lx, lz], i) => {
    const lg = new THREE.Group();
    lg.position.set(lx, 1.0, lz);
    const upper = new THREE.Mesh(legGeo, fur);
    upper.position.y = -0.25;
    lg.add(upper);
    const paw = new THREE.Mesh(pawGeo, fur);
    paw.scale.set(1, 0.6, 1.35);
    paw.position.set(0, -0.95, 0.1);
    lg.add(paw);
    // pençeler (ön patilerde belirgin)
    if (i < 2) {
      for (let c = -1; c <= 1; c++) {
        const cl = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 6), clawMat);
        cl.rotation.x = Math.PI / 2 - 0.25;
        cl.position.set(c * 0.16, -0.95, 0.62);
        lg.add(cl);
      }
    }
    g.add(lg);
    legs.push(lg);
  });

  // kollar (pençe animasyonu için ön bacak referansı)
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), fur);
  tail.position.set(0, 1.7, -1.75);
  g.add(tail);

  // yara izleri (kırmızı) — hasar aldıkça görünür
  const wounds = new THREE.Group();
  const woundMat = new THREE.MeshBasicMaterial({ color: 0xc81e2b, transparent: true, opacity: 0.92 });
  const woundSpots = [[0.7, 1.9, 0.6], [-0.8, 1.6, -0.2], [0.3, 2.3, 1.2], [-0.4, 1.4, 1.0], [0, 1.5, -1.4]];
  const woundMeshes = woundSpots.map(([x, y, z]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16 + Math.random() * 0.1, 8, 6), woundMat.clone());
    m.scale.set(1, 0.6, 0.4);
    m.position.set(x, y, z);
    m.visible = false;
    wounds.add(m);
    return m;
  });
  g.add(wounds);

  g.scale.setScalar(s);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  headG.userData.basePos = headG.position.clone();
  jaw.userData.basePos = jaw.position.clone();
  return { group: g, head: headG, jaw, legs, wounds: woundMeshes, bodyMat: fur, body, hump };
}

export function setWoundLevel(bear, hpFrac) {
  // hp düştükçe daha çok yara göster
  const n = bear.wounds.length;
  const show = hpFrac > 0.75 ? 0 : hpFrac > 0.5 ? 1 : hpFrac > 0.3 ? 3 : n;
  bear.wounds.forEach((w, i) => { w.visible = i < show; });
}

export function animateBear(bear, t, moving, running) {
  const amp = moving ? (running ? 0.75 : 0.5) : 0.06;
  const spd = moving ? (running ? 11 : 7) : 1.6;
  bear.legs.forEach((l, i) => {
    const ph = (i % 2 === 0 ? 0 : Math.PI) + (i > 1 ? Math.PI * 0.5 : 0);
    l.rotation.x = Math.sin(t * spd + ph) * amp;
  });
  bear.group.position.y += 0; // zemin main.js'de ayarlanır
  bear.head.rotation.y = Math.sin(t * 0.7) * (moving ? 0.08 : 0.22);
  bear.head.rotation.x = moving ? Math.sin(t * spd) * 0.04 : Math.sin(t * 1.1) * 0.05;
}
