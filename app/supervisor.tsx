import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, getSession, clearSession } from '../services/api';

interface Equipment {
  id: number;
  code: string;
  name: string;
  lineId: number;
}

interface LineData {
  id: number;
  name: string;
  equipmentCount: number;
  openDefectsCount: number;
  equipment: Equipment[];
}

export default function SupervisorScreen() {
  const router = useRouter();
  const [lines, setLines] = useState<LineData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);

  useEffect(() => {
    loadUserData();
    fetchLines();
  }, []);

  const loadUserData = async () => {
    const user = await getSession();
    setCurrentUser(user);
  };

  const fetchLines = async () => {
    setLoading(true);
    try {
      const res = await api.get('/supervisor/lines');
      setLines(res.data);
    } catch (err) {
      console.error('Ошибка загрузки линий:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLines();
  };

  const handleLogout = async () => {
    await clearSession();
    router.replace('/');
  };

  const renderLineItem = ({ item }: { item: LineData }) => (
    <View style={styles.lineCard}>
      <View style={styles.lineHeader}>
        <Text style={styles.lineTitle}>{item.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.openDefectsCount} откр.</Text>
        </View>
      </View>

      <Text style={styles.subTitle}>Оборудование линии:</Text>
      {item.equipment && item.equipment.length > 0 ? (
        item.equipment.map((eq) => (
          <TouchableOpacity
            key={eq.id}
            style={styles.eqBtn}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/main',
                params: { equipmentCode: eq.code },
              })
            }
          >
            <Text style={styles.eqBtnText}>⚙️ {eq.name} ({eq.code})</Text>
            <Text style={styles.eqArrow}>→</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.noEqText}>Оборудование не добавлено</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Шапка приложения */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>PLANT CORE</Text>
          <Text style={styles.brandSubtitle}>Industrial Operations Platform</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Выход</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.topInfo}>
        <Text style={styles.welcomeUser}>
          {currentUser ? `${currentUser.username} (${currentUser.role})` : 'Загрузка...'}
        </Text>
        <TouchableOpacity
          style={styles.analyticsBtn}
          onPress={() => router.push('/analytics')}
        >
          <Text style={styles.analyticsBtnText}>📈 Аналитика цеха</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={lines}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLineItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { backgroundColor: '#1e293b', paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  brandSubtitle: { fontSize: 9, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 },
  logoutBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  topInfo: { padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeUser: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  analyticsBtn: { backgroundColor: '#d97706', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  analyticsBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  listContent: { padding: 15 },
  lineCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  lineTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  badge: { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  subTitle: { fontSize: 12, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: 8 },
  eqBtn: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eqBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  eqArrow: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  noEqText: { color: '#94a3b8', fontStyle: 'italic', fontSize: 13 },
});