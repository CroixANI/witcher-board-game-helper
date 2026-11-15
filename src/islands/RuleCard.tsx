// Preact-версия свёрнутой карточки правила (SPEC 4.4) для wizard'ов. Разметка и стили — как у
// RuleCard.astro; тело правила приходит готовым HTML (Markdown рендерится на этапе сборки).
import { formatPages } from '../lib/reference';
import { url } from '../lib/url';
import type { RuleView } from '../lib/wizard-view';
import '../styles/rule-card.css';

export function RuleCard({ rule }: { rule: RuleView }) {
  return (
    <details class={rule.important ? 'rule-card rule-card--important' : 'rule-card'}>
      <summary>
        <span class="rule-card__title">{rule.title}</span>
        <span class="rule-card__pages">{formatPages(rule.page)}</span>
      </summary>
      <div class="rule-card__body">
        {rule.important && <p class="rule-card__badge">Важно</p>}
        <p class="rule-card__summary">{rule.summary}</p>
        <div dangerouslySetInnerHTML={{ __html: rule.html }} />
        <p class="rule-card__permalink">
          <a href={url(`rules/${rule.id}`)}>Отдельная страница правила</a>
        </p>
      </div>
    </details>
  );
}
