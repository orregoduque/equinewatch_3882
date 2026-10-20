import { useEffect, useState } from 'react';

/** Revalidate on return to the page; coalesce focus + visibility events. */
export function useVisibleRefresh(enabled: boolean) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      timer = setTimeout(() => setRevision(value => value + 1), 150);
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [enabled]);
  return revision;
}
