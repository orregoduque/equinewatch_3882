import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchHorses, SupabaseHorse } from '../utils/supabase';
import { useVisibleRefresh } from './useVisibleRefresh';

/** Discard prior-account data immediately, even before effects run. */
export function useAccessibleHorses({ refreshOnFocus = false } = {}) {
  const { user } = useAuth();
  const revision = useVisibleRefresh(!!user && refreshOnFocus);
  const viewerKey = user ? `${user.id}:${user.email}:${user.role}` : '';
  const [state, setState] = useState<{
    viewerKey: string;
    horses: SupabaseHorse[];
    isLoading: boolean;
    error: string;
  }>({ viewerKey: '', horses: [], isLoading: false, error: '' });

  useEffect(() => {
    let active = true;
    setState(previous => previous.viewerKey === viewerKey && previous.horses.length > 0
      ? { ...previous, error: '' }
      : { viewerKey, horses: [], isLoading: !!user, error: '' });
    if (user) {
      fetchHorses(user).then(
        (horses) => {
          if (active) setState({ viewerKey, horses, isLoading: false, error: '' });
        },
        (error) => {
          if (active) setState(previous => ({
            viewerKey, horses: previous.viewerKey === viewerKey ? previous.horses : [], isLoading: false,
            error: error instanceof Error ? error.message : 'Unable to load horses',
          }));
        },
      );
    }
    return () => { active = false; };
  }, [viewerKey, revision]);

  const current = state.viewerKey === viewerKey;
  return {
    viewer: user,
    viewerKey,
    horses: current ? state.horses : [],
    isLoading: !!user && (!current || state.isLoading),
    error: current ? state.error : '',
  };
}