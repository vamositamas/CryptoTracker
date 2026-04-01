import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MasterDataApiService } from './master-data-api.service';

describe('MasterDataApiService', () => {
  let service: MasterDataApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MasterDataApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('maps token objects to symbol values', async () => {
    const promise = service.getTokens();

    const req = httpTesting.expectOne('/api/v1/master-data/tokens');
    expect(req.request.method).toBe('GET');
    req.flush({ tokens: [{ id: 'BTC', symbol: 'BTC', name: 'Bitcoin' }, { id: 'ETH', symbol: 'ETH', name: 'Ethereum' }] });

    await expect(promise).resolves.toEqual(['BTC', 'ETH']);
  });

  it('lists full token entries for the admin UI', async () => {
    const promise = service.list('tokens');

    const req = httpTesting.expectOne('/api/v1/master-data/tokens');
    expect(req.request.method).toBe('GET');
    req.flush({ tokens: [{ id: 'BTC', symbol: 'BTC', name: 'Bitcoin' }] });

    await expect(promise).resolves.toEqual([{ id: 'BTC', symbol: 'BTC', name: 'Bitcoin' }]);
  });

  it('maps trade type objects to ids', async () => {
    const promise = service.getTradeTypes();

    const req = httpTesting.expectOne('/api/v1/master-data/trade-types');
    expect(req.request.method).toBe('GET');
    req.flush({ tradeTypes: [{ id: 'spot', name: 'Spot' }, { id: 'futures', name: 'Futures' }] });

    await expect(promise).resolves.toEqual(['spot', 'futures']);
  });

  it('maps position objects to ids', async () => {
    const promise = service.getPositions();

    const req = httpTesting.expectOne('/api/v1/master-data/positions');
    expect(req.request.method).toBe('GET');
    req.flush({ positions: [{ id: 'long', name: 'Long' }, { id: 'short', name: 'Short' }] });

    await expect(promise).resolves.toEqual(['long', 'short']);
  });

  it('creates a token using name and symbol payloads', async () => {
    const promise = service.create('tokens', { symbol: 'SEI', name: 'Sei' });

    const req = httpTesting.expectOne('/api/v1/master-data/tokens');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Sei', symbol: 'SEI' });
    req.flush({ id: 'SEI', symbol: 'SEI', name: 'Sei' });

    await expect(promise).resolves.toEqual({ id: 'SEI', symbol: 'SEI', name: 'Sei' });
  });

  it('updates a trade type with a name payload', async () => {
    const promise = service.update('trade-types', 'spot', 'Spot Trading');

    const req = httpTesting.expectOne('/api/v1/master-data/trade-types/spot');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Spot Trading' });
    req.flush({ id: 'spot', name: 'Spot Trading' });

    await expect(promise).resolves.toEqual({ id: 'spot', name: 'Spot Trading' });
  });

  it('deletes a position entry', async () => {
    const promise = service.delete('positions', 'long');

    const req = httpTesting.expectOne('/api/v1/master-data/positions/long');
    expect(req.request.method).toBe('DELETE');
    req.flush({ deleted: true });

    await expect(promise).resolves.toBeUndefined();
  });
});