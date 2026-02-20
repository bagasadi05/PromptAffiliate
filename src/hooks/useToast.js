import { useEffect, useRef, useState } from 'react';
import { subscribeToast } from '../lib/toastBus';

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timeoutMapRef = useRef(new Map());

  useEffect(() => {
    const timeoutMap = timeoutMapRef.current;

    const unsubscribe = subscribeToast((toast) => {
      setToasts((prev) => [...prev, toast]);

      const timeoutId = setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
        timeoutMap.delete(toast.id);
      }, toast.duration);

      timeoutMap.set(toast.id, timeoutId);
    });

    return () => {
      unsubscribe();
      timeoutMap.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutMap.clear();
    };
  }, []);

  return { toasts };
}

export default useToast;
