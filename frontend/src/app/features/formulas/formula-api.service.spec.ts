import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormulaApiService } from './formula-api.service';

describe('FormulaApiService', () => {
  let service: FormulaApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(FormulaApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('lists formulas from the API', async () => {
    const promise = service.list();

    const req = httpTesting.expectOne('/api/v1/formulas');
    expect(req.request.method).toBe('GET');
    req.flush({
      formulas: [
        {
          field: 'nettoProfit',
          expression: '(sellPrice - buyPrice) * volume',
          variables: ['buyPrice', 'sellPrice', 'volume'],
          required: true,
        },
      ],
    });

    await expect(promise).resolves.toEqual([
      {
        field: 'nettoProfit',
        expression: '(sellPrice - buyPrice) * volume',
        variables: ['buyPrice', 'sellPrice', 'volume'],
        required: true,
      },
    ]);
  });

  it('saves the full formula list', async () => {
    const promise = service.saveAll([
      { field: 'nettoProfit', expression: '(sellPrice - buyPrice) * volume' },
      { field: 'riskScore', expression: 'nettoProfit / investment' },
    ]);

    const req = httpTesting.expectOne('/api/v1/formulas');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      formulas: [
        { field: 'nettoProfit', expression: '(sellPrice - buyPrice) * volume' },
        { field: 'riskScore', expression: 'nettoProfit / investment' },
      ],
    });
    req.flush({
      formulas: [
        {
          field: 'nettoProfit',
          expression: '(sellPrice - buyPrice) * volume',
          variables: ['buyPrice', 'sellPrice', 'volume'],
          required: true,
        },
        {
          field: 'riskScore',
          expression: 'nettoProfit / investment',
          variables: ['investment', 'nettoProfit'],
          required: false,
        },
      ],
    });

    await expect(promise).resolves.toHaveLength(2);
  });

  it('previews the full formula list without saving', async () => {
    const promise = service.previewAll([
      { field: 'nettoProfit', expression: '(sellPrice - buyPrice) * volume' },
    ]);

    const req = httpTesting.expectOne('/api/v1/formulas/preview');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      formulas: [{ field: 'nettoProfit', expression: '(sellPrice - buyPrice) * volume' }],
    });
    req.flush({
      formulas: [
        {
          field: 'nettoProfit',
          expression: '(sellPrice - buyPrice) * volume',
          variables: ['buyPrice', 'sellPrice', 'volume'],
          required: true,
        },
      ],
    });

    await expect(promise).resolves.toEqual([
      {
        field: 'nettoProfit',
        expression: '(sellPrice - buyPrice) * volume',
        variables: ['buyPrice', 'sellPrice', 'volume'],
        required: true,
      },
    ]);
  });
});