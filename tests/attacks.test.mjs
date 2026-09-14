import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clawPose, bitePose, ss } from '../src/attacks.js';

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

describe('pençe pozu (tek pati)', () => {
  it('başlangıç ve bitiş nötrdür', () => {
    for (const k of ['pawRX', 'pawRZ', 'twist', 'rear', 'lean', 'headRX']) {
      assert.ok(near(clawPose(0)[k], 0), `${k}(0) != 0`);
      assert.ok(near(clawPose(1)[k], 0), `${k}(1) != 0`);
    }
  });
  it('rüzgar fazında pati yukarı kalkar', () => {
    assert.ok(clawPose(0.2).pawRX < -0.5, 'pati kalkmadı');
  });
  it('vuruş fazında pati aşağı savrulur', () => {
    assert.ok(clawPose(0.55).pawRX > 0.3, 'pati savrulmadı');
  });
  it('pençe izi sadece vuruş anında parlar', () => {
    assert.equal(clawPose(0).slash, 0);
    assert.equal(clawPose(1).slash, 0);
    assert.ok(clawPose(0.55).slash > 0.5, 'vuruş parlaması yok');
  });
});

describe('ısırma pozu', () => {
  it('başlangıç ve bitiş nötrdür', () => {
    for (const k of ['jaw', 'headRX', 'headDrop', 'headThrust']) {
      assert.ok(near(bitePose(0)[k], 0), `${k}(0) != 0`);
      assert.ok(near(bitePose(1)[k], 0), `${k}(1) != 0`);
    }
  });
  it('önce ağız açılır ve kafa kalkar', () => {
    assert.ok(bitePose(0.3).jaw > 0.4, 'çene açılmadı');
    assert.ok(bitePose(0.3).headRX < -0.1, 'kafa kalkmadı');
  });
  it('sonra kafa gömülüp çene kapanır', () => {
    assert.ok(bitePose(0.5).headRX > 0.3, 'kafa gömülmedi');
    assert.ok(bitePose(0.6).jaw < 0.15, 'çene kapanmadı');
  });
  it('atılma sadece kapanma penceresindedir', () => {
    assert.equal(bitePose(0).lunge, 0);
    assert.equal(bitePose(1).lunge, 0);
    assert.ok(bitePose(0.55).lunge > 0.3, 'atılma yok');
  });
});

describe('ss yardımcısı', () => {
  it('sınırları kenetler', () => {
    assert.equal(ss(0, 1, -0.5), 0);
    assert.equal(ss(0, 1, 1.5), 1);
  });
});
