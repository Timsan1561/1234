import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { api, getSession } from '../../../services/api';

const PROBLEM_TYPES = [
  'Электронная проблема',
  'Механическая проблема',
  'Утечки сред (вода, напиток, воздух и т.д.)',
  'Сторонний шум (скрежет, свист, стук и т.д.)',
  'Отклонение параметров (температура напитка, температура охлаждения и т.д.)'
];

export default function NewDefectScreen() {
  const router = useRouter();
  const { equipmentCode } = useLocalSearchParams<{ equipmentCode: string }>();

  const [selectedProblem, setSelectedProblem] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert('Ошибка', 'Требуется доступ к камере!');
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const isFormValid = selectedProblem !== '' && description.trim() !== '' && photoUri !== null;

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      const user = await getSession();
      const formData = new FormData();
      formData.append('equipmentCode', equipmentCode || 'L1_FILLER_01');
      formData.append('problemType', selectedProblem);
      formData.append('description', description);
      formData.append('author', user?.username || 'Оператор');

      if (photoUri) {
        const filename = photoUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('photo', {
          uri: photoUri,
          name: filename,
          type,
        } as any);
      }

      await api.post('/defects', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Успех', 'Дефект зарегистрирован!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось сохранить дефект на сервере');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Название оборудования (из QR):</Text>
      <TextInput style={[styles.input, styles.disabled]} value={equipmentCode || 'L1_FILLER_01'} editable={false} />

      <Text style={styles.label}>Тип проблемы *:</Text>
      {PROBLEM_TYPES.map((type) => (
        <TouchableOpacity
          key={type}
          style={[styles.pickerItem, selectedProblem === type && styles.pickerSelected]}
          onPress={() => setSelectedProblem(type)}
        >
          <Text style={[styles.pickerText, selectedProblem === type && styles.pickerTextSelected]}>{type}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.label}>Фотография с камеры *:</Text>
      <TouchableOpacity style={styles.photoBox} onPress={takePhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
        ) : (
          <Text style={styles.photoText}>📷 Сделать снимок дефекта</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Описание дефекта *:</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Подробно опишите проблему..."
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity
        style={[styles.btnSubmit, !isFormValid && styles.btnDisabled]}
        disabled={!isFormValid || loading}
        onPress={handleSubmit}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSubmitText}>Отправить Дефект</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  label: { fontSize: 14, fontWeight: 'bold', marginTop: 15, marginBottom: 5, color: '#1e293b' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 16 },
  disabled: { backgroundColor: '#e2e8f0', color: '#64748b' },
  textArea: { height: 100, textAlignVertical: 'top' },
  pickerItem: { padding: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, marginBottom: 6 },
  pickerSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pickerText: { fontSize: 14, color: '#333' },
  pickerTextSelected: { color: '#fff', fontWeight: 'bold' },
  photoBox: { height: 160, backgroundColor: '#f1f5f9', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  photoText: { color: '#475569', fontSize: 16, fontWeight: '600' },
  previewImage: { width: '100%', height: '100%' },
  btnSubmit: { backgroundColor: '#16a34a', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 25, marginBottom: 30 },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnSubmitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});