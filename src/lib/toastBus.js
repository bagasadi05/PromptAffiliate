let toastIdCounter = 0;
const listeners = new Set();

function createToast(message, type = 'success', duration = 3000) {
  return {
    id: ++toastIdCounter,
    message,
    type,
    duration,
  };
}

export function subscribeToast(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function showToast(message, type = 'success', duration = 3000) {
  const toast = createToast(message, type, duration);
  listeners.forEach((listener) => listener(toast));
}
