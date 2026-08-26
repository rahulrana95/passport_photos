import type { AnalysisErrorCode, SerialisedError } from './analysis-protocol.types';

export class AnalysisError extends Error {
  readonly code: AnalysisErrorCode;

  constructor(code: AnalysisErrorCode, message: string) {
    super(message);
    this.name = 'AnalysisError';
    this.code = code;
  }
}

/**
 * Structured clone drops the prototype and the stack, so an Error posted across
 * the worker boundary arrives as a shapeless object. Serialising explicitly
 * means the main thread gets a code it can branch on and a message it can show.
 */
export const serialiseError = (error: unknown): SerialisedError => {
  if (error instanceof AnalysisError) {
    return { name: error.name, message: error.message, code: error.code };
  }
  if (error instanceof Error) {
    return { name: error.name, message: error.message, code: 'unknown' };
  }
  return { name: 'Error', message: String(error), code: 'unknown' };
};

export const deserialiseError = (serialised: SerialisedError): AnalysisError => {
  const error = new AnalysisError(serialised.code, serialised.message);
  error.name = serialised.name;
  return error;
};
