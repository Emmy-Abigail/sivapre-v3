import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

// Cómo mostrar notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registrarPushToken(): Promise<void> {
  // Solo funciona en dispositivos físicos
  if (!Device.isDevice) return;

  // Crear canal para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reportes', {
      name: 'Estado de reportes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F6E56',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '1f796d41-d73d-4a68-a03e-f92ba0cf641d',
    });
    await api.post('/auth/push-token', { token: tokenData.data });
  } catch (err) {
    console.error('[Push] Error al registrar token:', err);
  }
}
