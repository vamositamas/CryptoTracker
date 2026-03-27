import { EnvironmentProviders, importProvidersFrom } from '@angular/core';
import { TranslateLoader, TranslateModule, TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

const EN_TRANSLATIONS = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Are you sure?',
    dash: '-',
  },
  dashboard: {
    title: 'Dashboard',
    errors: {
      loadFailed: 'Failed to load dashboard data. Please try again.',
    },
    empty: {
      description: 'No trades yet - start tracking to see your dashboard',
      goToTrades: 'Go to Trades ->',
    },
    viewMode: {
      label: 'View',
      all: 'All data',
      year: 'Selected year',
      yearSelect: 'Select year',
    },
    kpis: {
      totalTrades: 'Total Trades',
      totalNetProfit: 'Total Net Profit',
      bestSingleTrade: 'Best Single Trade',
      winRate: 'Win Rate',
    },
    monthly: {
      title: 'Monthly Performance',
      empty: 'No monthly data available yet',
      columns: {
        month: 'Month',
        trades: 'Trades',
        netProfit: 'Net Profit',
        winRate: 'Win Rate',
      },
    },
  },
  trades: {
    title: 'Trades',
    newTrade: '+ New Trade',
    newTradeWithShortcut: 'New trade (N)',
    errors: {
      loadFailed: 'Failed to load trades. Please try again.',
      updateFailed: 'Failed to update trade. Please try again.',
      notFound: 'Trade not found. Please refresh and try again.',
    },
    toasts: {
      deleteFailed: 'Failed to delete trade. Please try again.',
    },
    import: {
      title: 'Excel import',
      description: 'Import your historical trades from the first worksheet of an Excel file that matches your old trading export columns.',
      success: 'Imported {{count}} trades from {{fileName}}.',
      errors: {
        failed: 'Failed to import trades. Please try again.',
      },
      actions: {
        import: 'Import Excel',
        importing: 'Importing...',
        template: 'Download template',
      },
    },
    filters: {
      title: 'Filters',
      token: 'Token',
      tokenAll: 'All tokens',
      tradePosition: 'Position',
      tradePositionAll: 'All positions',
      typeAll: 'All types',
      type: 'Type',
      from: 'From',
      to: 'To',
      tokenPlaceholder: 'e.g. BTC',
      typePlaceholder: 'e.g. long',
      searchPlaceholder: 'Search token...',
      result: 'Result',
      resultAll: 'All results',
      resultWin: 'Win',
      resultLoss: 'Loss',
      clearAll: 'Clear filters',
    },
    stats: {
      total: 'Total Trades',
      wins: 'Wins',
      losses: 'Losses',
      today: 'Today',
    },
    form: {
      title: 'New Trade',
      fields: {
        position: 'Token',
        tradePosition: 'Position',
        type: 'Trade Type',
        brokerCost: 'Broker Cost (USDT)',
        leverage: 'Leverage',
        volume: 'Volume',
        buyPrice: 'Buy Price (USDT)',
        sellPrice: 'Sell Price (USDT)',
        closeDate: 'Close Date',
      },
      placeholders: {
        position: 'Select token...',
        tradePosition: 'Select position...',
        type: 'Select type...',
      },
      empty: {
        tokens: 'No tokens configured - add in Master Data',
        positions: 'No positions configured - add in Master Data',
        types: 'No trade types configured - add in Master Data',
      },
      warnings: {
        leverageHigh: 'Leverage above 100x is unusually high.',
        buyPriceLow: 'Buy price is unusually low - please verify.',
      },
      actions: {
        save: 'Save Trade',
        saving: 'Saving...',
        cancel: 'Cancel',
        hotkey: 'Ctrl+Enter to save',
      },
      announcements: {
        saved: 'Trade saved',
      },
      errors: {
        invalid: 'Invalid value',
        saveFailed: 'Failed to save trade.',
        required: {
          token: 'Token is required',
          position: 'Token is required',
          tradePosition: 'Position is required',
          type: 'Trade type is required',
          brokerCost: 'Broker cost is required',
          leverage: 'Leverage is required',
          volume: 'Volume is required',
          buyPrice: 'Buy price is required',
          sellPrice: 'Sell price is required',
          closeDate: 'Close date is required',
        },
        min: {
          brokerCost: 'Broker cost must be 0 or greater',
          leverage: 'Leverage must be greater than 0',
          volume: 'Volume must be greater than 0',
          buyPrice: 'Buy price must be greater than 0',
          sellPrice: 'Sell price must be greater than 0',
        },
      },
    },
    table: {
      columns: {
        closeDate: 'Close Date',
        position: 'Token',
        tradePosition: 'Position',
        type: 'Type',
        brokerCost: 'Cost',
        leverage: 'Leverage',
        volume: 'Volume',
        buyPrice: 'Buy Price',
        sellPrice: 'Sell Price',
        netProfit: 'Net Profit',
        profitPercent: 'Profit %',
        dailyNetProfit: 'Daily Net Profit',
        dailyProfitPercent: 'Daily Profit %',
        result: 'Result',
      },
      empty: {
        withFilters: 'No trades match your filters.',
        withoutFilters: 'No trades recorded yet.',
      },
      actions: {
        clearFilters: 'Clear filters',
        addFirst: 'Add your first trade ->',
        deleteTrade: 'Delete trade',
        deleteTradeFor: 'Delete trade {{position}} closed on {{closeDate}}',
        editTradeFor: 'Edit trade {{position}} closed on {{closeDate}}',
      },
      result: {
        win: 'Win',
        loss: 'Loss',
      },
      edit: {
        errors: {
          required: {
            token: 'Token is required',
            type: 'Trade type is required',
            position: 'Token is required',
            tradePosition: 'Position is required',
            closeDate: 'Close date is required',
          },
          min: {
            brokerCost: 'Broker cost must be 0 or greater',
            leverage: 'Leverage must be greater than 0',
            volume: 'Volume must be greater than 0',
            buyPrice: 'Buy price must be greater than 0',
            sellPrice: 'Sell price must be greater than 0',
          },
        },
      },
    },
  },
  routeTitles: {
    selectTrader: 'Select Trader',
    dashboard: 'Dashboard',
    trades: 'Trades',
    audit: 'Audit Trail',
    masterData: 'Master Data',
    formulas: 'Formulas',
  },
  formulas: {
    title: 'Calculation Formulas',
    description: 'Edit formulas',
    guide: {
      title: 'Formula rules',
      description: 'Expressions use expr-eval syntax.',
      variables: 'Common variables',
    },
    actions: {
      reload: 'Reload',
      save: 'Save formulas',
      saving: 'Saving...',
      add: 'Add formula',
      remove: 'Remove',
      confirmRemove: 'Delete',
    },
    status: {
      unsaved: 'You have unsaved formula changes.',
      saved: 'All formula changes are saved.',
    },
    table: {
      columns: {
        field: 'Field',
        expression: 'Expression',
        variables: 'Variables',
        actions: 'Actions',
      },
      requiredBadge: 'Required',
      variablesPending: 'Recomputed after save',
    },
    errors: {
      loadFailed: 'Failed to load formulas. Please try again.',
      saveFailed: 'Failed to save formulas. Please try again.',
      fieldRequired: 'Field name is required',
      expressionRequired: 'Expression is required',
      duplicateField: 'Field names must be unique',
      invalidField: 'Field names must start with a letter and use only letters, numbers, or underscores',
    },
    preview: {
      loading: 'Checking formulas...',
      valid: 'Preview is valid. Variables are up to date.',
      failed: 'Preview failed. Fix the formula before saving.',
      fixValidation: 'Resolve the highlighted formula issues to preview changes.',
    },
  },
  masterData: {
    title: 'Master Data',
    tabAria: 'Master data tabs',
    tabs: {
      tokens: 'Tokens',
      tradeTypes: 'Trade Types',
      positions: 'Positions',
    },
    fields: {
      token: 'Token',
      tradeType: 'Trade Type',
      position: 'Position',
    },
    singular: {
      tokens: 'token',
      'trade-types': 'trade type',
      positions: 'position',
    },
    description: {
      tokens: 'Manage shared token values for the whole team.',
      tradeTypes: 'Manage shared trade type values for the whole team.',
      positions: 'Manage shared position values for the whole team.',
    },
    empty: {
      tokens: 'No tokens configured',
      tradeTypes: 'No trade types configured',
      positions: 'No positions configured',
    },
    actions: {
      addToken: 'Add token',
      addTradeType: 'Add trade type',
      addPosition: 'Add position',
    },
    table: {
      description: 'Manage the shared {{singular}} list.',
      actions: 'Actions',
      editItem: 'Edit {{value}}',
      deleteItem: 'Delete {{value}}',
    },
    errors: {
      loadFailed: 'Failed to load master data. Please try again.',
      saveFailed: 'Failed to save master data. Please try again.',
      deleteFailed: 'Failed to delete master data. Please try again.',
      fieldRequired: 'Value is required',
    },
  },
  audit: {
    title: 'Audit Trail',
    loading: 'Loading audit trail...',
    loadingAria: 'Loading audit trail',
    actions: {
      create: 'CREATE',
      update: 'UPDATE',
      delete: 'DELETE',
    },
    errors: {
      loadFailed: 'Failed to load audit trail. Please try again.',
    },
    filters: {
      action: 'Action',
      allActions: 'All actions',
      fromDate: 'From date',
      toDate: 'To date',
      clear: 'Clear filters',
    },
    empty: {
      withFilters: 'No audit entries match the current filters.',
      withoutFilters: 'No audit entries yet.',
    },
    table: {
      aria: 'Audit trail',
      columns: {
        timestamp: 'Timestamp',
        trader: 'Trader',
        action: 'Action',
        tradeId: 'Trade ID',
        field: 'Field',
        oldValue: 'Old Value',
        newValue: 'New Value',
      },
      rowCount: '{{count}} entries',
    },
  },
};

class StaticTranslateLoader implements TranslateLoader {
  getTranslation(_lang: string): Observable<TranslationObject> {
    return of(EN_TRANSLATIONS);
  }
}

export function provideTranslateTesting(): EnvironmentProviders[] {
  return [
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useClass: StaticTranslateLoader },
        fallbackLang: 'en',
      }),
    ),
  ];
}
