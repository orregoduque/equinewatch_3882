import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fetchHorseDetails, HorseDetailsSessionError, type HorseDetails } from './api';

export function useHorseDetails() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const scope = JSON.stringify([id, user?.id, user?.email, user?.role]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    scope: string;
    horse: HorseDetails | null;
    isLoading: boolean;
    error: string;
    needsLogin: boolean;
  }>({ scope: '', horse: null, isLoading: true, error: '', needsLogin: false });

  useEffect(() => {
    const controller = new AbortController();
    setState({ scope, horse: null, isLoading: true, error: '', needsLogin: false });
    fetchHorseDetails(id, user, controller.signal).then(
      horse => {
        if (!controller.signal.aborted)
          setState({ scope, horse, isLoading: false, error: '', needsLogin: false });
      },
      error => {
        if (!controller.signal.aborted) setState({
          scope, horse: null, isLoading: false,
          error: error instanceof Error ? error.message : 'No se pudo cargar la ficha del caballo.',
          needsLogin: error instanceof HorseDetailsSessionError,
        });
      },
    );
    return () => controller.abort();
  }, [scope, attempt]);

  // Never expose the previous account's/horse's data, even before effects run.
  const current = state.scope === scope;
  return {
    horse: current ? state.horse : null,
    isLoading: !current || state.isLoading,
    error: current ? state.error : '',
    needsLogin: current && state.needsLogin,
    retry: () => setAttempt(value => value + 1),
  };
}
