import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const INTERVAL_MS = 2500;
const GIVE_UP_MS = 150000;

/**
 * Polls /api/review/:id for the ats-lm write-up of a scan.
 * status: 'idle' (no review expected) | 'pending' | 'done' | 'failed'
 */
export function useReview(reviewId, initial = null) {
  const [state, setState] = useState(() =>
    initial ? { status: 'done', ...initial } : { status: reviewId ? 'pending' : 'idle' }
  );

  useEffect(() => {
    if (!reviewId || initial) return undefined;
    let stop = false;
    let timer;
    const started = Date.now();

    const tick = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/review/${reviewId}`, { withCredentials: true });
        if (stop) return;
        if (res.data.status === 'pending' && Date.now() - started < GIVE_UP_MS) {
          timer = setTimeout(tick, INTERVAL_MS);
        } else {
          setState(res.data.status === 'pending' ? { status: 'failed' } : res.data);
        }
      } catch {
        if (!stop) setState({ status: 'failed' });
      }
    };
    setState({ status: 'pending' });
    timer = setTimeout(tick, 1200);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [reviewId, initial]);

  return state;
}
