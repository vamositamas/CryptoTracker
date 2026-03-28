import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

@Component({
  selector: 'app-roles-admin',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './roles-admin.component.html',
})
export class RolesAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly roles = signal<Role[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly ALL_PERMISSIONS = [
    'users:manage',
    'trades:read',
    'trades:write',
    'trades:delete',
    'audit:read',
    'dashboard:read',
    'master-data:manage',
    'formulas:manage',
  ];

  showForm = false;
  editingId: string | null = null;
  formName = '';
  formSelectedPermissions: string[] = [];
  formError: string | null = null;
  formLoading = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<{ roles: Role[] }>('/api/v1/roles').subscribe({
      next: (res) => {
        this.roles.set(res.roles);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('admin.errors.loadFailed');
        this.loading.set(false);
      },
    });
  }

  hasPermission(p: string): boolean {
    return this.formSelectedPermissions.includes(p);
  }

  togglePermission(p: string): void {
    if (this.formSelectedPermissions.includes(p)) {
      this.formSelectedPermissions = this.formSelectedPermissions.filter(x => x !== p);
    } else {
      this.formSelectedPermissions = [...this.formSelectedPermissions, p];
    }
  }

  openCreate(): void {
    this.editingId = null;
    this.formName = '';
    this.formSelectedPermissions = [];
    this.formError = null;
    this.showForm = true;
  }

  openEdit(role: Role): void {
    this.editingId = role.id;
    this.formName = role.name;
    this.formSelectedPermissions = [...role.permissions];
    this.formError = null;
    this.showForm = true;
  }

  save(): void {
    this.formLoading = true;
    this.formError = null;
    const body = { name: this.formName, permissions: this.formSelectedPermissions };

    const req$ = this.editingId
      ? this.http.put<Role>(`/api/v1/roles/${this.editingId}`, body)
      : this.http.post<Role>('/api/v1/roles', body);

    req$.subscribe({
      next: () => {
        this.formLoading = false;
        this.showForm = false;
        this.load();
      },
      error: (err) => {
        this.formLoading = false;
        this.formError = err?.error?.error?.message ?? 'admin.errors.saveFailed';
      },
    });
  }

  delete(id: string): void {
    if (!confirm('Are you sure?')) return;
    this.http.delete(`/api/v1/roles/${id}`).subscribe({ next: () => this.load() });
  }
}
