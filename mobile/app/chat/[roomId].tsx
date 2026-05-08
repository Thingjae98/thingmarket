import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';
import { api } from '../../src/lib/api';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

const WS_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1')
  .replace(/^http/, 'ws')
  .replace('/api/v1', '');

function timeStr(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const session = useAuthStore((s) => s.session);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const flatRef = useRef<FlatList>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // 기존 메시지 로드 + 읽음 처리
  const loadMessages = useCallback(async () => {
    if (!session) return;
    try {
      const data = await api.get<Message[]>(`/chats/${roomId}/messages`, session.access_token);
      setMessages(data);
      scrollToBottom();
      await api.patch(`/chats/${roomId}/read`, {}, session.access_token).catch(() => {});
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [roomId, session]);

  // WebSocket 연결
  const connect = useCallback(() => {
    if (!session) return;
    const ws = new WebSocket(`${WS_BASE}/api/v1/chats/${roomId}/ws?token=${session.access_token}`);

    ws.onopen = () => { wsRef.current = ws; };

    ws.onmessage = (e) => {
      try {
        const msg: Message = JSON.parse(e.data);
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      } catch {}
    };

    ws.onerror = () => {};

    ws.onclose = () => {
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    wsRef.current = ws;
  }, [roomId, session]);

  useEffect(() => {
    loadMessages();
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [loadMessages, connect]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ content: text, message_type: 'text' }));
    setInput('');
  };

  const myId = session?.user.id;

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === myId;
    return (
      <View style={[styles.msgWrap, isMe ? styles.msgMe : styles.msgOther]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.content}</Text>
        </View>
        <Text style={styles.msgTime}>{timeStr(item.created_at)}</Text>
      </View>
    );
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color="#f97316" size="large" />;

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
        onContentSizeChange={scrollToBottom}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="메시지를 입력하세요"
          placeholderTextColor="#9ca3af"
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim()}
        >
          <Text style={styles.sendBtnText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f9fafb' },
  msgWrap: { marginBottom: 8 },
  msgMe: { alignItems: 'flex-end' },
  msgOther: { alignItems: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: '#f97316', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  msgText: { fontSize: 15, color: '#111827' },
  msgTextMe: { color: '#fff' },
  msgTime: { fontSize: 10, color: '#9ca3af', marginTop: 2, marginHorizontal: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#fff', padding: 8, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827', maxHeight: 120 },
  sendBtn: { backgroundColor: '#f97316', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnDisabled: { backgroundColor: '#fed7aa' },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
