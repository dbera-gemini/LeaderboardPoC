// Wrapper for the data processor web worker. Use this from main thread.

import WorkerModule from './dataProcessor.worker.ts?worker'
import type { ScoreEntry } from '../types'

type Callback = (msg: WorkerOutMsg) => void

type WorkerOutMsg =
  | { type: 'subscribed'; id: string; topic: string; snapshot: ScoreEntry[] }
  | { type: 'update'; topic: string; entry: ScoreEntry }
  | { type: 'unsubscribed'; id: string; topic: string }
  | { type: 'error'; message: string }

export class DataProcessor {
  private worker: Worker
  private callbacks = new Map<string, Callback>()

  constructor() {
    this.worker = new WorkerModule()
    this.worker.addEventListener('message', (ev) => this.handleWorkerMessage(ev.data as WorkerOutMsg))
  }

  private handleWorkerMessage(data: WorkerOutMsg) {
    const { type } = data
    if (type === 'subscribed' || type === 'unsubscribed') {
      const cb = this.callbacks.get(data.id)
      if (cb) cb(data)
    } else if (type === 'update' || type === 'error') {
      for (const cb of this.callbacks.values()) cb(data)
    }
  }

  subscribe(topic: string, cb: Callback) {
    const id = crypto.randomUUID()
    this.callbacks.set(id, cb)
    this.worker.postMessage({ action: 'subscribe', id, topic })
    return id
  }

  unsubscribe(id: string, topic: string) {
    this.worker.postMessage({ action: 'unsubscribe', id, topic })
    this.callbacks.delete(id)
  }

  ingest(topic: string, data: ScoreEntry) {
    this.worker.postMessage({ action: 'ingest', payload: { topic, data } })
  }

  terminate() {
    this.worker.terminate()
    this.callbacks.clear()
  }
}

export default DataProcessor
