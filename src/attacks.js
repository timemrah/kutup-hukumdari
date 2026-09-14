// Saldırı pozları (saf fonksiyonlar): p = 0 saldırı başı, 1 saldırı sonu.
// Dönen değerler doğrudan eklem rotasyonlarına yazılır; başlangıç/bitiş
// nötr (0) olduğundan yürüme animasyonuyla çakışmaz.

// Yumuşak faz geçişi
export function ss(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function stage(neutral, windT, strikeT, p) {
  const wind = ss(0, 0.35, p);
  const strike = ss(0.35, 0.62, p);
  const rec = ss(0.62, 1, p);
  const v1 = neutral + (windT - neutral) * wind;
  const v2 = v1 + (strikeT - v1) * strike;
  return v2 + (neutral - v2) * rec;
}

// Tek pençe (sağ ön pati): kaldır → savur → topla. Vücut da eşlik eder.
export function clawPose(p) {
  return {
    pawRX: stage(0, -1.7, 0.8, p),   // pati: yukarı kalk → aşağı savrul
    pawRZ: stage(0, -0.45, 0.6, p),  // pati: yana açıl → içe süpür
    braceRX: stage(0, -0.25, 0.15, p), // sol ön bacak desteklenir
    twist: stage(0, -0.4, 0.3, p),   // gövde yaw: geril → savrul
    rear: stage(0, -0.12, 0.03, p),  // gövde pitch: hafif şahlan → kapan
    lean: stage(0, -0.1, 0.12, p),   // gövde roll: vuruşa yat
    headRX: stage(0, -0.12, 0.18, p), // kafa vuruşu takip eder
    slash: ss(0.38, 0.5, p) * (1 - ss(0.5, 0.72, p)), // pençe izi parlaması
  };
}

// Isırma: ağız aç + kafa kalk → kafa göm + çene kapan → topla.
export function bitePose(p) {
  const open = ss(0, 0.35, p);
  const snap = ss(0.35, 0.55, p);
  const rec = ss(0.55, 1, p);
  const jaw1 = 0 + (0.75 - 0) * open;
  const jaw2 = jaw1 + (-0.05 - jaw1) * snap;
  const head1 = 0 + (-0.25 - 0) * open;
  const head2 = head1 + (0.55 - head1) * snap;
  const drop1 = 0 + (-0.05 - 0) * open;
  const drop2 = drop1 + (-0.3 - drop1) * snap;
  const thrust1 = 0;
  const thrust2 = 0 + (0.28 - 0) * snap;
  const k = 1 - rec;
  return {
    jaw: jaw2 * k,
    headRX: head2 * k,
    headDrop: drop2 * k,
    headThrust: thrust2 * k,
    lunge: ss(0.35, 0.5, p) * (1 - ss(0.5, 0.8, p)), // ileri atılma
  };
}

export const CLAW_STRIKE_P = 0.45; // hasarın işlediği an
export const BITE_SNAP_P = 0.5;
