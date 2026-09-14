import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { actionForKey, actionForMouseButton, resolveInsideE, resolveDenE } from '../src/bindings.js';

describe('ısırma girdisi', () => {
  it('Space ısırır', () => {
    assert.equal(actionForKey('Space'), 'bite');
  });
  it('V ısırmaya devam eder', () => {
    assert.equal(actionForKey('KeyV'), 'bite');
  });
  it('sağ tık (2) boştur', () => {
    assert.equal(actionForMouseButton(2), null);
  });
  it('sol tık (0) pençedir', () => {
    assert.equal(actionForMouseButton(0), 'claw');
  });
  it('içeride E: et varsa ye', () => {
    assert.equal(resolveInsideE(true), 'eat');
  });
  it('içeride E: et yoksa çık', () => {
    assert.equal(resolveInsideE(false), 'exit');
  });
  it('inde E: et > sohbet > çık sırası', () => {
    assert.equal(resolveDenE(true, true), 'eat');
    assert.equal(resolveDenE(false, true), 'chat');
    assert.equal(resolveDenE(false, false), 'exit');
  });
});
