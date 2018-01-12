const test = require('ava');
const { internalBchAddressToStandard, bchAddressToInternal } = require('./utils');

test('internalBchAddressToStandard returns base58 before Jan 14, 2018', t => {
  const mocked = Date.now;
  Date.now = () => new Date('2017-12-01T00:00:00.000Z');

  t.is(internalBchAddressToStandard('1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu'), '1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu');

  Date.now = mocked;
});

test('internalBchAddressToStandard returns cashaddr on Jan 14, 2018', t => {
  // Test vector from https://github.com/Bitcoin-UAHF/spec/blob/master/cashaddr.md
  const mocked = Date.now;
  Date.now = () => new Date('2018-01-14T00:00:00.000Z');

  t.is(internalBchAddressToStandard('1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu'), 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a');
  Date.now = mocked;
});

test('bchAddressToInternal does not convert base58', t => {
  t.is(bchAddressToInternal('1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu'), '1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu');
  t.is(bchAddressToInternal('3CWFddi6m4ndiGyKqzYvsFYagqDLPVMTzC'), '3CWFddi6m4ndiGyKqzYvsFYagqDLPVMTzC');
});

test('bchAddressToInternal converts cashaddr to base58', t => {
  t.is(bchAddressToInternal('bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'), '1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu');
});
