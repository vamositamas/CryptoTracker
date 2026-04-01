import { APP_INITIALIZER, ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { importProvidersFrom } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { routes } from './app.routes';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { I18nTitleStrategy } from './core/services/i18n-title.strategy';
import { LanguageService } from './core/services/language.service';
import { firstValueFrom } from 'rxjs';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(
      TranslateModule.forRoot({
        fallbackLang: 'en',
      }),
    ),
    ...provideTranslateHttpLoader({
      prefix: '/i18n/',
      suffix: '.json?v=20260401-2',
    }),
    { provide: TitleStrategy, useClass: I18nTitleStrategy },
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const lang = inject(LanguageService).language();
        const translate = inject(TranslateService);
        return () => firstValueFrom(translate.use(lang));
      },
      multi: true,
    },
  ],
};
