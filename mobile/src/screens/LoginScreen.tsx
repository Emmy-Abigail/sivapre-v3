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
import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import type { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { login, isLoggingIn, loginError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    await login({ email: email.trim(), password });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>

        {/* Botón volver */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Volver</Text>
        </TouchableOpacity>

        {/* Encabezado */}
        <Text style={[styles.title, { color: colors.text }]}>Iniciar Sesión</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Bienvenido de nuevo
        </Text>

        {/* Banner de error */}
        {loginError && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>
              Credenciales incorrectas. Intenta de nuevo.
            </Text>
          </View>
        )}

        {/* Formulario */}
        <View style={styles.form}>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Correo electrónico
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor={colors.textDisabled}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Contraseña */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Contraseña
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.inputWithIcon, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry={!mostrarPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setMostrarPassword(!mostrarPassword)}
              >
                <Ionicons
                  name={mostrarPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Olvidé contraseña */}
          <TouchableOpacity>
            <Text style={[styles.forgot, { color: colors.primary }]}>
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>

        </View>

        {/* Botón principal */}
        <TouchableOpacity
          style={[
            styles.buttonPrimary,
            { backgroundColor: colors.primary, opacity: isLoggingIn ? 0.7 : 1 },
          ]}
          onPress={handleLogin}
          disabled={isLoggingIn}
        >
          <Text style={[styles.buttonPrimaryText, { color: colors.textOnPrimary }]}>
            {isLoggingIn ? 'CARGANDO...' : 'INICIAR SESIÓN'}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.registerRow}>
          <Text style={[styles.registerText, { color: colors.textSecondary }]}>
            ¿No tienes cuenta?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.registerLink, { color: colors.primary }]}>
              Crear cuenta
            </Text>
          </TouchableOpacity>
        </View>

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
    marginBottom: 32,
  },
  backText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  title: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 28,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 32,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  form: {
    gap: 20,
    marginBottom: 28,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
  },
  inputWithIcon: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  forgot: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    textAlign: 'right',
  },
  buttonPrimary: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 28,
  },
  buttonPrimaryText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  registerLink: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
  },
});
