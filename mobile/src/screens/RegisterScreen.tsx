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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import type { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { register, isRegistering, registerError } = useAuth();

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    telefono: '',
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    const { nombre, apellido, email, password } = form;
    if (!nombre || !apellido || !email || !password) return;
    await register({ ...form, email: email.trim() });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Crear cuenta</Text>

        {registerError && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>
              No se pudo crear la cuenta. Verifica tus datos.
            </Text>
          </View>
        )}

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={form.nombre}
              onChangeText={set('nombre')}
              placeholder="Juan"
              placeholderTextColor={colors.textDisabled}
            />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Apellido</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={form.apellido}
              onChangeText={set('apellido')}
              placeholder="Pérez"
              placeholderTextColor={colors.textDisabled}
            />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Correo electrónico
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={form.email}
          onChangeText={set('email')}
          placeholder="tu@correo.com"
          placeholderTextColor={colors.textDisabled}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Teléfono (opcional)
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={form.telefono}
          onChangeText={set('telefono')}
          placeholder="+52 123 456 7890"
          placeholderTextColor={colors.textDisabled}
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Contraseña</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={form.password}
          onChangeText={set('password')}
          placeholder="Mínimo 8 caracteres"
          placeholderTextColor={colors.textDisabled}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: colors.primary, opacity: isRegistering ? 0.7 : 1 }]}
          onPress={handleRegister}
          disabled={isRegistering}
        >
          <Text style={[styles.btnText, { color: colors.textOnPrimary }]}>
            {isRegistering ? 'Creando cuenta...' : 'Registrarme'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={[styles.link, { color: colors.primary }]}>
            ¿Ya tienes cuenta? Inicia sesión
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: 24,
    paddingTop: 64,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
  },
  errorText: { fontSize: 14 },
  btnPrimary: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});
