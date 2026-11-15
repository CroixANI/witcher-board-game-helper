// Нижняя панель на `<dialog>` + `showModal()` (SPEC 11.5.4): фокус-ловушка и `Esc` — нативные.
// Переиспользуется панелью «Не забудь» (R3.4).
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import './BottomSheet.css';

interface Props {
  open: boolean;
  /** Панель закрылась: `Esc`, «Закрыть» или тап по фону. */
  onClose: () => void;
  /** id заголовка внутри панели. */
  labelledBy: string;
  class?: string;
  children?: ComponentChildren;
}

export function BottomSheet({ open, onClose, labelledBy, class: className, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      class={className === undefined ? 'bottom-sheet' : `bottom-sheet ${className}`}
      aria-labelledby={labelledBy}
      onClose={onClose}
      // Тап по фону: у `<dialog>` нет своего «backdrop click», а содержимое лежит во внутреннем блоке.
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div class="bottom-sheet__body">
        <button type="button" class="bottom-sheet__close" onClick={close}>
          Закрыть
        </button>
        {children}
      </div>
    </dialog>
  );
}
