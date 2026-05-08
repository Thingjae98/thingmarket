import { useEffect, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/auth';

const { width } = Dimensions.get('window');

interface ProductDetail {
  id: string;
  title: string;
  description: string;
  price: number;
  status: string;
  is_negotiable: boolean;
  view_count: number;
  like_count: number;
  location_name: string | null;
  created_at: string;
  images: string[];
  category_name: string | null;
  seller: { id: string; nickname: string; manner_temp: number; avatar_url: string | null };
  is_liked: boolean;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [chatLoading, setChatLoading] = useState(false);
  const session = useAuthStore((s) => s.session);
  const router = useRouter();

  useEffect(() => {
    api.get<ProductDetail>(`/products/${id}`, session?.access_token)
      .then((p) => {
        setProduct(p);
        setLiked(p.is_liked);
        setLikeCount(p.like_count);
      })
      .catch(() => Alert.alert('오류', '상품을 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleLike = async () => {
    if (!session) { Alert.alert('로그인 필요', '로그인 후 관심 추가 가능합니다.'); return; }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      await api.post(`/products/${id}/like`, {}, session.access_token);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  };

  const startChat = async () => {
    if (!session) { Alert.alert('로그인 필요', '로그인 후 채팅 가능합니다.'); return; }
    setChatLoading(true);
    try {
      const room = await api.post<{ id: string }>('/chats', { product_id: id }, session.access_token);
      router.push(`/chat/${room.id}`);
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color="#f97316" size="large" />;
  if (!product) return <View style={styles.center}><Text style={styles.empty}>상품을 찾을 수 없습니다.</Text></View>;

  const isSeller = session?.user.id === product.seller.id;

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 이미지 슬라이더 */}
        {product.images.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
            >
              {product.images.map((uri, i) => (
                <Image key={i} source={{ uri }} style={{ width, height: 300 }} resizeMode="cover" />
              ))}
            </ScrollView>
            {product.images.length > 1 && (
              <View style={styles.imgDots}>
                {product.images.map((_, i) => (
                  <View key={i} style={[styles.dot, i === imgIdx && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImg}><Text style={{ color: '#9ca3af' }}>이미지 없음</Text></View>
        )}

        {/* 판매자 */}
        <View style={styles.sellerRow}>
          <View style={styles.sellerAvatar}>
            <Text style={styles.sellerAvatarText}>{product.seller.nickname?.[0] ?? '?'}</Text>
          </View>
          <View>
            <Text style={styles.sellerName}>{product.seller.nickname}</Text>
            <Text style={styles.sellerTemp}>🌡️ {product.seller.manner_temp?.toFixed(1) ?? '36.5'}°C</Text>
          </View>
        </View>

        <View style={styles.sep} />

        {/* 상품 정보 */}
        <View style={styles.info}>
          {product.status !== 'selling' && (
            <View style={[styles.statusBadge, product.status === 'reserved' ? styles.reserved : styles.sold]}>
              <Text style={styles.statusText}>{product.status === 'reserved' ? '예약중' : '거래완료'}</Text>
            </View>
          )}
          <Text style={styles.title}>{product.title}</Text>
          {product.category_name && <Text style={styles.category}>{product.category_name}</Text>}
          <Text style={styles.meta}>{product.location_name ?? '위치 미설정'} · {timeAgo(product.created_at)} · 조회 {product.view_count}</Text>
          <Text style={styles.desc}>{product.description}</Text>
        </View>
      </ScrollView>

      {/* 하단 바 */}
      <View style={styles.bottom}>
        <TouchableOpacity onPress={toggleLike} style={styles.likeBtn}>
          <Text style={[styles.likeIcon, liked && styles.likeIconActive]}>{liked ? '♥' : '♡'}</Text>
          <Text style={styles.likeCount}>{likeCount}</Text>
        </TouchableOpacity>
        <View style={styles.priceWrap}>
          <Text style={styles.price}>{product.price.toLocaleString()}원</Text>
          {product.is_negotiable && <Text style={styles.nego}>가격제안 가능</Text>}
        </View>
        {!isSeller && (
          <TouchableOpacity style={styles.chatBtn} onPress={startChat} disabled={chatLoading}>
            <Text style={styles.chatBtnText}>{chatLoading ? '...' : '채팅하기'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#9ca3af', fontSize: 14 },
  noImg: { width, height: 200, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  imgDots: { position: 'absolute', bottom: 8, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff' },
  sellerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fed7aa', justifyContent: 'center', alignItems: 'center' },
  sellerAvatarText: { fontSize: 18, color: '#ea580c' },
  sellerName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  sellerTemp: { fontSize: 12, color: '#6b7280' },
  sep: { height: 1, backgroundColor: '#f3f4f6' },
  info: { padding: 16, gap: 6 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 4 },
  reserved: { backgroundColor: '#fef3c7' },
  sold: { backgroundColor: '#f3f4f6' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  category: { fontSize: 13, color: '#6b7280' },
  meta: { fontSize: 12, color: '#9ca3af' },
  desc: { fontSize: 15, color: '#374151', lineHeight: 22, marginTop: 8 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: '#fff', padding: 12, paddingBottom: 28, gap: 10 },
  likeBtn: { alignItems: 'center', paddingHorizontal: 8 },
  likeIcon: { fontSize: 24, color: '#9ca3af' },
  likeIconActive: { color: '#f97316' },
  likeCount: { fontSize: 11, color: '#6b7280' },
  priceWrap: { flex: 1 },
  price: { fontSize: 18, fontWeight: '700', color: '#111827' },
  nego: { fontSize: 12, color: '#f97316' },
  chatBtn: { backgroundColor: '#f97316', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  chatBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
