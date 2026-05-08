import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/auth';

interface ChatRoom {
  id: string;
  product_id: string;
  product_title: string;
  other_nickname: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function ChatListScreen() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const session = useAuthStore((s) => s.session);
  const router = useRouter();

  const fetchRooms = useCallback(async () => {
    if (!session) return;
    try {
      const data = await api.get<ChatRoom[]>('/chats', session.access_token);
      setRooms(data);
    } catch {
      setRooms([]);
    }
  }, [session]);

  useEffect(() => { fetchRooms().finally(() => setLoading(false)); }, [fetchRooms]);

  const onRefresh = async () => { setRefreshing(true); await fetchRooms(); setRefreshing(false); };

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>로그인 후 이용할 수 있습니다.</Text>
      </View>
    );
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color="#f97316" size="large" />;

  return (
    <FlatList
      data={rooms}
      keyExtractor={(r) => r.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
      ListEmptyComponent={<Text style={styles.empty}>진행 중인 채팅이 없습니다.</Text>}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      style={{ backgroundColor: '#fff' }}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => router.push(`/chat/${item.id}`)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.other_nickname?.[0] ?? '?'}</Text>
          </View>
          <View style={styles.body}>
            <View style={styles.topRow}>
              <Text style={styles.nickname}>{item.other_nickname}</Text>
              <Text style={styles.time}>{timeAgo(item.last_message_at)}</Text>
            </View>
            <Text style={styles.productTitle} numberOfLines={1}>{item.product_title}</Text>
            <Text style={styles.lastMsg} numberOfLines={1}>{item.last_message ?? '메시지 없음'}</Text>
          </View>
          {item.unread_count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unread_count > 99 ? '99+' : item.unread_count}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 14 },
  sep: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 72 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fed7aa', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, color: '#ea580c' },
  body: { flex: 1, gap: 2 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  nickname: { fontSize: 15, fontWeight: '600', color: '#111827' },
  time: { fontSize: 12, color: '#9ca3af' },
  productTitle: { fontSize: 11, color: '#9ca3af' },
  lastMsg: { fontSize: 13, color: '#6b7280', marginTop: 1 },
  badge: { backgroundColor: '#f97316', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
