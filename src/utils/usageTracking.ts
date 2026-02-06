// Robust usage tracking to prevent bypass by clearing localStorage

// Generate a semi-stable device fingerprint
function generateFingerprint(): string {
  const components: string[] = [];

  // Browser and OS info
  components.push(navigator.userAgent);
  components.push(navigator.language);
  components.push(String(navigator.hardwareConcurrency || 0));
  components.push(String(screen.width));
  components.push(String(screen.height));
  components.push(String(screen.colorDepth));
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('SchemaFlow-FP', 2, 2);
      components.push(canvas.toDataURL().slice(-50));
    }
  } catch {
    components.push('no-canvas');
  }

  // Create hash from components
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'fp-' + Math.abs(hash).toString(36);
}

// Storage keys
const STORAGE_KEY = 'schemaflow-usage';
const IDB_NAME = 'schemaflow-db';
const IDB_STORE = 'usage';

interface UsageData {
  fingerprint: string;
  anonymousGenerations: number;
  registeredUserId?: string;
  lastUpdated: string;
}

// Get or create fingerprint
let cachedFingerprint: string | null = null;
export function getDeviceFingerprint(): string {
  if (cachedFingerprint) return cachedFingerprint;

  // Try to get existing fingerprint from storage
  const stored = getFromLocalStorage();
  if (stored?.fingerprint) {
    cachedFingerprint = stored.fingerprint;
    return cachedFingerprint;
  }

  // Generate new fingerprint
  cachedFingerprint = generateFingerprint();
  return cachedFingerprint;
}

// localStorage functions
function getFromLocalStorage(): UsageData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveToLocalStorage(data: UsageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

// sessionStorage functions (backup)
function getFromSessionStorage(): UsageData | null {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveToSessionStorage(data: UsageData): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

// IndexedDB functions (most persistent)
async function getFromIndexedDB(): Promise<UsageData | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, 1);

      request.onerror = () => resolve(null);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'fingerprint' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const fp = getDeviceFingerprint();

        try {
          const transaction = db.transaction(IDB_STORE, 'readonly');
          const store = transaction.objectStore(IDB_STORE);
          const getRequest = store.get(fp);

          getRequest.onsuccess = () => resolve(getRequest.result || null);
          getRequest.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

async function saveToIndexedDB(data: UsageData): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, 1);

      request.onerror = () => resolve();

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'fingerprint' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        try {
          const transaction = db.transaction(IDB_STORE, 'readwrite');
          const store = transaction.objectStore(IDB_STORE);
          store.put(data);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => resolve();
        } catch {
          resolve();
        }
      };
    } catch {
      resolve();
    }
  });
}

// Get combined usage data (takes max from all sources)
export async function getUsageData(): Promise<UsageData> {
  const fingerprint = getDeviceFingerprint();

  const localData = getFromLocalStorage();
  const sessionData = getFromSessionStorage();
  const idbData = await getFromIndexedDB();

  // Take the maximum anonymous generations from all sources
  // This prevents bypass by clearing any single storage
  const maxGenerations = Math.max(
    localData?.anonymousGenerations || 0,
    sessionData?.anonymousGenerations || 0,
    idbData?.anonymousGenerations || 0
  );

  return {
    fingerprint,
    anonymousGenerations: maxGenerations,
    registeredUserId: localData?.registeredUserId || sessionData?.registeredUserId || idbData?.registeredUserId,
    lastUpdated: new Date().toISOString(),
  };
}

// Increment anonymous usage counter
export async function incrementAnonymousUsage(): Promise<number> {
  const currentData = await getUsageData();
  const newCount = currentData.anonymousGenerations + 1;

  const updatedData: UsageData = {
    ...currentData,
    anonymousGenerations: newCount,
    lastUpdated: new Date().toISOString(),
  };

  // Save to all storage locations
  saveToLocalStorage(updatedData);
  saveToSessionStorage(updatedData);
  await saveToIndexedDB(updatedData);

  return newCount;
}

// Check if anonymous user can generate
export async function canAnonymousGenerate(limit: number): Promise<boolean> {
  const data = await getUsageData();
  return data.anonymousGenerations < limit;
}

// Get remaining anonymous generations
export async function getRemainingAnonymousGenerations(limit: number): Promise<number> {
  const data = await getUsageData();
  return Math.max(0, limit - data.anonymousGenerations);
}

// Link usage to a registered user (for when they sign up)
export async function linkUsageToUser(userId: string): Promise<void> {
  const currentData = await getUsageData();

  const updatedData: UsageData = {
    ...currentData,
    registeredUserId: userId,
    lastUpdated: new Date().toISOString(),
  };

  saveToLocalStorage(updatedData);
  saveToSessionStorage(updatedData);
  await saveToIndexedDB(updatedData);
}
