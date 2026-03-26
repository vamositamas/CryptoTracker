import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  output,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { TradeService } from '../trade.service';
import { MasterDataApiService } from '../../master-data/master-data-api.service';
import { CreateTradeDto } from '../../../core/models/trade.model';
import { TradeApiError } from '../trade-api.service';

@Component({
  selector: 'app-trade-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './trade-form.component.html',
})
export class TradeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tradeService = inject(TradeService);
  private readonly masterDataApi = inject(MasterDataApiService);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  @ViewChild('firstField') firstFieldRef!: ElementRef<HTMLSelectElement>;

  readonly tokens = signal<string[]>([]);
  readonly tradeTypes = signal<string[]>([]);
  readonly submitting = signal<boolean>(false);
  readonly submitError = signal<string | null>(null);

  readonly form = this.fb.group({
    position: ['', Validators.required],
    type: ['', Validators.required],
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
    const [tokens, tradeTypes] = await Promise.all([
      this.masterDataApi.getTokens(),
      this.masterDataApi.getTradeTypes(),
    ]);
    this.tokens.set(tokens);
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
    if (ctrl.errors['required']) return `${this.fieldLabel(name)} is required`;
    if (ctrl.errors['min']) return `${this.fieldLabel(name)} must be greater than 0`;
    return 'Invalid value';
  }

  private fieldLabel(name: string): string {
    const labels: Record<string, string> = {
      position: 'Token',
      type: 'Trade type',
      leverage: 'Leverage',
      volume: 'Volume',
      buyPrice: 'Buy price',
      sellPrice: 'Sell price',
      closeDate: 'Close date',
    };
    return labels[name] ?? name;
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const v = this.form.value;
    const dto: CreateTradeDto = {
      type: v.type!,
      position: v.position!,
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
        this.form.reset({ leverage: 1 });
        this.submitting.set(false);
        this.saved.emit();
        // Refocus first field for next entry
        setTimeout(() => this.firstFieldRef?.nativeElement?.focus(), 0);
      })
      .catch((err: unknown) => {
        this.submitting.set(false);
        if (err instanceof TradeApiError && err.apiError.field) {
          const ctrl = this.form.get(err.apiError.field);
          ctrl?.setErrors({ serverError: err.apiError.message });
          ctrl?.markAsTouched();
        } else {
          this.submitError.set(err instanceof Error ? err.message : 'Failed to save trade.');
        }
      });
  }

  onCancel(): void {
    this.form.reset({ leverage: 1 });
    this.cancelled.emit();
  }
}
