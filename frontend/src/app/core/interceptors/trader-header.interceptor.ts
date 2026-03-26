import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { UserService } from '../services/user.service';

export const traderHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  const trader = inject(UserService).activeTrader();
  if (trader) {
    return next(req.clone({ setHeaders: { 'X-Trader-Username': trader } }));
  }
  return next(req);
};
