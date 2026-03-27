import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { importProvidersFrom } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { traderHeaderInterceptor } from './core/interceptors/trader-header.interceptor';
import { routes } from './app.routes';
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { I18nTitleStrategy } from './core/services/i18n-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([traderHeaderInterceptor])),
    importProvidersFrom(
      TranslateModule.forRoot({
        fallbackLang: 'en',
      }),
    ),
    ...provideTranslateHttpLoader({
      prefix: '/i18n/',
      suffix: '.json',
    }),
    { provide: TitleStrategy, useClass: I18nTitleStrategy },
  ],
};
