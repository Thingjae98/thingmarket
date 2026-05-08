import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/auth';

interface Product {
  id: string;
  title: string;
  price: number;
  status: string;
  distance_km: number | null;
  created_at: string;
  thumbnail: string | null;
  location_name: string | null;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

const RADII = [1, 3, 5];

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [radius, setRadius] = useState(3);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const session = useAuthStore((s) => s.session);
  const router = useRouter();

  const fetchProducts = useCallback(async (loc?: { lat: number; lon: number } | null, kw?: string) => {
    try {
      const params = new URLSearchParams();
      const l = loc ?? location;
      if (l) { params.set('lat', String(l.lat)); params.set('lon', String(l.lon)); params.set('radius_km', String(radius)); }
      if (kw ?? keyword) params.set('keyword', kw ?? keyword);
      const data = await api.get<Product[]>(`/products?${params}`, session?.access_token);
      setProducts(data);
    } catch {
      setProducts([]);
    }
  }, [location, radius, keyword, session]);

  const getLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocLoading(false); return; }
      const pos = await Location.getCurrentPositionAsync({});
      const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      setLocation(loc);
      await fetchProducts(loc, keyword);
    } finally {
      setLocLoading(false);
    }
  };

  useEffect(() => { fetchProducts().finally(() => setLoading(false)); }, [radius]);

  const onRefresh = async () => { setRefreshing(true); await fetchProducts(); setRefreshing(false); };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/products/${item.id}`)}>
      <Image
        source={item.thumbnail ? { uri: item.thumbnail } : require('../../assets/icon.png')}
        style={styles.thumb}
      />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardMeta}>
          {item.location_name ?? '위치 미설정'} {item.distance_km != null ? `· ${item.distance_km.toFixed(1)}km` : ''} · {timeAgo(item.created_at)}
        </Text>
        <Text style={styles.cardPrice}>{item.price.toLocaleString()}원</Text>
        {item.status !== 'selling' && (
          <View style={[styles.badge, item.status === 'reserved' ? styles.badgeReserved : styles.badgeSold]}>
            <Text style={styles.badgeText}>{item.status === 'reserved' ? '예약중' : '거래완료'}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrap}>
      {/* 검색바 */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="상품 검색"
          placeholderTextColor="#9ca3af"
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={() => fetchProducts(location, keyword)}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => fetchProducts(location, keyword)}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>검색</Text>
        </TouchableOpacity>
      </View>

      {/* 반경 + 위치 */}
      <View style={styles.filterRow}>
        {RADII.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.radiusBtn, radius === r && styles.radiusBtnActive]}
            onPress={() => setRadius(r)}
          >
            <Text style={[styles.radiusText, radius === r && styles.radiusTextActive]}>{r}km</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.locBtn} onPress={getLocation} disabled={locLoading}>
          <Text style={styles.locBtnText}>{locLoading ? '위치 찾는 중...' : '📍 내 위치'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#f97316" size="large" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
          ListEmptyComponent={<Text style={styles.empty}>상품이 없습니다.</Text>}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* 글쓰기 FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/products/new')}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f9fafb' },
  searchRow: { flexDirection: 'row', margin: 12, gap: 8 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, fontSize: 14, color: '#111827', backgroundColor: '#fff' },
  searchBtn: { backgroundColor: '#f97316', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 8, gap: 6 },
  radiusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  radiusBtnActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  radiusText: { fontSize: 12, color: '#6b7280' },
  radiusTextActive: { color: '#fff', fontWeight: '700' },
  locBtn: { marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  locBtnText: { fontSize: 12, color: '#374151' },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 14, gap: 12 },
  thumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#f3f4f6' },
  cardBody: { flex: 1, justifyContent: 'center', gap: 2 },
  cardTitle: { fontSize: 15, color: '#111827', fontWeight: '500' },
  cardMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  cardPrice: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 4 },
  badge: { position: 'absolute', top: 0, left: 0, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeReserved: { backgroundColor: '#6b7280' },
  badgeSold: { backgroundColor: '#374151' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  sep: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 14 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 14 },
  fab: { position: 'absolute', right: 20, bottom: 24, backgroundColor: '#f97316', width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
