// Wrapper for the data processor web worker. Use this from main thread.

import WorkerModule from './dataProcessor.worker.ts?worker';

type Callback = (msg: any) => void;

export class DataProcessor {
  private worker: Worker;
  private callbacks = new Map<string, Callback>();

  constructor() {
    // Vite-friendly worker import above
    this.worker = new WorkerModule();
    this.worker.addEventListener('message', (ev) => this.handleWorkerMessage(ev.data));
  }

  private handleWorkerMessage(data: any) {
    const { type } = data;
    if (type === 'subscribed' || type === 'unsubscribed') {
      const cb = this.callbacks.get(data.id);
      if (cb) cb(data);
    } else if (type === 'update' || type === 'error') {
      // broadcast to all callbacks interested in this topic
      // callbacks are registered per subscription id, but we don't track topic->ids here
      // So we call all callbacks and they can filter by topic if needed
      for (const cb of this.callbacks.values()) cb(data);
    }
  }

  subscribe(topic: string, cb: Callback) {
    const id = crypto.randomUUID();
    this.callbacks.set(id, cb);
    this.worker.postMessage({ action: 'subscribe', id, topic });
    return id;
  }

  unsubscribe(id: string, topic: string) {
    this.worker.postMessage({ action: 'unsubscribe', id, topic });
    this.callbacks.delete(id);
  }

  ingest(topic: string, data: any) {
    this.worker.postMessage({ action: 'ingest', payload: { topic, data } });
  }

  terminate() {
    this.worker.terminate();
    this.callbacks.clear();
  }
}

export default DataProcessor;
