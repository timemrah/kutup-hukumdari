import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// localStorage yokluğunda save.js'in içe aktarılabilmesi için zararsız taklit.
globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
};

const { collectSave, applySave, hasSave, loadSave, writeSave, clearSave } = await import('../src/save.js');

describe('localStorage kayıt', () => {
  it('tur atar: yaz → var → oku → uygula', () => {
    clearSave();
    assert.equal(hasSave(), false);
    const S = { hp: 80, maxHp: 112, hunger: 60, xp: 10, level: 2, power: 1.12, fish: 3, day: 4, time: 9.5, kills: 5, bossesDown: 1, clawDmg: 15, biteDmg: 29 };
    writeSave(collectSave(S, { x: 12, z: -7 }));
    assert.equal(hasSave(), true);
    const T = { hp: 100, maxHp: 100, hunger: 100, xp: 0, level: 1, power: 1, fish: 0, day: 1, time: 8, kills: 0, bossesDown: 0, clawDmg: 12, biteDmg: 24 };
    applySave(T, loadSave());
    assert.equal(T.hp, 80);
    assert.equal(T.day, 4);
    assert.equal(T.px, 12);
    assert.equal(T.pz, -7);
  });
  it('bozuk değerler oyunu bozmaz', () => {
    const T = { hp: 100, maxHp: 100, level: 1 };
    applySave(T, { hp: NaN, maxHp: 'çok', level: undefined });
    assert.equal(T.hp, 100);
    assert.equal(T.maxHp, 100);
    assert.equal(T.level, 1);
    applySave(T, null);
    assert.equal(T.hp, 100);
  });
  it('ölü kayıt diriltilmez: hp<=0 ise canlandırılır', () => {
    const T = { hp: 0, maxHp: 100 };
    applySave(T, { hp: 0, maxHp: 100 });
    assert.ok(T.hp > 0);
  });
});
