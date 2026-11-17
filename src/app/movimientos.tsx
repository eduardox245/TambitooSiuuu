
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Movimiento = {
  id: string;
  tipo: 'ingreso' | 'gasto';
  descripcion: string;
  monto: number;
  fecha: string;
};

const COLORS = {
  purple: '#652A91',
  darkPurple: '#54316F',
  lightPurple: '#E8D8F3',
  palePurple: '#F5EEFA',
  pastelPurple: '#C9A9E0',
  yellow: '#FFD044',
  white: '#FFFFFF',
  background: '#F7F2FA',
  text: '#30223B',
  gray: '#887D91',
  border: '#E8DDEF',
  green: '#239B56',
  greenLight: '#E8F5ED',
  red: '#D65B5B',
  redLight: '#FCECEC',
};

export default function MovimientosScreen() {
  const router = useRouter();

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const dinero = (valor: number) =>
    `S/ ${Number(valor || 0).toFixed(2)}`;

  const fechaBonita = (fecha: string) => {
    if (!fecha) return '';

    const fechaNormalizada = fecha.includes('T')
      ? fecha
      : fecha.replace(' ', 'T');

    const date = new Date(
      fechaNormalizada.includes('Z') ||
      /[+-]\d{2}:\d{2}$/.test(fechaNormalizada)
        ? fechaNormalizada
        : `${fechaNormalizada}-05:00`
    );

    if (isNaN(date.getTime())) return fecha;

    return date.toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const cargarMovimientos = useCallback(async () => {
    try {
      const {
        data: { user },
        error: usuarioError,
      } = await supabase.auth.getUser();

      if (usuarioError || !user) {
        throw new Error('No se encontró una sesión activa.');
      }

      const [abonosRes, gastosRes] = await Promise.all([
        supabase
          .from('abonos')
          .select('id, monto, fecha_abono, observacion, deudor_id')
          .eq('owner_id', user.id)
          .order('fecha_abono', { ascending: false }),

        supabase
          .from('movimientos')
          .select('id, tipo, descripcion, monto, fecha_movimiento')
          .eq('owner_id', user.id)
          .order('fecha_movimiento', { ascending: false }),
      ]);

      if (abonosRes.error) throw abonosRes.error;
      if (gastosRes.error) throw gastosRes.error;

      const clientesRes = await supabase
        .from('deudores')
        .select('id, nombre')
        .eq('owner_id', user.id);

      if (clientesRes.error) throw clientesRes.error;

      const nombres = new Map<number, string>();

      (clientesRes.data || []).forEach((cliente: any) => {
        nombres.set(cliente.id, cliente.nombre);
      });

      const ingresos: Movimiento[] = (abonosRes.data || []).map(
        (abono: any) => ({
          id: `abono-${abono.id}`,
          tipo: 'ingreso',
          descripcion: `Abono de ${nombres.get(abono.deudor_id) || 'Cliente'}${
            abono.observacion ? ` - ${abono.observacion}` : ''
          }`,
          monto: Number(abono.monto),
          fecha: abono.fecha_abono,
        })
      );

      const gastos: Movimiento[] = (gastosRes.data || []).map(
        (gasto: any) => ({
          id: `gasto-${gasto.id}`,
          tipo: 'gasto',
          descripcion: gasto.descripcion,
          monto: Number(gasto.monto),
          fecha: gasto.fecha_movimiento,
        })
      );

      const todos = [...ingresos, ...gastos].sort(
        (a, b) =>
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );

      setMovimientos(todos);
    } catch (error: any) {
      console.error('Error cargando movimientos:', error);
      Alert.alert(
        'Error',
        error?.message || 'No se pudieron cargar los movimientos.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargarMovimientos();
  }, [cargarMovimientos]);

  const totalIngresos = useMemo(
    () =>
      movimientos
        .filter((m) => m.tipo === 'ingreso')
        .reduce((total, m) => total + m.monto, 0),
    [movimientos]
  );

  const totalGastos = useMemo(
    () =>
      movimientos
        .filter((m) => m.tipo === 'gasto')
        .reduce((total, m) => total + m.monto, 0),
    [movimientos]
  );

  const balance = totalIngresos - totalGastos;

  const registrarGasto = async () => {
    const montoNumerico = Number(monto.replace(',', '.'));

    if (!descripcion.trim()) {
      Alert.alert('Descripción requerida', 'Escribe el motivo del gasto.');
      return;
    }

    if (!monto.trim() || !Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a cero.');
      return;
    }

    try {
      setGuardando(true);

      const {
        data: { user },
        error: usuarioError,
      } = await supabase.auth.getUser();

      if (usuarioError || !user) {
        throw new Error('No se encontró una sesión activa.');
      }

      const { error } = await supabase.from('movimientos').insert({
        tipo: 'gasto',
        descripcion: descripcion.trim(),
        monto: montoNumerico,
        owner_id: user.id,
      });

      if (error) throw error;

      setModalVisible(false);
      setDescripcion('');
      setMonto('');

      await cargarMovimientos();

      Alert.alert(
        '¡Gasto registrado!',
        'El movimiento se guardó correctamente.'
      );
    } catch (error: any) {
      console.error('Error registrando gasto:', error);
      Alert.alert(
        'Error',
        error?.message || 'No se pudo registrar el gasto.'
      );
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.purple} />
        <Text style={styles.loadingText}>Cargando movimientos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.headerTitle}>Movimientos</Text>
          <Text style={styles.headerSubtitle}>Ingresos y gastos</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => {
              setActualizando(true);
              cargarMovimientos();
            }}
            colors={[COLORS.purple]}
            tintColor={COLORS.purple}
          />
        }
      >
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>BALANCE ACTUAL</Text>
            <View style={styles.balanceIcon}>
              <Text style={styles.balanceIconText}>S/</Text>
            </View>
          </View>

          <Text style={styles.balanceAmount}>{dinero(balance)}</Text>

          <Text style={styles.balanceDescription}>
            Ingresos menos gastos registrados
          </Text>

          <View style={styles.balanceDecoration} />
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconIncome}>
              <Text style={styles.summaryIconText}>↓</Text>
            </View>
            <Text style={styles.summaryLabel}>Ingresos</Text>
            <Text style={styles.incomeAmount}>
              {dinero(totalIngresos)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIconExpense}>
              <Text style={styles.summaryIconExpenseText}>↑</Text>
            </View>
            <Text style={styles.summaryLabel}>Gastos</Text>
            <Text style={styles.expenseAmount}>
              {dinero(totalGastos)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setDescripcion('');
            setMonto('');
            setModalVisible(true);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.addButtonText}>＋ Registrar gasto</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>
              Historial de movimientos
            </Text>
            <Text style={styles.sectionSubtitle}>
              Todos tus ingresos y gastos
            </Text>
          </View>

          <Text style={styles.count}>{movimientos.length}</Text>
        </View>

        {movimientos.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>↕</Text>
            </View>
            <Text style={styles.emptyTitle}>Sin movimientos</Text>
            <Text style={styles.emptyText}>
              Cuando registres abonos o gastos, aparecerán aquí.
            </Text>
          </View>
        ) : (
          movimientos.map((movimiento) => (
            <View key={movimiento.id} style={styles.movementCard}>
              <View
                style={[
                  styles.movementIcon,
                  movimiento.tipo === 'ingreso'
                    ? styles.incomeIcon
                    : styles.expenseIcon,
                ]}
              >
                <Text
                  style={[
                    styles.iconText,
                    movimiento.tipo === 'ingreso'
                      ? styles.incomeText
                      : styles.expenseText,
                  ]}
                >
                  {movimiento.tipo === 'ingreso' ? '↓' : '↑'}
                </Text>
              </View>

              <View style={styles.movementInfo}>
                <Text style={styles.movementDescription}>
                  {movimiento.descripcion}
                </Text>
                <Text style={styles.movementDate}>
                  {fechaBonita(movimiento.fecha)}
                </Text>
                <Text
                  style={[
                    styles.movementType,
                    movimiento.tipo === 'ingreso'
                      ? styles.incomeText
                      : styles.expenseText,
                  ]}
                >
                  {movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
                </Text>
              </View>

              <Text
                style={[
                  styles.movementAmount,
                  movimiento.tipo === 'ingreso'
                    ? styles.incomeText
                    : styles.expenseText,
                ]}
              >
                {movimiento.tipo === 'ingreso' ? '+' : '-'}
                {dinero(movimiento.monto)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modal}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Registrar gasto</Text>
                <Text style={styles.modalSubtitle}>
                  Añade una salida de dinero
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              style={styles.input}
              placeholder="Ejemplo: Compra de bolsas"
              placeholderTextColor="#A99CAF"
              value={descripcion}
              onChangeText={setDescripcion}
              maxLength={255}
            />

            <Text style={styles.inputLabel}>Monto del gasto</Text>
            <TextInput
              style={styles.input}
              placeholder="Ejemplo: 25.00"
              placeholderTextColor="#A99CAF"
              value={monto}
              onChangeText={setMonto}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={[styles.saveButton, guardando && styles.disabled]}
              onPress={registrarGasto}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveButtonText}>Guardar gasto</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  loadingText: {
    marginTop: 12,
    color: COLORS.gray,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  backText: {
    color: COLORS.white,
    fontSize: 32,
    lineHeight: 36,
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: '900',
  },

  headerSubtitle: {
    color: '#E9D9F4',
    fontSize: 12,
    marginTop: 3,
  },

  content: {
    padding: 17,
    paddingBottom: 35,
  },

  balanceCard: {
    backgroundColor: COLORS.darkPurple,
    borderRadius: 22,
    padding: 21,
    marginBottom: 15,
    overflow: 'hidden',
  },

  balanceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  balanceLabel: {
    color: '#E9D9F4',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  balanceIcon: {
    width: 37,
    height: 37,
    borderRadius: 13,
    backgroundColor: COLORS.yellow,
    justifyContent: 'center',
    alignItems: 'center',
  },

  balanceIconText: {
    color: COLORS.darkPurple,
    fontSize: 15,
    fontWeight: '900',
  },

  balanceAmount: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 13,
  },

  balanceDescription: {
    color: '#E9D9F4',
    fontSize: 11,
    marginTop: 7,
  },

  balanceDecoration: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#7947A0',
    right: -45,
    bottom: -75,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 17,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  summaryIconIncome: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  summaryIconText: {
    color: COLORS.green,
    fontSize: 22,
    fontWeight: '900',
  },

  summaryIconExpense: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.redLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  summaryIconExpenseText: {
    color: COLORS.red,
    fontSize: 22,
    fontWeight: '900',
  },

  summaryLabel: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
  },

  incomeAmount: {
    color: COLORS.green,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 7,
  },

  expenseAmount: {
    color: COLORS.red,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 7,
  },

  addButton: {
    backgroundColor: COLORS.purple,
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 25,
  },

  addButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionTitle: {
    color: COLORS.darkPurple,
    fontSize: 17,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 4,
  },

  count: {
    color: COLORS.purple,
    backgroundColor: COLORS.lightPurple,
    borderRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: 11,
    paddingVertical: 5,
    fontWeight: '800',
    fontSize: 12,
  },

  movementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  movementIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  incomeIcon: {
    backgroundColor: COLORS.greenLight,
  },

  expenseIcon: {
    backgroundColor: COLORS.redLight,
  },

  iconText: {
    fontSize: 23,
    fontWeight: '900',
  },

  movementInfo: {
    flex: 1,
  },

  movementDescription: {
    color: COLORS.darkPurple,
    fontSize: 13,
    fontWeight: '800',
  },

  movementDate: {
    color: COLORS.gray,
    fontSize: 10,
    marginTop: 4,
  },

  movementType: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },

  movementAmount: {
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 5,
  },

  incomeText: {
    color: COLORS.green,
  },

  expenseText: {
    color: COLORS.red,
  },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: COLORS.lightPurple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  emptyIconText: {
    fontSize: 30,
    color: COLORS.purple,
  },

  emptyTitle: {
    color: COLORS.darkPurple,
    fontSize: 15,
    fontWeight: '800',
  },

  emptyText: {
    color: COLORS.gray,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(48,34,59,0.48)',
    justifyContent: 'flex-end',
  },

  modal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    paddingHorizontal: 22,
    paddingTop: 13,
    paddingBottom: Platform.OS === 'ios' ? 35 : 25,
  },

  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 5,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 20,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  modalTitle: {
    color: COLORS.darkPurple,
    fontSize: 21,
    fontWeight: '900',
  },

  modalSubtitle: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 4,
  },

  closeButton: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: COLORS.palePurple,
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeText: {
    color: COLORS.darkPurple,
    fontSize: 23,
    fontWeight: '700',
  },

  inputLabel: {
    color: COLORS.darkPurple,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 14,
  },

  saveButton: {
    backgroundColor: COLORS.purple,
    padding: 16,
    borderRadius: 13,
    alignItems: 'center',
    marginTop: 22,
  },

  disabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
