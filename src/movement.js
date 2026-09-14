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
