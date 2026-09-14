// Kamera-göreli hareket matematiği (saf fonksiyonlar — oyuncu + testler ortak kullanır).
// Kamera konumu: p + (sin(yaw), cos(yaw)) * dist  =>  kamera oyuncunun arkasındadır.
// W (ileri) = kameradan oyuncuya bakış yönü = (-sin(yaw), -cos(yaw)).
// D (sağa)  = bakış yönünün 90° saat yönü = (cos(yaw), -sin(yaw)).
export function cameraForward(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

export function cameraRight(yaw) {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
}

// mx: -1 (A) / +1 (D), mz: -1 (W) / +1 (S). Dönüş: world = right*mx + forward*(-mz).
// (W'de mz=-1 olduğundan -mz=+1 => tam ileri.)
export function moveVector(mx, mz, yaw) {
  const f = cameraForward(yaw);
  const r = cameraRight(yaw);
  return { x: r.x * mx + f.x * -mz, z: r.z * mx + f.z * -mz };
}

export function normalize2(v) {
  const len = Math.hypot(v.x, v.z);
  if (len < 1e-9) return { x: 0, z: 0 };
  return { x: v.x / len, z: v.z / len };
}

// Saldırı yayı: hedef yönü (dx,dz) ile bakış yönü (fx,fz) arasındaki açı < arc mı?
export function inAttackArc(dx, dz, fx, fz, arc) {
  const d = normalize2({ x: dx, z: dz });
  const f = normalize2({ x: fx, z: fz });
  const dot = Math.max(-1, Math.min(1, d.x * f.x + d.z * f.z));
  return Math.acos(dot) < arc;
}

// Temaslı itme: iki daire iç içeyse birbirinden ayırır (içine girme yok).
// pushB: b'nin aldığı pay (0..1). Çakışma yoksa / merkezler aynıysa null.
export function separationDelta(ax, az, bx, bz, minD, pushB = 0.5) {
  const dx = bx - ax, dz = bz - az;
  const d = Math.hypot(dx, dz);
  if (d >= minD || d < 1e-6) return null;
  const need = minD - d;
  const nx = dx / d, nz = dz / d;
  return {
    ax: -nx * need * (1 - pushB), az: -nz * need * (1 - pushB),
    bx: nx * need * pushB, bz: nz * need * pushB,
  };
}

// Daire sınıra kelepçele (oda duvarı): içerideyse null, dışarıdaysa izdüşüm.
export function clampToCircle(x, z, cx, cz, r) {
  const dx = x - cx, dz = z - cz;
  const d = Math.hypot(dx, dz);
  if (d <= r) return null;
  return { x: cx + (dx / d) * r, z: cz + (dz / d) * r };
}

// Eve dönüş: bağ mesafesi aşıldıysa eve doğru birim yön, yoksa null.
export function homeDirection(x, z, hx, hz, leash) {
  const dx = hx - x, dz = hz - z;
  const d = Math.hypot(dx, dz);
  if (d <= leash) return null;
  return { x: dx / d, z: dz / d };
}
