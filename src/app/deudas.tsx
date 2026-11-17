
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Cliente = {
  id: number;
  nombre: string;
  telefono: string | null;
};

type Producto = {
  id: number;
  nombre: string;
  tipo: 'unidad' | 'kilo';
  precio: number;
};

type Deuda = {
  id: number;
  deudor_id: number;
  producto: string;
  cantidad: string | null;
  precio: number;
  fecha_anotacion: string | null;
  owner_id: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  abonado: number;
  saldo: number;
};

type CuentaCliente = {
  cliente: Cliente;
  deudas: Deuda[];
  total: number;
  abonado: number;
  saldo: number;
};

type Articulo = {
  id: string;
  producto: string;
  cantidad: string;
  precio: number;
};

const C = {
  morado: '#652A91',
  moradoOscuro: '#40165F',
  moradoClaro: '#EFE4F8',
  moradoSuave: '#F8F3FC',
  amarillo: '#FFD044',
  blanco: '#FFFFFF',
  fondo: '#F8F5FA',
  texto: '#30223B',
  gris: '#887D91',
  borde: '#EAE2F0',
  rojo: '#D9534F',
  verde: '#25D366',
};

const dinero = (valor: number) => `S/ ${Number(valor || 0).toFixed(2)}`;

export default function DeudasScreen() {
  const router = useRouter();

  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [buscarCliente, setBuscarCliente] = useState('');
  const [buscarProducto, setBuscarProducto] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [mostrarProductos, setMostrarProductos] = useState(false);

  const [cantidad, setCantidad] = useState('');
  const [modoKilo, setModoKilo] = useState<'precio' | 'peso'>('precio');
  const [unidadPeso, setUnidadPeso] = useState<'g' | 'kg'>('g');
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [conceptoDirecto, setConceptoDirecto] = useState('');
  const [montoDirecto, setMontoDirecto] = useState('');
  const [mostrarMontoDirecto, setMostrarMontoDirecto] = useState(false);

  const numero = (valor: string) => Number(valor.trim().replace(',', '.'));

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        Alert.alert('Sesión', 'Inicia sesión para consultar las deudas.');
        return;
      }

      const [rClientes, rProductos, rDeudas] = await Promise.all([
        supabase.from('deudores')
          .select('id,nombre,telefono')
          .eq('owner_id', user.id)
          .order('nombre', { ascending: true }),
        supabase.from('productos')
          .select('id,nombre,tipo,precio')
          .eq('owner_id', user.id)
          .order('nombre', { ascending: true }),
        supabase.from('deudas')
          .select('id,deudor_id,producto,cantidad,precio,fecha_anotacion,owner_id')
          .eq('owner_id', user.id)
          .order('fecha_anotacion', { ascending: false }),
      ]);

      if (rClientes.error) throw rClientes.error;
      if (rProductos.error) throw rProductos.error;
      if (rDeudas.error) throw rDeudas.error;

      const listaClientes = (rClientes.data || []) as Cliente[];
      const listaProductos = (rProductos.data || []) as Producto[];
      const datosDeudas = rDeudas.data || [];

      let abonos: { deuda_id: number | null; monto: number }[] = [];
      if (datosDeudas.length) {
        const ids = datosDeudas.map((d: any) => d.id);
        const { data, error } = await supabase.from('abonos')
          .select('deuda_id,monto')
          .eq('owner_id', user.id)
          .in('deuda_id', ids);
        if (error) throw error;
        abonos = (data || []) as typeof abonos;
      }

      const preparadas: Deuda[] = datosDeudas.map((d: any) => {
        const cliente = listaClientes.find(c => c.id === d.deudor_id);
        const abonado = abonos
          .filter(a => a.deuda_id === d.id)
          .reduce((s, a) => s + Number(a.monto || 0), 0);
        const precio = Number(d.precio || 0);

        return {
          ...d,
          clienteNombre: cliente?.nombre || 'Cliente no encontrado',
          clienteTelefono: cliente?.telefono || null,
          abonado,
          saldo: Math.max(0, precio - abonado),
        };
      });

      setClientes(listaClientes);
      setProductos(listaProductos);
      setDeudas(preparadas);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudieron cargar los datos.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cuentas = useMemo<CuentaCliente[]>(() => {
    const agrupadas = new Map<number, Deuda[]>();
    deudas.forEach(deuda => {
      const lista = agrupadas.get(deuda.deudor_id) || [];
      lista.push(deuda);
      agrupadas.set(deuda.deudor_id, lista);
    });

    return clientes
      .filter(cliente => agrupadas.has(cliente.id))
      .map(cliente => {
        const compras = agrupadas.get(cliente.id) || [];
        return {
          cliente,
          deudas: compras,
          total: compras.reduce((s, d) => s + Number(d.precio || 0), 0),
          abonado: compras.reduce((s, d) => s + d.abonado, 0),
          saldo: compras.reduce((s, d) => s + d.saldo, 0),
        };
      })
      .sort((a, b) => a.cliente.nombre.localeCompare(b.cliente.nombre));
  }, [clientes, deudas]);

  const cuentasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return cuentas;
    return cuentas.filter(cuenta =>
      cuenta.cliente.nombre.toLowerCase().includes(texto) ||
      (cuenta.cliente.telefono || '').includes(texto) ||
      cuenta.deudas.some(d => d.producto.toLowerCase().includes(texto))
    );
  }, [cuentas, busqueda]);

  const totalDeudas = deudas.reduce((s, d) => s + Number(d.precio || 0), 0);
  const totalAbonado = deudas.reduce((s, d) => s + d.abonado, 0);
  const totalPendiente = deudas.reduce((s, d) => s + d.saldo, 0);

  const limpiarFormulario = () => {
    setClienteSeleccionado(null);
    setBuscarCliente('');
    setBuscarProducto('');
    setProductoSeleccionado(null);
    setCantidad('');
    setModoKilo('precio');
    setUnidadPeso('g');
    setArticulos([]);
    setConceptoDirecto('');
    setMontoDirecto('');
    setMostrarClientes(false);
    setMostrarProductos(false);
    setMostrarMontoDirecto(false);
  };

  const abrirNuevaDeuda = () => {
    limpiarFormulario();
    setModalVisible(true);
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(buscarCliente.trim().toLowerCase())
  );

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(buscarProducto.trim().toLowerCase())
  );

  const calcularArticulo = () => {
    if (!productoSeleccionado || !cantidad.trim()) return null;
    const valor = numero(cantidad);
    const precio = Number(productoSeleccionado.precio);
    if (!Number.isFinite(valor) || valor <= 0 || !Number.isFinite(precio) || precio <= 0) return null;

    if (productoSeleccionado.tipo === 'unidad') {
      return { total: valor * precio, detalle: `${valor} unidades`, cantidad: `${valor} unidades` };
    }

    if (modoKilo === 'precio') {
      const kg = valor / precio;
      const gramos = kg * 1000;
      const texto = gramos >= 1000 ? `${kg.toFixed(3)} kg` : `${gramos.toFixed(0)} g`;
      return { total: valor, detalle: texto, cantidad: texto };
    }

    const kg = unidadPeso === 'g' ? valor / 1000 : valor;
    const gramos = kg * 1000;
    const texto = gramos >= 1000 ? `${kg.toFixed(3)} kg` : `${gramos.toFixed(0)} g`;
    return { total: kg * precio, detalle: texto, cantidad: texto };
  };

  const agregarProducto = () => {
    if (!productoSeleccionado) {
      Alert.alert('Selecciona un producto', 'Elige un producto primero.');
      return;
    }
    const calculo = calcularArticulo();
    if (!calculo || calculo.total <= 0) {
      Alert.alert('Dato inválido', 'Ingresa una cantidad, peso o precio válido.');
      return;
    }

    setArticulos(actuales => [...actuales, {
      id: `${Date.now()}-${Math.random()}`,
      producto: productoSeleccionado.nombre,
      cantidad: calculo.cantidad,
      precio: Number(calculo.total.toFixed(2)),
    }]);
    setProductoSeleccionado(null);
    setBuscarProducto('');
    setCantidad('');
    setModoKilo('precio');
    setUnidadPeso('g');
    setMostrarProductos(false);
  };

  const agregarMontoDirecto = () => {
    const concepto = conceptoDirecto.trim();
    const monto = numero(montoDirecto);
    if (!concepto) {
      Alert.alert('Falta el concepto', 'Escribe una descripción.');
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor que cero.');
      return;
    }

    setArticulos(actuales => [...actuales, {
      id: `${Date.now()}-${Math.random()}`,
      producto: concepto,
      cantidad: 'Monto directo',
      precio: Number(monto.toFixed(2)),
    }]);
    setConceptoDirecto('');
    setMontoDirecto('');
    setMostrarMontoDirecto(false);
  };

  const totalFormulario = articulos.reduce((s, a) => s + a.precio, 0);

  const guardarDeuda = async () => {
    if (!clienteSeleccionado) {
      Alert.alert('Selecciona un cliente', 'Debes elegir un cliente.');
      return;
    }
    if (!articulos.length) {
      Alert.alert('No hay artículos', 'Agrega al menos un producto o monto.');
      return;
    }

    try {
      setGuardando(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Inicia sesión nuevamente.');

      const total = Number(totalFormulario.toFixed(2));
      const { data: nueva, error: errorDeuda } = await supabase.from('deudas')
        .insert({
          deudor_id: clienteSeleccionado.id,
          producto: `Compra (${articulos.length} productos)`,
          cantidad: `${articulos.length} productos`,
          precio: total,
          owner_id: user.id,
        })
        .select('id')
        .single();

      if (errorDeuda) throw errorDeuda;
      if (!nueva) throw new Error('No se pudo obtener la compra creada.');

      const detalles = articulos.map(a => ({
        deuda_id: nueva.id,
        producto: a.producto,
        cantidad: a.cantidad,
        precio: Number(a.precio.toFixed(2)),
        owner_id: user.id,
      }));

      const { error: errorDetalles } = await supabase.from('detalle_deudas').insert(detalles);
      if (errorDetalles) {
        await supabase.from('deudas').delete().eq('id', nueva.id).eq('owner_id', user.id);
        throw errorDetalles;
      }

      setModalVisible(false);
      limpiarFormulario();
      await cargarDatos();
      Alert.alert('¡Compra registrada!', `Se guardó una compra de ${dinero(total)}.`);
    } catch (error: any) {
      Alert.alert('No se pudo guardar', error.message || 'Inténtalo nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Deudas</Text>
            <Text style={styles.headerSubtitle}>Cuentas por cliente</Text>
          </View>
          <View style={styles.counter}>
            <Text style={styles.counterNumber}>{cuentas.length}</Text>
            <Text style={styles.counterLabel}>Clientes</Text>
          </View>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Resumen de tu negocio</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total registrado</Text>
                <Text style={styles.summaryValue}>{dinero(totalDeudas)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total abonado</Text>
                <Text style={styles.summaryPaid}>{dinero(totalAbonado)}</Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <Text style={styles.summaryLabel}>Saldo pendiente</Text>
            <Text style={styles.pendingValue}>{dinero(totalPendiente)}</Text>
          </View>

          <View style={styles.search}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar cliente o producto..."
              placeholderTextColor={C.gris}
              value={busqueda}
              onChangeText={setBusqueda}
            />
            {!!busqueda && <TouchableOpacity onPress={() => setBusqueda('')}><Text style={styles.clear}>×</Text></TouchableOpacity>}
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Cuentas pendientes</Text>
              <Text style={styles.sectionSubtitle}>Toca un cliente para revisar todas sus compras</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={abrirNuevaDeuda}>
              <Text style={styles.addButtonText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>

          {cargando ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={C.morado} />
              <Text style={styles.loadingText}>Cargando cuentas...</Text>
            </View>
          ) : cuentasFiltradas.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>$</Text>
              <Text style={styles.emptyTitle}>{busqueda ? 'No encontramos resultados' : 'Aún no tienes cuentas pendientes'}</Text>
              <Text style={styles.emptyText}>{busqueda ? 'Prueba con otro nombre o producto.' : 'Registra una compra para comenzar a controlar las cuentas de tus clientes.'}</Text>
              {!busqueda && <TouchableOpacity style={styles.emptyButton} onPress={abrirNuevaDeuda}><Text style={styles.emptyButtonText}>Registrar primera compra</Text></TouchableOpacity>}
            </View>
          ) : (
            cuentasFiltradas.map(cuenta => (
              <TouchableOpacity
                key={cuenta.cliente.id}
                activeOpacity={0.82}
                style={styles.clientCard}
                onPress={() => router.push({
                  pathname: '/detalle-cliente',
                  params: { clienteId: String(cuenta.cliente.id) },
                })}
              >
                <View style={styles.clientTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{cuenta.cliente.nombre.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{cuenta.cliente.nombre}</Text>
                    <Text style={styles.clientPhone}>{cuenta.cliente.telefono || 'Sin teléfono registrado'}</Text>
                    <Text style={styles.purchaseCount}>{cuenta.deudas.length} {cuenta.deudas.length === 1 ? 'compra registrada' : 'compras registradas'}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
                <View style={styles.clientDivider} />
                <View style={styles.clientAmounts}>
                  <View>
                    <Text style={styles.amountLabel}>Total comprado</Text>
                    <Text style={styles.amountValue}>{dinero(cuenta.total)}</Text>
                  </View>
                  <View>
                    <Text style={styles.amountLabel}>Abonado</Text>
                    <Text style={styles.paidValue}>{dinero(cuenta.abonado)}</Text>
                  </View>
                  <View>
                    <Text style={styles.amountLabel}>Debe</Text>
                    <Text style={styles.balanceValue}>{dinero(cuenta.saldo)}</Text>
                  </View>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${cuenta.total > 0 ? Math.min(100, cuenta.abonado / cuenta.total * 100) : 0}%` }]} />
                </View>
                <Text style={styles.openHint}>Ver cuenta completa y compras ›</Text>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 28 }} />
        </ScrollView>

        <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.overlay}>
            <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.modal}>
                <View style={styles.handle} />
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Nueva compra</Text>
                    <Text style={styles.modalSubtitle}>Agrega todos los productos antes de guardar</Text>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}><Text style={styles.closeText}>×</Text></TouchableOpacity>
                </View>

                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <Text style={styles.label}>Cliente</Text>
                  <TouchableOpacity style={styles.select} onPress={() => { setMostrarClientes(!mostrarClientes); setMostrarProductos(false); }}>
                    <Text style={!clienteSeleccionado ? styles.placeholder : styles.selectText}>{clienteSeleccionado?.nombre || 'Seleccionar cliente'}</Text>
                    <Text style={styles.selectArrow}>⌄</Text>
                  </TouchableOpacity>
                  {mostrarClientes && (
                    <View style={styles.options}>
                      <TextInput style={styles.optionSearch} placeholder="Buscar cliente..." placeholderTextColor={C.gris} value={buscarCliente} onChangeText={setBuscarCliente} />
                      <ScrollView nestedScrollEnabled style={{ maxHeight: 140 }}>
                        {clientesFiltrados.map(c => (
                          <TouchableOpacity key={c.id} style={styles.option} onPress={() => { setClienteSeleccionado(c); setBuscarCliente(''); setMostrarClientes(false); }}>
                            <Text style={styles.optionText}>{c.nombre}</Text>
                          </TouchableOpacity>
                        ))}
                        {!clientesFiltrados.length && <Text style={styles.noOptions}>No hay clientes.</Text>}
                      </ScrollView>
                    </View>
                  )}

                  <Text style={styles.label}>Producto</Text>
                  <TouchableOpacity style={styles.select} onPress={() => { setMostrarProductos(!mostrarProductos); setMostrarClientes(false); }}>
                    <Text style={!productoSeleccionado ? styles.placeholder : styles.selectText}>{productoSeleccionado?.nombre || 'Seleccionar producto'}</Text>
                    <Text style={styles.selectArrow}>⌄</Text>
                  </TouchableOpacity>
                  {mostrarProductos && (
                    <View style={styles.options}>
                      <TextInput style={styles.optionSearch} placeholder="Buscar producto..." placeholderTextColor={C.gris} value={buscarProducto} onChangeText={setBuscarProducto} />
                      <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                        {productosFiltrados.map(p => (
                          <TouchableOpacity key={p.id} style={styles.option} onPress={() => { setProductoSeleccionado(p); setCantidad(''); setBuscarProducto(''); setMostrarProductos(false); }}>
                            <Text style={styles.optionText}>{p.nombre}</Text>
                            <Text style={styles.optionDescription}>{dinero(Number(p.precio))}{p.tipo === 'kilo' ? ' por kg' : ' por unidad'}</Text>
                          </TouchableOpacity>
                        ))}
                        {!productosFiltrados.length && <Text style={styles.noOptions}>No hay productos.</Text>}
                      </ScrollView>
                    </View>
                  )}

                  {productoSeleccionado && (
                    <View style={styles.productForm}>
                      <Text style={styles.selectedName}>{productoSeleccionado.nombre} · {dinero(Number(productoSeleccionado.precio))}{productoSeleccionado.tipo === 'kilo' ? '/kg' : '/unidad'}</Text>
                      {productoSeleccionado.tipo === 'kilo' && (
                        <>
                          <Text style={styles.label}>Calcular por</Text>
                          <View style={styles.row}>
                            <TouchableOpacity style={[styles.mode, modoKilo === 'precio' && styles.modeActive]} onPress={() => { setModoKilo('precio'); setCantidad(''); }}><Text style={[styles.modeText, modoKilo === 'precio' && styles.modeTextActive]}>Precio</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.mode, modoKilo === 'peso' && styles.modeActive]} onPress={() => { setModoKilo('peso'); setCantidad(''); }}><Text style={[styles.modeText, modoKilo === 'peso' && styles.modeTextActive]}>Peso</Text></TouchableOpacity>
                          </View>
                        </>
                      )}
                      <Text style={styles.label}>{productoSeleccionado.tipo === 'unidad' ? 'Cantidad de unidades' : modoKilo === 'precio' ? 'Precio que pagará (S/)' : 'Peso'}</Text>
                      {productoSeleccionado.tipo === 'kilo' && modoKilo === 'peso' && (
                        <View style={styles.row}>
                          <TouchableOpacity style={[styles.mode, unidadPeso === 'g' && styles.modeActive]} onPress={() => setUnidadPeso('g')}><Text style={[styles.modeText, unidadPeso === 'g' && styles.modeTextActive]}>Gramos</Text></TouchableOpacity>
                          <TouchableOpacity style={[styles.mode, unidadPeso === 'kg' && styles.modeActive]} onPress={() => setUnidadPeso('kg')}><Text style={[styles.modeText, unidadPeso === 'kg' && styles.modeTextActive]}>Kilos</Text></TouchableOpacity>
                        </View>
                      )}
                      <TextInput style={styles.input} placeholder={productoSeleccionado.tipo === 'unidad' ? 'Ej. 3' : modoKilo === 'precio' ? 'Ej. 5.00' : unidadPeso === 'g' ? 'Ej. 500' : 'Ej. 0.5'} placeholderTextColor={C.gris} value={cantidad} onChangeText={setCantidad} keyboardType="decimal-pad" />
                      {calcularArticulo() && (
                        <View style={styles.calculation}>
                          <Text style={styles.calculationText}>{calcularArticulo()?.detalle}</Text>
                          <Text style={styles.calculationTotal}>{dinero(calcularArticulo()!.total)}</Text>
                        </View>
                      )}
                      <TouchableOpacity style={styles.secondaryButton} onPress={agregarProducto}><Text style={styles.secondaryButtonText}>+ Agregar producto a la compra</Text></TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.directBox}>
                    <TouchableOpacity style={styles.directToggle} onPress={() => setMostrarMontoDirecto(!mostrarMontoDirecto)}>
                      <View><Text style={styles.optionText}>Agregar monto directo</Text><Text style={styles.optionDescription}>Para gastos u otros importes</Text></View>
                      <Text style={styles.selectArrow}>{mostrarMontoDirecto ? '−' : '+'}</Text>
                    </TouchableOpacity>
                    {mostrarMontoDirecto && (
                      <View style={{ padding: 13 }}>
                        <Text style={styles.label}>Descripción</Text>
                        <TextInput style={styles.input} placeholder="Ej. Otro gasto" placeholderTextColor={C.gris} value={conceptoDirecto} onChangeText={setConceptoDirecto} />
                        <Text style={styles.label}>Monto en soles</Text>
                        <TextInput style={styles.input} placeholder="Ej. 25.00" placeholderTextColor={C.gris} value={montoDirecto} onChangeText={setMontoDirecto} keyboardType="decimal-pad" />
                        <TouchableOpacity style={styles.secondaryButton} onPress={agregarMontoDirecto}><Text style={styles.secondaryButtonText}>+ Agregar monto</Text></TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {!!articulos.length && (
                    <View style={styles.itemsBox}>
                      <Text style={styles.itemsTitle}>Productos de esta compra ({articulos.length})</Text>
                      {articulos.map(a => (
                        <View key={a.id} style={styles.itemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>{a.producto}</Text>
                            <Text style={styles.itemQuantity}>{a.cantidad}</Text>
                          </View>
                          <Text style={styles.itemPrice}>{dinero(a.precio)}</Text>
                          <TouchableOpacity onPress={() => setArticulos(actuales => actuales.filter(x => x.id !== a.id))}><Text style={styles.remove}>×</Text></TouchableOpacity>
                        </View>
                      ))}
                      <View style={styles.totalRow}><Text style={styles.itemsTitle}>Total</Text><Text style={styles.totalText}>{dinero(totalFormulario)}</Text></View>
                    </View>
                  )}

                  <TouchableOpacity style={[styles.saveButton, guardando && { opacity: 0.6 }]} onPress={guardarDeuda} disabled={guardando}>
                    {guardando ? <ActivityIndicator color={C.blanco} /> : <Text style={styles.saveText}>Registrar compra</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)} disabled={guardando}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.fondo },
  flex: { flex: 1 },
  header: { backgroundColor: C.blanco, paddingHorizontal: 18, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.borde },
  backButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.moradoSuave, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backText: { color: C.morado, fontSize: 30, lineHeight: 34 },
  headerInfo: { flex: 1 },
  headerTitle: { color: C.texto, fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: C.gris, fontSize: 12, marginTop: 3 },
  counter: { backgroundColor: C.moradoClaro, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 7, alignItems: 'center' },
  counterNumber: { color: C.moradoOscuro, fontSize: 17, fontWeight: '900' },
  counterLabel: { color: C.moradoOscuro, fontSize: 10 },
  content: { padding: 17, paddingBottom: 25 },
  summary: { backgroundColor: C.moradoOscuro, padding: 19, borderRadius: 20, marginBottom: 17 },
  summaryTitle: { color: C.blanco, fontSize: 15, fontWeight: '800', marginBottom: 16 },
  summaryRow: { flexDirection: 'row' },
  summaryItem: { flex: 1 },
  summaryLabel: { color: '#DCC9EA', fontSize: 11, marginBottom: 5 },
  summaryValue: { color: C.blanco, fontSize: 16, fontWeight: '800' },
  summaryPaid: { color: C.amarillo, fontSize: 16, fontWeight: '800' },
  summaryDivider: { height: 1, backgroundColor: '#76568D', marginVertical: 14 },
  pendingValue: { color: C.amarillo, fontSize: 27, fontWeight: '900', marginTop: 4 },
  search: { height: 49, backgroundColor: C.blanco, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginBottom: 21, borderWidth: 1, borderColor: C.borde },
  searchIcon: { color: C.morado, fontSize: 24, marginRight: 9 },
  searchInput: { flex: 1, color: C.texto, fontSize: 13 },
  clear: { color: C.gris, fontSize: 23, paddingHorizontal: 5 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { color: C.texto, fontSize: 17, fontWeight: '800' },
  sectionSubtitle: { color: C.gris, fontSize: 10, marginTop: 4, maxWidth: 220 },
  addButton: { backgroundColor: C.morado, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12 },
  addButtonText: { color: C.blanco, fontSize: 12, fontWeight: '800' },
  loading: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { color: C.gris, marginTop: 11 },
  empty: { backgroundColor: C.blanco, padding: 25, borderRadius: 18, alignItems: 'center' },
  emptyIcon: { color: C.morado, fontSize: 32, fontWeight: '900', marginBottom: 8 },
  emptyTitle: { color: C.texto, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: C.gris, fontSize: 12, textAlign: 'center', lineHeight: 19, marginTop: 8 },
  emptyButton: { backgroundColor: C.morado, padding: 13, borderRadius: 12, marginTop: 16 },
  emptyButtonText: { color: C.blanco, fontWeight: '800', fontSize: 12 },
  clientCard: { backgroundColor: C.blanco, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: C.borde },
  clientTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 45, height: 45, borderRadius: 15, backgroundColor: C.moradoClaro, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  avatarText: { color: C.moradoOscuro, fontSize: 18, fontWeight: '900' },
  clientInfo: { flex: 1 },
  clientName: { color: C.texto, fontSize: 15, fontWeight: '800' },
  clientPhone: { color: C.gris, fontSize: 11, marginTop: 3 },
  purchaseCount: { color: C.morado, fontSize: 10, fontWeight: '700', marginTop: 4 },
  chevron: { color: C.morado, fontSize: 29, marginLeft: 6 },
  clientDivider: { height: 1, backgroundColor: C.borde, marginVertical: 13 },
  clientAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
  amountLabel: { color: C.gris, fontSize: 10, marginBottom: 5 },
  amountValue: { color: C.texto, fontSize: 12, fontWeight: '800' },
  paidValue: { color: C.morado, fontSize: 12, fontWeight: '800' },
  balanceValue: { color: '#C34A50', fontSize: 12, fontWeight: '900' },
  progressBg: { height: 6, backgroundColor: '#EEE8F2', borderRadius: 8, overflow: 'hidden', marginTop: 13 },
  progressFill: { height: 6, backgroundColor: C.amarillo, borderRadius: 8 },
  openHint: { color: C.morado, fontSize: 10, fontWeight: '800', textAlign: 'right', marginTop: 9 },
  overlay: { flex: 1, backgroundColor: 'rgba(28,15,38,0.48)', justifyContent: 'flex-end' },
  modalKeyboard: { width: '100%', maxHeight: '95%' },
  modal: { backgroundColor: C.blanco, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 20, maxHeight: '100%' },
  handle: { width: 42, height: 5, borderRadius: 5, backgroundColor: '#DCD3E3', alignSelf: 'center', marginBottom: 17 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { color: C.texto, fontSize: 19, fontWeight: '900' },
  modalSubtitle: { color: C.gris, fontSize: 10, marginTop: 4 },
  closeButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.moradoSuave, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: C.morado, fontSize: 23 },
  label: { color: C.texto, fontSize: 12, fontWeight: '800', marginTop: 13, marginBottom: 7 },
  select: { minHeight: 47, borderWidth: 1, borderColor: C.borde, borderRadius: 12, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FEFCFF' },
  selectText: { color: C.texto, fontSize: 13 },
  placeholder: { color: C.gris, fontSize: 13 },
  selectArrow: { color: C.morado, fontSize: 20, fontWeight: '800' },
  options: { borderWidth: 1, borderColor: C.borde, borderRadius: 12, marginTop: 6, overflow: 'hidden' },
  optionSearch: { height: 43, paddingHorizontal: 12, color: C.texto, borderBottomWidth: 1, borderBottomColor: C.borde },
  option: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F2EDF5' },
  optionText: { color: C.texto, fontSize: 12, fontWeight: '700' },
  optionDescription: { color: C.gris, fontSize: 10, marginTop: 3 },
  noOptions: { color: C.gris, padding: 12, fontSize: 12 },
  productForm: { marginTop: 10, padding: 13, backgroundColor: C.moradoSuave, borderRadius: 14 },
  selectedName: { color: C.moradoOscuro, fontWeight: '800', fontSize: 13 },
  row: { flexDirection: 'row', gap: 8, marginTop: 7 },
  mode: { flex: 1, borderWidth: 1, borderColor: C.borde, borderRadius: 10, padding: 10, alignItems: 'center' },
  modeActive: { backgroundColor: C.morado, borderColor: C.morado },
  modeText: { color: C.gris, fontSize: 11, fontWeight: '700' },
  modeTextActive: { color: C.blanco },
  input: { minHeight: 47, borderWidth: 1, borderColor: C.borde, borderRadius: 11, paddingHorizontal: 12, color: C.texto, backgroundColor: C.blanco },
  calculation: { backgroundColor: C.blanco, padding: 12, borderRadius: 11, marginTop: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calculationText: { color: C.gris, fontSize: 12 },
  calculationTotal: { color: C.moradoOscuro, fontSize: 17, fontWeight: '900' },
  secondaryButton: { backgroundColor: C.moradoClaro, borderRadius: 11, padding: 12, alignItems: 'center', marginTop: 12 },
  secondaryButtonText: { color: C.moradoOscuro, fontSize: 12, fontWeight: '800' },
  directBox: { borderWidth: 1, borderColor: C.borde, borderRadius: 13, marginTop: 16, overflow: 'hidden' },
  directToggle: { padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemsBox: { backgroundColor: C.moradoSuave, padding: 13, borderRadius: 14, marginTop: 16 },
  itemsTitle: { color: C.moradoOscuro, fontSize: 12, fontWeight: '900' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borde },
  itemName: { color: C.texto, fontSize: 12, fontWeight: '700' },
  itemQuantity: { color: C.gris, fontSize: 10, marginTop: 3 },
  itemPrice: { color: C.moradoOscuro, fontSize: 12, fontWeight: '800', marginRight: 12 },
  remove: { color: C.rojo, fontSize: 23, paddingHorizontal: 5 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  totalText: { color: C.moradoOscuro, fontSize: 19, fontWeight: '900' },
  saveButton: { backgroundColor: C.morado, minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveText: { color: C.blanco, fontSize: 13, fontWeight: '900' },
  cancelButton: { minHeight: 43, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  cancelText: { color: C.gris, fontSize: 12, fontWeight: '700' },
});
