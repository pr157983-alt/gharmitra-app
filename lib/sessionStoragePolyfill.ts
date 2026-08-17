const memory: Record<string, string> = {};

function createMemoryStorage(): Storage {
  return {
    get length() {
      return Object.keys(memory).length;
    },
    clear() {
      for (const key of Object.keys(memory)) delete memory[key];
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    },
    key(index: number) {
      return Object.keys(memory)[index] ?? null;
    },
    removeItem(key: string) {
      delete memory[key];
    },
    setItem(key: string, value: string) {
      memory[key] = String(value);
    },
  };
}

try {
  if (typeof globalThis.sessionStorage === 'undefined') {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: createMemoryStorage(),
      configurable: true,
    });
  }
} catch {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: createMemoryStorage(),
    configurable: true,
  });
}
