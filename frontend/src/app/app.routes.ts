import { Routes } from '@angular/router';
import { traderGuard } from './core/guards/trader.guard';

export const routes: Routes = [
  {
    path: 'select-trader',
    title: 'routeTitles.selectTrader',
    loadComponent: () =>
      import('./features/user-selector/user-selector.component').then(m => m.UserSelectorComponent),
  },
  {
    path: '',
    canActivate: [traderGuard],
    loadComponent: () =>
      import('./core/shell/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        title: 'routeTitles.dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'trades',
        title: 'routeTitles.trades',
        loadComponent: () =>
          import('./features/trades/trades.component').then(m => m.TradesComponent),
      },
      {
        path: 'audit',
        title: 'routeTitles.audit',
        loadComponent: () =>
          import('./features/audit/audit.component').then(m => m.AuditComponent),
      },
      {
        path: 'master-data',
        title: 'routeTitles.masterData',
        loadComponent: () =>
          import('./features/master-data/master-data.component').then(m => m.MasterDataComponent),
      },
      {
        path: 'formulas',
        title: 'routeTitles.formulas',
        loadComponent: () =>
          import('./features/formulas/formulas.component').then(m => m.FormulasComponent),
      },
    ],
  },
];

