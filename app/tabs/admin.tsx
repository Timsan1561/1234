import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ScrollView, Alert, FlatList, Modal 
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';

export default function AdminPanelScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'structure'>('users');

  // Состояния для пользователей
  const [users, setUsers] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState('Operator'); // Operator, Supervisor, Admin

  // Состояния для линий и оборудования
  const [lines, setLines] = useState<any[]>([]);
  const [newLineName, setNewLineName] = useState('');
  const [newEqName, setNewEqName] = useState('');
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'users') {
        const res = await api.get('/api/users'); // Эндпоинт на бэкенде для получения списка пользователей
        setUsers(res.data);
      } else {
        const res = await api.get('/api/lines'); // Эндпоинт для линий и оборудования
        setLines(res.data);
      }
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
    }
  };

  // --- УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ---
  const handleAddUser = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Ошибка', 'Введите имя пользователя или логин');
      return;
    }
    try {
      await api.post('/api/users', { username: newUsername, role: newRole });
      Alert.alert('Успех', 'Пользователь добавлен');
      setNewUsername('');
      loadData();
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось добавить пользователя');
    }
  };

  const handleDeleteUser = async (id: number) => {
    Alert.alert('Удаление', 'Удалить этого пользователя?', [
      { text: 'Отмена', style: 'cancel' },
      { 
        text: 'Удалить', 
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/users/${id}`);
            loadData();
          } catch (err) {
            Alert.alert('Ошибка', 'Не удалось удалить пользователя');
          }
        }
      }
    ]);
  };

  // --- УПРАВЛЕНИЕ ЛИНИЯМИ И ОБОРУДОВАНИЕМ ---
  const handleAddLine = async () => {
    if (!newLineName.trim()) return;
    try {
      await api.post('/api/lines', { name: newLineName });
      setNewLineName('');
      loadData();
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось добавить линию');
    }
  };

  const handleAddEquipment = async (lineId: number) => {
    if (!newEqName.trim()) return;
    try {
      await api.post('/api/equipment', { lineId, name: newEqName });
      setNewEqName('');
      loadData();
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось добавить оборудование');
    }
  };

  return (
    <View style={styles.container}>
      {/* Шапка панели администратора */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Панель администратора</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Назад</Text>
        </TouchableOpacity>
      </View>

      {/* Переключатель вкладок */}
      <View style={styles.tabsRow}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Персонал</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'structure' && styles.activeTab]}
          onPress={() => setActiveTab('structure')}
        >
          <Text style={[styles.tabText, activeTab === 'structure' && styles.activeTabText]}>Цех и Линии</Text>
        </TouchableOpacity>
      </View>

      {/* Вкладка 1: Пользователи и супервайзеры */}
      {activeTab === 'users' && (
        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Добавить сотрудника</Text>
            <TextInput
              style={styles.input}
              placeholder="Имя / Логин (например: Иван Оператор)"
              placeholderTextColor="#94a3b8"
              value={newUsername}
              onChangeText={setNewUsername}
            />
            <View style={styles.roleRow}>
              {['Operator', 'Supervisor', 'Admin'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleChip, newRole === role && styles.activeRoleChip]}
                  onPress={() => setNewRole(role)}
                >
                  <Text style={[styles.roleText, newRole === role && styles.activeRoleText]}>{role}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddUser}>
              <Text style={styles.primaryBtnText}>Добавить пользователя</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Список сотрудников</Text>
          {users.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View>
                <Text style={styles.itemName}>{item.username}</Text>
                <Text style={styles.itemSub}>{item.role}</Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteUser(item.id)}>
                <Text style={styles.deleteText}>Удалить</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Вкладка 2: Линии и оборудование */}
      {activeTab === 'structure' && (
        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Добавить линию</Text>
            <TextInput
              style={styles.input}
              placeholder="Название линии (например: Линия 3)"
              placeholderTextColor="#94a3b8"
              value={newLineName}
              onChangeText={setNewLineName}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddLine}>
              <Text style={styles.primaryBtnText}>Создать линию</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Существующие линии и узлы</Text>
          {lines.map((line) => (
            <View key={line.id} style={styles.lineCard}>
              <Text style={styles.lineTitle}>{line.name}</Text>
              {/* Список оборудования линии можно выводить здесь с возможностью добавления */}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  backBtn: { padding: 8 },
  backText: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#e2e8f0', borderRadius: 8, marginHorizontal: 4 },
  activeTab: { backgroundColor: '#1e293b' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  activeTabText: { color: '#fff' },
  content: { flex: 1, paddingHorizontal: 20 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, backgroundColor: '#fff', color: '#000' },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  roleChip: { flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, marginHorizontal: 2 },
  activeRoleChip: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  roleText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  activeRoleText: { color: '#fff' },
  primaryBtn: { backgroundColor: '#16a34a', padding: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 8, elevation: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  itemSub: { fontSize: 12, color: '#64748b' },
  deleteBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  deleteText: { color: '#dc2626', fontWeight: 'bold', fontSize: 12 },
  lineCard: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 10, elevation: 1 },
  lineTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
});