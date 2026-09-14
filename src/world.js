import * as THREE from 'three';

// Kutup dünyası: zemin, dağlar, buzdağları, ince buz göletleri, in, mağaralar, gökyüzü
export function buildWorld(scene, opts = {}) {
  const W = {};
  W.colliders = []; // {x,z,r}
  W.waters = [];    // {x,z,r,mesh,fish:[]}
  W.caves = [];     // {x,z,r,meshInner, entrance, name, bossId}
  W.meats = [];
  const quality = opts.quality || 'medium';

  // --- Işıklar ---
  const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x5a6b7d, 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024);
  sun.shadow.camera.left = -70; sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
  sun.shadow.camera.far = 300;
  scene.add(sun); scene.add(sun.target);
  const moon = new THREE.DirectionalLight(0x8fb8ff, 0.0);
  moon.position.set(-40, 60, -30);
  scene.add(moon);
  W.sun = sun; W.moon = moon; W.hemi = hemi;

  // --- Zemin (dalgalı kar) ---
  const SEG = quality === 'low' ? 96 : 160;
  const SIZE = 340;
  const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const peak = (x, z) => {
    let h = 0;
    h += Math.sin(x * 0.05) * Math.cos(z * 0.045) * 1.2;
    h += Math.sin(x * 0.15 + 1.3) * Math.cos(z * 0.13) * 0.35;
    // kenar dağ kuşağı
    const d = Math.max(Math.abs(x), Math.abs(z));
    if (d > 110) h += (d - 110) * 0.22;
    // gölet çukurları (3 gölet)
    for (const p of [[28, 18], [-34, 30], [6, -42]]) {
      const dd = Math.hypot(x - p[0], z - p[1]);
      if (dd < 14) h -= (1 - dd / 14) * 1.6;
    }
    // in düzlüğü
    const di = Math.hypot(x + 8, z + 52);
    if (di < 12) h *= (di / 12) * 0.4;
    return h;
  };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, peak(x, z));
  }
  g.computeVertexNormals();
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xe9f2f8, roughness: 0.92, metalness: 0.0 });
  const ground = new THREE.Mesh(g, snowMat);
  ground.receiveShadow = true;
  scene.add(ground);
  W.groundY = peak;
  W.size = SIZE;

  const dummy = new THREE.Object3D();
  // --- Dağlar (konik + kar) ---
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5d6b7a, roughness: 0.95, flatShading: true });
  const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xf4fafd, roughness: 0.85, flatShading: true });
  const peaks = [[-95, -80, 42], [90, -70, 38], [-80, 90, 34], [95, 80, 44], [0, -120, 46], [-120, 10, 40], [125, -5, 36]];
  for (const [x, z, h] of peaks) {
    const y = peak(x, z);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(h * 0.62, h, 7), rockMat);
    cone.position.set(x, y + h / 2 - 4, z);
    cone.castShadow = cone.receiveShadow = true;
    scene.add(cone);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(h * 0.30, h * 0.45, 7), snowCapMat);
    cap.position.set(x, y + h - 4 - h * 0.22, z);
    cap.castShadow = true;
    scene.add(cap);
    W.colliders.push({ x, z, r: h * 0.5 });
  }

  // --- Buzdağları ve buz kristalleri ---
  const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xbfe9f5, roughness: 0.15, metalness: 0, transmission: 0.25, transparent: true, opacity: 0.92, flatShading: true });
  const bergGeo = new THREE.OctahedronGeometry(1, 0);
  const bergs = quality === 'low' ? 14 : 26;
  for (let i = 0; i < bergs; i++) {
    const m = new THREE.Mesh(bergGeo, iceMat);
    const a = (i / bergs) * Math.PI * 2 + 0.4;
    const r = 60 + (i % 5) * 12;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const s = 2 + (i % 4) * 1.4;
    m.scale.set(s, s * 1.6, s);
    m.position.set(x, peak(x, z) + s * 0.5, z);
    m.rotation.y = i * 1.7;
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    if (i % 3 === 0) W.colliders.push({ x, z, r: s * 1.1 });
  }
  // parlayan küçük kristaller
  const cryGeo = new THREE.OctahedronGeometry(0.35, 0);
  const cryMat = new THREE.MeshStandardMaterial({ color: 0xd8f6ff, emissive: 0x3a7ca5, emissiveIntensity: 0.35, roughness: 0.2 });
  const cryCount = quality === 'low' ? 40 : 90;
  const cry = new THREE.InstancedMesh(cryGeo, cryMat, cryCount);
  for (let i = 0; i < cryCount; i++) {
    const x = (Math.random() - 0.5) * 200, z = (Math.random() - 0.5) * 200;
    dummy.position.set(x, peak(x, z) + 0.2, z);
    dummy.rotation.set(0, Math.random() * 6, 0);
    dummy.updateMatrix();
    cry.setMatrixAt(i, dummy.matrix);
  }
  scene.add(cry);

  // --- İnce buz göletleri (balık alanları) ---
  const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x2e86a8, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.78 });
  const thinIceMat = new THREE.MeshStandardMaterial({ color: 0xdff4fb, transparent: true, opacity: 0.45, roughness: 0.4 });
  const pondDefs = [
    { x: 28, z: 18, r: 11, name: 'Buzul Göleti' },
    { x: -34, z: 30, r: 9, name: 'Sessiz Su' },
    { x: 6, z: -42, r: 10, name: 'İnce Buz' },
  ];
  for (const p of pondDefs) {
    const y = peak(p.x, p.z) + 0.35;
    const w = new THREE.Mesh(new THREE.CircleGeometry(p.r, 40), waterMat.clone());
    w.rotation.x = -Math.PI / 2; w.position.set(p.x, y, p.z);
    scene.add(w);
    // kırık ince buz halkası
    const ring = new THREE.Mesh(new THREE.RingGeometry(p.r * 0.55, p.r + 1.5, 40), thinIceMat);
    ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, y + 0.02, p.z);
    scene.add(ring);
    // buz parçaları
    for (let k = 0; k < 7; k++) {
      const floe = new THREE.Mesh(new THREE.CylinderGeometry(0.8 + Math.random(), 1.2 + Math.random(), 0.25, 7), thinIceMat.clone());
      const a = Math.random() * Math.PI * 2, rr = p.r * (0.6 + Math.random() * 0.5);
      floe.position.set(p.x + Math.cos(a) * rr, y + 0.08, p.z + Math.sin(a) * rr);
      floe.rotation.y = Math.random() * 3;
      scene.add(floe);
    }
    W.waters.push({ ...p, mesh: w, y });
  }

  W.denPos = new THREE.Vector3(-8, 0, 52);
  W.denPos.y = peak(-8, 52);
  buildDen(scene, W);
  buildCaves(scene, W, peak);
  buildInteriors(scene, W, peak);
  buildSky(scene, W);
  buildSnowfall(scene, W, quality);
  return W;
}

