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
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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

export default function CloseDefectScreen() {
  const router = useRouter();
  const { equipmentCode } = useLocalSearchParams<{ equipmentCode?: string }>();

  const [selectedEqCode, setSelectedEqCode] = useState<string>(equipmentCode || '');
  const [equipmentList, setEquipmentList] = useState<EquipmentOption[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Выпадающий список оборудования
  const [showEqModal, setShowEqModal] = useState<boolean>(false);

  // Окно закрытия конкретного дефекта
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [closingComment, setClosingComment] = useState<string>('');
  const [closePhotoUri, setClosePhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Живое обновление таймеров
  const [, setNow] = useState<number>(Date.now());

  useEffect(() => {
    loadEquipmentList();
    fetchDefects();

    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [selectedEqCode]);

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

  const fetchDefects = async () => {
    setLoading(true);
    try {
      let url = '/defects?closed=false';
      if (selectedEqCode) {
        url += `&equipmentCode=${encodeURIComponent(selectedEqCode)}`;
      }
      const res = await api.get(url);
      setDefects(res.data);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось загрузить дефекты');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDefects();
  };

  const formatTimer = (createdAtStr: string) => {
    const createdTime = new Date(createdAtStr).getTime();
    const diffMs = Date.now() - createdTime;
    if (diffMs < 0) return 'Только что';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}д ${hours % 24}ч ${minutes}мин`;
    if (hours > 0) return `${hours}ч ${minutes}мин`;
    return `${minutes} мин`;
  };

  // Съемка фото выполненной работы
  const takeClosePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert('Ошибка', 'Требуется доступ к камере для фото фиксации работы!');
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      setClosePhotoUri(result.assets[0].uri);
    }
  };

  // Валидация: комментарий исполнителя И фото выполненной работы ОБЯЗАТЕЛЬНЫ
  const isCloseFormValid = closingComment.trim() !== '' && closePhotoUri !== null;

  // Отправка запроса на закрытие дефекта на C# бэкенд
  const handleCloseDefect = async () => {
    if (!selectedDefect || !isCloseFormValid) return;

    setSubmitting(true);
    try {
      const user = await getSession();
      const formData = new FormData();
      formData.append('closingComment', closingComment.trim());
      formData.append('closedBy', user?.username || 'Исполнитель');

      if (closePhotoUri) {
        const filename = closePhotoUri.split('/').pop() || 'close_photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('photo', {
          uri: closePhotoUri,
          name: filename,
          type,
        } as any);
      }

      await api.post(`/defects/${selectedDefect.id}/close`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Успех', 'Дефект успешно закрыт!', [
        {
          text: 'OK',
          onPress: () => {
            setSelectedDefect(null);
            setClosingComment('');
            setClosePhotoUri(null);
            fetchDefects();
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось закрыть дефект на сервере');
    } finally {
      setSubmitting(false);
    }
  };

  const renderDefectItem = ({ item }: { item: Defect }) => (
    <TouchableOpacity
      style={styles.defectCard}
      onPress={() => {
        setSelectedDefect(item);
        setClosingComment('');
        setClosePhotoUri(null);
      }}
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
        <Text style={styles.actionPrompt}>Нажмите для закрытия →</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Кнопка выбора оборудования наверху */}
      <TouchableOpacity style={styles.selectEqBtn} onPress={() => setShowEqModal(true)}>
        <Text style={styles.selectEqText}>
          {selectedEqCode ? `Оборудование: ${selectedEqCode}` : 'Все оборудование (Все дефекты)'}
        </Text>
        <Text style={styles.selectEqArrow}>▼</Text>
      </TouchableOpacity>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={defects}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDefectItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Нет открытых дефектов для закрытия</Text>
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

      {/* Окно оформления закрытия дефекта */}
      <Modal visible={selectedDefect !== null} animationType="slide" onRequestClose={() => setSelectedDefect(null)}>
        {selectedDefect && (
          <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <ScrollView contentContainerStyle={styles.detailContainer}>
              <Text style={styles.detailTitle}>Закрытие дефекта</Text>
              
              {/* Неизменяемая информация по дефекту */}
              <View style={styles.readOnlyCard}>
                <Text style={styles.readOnlyLabel}>Оборудование (неизменяемо):</Text>
                <Text style={styles.readOnlyValue}>{selectedDefect.equipmentCode}</Text>

                <Text style={styles.readOnlyLabel}>Тип дефекта (неизменяемо):</Text>
                <Text style={styles.readOnlyValue}>{selectedDefect.problemType}</Text>

                <Text style={styles.readOnlyLabel}>Описание проблема (автор: {selectedDefect.author}):</Text>
                <Text style={styles.readOnlyValue}>{selectedDefect.description}</Text>

                {selectedDefect.photoUrl ? (
                  <>
                    <Text style={styles.readOnlyLabel}>Фотография дефекта:</Text>
                    <Image
                      source={{ uri: `${BASE_URL}${selectedDefect.photoUrl}` }}
                      style={styles.defectPhoto}
                      resizeMode="cover"
                    />
                  </>
                ) : null}

                {/* История существующих комментариев (неизменяемая) */}
                {selectedDefect.comments && selectedDefect.comments.length > 0 ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.readOnlyLabel}>Ранее оставленные комментарии:</Text>
                    {selectedDefect.comments.map((c) => (
                      <View key={c.id} style={styles.oldCommentItem}>
                        <Text style={styles.oldCommentText}>{c.text}</Text>
                        <Text style={styles.oldCommentMeta}>{c.author} | {new Date(c.createdAt).toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              {/* Поля закрытия (обязательные) */}
              <View style={styles.actionCard}>
                <Text style={styles.formTitle}>Подтверждение выполнения работ</Text>

                <Text style={styles.inputLabel}>Комментарии исполнителя *:</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Опишите проведенные ремонтные работы или замененные детали..."
                  multiline
                  numberOfLines={4}
                  value={closingComment}
                  onChangeText={setClosingComment}
                />

                <Text style={styles.inputLabel}>Фото Выполненной работы *:</Text>
                <TouchableOpacity style={styles.photoBox} onPress={takeClosePhoto}>
                  {closePhotoUri ? (
                    <Image source={{ uri: closePhotoUri }} style={styles.previewImage} />
                  ) : (
                    <Text style={styles.photoBoxText}>📷 Нажмите, чтобы сфотографировать работу</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.closeSubmitBtn, !isCloseFormValid && styles.btnDisabled]}
                  disabled={!isCloseFormValid || submitting}
                  onPress={handleCloseDefect}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.closeSubmitText}>Закрыть Дефект</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedDefect(null)}>
              <Text style={styles.backBtnText}>← Отмена</Text>
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
    borderLeftColor: '#d97706',
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eqBadge: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  timerBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  timerText: { color: '#d97706', fontSize: 12, fontWeight: 'bold' },
  problemType: { fontSize: 16, fontWeight: 'bold', color: '#2563eb', marginBottom: 4 },
  description: { fontSize: 14, color: '#475569', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
  authorText: { fontSize: 12, color: '#64748b' },
  actionPrompt: { fontSize: 12, color: '#16a34a', fontWeight: 'bold' },
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

  // Close Form Modal
  detailContainer: { padding: 20 },
  detailTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 15 },
  readOnlyCard: { backgroundColor: '#e2e8f0', padding: 15, borderRadius: 8, marginBottom: 20 },
  readOnlyLabel: { fontSize: 12, color: '#475569', fontWeight: 'bold', marginTop: 8 },
  readOnlyValue: { fontSize: 15, color: '#0f172a', fontWeight: '600', marginTop: 2 },
  defectPhoto: { width: '100%', height: 180, borderRadius: 6, marginTop: 6 },
  oldCommentItem: { backgroundColor: '#fff', padding: 8, borderRadius: 4, marginTop: 4 },
  oldCommentText: { fontSize: 13, color: '#333' },
  oldCommentMeta: { fontSize: 10, color: '#64748b', textAlign: 'right', marginTop: 2 },

  actionCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#16a34a', marginBottom: 15 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginTop: 10, marginBottom: 5 },
  textArea: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 15, height: 90, textAlignVertical: 'top' },
  photoBox: { height: 150, backgroundColor: '#f1f5f9', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  photoBoxText: { color: '#475569', fontSize: 14, fontWeight: '600' },
  previewImage: { width: '100%', height: '100%' },
  closeSubmitBtn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 25 },
  btnDisabled: { backgroundColor: '#94a3b8' },
  closeSubmitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backBtn: { backgroundColor: '#64748b', padding: 16, alignItems: 'center' },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});