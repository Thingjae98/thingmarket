import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function Icon({ label }: { label: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#f3f4f6' },
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ focused }) => <Icon label={focused ? '🏠' : '🏡'} />,
          headerTitle: '띵마켓',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: '채팅',
          tabBarIcon: ({ focused }) => <Icon label={focused ? '💬' : '🗨️'} />,
          headerTitle: '채팅',
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: '관심',
          tabBarIcon: ({ focused }) => <Icon label={focused ? '♥' : '♡'} />,
          headerTitle: '관심목록',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarIcon: ({ focused }) => <Icon label={focused ? '👤' : '🧑'} />,
          headerTitle: '내 프로필',
        }}
      />
    </Tabs>
  );
}
