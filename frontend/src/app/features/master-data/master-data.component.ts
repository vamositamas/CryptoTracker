import { Component, computed, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MasterDataConfig } from '../../core/models/master-data.model';
import { MasterDataTableComponent } from './master-data-table.component';

@Component({
  selector: 'app-master-data',
  standalone: true,
  imports: [TranslatePipe, MasterDataTableComponent],
  templateUrl: './master-data.component.html',
})
export class MasterDataComponent {
  readonly tabs: MasterDataConfig[] = [
    {
      type: 'tokens',
      tabLabel: 'masterData.tabs.tokens',
      singularLabel: 'token',
      fieldLabel: 'masterData.fields.token',
      emptyLabel: 'masterData.empty.tokens',
      addLabel: 'masterData.actions.addToken',
    },
    {
      type: 'trade-types',
      tabLabel: 'masterData.tabs.tradeTypes',
      singularLabel: 'trade type',
      fieldLabel: 'masterData.fields.tradeType',
      emptyLabel: 'masterData.empty.tradeTypes',
      addLabel: 'masterData.actions.addTradeType',
    },
    {
      type: 'positions',
      tabLabel: 'masterData.tabs.positions',
      singularLabel: 'position',
      fieldLabel: 'masterData.fields.position',
      emptyLabel: 'masterData.empty.positions',
      addLabel: 'masterData.actions.addPosition',
    },
  ];

  readonly activeTab = signal(this.tabs[0]);
  readonly pageDescriptionKey = computed(() => {
    switch (this.activeTab().type) {
      case 'tokens':
        return 'masterData.description.tokens';
      case 'trade-types':
        return 'masterData.description.tradeTypes';
      case 'positions':
      default:
        return 'masterData.description.positions';
    }
  });

  setActiveTab(config: MasterDataConfig): void {
    this.activeTab.set(config);
  }
}
