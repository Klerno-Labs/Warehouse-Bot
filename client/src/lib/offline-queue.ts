type QueueStatus = "queued" | "needs-review";

export type InventoryQueueItem = {
  id: string;
  payload: Record<string, unknown>;
  status: QueueStatus;
  error?: string;
  createdAt: string;
};

const STORAGE_KEY = "inventoryEventQueue";

export function loadQueue(): InventoryQueueItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as InventoryQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQueue(items: InventoryQueueItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addQueueItem(item: InventoryQueueItem) {
  const items = loadQueue();
  items.push(item);
  saveQueue(items);
  return items;
}

export function updateQueueItem(id: string, updates: Partial<InventoryQueueItem>) {
  const items = loadQueue();
  const next = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
  saveQueue(next);
  return next;
}

export function removeQueueItem(id: string) {
  const items = loadQueue();
  const next = items.filter((item) => item.id !== id);
  saveQueue(next);
  return next;
}
