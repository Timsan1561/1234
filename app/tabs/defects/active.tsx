import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, BASE_URL, getSession } from '../../../services/api';

interface DefectComment {
  id: number;
  defectId: number;
  text: string;
  author: string;
  createdAt: string;
}

interface Defect {
  id: number;
  equipmentCode: string;
  problemType: string;
  description: string;
  author: string;
  photoUrl: string;
  createdAt: string;
  isClosed: boolean;
  comments: DefectComment[];
}

interface EquipmentOption {
  code: string;
  name: string;
}

export default function ActiveDefectsScreen() {
  const { equipmentCode } = useLocalSearchParams<{ equipmentCode?: string }>();
  
  const [selectedEqCode, setSelectedEqCode] = useState<string>(equipmentCode || '');
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Для выпадающего списка выбора оборудования
  const [showEqModal, setShowEqModal] = useState<boolean>(false);

  // Для модального окна просмотра дефекта и комментариев
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [sendingComment, setSendingComment] = useState<boolean>(false);

  // Живое обновление таймера каждую минуту
  const [, setNow] = useState<number>(Date.now());

  useEffect(() => {
    loadEquipmentList();
    fetchDefects();

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 60000); // Обновление каждую 1 минуту

    return () => clearInterval(timer);
  }, [selectedEqCode]);

  // Загрузка списка всего оборудования для выпадающего меню
  const loadEquipmentList = async () => {
    try {
      const res = await api.get('/admin/lines');
      const lines = res.data;
      const allEq: EquipmentOption[] = [];
      lines.forEach((line: any) => {
        if (line.equipmentList) {
          line.equipmentList.forEach((eq: any) => {
            allEq.push({ code: eq.code, name: eq.name });
          });
        }
      });
      setEquipmentList(allEq);
    } catch (err) {
      console.error('Ошибка загрузки оборудования:', err);
    }
  };

  // Загрузка списка открытых дефектов с бэкенда
  const fetchDefects = async () => {
    setLoading(true);
    try {
      let url = '/defects?closed=false';
      if (selectedEqCode) {
        url += `&equipmentCode=${encodeURIComponent(selectedEqCode)}`;
      }
      const res = await api.get(url);
      setDefects(res.data);
      
      // Если открыто модальное окно с дефектом — обновляем его данные
      if (selectedDefect) {
        const updated = res.data.find((d: Defect) => d.id === selectedDefect.id);
        if (updated) setSelectedDefect(updated);
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось загрузить список дефектов');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDefects();
  };

  // Расчет живого времени нахождения дефекта в открытом состоянии
  const formatTimer = (createdAtStr: string) => {
    const createdTime = new Date(createdAtStr).getTime();
    const diffMs = Date.now() - createdTime;

    if (diffMs < 0) return 'Только что';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}д ${hours % 24}ч ${minutes}мин`;
    }
    if (hours > 0) {
      return `${hours}ч ${minutes}мин`;
    }
    return `${minutes} мин`;
  };

  // Отправка нового комментария
  const handleAddComment = async () => {
    if (!newCommentText.trim() || !selectedDefect) return;

    setSendingComment(true);
    try {
      const user = await getSession();
      const formData = new FormData();
      formData.append('text', newCommentText.trim());
      formData.append('author', user?.username || 'Оператор');

      await api.post(`/defects/${selectedDefect.id}/comments`, formData);
      setNewCommentText('');
      await fetchDefects();
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось добавить комментарий');
    } finally {
      setSendingComment(false);
    }
  };

  // Рендер элемента списка дефектов
  const renderDefectItem = ({ item }: { item: Defect }) => (
    <TouchableOpacity
      style={styles.defectCard}
      onPress={() => setSelectedDefect(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.eqBadge}>⚙️ {item.equipmentCode}</Text>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>⏱️ {formatTimer(item.createdAt)}</Text>
        </View>
      </View>

      <Text style={styles.problemType}>{item.problemType}</Text>
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

      <View style={styles.cardFooter}>
        <Text style={styles.authorText}>Автор: {item.author}</Text>
        <Text style={styles.commentsCount}>💬 Комментарии: {item.comments?.length || 0}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Кнопка выпадающего списка оборудования наверху */}
      <TouchableOpacity style={styles.selectEqBtn} onPress={() => setShowEqModal(true)}>
        <Text style={styles.selectEqText}>
          {selectedEqCode ? `Оборудование: ${selectedEqCode}` : 'Все оборудование (Все дефекты)'}
        </Text>
        <Text style={styles.selectEqArrow}>▼</Text>
      </TouchableOpacity>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={defects}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDefectItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Нет открытых дефектов по выбранному оборудованию</Text>
          }
        />
      )}

      {/* Модальное окно выбора оборудования */}
      <Modal visible={showEqModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выберите оборудование:</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity
                style={[styles.eqOption, !selectedEqCode && styles.eqOptionSelected]}
                onPress={() => {
                  setSelectedEqCode('');
                  setShowEqModal(false);
                }}
              >
                <Text style={!selectedEqCode ? styles.eqOptionTextSelected : styles.eqOptionText}>
                  Показать все линии
                </Text>
              </TouchableOpacity>
              {equipmentList.map((eq) => (
                <TouchableOpacity
                  key={eq.code}
                  style={[styles.eqOption, selectedEqCode === eq.code && styles.eqOptionSelected]}
                  onPress={() => {
                    setSelectedEqCode(eq.code);
                    setShowEqModal(false);
                  }}
                >
                  <Text style={selectedEqCode === eq.code ? styles.eqOptionTextSelected : styles.eqOptionText}>
                    {eq.name} ({eq.code})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowEqModal(false)}>
              <Text style={styles.closeBtnText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Модальное окно просмотра дефекта и добавления комментариев */}
      <Modal visible={selectedDefect !== null} animationType="slide" onRequestClose={() => setSelectedDefect(null)}>
        {selectedDefect && (
          <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <ScrollView contentContainerStyle={styles.detailContainer}>
              <Text style={styles.detailTitle}>Оборудование: {selectedDefect.equipmentCode}</Text>
              
              <View style={styles.detailHeaderBox}>
                <Text style={styles.detailProblem}>{selectedDefect.problemType}</Text>
                <Text style={styles.detailTimer}>Открыт: {formatTimer(selectedDefect.createdAt)}</Text>
              </View>

              {/* Фотография дефекта */}
              {selectedDefect.photoUrl ? (
                <Image
                  source={{ uri: `${BASE_URL}${selectedDefect.photoUrl}` }}
                  style={styles.detailPhoto}
                  resizeMode="cover"
                />
              ) : null}

              {/* Описание с автором в конце */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>Описание проблемы:</Text>
                <Text style={styles.descriptionBody}>{selectedDefect.description}</Text>
                <Text style={styles.authorTag}>Автор: {selectedDefect.author}</Text>
              </View>

              {/* История комментариев */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>Комментарии ({selectedDefect.comments?.length || 0}):</Text>
                {selectedDefect.comments && selectedDefect.comments.length > 0 ? (
                  selectedDefect.comments.map((comment) => (
                    <View key={comment.id} style={styles.commentItem}>
                      <Text style={styles.commentText}>{comment.text}</Text>
                      <Text style={styles.commentMeta}>
                        {comment.author} | {new Date(comment.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noCommentsText}>Комментариев пока нет</Text>
                )}
              </View>

              {/* Добавление нового комментария */}
              <View style={styles.addCommentBox}>
                <Text style={styles.sectionLabel}>Добавить комментарий:</Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Введите комментарий..."
                  multiline
                  value={newCommentText}
                  onChangeText={setNewCommentText}
                />
                <TouchableOpacity
                  style={[styles.sendCommentBtn, !newCommentText.trim() && styles.btnDisabled]}
                  disabled={!newCommentText.trim() || sendingComment}
                  onPress={handleAddComment}
                >
                  {sendingComment ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.sendCommentText}>Отправить комментарий</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.backDefectsBtn} onPress={() => setSelectedDefect(null)}>
              <Text style={styles.backDefectsText}>← Назад к списку</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  selectEqBtn: {
    backgroundColor: '#1e293b',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectEqText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  selectEqArrow: { color: '#94a3b8', fontSize: 14 },
  listContent: { padding: 15 },
  defectCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eqBadge: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  timerBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  timerText: { color: '#dc2626', fontSize: 12, fontWeight: 'bold' },
  problemType: { fontSize: 16, fontWeight: 'bold', color: '#2563eb', marginBottom: 4 },
  description: { fontSize: 14, color: '#475569', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
  authorText: { fontSize: 12, color: '#64748b' },
  commentsCount: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#64748b', fontSize: 16 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1e293b' },
  eqOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  eqOptionSelected: { backgroundColor: '#eff6ff' },
  eqOptionText: { fontSize: 15, color: '#333' },
  eqOptionTextSelected: { fontSize: 15, color: '#2563eb', fontWeight: 'bold' },
  closeBtn: { marginTop: 15, backgroundColor: '#64748b', padding: 12, borderRadius: 8, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: 'bold' },

  // Detail Modal styles
  detailContainer: { padding: 20 },
  detailTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 10 },
  detailHeaderBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  detailProblem: { fontSize: 16, fontWeight: 'bold', color: '#2563eb' },
  detailTimer: { fontSize: 13, fontWeight: 'bold', color: '#dc2626', backgroundColor: '#fee2e2', padding: 5, borderRadius: 6 },
  detailPhoto: { width: '100%', height: 220, borderRadius: 8, marginBottom: 15 },
  sectionBox: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 6 },
  descriptionBody: { fontSize: 15, color: '#334155', lineHeight: 22 },
  authorTag: { marginTop: 10, fontSize: 13, color: '#64748b', fontStyle: 'italic', textAlign: 'right' },
  commentItem: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  commentText: { fontSize: 14, color: '#1e293b' },
  commentMeta: { fontSize: 11, color: '#64748b', marginTop: 4, textAlign: 'right' },
  noCommentsText: { color: '#94a3b8', fontStyle: 'italic', fontSize: 13 },
  addCommentBox: { backgroundColor: '#fff', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  commentInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 10, height: 80, textAlignVertical: 'top', marginTop: 5 },
  sendCommentBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 6, alignItems: 'center', marginTop: 10 },
  sendCommentText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  btnDisabled: { backgroundColor: '#94a3b8' },
  backDefectsBtn: { backgroundColor: '#64748b', padding: 16, alignItems: 'center' },
  backDefectsText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});