// Ayrı iç alanlar: E ile girilir, dış dünyadan uzakta kendi odaları vardır.
function buildInteriors(scene, W, peak) {
  W.interiors = [];
  const snowIn = new THREE.MeshStandardMaterial({ color: 0xeef6fb, roughness: 0.95, side: THREE.DoubleSide });
  const rockIn = new THREE.MeshStandardMaterial({ color: 0x4a5560, roughness: 1, flatShading: true, side: THREE.DoubleSide });

  // --- Ayı ini (sıcak iglo) ---
  {
    const cx = 400, cz = 400, fy = peak(cx, cz);
    const g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), snowIn);
    dome.castShadow = dome.receiveShadow = true;
    g.add(dome);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(8.6, 28), new THREE.MeshStandardMaterial({ color: 0xdfe9f0, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.05; floor.receiveShadow = true;
    g.add(floor);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(2.6, 22), new THREE.MeshStandardMaterial({ color: 0x8a6b4f, roughness: 1 }));
    rug.rotation.x = -Math.PI / 2; rug.position.y = 0.1;
    g.add(rug);
    // kapı süsü (güney duvarı, içeriden görünür)
    const door = new THREE.Mesh(new THREE.CircleGeometry(1.7, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x060b12, side: THREE.DoubleSide }));
    door.position.set(0, 0.4, 8.4); door.rotation.y = Math.PI;
    g.add(door);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.4, 10, 20, Math.PI), new THREE.MeshStandardMaterial({ color: 0xd8b46a, roughness: 0.6, side: THREE.DoubleSide }));
    rim.position.set(0, 0.4, 8.35); rim.rotation.y = Math.PI;
    g.add(rim);
    // kemik yığını süsü
    const boneM = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1 + (i % 2) * 0.5), boneM);
      b.rotation.set(Math.PI / 2, 0, i * 0.8);
      b.position.set(-4.5 + (i % 2) * 0.6, 0.15, -3 + i * 0.5);
      g.add(b);
    }
    const lamp = new THREE.PointLight(0xffc98a, 60, 30);
    lamp.position.set(0, 4, 0);
    g.add(lamp);
    g.position.set(cx, fy, cz);
    scene.add(g);
    W.interiors.push({ id: 'den', name: 'Ayı İni', x: cx, z: cz, r: 7.4, floorY: fy });
  }

  // --- Mağara içleri (boss arenaları) ---
  const caveRooms = [
    { cx: 430, cz: -430, caveIndex: 0, tint: 0x7fd4ff },
    { cx: -430, cz: 430, caveIndex: 1, tint: 0x9fd4a8 },
  ];
  for (const cr of caveRooms) {
    const fy = peak(cr.cx, cr.cz);
    const cave = W.caves[cr.caveIndex];
    const g = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(13, 13.6, 10, 20, 1, true), rockIn);
    wall.position.y = 5; wall.castShadow = wall.receiveShadow = true;
    g.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(14.5, 8, 14), rockIn);
    roof.position.y = 14; roof.castShadow = true;
    g.add(roof);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(13, 28), new THREE.MeshStandardMaterial({ color: 0x9fb2bd, roughness: 1, side: THREE.DoubleSide }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.05; floor.receiveShadow = true;
    g.add(floor);
    // sarkıtlar
    const spikeM = new THREE.MeshStandardMaterial({ color: 0xcfeef8, roughness: 0.3 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const rr = 4 + (i % 3) * 2.6;
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2 + (i % 4), 7), spikeM);
      s.rotation.x = Math.PI;
      s.position.set(Math.cos(a) * rr, 8.2, Math.sin(a) * rr);
      g.add(s);
    }
    // parlayan kristaller
    const cryM = new THREE.MeshStandardMaterial({ color: 0xd8f6ff, emissive: cr.tint, emissiveIntensity: 0.9, roughness: 0.2 });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.9;
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), cryM);
      c.position.set(Math.cos(a) * 10.5, 0.6, Math.sin(a) * 10.5);
      g.add(c);
    }
    const lamp = new THREE.PointLight(cr.tint, 150, 70);
    lamp.position.set(0, 6, 0);
    g.add(lamp);
    const fill = new THREE.PointLight(0xfff2dd, 40, 40);
    fill.position.set(0, 2.5, 0);
    g.add(fill);
    g.position.set(cr.cx, fy, cr.cz);
    scene.add(g);
    W.interiors.push({ id: 'cave', caveIndex: cr.caveIndex, name: cave.name, boss: cave.boss, x: cr.cx, z: cr.cz, r: 11.4, floorY: fy });
  }
}

