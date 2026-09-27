export type OperationsBroadcastType = 'minor-delay' | 'service-update' | 'all-clear';

export interface OperationsBroadcast {
  id: string;
  type: OperationsBroadcastType;
  message: string;
  sentAt: string;
  sentAtLabel: string;
}

const BROADCAST_STORAGE_KEY = 'railwaze:operations-broadcast';
const DISMISSED_BROADCAST_KEY = 'railwaze:dismissed-operations-broadcast';
export const OPERATIONS_BROADCAST_EVENT = 'railwaze:operations-broadcast';
export const OPERATIONS_BROADCAST_STORAGE_KEY = BROADCAST_STORAGE_KEY;

function isBroadcast(value: unknown): value is OperationsBroadcast {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<OperationsBroadcast>;
  return typeof item.id === 'string'
    && (item.type === 'minor-delay' || item.type === 'service-update' || item.type === 'all-clear')
    && typeof item.message === 'string'
    && typeof item.sentAt === 'string'
    && typeof item.sentAtLabel === 'string';
}

export function readOperationsBroadcast(): OperationsBroadcast | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(BROADCAST_STORAGE_KEY) ?? 'null');
    return isBroadcast(value) ? value : null;
  } catch (error) {
    console.error('Unable to read the saved RailWaze operations update.', error);
    return null;
  }
}

export function isOperationsBroadcastDismissed(id: string): boolean {
  try {
    return localStorage.getItem(DISMISSED_BROADCAST_KEY) === id;
  } catch (error) {
    console.error('Unable to check whether the RailWaze update was dismissed.', error);
    return false;
  }
}

export function publishOperationsBroadcast(
  broadcast: Omit<OperationsBroadcast, 'id' | 'sentAt'>
): OperationsBroadcast {
  const published: OperationsBroadcast = {
    ...broadcast,
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sentAt: new Date().toISOString(),
  };
  localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(published));
  window.dispatchEvent(new CustomEvent(OPERATIONS_BROADCAST_EVENT, { detail: published }));
  return published;
}

export function dismissOperationsBroadcast(id: string): void {
  localStorage.setItem(DISMISSED_BROADCAST_KEY, id);
}
