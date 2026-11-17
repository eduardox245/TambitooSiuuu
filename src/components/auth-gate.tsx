
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';

type Mode = 'loading' | 'login' | 'setup' | 'unlock' | 'app';

const MORADO = '#652A91';
const MORADO_OSCURO = '#40165F';
const AMARILLO = '#FFD044';
const BACKGROUND = '#FFFCF6';

export default function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<Mode>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [confirmingPin, setConfirmingPin] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const userId = useRef('');
  const modeRef = useRef<Mode>('loading');
  const biometricAttempted = useRef(false);
  const appState = useRef(AppState.currentState);

  const changeMode = (newMode: Mode) => {
    modeRef.current = newMode;
    setMode(newMode);
  };

  // En web se utiliza localStorage solo para la vista de desarrollo.
  // En Android e iOS se conserva SecureStore.
  const getPinItem = async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }

    return SecureStore.getItemAsync(key);
  };

  const setPinItem = async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  };

  const hashPin = async (salt: string, value: string) => {
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${salt}:${value}`
    );
  };

  const pinKeys = () => ({
    salt: `tambitoo_pin_salt_${userId.current}`,
    hash: `tambitoo_pin_hash_${userId.current}`,
  });

  const checkPinExists = async () => {
    const keys = pinKeys();
    const savedHash = await getPinItem(keys.hash);
    const savedSalt = await getPinItem(keys.salt);

    return Boolean(savedHash && savedSalt);
  };

  const prepareUser = async (id: string) => {
    userId.current = id;

    const exists = await checkPinExists();

    setPin('');
    setError('');
    setConfirmingPin(false);
    setFirstPin('');

    if (exists) {
      biometricAttempted.current = false;
      changeMode('unlock');
    } else {
      changeMode('setup');
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!mounted) return;

        if (data.session?.user) {
          await prepareUser(data.session.user.id);
        } else {
          changeMode('login');
        }
      } catch {
        if (mounted) {
          setError('No se pudo comprobar tu sesión. Intenta nuevamente.');
          changeMode('login');
        }
      }
    };

    initialize();

    const { data: authListener } =
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          userId.current = '';
          setPin('');
          setPassword('');
          setError('');
          changeMode('login');
        }
      });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // La autenticación biométrica solo se solicita en dispositivos móviles.
  useEffect(() => {
    if (mode !== 'unlock' || biometricAttempted.current) return;

    biometricAttempted.current = true;

    const authenticate = async () => {
      if (Platform.OS === 'web') {
        setShowPin(true);
        return;
      }

      try {
        const hasHardware =
          await LocalAuthentication.hasHardwareAsync();

        const enrolled =
          await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !enrolled) {
          setShowPin(true);
          return;
        }

        const result =
          await LocalAuthentication.authenticateAsync({
            promptMessage: 'Desbloquear TAMBITOO',
            cancelLabel: 'Usar PIN',
            disableDeviceFallback: true,
          });

        if (result.success) {
          setPin('');
          changeMode('app');
        } else {
          setShowPin(true);
        }
      } catch {
        setShowPin(true);
      }
    };

    authenticate();
  }, [mode]);

  // Bloquear la aplicación al salir y volver a solicitar autenticación.
  // En web no aplicamos este bloqueo automático.
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener(
      'change',
      (nextState) => {
        const previousState = appState.current;

        if (
          previousState === 'active' &&
          (nextState === 'background' || nextState === 'inactive') &&
          modeRef.current === 'app'
        ) {
          setPin('');
          setShowPin(false);
          biometricAttempted.current = false;
          changeMode('unlock');
        }

        appState.current = nextState;
      }
    );

    return () => subscription.remove();
  }, []);

  const iniciarSesion = async () => {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) throw loginError;

      if (data.user) {
        await prepareUser(data.user.id);
      }
    } catch (e: any) {
      setError(e.message || 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  };

  const guardarPin = async (value: string) => {
    const saltBytes = Crypto.getRandomBytes(16);

    const salt = Array.from(saltBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    const hash = await hashPin(salt, value);
    const keys = pinKeys();

    await setPinItem(keys.salt, salt);
    await setPinItem(keys.hash, hash);
  };

  const verificarPin = async (value: string) => {
    const keys = pinKeys();
    const salt = await getPinItem(keys.salt);
    const savedHash = await getPinItem(keys.hash);

    if (!salt || !savedHash) {
      setError('No se encontró tu PIN. Inicia sesión nuevamente.');
      return;
    }

    const enteredHash = await hashPin(salt, value);

    if (enteredHash === savedHash) {
      setPin('');
      setError('');
      setShowPin(false);
      changeMode('app');
    } else {
      setPin('');
      setError('PIN incorrecto. Inténtalo nuevamente.');
    }
  };

  const procesarPin = async (value: string) => {
    setError('');

    if (mode === 'setup') {
      if (!confirmingPin) {
        setFirstPin(value);
        setPin('');
        setConfirmingPin(true);
        return;
      }

      if (value !== firstPin) {
        setPin('');
        setFirstPin('');
        setConfirmingPin(false);
        setError('Los PIN no coinciden. Intenta nuevamente.');
        return;
      }

      try {
        await guardarPin(value);
        setPin('');
        changeMode('app');
      } catch {
        setPin('');
        setError('No se pudo guardar tu PIN. Intenta nuevamente.');
      }

      return;
    }

    if (mode === 'unlock') {
      await verificarPin(value);
    }
  };

  const presionarNumero = (number: string) => {
    if (busy || pin.length >= 6) return;

    const nextPin = pin + number;
    setPin(nextPin);
    setError('');

    if (nextPin.length === 6) {
      procesarPin(nextPin);
    }
  };

  const borrarNumero = () => {
    setPin((current) => current.slice(0, -1));
    setError('');
  };

  if (mode === 'loading') {
    return (
      <SafeAreaView style={styles.loading}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={MORADO} />
        <Text style={styles.loadingText}>Preparando TAMBITOO...</Text>
      </SafeAreaView>
    );
  }

  if (mode === 'app') {
    return <>{children}</>;
  }

  const isPinScreen = mode === 'setup' || mode === 'unlock';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />

      <View style={styles.content}>
        <View style={styles.logo}>
          <Text style={styles.logoLetter}>T</Text>
        </View>

        <Text style={styles.brand}>TAMBITOO</Text>

        {!isPinScreen ? (
          <>
            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.subtitle}>
              Ingresa a tu cuenta para continuar
            </Text>

            <View style={styles.form}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="tucorreo@ejemplo.com"
                placeholderTextColor="#A99AB2"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#A99AB2"
                secureTextEntry
                autoCapitalize="none"
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                style={styles.loginButton}
                onPress={iniciarSesion}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginButtonText}>Iniciar sesión</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>
              {mode === 'setup'
                ? confirmingPin
                  ? 'Confirma tu PIN'
                  : 'Crea tu PIN'
                : 'Bienvenido de nuevo'}
            </Text>

            <Text style={styles.subtitle}>
              {mode === 'setup'
                ? confirmingPin
                  ? 'Vuelve a ingresar tus 6 dígitos'
                  : 'Crea un PIN de 6 dígitos para este celular'
                : 'Ingresa tu PIN de seguridad'}
            </Text>

            <View style={styles.dots}>
              {Array.from({ length: 6 }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index < pin.length && styles.dotFilled,
                  ]}
                />
              ))}
            </View>

            <View style={styles.keypad}>
              {[
                '1', '2', '3',
                '4', '5', '6',
                '7', '8', '9',
                '', '0', 'delete',
              ].map((item, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.key,
                    item === '' && styles.emptyKey,
                  ]}
                  disabled={item === ''}
                  onPress={() =>
                    item === 'delete'
                      ? borrarNumero()
                      : presionarNumero(item)
                  }
                >
                  <Text style={styles.keyText}>
                    {item === 'delete' ? '⌫' : item}
                  </Text>
                </Pressable>
              ))}
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tu negocio, siempre contigo.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
    justifyContent: 'space-between',
  },
  loading: {
    flex: 1,
    backgroundColor: BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    color: MORADO_OSCURO,
    fontSize: 15,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logo: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: MORADO,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoLetter: {
    color: AMARILLO,
    fontSize: 36,
    fontWeight: '800',
  },
  brand: {
    color: MORADO_OSCURO,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 35,
  },
  title: {
    color: MORADO_OSCURO,
    fontSize: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#786887',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 9,
    marginBottom: 27,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 17,
    marginBottom: 30,
  },
  dot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: MORADO,
    backgroundColor: '#FFFFFF',
  },
  dotFilled: {
    backgroundColor: AMARILLO,
    borderColor: MORADO,
  },
  keypad: {
    width: '100%',
    maxWidth: 300,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  key: {
    width: '30%',
    height: 62,
    margin: '1.5%',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEE5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyKey: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  keyText: {
    color: MORADO_OSCURO,
    fontSize: 25,
    fontWeight: '600',
  },
  form: {
    width: '100%',
    gap: 10,
  },
  label: {
    color: MORADO_OSCURO,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  input: {
    height: 53,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6D9ED',
    borderRadius: 14,
    paddingHorizontal: 15,
    color: MORADO_OSCURO,
    fontSize: 15,
  },
  loginButton: {
    height: 54,
    backgroundColor: MORADO,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: '#C0392B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 18,
  },
  footerText: {
    color: '#9B8DA2',
    fontSize: 12,
  },
});
