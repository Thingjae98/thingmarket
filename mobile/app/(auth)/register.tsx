import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

export default function RegisterScreen() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!nickname || !email || !password) { Alert.alert('입력 오류', '모든 항목을 입력해 주세요.'); return; }
    if (password.length < 6) { Alert.alert('비밀번호 오류', '비밀번호는 6자 이상이어야 합니다.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nickname } },
    });
    setLoading(false);
    if (error) { Alert.alert('회원가입 실패', error.message); return; }
    Alert.alert('이메일 인증', `${email}로 인증 메일을 보냈습니다.\n확인 후 로그인해 주세요.`, [
      { text: '확인', onPress: () => router.replace('/(auth)/login') },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>띵마켓</Text>
        <Text style={styles.sub}>계정 만들기</Text>

        <View style={styles.card}>
          <Text style={styles.label}>닉네임</Text>
          <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder="사용할 닉네임 (2~20자)" placeholderTextColor="#9ca3af" />
          <Text style={styles.label}>이메일</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="example@email.com" placeholderTextColor="#9ca3af" />
          <Text style={styles.label}>비밀번호</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="6자 이상" placeholderTextColor="#9ca3af" />
          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
            <Text style={styles.btnText}>{loading ? '처리 중...' : '회원가입'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.link}>이미 계정이 있으신가요? <Text style={styles.linkBold}>로그인</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f9fafb' },
  logo: { fontSize: 28, fontWeight: 'bold', color: '#f97316', textAlign: 'center', marginBottom: 4 },
  sub: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', marginBottom: 16 },
  btn: { backgroundColor: '#f97316', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  link: { textAlign: 'center', color: '#6b7280', fontSize: 14 },
  linkBold: { color: '#f97316', fontWeight: '700' },
});
