import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../services/formula.service', () => ({
  REQUIRED_EDITABLE_FORMULA_FIELDS: [
    'investment',
    'investmentAll',
    'sellValue',
    'cost',
    'nettoProfit',
    'profitPercent',
    'profitRealPercent',
    'dailyProfitPercent',
  ],
  formulaService: {
    getEditableDefinitions: vi.fn(),
    previewEditableDefinitions: vi.fn(),
    replaceEditableDefinitions: vi.fn(),
  },
}));

import formulasRouter from './formulas.routes';
import { formulaService } from '../services/formula.service';

const app = express();
app.use(express.json());
app.use('/', formulasRouter);

describe('formulas.routes', () => {
  beforeEach(() => {
    vi.mocked(formulaService.getEditableDefinitions).mockReturnValue([
      {
        field: 'nettoProfit',
        expression: '(sellPrice - buyPrice) * volume * positionMultiplier - brokerCost',
        variables: ['brokerCost', 'buyPrice', 'positionMultiplier', 'sellPrice', 'volume'],
      },
    ]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('lists editable formulas with required metadata', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      formulas: [
        {
          field: 'nettoProfit',
          expression: '(sellPrice - buyPrice) * volume * positionMultiplier - brokerCost',
          variables: ['brokerCost', 'buyPrice', 'positionMultiplier', 'sellPrice', 'volume'],
          required: true,
        },
      ],
    });
  });

  it('rejects PUT requests with a non-array formulas payload', async () => {
    const res = await request(app).put('/').send({ formulas: null });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe('formulas');
  });

  it('previews formulas without persisting them', async () => {
    vi.mocked(formulaService.previewEditableDefinitions).mockReturnValue([
      {
        field: 'riskScore',
        expression: 'nettoProfit / investment',
        variables: ['investment', 'nettoProfit'],
      },
    ]);

    const res = await request(app).post('/preview').send({
      formulas: [{ field: 'riskScore', expression: 'nettoProfit / investment' }],
    });

    expect(res.status).toBe(200);
    expect(formulaService.previewEditableDefinitions).toHaveBeenCalledWith([
      { field: 'riskScore', expression: 'nettoProfit / investment' },
    ]);
    expect(formulaService.replaceEditableDefinitions).not.toHaveBeenCalled();
  });

  it('saves formulas and returns normalized metadata', async () => {
    vi.mocked(formulaService.replaceEditableDefinitions).mockResolvedValue([
      {
        field: 'nettoProfit',
        expression: '(sellPrice - buyPrice) * volume * positionMultiplier - brokerCost',
        variables: ['brokerCost', 'buyPrice', 'positionMultiplier', 'sellPrice', 'volume'],
      },
      {
        field: 'riskScore',
        expression: 'nettoProfit / investment',
        variables: ['investment', 'nettoProfit'],
      },
    ]);

    const payload = {
      formulas: [
        {
          field: 'nettoProfit',
          expression: '(sellPrice - buyPrice) * volume * positionMultiplier - brokerCost',
        },
        {
          field: 'riskScore',
          expression: 'nettoProfit / investment',
        },
      ],
    };

    const res = await request(app).put('/').send(payload);

    expect(res.status).toBe(200);
    expect(formulaService.replaceEditableDefinitions).toHaveBeenCalledWith(payload.formulas);
    expect(res.body.formulas[1]).toEqual({
      field: 'riskScore',
      expression: 'nettoProfit / investment',
      variables: ['investment', 'nettoProfit'],
      required: false,
    });
  });

  it('returns 400 when the service rejects an invalid formula config', async () => {
    vi.mocked(formulaService.replaceEditableDefinitions).mockRejectedValue(
      new Error('[FATAL] Formula config invalid: foo — unexpected TNAME'),
    );

    const res = await request(app).put('/').send({
      formulas: [{ field: 'foo', expression: 'bad +' }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FORMULA_CONFIG');
  });
});