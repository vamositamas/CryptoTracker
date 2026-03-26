import { describe, it, expect } from 'vitest';
import { validateCreateTradeDto } from './validators';

const VALID = {
  type: 'spot',
  position: 'BTC',
  leverage: 1,
  volume: 0.5,
  buyPrice: 30000,
  sellPrice: 35000,
  closeDate: '2024-01-15',
};

describe('validateCreateTradeDto', () => {
  it('returns { valid: true } for a correct payload', () => {
    expect(validateCreateTradeDto(VALID)).toEqual({ valid: true });
  });

  it('fails when type is missing', () => {
    const { type: _, ...rest } = VALID;
    const result = validateCreateTradeDto(rest as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(result.error?.field).toBe('type');
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('fails when type is blank string', () => {
    const result = validateCreateTradeDto({ ...VALID, type: '   ' });
    expect(result.valid).toBe(false);
    expect(result.error?.field).toBe('type');
  });

  it('fails when position is missing', () => {
    const { position: _, ...rest } = VALID;
    const result = validateCreateTradeDto(rest as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(result.error?.field).toBe('position');
  });

  it('fails when position is empty string', () => {
    const result = validateCreateTradeDto({ ...VALID, position: '' });
    expect(result.valid).toBe(false);
    expect(result.error?.field).toBe('position');
  });

  it('fails when leverage is 0', () => {
    const result = validateCreateTradeDto({ ...VALID, leverage: 0 });
    expect(result.valid).toBe(false);
    expect(result.error?.field).toBe('leverage');
  });

  it('fails when leverage is negative', () => {
    const result = validateCreateTradeDto({ ...VALID, leverage: -5 });
    expect(result.valid).toBe(false);
    expect(result.error?.field).toBe('leverage');
  });

  it('fails when leverage is missing', () => {
    const { leverage: _, ...rest } = VALID;
    const result = validateCreateTradeDto(rest as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(result.error?.field).toBe('leverage');
  });

  it('fails when volume is missing', () => {
    const { volume: _, ...rest } = VALID;
    const result = validateCreateTradeDto(rest as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(result.error?.field).toBe('volume');
  });

  it('fails when buyPrice is 0', () => {
    const result = validateCreateTradeDto({ ...VALID, buyPrice: 0 });
    expect(result.valid).toBe(false);
    expect(result.error?.field).toBe('buyPrice');
  });

  it('fails when sellPrice is missing', () => {
    const { sellPrice: _, ...rest } = VALID;
    const result = validateCreateTradeDto(rest as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(result.error?.field).toBe('sellPrice');
  });

  it('fails when closeDate is missing', () => {
    const { closeDate: _, ...rest } = VALID;
    const result = validateCreateTradeDto(rest as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(result.error?.field).toBe('closeDate');
  });

  it('fails when closeDate is not a valid date string', () => {
    const result = validateCreateTradeDto({ ...VALID, closeDate: 'not-a-date' });
    expect(result.valid).toBe(false);
    expect(result.error?.field).toBe('closeDate');
  });

  it('accepts an ISO date-time string for closeDate', () => {
    const result = validateCreateTradeDto({ ...VALID, closeDate: '2024-06-01T12:00:00.000Z' });
    expect(result.valid).toBe(true);
  });

  it('accepts fractional values for numeric fields', () => {
    expect(validateCreateTradeDto({ ...VALID, leverage: 0.001, volume: 0.001 })).toEqual({ valid: true });
  });
});
