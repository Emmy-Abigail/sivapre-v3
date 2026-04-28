// ReportScree

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboard } from '@react-native-community/hooks';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { useTheme } from '../theme';
import { useCrearReporte } from '../hooks/useReportes';
import { reportesService } from '../services/reportes';
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
                shadowColor: activo ? colors.primary : 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: activo ? 0.8 : 0,
                shadowRadius: activo ? 8 : 0,
                elevation: activo ? 8 : 0,
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

  // Estado de foto
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Estado de ubicación
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para tomar la foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setFotoUri(uri);
      try {
        setSubiendoFoto(true);
        const url = await reportesService.subirFoto(uri);
        setFotoUrl(url);
      } catch {
        Alert.alert('Error', 'No se pudo subir la foto. Verifica tu conexión e intenta de nuevo.');
        setFotoUri(null);
      } finally {
        setSubiendoFoto(false);
      }
    }
  };

  const obtenerUbicacion = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos tu ubicación para registrar el criadero.');
      return;
    }
    const location = await Location.getCurrentPositionAsync({});
    setLatitud(location.coords.latitude);
    setLongitud(location.coords.longitude);
  };

  const limpiarFormulario = () => {
    setTipoLugar(null);
    setTipoObjeto(null);
    setObservaLarvas(null);
    setDengue(null);
    setComentarios('');
    setFotoUri(null);
    setFotoUrl(null);
    setLatitud(null);
    setLongitud(null);
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

    try {
      await crearReporte({
        latitud,
        longitud,
        foto_url: fotoUrl ?? undefined,
        tipo_lugar: tipoLugar,
        tipo_objeto: tipoObjeto,
        observa_larvas: observaLarvas,
        conocimiento_dengue_cercano: dengue ?? undefined,
        comentarios: comentarios.trim() || undefined,
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

  // paddingBottom dinámico: respeta la altura real del teclado en cualquier dispositivo
  const paddingBottom = keyboard.keyboardShown
    ? keyboard.keyboardHeight + 24
    : insets.bottom + 40;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + 20,
            paddingBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Encabezado */}
        <Text style={[styles.pageTitle, { color: colors.text }]}>
          Nuevo Reporte
        </Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          Completa el formulario en menos de 60 segundos
        </Text>

        {/* ── 1. Foto ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          1. Evidencia fotográfica
        </Text>
        <TouchableOpacity
          style={[
            styles.photoBox,
            {
              backgroundColor: colors.surface,
              borderColor: fotoUri ? colors.border : colors.primary,
            },
          ]}
          onPress={tomarFoto}
          disabled={subiendoFoto}
        >
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={36} color={colors.textSecondary} />
              <Text style={[styles.photoText, { color: colors.textSecondary }]}>
                {subiendoFoto ? 'Subiendo foto...' : 'Toca para tomar una foto'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {fotoUri && (
          <TouchableOpacity style={styles.retakeButton} onPress={tomarFoto}>
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
            <Text style={[styles.retakeText, { color: colors.primary }]}>
              Tomar otra foto
            </Text>
          </TouchableOpacity>
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
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: ubicacionObtenida ? 0.75 : 0.3,
              shadowRadius: ubicacionObtenida ? 14 : 6,
              elevation: ubicacionObtenida ? 12 : 4,
            },
          ]}
          onPress={obtenerUbicacion}
        >
          <Ionicons
            name={ubicacionObtenida ? 'location' : 'location-outline'}
            size={20}
            color={ubicacionObtenida ? colors.textOnPrimary : colors.primary}
          />
          <Text
            style={[
              styles.locationText,
              { color: ubicacionObtenida ? colors.textOnPrimary : colors.primary },
            ]}
          >
            {ubicacionObtenida
              ? `✓ ${latitud!.toFixed(5)}, ${longitud!.toFixed(5)}`
              : 'Capturar mi ubicación GPS'}
          </Text>
        </TouchableOpacity>

        {/* ── 3. Tipo de lugar ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          3. Tipo de lugar
        </Text>
        <ChipGroup
          opciones={TIPOS_LUGAR}
          seleccionado={tipoLugar}
          onSelect={setTipoLugar}
          colors={colors}
        />

        {/* ── 4. Tipo de objeto ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          4. Tipo de objeto
        </Text>
        <ChipGroup
          opciones={TIPOS_OBJETO}
          seleccionado={tipoObjeto}
          onSelect={setTipoObjeto}
          colors={colors}
        />

        {/* ── 5. Larvas ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          5. ¿Observas larvas?
        </Text>
        <ChipGroup
          opciones={OPCIONES_LARVAS}
          seleccionado={observaLarvas}
          onSelect={setObservaLarvas}
          colors={colors}
        />

        {/* ── 6. Dengue cercano ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          6. ¿Conoces casos de dengue cerca?
        </Text>
        <ChipGroup
          opciones={OPCIONES_DENGUE}
          seleccionado={dengue}
          onSelect={setDengue}
          colors={colors}
        />

        {/* ── 7. Comentarios ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          7. Comentarios adicionales{' '}
          <Text style={{ color: colors.textSecondary, fontFamily: 'Inter-Regular' }}>
            (opcional)
          </Text>
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            },
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
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.85,
              shadowRadius: 20,
              elevation: 18,
            },
            (!formularioValido || isPending) && { opacity: 0.6 },
          ]}
          onPress={handleSubmit}
          disabled={!formularioValido || isPending}
        >
          <Ionicons name="send-outline" size={18} color={colors.textOnPrimary} />
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
  container: {
    paddingHorizontal: 20,
    // paddingTop y paddingBottom se aplican dinámicamente
  },
  pageTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 24,
    letterSpacing: 2,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },
  photoBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    height: 180,
    marginBottom: 8,
    overflow: 'hidden',
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
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  retakeText: {
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