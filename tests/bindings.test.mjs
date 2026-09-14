import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { actionForKey, actionForMouseButton } from '../src/bindings.js';

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
});
