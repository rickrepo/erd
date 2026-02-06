// Simple usage tracking with redundant storage to prevent easy bypass

// Storage keys
const STORAGE_KEY = 'schemaflow-usage';
const ID_KEY = 'schemaflow-id';
const IDB_NAME = 'schemaflow-db';
const IDB_STORE = 'usage';

interface UsageData {
  visitorId: string;
  anonymousGenerations: number;
  registeredUserId?: string;
  lastUpdated: string;
}

// Generate a random visitor ID (simple UUID v4)
function generateVisitorId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get or create visitor ID from any available storage
let cachedVisitorId: string | null = null;

function getVisitorId(): string {
  if (cachedVisitorId) return cachedVisitorId;

  // Try to get existing ID from any storage
  try {
    cachedVisitorId = localStorage.getItem(ID_KEY) || sessionStorage.getItem(ID_KEY);
  } catch {
    // Storage access might fail in some browsers
  }

  // Generate new ID if none exists
  if (!cachedVisitorId) {
    cachedVisitorId = generateVisitorId();
  }

  // Sync ID to all storages
  try {
    localStorage.setItem(ID_KEY, cachedVisitorId);
  } catch { /* ignore */ }
  try {
    sessionStorage.setItem(ID_KEY, cachedVisitorId);
  } catch { /* ignore */ }

  return cachedVisitorId;
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
          db.createObjectStore(IDB_STORE, { keyPath: 'visitorId' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const visitorId = getVisitorId();

        try {
          const transaction = db.transaction(IDB_STORE, 'readonly');
          const store = transaction.objectStore(IDB_STORE);
          const getRequest = store.get(visitorId);

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
          db.createObjectStore(IDB_STORE, { keyPath: 'visitorId' });
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
  const visitorId = getVisitorId();

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
    visitorId,
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
