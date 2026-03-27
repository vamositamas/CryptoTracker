import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiError, FormulaDefinition, FormulaDraft } from '../../core/models/formula.model';

export class FormulaApiError extends Error {
  constructor(
    public readonly apiError: ApiError,
    public readonly status: number,
  ) {
    super(apiError.message);
    this.name = 'FormulaApiError';
  }
}

@Injectable({ providedIn: 'root' })
export class FormulaApiService {
  private readonly http = inject(HttpClient);

  private async handleRequest<T>(request: Promise<T>): Promise<T> {
    try {
      return await request;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.error?.error) {
        throw new FormulaApiError(err.error.error as ApiError, err.status);
      }
      throw err;
    }
  }

  async list(): Promise<FormulaDefinition[]> {
    const res = await firstValueFrom(
      this.http.get<{ formulas: FormulaDefinition[] }>('/api/v1/formulas'),
    );
    return res.formulas;
  }

  async previewAll(formulas: FormulaDraft[]): Promise<FormulaDefinition[]> {
    return this.handleRequest(
      firstValueFrom(
        this.http.post<{ formulas: FormulaDefinition[] }>('/api/v1/formulas/preview', { formulas }),
      ),
    ).then((res) => res.formulas);
  }

  async saveAll(formulas: FormulaDraft[]): Promise<FormulaDefinition[]> {
    return this.handleRequest(
      firstValueFrom(
        this.http.put<{ formulas: FormulaDefinition[] }>('/api/v1/formulas', { formulas }),
      ),
    ).then((res) => res.formulas);
  }
}