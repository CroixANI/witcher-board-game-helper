// Панель «Не забудь» (SPEC 4.2, 8.9; ROADMAP R3.4): кнопка в баре wizard'а хода и нижняя панель
// на общем `BottomSheet` — `Esc` и фокус-ловушка нативные, при закрытии фокус возвращается на кнопку.
// Пункты текущей фазы помечены «сейчас».
import { useRef, useState } from 'preact/hooks';
import { formatPages } from '../lib/reference';
import { url } from '../lib/url';
import type { Phase, ReminderView } from '../lib/wizard-view';
import { BottomSheet } from './BottomSheet';
import './ReminderSheet.css';

const TITLE_ID = 'reminder-sheet-title';

interface Props {
  reminders: readonly ReminderView[];
  /** Фаза текущего узла: её пункты помечаются. */
  phase: Phase;
}

export function ReminderSheet({ reminders, phase }: Props) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        class="wizard-bar__button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        ⚑<span class="visually-hidden"> Не забудь</span>
      </button>
      <BottomSheet open={open} onClose={close} labelledBy={TITLE_ID} class="reminder-sheet">
        <h2 id={TITLE_ID}>Не забудь</h2>
        <ul class="reminder-sheet__list">
          {reminders.map((r) => {
            const now = phase !== 'general' && r.phases.includes(phase);
            return (
              <li key={r.id} class={now ? 'reminder reminder--now' : 'reminder'}>
                {now && <span class="reminder__now">сейчас</span>}
                <p>{r.text}</p>
                <p class="reminder__meta">
                  <a href={url(`rules/${r.rule.id}`)}>{r.rule.title}</a> · {formatPages(r.page)}
                </p>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}
