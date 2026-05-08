import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/auth';

interface Profile {
  id: string;
  nickname: string;
  bio: string | null;
  avatar_url: string | null;
  manner_temp: number;
}

interface Product {
  id: string;
  title: string;
  price: number;
  status: string;
  thumbnail: string | null;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const session = useAuthStore((s) => s.session);
  const clear = useAuthStore((s) => s.clear);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    if (!session) return;
    try {
      const [p, prods] = await Promise.all([
        api.get<Profile>('/users/me', session.access_token),
        api.get<Product[]>(`/users/${session.user.id}/products`, session.access_token),
      ]);
      setProfile(p);
      setNickname(p.nickname);
      setBio(p.bio ?? '');
      setProducts(prods);
    } catch {
      /* ignore */
    }
  }, [session]);

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, [fetchData]);

  const handleSave = async () => {
    if (!session || !nickname.trim()) return;
    try {
      await api.patch('/users/me', { nickname: nickname.trim(), bio: bio.trim() }, session.access_token);
      setProfile((p) => p ? { ...p, nickname: nickname.trim(), bio: bio.trim() } : p);
      setEditing(false);
      Alert.alert('저장 완료', '프로필이 업데이트되었습니다.');
    } catch (e: any) {
      Alert.alert('저장 실패', e.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clear();
    router.replace('/(auth)/login');
  };

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>로그인이 필요합니다.</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.loginBtnText}>로그인</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color="#f97316" size="large" />;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* 프로필 헤더 */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarDefault]}>
              <Text style={styles.avatarText}>{profile?.nickname?.[0] ?? '?'}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile?.nickname}</Text>
          <Text style={styles.temp}>🌡️ 매너온도 {profile?.manner_temp?.toFixed(1) ?? '36.5'}°C</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(!editing)}>
          <Text style={styles.editBtnText}>{editing ? '취소' : '편집'}</Text>
        </TouchableOpacity>
      </View>

      {/* 편집 폼 */}
      {editing && (
        <View style={styles.card}>
          <Text style={styles.label}>닉네임</Text>
          <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholderTextColor="#9ca3af" />
          <Text style={styles.label}>소개</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={bio}
            onChangeText={setBio}
            placeholder="소개를 입력하세요"
            placeholderTextColor="#9ca3af"
            multiline
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>저장</Text>
          </TouchableOpacity>
        </View>
      )}

      {!editing && profile?.bio ? (
        <View style={styles.bioBox}>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>
      ) : null}

      {/* 판매 상품 목록 */}
      <Text style={styles.sectionTitle}>판매 상품 ({products.length})</Text>
      {products.length === 0 ? (
        <Text style={styles.empty}>등록한 상품이 없습니다.</Text>
      ) : (
        products.map((item) => (
          <TouchableOpacity key={item.id} style={styles.productRow} onPress={() => router.push(`/products/${item.id}`)}>
            <Image
              source={item.thumbnail ? { uri: item.thumbnail } : require('../../assets/icon.png')}
              style={styles.productThumb}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.productPrice}>{item.price.toLocaleString()}원</Text>
            </View>
            <View style={[styles.statusBadge, item.status === 'selling' ? styles.statusSelling : item.status === 'reserved' ? styles.statusReserved : styles.statusSold]}>
              <Text style={styles.statusText}>{item.status === 'selling' ? '판매중' : item.status === 'reserved' ? '예약중' : '거래완료'}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* 로그아웃 */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', gap: 12 },
  avatarWrap: {},
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarDefault: { backgroundColor: '#fed7aa', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28, color: '#ea580c' },
  name: { fontSize: 18, fontWeight: '700', color: '#111827' },
  temp: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  editBtnText: { fontSize: 13, color: '#374151' },
  card: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 14, color: '#111827', marginBottom: 12 },
  saveBtn: { backgroundColor: '#f97316', borderRadius: 8, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  bioBox: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14 },
  bioText: { fontSize: 14, color: '#374151' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 20, fontSize: 14 },
  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 6, borderRadius: 10, padding: 10, gap: 10 },
  productThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#f3f4f6' },
  productTitle: { fontSize: 14, color: '#111827', fontWeight: '500' },
  productPrice: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusSelling: { backgroundColor: '#dcfce7' },
  statusReserved: { backgroundColor: '#fef3c7' },
  statusSold: { backgroundColor: '#f3f4f6' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  logoutBtn: { margin: 20, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', backgroundColor: '#fff' },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
  loginBtn: { backgroundColor: '#f97316', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
