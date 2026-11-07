import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// 1. Укажите IP-адрес вашего ПК или localhost для веб-версии
// Для браузера на ноутбуке лучше подходит 'http://localhost:8000'
// Для запуска на физическом телефоне через Wi-Fi замените localhost на ваш IP (например, 'http://192.168.0.52:8000')
const BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:8000' 
  : 'http://192.168.0.52:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Таймаут 10 секунд
});

// --- КРОСС-ПЛАТФОРМЕННЫЕ ФУНКЦИИ РАБОТЫ С СЕССИЕЙ ---

/**
 * Получить сохраненный токен сессии (localStorage для Web, SecureStore для Mobile)
 */
export async function getStoredToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem('userToken');
      }
      return null;
    } else {
      return await SecureStore.getItemAsync('userToken');
    }
  } catch (error) {
    console.error('Ошибка чтения сессии:', error);
    return null;
  }
}

/**
 * Сохранить токен сессии (сохраняется на 30 дней)
 */
export async function saveStoredToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('userToken', token);
      }
    } else {
      await SecureStore.setItemAsync('userToken', token);
    }
  } catch (error) {
    console.error('Ошибка сохранения сессии:', error);
  }
}

/**
 * Удалить токен сессии (выход из аккаунта)
 */
export async function removeStoredToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('userToken');
      }
    } else {
      await SecureStore.deleteItemAsync('userToken');
    }
  } catch (error) {
    console.error('Ошибка удаления сессии:', error);
  }
}

// --- ИНТЕРСЕПТОРЫ AXIOS ---

// Перехватчик перед отправкой запроса (подставляет токен)
api.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Перехватчик ответов (обработка 401 Unauthorized и ошибок сети)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // При 401 ошибке сбрасываем токен
      await removeStoredToken();
    }
    return Promise.reject(error);
  }
);