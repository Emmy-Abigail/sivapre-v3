// ReportScreen

import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboard } from '@react-native-community/hooks';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { useTheme } from '../theme';
import { useCrearReporte } from '../hooks/useReportes';
import { reportesService } from '../services/reportes';
import { storage, StorageKeys } from '../store/storage';
import type {
  MainTabParamList,
  TipoLugar,
  TipoObjeto,
  ObservaLarvas,
  ConocimientoDengue,
} from '../types';

// ─── Tipos y constantes ───────────────────────────────────────────────────────

type Props = BottomTabScreenProps<MainTabParamList, 'Report'>;

const TIPOS_LUGAR: TipoLugar[] = [
  'Vivienda', 'Vía Pública', 'Terreno Abandonado', 'Mercado', 'Colegio', 'Otro',
];
const TIPOS_OBJETO: TipoObjeto[] = [
  'Llantas', 'Baldes', 'Plantas', 'Botellas', 'Canales', 'Otro',
];
const OPCIONES_LARVAS: ObservaLarvas[] = [
  'Sí, claramente', 'No estoy seguro', 'No',
];
const OPCIONES_DENGUE: ConocimientoDengue[] = [
  'Sí', 'No lo sé', 'No',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function _getOrCreateDeviceId(): Promise<string> {
  let id = await storage.getItem(StorageKeys.DEVICE_ID);
  if (!id) {
    id = Crypto.randomUUID();
    await storage.setItem(StorageKeys.DEVICE_ID, id);
  }
  return id;
}

// ─── Componente de chips reutilizable ────────────────────────────────────────

interface ChipGroupProps<T extends string> {
  opciones: T[];
  seleccionado: T | null;
  onSelect: (valor: T) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function ChipGroup<T extends string>({ opciones, seleccionado, onSelect, colors }: ChipGroupProps<T>) {
  return (
    <View style={styles.chipGroup}>
      {opciones.map((opcion) => {
        const activo = seleccionado === opcion;
        return (
          <TouchableOpacity
            key={opcion}
            style={[
              styles.chip,
              {
                backgroundColor: activo ? colors.primary : colors.surface,
                borderColor: activo ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onSelect(opcion)}
          >
            <Text
              style={[
                styles.chipText,
                { color: activo ? colors.textOnPrimary : colors.text },
                activo && styles.chipTextActive,
              ]}
            >
              {opcion}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function ReportScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboard();
  const { mutateAsync: crearReporte, isPending } = useCrearReporte();

  // Estado del formulario
  const [tipoLugar, setTipoLugar] = useState<TipoLugar | null>(null);
  const [tipoObjeto, setTipoObjeto] = useState<TipoObjeto | null>(null);
  const [observaLarvas, setObservaLarvas] = useState<ObservaLarvas | null>(null);
  const [dengue, setDengue] = useState<ConocimientoDengue | null>(null);
  const [comentarios, setComentarios] = useState('');

  // Estado de foto — desacoplado del submit
  // La foto se sube en paralelo mientras el usuario llena el formulario.
  // Si falla, puede reintentar o continuar sin foto.
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [fotoError, setFotoError] = useState(false);

  // Estado de ubicación
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);
  const [obtenendoUbicacion, setObtenendoUbicacion] = useState(false);

  // local_id se genera UNA vez al montar la pantalla (por sesión de formulario).
  // Así, si el usuario pulsa Enviar dos veces rápido (o hay un reintento de red),
  // ambos requests llevan el mismo local_id y el backend devuelve el mismo reporte.
  const localIdRef = useRef<string>(Crypto.randomUUID());

  // ─── Lógica de foto ──────────────────────────────────────────────────────────

  const _subirFoto = async (uri: string) => {
    setSubiendoFoto(true);
    setFotoError(false);
    try {
      const url = await reportesService.subirFoto(uri);
      setFotoUrl(url);
    } catch {
      setFotoError(true);
      setFotoUrl(null);
    } finally {
      setSubiendoFoto(false);
    }
  };

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para tomar la foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      // 0.7: archivo ~2-4 MB antes de llegar al backend.
      // Pillow comprime a WebP ≤400 KB al guardar. Este valor equilibra
      // calidad de evidencia con velocidad de carga en zonas de señal débil.
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setFotoUri(uri);
      // La subida comienza inmediatamente en paralelo con el llenado del formulario.
      // Así el usuario no espera al presionar Enviar.
      _subirFoto(uri);
    }
  };

  // ─── Lógica de ubicación ──────────────────────────────────────────────────

  const obtenerUbicacion = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos tu ubicación para registrar el criadero.');
      return;
    }
    setObtenendoUbicacion(true);
    try {
      // Accuracy.Balanced: fix más rápido que High en zonas con señal GPS débil.
      // Precisión ~30m — suficiente para geolocalizar un criadero.
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLatitud(location.coords.latitude);
      setLongitud(location.coords.longitude);
    } catch {
      Alert.alert('Error de GPS', 'No se pudo obtener la ubicación. Asegúrate de estar al aire libre e intenta de nuevo.');
    } finally {
      setObtenendoUbicacion(false);
    }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const limpiarFormulario = () => {
    setTipoLugar(null);
    setTipoObjeto(null);
    setObservaLarvas(null);
    setDengue(null);
    setComentarios('');
    setFotoUri(null);
    setFotoUrl(null);
    setFotoError(false);
    setLatitud(null);
    setLongitud(null);
    // Generar nuevo local_id para el próximo reporte
    localIdRef.current = Crypto.randomUUID();
  };

  const handleSubmit = async () => {
    if (!latitud || !longitud) {
      Alert.alert('Ubicación requerida', 'Captura tu ubicación GPS antes de enviar.');
      return;
    }
    if (!tipoLugar || !tipoObjeto || !observaLarvas) {
      Alert.alert('Campos incompletos', 'Completa todos los campos obligatorios.');
      return;
    }

    // Si la foto falló, preguntar al usuario si desea continuar sin ella.
    // Alert usa callbacks directos para mantener compatibilidad con el typing de RN.
    if (fotoUri && fotoError) {
      Alert.alert(
        'Foto no subida',
        'La foto no pudo enviarse por problemas de conexión. ¿Continuar sin foto?',
        [
          { text: 'Reintentar foto', onPress: () => _subirFoto(fotoUri) },
          { text: 'Enviar sin foto', style: 'destructive', onPress: () => _doSubmit(null) },
          { text: 'Cancelar', style: 'cancel' },
        ],
      );
      return;
    }

    // Si la foto aún está subiendo, esperar o continuar sin ella.
    if (subiendoFoto) {
      Alert.alert(
        'Foto en proceso',
        'La foto se está subiendo. ¿Esperar o enviar el reporte ahora sin foto?',
        [
          { text: 'Esperar', style: 'cancel' },
          { text: 'Enviar sin foto', onPress: () => _doSubmit(null) },
        ],
      );
      return;
    }

    await _doSubmit(fotoUrl);
  };

  const _doSubmit = async (foto: string | null) => {
    try {
      const deviceId = await _getOrCreateDeviceId();

      await crearReporte({
        latitud: latitud!,
        longitud: longitud!,
        foto_url: foto ?? undefined,
        tipo_lugar: tipoLugar!,
        tipo_objeto: tipoObjeto!,
        observa_larvas: observaLarvas!,
        conocimiento_dengue_cercano: dengue ?? undefined,
        comentarios: comentarios.trim() || undefined,
        device_id: deviceId,
        local_id: localIdRef.current,
      });

      Alert.alert('¡Reporte enviado!', 'Gracias por ayudar a tu comunidad.', [
        {
          text: 'Ver mis reportes',
          onPress: () => {
            limpiarFormulario();
            navigation.navigate('MyReports');
          },
        },
        { text: 'Nuevo reporte', onPress: limpiarFormulario },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'No se pudo enviar el reporte. Intenta de nuevo.');
    }
  };

  const ubicacionObtenida = latitud !== null && longitud !== null;
  const formularioValido = ubicacionObtenida && tipoLugar && tipoObjeto && observaLarvas;

  const paddingBottom = keyboard.keyboardShown
    ? keyboard.keyboardHeight + 24
    : insets.bottom + 40;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Encabezado */}
        <Text style={[styles.pageTitle, { color: colors.text }]}>Nuevo Reporte</Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          Completa el formulario en menos de 60 segundos
        </Text>

        {/* ── 1. Foto ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          1. Evidencia fotográfica{' '}
          <Text style={{ color: colors.textSecondary, fontFamily: 'Inter-Regular', fontWeight: 'normal' }}>
            (recomendada)
          </Text>
        </Text>

        <TouchableOpacity
          style={[
            styles.photoBox,
            { backgroundColor: colors.surface, borderColor: fotoError ? '#e53e3e' : colors.border },
          ]}
          onPress={tomarFoto}
          disabled={subiendoFoto || isPending}
        >
          {fotoUri ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: fotoUri }} style={styles.photoPreview} />
              {subiendoFoto && (
                <View style={styles.photoOverlay}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.photoOverlayText}>Subiendo...</Text>
                </View>
              )}
              {fotoError && !subiendoFoto && (
                <View style={[styles.photoOverlay, { backgroundColor: 'rgba(229,62,62,0.75)' }]}>
                  <Ionicons name="warning-outline" size={20} color="#fff" />
                  <Text style={styles.photoOverlayText}>No se pudo subir</Text>
                </View>
              )}
              {fotoUrl && !subiendoFoto && !fotoError && (
                <View style={[styles.photoOverlay, { backgroundColor: 'rgba(56,161,105,0.6)' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={36} color={colors.textSecondary} />
              <Text style={[styles.photoText, { color: colors.textSecondary }]}>
                Toca para tomar una foto
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {fotoUri && (
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={styles.photoActionBtn}
              onPress={tomarFoto}
              disabled={subiendoFoto || isPending}
            >
              <Ionicons name="refresh-outline" size={15} color={colors.primary} />
              <Text style={[styles.photoActionText, { color: colors.primary }]}>Tomar otra</Text>
            </TouchableOpacity>
            {fotoError && !subiendoFoto && (
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={() => _subirFoto(fotoUri)}
              >
                <Ionicons name="cloud-upload-outline" size={15} color={colors.primary} />
                <Text style={[styles.photoActionText, { color: colors.primary }]}>Reintentar subida</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── 2. Ubicación ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          2. Ubicación del criadero
        </Text>
        <TouchableOpacity
          style={[
            styles.locationButton,
            {
              backgroundColor: ubicacionObtenida ? colors.primary : colors.surface,
              borderColor: colors.primary,
              opacity: obtenendoUbicacion ? 0.7 : 1,
            },
          ]}
          onPress={obtenerUbicacion}
          disabled={obtenendoUbicacion || isPending}
        >
          {obtenendoUbicacion ? (
            <ActivityIndicator
              color={ubicacionObtenida ? colors.textOnPrimary : colors.primary}
              size="small"
            />
          ) : (
            <Ionicons
              name={ubicacionObtenida ? 'location' : 'location-outline'}
              size={20}
              color={ubicacionObtenida ? colors.textOnPrimary : colors.primary}
            />
          )}
          <Text
            style={[
              styles.locationText,
              { color: ubicacionObtenida ? colors.textOnPrimary : colors.primary },
            ]}
          >
            {obtenendoUbicacion
              ? 'Obteniendo ubicación...'
              : ubicacionObtenida
              ? `✓ ${latitud!.toFixed(5)}, ${longitud!.toFixed(5)}`
              : 'Capturar mi ubicación GPS'}
          </Text>
        </TouchableOpacity>

        {/* ── 3. Tipo de lugar ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>3. Tipo de lugar</Text>
        <ChipGroup opciones={TIPOS_LUGAR} seleccionado={tipoLugar} onSelect={setTipoLugar} colors={colors} />

        {/* ── 4. Tipo de objeto ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>4. Tipo de objeto</Text>
        <ChipGroup opciones={TIPOS_OBJETO} seleccionado={tipoObjeto} onSelect={setTipoObjeto} colors={colors} />

        {/* ── 5. Larvas ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>5. ¿Observas larvas?</Text>
        <ChipGroup opciones={OPCIONES_LARVAS} seleccionado={observaLarvas} onSelect={setObservaLarvas} colors={colors} />

        {/* ── 6. Dengue cercano ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          6. ¿Conoces casos de dengue cerca?
        </Text>
        <ChipGroup opciones={OPCIONES_DENGUE} seleccionado={dengue} onSelect={setDengue} colors={colors} />

        {/* ── 7. Comentarios ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          7. Comentarios adicionales{' '}
          <Text style={{ color: colors.textSecondary, fontFamily: 'Inter-Regular', fontWeight: 'normal' }}>
            (opcional)
          </Text>
        </Text>
        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Describe lo que observas..."
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={comentarios}
          onChangeText={setComentarios}
        />

        {/* ── Botón enviar ── */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
            (!formularioValido || isPending) && { opacity: 0.6 },
          ]}
          onPress={handleSubmit}
          disabled={!formularioValido || isPending}
        >
          {isPending ? (
            <ActivityIndicator color={colors.textOnPrimary} size="small" />
          ) : (
            <Ionicons name="send-outline" size={18} color={colors.textOnPrimary} />
          )}
          <Text style={[styles.submitButtonText, { color: colors.textOnPrimary }]}>
            {isPending ? 'ENVIANDO...' : 'ENVIAR REPORTE'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 20 },
  pageTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 24,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 13,
    marginBottom: 10,
    marginTop: 8,
  },
  photoBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    height: 180,
    marginBottom: 6,
    overflow: 'hidden',
  },
  photoPreviewContainer: {
    flex: 1,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoOverlayText: {
    color: '#fff',
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoActionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  locationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    flex: 1,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  chipTextActive: {
    fontFamily: 'Montserrat-ExtraBold',
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    minHeight: 100,
    marginBottom: 28,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  submitButtonText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 15,
    letterSpacing: 1,
  },
});
