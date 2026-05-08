import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/store/auth';

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) =>
      setSession(session)
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="products/[id]" options={{ headerShown: true, title: '상품 상세' }} />
        <Stack.Screen name="products/new" options={{ headerShown: true, title: '내 물건 팔기' }} />
        <Stack.Screen name="chat/[roomId]" options={{ headerShown: true, title: '채팅' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
