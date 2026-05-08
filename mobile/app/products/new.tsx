import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/auth';

interface Category { id: string; name: string; icon: string | null; }

export default function NewProductScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [images, setImages] = useState<{ uri: string; name: string; type: string }[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const session = useAuthStore((s) => s.session);
  const router = useRouter();

  useEffect(() => {
    api.get<Category[]>('/products/categories').then(setCategories).catch(() => {});
  }, []);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      const picked = result.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName ?? `image_${Date.now()}.jpg`,
        type: a.mimeType ?? 'image/jpeg',
      }));
      setImages((prev) => [...prev, ...picked].slice(0, 5));
    }
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('권한 필요', '위치 권한을 허용해 주세요.'); return; }
    const pos = await Location.getCurrentPositionAsync({});
    setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    const [geo] = await Location.reverseGeocodeAsync(pos.coords);
    if (geo) setLocationName(`${geo.city ?? ''} ${geo.district ?? ''}`.trim());
  };

  const handleSubmit = async () => {
    if (!session) { Alert.alert('로그인 필요'); return; }
    if (!title.trim() || !description.trim() || !price) {
      Alert.alert('입력 오류', '제목, 설명, 가격은 필수입니다.'); return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('description', description.trim());
      form.append('price', price);
      form.append('is_negotiable', String(negotiable));
      if (categoryId) form.append('category_id', categoryId);
      if (locationName) form.append('location_name', locationName);
      if (coords) {
        form.append('latitude', String(coords.lat));
        form.append('longitude', String(coords.lon));
      }
      images.forEach((img) => {
        form.append('images', { uri: img.uri, name: img.name, type: img.type } as any);
      });
      await api.postForm('/products', form, session.access_token);
      Alert.alert('등록 완료', '상품이 등록되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('등록 실패', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {/* 이미지 */}
      <Text style={styles.label}>사진 (최대 5장)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <TouchableOpacity style={styles.addImgBtn} onPress={pickImages}>
          <Text style={{ fontSize: 30, color: '#9ca3af' }}>+</Text>
          <Text style={{ fontSize: 11, color: '#9ca3af' }}>{images.length}/5</Text>
        </TouchableOpacity>
        {images.map((img, i) => (
          <View key={i} style={{ marginLeft: 8 }}>
            <Image source={{ uri: img.uri }} style={styles.imgPreview} />
            <TouchableOpacity style={styles.removeImg} onPress={() => setImages((p) => p.filter((_, j) => j !== i))}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Text style={styles.label}>제목 *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="상품명을 입력하세요" placeholderTextColor="#9ca3af" />

      {/* 카테고리 */}
      {categories.length > 0 && (
        <>
          <Text style={styles.label}>카테고리</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, categoryId === c.id && styles.chipActive]}
                onPress={() => setCategoryId(categoryId === c.id ? '' : c.id)}
              >
                <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>
                  {c.icon} {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <Text style={styles.label}>가격 *</Text>
      <View style={styles.priceRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          value={price}
          onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#9ca3af"
        />
        <Text style={{ marginLeft: 8, fontSize: 15, color: '#374151' }}>원</Text>
        <TouchableOpacity style={[styles.chip, negotiable && styles.chipActive, { marginLeft: 12 }]} onPress={() => setNegotiable(!negotiable)}>
          <Text style={[styles.chipText, negotiable && styles.chipTextActive]}>가격제안</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 16 }} />

      <Text style={styles.label}>설명 *</Text>
      <TextInput
        style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
        value={description}
        onChangeText={setDescription}
        placeholder="상품에 대해 설명해 주세요."
        placeholderTextColor="#9ca3af"
        multiline
      />

      <Text style={styles.label}>거래 위치</Text>
      <View style={styles.locationRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          value={locationName}
          onChangeText={setLocationName}
          placeholder="위치를 입력하거나 GPS로 가져오세요"
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity style={styles.gpsBtn} onPress={getLocation}>
          <Text style={styles.gpsBtnText}>📍 GPS</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 24 }} />

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>등록하기</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', marginBottom: 16 },
  addImgBtn: { width: 80, height: 80, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  imgPreview: { width: 80, height: 80, borderRadius: 10 },
  removeImg: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 6, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  chipText: { fontSize: 12, color: '#6b7280' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0 },
  gpsBtn: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  gpsBtnText: { fontSize: 13, color: '#374151' },
  submitBtn: { backgroundColor: '#f97316', borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
