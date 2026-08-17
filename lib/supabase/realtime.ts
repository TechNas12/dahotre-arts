import { useEffect, useState, useRef } from 'react';
import { createClient } from './client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useRealtimeTable(
  tableName: string, 
  onEvent: (payload: RealtimePostgresChangesPayload<any>) => void,
  enabled: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  
  const savedCallback = useRef(onEvent);
  
  useEffect(() => {
    savedCallback.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    
    const newChannel = supabase
      .channel(`public:${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          savedCallback.current(payload);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
      setIsConnected(false);
    };
  }, [tableName, enabled]);

  return { isConnected, channel };
}