function buildDen(scene, W) {
  const g = new THREE.Group();
  const y = W.denPos.y;
  const moundMat = new THREE.MeshStandardMaterial({ color: 0xf2f8fc, roughness: 0.9 });
  const mound = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), moundMat);
  mound.scale.set(1.3, 0.75, 1.1);
  mound.castShadow = mound.receiveShadow = true;
  g.add(mound);
  // giriş (karanlık kemer)
  const dark = new THREE.MeshBasicMaterial({ color: 0x060b12 });
  const door = new THREE.Mesh(new THREE.CircleGeometry(1.7, 24, 0, Math.PI), dark);
  door.position.set(0, 0.4, 6.1);
  g.add(door);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.5, 10, 20, Math.PI), new THREE.MeshStandardMaterial({ color: 0xdceef7, roughness: 0.8 }));
  rim.position.set(0, 0.4, 6.0);
  g.add(rim);
  // sıcak ışık + duman
  const lamp = new THREE.PointLight(0xffc98a, 0, 14);
  lamp.position.set(0, 2.5, 3);
  g.add(lamp);
  W.denLamp = lamp;
  // iç yatak (kürk)
  const bed = new THREE.Mesh(new THREE.CircleGeometry(2.2, 20), new THREE.MeshStandardMaterial({ color: 0x8a6b4f, roughness: 1 }));
  bed.rotation.x = -Math.PI / 2; bed.position.set(0, 0.06, 1.5);
  g.add(bed);
  // bayrak / totem
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4), new THREE.MeshStandardMaterial({ color: 0x4a3a28 }));
  pole.position.set(4.5, 2, 3); g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshStandardMaterial({ color: 0xd8b46a, side: THREE.DoubleSide }));
  flag.position.set(5.3, 3.2, 3); g.add(flag);
  W.denFlag = flag;
  g.position.copy(W.denPos);
  scene.add(g);
  W.denGroup = g;
}

