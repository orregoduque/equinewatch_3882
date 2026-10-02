import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchHorses, SupabaseHorse } from '../utils/supabase';

/** Discard prior-account data immediately, even before effects run. */
export function useAccessibleHorses() {
  const { user } = useAuth();
  const viewerKey = user ? `${user.id}:${user.email}:${user.role}` : '';
  const [state, setState] = useState<{
    viewerKey: string;
    horses: SupabaseHorse[];
    isLoading: boolean;
    error: string;
  }>({ viewerKey: '', horses: [], isLoading: false, error: '' });

  useEffect(() => {
    let active = true;
    setState({ viewerKey, horses: [], isLoading: !!user, error: '' });
    if (user) {
      fetchHorses(user).then(
        (horses) => {
          if (active) setState({ viewerKey, horses, isLoading: false, error: '' });
        },
        (error) => {
          if (active) setState({
            viewerKey, horses: [], isLoading: false,
            error: error instanceof Error ? error.message : 'Unable to load horses',
          });
        },
      );
    }
    return () => { active = false; };
  }, [viewerKey]);

  const current = state.viewerKey === viewerKey;
  return {
    viewer: user,
    viewerKey,
    horses: current ? state.horses : [],
    isLoading: !!user && (!current || state.isLoading),
    error: current ? state.error : '',
  };
}