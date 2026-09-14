import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { separationDelta, clampToCircle, homeDirection } from '../src/movement.js';

describe('temaslı itme (iç içe geçme yok)', () => {
  it('örtüşen iki gövde min mesafeye ayrılır', () => {
    const d = separationDelta(0, 0, 1, 0, 2, 0.5);
    assert.ok(d, 'itme yok');
    const ax = 0 + d.ax, bx = 1 + d.bx;
    assert.ok(Math.abs((bx - ax) - 2) < 1e-9, 'min mesafe sağlanmadı');
  });
  it('pay dağılımı: pushB=1 hepsini b alır', () => {
    const d = separationDelta(0, 0, 1, 0, 2, 1);
    assert.ok(Math.abs(d.ax) < 1e-9);
    assert.ok(Math.abs(d.az) < 1e-9);
    assert.ok(Math.abs(d.bx - 1) < 1e-9);
  });
  it('temas yoksa null', () => {
    assert.equal(separationDelta(0, 0, 5, 0, 2, 0.5), null);
    assert.equal(separationDelta(0, 0, 2, 0, 2, 0.5), null);
  });
  it('aynı merkezde null (patlama yok)', () => {
    assert.equal(separationDelta(1, 1, 1, 1, 2, 0.5), null);
  });
});

describe('eve dönüş bağı', () => {
  it('bağ içindeyse null (serbest gezinir)', () => {
    assert.equal(homeDirection(5, 0, 0, 0, 14), null);
  });
  it('bağ aşıldıysa eve doğru birim yön döner', () => {
    const h = homeDirection(20, 0, 0, 0, 14);
    assert.ok(h, 'yön yok');
    assert.ok(Math.abs(h.x + 1) < 1e-9 && Math.abs(h.z) < 1e-9);
    assert.ok(Math.abs(Math.hypot(h.x, h.z) - 1) < 1e-9);
  });
});

describe('oda kelepçesi', () => {
  it('içerideyse null', () => {
    assert.equal(clampToCircle(1, 1, 0, 0, 5), null);
  });
  it('dışarıdaysa çembere izdüşer', () => {
    const c = clampToCircle(10, 0, 0, 0, 5);
    assert.ok(Math.abs(c.x - 5) < 1e-9 && Math.abs(c.z) < 1e-9);
  });
});
