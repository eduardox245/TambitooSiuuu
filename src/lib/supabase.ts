import 'react-native-url-polyfill/auto';

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Falta configurar la URL o la clave publicable de Supabase en el archivo .env'
  );
}

// Durante la compilacion (Node) no existe window ni localStorage.
const hayNavegador =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const secureStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return hayNavegador ? window.localStorage.getItem(key) : null;
    }

    return SecureStore.getItemAsync(key);
  },

  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (hayNavegador) window.localStorage.setItem(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  },

  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (hayNavegador) window.localStorage.removeItem(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  },
};

// En web sin navegador (compilacion) no se guarda sesion ni se refresca el token.
const sesionDisponible = Platform.OS !== 'web' || hayNavegador;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: sesionDisponible,
    persistSession: sesionDisponible,
    detectSessionInUrl: false,
  },
});