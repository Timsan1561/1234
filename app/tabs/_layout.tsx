import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen 
        name="index" 
        options={{ title: 'Цех' }} 
      />
      <Tabs.Screen 
        name="defects/index" 
        options={{ title: 'Дефекты' }} 
      />
      <Tabs.Screen 
        name="admin" 
        options={{ title: 'Админ' }} 
      />
    </Tabs>
  );
}