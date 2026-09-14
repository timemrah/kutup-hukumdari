// Girdi eşlemesi (saf fonksiyonlar): hangi tuş/fare ne yapar.
// Space = ısırma, sol tık = pençe. Sağ tık boşta (sadece kamera sürükleme).
export function actionForKey(code) {
  switch (code) {
    case 'Space':
    case 'KeyV':
      return 'bite';
    case 'KeyE':
      return 'interact';
    case 'KeyF':
      return 'action';
    case 'KeyP':
      return 'pause';
    default:
      return null;
  }
}

export function actionForMouseButton(button) {
  if (button === 0) return 'claw';
  return null;
}
