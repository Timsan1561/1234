import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api, getSession } from '../../../services/api';

export default function DefectsScreen() {
  const [defects, setDefects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadDefects();
  }, []);

  const loadDefects = async () => {
    try {
      const res = await api.get('/api/defects');
      setDefects(res.data);
    } catch (error) {
      console.error('Ошибка загрузки дефектов:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e293b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Список дефектов</Text>
      
      <FlatList
        data={defects}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, item.isClosed && styles.closedCard]}
            onPress={() => router.push(`/tabs/defects/close?id=${item.id}`)}
          >
            <View style={styles.row}>
              <Text style={styles.equipment}>{item.equipmentCode}</Text>
              <Text style={[styles.status, item.isClosed ? styles.statusClosed : styles.statusOpen]}>
                {item.isClosed ? 'Закрыт' : 'Активен'}
              </Text>
            </View>
            <Text style={styles.problem}>{item.problemType}</Text>
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.author}>Автор: {item.author}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Нет зарегистрированных дефектов</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', padding: 16, paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2 },
  closedCard: { opacity: 0.7, backgroundColor: '#f1f5f9' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  equipment: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  status: { fontSize: 12, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusOpen: { backgroundColor: '#fee2e2', color: '#991b1b' },
  statusClosed: { backgroundColor: '#dcfce7', color: '#166534' },
  problem: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 4 },
  description: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  author: { fontSize: 11, color: '#94a3b8' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
});