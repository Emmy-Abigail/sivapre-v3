import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import type { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register, isRegistering, registerError } = useAuth();

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    telefono: '',
  });

  // Efectos Glow
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Paleta Neón
  const neonCyan = '#00f3ff';
  const neonMagenta = '#ff003c';
  const darkBg = '#050505';
  const surface = '#111111';

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    const { nombre, apellido, email, password } = form;
    if (!nombre || !apellido || !email || !password) return;
    await register({ ...form, email: email.trim() });
  };

  const getInputStyle = (fieldName: string) => {
    const isFocused = focusedField === fieldName;
    return [
      styles.input,
      {
        backgroundColor: surface,
        borderColor: isFocused ? neonMagenta : '#222',
        color: '#fff',
        shadowColor: isFocused ? neonMagenta : 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isFocused ? 0.8 : 0,
        shadowRadius: isFocused ? 10 : 0,
        elevation: isFocused ? 10 : 0,
      },
    ];
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: darkBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Botón volver Neón */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={18} color={neonCyan} />
          <Text style={[styles.backText, { color: neonCyan }]}>VOLVER AL LOGIN</Text>
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: '#ffffff', textShadowColor: neonMagenta, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }]}>NUEVO OPERADOR</Text>
          <Text style={[styles.subtitle, { color: neonCyan }]}>
            SOLICITUD DE ACCESO AL SISTEMA
          </Text>
        </View>

        {registerError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              [!] ERROR EN EL REGISTRO. VERIFICA TUS DATOS.
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={[styles.label, { color: focusedField === 'nombre' ? neonMagenta : '#666' }]}>NOMBRE</Text>
              <TextInput
                style={getInputStyle('nombre')}
                value={form.nombre}
                onChangeText={set('nombre')}
                onFocus={() => setFocusedField('nombre')}
                onBlur={() => setFocusedField(null)}
                placeholder="Juan"
                placeholderTextColor="#444"
              />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.label, { color: focusedField === 'apellido' ? neonMagenta : '#666' }]}>APELLIDO</Text>
              <TextInput
                style={getInputStyle('apellido')}
                value={form.apellido}
                onChangeText={set('apellido')}
                onFocus={() => setFocusedField('apellido')}
                onBlur={() => setFocusedField(null)}
                placeholder="Pérez"
                placeholderTextColor="#444"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: focusedField === 'email' ? neonMagenta : '#666' }]}>
              CORREO ELECTRÓNICO
            </Text>
            <TextInput
              style={getInputStyle('email')}
              value={form.email}
              onChangeText={set('email')}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              placeholder="tu@correo.com"
              placeholderTextColor="#444"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: focusedField === 'telefono' ? neonMagenta : '#666' }]}>
              TELÉFONO (OPCIONAL)
            </Text>
            <TextInput
              style={getInputStyle('telefono')}
              value={form.telefono}
              onChangeText={set('telefono')}
              onFocus={() => setFocusedField('telefono')}
              onBlur={() => setFocusedField(null)}
              placeholder="+52 123 456 7890"
              placeholderTextColor="#444"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: focusedField === 'password' ? neonMagenta : '#666' }]}>CÓDIGO DE ACCESO</Text>
            <TextInput
              style={getInputStyle('password')}
              value={form.password}
              onChangeText={set('password')}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor="#444"
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.buttonPrimary,
            { 
              backgroundColor: neonMagenta, 
              opacity: isRegistering ? 0.7 : 1,
              shadowColor: neonMagenta,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 15,
              elevation: 15,
            }
          ]}
          onPress={handleRegister}
          disabled={isRegistering}
        >
          <Text style={styles.buttonPrimaryText}>
            {isRegistering ? 'PROCESANDO...' : 'REGISTRAR OPERADOR'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 40,
  },
  backText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  headerContainer: {
    marginBottom: 40,
  },
  title: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 32,
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: 'bold',
  },
  errorBanner: {
    padding: 12,
    backgroundColor: 'rgba(255, 0, 60, 0.1)',
    borderWidth: 1,
    borderColor: '#ff003c',
    borderRadius: 4,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#ff003c',
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  form: {
    gap: 24,
    marginBottom: 40,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  buttonPrimary: {
    paddingVertical: 18,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 32,
  },
  buttonPrimaryText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    letterSpacing: 3,
    color: '#fff',
  },
});
