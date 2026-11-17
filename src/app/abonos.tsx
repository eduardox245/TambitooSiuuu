
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Cliente = {
  id: number;
  nombre: string;
};

type Deuda = {
  id: number;
  deudor_id: number;
  producto: string;
  cantidad: string | null;
  precio: number;
  fecha_anotacion: string | null;
};

type Abono = {
  id: number;
  deudor_id: number;
  monto: number;
  fecha_abono: string;
  observacion: string | null;
  deuda_id: number | null;
};

type DeudaConDatos = Deuda & {
  clienteNombre: string;
  abonado: number;
  saldo: number;
};

type AbonoConDatos = Abono & {
  clienteNombre: string;
  productoNombre: string;
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
  greenLight: '#E8F6ED',
  red: '#B45A83',
  redLight: '#FBEAF0',
};

const moneda = (valor: number) =>
  `S/ ${Number(valor || 0).toFixed(2)}`;

const formatearFecha = (fecha: string | null) => {
  if (!fecha) return 'Fecha no disponible';

  const coincidencia = fecha.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/
  );

  if (coincidencia) {
    const [, anio, mes, dia, hora, minuto] = coincidencia;
    return `${dia}/${mes}/${anio} · ${hora}:${minuto}`;
  }

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return fecha;
  }

  return fechaConvertida.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export default function AbonosScreen() {
  const router = useRouter();

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  const [deudas, setDeudas] = useState<DeudaConDatos[]>([]);
  const [historial, setHistorial] = useState<AbonoConDatos[]>([]);

  const [busqueda, setBusqueda] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [busquedaModal, setBusquedaModal] = useState('');
  const [deudaSeleccionada, setDeudaSeleccionada] =
    useState<DeudaConDatos | null>(null);
  const [monto, setMonto] = useState('');
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        Alert.alert('Sesión no disponible', 'Inicia sesión nuevamente.');
        router.replace('/login');
        return;
      }

      const user = authData.user;

      const [clientesResult, deudasResult, abonosResult] =
        await Promise.all([
          supabase
            .from('deudores')
            .select('id,nombre')
            .eq('owner_id', user.id),

          supabase
            .from('deudas')
            .select(
              'id,deudor_id,producto,cantidad,precio,fecha_anotacion'
            )
            .eq('owner_id', user.id)
            .order('fecha_anotacion', { ascending: false }),

          supabase
            .from('abonos')
            .select(
              'id,deudor_id,monto,fecha_abono,observacion,deuda_id'
            )
            .eq('owner_id', user.id)
            .order('fecha_abono', { ascending: false }),
        ]);

      if (clientesResult.error) throw clientesResult.error;
      if (deudasResult.error) throw deudasResult.error;
      if (abonosResult.error) throw abonosResult.error;

      const clientes = (clientesResult.data || []) as Cliente[];
      const deudasOriginales = (deudasResult.data || []) as Deuda[];
      const abonosOriginales = (abonosResult.data || []) as Abono[];

      const mapaClientes = new Map<number, string>();
      clientes.forEach((cliente) => {
        mapaClientes.set(cliente.id, cliente.nombre);
      });

      const mapaProductos = new Map<number, string>();
      deudasOriginales.forEach((deuda) => {
        mapaProductos.set(deuda.id, deuda.producto);
      });

      const deudasProcesadas: DeudaConDatos[] = deudasOriginales.map(
        (deuda) => {
          const totalAbonado = abonosOriginales
            .filter((abono) => abono.deuda_id === deuda.id)
            .reduce(
              (total, abono) => total + Number(abono.monto || 0),
              0
            );

          const precio = Number(deuda.precio || 0);
          const saldo = Math.max(0, precio - totalAbonado);

          return {
            ...deuda,
            precio,
            clienteNombre:
              mapaClientes.get(deuda.deudor_id) || 'Cliente no disponible',
            abonado: totalAbonado,
            saldo,
          };
        }
      );

      const historialProcesado: AbonoConDatos[] = abonosOriginales.map(
        (abono) => ({
          ...abono,
          monto: Number(abono.monto || 0),
          clienteNombre:
            mapaClientes.get(abono.deudor_id) || 'Cliente no disponible',
          productoNombre: abono.deuda_id
            ? mapaProductos.get(abono.deuda_id) ||
              'Deuda no disponible'
            : 'Abono anterior sin deuda vinculada',
        })
      );

      setDeudas(deudasProcesadas);
      setHistorial(historialProcesado);
    } catch (error: any) {
      console.error('Error cargando abonos:', error);
      Alert.alert(
        'Error',
        error?.message || 'No se pudieron cargar los abonos.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [router]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const totalAbonado = useMemo(
    () =>
      historial.reduce(
        (total, abono) => total + Number(abono.monto || 0),
        0
      ),
    [historial]
  );

  const deudasPendientes = useMemo(
    () => deudas.filter((deuda) => deuda.saldo > 0.009),
    [deudas]
  );

  const totalPendiente = useMemo(
    () =>
      deudasPendientes.reduce(
        (total, deuda) => total + deuda.saldo,
        0
      ),
    [deudasPendientes]
  );

  const deudasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return deudasPendientes;

    return deudasPendientes.filter(
      (deuda) =>
        deuda.clienteNombre.toLowerCase().includes(texto) ||
        deuda.producto.toLowerCase().includes(texto)
    );
  }, [deudasPendientes, busqueda]);

  const deudasParaModal = useMemo(() => {
    const texto = busquedaModal.trim().toLowerCase();

    if (!texto) return deudasPendientes;

    return deudasPendientes.filter(
      (deuda) =>
        deuda.clienteNombre.toLowerCase().includes(texto) ||
        deuda.producto.toLowerCase().includes(texto)
    );
  }, [deudasPendientes, busquedaModal]);

  const abrirModal = () => {
    setDeudaSeleccionada(null);
    setMonto('');
    setObservacion('');
    setBusquedaModal('');
    setModalVisible(true);
  };

  const cerrarModal = () => {
    if (guardando) return;

    setModalVisible(false);
    setDeudaSeleccionada(null);
    setMonto('');
    setObservacion('');
    setBusquedaModal('');
  };

  const seleccionarDeuda = (deuda: DeudaConDatos) => {
    setDeudaSeleccionada(deuda);
    setMonto('');
  };

  const registrarAbono = async () => {
    if (!deudaSeleccionada) {
      Alert.alert('Selecciona una deuda', 'Primero elige una deuda.');
      return;
    }

    const montoNumerico = Number(monto.replace(',', '.'));

    if (!monto.trim() || !Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a cero.');
      return;
    }

    if (montoNumerico > deudaSeleccionada.saldo + 0.001) {
      Alert.alert(
        'Monto demasiado alto',
        `El saldo pendiente es ${moneda(deudaSeleccionada.saldo)}.`
      );
      return;
    }

    try {
      setGuardando(true);

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        Alert.alert('Sesión no disponible', 'Inicia sesión nuevamente.');
        router.replace('/login');
        return;
      }

      const { error } = await supabase.from('abonos').insert({
        deudor_id: deudaSeleccionada.deudor_id,
        deuda_id: deudaSeleccionada.id,
        monto: montoNumerico,
        observacion: observacion.trim() || null,
        owner_id: authData.user.id,
      });

      if (error) throw error;

      setModalVisible(false);
      setDeudaSeleccionada(null);
      setMonto('');
      setObservacion('');
      setBusquedaModal('');

      Alert.alert(
        '¡Abono registrado!',
        `Se registró ${moneda(montoNumerico)} para ${deudaSeleccionada.clienteNombre}.`
      );

      await cargarDatos();
    } catch (error: any) {
      console.error('Error registrando abono:', error);
      Alert.alert(
        'No se pudo registrar',
        error?.message || 'Inténtalo nuevamente.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const confirmarAbono = (abono: AbonoConDatos) => {
    Alert.alert(
      'Detalle del abono',
      `Cliente: ${abono.clienteNombre}\n\nProducto: ${abono.productoNombre}\n\nMonto: ${moneda(abono.monto)}\n\nFecha: ${formatearFecha(abono.fecha_abono)}\n\nObservación: ${abono.observacion || 'Sin observación'}`,
      [{ text: 'Cerrar', style: 'cancel' }]
    );
  };

  const refrescar = () => {
    setActualizando(true);
    cargarDatos();
  };

  if (cargando) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.purple} />
        <Text style={styles.loadingText}>Cargando abonos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={refrescar}
            tintColor={COLORS.purple}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.darkPurple} />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Abonos</Text>
            <Text style={styles.headerSubtitle}>
              Controla los pagos de tus clientes
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="wallet-outline" size={23} color={COLORS.purple} />
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.paidCard]}>
            <View style={styles.summaryIconGreen}>
              <Ionicons name="checkmark-circle-outline" size={21} color={COLORS.green} />
            </View>
            <Text style={styles.summaryLabel}>Total abonado</Text>
            <Text style={styles.summaryAmountGreen}>
              {moneda(totalAbonado)}
            </Text>
            <Text style={styles.summaryDescription}>
              Pagos recibidos
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.pendingCard]}>
            <View style={styles.summaryIconPurple}>
              <Ionicons name="time-outline" size={21} color={COLORS.purple} />
            </View>
            <Text style={styles.summaryLabel}>Por cobrar</Text>
            <Text style={styles.summaryAmountPurple}>
              {moneda(totalPendiente)}
            </Text>
            <Text style={styles.summaryDescription}>
              Saldo pendiente
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newButton}
          onPress={abrirModal}
          activeOpacity={0.85}
        >
          <View style={styles.newButtonIcon}>
            <Ionicons name="add" size={24} color={COLORS.darkPurple} />
          </View>
          <View style={styles.newButtonTextContainer}>
            <Text style={styles.newButtonTitle}>Registrar nuevo abono</Text>
            <Text style={styles.newButtonSubtitle}>
              Añade un pago de un cliente
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Deudas pendientes</Text>
            <Text style={styles.sectionSubtitle}>
              Clientes que todavía tienen saldo por pagar
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {deudasPendientes.length}
            </Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente o producto..."
            placeholderTextColor={COLORS.gray}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Ionicons name="close-circle" size={19} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>

        {deudasFiltradas.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={busqueda ? 'search-outline' : 'checkmark-done-outline'}
                size={34}
                color={COLORS.purple}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {busqueda ? 'No encontramos resultados' : '¡Todo al día!'}
            </Text>
            <Text style={styles.emptyDescription}>
              {busqueda
                ? 'Prueba buscando otro cliente o producto.'
                : 'No tienes deudas pendientes por cobrar.'}
            </Text>
          </View>
        ) : (
          <View style={styles.debtsList}>
            {deudasFiltradas.map((deuda) => (
              <View key={deuda.id} style={styles.debtCard}>
                <View style={styles.debtTop}>
                  <View style={styles.clientAvatar}>
                    <Ionicons name="person-outline" size={20} color={COLORS.purple} />
                  </View>

                  <View style={styles.debtInfo}>
                    <Text style={styles.clientName} numberOfLines={1}>
                      {deuda.clienteNombre}
                    </Text>
                    <Text style={styles.productName} numberOfLines={1}>
                      {deuda.producto}
                      {deuda.cantidad ? ` · ${deuda.cantidad}` : ''}
                    </Text>
                  </View>

                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pendiente</Text>
                  </View>
                </View>

                <View style={styles.debtDivider} />

                <View style={styles.debtAmounts}>
                  <View style={styles.amountColumn}>
                    <Text style={styles.amountLabel}>Deuda</Text>
                    <Text style={styles.amountValue}>
                      {moneda(deuda.precio)}
                    </Text>
                  </View>

                  <View style={styles.amountColumn}>
                    <Text style={styles.amountLabel}>Abonado</Text>
                    <Text style={styles.amountValueGreen}>
                      {moneda(deuda.abonado)}
                    </Text>
                  </View>

                  <View style={styles.amountColumn}>
                    <Text style={styles.amountLabel}>Saldo</Text>
                    <Text style={styles.amountValuePurple}>
                      {moneda(deuda.saldo)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.debtButton}
                  onPress={() => {
                    setDeudaSeleccionada(deuda);
                    setMonto('');
                    setObservacion('');
                    setBusquedaModal('');
                    setModalVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle-outline" size={19} color={COLORS.white} />
                  <Text style={styles.debtButtonText}>Registrar abono</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.historyHeader}>
          <View>
            <Text style={styles.sectionTitle}>Historial de abonos</Text>
            <Text style={styles.sectionSubtitle}>
              Todos los pagos que has recibido
            </Text>
          </View>
          <View style={styles.historyIcon}>
            <Ionicons name="receipt-outline" size={20} color={COLORS.purple} />
          </View>
        </View>

        {historial.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="receipt-outline" size={30} color={COLORS.pastelPurple} />
            <Text style={styles.emptyHistoryText}>
              Todavía no tienes abonos registrados.
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {historial.map((abono) => (
              <TouchableOpacity
                key={abono.id}
                style={styles.historyCard}
                onPress={() => confirmarAbono(abono)}
                activeOpacity={0.8}
              >
                <View style={styles.historyPaymentIcon}>
                  <Ionicons name="cash-outline" size={21} color={COLORS.green} />
                </View>

                <View style={styles.historyInfo}>
                  <Text style={styles.historyClient} numberOfLines={1}>
                    {abono.clienteNombre}
                  </Text>
                  <Text style={styles.historyProduct} numberOfLines={1}>
                    {abono.productoNombre}
                  </Text>
                  <Text style={styles.historyDate}>
                    {formatearFecha(abono.fecha_abono)}
                  </Text>
                </View>

                <View style={styles.historyAmountContainer}>
                  <Text style={styles.historyAmount}>
                    + {moneda(abono.monto)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={cerrarModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Registrar abono</Text>
                <Text style={styles.modalSubtitle}>
                  Registra el pago de tu cliente
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={cerrarModal}
                disabled={guardando}
              >
                <Ionicons name="close" size={22} color={COLORS.darkPurple} />
              </TouchableOpacity>
            </View>

            {!deudaSeleccionada ? (
              <>
                <Text style={styles.fieldLabel}>Selecciona una deuda</Text>

                <View style={styles.modalSearch}>
                  <Ionicons name="search-outline" size={19} color={COLORS.gray} />
                  <TextInput
                    style={styles.modalSearchInput}
                    placeholder="Buscar cliente o producto..."
                    placeholderTextColor={COLORS.gray}
                    value={busquedaModal}
                    onChangeText={setBusquedaModal}
                  />
                </View>

                <ScrollView
                  style={styles.modalDebtList}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {deudasParaModal.length === 0 ? (
                    <Text style={styles.modalEmptyText}>
                      No hay deudas pendientes disponibles.
                    </Text>
                  ) : (
                    deudasParaModal.map((deuda) => (
                      <TouchableOpacity
                        key={deuda.id}
                        style={styles.modalDebtItem}
                        onPress={() => seleccionarDeuda(deuda)}
                      >
                        <View style={styles.modalDebtIcon}>
                          <Ionicons
                            name="person-outline"
                            size={19}
                            color={COLORS.purple}
                          />
                        </View>

                        <View style={styles.modalDebtInfo}>
                          <Text style={styles.modalDebtClient}>
                            {deuda.clienteNombre}
                          </Text>
                          <Text style={styles.modalDebtProduct}>
                            {deuda.producto}
                          </Text>
                          <Text style={styles.modalDebtBalance}>
                            Saldo: {moneda(deuda.saldo)}
                          </Text>
                        </View>

                        <Ionicons
                          name="chevron-forward"
                          size={19}
                          color={COLORS.gray}
                        />
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.fieldLabel}>Deuda seleccionada</Text>

                <View style={styles.selectedDebt}>
                  <View style={styles.selectedDebtIcon}>
                    <Ionicons
                      name="person-outline"
                      size={21}
                      color={COLORS.purple}
                    />
                  </View>

                  <View style={styles.selectedDebtInfo}>
                    <Text style={styles.selectedDebtClient}>
                      {deudaSeleccionada.clienteNombre}
                    </Text>
                    <Text style={styles.selectedDebtProduct}>
                      {deudaSeleccionada.producto}
                    </Text>
                    <Text style={styles.selectedDebtBalance}>
                      Saldo pendiente: {moneda(deudaSeleccionada.saldo)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setDeudaSeleccionada(null);
                      setMonto('');
                      setObservacion('');
                    }}
                  >
                    <Ionicons name="create-outline" size={21} color={COLORS.purple} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>Monto del abono</Text>

                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>S/</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="decimal-pad"
                    value={monto}
                    onChangeText={setMonto}
                  />
                </View>

                <Text style={styles.availableBalance}>
                  Máximo a abonar: {moneda(deudaSeleccionada.saldo)}
                </Text>

                <Text style={styles.fieldLabel}>Observación (opcional)</Text>

                <TextInput
                  style={styles.observationInput}
                  placeholder="Ej. Pago en efectivo..."
                  placeholderTextColor={COLORS.gray}
                  value={observacion}
                  onChangeText={setObservacion}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    guardando && styles.disabledButton,
                  ]}
                  onPress={registrarAbono}
                  disabled={guardando}
                  activeOpacity={0.85}
                >
                  {guardando ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={21}
                        color={COLORS.white}
                      />
                      <Text style={styles.saveButtonText}>
                        Guardar abono
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.gray,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  backButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 13,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  headerIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: COLORS.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 17,
  },
  summaryCard: {
    flex: 1,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paidCard: {
    backgroundColor: COLORS.white,
  },
  pendingCard: {
    backgroundColor: COLORS.palePurple,
  },
  summaryIconGreen: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },
  summaryIconPurple: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
  },
  summaryAmountGreen: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.green,
    marginTop: 5,
  },
  summaryAmountPurple: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.purple,
    marginTop: 5,
  },
  summaryDescription: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
  },
  newButton: {
    backgroundColor: COLORS.purple,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 27,
  },
  newButtonIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newButtonTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  newButtonTitle: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '800',
  },
  newButtonSubtitle: {
    fontSize: 11,
    color: '#E8D8F3',
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },
  countBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 11,
    paddingHorizontal: 8,
    backgroundColor: COLORS.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: COLORS.purple,
    fontSize: 13,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 13,
    height: 48,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    color: COLORS.text,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 25,
    alignItems: 'center',
    marginBottom: 25,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: COLORS.palePurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptyDescription: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  debtsList: {
    gap: 13,
    marginBottom: 27,
  },
  debtCard: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  debtTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.palePurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtInfo: {
    flex: 1,
    marginLeft: 10,
  },
  clientName: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '800',
  },
  productName: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },
  pendingBadge: {
    backgroundColor: '#FFF5D9',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },
  pendingBadgeText: {
    color: '#A97813',
    fontSize: 10,
    fontWeight: '700',
  },
  debtDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  debtAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  amountColumn: {
    flex: 1,
  },
  amountLabel: {
    color: COLORS.gray,
    fontSize: 10,
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '700',
  },
  amountValueGreen: {
    fontSize: 12,
    color: COLORS.green,
    fontWeight: '700',
  },
  amountValuePurple: {
    fontSize: 12,
    color: COLORS.purple,
    fontWeight: '800',
  },
  debtButton: {
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  debtButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  historyIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistory: {
    backgroundColor: COLORS.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 23,
    alignItems: 'center',
  },
  emptyHistoryText: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  historyList: {
    gap: 10,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyPaymentIcon: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: {
    flex: 1,
    marginLeft: 11,
  },
  historyClient: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  historyProduct: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 3,
  },
  historyDate: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
  },
  historyAmountContainer: {
    alignItems: 'flex-end',
    gap: 5,
    marginLeft: 5,
  },
  historyAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.green,
  },
  bottomSpace: {
    height: 25,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(35, 20, 45, 0.48)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    paddingHorizontal: 21,
    paddingTop: 11,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 5,
    backgroundColor: COLORS.pastelPurple,
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 21,
    color: COLORS.text,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  modalClose: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: COLORS.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '800',
    marginBottom: 9,
    marginTop: 5,
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    height: 46,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 13,
  },
  modalDebtList: {
    maxHeight: 350,
  },
  modalEmptyText: {
    textAlign: 'center',
    color: COLORS.gray,
    fontSize: 12,
    padding: 25,
  },
  modalDebtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalDebtIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.palePurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDebtInfo: {
    flex: 1,
    marginLeft: 10,
  },
  modalDebtClient: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  modalDebtProduct: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 3,
  },
  modalDebtBalance: {
    color: COLORS.purple,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  selectedDebt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 13,
    marginBottom: 17,
  },
  selectedDebtIcon: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: COLORS.palePurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDebtInfo: {
    flex: 1,
    marginLeft: 10,
  },
  selectedDebtClient: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  selectedDebtProduct: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 3,
  },
  selectedDebtBalance: {
    color: COLORS.purple,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  amountInputContainer: {
    height: 57,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  currencySymbol: {
    color: COLORS.purple,
    fontSize: 18,
    fontWeight: '800',
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  availableBalance: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 7,
    marginBottom: 14,
  },
  observationInput: {
    minHeight: 80,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 13,
    color: COLORS.text,
    fontSize: 13,
    marginBottom: 18,
  },
  saveButton: {
    height: 51,
    backgroundColor: COLORS.purple,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  disabledButton: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
