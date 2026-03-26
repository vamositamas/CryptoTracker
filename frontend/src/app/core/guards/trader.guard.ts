import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../services/user.service';

export const traderGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);
  return userService.activeTrader() !== null ? true : router.createUrlTree(['/select-trader']);
};
