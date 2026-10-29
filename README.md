# Paradero Vegano · React Native + Expo

La aplicación anterior fue migrada a **React Native con Expo y TypeScript**. Comparte pantallas, componentes y lógica entre web, Android e iOS. El servidor Node también está dentro de esta carpeta; no necesita archivos de la versión anterior para ejecutarse.

## Descargar desde Git para la presentación

Requisitos en el computador: **Node.js 24 LTS**, npm y Git. En el teléfono, Expo Go compatible con el SDK 58 del proyecto.

```powershell
git clone https://github.com/Zheeenz/Radar_react.git
cd Radar_react
npm ci
npm run dev
```

También puedes descargar el ZIP desde GitHub, extraerlo y ejecutar `npm ci` y `npm run dev` en la carpeta que contiene `package.json`.

El comando inicia la API y Expo, y muestra un **QR en la terminal**. Conecta el teléfono y el computador a la misma red Wi-Fi y escanea el QR para abrir la aplicación en Expo Go. Mantén la terminal abierta durante la presentación. No necesitas un identificador especial: cada computador genera su QR al iniciar Expo.

En iPhone, inicia sesión con la misma cuenta en Expo Go y en la CLI de Expo mediante `npx expo login`. Consulta [los requisitos de acceso de Expo Go](https://expo.dev/changelog/expo-go-57-login).

Para presentar desde el navegador, usa `npm run dev:web` en lugar de `npm run dev`. Detén los procesos con `Ctrl+C` antes de cambiar entre ambos comandos.

Cada instalación guarda su propio perfil y datos de prueba. Descargar el repositorio no comparte automáticamente los cambios de otro computador.

## Iniciar en el computador

Requisitos: Node.js 24 LTS, npm y una conexión a internet para instalar paquetes y cargar los mapas web. Ejecuta los comandos desde `C:\Radar_Vegano\Radar_react`.

```powershell
npm ci
npm run dev:web
```

El comando levanta la API en `http://127.0.0.1:4174` y Expo en `http://localhost:8081`. Abre el navegador automáticamente. Si no lo abre, presiona `w` en la terminal de Expo. Detén ambos procesos con `Ctrl+C`.

## Abrir en Expo Go

1. Instala una versión de Expo Go compatible con el SDK del proyecto, actualmente Expo 58. Puedes consultar el cliente disponible para tu dispositivo en [la página oficial de Expo Go](https://expo.dev/go?sdkVersion=58).
2. Conecta el teléfono y el computador a la misma red Wi-Fi.
3. Ejecuta:

```powershell
npm run dev
```

## Partes importantes

| Ubicación | Responsabilidad |
| --- | --- |
| `app/` | Rutas web y navegación móvil con Expo Router. |
| `src/screens/` | Pantallas y flujos de cada módulo. |
| `src/components/` | Controles visuales, tarjetas, ventanas, mapa y cámara. |
| `src/context/RadarContext.tsx` | Estado compartido y operaciones que sincronizan la interfaz con la API. |
| `src/services/api.ts` | Dirección del servidor, solicitudes y errores de conexión. |
| `src/domain/` | Búsqueda, preferencias, precios, distancias y construcción segura del CSV. |
| `src/theme.ts` | Colores, tipografías y fotografía compartida. |
| `backend/server.mjs` | API HTTP y publicación de la web compilada. |
| `backend/lib/` | Persistencia, reglas de ingredientes y estadísticas. |
| `backend/data/seed.json` | Catálogo inicial de lugares, productos, recetas y planes. |
| `.data/store.json` | Datos persistidos al ejecutar la aplicación. No se versionan. |
| `test/` | Pruebas de API y lógica compartida. |

## Comandos

| Comando | Resultado |
| --- | --- |
| `npm run dev:web` | API local + Expo web. |
| `npm run dev` | API en red local + Expo para Expo Go. |
| `npm run check` | TypeScript y pruebas. |
| `npm run test:web` | Recorridos de navegador sobre la web compilada, con datos aislados. |
| `npx expo-doctor` | Compatibilidad del proyecto Expo. |
| `npm run build:web` | Exporta la web a `dist/`. |
| `npm run build:native` | Genera los bundles de Android/iOS en `dist-native/`. |
| `npm run server` | API y, si existe `dist/`, web compilada en el puerto 4174. |
