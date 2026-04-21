# App Móvil — SIVAPRE

Documentación técnica de la aplicación móvil React Native (Expo SDK 54).

---

## Problemas conocidos y soluciones

### `Cannot read property 'regular' of undefined`

**Síntoma**

La app lanza el error `Cannot read property 'regular' of undefined` al iniciar, generalmente en pantallas o componentes que leen `fontFamily.inter.regular` o similares antes de que `expo-font` haya terminado de cargar las fuentes.

**Causa raíz**

React Navigation intenta renderizar headers y la navegación en el mismo ciclo de render en que `useFonts()` aún no ha resuelto. Si algún componente accede a propiedades de tipografía personalizada durante ese ciclo inicial, el valor puede estar `undefined`.

**Solución aplicada**

1. **`App.tsx`** — bloqueo estricto de render:
   ```tsx
   if (!fontsLoaded) return null;
   ```
   La app no renderiza nada (ni navegación, ni pantallas) hasta que `expo-font` confirma que las fuentes están disponibles. El splash nativo de Expo permanece visible durante la carga.

2. **`src/theme/typography.ts`** — fuentes con fallback seguro:
   ```ts
   export function getFonts() {
     return {
       regular: _fontsReady ? fontFamily.inter.regular : 'System',
       bold:    _fontsReady ? fontFamily.montserrat.extraBold : 'System',
     };
   }
   ```
   Las pantallas deben usar `getFonts()` para obtener la fuente activa. Antes de que las fuentes carguen, devuelve `'System'` en lugar de la fuente personalizada.

3. **`src/navigation/index.tsx`** — sin fuentes personalizadas en headers:
   Los `screenOptions` de React Navigation no pasan `fontFamily` personalizado. Los headers están ocultos (`headerShown: false`) y los estilos del tab bar usan solo `fontSize` y `fontWeight` del sistema.

4. **`App.tsx`** — registro de fuentes listas:
   ```tsx
   useEffect(() => {
     if (fontsLoaded) markFontsReady();
   }, [fontsLoaded]);
   ```
   `markFontsReady()` actualiza el flag interno de `typography.ts` para que `getFonts()` empiece a devolver las fuentes personalizadas.

**Regla general**

Las fuentes personalizadas (`Inter`, `Montserrat`) solo se usan **dentro de las pantallas**, nunca en la configuración de navegadores (`Navigator`, `screenOptions`).
