import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client.js';

// Persist AI chat threads per (channel, topic_key) in Supabase.
// Load a thread's messages, save the full message list on every turn,
// list all threads for the channel, and delete threads.
export function useChatPersistence(channel) {
  const [sessions, setSessions] = useState([]);
  const seqRef = useRef(0);

  const refreshList = useCallback(async () => {
    try {
      const { data } = await api.get('/chats', { params: { channel } });
      setSessions(data.sessions || []);
    } catch {
      // ignore — list is best-effort
    }
  }, [channel]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // Returns the thread's messages (array) on success, or null when stale/failed.
  const loadThread = useCallback(
    async (topicKey) => {
      if (!topicKey) return null;
      const seq = ++seqRef.current;
      try {
        const { data } = await api.get('/chats/session', { params: { channel, topicKey } });
        if (seq !== seqRef.current) return null;
        return data.session?.messages || [];
      } catch {
        if (seq !== seqRef.current) return null;
        return null;
      }
    },
    [channel]
  );

  const saveThread = useCallback(
    async ({ topicKey, label, messages }) => {
      if (!topicKey) return;
      try {
        await api.post('/chats/session', {
          channel,
          topic_key: topicKey,
          topic_label: label,
          messages,
        });
        refreshList();
      } catch {
        // ignore — persistence is best-effort
      }
    },
    [channel, refreshList]
  );

  const deleteThread = useCallback(
    async (topicKey) => {
      if (!topicKey) return;
      try {
        await api.delete('/chats/session', { params: { channel, topicKey } });
        refreshList();
      } catch {
        // ignore
      }
    },
    [channel, refreshList]
  );

  return { sessions, refreshList, loadThread, saveThread, deleteThread };
}
