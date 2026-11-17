
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

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
  monto: number;
  fecha_abono: string;
  observacion: string | null;
};

type Cliente = {
  nombre: string;
  telefono: string | null;
};

const dinero = (valor: number) =>
  `S/ ${Number(valor || 0).toFixed(2)}`;

const fechaCompleta = (fecha: string | null) => {
  if (!fecha) return 'Fecha no disponible';

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return date.toLocaleString('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export default function DetalleDeudaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [deuda, setDeuda] = useState<Deuda | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarDetalle = useCallback(async () => {
    try {
      setCargando(true);

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        Alert.alert('Sesión', 'Inicia sesión nuevamente.');
        router.back();
        return;
      }

      const user = authData.user;

      const { data: deudaData, error: deudaError } = await supabase
        .from('deudas')
        .select(
          'id, deudor_id, producto, cantidad, precio, fecha_anotacion'
        )
        .eq('id', Number(id))
        .eq('owner_id', user.id)
        .single();

      if (deudaError || !deudaData) {
        throw new Error('No se pudo encontrar esta deuda.');
      }

      setDeuda(deudaData);

      const { data: clienteData, error: clienteError } = await supabase
        .from('deudores')
        .select('nombre, telefono')
        .eq('id', deudaData.deudor_id)
        .eq('owner_id', user.id)
        .single();

      if (clienteError) {
        throw new Error('No se pudo cargar la información del cliente.');
      }

      setCliente(clienteData);

      const { data: abonosData, error: abonosError } = await supabase
        .from('abonos')
        .select('id, monto, fecha_abono, observacion')
        .eq('deuda_id', deudaData.id)
        .eq('owner_id', user.id)
        .order('fecha_abono', { ascending: false });

      if (abonosError) {
        throw new Error('No se pudieron cargar los abonos.');
      }

      setAbonos(abonosData || []);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Ocurrió un problema al cargar el detalle.'
      );
    } finally {
      setCargando(false);
    }
  }, [id, router]);

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

  const totalAbonado = abonos.reduce(
    (total, abono) => total + Number(abono.monto || 0),
    0
  );

  const totalDeuda = Number(deuda?.precio || 0);
  const saldo = Math.max(0, totalDeuda - totalAbonado);

  if (cargando) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.cargando}>
          <ActivityIndicator size="large" color="#7650C8" />
          <Text style={styles.textoCargando}>Cargando detalle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!deuda) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          style={styles.botonVolver}
          onPress={() => router.back()}
        >
          <Text style={styles.volverTexto}>‹ Volver</Text>
        </TouchableOpacity>

        <Text style={styles.vacio}>No se encontró esta deuda.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.botonVolver}
          onPress={() => router.back()}
        >
          <Text style={styles.volverTexto}>‹ Volver</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Detalle de deuda</Text>
        <Text style={styles.subtitulo}>
          Información completa del producto
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tarjetaProducto}>
          <Text style={styles.etiqueta}>PRODUCTO</Text>
          <Text style={styles.producto}>{deuda.producto}</Text>

          <View style={styles.separador} />

          <Text style={styles.etiqueta}>CLIENTE</Text>
          <Text style={styles.nombreCliente}>
            {cliente?.nombre || 'Cliente'}
          </Text>

          {cliente?.telefono ? (
            <Text style={styles.telefono}>{cliente.telefono}</Text>
          ) : null}

          <View style={styles.separador} />

          <Text style={styles.etiqueta}>REGISTRADO EL</Text>
          <Text style={styles.fecha}>
            {fechaCompleta(deuda.fecha_anotacion)}
          </Text>

          <View style={styles.separador} />

          <View style={styles.fila}>
            <Text style={styles.textoDato}>Cantidad</Text>
            <Text style={styles.valorDato}>
              {deuda.cantidad || 'No especificada'}
            </Text>
          </View>

          <View style={styles.fila}>
            <Text style={styles.textoDato}>Precio total</Text>
            <Text style={styles.valorDato}>
              {dinero(totalDeuda)}
            </Text>
          </View>
        </View>

        <Text style={styles.tituloSeccion}>Resumen de la deuda</Text>

        <View style={styles.resumen}>
          <View style={styles.resumenFila}>
            <Text style={styles.resumenTexto}>Total de la deuda</Text>
            <Text style={styles.resumenValor}>
              {dinero(totalDeuda)}
            </Text>
          </View>

          <View style={styles.resumenFila}>
            <Text style={styles.resumenTexto}>Total abonado</Text>
            <Text style={styles.abonado}>
              {dinero(totalAbonado)}
            </Text>
          </View>

          <View style={styles.lineaResumen} />

          <View style={styles.resumenFila}>
            <Text style={styles.saldoTexto}>Saldo pendiente</Text>
            <Text style={styles.saldo}>
              {dinero(saldo)}
            </Text>
          </View>
        </View>

        <Text style={styles.tituloSeccion}>
          Historial de abonos ({abonos.length})
        </Text>

        {abonos.length === 0 ? (
          <View style={styles.sinAbonos}>
            <Text style={styles.sinAbonosTexto}>
              Todavía no hay abonos registrados para esta deuda.
            </Text>
          </View>
        ) : (
          abonos.map((abono) => (
            <View key={abono.id} style={styles.tarjetaAbono}>
              <View style={styles.abonoSuperior}>
                <Text style={styles.abonoMonto}>
                  + {dinero(Number(abono.monto))}
                </Text>
                <Text style={styles.abonoFecha}>
                  {fechaCompleta(abono.fecha_abono)}
                </Text>
              </View>

              {abono.observacion ? (
                <Text style={styles.observacion}>
                  {abono.observacion}
                </Text>
              ) : null}
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.botonActualizar}
          onPress={cargarDetalle}
        >
          <Text style={styles.botonActualizarTexto}>
            Actualizar información
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6FC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  botonVolver: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 15,
  },
  volverTexto: {
    color: '#7650C8',
    fontSize: 17,
    fontWeight: '700',
  },
  titulo: {
    color: '#241B35',
    fontSize: 27,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitulo: {
    color: '#81778F',
    fontSize: 14,
    marginTop: 5,
  },
  contenido: {
    paddingHorizontal: 18,
    paddingBottom: 35,
  },
  tarjetaProducto: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  etiqueta: {
    color: '#9389A2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 7,
  },
  producto: {
    color: '#241B35',
    fontSize: 23,
    fontWeight: '800',
  },
  nombreCliente: {
    color: '#3C3150',
    fontSize: 17,
    fontWeight: '700',
  },
  telefono: {
    color: '#81778F',
    fontSize: 13,
    marginTop: 4,
  },
  fecha: {
    color: '#7650C8',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
    lineHeight: 23,
  },
  separador: {
    height: 1,
    backgroundColor: '#EEEAF4',
    marginVertical: 17,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  textoDato: {
    color: '#81778F',
    fontSize: 14,
  },
  valorDato: {
    color: '#352A46',
    fontSize: 14,
    fontWeight: '700',
  },
  tituloSeccion: {
    color: '#241B35',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 25,
    marginBottom: 12,
  },
  resumen: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 18,
    elevation: 2,
  },
  resumenFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 7,
  },
  resumenTexto: {
    color: '#81778F',
    fontSize: 14,
  },
  resumenValor: {
    color: '#352A46',
    fontSize: 15,
    fontWeight: '700',
  },
  abonado: {
    color: '#26966A',
    fontSize: 15,
    fontWeight: '800',
  },
  lineaResumen: {
    height: 1,
    backgroundColor: '#EEEAF4',
    marginVertical: 10,
  },
  saldoTexto: {
    color: '#352A46',
    fontSize: 15,
    fontWeight: '800',
  },
  saldo: {
    color: '#7650C8',
    fontSize: 20,
    fontWeight: '900',
  },
  sinAbonos: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
  },
  sinAbonosTexto: {
    color: '#81778F',
    fontSize: 14,
    textAlign: 'center',
  },
  tarjetaAbono: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 16,
    marginBottom: 10,
  },
  abonoSuperior: {
    gap: 7,
  },
  abonoMonto: {
    color: '#26966A',
    fontSize: 18,
    fontWeight: '800',
  },
  abonoFecha: {
    color: '#81778F',
    fontSize: 12,
    textTransform: 'capitalize',
    lineHeight: 19,
  },
  observacion: {
    color: '#554967',
    fontSize: 13,
    marginTop: 10,
  },
  botonActualizar: {
    backgroundColor: '#7650C8',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 22,
  },
  botonActualizarTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cargando: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoCargando: {
    color: '#7650C8',
    marginTop: 12,
    fontWeight: '600',
  },
  vacio: {
    textAlign: 'center',
    color: '#81778F',
    marginTop: 40,
    fontSize: 16,
  },
});