function buildCaves(scene, W, peak) {
  const defs = [
    { x: -72, z: -58, name: 'Fısıltı Mağarası', boss: 'Alfa Kurt' },
    { x: 78, z: 62, name: 'Dev Mors İni', boss: 'Dev Mors' },
  ];
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x46525f, roughness: 1, flatShading: true });
  for (const d of defs) {
    const y = peak(d.x, d.z);
    const grp = new THREE.Group();
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(7, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), rockMat);
    mouth.scale.set(1.4, 1.0, 1.0);
    mouth.castShadow = mouth.receiveShadow = true;
    grp.add(mouth);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(2.4, 20), new THREE.MeshBasicMaterial({ color: 0x04070c }));
    hole.position.set(0, 1.2, 6.9);
    grp.add(hole);
    // buz sarkıtları
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xcfeef8, roughness: 0.3 });
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4 + Math.random(), 6), spikeMat);
      s.rotation.x = Math.PI;
      s.position.set(-3 + i * 1.2, 3.4, 6.4);
      grp.add(s);
    }
    // iç ışık
    const inner = new THREE.PointLight(0x7fd4ff, 0.7, 22);
    inner.position.set(0, 3, 2);
    grp.add(inner);
    grp.position.set(d.x, y, d.z);
    grp.lookAt(0, y, 0);
    scene.add(grp);
    // ağız dünyası konumu: mağara merkezinden ovaya doğru ~7.5m (grup +Z ovaya bakar)
    const mdx = 0 - d.x, mdz = 0 - d.z;
    const mdd = Math.hypot(mdx, mdz) || 1;
    W.caves.push({ ...d, r: 6, group: grp, y, mouth: { x: d.x + (mdx / mdd) * 7.5, z: d.z + (mdz / mdd) * 7.5 } });
    W.colliders.push({ x: d.x, z: d.z, r: 5.5 });
  }
}

function buildSky(scene, W) {
  const skyGeo = new THREE.SphereGeometry(600, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x2a5a8a) }, bot: { value: new THREE.Color(0xcfe8f5) }, sunDir: { value: new THREE.Vector3(0, 1, 0) } },
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; varying vec3 vP;' +
      'void main(){ float h=clamp(vP.y*0.5+0.5,0.0,1.0); vec3 c=mix(bot,top,pow(h,0.8));' +
      'float s=max(dot(normalize(vP),normalize(sunDir)),0.0); c+=vec3(1.0,0.75,0.45)*pow(s,90.0)*0.9;' +
      'c+=vec3(1.0,0.6,0.35)*pow(s,6.0)*0.12; gl_FragColor=vec4(c,1.0); }'
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.frustumCulled = false;
  scene.add(sky);
  W.skyMat = skyMat;
  W.skyMesh = sky; // iç alanlara ışınlanınca kamerayı takip eder
  // yıldızlar
  const n = 700, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.48;
    p[i * 3] = Math.cos(t) * Math.cos(ph) * 550;
    p[i * 3 + 1] = Math.sin(ph) * 550 + 10;
    p[i * 3 + 2] = Math.sin(t) * Math.cos(ph) * 550;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, transparent: true, opacity: 0, fog: false, sizeAttenuation: false }));
  scene.add(stars);
  W.stars = stars;
  // aurora (gece ışıkları)
  const ag = new THREE.PlaneGeometry(500, 90, 60, 1);
  const am = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    uniforms: { t: { value: 0 }, alpha: { value: 0 } },
    vertexShader: 'uniform float t; varying vec2 vUv; void main(){ vUv=uv; vec3 p=position; p.y+=sin(uv.x*12.0+t)*8.0; p.z+=cos(uv.x*7.0+t*0.7)*10.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }',
    fragmentShader: 'uniform float t; uniform float alpha; varying vec2 vUv;' +
      'void main(){ vec3 g=mix(vec3(0.1,0.9,0.5),vec3(0.2,0.4,1.0),vUv.x+0.2*sin(t+vUv.x*6.0));' +
      'float a=smoothstep(0.0,0.4,vUv.y)*smoothstep(1.0,0.45,vUv.y)*alpha*(0.5+0.3*sin(t*1.5+vUv.x*10.0));' +
      'gl_FragColor=vec4(g,a); }'
  });
  const aur = new THREE.Mesh(ag, am);
  aur.position.set(0, 190, -320);
  aur.rotation.x = 0.25;
  scene.add(aur);
  W.aurora = am;
  W.auroraMesh = aur;
  // ay
  const moonM = new THREE.Mesh(new THREE.SphereGeometry(14, 20, 20), new THREE.MeshBasicMaterial({ color: 0xe8f1ff, fog: false }));
  moonM.position.set(-260, 240, -240);
  scene.add(moonM);
  W.moonMesh = moonM;
}

function buildSnowfall(scene, W, quality) {
  const count = quality === 'low' ? 900 : quality === 'high' ? 3500 : 2000;
  const posArr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    posArr[i * 3] = (Math.random() - 0.5) * 220;
    posArr[i * 3 + 1] = Math.random() * 60;
    posArr[i * 3 + 2] = (Math.random() - 0.5) * 220;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0.85 });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  W.snow = pts; W.snowCount = count;
}

