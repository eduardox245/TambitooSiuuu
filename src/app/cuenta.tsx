
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

const MORADO = '#652A91';
const MORADO_OSCURO = '#40165F';
const AMARILLO = '#FFD044';
const FONDO = '#FFFCF6';

export default function CuentaScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  useEffect(() => {
    const cargarCuenta = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) throw error;

        setEmail(data.user?.email ?? 'Usuario de Tambitoo');
      } catch {
        setEmail('No se pudo cargar el correo');
      } finally {
        setLoading(false);
      }
    };

    cargarCuenta();
  }, []);

  const cerrarSesion = async () => {
    const ejecutarCierre = async () => {
      setCerrandoSesion(true);

      try {
        const { error } = await supabase.auth.signOut();

        if (error) throw error;
      } catch (error: any) {
        Alert.alert(
          'No se pudo cerrar sesión',
          error.message || 'Inténtalo nuevamente.'
        );
      } finally {
        setCerrandoSesion(false);
      }
    };

    if (typeof window !== 'undefined') {
      const confirmar = window.confirm(
        '¿Estás seguro de que deseas cerrar sesión?'
      );

      if (confirmar) {
        await ejecutarCierre();
      }

      return;
    }

    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: ejecutarCierre,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi cuenta</Text>
        <Text style={styles.headerSubtitle}>
          Administra tu acceso a Tambitoo
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={42} color={MORADO} />
          </View>

          <Text style={styles.profileTitle}>Mi perfil</Text>

          {loading ? (
            <ActivityIndicator color={MORADO} />
          ) : (
            <Text style={styles.email}>{email}</Text>
          )}

          <View style={styles.status}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Cuenta conectada</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={25}
              color={MORADO}
            />
          </View>

          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Tu cuenta está protegida</Text>
            <Text style={styles.infoDescription}>
              Tu acceso está administrado de forma segura.
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
            cerrandoSesion && styles.disabled,
          ]}
          onPress={cerrarSesion}
          disabled={cerrandoSesion}
        >
          {cerrandoSesion ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.version}>TAMBITOO · Tu negocio, siempre contigo.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FONDO,
  },
  header: {
    backgroundColor: MORADO,
    paddingHorizontal: 24,
    paddingTop: 25,
    paddingBottom: 35,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#F0E4FA',
    fontSize: 14,
    marginTop: 6,
  },
  content: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 25,
    alignItems: 'center',
    marginTop: -5,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: '#F1E5FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  profileTitle: {
    color: MORADO_OSCURO,
    fontSize: 20,
    fontWeight: '800',
  },
  email: {
    color: '#74677B',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0FA',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E9B65',
    marginRight: 7,
  },
  statusText: {
    color: MORADO,
    fontSize: 12,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF6D9',
    padding: 17,
    borderRadius: 18,
    marginTop: 20,
  },
  infoIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: AMARILLO,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    color: MORADO_OSCURO,
    fontSize: 14,
    fontWeight: '800',
  },
  infoDescription: {
    color: '#756A57',
    fontSize: 12,
    marginTop: 4,
  },
  logoutButton: {
    height: 55,
    backgroundColor: MORADO,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 30,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
  version: {
    color: '#9B8DA2',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 30,
  },
});
