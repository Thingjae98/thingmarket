import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/auth';

interface Product {
  id: string;
  title: string;
  price: number;
  status: string;
  thumbnail: string | null;
  location_name: string | null;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function LikesScreen() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const session = useAuthStore((s) => s.session);
  const router = useRouter();

  const fetchLikes = useCallback(async () => {
    if (!session) return;
    try {
      const data = await api.get<Product[]>('/users/me/likes', session.access_token);
      setItems(data);
    } catch {
      setItems([]);
    }
  }, [session]);

  useEffect(() => { fetchLikes().finally(() => setLoading(false)); }, [fetchLikes]);

  const onRefresh = async () => { setRefreshing(true); await fetchLikes(); setRefreshing(false); };

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
      data={items}
      keyExtractor={(i) => i.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
      ListEmptyComponent={<Text style={styles.empty}>관심 상품이 없습니다.</Text>}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      style={{ backgroundColor: '#f9fafb' }}
      contentContainerStyle={{ paddingBottom: 20 }}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => router.push(`/products/${item.id}`)}>
          <Image
            source={item.thumbnail ? { uri: item.thumbnail } : require('../../assets/icon.png')}
            style={styles.thumb}
          />
          <View style={styles.cardBody}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.meta}>{item.location_name ?? '위치 미설정'} · {timeAgo(item.created_at)}</Text>
            <Text style={styles.price}>{item.price.toLocaleString()}원</Text>
          </View>
          <Text style={styles.heart}>♥</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 14 },
  sep: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 14 },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 14, gap: 12, alignItems: 'center' },
  thumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#f3f4f6' },
  cardBody: { flex: 1, gap: 3 },
  title: { fontSize: 15, color: '#111827', fontWeight: '500' },
  meta: { fontSize: 12, color: '#9ca3af' },
  price: { fontSize: 14, fontWeight: '700', color: '#111827' },
  heart: { fontSize: 20, color: '#f97316' },
});
