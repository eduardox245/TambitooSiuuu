
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const COLORS = {
  green: '#168A65',
  darkGreen: '#075B43',
  lightGreen: '#DDF5E9',
  paleGreen: '#F0FAF5',
  yellow: '#FFD66B',
  orange: '#FFAD70',
  blue: '#9BD6F5',
  pink: '#F7D5E3',
  white: '#FFFFFF',
  background: '#F7FAF8',
  text: '#173D31',
  gray: '#84968D',
};

type ModuleCardProps = {
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
};

function ModuleCard({
  emoji,
  title,
  subtitle,
  color,
  onPress,
}: ModuleCardProps) {
  return (
    <TouchableOpacity
      style={styles.moduleCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.moduleIcon, { backgroundColor: color }]}>
        <Text style={styles.moduleEmoji}>{emoji}</Text>
      </View>

      <Text style={styles.moduleTitle}>{title}</Text>
      <Text style={styles.moduleSubtitle}>{subtitle}</Text>

      <View style={styles.arrowCircle}>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const [busqueda, setBusqueda] = useState('');
  const router = useRouter();

  const abrirModulo = (nombre: string) => {
    if (nombre === 'Productos') {
      router.push('/productos');
      return;
    }

    console.log(`Módulo seleccionado: ${nombre}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.green}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ENCABEZADO */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.brand}>TAMBITOO</Text>
              <Text style={styles.tagline}>
                Administra · Gestiona · Disfruta
              </Text>
            </View>

            <View style={styles.logoCircle}>
              <Text style={styles.logoSymbol}>T</Text>
            </View>
          </View>

          {/* BIENVENIDA */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeSmall}>BIENVENIDO</Text>
              <Text style={styles.welcomeTitle}>
                TAMBITOO,{'\n'}es tu casa.
              </Text>
              <Text style={styles.welcomeDescription}>
                Administra tu negocio de forma sencilla.
              </Text>
            </View>

            <View style={styles.welcomeDecoration}>
              <Text style={styles.welcomeLetter}>T</Text>
            </View>
          </View>

          <View style={styles.headerDecorationOne} />
          <View style={styles.headerDecorationTwo} />
        </View>

        {/* CONTENIDO */}
        <View style={styles.content}>
          {/* BUSCADOR */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>⌕</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="¿Qué deseas buscar?"
              placeholderTextColor="#A0B0A7"
              value={busqueda}
              onChangeText={setBusqueda}
            />

            {busqueda.length > 0 && (
              <TouchableOpacity onPress={() => setBusqueda('')}>
                <Text style={styles.clearSearch}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* TITULO */}
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Tu negocio</Text>
              <Text style={styles.sectionSubtitle}>
                Todo lo que necesitas en un solo lugar
              </Text>
            </View>
          </View>

          {/* RECUADROS */}
          <View style={styles.modulesGrid}>
            <ModuleCard
              emoji="🛍️"
              title="Productos"
              subtitle="Administra tu catálogo"
              color="#DDF5E9"
              onPress={() => abrirModulo('Productos')}
            />

            <ModuleCard
              emoji="💸"
              title="Movimientos"
              subtitle="Revisa tus pagos"
              color="#FFE8D6"
              onPress={() => abrirModulo('Movimientos')}
            />

            <ModuleCard
              emoji="👥"
              title="Clientes"
              subtitle="Gestiona tus clientes"
              color="#D5F0FA"
              onPress={() => abrirModulo('Clientes')}
            />

            <ModuleCard
              emoji="🧾"
              title="Deudas"
              subtitle="Controla las cuentas"
              color="#E8DDF8"
              onPress={() => abrirModulo('Deudas')}
            />

            <ModuleCard
              emoji="💰"
              title="Registrar abonos"
              subtitle="Registra los pagos"
              color="#FFF1C9"
              onPress={() => abrirModulo('Abonos')}
            />

            <ModuleCard
              emoji="👤"
              title="Mi cuenta"
              subtitle="Configura tu perfil"
              color="#F7DDE8"
              onPress={() => abrirModulo('Mi cuenta')}
            />
          </View>

          {/* BANNER */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.banner}
            onPress={() => abrirModulo('TAMBITOO')}
          >
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTag}>
                ORGANIZA TU NEGOCIO
              </Text>

              <Text style={styles.bannerTitle}>
                ¡Todo bajo{'\n'}control!
              </Text>

              <Text style={styles.bannerSubtitle}>
                Más orden, más tranquilidad.
              </Text>
            </View>

            <View style={styles.bannerGraphic}>
              <View style={styles.bannerGraphicInner}>
                <Text style={styles.bannerGraphicLetter}>T</Text>
              </View>
            </View>
          </TouchableOpacity>

          <Text style={styles.footer}>
            TAMBITOO · Tu negocio, más fácil
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 25,
  },

  header: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },

  brand: {
    color: COLORS.white,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 2,
  },

  tagline: {
    color: '#D8F5E8',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },

  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '7deg' }],
  },

  logoSymbol: {
    color: COLORS.green,
    fontSize: 32,
    fontWeight: '900',
  },

  welcomeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 23,
    padding: 18,
    marginTop: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
    elevation: 5,
    shadowColor: '#063F2E',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },

  welcomeTextContainer: {
    flex: 1,
  },

  welcomeSmall: {
    color: COLORS.green,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 7,
  },

  welcomeTitle: {
    color: COLORS.darkGreen,
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 28,
  },

  welcomeDescription: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 7,
  },

  welcomeDecoration: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: COLORS.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    transform: [{ rotate: '8deg' }],
  },

  welcomeLetter: {
    color: COLORS.green,
    fontSize: 43,
    fontWeight: '900',
  },

  headerDecorationOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#279D78',
    top: -75,
    right: 70,
  },

  headerDecorationTwo: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#087454',
    bottom: -65,
    left: -25,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 23,
  },

  searchContainer: {
    height: 53,
    backgroundColor: COLORS.white,
    borderRadius: 17,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4EEE8',
    elevation: 2,
    shadowColor: '#173D31',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  searchIcon: {
    color: COLORS.green,
    fontSize: 30,
    marginRight: 10,
    lineHeight: 35,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },

  clearSearch: {
    color: COLORS.green,
    fontSize: 24,
    paddingHorizontal: 5,
  },

  sectionHeading: {
    marginTop: 27,
    marginBottom: 16,
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

  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 13,
  },

  moduleCard: {
    width: '48%',
    minHeight: 158,
    backgroundColor: COLORS.white,
    borderRadius: 21,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7EFEA',
    elevation: 2,
    shadowColor: '#173D31',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },

  moduleEmoji: {
    fontSize: 24,
  },

  moduleTitle: {
    color: COLORS.darkGreen,
    fontSize: 15,
    fontWeight: '900',
  },

  moduleSubtitle: {
    color: COLORS.gray,
    fontSize: 10,
    marginTop: 5,
    paddingRight: 5,
  },

  arrowCircle: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrow: {
    color: COLORS.green,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
  },

  banner: {
    marginTop: 23,
    backgroundColor: COLORS.darkGreen,
    borderRadius: 23,
    padding: 19,
    minHeight: 145,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },

  bannerTextContainer: {
    flex: 1,
    zIndex: 2,
  },

  bannerTag: {
    color: COLORS.yellow,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },

  bannerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
  },

  bannerSubtitle: {
    color: '#D5EEE3',
    fontSize: 10,
    marginTop: 8,
  },

  bannerGraphic: {
    width: 75,
    height: 75,
    borderRadius: 25,
    backgroundColor: '#278B6B',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '8deg' }],
  },

  bannerGraphicInner: {
    width: 53,
    height: 53,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bannerGraphicLetter: {
    color: COLORS.green,
    fontSize: 31,
    fontWeight: '900',
  },

  footer: {
    color: '#9BAEA3',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 23,
    marginBottom: 5,
  },
});
