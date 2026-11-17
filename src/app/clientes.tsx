
import React, { useEffect, useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  fecha_registro: string | null;
  whatsapp_habilitado: boolean;
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
  red: '#B45A83',
  redLight: '#FBEAF0',
};

export default function ClientesScreen() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState<'todos' | 'mes'>('todos');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [clienteEditando, setClienteEditando] =
    useState<Cliente | null>(null);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setCargando(true);

      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario) throw errorUsuario;

      if (!user) {
        Alert.alert(
          'Sesión no encontrada',
          'Inicia sesión para consultar tus clientes.'
        );
        return;
      }

      const { data, error } = await supabase
        .from('deudores')
        .select(
          'id, nombre, telefono, fecha_registro, whatsapp_habilitado'
        )
        .eq('owner_id', user.id)
        .order('nombre', { ascending: true });

      if (error) throw error;

      setClientes((data || []) as Cliente[]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'No se pudieron cargar los clientes.'
      );
    } finally {
      setCargando(false);
    }
  };

  const abrirNuevoCliente = () => {
    setClienteEditando(null);
    setNombre('');
    setTelefono('');
    setModalVisible(true);
  };

  const abrirEditarCliente = (cliente: Cliente) => {
    setClienteEditando(cliente);
    setNombre(cliente.nombre);
    setTelefono(cliente.telefono || '');
    setModalVisible(true);
  };

  const guardarCliente = async () => {
    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.trim();

    if (!nombreLimpio) {
      Alert.alert('Campo obligatorio', 'Ingresa el nombre del cliente.');
      return;
    }

    if (telefonoLimpio && !/^[0-9+\s()-]{6,20}$/.test(telefonoLimpio)) {
      Alert.alert(
        'Teléfono inválido',
        'Ingresa un número de teléfono válido.'
      );
      return;
    }

    try {
      setGuardando(true);

      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario) throw errorUsuario;

      if (!user) {
        Alert.alert('Sesión no encontrada', 'Inicia sesión nuevamente.');
        return;
      }

      if (clienteEditando) {
        const { error } = await supabase
          .from('deudores')
          .update({
            nombre: nombreLimpio,
            telefono: telefonoLimpio || null,
          })
          .eq('id', clienteEditando.id)
          .eq('owner_id', user.id);

        if (error) throw error;

        Alert.alert('Listo', 'Cliente actualizado correctamente.');
      } else {
        const { error } = await supabase
          .from('deudores')
          .insert({
            nombre: nombreLimpio,
            telefono: telefonoLimpio || null,
            fecha_registro: new Date().toISOString(),
            whatsapp_habilitado: false,
            owner_id: user.id,
          });

        if (error) throw error;

        Alert.alert('Listo', 'Cliente registrado correctamente.');
      }

      setModalVisible(false);
      await cargarClientes();
    } catch (error: any) {
      Alert.alert(
        'No se pudo guardar',
        error.message || 'Inténtalo nuevamente.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = (cliente: Cliente) => {
    Alert.alert(
      'Eliminar cliente',
      `¿Estás seguro de eliminar a "${cliente.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => eliminarCliente(cliente),
        },
      ]
    );
  };

  const eliminarCliente = async (cliente: Cliente) => {
    try {
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario) throw errorUsuario;

      if (!user) {
        Alert.alert('Sesión no encontrada', 'Inicia sesión nuevamente.');
        return;
      }

      const { error } = await supabase
        .from('deudores')
        .delete()
        .eq('id', cliente.id)
        .eq('owner_id', user.id);

      if (error) throw error;

      setClientes((actuales) =>
        actuales.filter((item) => item.id !== cliente.id)
      );

      Alert.alert('Listo', 'Cliente eliminado.');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message ||
          'No se pudo eliminar el cliente. Comprueba si tiene deudas asociadas.'
      );
    }
  };

  const esDelMesActual = (fecha: string | null) => {
    if (!fecha) return false;

    const fechaCliente = new Date(fecha);
    const ahora = new Date();

    return (
      fechaCliente.getMonth() === ahora.getMonth() &&
      fechaCliente.getFullYear() === ahora.getFullYear()
    );
  };

  const clientesFiltrados = clientes.filter((cliente) => {
    const coincideBusqueda =
      cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (cliente.telefono || '').includes(busqueda);

    const coincideFecha =
      filtroFecha === 'todos' || esDelMesActual(cliente.fecha_registro);

    return coincideBusqueda && coincideFecha;
  });

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return 'Fecha no disponible';

    const fechaObj = new Date(fecha);

    if (Number.isNaN(fechaObj.getTime())) {
      return 'Fecha no disponible';
    }

    return fechaObj.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Clientes</Text>
            <Text style={styles.headerSubtitle}>
              Administra tus clientes
            </Text>
          </View>

          <View style={styles.headerCount}>
            <Text style={styles.headerCountNumber}>
              {clientes.length}
            </Text>
            <Text style={styles.headerCountLabel}>Clientes</Text>
          </View>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Buscar cliente o teléfono..."
              placeholderTextColor="#A99CAF"
              value={busqueda}
              onChangeText={setBusqueda}
            />

            {busqueda.length > 0 && (
              <TouchableOpacity onPress={() => setBusqueda('')}>
                <Text style={styles.clearText}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Mis clientes</Text>
              <Text style={styles.sectionSubtitle}>
                Personas registradas en tu negocio
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={abrirNuevoCliente}
            >
              <Text style={styles.addButtonText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filtroFecha === 'todos' && styles.filterButtonSelected,
              ]}
              onPress={() => setFiltroFecha('todos')}
            >
              <Text
                style={[
                  styles.filterText,
                  filtroFecha === 'todos' && styles.filterTextSelected,
                ]}
              >
                Todos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filtroFecha === 'mes' && styles.filterButtonSelected,
              ]}
              onPress={() => setFiltroFecha('mes')}
            >
              <Text
                style={[
                  styles.filterText,
                  filtroFecha === 'mes' && styles.filterTextSelected,
                ]}
              >
                Este mes
              </Text>
            </TouchableOpacity>
          </View>

          {cargando ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.purple} />
              <Text style={styles.loadingText}>
                Cargando clientes...
              </Text>
            </View>
          ) : clientesFiltrados.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptySymbol}>♙</Text>
              </View>

              <Text style={styles.emptyTitle}>
                {busqueda || filtroFecha === 'mes'
                  ? 'No encontramos resultados'
                  : 'Aún no tienes clientes'}
              </Text>

              <Text style={styles.emptyDescription}>
                {busqueda || filtroFecha === 'mes'
                  ? 'Prueba con otra búsqueda o cambia el filtro.'
                  : 'Agrega tu primer cliente para comenzar a organizar las cuentas de tu negocio.'}
              </Text>

              {!busqueda && filtroFecha === 'todos' && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={abrirNuevoCliente}
                >
                  <Text style={styles.emptyButtonText}>
                    Agregar primer cliente
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            clientesFiltrados.map((cliente) => (
              <View key={cliente.id} style={styles.clientCard}>
                <View style={styles.clientIcon}>
                  <Text style={styles.clientSymbol}>
                    {cliente.nombre.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>
                    {cliente.nombre}
                  </Text>

                  <Text style={styles.clientPhone}>
                    {cliente.telefono || 'Sin teléfono registrado'}
                  </Text>

                  <Text style={styles.clientDate}>
                    Registrado: {formatearFecha(cliente.fecha_registro)}
                  </Text>
                </View>

                <View style={styles.clientActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => abrirEditarCliente(cliente)}
                  >
                    <Text style={styles.editButtonText}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => confirmarEliminar(cliente)}
                  >
                    <Text style={styles.deleteButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <View style={styles.footerSpace} />
        </ScrollView>

        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboard}
            >
              <View style={styles.modalCard}>
                <View style={styles.modalHandle} />

                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>
                      {clienteEditando ? 'Editar cliente' : 'Nuevo cliente'}
                    </Text>

                    <Text style={styles.modalSubtitle}>
                      Completa los datos de tu cliente
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeText}>×</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Nombre del cliente</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Ej. Juan Pérez"
                  placeholderTextColor="#A99CAF"
                  value={nombre}
                  onChangeText={setNombre}
                  maxLength={100}
                  autoCapitalize="words"
                />

                <Text style={styles.label}>Teléfono</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Ej. 987654321"
                  placeholderTextColor="#A99CAF"
                  value={telefono}
                  onChangeText={setTelefono}
                  keyboardType="phone-pad"
                  maxLength={20}
                />

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    guardando && styles.saveButtonDisabled,
                  ]}
                  onPress={guardarCliente}
                  disabled={guardando}
                >
                  {guardando ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {clienteEditando
                        ? 'Guardar cambios'
                        : 'Registrar cliente'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                  disabled={guardando}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 23,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 27,
    borderBottomRightRadius: 27,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    color: COLORS.white,
    fontSize: 34,
    lineHeight: 38,
    marginTop: -4,
  },

  headerText: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '900',
  },

  headerSubtitle: {
    color: '#E9D9F4',
    fontSize: 12,
    marginTop: 3,
  },

  headerCount: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 65,
  },

  headerCountNumber: {
    color: COLORS.purple,
    fontSize: 19,
    fontWeight: '900',
  },

  headerCountLabel: {
    color: COLORS.gray,
    fontSize: 9,
    fontWeight: '700',
  },

  content: {
    paddingHorizontal: 19,
    paddingTop: 22,
  },

  searchBox: {
    height: 52,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  searchIcon: {
    color: COLORS.purple,
    fontSize: 29,
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },

  clearText: {
    color: COLORS.purple,
    fontSize: 24,
    paddingHorizontal: 5,
  },

  sectionHeader: {
    marginTop: 26,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    color: COLORS.darkPurple,
    fontSize: 21,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 4,
  },

  addButton: {
    backgroundColor: COLORS.purple,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  addButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },

  filterContainer: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 16,
  },

  filterButton: {
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  filterButtonSelected: {
    backgroundColor: COLORS.lightPurple,
    borderColor: COLORS.purple,
  },

  filterText: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '700',
  },

  filterTextSelected: {
    color: COLORS.darkPurple,
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 55,
  },

  loadingText: {
    color: COLORS.gray,
    marginTop: 12,
    fontSize: 13,
  },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 25,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyIcon: {
    width: 65,
    height: 65,
    borderRadius: 22,
    backgroundColor: COLORS.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  emptySymbol: {
    color: COLORS.purple,
    fontSize: 34,
    fontWeight: '800',
  },

  emptyTitle: {
    color: COLORS.darkPurple,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },

  emptyDescription: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },

  emptyButton: {
    backgroundColor: COLORS.purple,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginTop: 19,
  },

  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 12,
  },

  clientCard: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: COLORS.darkPurple,
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  clientIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },

  clientSymbol: {
    color: COLORS.purple,
    fontSize: 21,
    fontWeight: '900',
  },

  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },

  clientName: {
    color: COLORS.darkPurple,
    fontSize: 14,
    fontWeight: '900',
  },

  clientPhone: {
    color: COLORS.gray,
    fontSize: 10,
    marginTop: 4,
  },

  clientDate: {
    color: COLORS.gray,
    fontSize: 9,
    marginTop: 5,
  },

  clientActions: {
    alignItems: 'flex-end',
    gap: 7,
  },

  editButton: {
    backgroundColor: COLORS.lightPurple,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  editButtonText: {
    color: COLORS.purple,
    fontSize: 10,
    fontWeight: '800',
  },

  deleteButton: {
    backgroundColor: COLORS.redLight,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  deleteButtonText: {
    color: COLORS.red,
    fontSize: 10,
    fontWeight: '800',
  },

  footerSpace: {
    height: 30,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(48,34,59,0.48)',
    justifyContent: 'flex-end',
  },

  modalKeyboard: {
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    paddingHorizontal: 23,
    paddingTop: 12,
    paddingBottom: 28,
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
    marginBottom: 23,
  },

  modalTitle: {
    color: COLORS.darkPurple,
    fontSize: 22,
    fontWeight: '900',
  },

  modalSubtitle: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 5,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.palePurple,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeText: {
    color: COLORS.darkPurple,
    fontSize: 25,
    lineHeight: 28,
  },

  label: {
    color: COLORS.darkPurple,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 13,
  },

  input: {
    height: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    fontSize: 13,
  },

  saveButton: {
    height: 51,
    borderRadius: 14,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  saveButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },

  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },

  cancelButtonText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
  },
});
