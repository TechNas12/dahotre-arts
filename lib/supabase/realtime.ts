import { useEffect, useState, useRef } from 'react';
import { createClient } from './client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useRealtimeTable(
  tableName: string, 
  onEvent: (payload: RealtimePostgresChangesPayload<Record<string, any>>) => void,
  enabled: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  
  const savedCallback = useRef(onEvent);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    savedCallback.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channelId = `realtime_${tableName}_${Math.random().toString(36).substring(2, 9)}`;
    
    const newChannel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload: RealtimePostgresChangesPayload<Record<string, any>>) => {
          // Debounce rapid bursts of mutations (e.g. multi-item orders)
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = setTimeout(() => {
            savedCallback.current(payload);
          }, 100);
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          if (err) {
            console.warn(`[Realtime ${tableName}] Subscription status:`, status, err);
          }
        }
      });

    setChannel(newChannel);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setIsConnected(false);
      supabase.removeChannel(newChannel);
    };
  }, [tableName, enabled]);

  return { isConnected, channel };
}
