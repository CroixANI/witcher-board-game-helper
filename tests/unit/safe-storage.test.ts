import { describe, expect, it, vi } from 'vitest';
import { createSafeStorage, type StorageBackend } from '../../src/lib/safe-storage';

function mapBackend(): StorageBackend & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const throwing: StorageBackend = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

describe('safeStorage: рабочее хранилище', () => {
  it('пишет, читает и удаляет через backend', () => {
    const backend = mapBackend();
    const storage = createSafeStorage(() => backend);
    expect(storage.persistent).toBe(true);
    storage.set('k', 'v');
    expect(backend.data.get('k')).toBe('v');
    expect(storage.get('k')).toBe('v');
    storage.remove('k');
    expect(storage.get('k')).toBeNull();
  });

  it('проба не оставляет следов', () => {
    const backend = mapBackend();
    createSafeStorage(() => backend);
    expect(backend.data.size).toBe(0);
  });

  it('по умолчанию берёт globalThis.localStorage', () => {
    const backend = mapBackend();
    vi.stubGlobal('localStorage', backend);
    try {
      const storage = createSafeStorage();
      storage.set('a', '1');
      expect(backend.data.get('a')).toBe('1');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('safeStorage: хранилище недоступно → работа в памяти', () => {
  it('нет localStorage (SSR, Node)', () => {
    const storage = createSafeStorage(() => undefined);
    expect(storage.persistent).toBe(false);
    storage.set('k', 'v');
    expect(storage.get('k')).toBe('v');
  });

  it('обращение к localStorage бросает исключение (приватный режим)', () => {
    const storage = createSafeStorage(() => {
      throw new Error('SecurityError');
    });
    expect(storage.persistent).toBe(false);
    storage.set('k', 'v');
    expect(storage.get('k')).toBe('v');
    storage.remove('k');
    expect(storage.get('k')).toBeNull();
  });

  it('все методы backend бросают исключение', () => {
    const storage = createSafeStorage(() => throwing);
    expect(storage.persistent).toBe(false);
    storage.set('k', 'v');
    expect(storage.get('k')).toBe('v');
  });

  it('backend сломался после старта: данные не теряются, persistent = false', () => {
    const backend = mapBackend();
    const storage = createSafeStorage(() => backend);
    storage.set('a', '1');
    backend.setItem = throwing.setItem;
    backend.getItem = throwing.getItem;
    backend.removeItem = throwing.removeItem;

    storage.set('b', '2');
    expect(storage.persistent).toBe(false);
    expect(storage.get('b')).toBe('2');
    expect(storage.get('a')).toBe('1'); // прочитано до сбоя и перенесено в память
    storage.remove('a');
    expect(storage.get('a')).toBeNull();
  });

  it('сбой на чтении тоже переключает в память', () => {
    const backend = mapBackend();
    const storage = createSafeStorage(() => backend);
    backend.getItem = throwing.getItem;
    expect(storage.get('x')).toBeNull();
    expect(storage.persistent).toBe(false);
  });
});
