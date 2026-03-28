import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

interface PublicUser {
  id: string;
  email: string;
  username: string;
  groupId: string;
  active: boolean;
  createdAt: string;
}

interface Group {
  id: string;
  name: string;
}

@Component({
  selector: 'app-users-admin',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './users-admin.component.html',
})
export class UsersAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly users = signal<PublicUser[]>([]);
  readonly groups = signal<Group[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Create / edit form
  showForm = false;
  editingId: string | null = null;
  formEmail = '';
  formUsername = '';
  formPassword = '';
  formGroupId = '';
  formActive = true;
  formError: string | null = null;
  formLoading = false;

  ngOnInit(): void {
    this.load();
    this.http.get<{ groups: Group[] }>('/api/v1/groups').subscribe({
      next: (res) => this.groups.set(res.groups),
    });
  }

  load(): void {
    this.loading.set(true);
    this.http.get<{ users: PublicUser[] }>('/api/v1/users').subscribe({
      next: (res) => {
        this.users.set(res.users);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('admin.errors.loadFailed');
        this.loading.set(false);
      },
    });
  }

  groupName(groupId: string): string {
    return this.groups().find(g => g.id === groupId)?.name ?? groupId;
  }

  openCreate(): void {
    this.editingId = null;
    this.formEmail = '';
    this.formUsername = '';
    this.formPassword = '';
    this.formGroupId = this.groups()[0]?.id ?? '';
    this.formActive = true;
    this.formError = null;
    this.showForm = true;
  }

  openEdit(user: PublicUser): void {
    this.editingId = user.id;
    this.formEmail = user.email;
    this.formUsername = user.username;
    this.formPassword = '';
    this.formGroupId = user.groupId;
    this.formActive = user.active;
    this.formError = null;
    this.showForm = true;
  }

  save(): void {
    this.formLoading = true;
    this.formError = null;
    const body: Record<string, unknown> = {
      email: this.formEmail,
      username: this.formUsername,
      groupId: this.formGroupId,
      active: this.formActive,
    };
    if (this.formPassword) body['password'] = this.formPassword;

    const req$ = this.editingId
      ? this.http.put<PublicUser>(`/api/v1/users/${this.editingId}`, body)
      : this.http.post<PublicUser>('/api/v1/users', { ...body, password: this.formPassword });

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
    this.http.delete(`/api/v1/users/${id}`).subscribe({ next: () => this.load() });
  }
}
