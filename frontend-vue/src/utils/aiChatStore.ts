import { del, get, set } from 'idb-keyval'

const STORE_TTL = 24 * 60 * 60 * 1000

export interface StoredAiChatRecord<T> {
  savedAt: number
  chats: T[]
}

export async function readAiChatRecord<T>(key: string): Promise<T[]> {
  const record = await get<StoredAiChatRecord<T>>(key)
  if (!record || !Array.isArray(record.chats)) return []

  if (Date.now() - record.savedAt > STORE_TTL) {
    await del(key)
    return []
  }

  return record.chats
}

export async function writeAiChatRecord<T>(key: string, chats: T[]) {
  await set(key, {
    savedAt: Date.now(),
    chats,
  } satisfies StoredAiChatRecord<T>)
}

export function clearAiChatRecord(key: string) {
  return del(key)
}
