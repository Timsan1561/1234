import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';

export default function MainEquipmentScreen() {
  const router = useRouter();
  const { equipmentCode } = useLocalSearchParams<{ equipmentCode: string }>();
  const eqCode = equipmentCode || 'L1_FILLER_01';
  const [openDefectsCount, setOpenDefectsCount] = useState(0);

  useEffect(() => {
    loadOpenDefects();
  }, [eqCode]);

  const loadOpenDefects = async () => {
    try {
      const res = await api.get(`/defects?equipmentCode=${eqCode}&closed=false`);
      setOpenDefectsCount(res.data.length);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Оборудование</Text>
        <Text style={styles.codeLabel}>Код: {eqCode}</Text>

        {/* Кнопка Дефекты со счетчиком */}
        <TouchableOpacity
          style={styles.btnDanger}
          onPress={() => router.push({ pathname: '/(tabs)/defects', params: { equipmentCode: eqCode } })}
        >
          <Text style={styles.btnText}>Дефекты</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{openDefectsCount}</Text>
          </View>
        </TouchableOpacity>

        {/* Кнопка Запчасти */}
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => Alert.alert('Раздел ЗИП', 'Склад запчастей и интерактивные чертежи в разработке')}
        >
          <Text style={styles.btnText}>Запчасти</Text>
        </TouchableOpacity>

        {/* Кнопка Обучение */}
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => Alert.alert('Обучение', 'Инструкции, фото-видео и PDF в разработке')}
        >
          <Text style={styles.btnText}>Обучение</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnBack} onPress={() => router.back()}>
          <Text style={styles.btnBackText}>← К списку линий</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', padding: 20, justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 3 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  codeLabel: { fontSize: 14, color: '#64748b', marginBottom: 25 },
  btnDanger: { backgroundColor: '#dc2626', padding: 16, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  btnPrimary: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  btnSecondary: { backgroundColor: '#64748b', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  badge: { backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 10 },
  badgeText: { color: '#dc2626', fontWeight: 'bold', fontSize: 14 },
  btnBack: { marginTop: 15, alignItems: 'center' },
  btnBackText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
});