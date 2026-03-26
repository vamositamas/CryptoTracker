import { Routes } from '@angular/router';
import { traderGuard } from './core/guards/trader.guard';

export const routes: Routes = [
  {
    path: 'select-trader',
    title: 'Select Trader — CryptoTracker',
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
        title: 'Dashboard — CryptoTracker',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'trades',
        title: 'Trades — CryptoTracker',
        loadComponent: () =>
          import('./features/trades/trades.component').then(m => m.TradesComponent),
      },
      {
        path: 'audit',
        title: 'Audit Trail — CryptoTracker',
        loadComponent: () =>
          import('./features/audit/audit.component').then(m => m.AuditComponent),
      },
      {
        path: 'master-data',
        title: 'Master Data — CryptoTracker',
        loadComponent: () =>
          import('./features/master-data/master-data.component').then(m => m.MasterDataComponent),
      },
    ],
  },
];

