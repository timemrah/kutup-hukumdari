import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cameraForward, cameraRight, moveVector, inAttackArc } from '../src/movement.js';

const eq = (v, x, z) => {
  assert.ok(Math.abs(v.x - x) < 1e-9, `x: ${v.x} != ${x}`);
  assert.ok(Math.abs(v.z - z) < 1e-9, `z: ${v.z} != ${z}`);
};

describe('kamera-göreli hareket', () => {
  it('yaw=0 iken W kameradan uzağa (-Z) götürür', () => {
    eq(moveVector(0, -1, 0), 0, -1);
  });
  it('yaw=0 iken S kameraya doğru (+Z) getirir', () => {
    eq(moveVector(0, 1, 0), 0, 1);
  });
  it('yaw=0 iken D sağa (+X), A sola (-X) götürür', () => {
    eq(moveVector(1, 0, 0), 1, 0);
    eq(moveVector(-1, 0, 0), -1, 0);
  });
  it('kamera 90° dönünce (yaw=PI/2) W -X yönüne gider', () => {
    eq(moveVector(0, -1, Math.PI / 2), -1, 0);
  });
  it('kamera 180° dönünce (yaw=PI) W +Z yönüne gider', () => {
    const v = moveVector(0, -1, Math.PI);
    eq(v, 0, 1);
  });
  it('çapraz W+D normalize boyuttadır ve ileri-sağdadır', () => {
    const yaw = 0.7;
    const f = cameraForward(yaw);
    const r = cameraRight(yaw);
    const v = moveVector(1, -1, yaw);
    const len = Math.hypot(v.x, v.z);
    assert.ok(Math.abs(len - Math.SQRT2) < 1e-9, `ham boy ${len}`);
    // ileri ve sağ bileşenleri pozitif olmalı
    assert.ok(v.x * f.x + v.z * f.z > 0, 'ileri bileşen pozitif değil');
    assert.ok(v.x * r.x + v.z * r.z > 0, 'sağ bileşen pozitif değil');
  });
});

describe('saldırı yayı', () => {
  it('bakış yönündeki hedef yay içindedir', () => {
    assert.equal(inAttackArc(0, -1, 0, -1, 1.0), true);
  });
  it('arkadaki hedef yay dışındadır', () => {
    assert.equal(inAttackArc(0, 1, 0, -1, 1.0), false);
  });
});
