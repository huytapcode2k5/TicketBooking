import { useEffect, useRef } from 'react';
import { getSocket } from '../api/socket.js';

/** Lắng nghe một sự kiện Socket.IO; handler luôn là bản mới nhất. */
export function useSocketEvent(event, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const s = getSocket();
    const fn = (...args) => ref.current(...args);
    s.on(event, fn);
    return () => s.off(event, fn);
  }, [event]);
}
