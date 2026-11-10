
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

type Producto = {
  id: string;
  nombre: string;
  tipo: 'unidad' | 'kilo';
  precio: number;
};

const COLORS = {
  green: '#168A65',
  darkGreen: '#075B43',
  lightGreen: '#DDF5E9',
  paleGreen: '#F0FAF5',
  white: '#FFFFFF',
  background: '#F7FAF8',
  text: '#173D31',
  gray: '#84968D',
  red: '#D9534F',
};

export default function ProductosScreen() {
  const router = useRouter();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [productoEditando, setProductoEditando] =
    useState<Producto | null>(null);

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'unidad' | 'kilo'>('unidad');
  const [precio, setPrecio] = useState('');

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
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
          'Inicia sesión para consultar tus productos.'
        );
        return;
      }

      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, tipo, precio')
        .eq('owner_id', user.id)
        .order('nombre', { ascending: true });

      if (error) throw error;

      setProductos((data || []) as Producto[]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'No se pudieron cargar los productos.'
      );
    } finally {
      setCargando(false);
    }
  };

  const abrirNuevoProducto = () => {
    setProductoEditando(null);
    setNombre('');
    setTipo('unidad');
    setPrecio('');
    setModalVisible(true);
  };

  const abrirEditarProducto = (producto: Producto) => {
    setProductoEditando(producto);
    setNombre(producto.nombre);
    setTipo(producto.tipo);
    setPrecio(String(producto.precio));
    setModalVisible(true);
  };

  const guardarProducto = async () => {
    const nombreLimpio = nombre.trim();
    const precioNumerico = Number(precio.replace(',', '.'));

    if (!nombreLimpio) {
      Alert.alert('Campo obligatorio', 'Ingresa el nombre del producto.');
      return;
    }

    if (!precio.trim() || !Number.isFinite(precioNumerico) || precioNumerico <= 0) {
      Alert.alert('Precio inválido', 'Ingresa un precio mayor que cero.');
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

      if (productoEditando) {
        const { error } = await supabase
          .from('productos')
          .update({
            nombre: nombreLimpio,
            tipo,
            precio: precioNumerico,
          })
          .eq('id', productoEditando.id)
          .eq('owner_id', user.id);

        if (error) throw error;

        Alert.alert('Listo', 'Producto actualizado correctamente.');
      } else {
        const { error } = await supabase
          .from('productos')
          .insert({
            nombre: nombreLimpio,
            tipo,
            precio: precioNumerico,
            owner_id: user.id,
          });

        if (error) throw error;

        Alert.alert('Listo', 'Producto registrado correctamente.');
      }

      setModalVisible(false);
      await cargarProductos();
    } catch (error: any) {
      Alert.alert(
        'No se pudo guardar',
        error.message || 'Inténtalo nuevamente.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = (producto: Producto) => {
    Alert.alert(
      'Eliminar producto',
      `¿Estás seguro de eliminar "${producto.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => eliminarProducto(producto),
        },
      ]
    );
  };

  const eliminarProducto = async (producto: Producto) => {
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
        .from('productos')
        .delete()
        .eq('id', producto.id)
        .eq('owner_id', user.id);

      if (error) throw error;

      setProductos((actuales) =>
        actuales.filter((item) => item.id !== producto.id)
      );

      Alert.alert('Listo', 'Producto eliminado.');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'No se pudo eliminar el producto.'
      );
    }
  };

  const productosFiltrados = productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

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
            <Text style={styles.headerTitle}>Productos</Text>
            <Text style={styles.headerSubtitle}>
              Administra tu catálogo
            </Text>
          </View>

          <View style={styles.headerCount}>
            <Text style={styles.headerCountNumber}>
              {productos.length}
            </Text>
            <Text style={styles.headerCountLabel}>Productos</Text>
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
              placeholder="Buscar producto..."
              placeholderTextColor="#A0B0A7"
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
              <Text style={styles.sectionTitle}>Mi catálogo</Text>
              <Text style={styles.sectionSubtitle}>
                Productos de tu negocio
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={abrirNuevoProducto}
            >
              <Text style={styles.addButtonText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>

          {cargando ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.green} />
              <Text style={styles.loadingText}>
                Cargando productos...
              </Text>
            </View>
          ) : productosFiltrados.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptySymbol}>▦</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {busqueda ? 'No encontramos resultados' : 'Aún no tienes productos'}
              </Text>
              <Text style={styles.emptyDescription}>
                {busqueda
                  ? 'Prueba con otro nombre.'
                  : 'Agrega tu primer producto para comenzar a organizar tu catálogo.'}
              </Text>

              {!busqueda && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={abrirNuevoProducto}
                >
                  <Text style={styles.emptyButtonText}>
                    Agregar primer producto
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            productosFiltrados.map((producto) => (
              <View key={producto.id} style={styles.productCard}>
                <View style={styles.productIcon}>
                  <Text style={styles.productSymbol}>▦</Text>
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productName}>
                    {producto.nombre}
                  </Text>
                  <Text style={styles.productType}>
                    {producto.tipo === 'kilo'
                      ? 'Venta por kilo'
                      : 'Venta por unidad'}
                  </Text>
                  <Text style={styles.productPrice}>
                    S/ {Number(producto.precio).toFixed(2)}
                    <Text style={styles.priceUnit}>
                      {producto.tipo === 'kilo' ? ' / kg' : ' / unidad'}
                    </Text>
                  </Text>
                </View>

                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => abrirEditarProducto(producto)}
                  >
                    <Text style={styles.editButtonText}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => confirmarEliminar(producto)}
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
                      {productoEditando ? 'Editar producto' : 'Nuevo producto'}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      Completa los datos de tu producto
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeText}>×</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Nombre del producto</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Arroz, azúcar, gaseosa..."
                  placeholderTextColor="#A0B0A7"
                  value={nombre}
                  onChangeText={setNombre}
                  maxLength={100}
                />

                <Text style={styles.label}>Tipo de venta</Text>
                <View style={styles.typeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      tipo === 'unidad' && styles.typeOptionSelected,
                    ]}
                    onPress={() => setTipo('unidad')}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        tipo === 'unidad' && styles.typeOptionTextSelected,
                      ]}
                    >
                      Por unidad
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      tipo === 'kilo' && styles.typeOptionSelected,
                    ]}
                    onPress={() => setTipo('kilo')}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        tipo === 'kilo' && styles.typeOptionTextSelected,
                      ]}
                    >
                      Por kilo
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>
                  Precio {tipo === 'kilo' ? 'por kilo' : 'por unidad'}
                </Text>

                <View style={styles.priceInputContainer}>
                  <Text style={styles.currency}>S/</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0.00"
                    placeholderTextColor="#A0B0A7"
                    value={precio}
                    onChangeText={setPrecio}
                    keyboardType="decimal-pad"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    guardando && styles.saveButtonDisabled,
                  ]}
                  onPress={guardarProducto}
                  disabled={guardando}
                >
                  {guardando ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {productoEditando
                        ? 'Guardar cambios'
                        : 'Registrar producto'}
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
    backgroundColor: COLORS.green,
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
    color: '#D8F5E8',
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
    color: COLORS.green,
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
    borderColor: '#E4EEE8',
  },

  searchIcon: {
    color: COLORS.green,
    fontSize: 29,
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },

  clearText: {
    color: COLORS.green,
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
    color: COLORS.darkGreen,
    fontSize: 21,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 4,
  },

  addButton: {
    backgroundColor: COLORS.green,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  addButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
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
    borderColor: '#E7EFEA',
  },

  emptyIcon: {
    width: 65,
    height: 65,
    borderRadius: 22,
    backgroundColor: COLORS.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  emptySymbol: {
    color: COLORS.green,
    fontSize: 34,
    fontWeight: '800',
  },

  emptyTitle: {
    color: COLORS.darkGreen,
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
    backgroundColor: COLORS.green,
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

  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7EFEA',
    elevation: 2,
    shadowColor: '#173D31',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  productSymbol: {
    color: COLORS.green,
    fontSize: 27,
    fontWeight: '800',
  },

  productInfo: {
    flex: 1,
    marginLeft: 12,
  },

  productName: {
    color: COLORS.darkGreen,
    fontSize: 14,
    fontWeight: '900',
  },

  productType: {
    color: COLORS.gray,
    fontSize: 10,
    marginTop: 4,
  },

  productPrice: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 6,
  },

  priceUnit: {
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '500',
  },

  productActions: {
    alignItems: 'flex-end',
    gap: 7,
  },

  editButton: {
    backgroundColor: COLORS.lightGreen,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  editButtonText: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '800',
  },

  deleteButton: {
    backgroundColor: '#FFF0EF',
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
    backgroundColor: 'rgba(5,35,25,0.48)',
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
    backgroundColor: '#DCE8E0',
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
    color: COLORS.darkGreen,
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
    backgroundColor: COLORS.paleGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeText: {
    color: COLORS.darkGreen,
    fontSize: 25,
    lineHeight: 28,
  },

  label: {
    color: COLORS.darkGreen,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 13,
  },

  input: {
    height: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#DFEBE3',
    paddingHorizontal: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    fontSize: 13,
  },

  typeContainer: {
    flexDirection: 'row',
    gap: 10,
  },

  typeOption: {
    flex: 1,
    height: 47,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFEBE3',
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  typeOptionSelected: {
    backgroundColor: COLORS.lightGreen,
    borderColor: COLORS.green,
  },

  typeOptionText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
  },

  typeOptionTextSelected: {
    color: COLORS.darkGreen,
  },

  priceInputContainer: {
    height: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#DFEBE3',
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  currency: {
    color: COLORS.green,
    fontWeight: '900',
    fontSize: 15,
    marginRight: 10,
  },

  priceInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },

  saveButton: {
    height: 51,
    borderRadius: 14,
    backgroundColor: COLORS.green,
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
