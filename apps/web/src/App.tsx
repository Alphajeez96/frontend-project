import { useEffect, useState } from 'react';
import { api, ApiError } from './api';
import { EditorLayout, type Track } from './components/EditorLayout';

export default function App() {
  const [track, setTrack] = useState<Track | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api<Track>('/api/v1/track')
      .then((t) => { if (live) setTrack(t); })
      .catch((e: unknown) => {
        if (!live) return;
        setError(e instanceof ApiError ? `${e.message} ${JSON.stringify(e.body)}` : String(e));
      });
    return () => { live = false; };
  }, []);

  return <EditorLayout track={track} error={error} />;
}
