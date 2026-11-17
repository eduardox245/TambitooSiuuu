
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Cliente = {
  id: number;
  nombre: string;
  telefono: string | null;
};

type Deuda = {
  id: number;
  deudor_id: number;
  producto: string;
  cantidad: string | null;
  precio: number;
  fecha_anotacion: string | null;
};

type Articulo = {
  id: number;
  deuda_id: number;
  producto: string;
  cantidad: string | null;
  precio: number;
};

type Abono = {
  id: number;
  deuda_id: number;
  monto: number;
  fecha_abono: string | null;
  observacion: string | null;
};

const C = {
  morado: '#652A91',
  oscuro: '#54316F',
  claro: '#E8D8F3',
  suave: '#F5EEFA',
  pastel: '#C9A9E0',
  amarillo: '#FFD044',
  blanco: '#FFFFFF',
  fondo: '#F7F2FA',
  texto: '#30223B',
  gris: '#887D91',
  borde: '#E8DDEF',
  verdeWhatsApp: '#25D366',
  rojo: '#B45A83',
};

const dinero = (valor: number) =>
  `S/ ${Number(valor || 0).toFixed(2)}`;

const fechaCompleta = (fecha: string | null) => {
  if (!fecha) return 'Fecha no disponible';

  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return date.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const obtenerTelefono = (telefono: string | null) => {
  if (!telefono?.trim()) return null;

  let numero = telefono.replace(/\D/g, '');

  if (numero.length === 9) {
    numero = `51${numero}`;
  }

  if (numero.length !== 11 || !numero.startsWith('51')) {
    return null;
  }

  return numero;
};

export default function DetalleClienteScreen() {
  const router = useRouter();
  const { clienteId } = useLocalSearchParams<{ clienteId: string }>();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarCuenta = useCallback(async () => {
    try {
      setCargando(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error('Inicia sesión nuevamente.');

      const id = Number(clienteId);
      if (!Number.isFinite(id)) {
        throw new Error('El cliente no es válido.');
      }

      const { data: clienteData, error: clienteError } = await supabase
        .from('deudores')
        .select('id,nombre,telefono')
        .eq('id', id)
        .eq('owner_id', user.id)
        .single();

      if (clienteError) throw clienteError;

      const { data: deudasData, error: deudasError } = await supabase
        .from('deudas')
        .select('id,deudor_id,producto,cantidad,precio,fecha_anotacion')
        .eq('deudor_id', id)
        .eq('owner_id', user.id)
        .order('fecha_anotacion', { ascending: false });

      if (deudasError) throw deudasError;

      const listaDeudas = (deudasData || []) as Deuda[];
      const ids = listaDeudas.map(d => d.id);

      let listaArticulos: Articulo[] = [];
      let listaAbonos: Abono[] = [];

      if (ids.length > 0) {
        const [rArticulos, rAbonos] = await Promise.all([
          supabase
            .from('detalle_deudas')
            .select('id,deuda_id,producto,cantidad,precio')
            .eq('owner_id', user.id)
            .in('deuda_id', ids),

          supabase
            .from('abonos')
            .select('id,deuda_id,monto,fecha_abono,observacion')
            .eq('owner_id', user.id)
            .in('deuda_id', ids)
            .order('fecha_abono', { ascending: false }),
        ]);

        if (rArticulos.error) throw rArticulos.error;
        if (rAbonos.error) throw rAbonos.error;

        listaArticulos = (rArticulos.data || []) as Articulo[];
        listaAbonos = (rAbonos.data || []) as Abono[];
      }

      setCliente(clienteData as Cliente);
      setDeudas(listaDeudas);
      setArticulos(listaArticulos);
      setAbonos(listaAbonos);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'No se pudo cargar la cuenta del cliente.',
        [{ text: 'Volver', onPress: () => router.back() }]
      );
    } finally {
      setCargando(false);
    }
  }, [clienteId, router]);

  useEffect(() => {
    cargarCuenta();
  }, [cargarCuenta]);

  const totalComprado = deudas.reduce(
    (suma, deuda) => suma + Number(deuda.precio || 0),
    0
  );

  const totalAbonado = abonos.reduce(
    (suma, abono) => suma + Number(abono.monto || 0),
    0
  );

  const saldoPendiente = Math.max(0, totalComprado - totalAbonado);

  const abonosDeDeuda = (deudaId: number) =>
    abonos.filter(abono => abono.deuda_id === deudaId);

  const articulosDeDeuda = (deudaId: number) =>
    articulos.filter(articulo => articulo.deuda_id === deudaId);

  const totalAbonadoDeDeuda = (deudaId: number) =>
    abonosDeDeuda(deudaId).reduce(
      (suma, abono) => suma + Number(abono.monto || 0),
      0
    );

  const formatearCantidad = (cantidad: string | null) => {
    if (!cantidad?.trim()) return '';
    return cantidad.trim();
  };

  // WhatsApp de una compra individual: saludo, productos, cantidades y precios.
  const enviarCompraWhatsApp = async (deuda: Deuda) => {
    if (!cliente?.telefono?.trim()) {
      Alert.alert(
        'Sin teléfono',
        'Este cliente no tiene un número registrado.'
      );
      return;
    }

    const telefono = obtenerTelefono(cliente.telefono);

    if (!telefono) {
      Alert.alert(
        'Número no válido',
        'Revisa que el teléfono tenga un número válido de Perú (9 dígitos).'
      );
      return;
    }

    const productosCompra = articulosDeDeuda(deuda.id);

    const lineasProductos = productosCompra.length > 0
      ? productosCompra.map(articulo => {
          const cantidad = formatearCantidad(articulo.cantidad);

          return `• ${articulo.producto}${
            cantidad ? ` — ${cantidad}` : ''
          } — ${dinero(Number(articulo.precio))}`;
        })
      : [
          `• ${deuda.producto}${
            formatearCantidad(deuda.cantidad)
              ? ` — ${formatearCantidad(deuda.cantidad)}`
              : ''
          } — ${dinero(Number(deuda.precio))}`,
        ];

    const mensaje = `mas ${lineasProductos
  .map(linea => linea.replace(/^• /, '').replace(/ — /g, ' '))
  .join(', ')}`;

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'No se pudo abrir WhatsApp',
        'Comprueba que WhatsApp esté instalado o disponible en tu dispositivo.'
      );
    }
  };

  // WhatsApp general con el estado de cuenta completo.
  const enviarWhatsApp = async () => {
    if (!cliente?.telefono?.trim()) {
      Alert.alert(
        'Sin teléfono',
        'Este cliente no tiene un número registrado.'
      );
      return;
    }

    const telefono = obtenerTelefono(cliente.telefono);

    if (!telefono) {
      Alert.alert(
        'Número no válido',
        'Revisa que el teléfono tenga un número válido de Perú (9 dígitos).'
      );
      return;
    }

    const comprasTexto = deudas
      .filter(deuda => {
        const abonado = totalAbonadoDeDeuda(deuda.id);
        return Number(deuda.precio) - abonado > 0.009;
      })
      .map((deuda, index) => {
        const saldo = Math.max(
          0,
          Number(deuda.precio) - totalAbonadoDeDeuda(deuda.id)
        );

        return `${index + 1}. ${fechaCompleta(deuda.fecha_anotacion)}\n   ${dinero(saldo)} pendiente`;
      });

    const mensaje = [
      `Hola, ${cliente.nombre}.`,
      '',
      'Te comparto el resumen de tu cuenta:',
      `Total de compras: ${dinero(totalComprado)}`,
      `Total abonado: ${dinero(totalAbonado)}`,
      `Saldo pendiente: ${dinero(saldoPendiente)}`,
      '',
      comprasTexto.length
        ? `Compras con saldo pendiente:\n${comprasTexto.join('\n')}`
        : 'Actualmente no tienes compras pendientes.',
      '',
      'Gracias.',
    ].join('\n');

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'No se pudo abrir WhatsApp',
        'Comprueba que WhatsApp esté instalado o disponible en tu dispositivo.'
      );
    }
  };

  if (cargando) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={C.morado} />
          <Text style={styles.loadingText}>Cargando cuenta del cliente...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cliente) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.emptyText}>No se encontró este cliente.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹ Volver</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Estado de cuenta</Text>
        <Text style={styles.headerSubtitle}>Historial completo de compras</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.clientCard}>
          <View style={styles.clientTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {cliente.nombre.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{cliente.nombre}</Text>
              <Text style={styles.clientPhone}>
                {cliente.telefono || 'Sin teléfono registrado'}
              </Text>
            </View>
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>DEBE ACTUALMENTE</Text>
            <Text style={styles.summaryBalance}>{dinero(saldoPendiente)}</Text>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.smallLabel}>Total comprado</Text>
                <Text style={styles.summaryValue}>
                  {dinero(totalComprado)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.smallLabel}>Total abonado</Text>
                <Text style={styles.summaryPaid}>
                  {dinero(totalAbonado)}
                </Text>
              </View>
            </View>
          </View>

          {cliente.telefono?.trim() ? (
            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={enviarWhatsApp}
            >
              <Text style={styles.whatsappIcon}>●</Text>
              <Text style={styles.whatsappText}>
                Enviar estado de cuenta por WhatsApp
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noPhone}>
              <Text style={styles.noPhoneText}>
                Registra un teléfono en Clientes para enviar el estado de
                cuenta por WhatsApp.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Todas las compras</Text>
            <Text style={styles.sectionSubtitle}>
              {deudas.length}{' '}
              {deudas.length === 1
                ? 'compra registrada'
                : 'compras registradas'}
            </Text>
          </View>
        </View>

        {deudas.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Todavía no hay compras</Text>
            <Text style={styles.emptyDescription}>
              Cuando registres una compra para este cliente, aparecerá aquí.
            </Text>
          </View>
        ) : (
          deudas.map((deuda, index) => {
            const productosCompra = articulosDeDeuda(deuda.id);
            const abonado = totalAbonadoDeDeuda(deuda.id);
            const total = Number(deuda.precio || 0);
            const saldo = Math.max(0, total - abonado);
            const porcentaje =
              total > 0 ? Math.min(100, (abonado / total) * 100) : 0;

            return (
              <View key={deuda.id} style={styles.purchaseCard}>
                <View style={styles.purchaseHeader}>
                  <View style={styles.purchaseNumber}>
                    <Text style={styles.purchaseNumberText}>
                      #{deudas.length - index}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.purchaseTitle}>Compra</Text>
                    <Text style={styles.purchaseDate}>
                      {fechaCompleta(deuda.fecha_anotacion)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.status,
                      saldo <= 0.009
                        ? styles.statusPaid
                        : styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        saldo <= 0.009
                          ? styles.statusTextPaid
                          : styles.statusTextPending,
                      ]}
                    >
                      {saldo <= 0.009 ? 'Pagado' : 'Pendiente'}
                    </Text>
                  </View>
                </View>

                <View style={styles.productsDivider} />

                <Text style={styles.productsTitle}>
                  Productos de esta compra
                </Text>

                {productosCompra.length > 0 ? (
                  productosCompra.map(articulo => (
                    <View key={articulo.id} style={styles.productRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName}>
                          {articulo.producto}
                        </Text>
                        <Text style={styles.productQuantity}>
                          {articulo.cantidad || 'Cantidad no especificada'}
                        </Text>
                      </View>
                      <Text style={styles.productPrice}>
                        {dinero(Number(articulo.precio))}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.productRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>{deuda.producto}</Text>
                      <Text style={styles.productQuantity}>
                        {deuda.cantidad || 'Sin detalle de productos'}
                      </Text>
                    </View>
                    <Text style={styles.productPrice}>{dinero(total)}</Text>
                  </View>
                )}

                <View style={styles.totalDivider} />

                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Total de compra</Text>
                  <Text style={styles.amountValue}>{dinero(total)}</Text>
                </View>

                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Abonado</Text>
                  <Text style={styles.amountPaid}>{dinero(abonado)}</Text>
                </View>

                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Saldo pendiente</Text>
                  <Text style={styles.amountBalance}>{dinero(saldo)}</Text>
                </View>

                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${porcentaje}%` },
                    ]}
                  />
                </View>

                <TouchableOpacity
                  style={styles.purchaseWhatsApp}
                  onPress={() => enviarCompraWhatsApp(deuda)}
                >
                  <Text style={styles.purchaseWhatsAppText}>
                    ● Enviar esta compra por WhatsApp
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() =>
                    router.push({
                      pathname: '/detalle-deuda',
                      params: { id: String(deuda.id) },
                    })
                  }
                >
                  <Text style={styles.detailsButtonText}>
                    Ver historial de pagos y detalle ›
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={cargarCuenta}
        >
          <Text style={styles.refreshText}>Actualizar cuenta</Text>
        </TouchableOpacity>

        <View style={{ height: 25 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.fondo },
  header: {
    backgroundColor: C.blanco,
    paddingHorizontal: 19,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borde,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingRight: 12,
  },
  backText: { color: C.morado, fontSize: 16, fontWeight: '800' },
  headerTitle: {
    color: C.texto,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 5,
  },
  headerSubtitle: { color: C.gris, fontSize: 12, marginTop: 4 },
  content: { padding: 16, paddingBottom: 30 },
  clientCard: {
    backgroundColor: C.blanco,
    borderRadius: 19,
    padding: 15,
    borderWidth: 1,
    borderColor: C.borde,
    marginBottom: 22,
  },
  clientTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.claro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: C.oscuro, fontSize: 20, fontWeight: '900' },
  clientName: { color: C.texto, fontSize: 17, fontWeight: '900' },
  clientPhone: { color: C.gris, fontSize: 12, marginTop: 4 },
  summary: {
    backgroundColor: C.oscuro,
    borderRadius: 16,
    padding: 17,
  },
  summaryLabel: {
    color: '#E8D8F3',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  summaryBalance: {
    color: C.amarillo,
    fontSize: 29,
    fontWeight: '900',
    marginTop: 5,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#8D70A5',
    marginVertical: 14,
  },
  summaryRow: { flexDirection: 'row' },
  summaryItem: { flex: 1 },
  smallLabel: { color: '#E8D8F3', fontSize: 10, marginBottom: 5 },
  summaryValue: { color: C.blanco, fontSize: 15, fontWeight: '800' },
  summaryPaid: { color: C.amarillo, fontSize: 15, fontWeight: '800' },

  // WhatsApp conserva su verde original.
  whatsappButton: {
    backgroundColor: C.verdeWhatsApp,
    minHeight: 47,
    borderRadius: 12,
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  whatsappIcon: { color: C.blanco, fontSize: 13, marginRight: 8 },
  whatsappText: { color: C.blanco, fontSize: 12, fontWeight: '900' },

  noPhone: {
    backgroundColor: C.suave,
    borderRadius: 11,
    padding: 12,
    marginTop: 12,
  },
  noPhoneText: {
    color: C.gris,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  sectionHeader: { marginBottom: 13 },
  sectionTitle: { color: C.texto, fontSize: 18, fontWeight: '900' },
  sectionSubtitle: { color: C.gris, fontSize: 11, marginTop: 4 },
  purchaseCard: {
    backgroundColor: C.blanco,
    borderRadius: 17,
    padding: 15,
    borderWidth: 1,
    borderColor: C.borde,
    marginBottom: 13,
  },
  purchaseHeader: { flexDirection: 'row', alignItems: 'center' },
  purchaseNumber: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.claro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  purchaseNumberText: {
    color: C.oscuro,
    fontWeight: '900',
    fontSize: 12,
  },
  purchaseTitle: { color: C.texto, fontSize: 14, fontWeight: '900' },
  purchaseDate: {
    color: C.gris,
    fontSize: 10,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  status: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9 },
  statusPaid: { backgroundColor: '#E8D8F3' },
  statusPending: { backgroundColor: '#F0E4F7' },
  statusText: { fontSize: 10, fontWeight: '900' },
  statusTextPaid: { color: '#652A91' },
  statusTextPending: { color: '#76518E' },
  productsDivider: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 13,
  },
  productsTitle: {
    color: C.morado,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 5,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F2EDF5',
  },
  productName: { color: C.texto, fontSize: 12, fontWeight: '800' },
  productQuantity: { color: C.gris, fontSize: 10, marginTop: 3 },
  productPrice: {
    color: C.oscuro,
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 10,
  },
  totalDivider: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 11,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  amountLabel: { color: C.gris, fontSize: 11 },
  amountValue: { color: C.texto, fontSize: 12, fontWeight: '800' },
  amountPaid: { color: C.morado, fontSize: 12, fontWeight: '800' },
  amountBalance: { color: C.rojo, fontSize: 12, fontWeight: '900' },
  progressBackground: {
    height: 6,
    backgroundColor: '#EEE5F3',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    height: 6,
    backgroundColor: C.pastel,
    borderRadius: 8,
  },

  // El botón individual de WhatsApp también conserva el verde original.
  purchaseWhatsApp: {
    backgroundColor: C.verdeWhatsApp,
    borderRadius: 11,
    padding: 13,
    alignItems: 'center',
    marginTop: 13,
  },
  purchaseWhatsAppText: {
    color: C.blanco,
    fontSize: 12,
    fontWeight: '900',
  },
  detailsButton: {
    backgroundColor: C.claro,
    borderRadius: 11,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  detailsButtonText: {
    color: C.morado,
    fontSize: 11,
    fontWeight: '900',
  },
  emptyCard: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    padding: 22,
    alignItems: 'center',
  },
  emptyTitle: { color: C.texto, fontSize: 15, fontWeight: '900' },
  emptyDescription: {
    color: C.gris,
    textAlign: 'center',
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
  },
  refreshButton: {
    backgroundColor: C.morado,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  refreshText: { color: C.blanco, fontSize: 12, fontWeight: '900' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: C.gris, marginTop: 12, fontSize: 12 },
  emptyText: {
    color: C.gris,
    textAlign: 'center',
    marginTop: 35,
    fontSize: 14,
  },
});
