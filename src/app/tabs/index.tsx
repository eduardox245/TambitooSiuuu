
import React, { useMemo, useState } from 'react';
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
  purple: '#652A91',
  darkPurple: '#54316F',
  lightPurple: '#E8D8F3',
  palePurple: '#F5EEFA',
  pastelPurple: '#C9A9E0',
  yellow: '#FFD044',
  orange: '#F4C6A5',
  blue: '#D9C9ED',
  pink: '#EED9EB',
  white: '#FFFFFF',
  background: '#F7F2FA',
  text: '#30223B',
  gray: '#887D91',
  border: '#E8DDEF',
};

type ModuleCardProps = {
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
};

type ModuleItem = {
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  route: string;
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

  const modulos: ModuleItem[] = [
    {
      emoji: '🛍️',
      title: 'Productos',
      subtitle: 'Administra tu catálogo',
      color: '#E8D8F3',
      route: '/productos',
    },
    {
      emoji: '💸',
      title: 'Movimientos',
      subtitle: 'Revisa tus pagos',
      color: '#F5E3F0',
      route: '/movimientos',
    },
    {
      emoji: '👥',
      title: 'Clientes',
      subtitle: 'Gestiona tus clientes',
      color: '#E5DDF3',
      route: '/clientes',
    },
    {
      emoji: '🧾',
      title: 'Deudas',
      subtitle: 'Controla las cuentas',
      color: '#DCC8ED',
      route: '/deudas',
    },
    {
      emoji: '💰',
      title: 'Registrar abonos',
      subtitle: 'Registra los pagos',
      color: '#FFF1C9',
      route: '/abonos',
    },
    {
      emoji: '👤',
      title: 'Mi cuenta',
      subtitle: 'Configura tu perfil',
      color: '#EED9EB',
      route: '/cuenta',
    },
  ];

  const modulosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return modulos;
    }

    return modulos.filter(
      (modulo) =>
        modulo.title.toLowerCase().includes(texto) ||
        modulo.subtitle.toLowerCase().includes(texto)
    );
  }, [busqueda]);

  const abrirModulo = (ruta: string) => {
    router.push(ruta as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.purple}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ENCABEZADO */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            

           
          </View>

          {/* BIENVENIDA */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeSmall}>BIENVENIDO</Text>

              <Text style={styles.welcomeTitle}>
                TAMBITOO
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
            {modulosFiltrados.map((modulo) => (
              <ModuleCard
                key={modulo.title}
                emoji={modulo.emoji}
                title={modulo.title}
                subtitle={modulo.subtitle}
                color={modulo.color}
                onPress={() => abrirModulo(modulo.route)}
              />
            ))}
          </View>

          {modulosFiltrados.length === 0 && (
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchText}>
                No se encontraron módulos.
              </Text>
            </View>
          )}
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
    backgroundColor: COLORS.purple,
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
    color: '#E9D9F4',
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
    color: COLORS.purple,
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
    shadowColor: '#40165F',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },

  welcomeTextContainer: {
    flex: 1,
  },

  welcomeSmall: {
    color: COLORS.purple,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 7,
  },

  welcomeTitle: {
    color: COLORS.darkPurple,
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
    backgroundColor: COLORS.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    transform: [{ rotate: '8deg' }],
  },

  welcomeLetter: {
    color: COLORS.purple,
    fontSize: 43,
    fontWeight: '900',
  },

  headerDecorationOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#7947A0',
    top: -75,
    right: 70,
  },

  headerDecorationTwo: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#4A1C70',
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
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#54316F',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  searchIcon: {
    color: COLORS.purple,
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
    color: COLORS.purple,
    fontSize: 24,
    paddingHorizontal: 5,
  },

  sectionHeading: {
    marginTop: 27,
    marginBottom: 16,
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
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#54316F',
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
    color: COLORS.darkPurple,
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
    backgroundColor: COLORS.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrow: {
    color: COLORS.purple,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
  },

  emptySearch: {
    padding: 25,
    alignItems: 'center',
  },

  emptySearchText: {
    color: COLORS.gray,
    fontSize: 13,
  },
});
