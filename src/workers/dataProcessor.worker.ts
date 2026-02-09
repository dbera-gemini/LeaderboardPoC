type IngestPayload = {
  topic: string;
  data: any;
};

type SubscribeMsg = {
  action: 'subscribe';
  id: string;
  topic: string;
};

type UnsubscribeMsg = {
  action: 'unsubscribe';
  id: string;
  topic: string;
};

type IngestMsg = {
  action: 'ingest';
  payload: IngestPayload;
};

type WorkerInMsg = SubscribeMsg | UnsubscribeMsg | IngestMsg;

type WorkerOutMsg =
  | { type: 'subscribed'; id: string; topic: string; snapshot: any[] }
  | { type: 'update'; topic: string; entry: any }
  | { type: 'unsubscribed'; id: string; topic: string }
  | { type: 'error'; message: string };

const storage = new Map<string, any[]>();
const subscribers = new Map<string, Set<string>>(); // topic -> set of ids

function ensureTopic(topic: string) {
  if (!storage.has(topic)) storage.set(topic, []);
  if (!subscribers.has(topic)) subscribers.set(topic, new Set());
}

self.addEventListener('message', (ev: MessageEvent<WorkerInMsg>) => {
  const msg = ev.data;
  try {
    if (msg.action === 'subscribe') {
      ensureTopic(msg.topic);
      subscribers.get(msg.topic)!.add(msg.id);
      const snapshot = storage.get(msg.topic)!.slice();
      const out: WorkerOutMsg = { type: 'subscribed', id: msg.id, topic: msg.topic, snapshot };
      // send snapshot to main thread for this subscriber id
      (self as any).postMessage(out);
    } else if (msg.action === 'unsubscribe') {
      const set = subscribers.get(msg.topic);
      if (set) set.delete(msg.id);
      const out: WorkerOutMsg = { type: 'unsubscribed', id: msg.id, topic: msg.topic };
      (self as any).postMessage(out);
    } else if (msg.action === 'ingest') {
      const { topic, data } = msg.payload;
      ensureTopic(topic);
      storage.get(topic)!.push(data);
      const out: WorkerOutMsg = { type: 'update', topic, entry: data };
      (self as any).postMessage(out);
    }
  } catch (err: any) {
    const out: WorkerOutMsg = { type: 'error', message: String(err?.message ?? err) };
    (self as any).postMessage(out);
  }
});

export {};
