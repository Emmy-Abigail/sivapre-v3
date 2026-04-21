import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useAuthContext } from '../store/auth-context';

export default function SplashScreen() {
  const { setSplashShown } = useAuthContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      setSplashShown(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.logoRow}>
          <Text style={styles.logo}>SIVAPRE</Text>
          <Text style={styles.logoAccent}>.</Text>
        </View>

        <Text style={styles.tagline}>
          Vigilancia Participativa{'\n'}contra el Dengue
        </Text>

        <View style={styles.divider} />
      </Animated.View>

      <Animated.Text style={[styles.version, { opacity: fadeAnim }]}>
        v1.0
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F6E56',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  logo: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 42,
    letterSpacing: 6,
    color: '#FFFFFF',
  },
  logoAccent: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 54,
    lineHeight: 54,
    marginBottom: 0,
    color: '#7EDFC0',
  },
  tagline: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 22,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 32,
  },
  divider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#7EDFC0',
    opacity: 0.5,
  },
  version: {
    position: 'absolute',
    bottom: 40,
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.35)',
  },
});
