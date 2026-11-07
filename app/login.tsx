import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  Alert, ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, getStoredToken, saveStoredToken } from '../services/api';

export default function AuthScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('Timur Aldagarov');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'initial' | 'code' | 'password'>('initial');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Проверка активной сессии при открытии экрана входа
    getStoredToken().then((token) => {
      if (token) {
        router.replace('/tabs');
      }
    });
  }, []);

  const handleRequestCode = async () => {
    if (!username.trim()) {
      Alert.alert('Ошибка', 'Введите ФИО');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', username.trim());

      const res = await api.post('/auth/request-code', formData);
      if (res.data.status === 'success') {
        if (res.data.debug_code) {
          Alert.alert('Код подтверждения', `Ваш код: ${res.data.debug_code}`);
        }
        setStep('code');
      }
    } catch (err: any) {
      Alert.alert('Ошибка', err.response?.data?.message || 'Пользователь не найден');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('code', code.trim());
      formData.append('password', password.trim());

      const res = await api.post('/auth/login', formData);
      if (res.data.status === 'success' && res.data.token) {
        // Сохраняем токен (сессия на 30 дней)
        await saveStoredToken(res.data.token);
        router.replace('/tabs');
      }
    } catch (err: any) {
      Alert.alert('Ошибка', err.response?.data?.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>PLANT CORE</Text>
        <Text style={styles.subtitle}>Industrial Operations Platform</Text>

        <Text style={styles.label}>ФИО сотрудника:</Text>
        <TextInput
          style={styles.input}
          placeholder="Например: Timur Aldagarov"
          value={username}
          onChangeText={setUsername}
          editable={step === 'initial'}
        />

        {step === 'code' && (
          <>
            <Text style={styles.label}>Код подтверждения:</Text>
            <TextInput
              style={styles.input}
              placeholder="Введите 4 цифры"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
            />
            <Text style={styles.label}>Придумайте пароль:</Text>
            <TextInput
              style={styles.input}
              placeholder="Пароль"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </>
        )}

        {step === 'initial' ? (
          <TouchableOpacity style={styles.btnPrimary} onPress={handleRequestCode} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Запросить код / Далее</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnSuccess} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Войти в систему</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e293b', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#1e293b', textAlign: 'center' },
  subtitle: { fontSize: 10, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 5, color: '#333' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 16, color: '#000' },
  btnPrimary: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  btnSuccess: { backgroundColor: '#16a34a', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});