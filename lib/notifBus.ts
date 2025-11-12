type Listener = () => void;
const listeners = new Set<Listener>();

export function onNotificationsChanged(cb: Listener) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function emitNotificationsChanged() {
  listeners.forEach(cb => {
    try { cb(); } catch {}
  });
}