import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'routeTitles.login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'routeTitles.register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
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
      {
        path: 'admin',
        children: [
          {
            path: 'users',
            title: 'routeTitles.adminUsers',
            loadComponent: () =>
              import('./features/admin/users/users-admin.component').then(m => m.UsersAdminComponent),
          },
          {
            path: 'groups',
            title: 'routeTitles.adminGroups',
            loadComponent: () =>
              import('./features/admin/groups/groups-admin.component').then(m => m.GroupsAdminComponent),
          },
          {
            path: 'roles',
            title: 'routeTitles.adminRoles',
            loadComponent: () =>
              import('./features/admin/roles/roles-admin.component').then(m => m.RolesAdminComponent),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];


