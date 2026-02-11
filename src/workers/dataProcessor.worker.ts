import type { AssetEntry, ScoreEntry } from '../types'

type Entry = ScoreEntry | AssetEntry

type IngestPayload = {
  topic: string
  data: Entry
}

type SubscribeMsg = {
  action: 'subscribe'
  id: string
  topic: string
}

type UnsubscribeMsg = {
  action: 'unsubscribe'
  id: string
  topic: string
}

type IngestMsg = {
  action: 'ingest'
  payload: IngestPayload
}

type WorkerInMsg = SubscribeMsg | UnsubscribeMsg | IngestMsg

type WorkerOutMsg =
  | { type: 'subscribed'; id: string; topic: string; snapshot: Entry[] }
  | { type: 'update'; topic: string; entry: Entry }
  | { type: 'unsubscribed'; id: string; topic: string }
  | { type: 'error'; message: string }

const storage = new Map<string, Entry[]>()
const subscribers = new Map<string, Set<string>>()

function ensureTopic(topic: string) {
  if (!storage.has(topic)) storage.set(topic, [])
  if (!subscribers.has(topic)) subscribers.set(topic, new Set())
}

self.addEventListener('message', (ev: MessageEvent<WorkerInMsg>) => {
  const msg = ev.data
  try {
    if (msg.action === 'subscribe') {
      ensureTopic(msg.topic)
      subscribers.get(msg.topic)!.add(msg.id)
      const snapshot = storage.get(msg.topic)!.slice()
      const out: WorkerOutMsg = { type: 'subscribed', id: msg.id, topic: msg.topic, snapshot }
      ;(self as unknown as Worker).postMessage(out)
    } else if (msg.action === 'unsubscribe') {
      const set = subscribers.get(msg.topic)
      if (set) set.delete(msg.id)
      const out: WorkerOutMsg = { type: 'unsubscribed', id: msg.id, topic: msg.topic }
      ;(self as unknown as Worker).postMessage(out)
    } else if (msg.action === 'ingest') {
      const { topic, data } = msg.payload
      ensureTopic(topic)
      storage.get(topic)!.push(data)
      const out: WorkerOutMsg = { type: 'update', topic, entry: data }
      ;(self as unknown as Worker).postMessage(out)
    }
  } catch (err: any) {
    const out: WorkerOutMsg = { type: 'error', message: String(err?.message ?? err) }
    ;(self as unknown as Worker).postMessage(out)
  }
})

export {}
