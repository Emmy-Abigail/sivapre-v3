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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import type { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login, isLoggingIn, loginError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  
  // Estados para el efecto Glow en los inputs
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);
  const [isFocusedPassword, setIsFocusedPassword] = useState(false);

  // Paleta de colores Neón
  const neonCyan = '#00f3ff';
  const neonMagenta = '#ff003c';
  const darkBg = '#050505';
  const surface = '#111111';

  const handleLogin = async () => {
    if (!email || !password) return;
    await login({ email: email.trim(), password });
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
          <Text style={[styles.backText, { color: neonCyan }]}>VOLVER</Text>
        </TouchableOpacity>

        {/* Logo UPCH neón */}
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/upch-logo.png')}
            style={styles.upchLogo}
            resizeMode="contain"
          />
        </View>

        {/* Encabezado Cyberpunk */}
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: '#ffffff', textShadowColor: neonCyan, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }]}>SIVAPRE</Text>
          <Text style={[styles.subtitle, { color: neonMagenta }]}>
            ACCESO RESTRINGIDO // LOGIN
          </Text>
        </View>

        {/* Banner de error */}
        {loginError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              [!] CREDENCIALES INVÁLIDAS. INTENTA DE NUEVO.
            </Text>
          </View>
        )}

        {/* Formulario */}
        <View style={styles.form}>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isFocusedEmail ? neonCyan : '#666' }]}>
              CORREO ELECTRÓNICO
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: surface,
                  borderColor: isFocusedEmail ? neonCyan : '#222',
                  color: '#fff',
                  shadowColor: isFocusedEmail ? neonCyan : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: isFocusedEmail ? 0.8 : 0,
                  shadowRadius: isFocusedEmail ? 10 : 0,
                  elevation: isFocusedEmail ? 10 : 0,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setIsFocusedEmail(true)}
              onBlur={() => setIsFocusedEmail(false)}
              placeholder="operador@sivapre.com"
              placeholderTextColor="#444"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Contraseña */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isFocusedPassword ? neonMagenta : '#666' }]}>
              CÓDIGO DE ACCESO
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: surface,
                  borderColor: isFocusedPassword ? neonMagenta : '#222',
                  shadowColor: isFocusedPassword ? neonMagenta : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: isFocusedPassword ? 0.8 : 0,
                  shadowRadius: isFocusedPassword ? 10 : 0,
                  elevation: isFocusedPassword ? 10 : 0,
                },
              ]}
            >
              <TextInput
                style={[styles.inputWithIcon, { color: '#fff' }]}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setIsFocusedPassword(true)}
                onBlur={() => setIsFocusedPassword(false)}
                placeholder="••••••••"
                placeholderTextColor="#444"
                secureTextEntry={!mostrarPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setMostrarPassword(!mostrarPassword)}
              >
                <Ionicons
                  name={mostrarPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={isFocusedPassword ? neonMagenta : '#666'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Olvidé contraseña */}
          <TouchableOpacity>
            <Text style={[styles.forgot, { color: '#888' }]}>
              ¿OLVIDASTE TU CÓDIGO?
            </Text>
          </TouchableOpacity>

        </View>

        {/* Botón principal Neón */}
        <TouchableOpacity
          style={[
            styles.buttonPrimary,
            { 
              backgroundColor: neonCyan, 
              opacity: isLoggingIn ? 0.7 : 1,
              shadowColor: neonCyan,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 15,
              elevation: 15,
            },
          ]}
          onPress={handleLogin}
          disabled={isLoggingIn}
        >
          <Text style={styles.buttonPrimaryText}>
            {isLoggingIn ? 'SISTEMA INICIANDO...' : 'ENTRAR AL SISTEMA'}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>
            ¿NUEVO OPERADOR?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.registerLink, { color: neonMagenta, textShadowColor: neonMagenta, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 5 }]}>
              SOLICITAR ACCESO
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
    fontSize: 42,
    letterSpacing: 4,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
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
    fontSize: 10,
    textAlign: 'right',
    letterSpacing: 1,
    marginTop: 4,
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
    color: '#000', // Texto negro sobre cyan para resaltar el neón
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#888',
    letterSpacing: 1,
  },
  registerLink: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 11,
    letterSpacing: 1,
  },
  logoWrapper: {
    alignSelf: 'flex-start',
    marginBottom: 24,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 12,
  },
  upchLogo: {
    width: 60,
    height: 80,
    opacity: 0.55,
  },
});
