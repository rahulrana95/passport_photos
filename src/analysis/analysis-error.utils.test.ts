import { describe, expect, it } from 'vitest';
import { AnalysisError, deserialiseError, serialiseError } from './analysis-error.utils';

describe('AnalysisError', () => {
  it('carries a branchable code alongside the message', () => {
    const error = new AnalysisError('out-of-memory', 'Ran out of memory.');

    expect(error.code).toBe('out-of-memory');
    expect(error.message).toBe('Ran out of memory.');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('serialiseError', () => {
  it('preserves the code of an AnalysisError', () => {
    expect(serialiseError(new AnalysisError('timeout', 'Too slow.'))).toEqual({
      name: 'AnalysisError',
      message: 'Too slow.',
      code: 'timeout',
    });
  });

  it('keeps the name and message of an ordinary Error, coded unknown', () => {
    // Whatever the model library throws arrives here. Losing the message would
    // leave nothing to diagnose a detector failure with.
    expect(serialiseError(new TypeError('wasm memory access out of bounds'))).toEqual({
      name: 'TypeError',
      message: 'wasm memory access out of bounds',
      code: 'unknown',
    });
  });

  it('stringifies a thrown value that is not an Error at all', () => {
    // WASM glue code throws strings and numbers, not Errors.
    expect(serialiseError('abort(7)')).toEqual({
      name: 'Error',
      message: 'abort(7)',
      code: 'unknown',
    });
  });
});

describe('deserialiseError', () => {
  it('rebuilds an AnalysisError that structured clone had flattened', () => {
    // Structured clone drops the prototype and the stack, so an Error posted
    // across the worker boundary arrives as a shapeless object.
    const rebuilt = deserialiseError({ name: 'TypeError', message: 'boom', code: 'unknown' });

    expect(rebuilt).toBeInstanceOf(AnalysisError);
    expect(rebuilt.name).toBe('TypeError');
    expect(rebuilt.code).toBe('unknown');
  });

  it('round-trips an AnalysisError unchanged', () => {
    const original = new AnalysisError('worker-crashed', 'The engine stopped.');
    const rebuilt = deserialiseError(serialiseError(original));

    expect(rebuilt.code).toBe(original.code);
    expect(rebuilt.message).toBe(original.message);
    expect(rebuilt.name).toBe(original.name);
  });
});
