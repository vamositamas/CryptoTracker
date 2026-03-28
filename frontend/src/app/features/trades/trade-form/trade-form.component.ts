import {
  Component,
  OnInit,
  HostListener,
  inject,
  signal,
  computed,
  output,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TradeService } from '../trade.service';
import { MasterDataApiService } from '../../master-data/master-data-api.service';
import { CreateTradeDto } from '../../../core/models/trade.model';
import { TradeApiError } from '../trade-api.service';

@Component({
  selector: 'app-trade-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './trade-form.component.html',
})
export class TradeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tradeService = inject(TradeService);
  private readonly masterDataApi = inject(MasterDataApiService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  @ViewChild('firstField') firstFieldRef!: ElementRef<HTMLButtonElement>;

  readonly tokens = signal<string[]>([]);
  readonly positions = signal<string[]>([]);
  readonly tradeTypes = signal<string[]>([]);
  readonly submitting = signal<boolean>(false);
  readonly submitError = signal<string | null>(null);
  readonly liveAnnouncementKey = signal<string | null>(null);
  readonly formOpenDropdown = signal<null | 'token' | 'tradePosition' | 'type'>(null);

  readonly form = this.fb.group({
    token: ['', Validators.required],
    tradePosition: ['', Validators.required],
    type: ['', Validators.required],
    brokerCost: [0, [Validators.required, Validators.min(0)]],
    leverage: [1, [Validators.required, Validators.min(0.001)]],
    volume: [null as number | null, [Validators.required, Validators.min(0.001)]],
    buyPrice: [null as number | null, [Validators.required, Validators.min(0.001)]],
    sellPrice: [null as number | null, [Validators.required, Validators.min(0.001)]],
    closeDate: ['', Validators.required],
  });

  // Non-blocking range warnings (do NOT block submission)
  readonly buyPriceWarning = computed(() => {
    const val = this.form.get('buyPrice')?.value;
    return val !== null && val !== undefined && val > 0 && val < 0.001;
  });

  readonly leverageWarning = computed(() => {
    const val = this.form.get('leverage')?.value;
    return val !== null && val !== undefined && val > 100;
  });

  async ngOnInit(): Promise<void> {
    const [tokens, positions, tradeTypes] = await Promise.all([
      this.masterDataApi.getTokens(),
      this.masterDataApi.getPositions(),
      this.masterDataApi.getTradeTypes(),
    ]);
    this.tokens.set(tokens);
    this.positions.set(positions);
    this.tradeTypes.set(tradeTypes);

    // Focus the first field after data is loaded
    setTimeout(() => this.firstFieldRef?.nativeElement?.focus(), 0);
  }

  getControl(name: string): AbstractControl | null {
    return this.form.get(name);
  }

  isInvalid(name: string): boolean {
    const ctrl = this.form.get(name);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  getError(name: string): string | null {
    const ctrl = this.form.get(name);
    if (!ctrl || !ctrl.errors || !ctrl.touched) return null;
    if (ctrl.errors['required']) return `trades.form.errors.required.${name}`;
    if (ctrl.errors['min']) return `trades.form.errors.min.${name}`;
    return 'trades.form.errors.invalid';
  }

  onSubmit(): void {
    this.liveAnnouncementKey.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const v = this.form.value;
    const dto: CreateTradeDto = {
      token: v.token!,
      type: v.type!,
      position: v.token!,
      tradePosition: v.tradePosition!,
      brokerCost: Number(v.brokerCost ?? 0),
      leverage: Number(v.leverage),
      volume: Number(v.volume),
      buyPrice: Number(v.buyPrice),
      sellPrice: Number(v.sellPrice),
      closeDate: v.closeDate!,
    };

    this.submitting.set(true);
    this.submitError.set(null);

    this.tradeService
      .createTrade(dto)
      .then(() => {
        this.form.reset({ leverage: 1, brokerCost: 0 });
        this.submitting.set(false);
        this.liveAnnouncementKey.set('trades.form.announcements.saved');
        this.saved.emit();
        // Refocus first field for next entry
        setTimeout(() => this.firstFieldRef?.nativeElement?.focus(), 0);
      })
      .catch((err: unknown) => {
        this.submitting.set(false);
        if (err instanceof TradeApiError && err.apiError.field) {
          const fieldName = err.apiError.field === 'position' ? 'token' : err.apiError.field;
          const ctrl = this.form.get(fieldName);
          ctrl?.setErrors({ serverError: err.apiError.message });
          ctrl?.markAsTouched();
        } else {
          this.submitError.set(err instanceof Error ? err.message : 'trades.form.errors.saveFailed');
        }
      });
  }

  onCancel(): void {
    this.liveAnnouncementKey.set(null);
    this.form.reset({ leverage: 1, brokerCost: 0 });
    this.cancelled.emit();
  }

  toggleFormDropdown(field: 'token' | 'tradePosition' | 'type', event: Event): void {
    event.stopPropagation();
    this.formOpenDropdown.update(current => current === field ? null : field);
  }

  isFormDropdownOpen(field: string): boolean {
    return this.formOpenDropdown() === field;
  }

  selectFormField(field: 'token' | 'tradePosition' | 'type', value: string): void {
    this.form.controls[field].setValue(value);
    this.form.controls[field].markAsTouched();
    this.formOpenDropdown.set(null);
  }

  @HostListener('document:click', ['$event'])
  onFormDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.formOpenDropdown.set(null);
    }
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    event.preventDefault();
    this.onCancel();
  }
}
