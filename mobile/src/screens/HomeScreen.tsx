import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useMisReportes } from '../hooks/useReportes';
import type { AppColors } from '../theme';
import type { MainTabParamList } from '../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>;

// ─── Datos estáticos de alertas (reemplazar con fetch real cuando esté listo) ──

const ALERTAS_MOCK = [
  {
    id: '1',
    zona: 'San Juan de Lurigancho',
    nivel: 'Alto' as const,
    descripcion: 'Alta densidad de criaderos reportados esta semana.',
  },
  {
    id: '2',
    zona: 'Ate Vitarte',
    nivel: 'Medio' as const,
    descripcion: 'Incremento de casos sospechosos en el distrito.',
  },
  {
    id: '3',
    zona: 'Villa El Salvador',
    nivel: 'Bajo' as const,
    descripcion: 'Situación estable, continúa la vigilancia.',
  },
];

type NivelAlerta = 'Alto' | 'Medio' | 'Bajo';

// ─── Componentes internos ──────────────────────────────────────────────────────

interface KpiCardProps {
  value: number | string;
  label: string;
  colors: AppColors;
}

function KpiCard({ value, label, colors }: KpiCardProps) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.kpiNumber, { color: colors.primary }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

interface AlertaCardProps {
  zona: string;
  nivel: NivelAlerta;
  descripcion: string;
  colors: AppColors;
}

function AlertaCard({ zona, nivel, descripcion, colors }: AlertaCardProps) {
  const nivelConfig: Record<NivelAlerta, { bg: string; text: string }> = {
    Alto: { bg: colors.error, text: '#FFFFFF' },
    Medio: { bg: colors.warning, text: '#FFFFFF' },
    Bajo: { bg: colors.success, text: '#FFFFFF' },
  };

  const config = nivelConfig[nivel];

  return (
    <View style={[styles.alertCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.alertBadge, { backgroundColor: config.bg }]}>
        <Text style={[styles.alertBadgeText, { color: config.text }]}>{nivel}</Text>
      </View>
      <View style={styles.alertContent}>
        <Text style={[styles.alertZona, { color: colors.text }]}>{zona}</Text>
        <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>{descripcion}</Text>
      </View>
    </View>
  );
}

// ─── Pantalla principal ────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { usuario, logout } = useAuth();
  const { data, isLoading } = useMisReportes();
  const insets = useSafeAreaInsets();

  const primerNombre = usuario?.nombre?.split(' ')[0] ?? 'Ciudadano';

  // KPIs derivados de PaginatedResponse<Reporte>
  // Cuando haya un endpoint dedicado de estadísticas, reemplazar estos cálculos
  const reportesEnviados = data?.total ?? 0;
  const reportesVerificados =
    data?.data?.filter((r) => r.estado === 'en_revision').length ?? 0;
  const reportesResueltos =
    data?.data?.filter((r) => r.estado === 'resuelto').length ?? 0;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Saludo ── */}
      <View style={styles.saludoRow}>
        <View style={styles.saludoTexts}>
          <Text style={[styles.saludo, { color: colors.text }]}>
            ¡Hola, {primerNombre}! 👋
          </Text>
          <Text style={[styles.saludoSub, { color: colors.textSecondary }]}>
            Gracias por cuidar tu comunidad
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceVariant, borderColor: colors.primary }]}>
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>
              {primerNombre.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={logout}
            style={{ padding: 8, backgroundColor: 'rgba(255,0,60,0.1)', borderRadius: 12, borderWidth: 1, borderColor: '#ff003c' }}
          >
            <Ionicons name="log-out-outline" size={20} color="#ff003c" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Botón principal ── */}
      <TouchableOpacity
        style={[
          styles.reportButton,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 18,
            elevation: 16,
          },
        ]}
        onPress={() => navigation.navigate('Report')}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={22} color={colors.textOnPrimary} />
        <Text style={[styles.reportButtonText, { color: colors.textOnPrimary }]}>
          Reportar un criadero ahora
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textOnPrimary} />
      </TouchableOpacity>

      {/* ── KPIs ── */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Tu impacto</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <View style={styles.kpiRow}>
          <KpiCard value={reportesEnviados} label="Reportes enviados" colors={colors} />
          <KpiCard value={reportesVerificados} label="Verificados" colors={colors} />
          <KpiCard value={reportesResueltos} label="Resueltos" colors={colors} />
        </View>
      )}

      {/* ── Alertas ── */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Alertas en tu zona</Text>
      {ALERTAS_MOCK.map((alerta) => (
        <AlertaCard
          key={alerta.id}
          zona={alerta.zona}
          nivel={alerta.nivel}
          descripcion={alerta.descripcion}
          colors={colors}
        />
      ))}
    </ScrollView>
  );
}

// ─── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    // paddingTop se aplica dinámicamente con insets.top + 20
  },

  // Saludo
  saludoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  saludoTexts: {
    flex: 1,
  },
  saludo: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 22,
  },
  saludoSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginTop: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginLeft: 12,
  },
  avatarInitial: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 18,
  },

  // Botón reportar
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    marginBottom: 28,
    gap: 10,
  },
  reportButtonText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    flex: 1,
  },

  // Sección
  sectionTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 16,
    letterSpacing: 2,
    marginBottom: 12,
  },

  // Loader
  loader: {
    marginBottom: 28,
    alignSelf: 'flex-start',
  },

  // KPIs
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222222',
    shadowColor: '#00f3ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  kpiNumber: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 26,
  },
  kpiLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },

  // Alertas
  alertCard: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222222',
    shadowColor: '#ff003c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
  },
  alertBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 12,
  },
  alertBadgeText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 11,
  },
  alertContent: {
    flex: 1,
  },
  alertZona: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 13,
  },
  alertDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
  },
});
