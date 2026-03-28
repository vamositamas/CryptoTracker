import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

export interface JwtPayload {
  id: string;
  email: string;
  username: string;
  groupId: string;
  permissions: string[];
  iat: number;
  exp: number;
}

interface AuthResponse {
  token: string;
  user: { id: string; email: string; username: string; groupId: string; active: boolean; createdAt: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenKey = 'jwt';

  private readonly _currentUser = signal<JwtPayload | null>(this.loadFromStorage());
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);

  private loadFromStorage(): JwtPayload | null {
    if (typeof localStorage === 'undefined') return null;
    const token = localStorage.getItem(this.tokenKey);
    if (!token) return null;
    return this.decodeToken(token);
  }

  private decodeToken(token: string): JwtPayload | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]!)) as JwtPayload;
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(this.tokenKey);
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.tokenKey);
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>('/api/v1/auth/login', { email, password })
      .pipe(tap((res) => this.storeToken(res.token)));
  }

  register(email: string, username: string, password: string) {
    return this.http
      .post<AuthResponse>('/api/v1/auth/register', { email, username, password })
      .pipe(tap((res) => this.storeToken(res.token)));
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
    }
    this._currentUser.set(null);
  }

  hasPermission(permission: string): boolean {
    return this._currentUser()?.permissions.includes(permission) ?? false;
  }

  private storeToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this._currentUser.set(this.decodeToken(token));
  }
}
