import { describe, expect, it } from 'vitest';
import { mapImportedTradeRow } from './trade-import.parser';

describe('mapImportedTradeRow', () => {
  it('maps the Excel screenshot columns into a CreateTradeDto', () => {
    const dto = mapImportedTradeRow({
      'Type': 'SCALP',
      'Position': 'SHORT',
      'Token name': 'DOT',
      'Leverage': 10,
      'Volume': 47.8,
      'Buy Price [USDT]': 2.092,
      'Sell Price [USDT]': 2.079,
      'Cost [USDT]': 0.06,
      'Close Date': '2026.01.09',
    }, 2);

    expect(dto).toEqual({
      token: 'DOT',
      position: 'DOT',
      tradePosition: 'short',
      type: 'scalp',
      brokerCost: 0.06,
      leverage: 10,
      volume: 47.8,
      buyPrice: 2.092,
      sellPrice: 2.079,
      closeDate: '2026-01-09',
    });
  });

  it('defaults missing cost cells to zero', () => {
    const dto = mapImportedTradeRow({
      'Type': 'SCALP',
      'Position': 'LONG',
      'Token name': 'zec',
      'Leverage': '10',
      'Volume': '0.25',
      'Buy Price [USDT]': '404.078',
      'Sell Price [USDT]': '406.590',
      'Close Date': '2026-01-13',
    }, 2);

    expect(dto.token).toBe('ZEC');
    expect(dto.tradePosition).toBe('long');
    expect(dto.brokerCost).toBe(0);
  });
});