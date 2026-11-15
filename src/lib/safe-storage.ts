/**
 * Обёртка над `localStorage` (SPEC 6.5): любое обращение в try/catch.
 * Если хранилище недоступно (SSR, приватный режим iOS, переполнение), данные живут в памяти,
 * а `persistent` становится `false` — UI показывает баннер «прогресс не сохранится».
 */

/** Минимальная часть `Storage`, которая нужна обёртке. */
export type StorageBackend = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type SafeStorage = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  /** `false` — данные не переживут перезагрузку страницы. */
  readonly persistent: boolean;
};

const PROBE_KEY = 'twow:probe';

function probe(getBackend: () => StorageBackend | undefined): StorageBackend | undefined {
  try {
    const backend = getBackend();
    if (!backend) return undefined;
    backend.setItem(PROBE_KEY, '1');
    backend.removeItem(PROBE_KEY);
    return backend;
  } catch {
    return undefined;
  }
}

export function createSafeStorage(
  getBackend: () => StorageBackend | undefined = () => globalThis.localStorage,
): SafeStorage {
  let backend = probe(getBackend);
  // Копия всего прочитанного и записанного: после сбоя backend данные сессии не теряются.
  const memory = new Map<string, string>();

  /** Выполнить операцию с backend; при исключении — навсегда перейти в память. */
  function tryBackend(op: (b: StorageBackend) => void): void {
    if (!backend) return;
    try {
      op(backend);
    } catch {
      backend = undefined;
    }
  }

  return {
    get(key) {
      tryBackend((b) => {
        const value = b.getItem(key);
        if (value === null) memory.delete(key);
        else memory.set(key, value);
      });
      return memory.get(key) ?? null;
    },
    set(key, value) {
      memory.set(key, value);
      tryBackend((b) => b.setItem(key, value));
    },
    remove(key) {
      memory.delete(key);
      tryBackend((b) => b.removeItem(key));
    },
    get persistent() {
      return backend !== undefined;
    },
  };
}
