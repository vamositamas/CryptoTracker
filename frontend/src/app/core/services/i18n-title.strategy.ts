import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class I18nTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);

  updateTitle(snapshot: RouterStateSnapshot): void {
    const titleKey = this.buildTitle(snapshot);
    if (!titleKey) {
      return;
    }

    const pageTitle = this.translate.instant(titleKey);
    const appName = this.translate.instant('shell.appName');
    this.title.setTitle(`${pageTitle} - ${appName}`);
  }
}
