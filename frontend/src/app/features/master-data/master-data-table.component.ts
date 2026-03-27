import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MasterDataConfig, MasterDataEntry, MasterDataToken } from '../../core/models/master-data.model';
import { MasterDataApiError, MasterDataApiService } from './master-data-api.service';

const NEW_ROW_ID = '__new__';

@Component({
  selector: 'app-master-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './master-data-table.component.html',
})
export class MasterDataTableComponent {
  private readonly api = inject(MasterDataApiService);

  readonly config = input.required<MasterDataConfig>();

  readonly entries = signal<MasterDataEntry[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly inlineError = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly deleteConfirmId = signal<string | null>(null);

  draftValue = '';

  readonly isAdding = computed(() => this.editingId() === NEW_ROW_ID);

  constructor() {
    effect(() => {
      this.config().type;
      this.cancelEdit();
      this.cancelDeleteConfirm();
      void this.loadEntries();
    });
  }

  async loadEntries(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const entries = await this.api.list(this.config().type);
      this.entries.set(entries);
    } catch {
      this.error.set('masterData.errors.loadFailed');
    } finally {
      this.loading.set(false);
    }
  }

  displayValue(entry: MasterDataEntry): string {
    if (this.config().type === 'tokens') {
      const token = entry as MasterDataToken;
      return token.symbol ?? token.id;
    }
    return entry.name ?? entry.id;
  }

  secondaryValue(entry: MasterDataEntry): string | null {
    if (this.config().type !== 'tokens') {
      return null;
    }
    const token = entry as MasterDataToken;
    if (token.name && token.name.toLowerCase() !== (token.symbol ?? token.id).toLowerCase()) {
      return token.name;
    }
    return null;
  }

  startAdd(): void {
    this.editingId.set(NEW_ROW_ID);
    this.inlineError.set(null);
    this.deleteConfirmId.set(null);
    this.draftValue = '';
  }

  startEdit(entry: MasterDataEntry): void {
    this.editingId.set(entry.id);
    this.inlineError.set(null);
    this.deleteConfirmId.set(null);
    this.draftValue = this.displayValue(entry);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.inlineError.set(null);
    this.draftValue = '';
  }

  openDeleteConfirm(entryId: string): void {
    this.deleteConfirmId.set(entryId);
  }

  cancelDeleteConfirm(): void {
    this.deleteConfirmId.set(null);
  }

  async saveEdit(): Promise<void> {
    if (this.saving()) {
      return;
    }

    const value = this.draftValue.trim();
    if (!value) {
      this.inlineError.set('masterData.errors.fieldRequired');
      return;
    }

    this.saving.set(true);
    this.inlineError.set(null);
    this.error.set(null);

    try {
      if (this.isAdding()) {
        const created = await this.api.create(this.config().type, value);
        this.entries.update((entries) => [...entries, created]);
      } else {
        const currentId = this.editingId();
        if (!currentId) {
          return;
        }
        const updated = await this.api.update(this.config().type, currentId, value);
        this.entries.update((entries) => entries.map((entry) => entry.id === currentId ? updated : entry));
      }
      this.cancelEdit();
    } catch (err) {
      if (err instanceof MasterDataApiError && err.apiError.field === 'name') {
        this.inlineError.set(err.apiError.message);
      } else {
        this.error.set('masterData.errors.saveFailed');
      }
    } finally {
      this.saving.set(false);
    }
  }

  async confirmDelete(entryId: string): Promise<void> {
    this.deletingId.set(entryId);
    this.error.set(null);
    try {
      await this.api.delete(this.config().type, entryId);
      this.entries.update((entries) => entries.filter((entry) => entry.id !== entryId));
      this.deleteConfirmId.set(null);
    } catch {
      this.error.set('masterData.errors.deleteFailed');
    } finally {
      this.deletingId.set(null);
    }
  }

  onEditorKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      void this.saveEdit();
    }
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (!this.editingId() && !this.deleteConfirmId()) {
      return;
    }

    event.preventDefault();
    if (this.editingId()) {
      this.cancelEdit();
    }
    if (this.deleteConfirmId()) {
      this.cancelDeleteConfirm();
    }
  }
}