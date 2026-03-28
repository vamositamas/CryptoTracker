import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

interface GroupWithRoles {
  id: string;
  name: string;
  roleIds: string[];
  roles: Role[];
}

@Component({
  selector: 'app-groups-admin',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './groups-admin.component.html',
})
export class GroupsAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly groups = signal<GroupWithRoles[]>([]);
  readonly allRoles = signal<Role[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  showForm = false;
  editingId: string | null = null;
  formName = '';
  formRoleIds: string[] = [];
  formError: string | null = null;
  formLoading = false;

  ngOnInit(): void {
    this.load();
    this.http.get<{ roles: Role[] }>('/api/v1/roles').subscribe({
      next: (res) => this.allRoles.set(res.roles),
    });
  }

  load(): void {
    this.loading.set(true);
    this.http.get<{ groups: GroupWithRoles[] }>('/api/v1/groups').subscribe({
      next: (res) => {
        this.groups.set(res.groups);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('admin.errors.loadFailed');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.formName = '';
    this.formRoleIds = [];
    this.formError = null;
    this.showForm = true;
  }

  openEdit(group: GroupWithRoles): void {
    this.editingId = group.id;
    this.formName = group.name;
    this.formRoleIds = [...group.roleIds];
    this.formError = null;
    this.showForm = true;
  }

  toggleRole(roleId: string): void {
    const idx = this.formRoleIds.indexOf(roleId);
    if (idx === -1) {
      this.formRoleIds = [...this.formRoleIds, roleId];
    } else {
      this.formRoleIds = this.formRoleIds.filter((id) => id !== roleId);
    }
  }

  save(): void {
    this.formLoading = true;
    this.formError = null;
    const body = { name: this.formName, roleIds: this.formRoleIds };

    const req$ = this.editingId
      ? this.http.put<GroupWithRoles>(`/api/v1/groups/${this.editingId}`, body)
      : this.http.post<GroupWithRoles>('/api/v1/groups', body);

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
    this.http.delete(`/api/v1/groups/${id}`).subscribe({ next: () => this.load() });
  }
}
