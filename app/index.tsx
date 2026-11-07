import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getStoredToken } from '../services/api';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    // Проверка активной сессии (30 дней в хранилище)
    getStoredToken().then((token) => {
      if (token) {
        router.replace('/tabs'); // Если токен есть, идем в цех / вкладки
      } else {
        router.replace('/login'); // Если токена нет, на экран входа
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PLANT CORE</Text>
      <Text style={styles.subtitle}>Загрузка системы...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#94a3b8' },
});