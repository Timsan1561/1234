import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../services/api';

interface AnalyticsData {
  totalCreated: number;
  totalClosed: number;
  totalOpen: number;
  avgResolutionHours: number;
  byProblem: { problemType: string; count: number }[];
  byEquipment: { equipmentCode: string; count: number; closedCount: number }[];
  userStats: { username: string; role: string; createdCount: number; closedCount: number }[];
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<number>(180); // По умолчанию 180 дней
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/analytics?days=${period}`);
      setData(res.data);
    } catch (err) {
      console.error('Ошибка загрузки аналитики:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Аналитика цеха</Text>
        <TouchableOpacity style={styles.backBtnHeader} onPress={() => router.back()}>
          <Text style={styles.backBtnHeaderText}>← Назад</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Выбор периода отчета */}
        <Text style={styles.sectionLabel}>Период отчета:</Text>
        <View style={styles.periodRow}>
          {[
            { label: '7д', val: 7 },
            { label: '30д', val: 30 },
            { label: '180д', val: 180 },
            { label: '1 год', val: 365 },
            { label: 'Всё время', val: 0 },
          ].map((item) => (
            <TouchableOpacity
              key={item.val}
              style={[styles.periodTab, period === item.val && styles.periodTabSelected]}
              onPress={() => setPeriod(item.val)}
            >
              <Text style={[styles.periodTabText, period === item.val && styles.periodTabTextSelected]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading || !data ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* KPI Сводка (4 карточки) */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiVal}>{data.totalCreated}</Text>
                <Text style={styles.kpiLbl}>Всего</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={[styles.kpiVal, { color: '#ef4444' }]}>{data.totalOpen}</Text>
                <Text style={styles.kpiLbl}>Открыто</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={[styles.kpiVal, { color: '#16a34a' }]}>{data.totalClosed}</Text>
                <Text style={styles.kpiLbl}>Решено</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={[styles.kpiVal, { color: '#2563eb' }]}>{data.avgResolutionHours} ч</Text>
                <Text style={styles.kpiLbl}>Сред. время</Text>
              </View>
            </View>

            {/* Распределение по типам проблем */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardTitle}>Типы проблем</Text>
              {data.byProblem.length === 0 ? (
                <Text style={styles.noDataText}>Данных нет</Text>
              ) : (
                data.byProblem.map((p) => {
                  const pct = data.totalCreated > 0 ? Math.round((p.count / data.totalCreated) * 100) : 0;
                  return (
                    <View key={p.problemType} style={{ marginBottom: 10 }}>
                      <View style={styles.progressLabelRow}>
                        <Text style={styles.progressType}>{p.problemType}</Text>
                        <Text style={styles.progressVal}>{p.count} ({pct}%)</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Аварийность оборудования */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardTitle}>Аварийность оборудования</Text>
              {data.byEquipment.length === 0 ? (
                <Text style={styles.noDataText}>Данных нет</Text>
              ) : (
                data.byEquipment.map((e) => (
                  <View key={e.equipmentCode} style={styles.listItem}>
                    <Text style={styles.itemTitle}>⚙️ {e.equipmentCode}</Text>
                    <Text style={styles.itemSub}>
                      Всего: <Text style={{ fontWeight: 'bold' }}>{e.count}</Text> | Устранено: <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>{e.closedCount}</Text>
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Нагрузка / Активность сотрудников */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardTitle}>Активность сотрудников</Text>
              {data.userStats.length === 0 ? (
                <Text style={styles.noDataText}>Данных нет</Text>
              ) : (
                data.userStats.map((u) => (
                  <View key={u.username} style={styles.listItem}>
                    <View>
                      <Text style={styles.itemTitle}>{u.username}</Text>
                      <Text style={styles.roleSub}>({u.role})</Text>
                    </View>
                    <Text style={styles.itemSub}>
                      Выявлено: <Text style={{ fontWeight: 'bold' }}>{u.createdCount}</Text> | Закрыто: <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>{u.closedCount}</Text>
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { backgroundColor: '#1e293b', paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  backBtnHeader: { backgroundColor: '#64748b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  backBtnHeaderText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  content: { padding: 15 },
  sectionLabel: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginBottom: 8 },
  periodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  periodTab: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  periodTabSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  periodTabText: { fontSize: 13, color: '#333', fontWeight: '500' },
  periodTabTextSelected: { color: '#fff', fontWeight: 'bold' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
  kpiCard: { width: '48%', backgroundColor: '#fff', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  kpiVal: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  kpiLbl: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: '600', marginTop: 2 },

  sectionCard: { backgroundColor: '#fff', borderRadius: 8, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  noDataText: { color: '#94a3b8', fontStyle: 'italic', fontSize: 13 },

  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressType: { fontSize: 13, fontWeight: '600', color: '#334155' },
  progressVal: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
  progressBarBg: { backgroundColor: '#e2e8f0', height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { backgroundColor: '#2563eb', height: '100%', borderRadius: 4 },

  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  roleSub: { fontSize: 11, color: '#64748b' },
  itemSub: { fontSize: 13, color: '#475569' },
});