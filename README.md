# Paradero Vegano · React Native + Expo

La aplicación anterior fue migrada a **React Native con Expo y TypeScript**. Comparte pantallas, componentes y lógica entre web, Android e iOS. El servidor Node también está dentro de esta carpeta; no necesita archivos de la versión anterior para ejecutarse.

El proyecto utiliza **Expo SDK 58, React Native 0.88 y Worklets 0.13.0 estable**. Los detalles del cambio y de la corrección de seguridad están en [ACTUALIZACION_EXPO58.md](docs/ACTUALIZACION_EXPO58.md).

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

Requisitos: Node.js 24 LTS, npm y una conexión a internet para instalar paquetes y cargar los mapas web. Ejecuta los comandos desde `D:\Dev\Radar_Vegano\Radar_react`.

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

4. Escanea el QR de Expo con Expo Go en Android o con la cámara en iPhone.

Después de actualizar desde SDK 57, inicia una vez con `npm run dev -- --clear` para limpiar la caché de Metro. Si el cliente del teléfono indica que solo admite SDK 57, necesita actualizarse a uno compatible con SDK 58. Si aún no está disponible para tu dispositivo, la alternativa es una compilación de desarrollo con SDK 58.

La API se inicia en la red local, en el puerto 4174. La aplicación obtiene normalmente la dirección del computador desde Expo. Si el teléfono no conecta, comprueba que Windows permita Node en redes privadas y que la red no aísle los dispositivos.

Para fijar una dirección, copia `.env.example` como `.env`, cambia la IP por la de tu computador y reinicia Expo:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.20:4174
```

Esta variable es pública y no debe contener contraseñas ni secretos. `localhost` desde un teléfono apunta al teléfono. El túnel de Expo solo transporta el código de la aplicación; no publica esta API. Para usar redes distintas se necesita una API accesible mediante HTTPS y configurar su URL.

También puedes iniciar cada servicio en una terminal:

```powershell
npm run server:lan
npm start
```

`npm run server` escucha únicamente en el computador. `npm run server:lan` permite acceder a la API desde dispositivos de la red y muestra las IP disponibles. Hay un solo perfil compartido por cada instalación del servidor.

## Qué puedes usar

- Explorar lugares, buscar por productos o ingredientes, filtrar, ordenar y ver el mapa.
- Ordenar por cercanía al conceder el permiso de ubicación.
- Guardar favoritos y revisar las fichas, etiquetas y aportes.
- Revisar ingredientes por reglas de texto y consultar códigos del catálogo, escritos o leídos con cámara.
- Adjuntar fotos a aportes, registrar disponibilidad y consultar notificaciones.
- Añadir productos a la lista, ajustar cantidades, marcar compras y exportar CSV.
- Abrir recetas y añadir sus productos del catálogo a la lista.
- Cambiar planes de prueba y acceder al panel de comercio, con periodos y exportación.
- Guardar nombre y preferencias, o restaurar los datos iniciales desde el perfil.

Se retiró el rótulo solicitado en toda la nueva aplicación. Se conservan las aclaraciones útiles sobre datos de ejemplo, análisis por reglas y planes sin cobros. El código escrito para esta migración no contiene comentarios; las explicaciones están en la documentación.

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

Lee [las decisiones de la migración](docs/MIGRACION.md), [el manual de uso](docs/USO.md) y [la verificación](docs/VERIFICACION.md).

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

Para revisar la web compilada, detén el servidor anterior, ejecuta `npm run build:web`, luego `npm run server` y abre `http://127.0.0.1:4174`. Las rutas como `/shopping` funcionan al recargar directamente.

`build:native` verifica el empaquetado del JavaScript y los recursos. No genera un APK o IPA. Una distribución en tiendas requiere una compilación nativa, identificadores definitivos, firma, configuración de mapas y servicios de producción.

Para las pruebas de navegador, instala Chromium una vez con `npx playwright install chromium`, genera `dist/` y ejecuta `npm run test:web`.

## Alcance actual

La persistencia sigue siendo un archivo JSON local con escrituras atómicas. No existen cuentas individuales, autenticación, pagos, OCR, notificaciones push ni certificación de productos. El recetario y el panel cambian según el plan seleccionado en la interfaz; esto todavía no es un control de acceso para una publicación pública. Los comercios, valoraciones y precios iniciales son ficticios. La fotografía es una ilustración compartida, no una fotografía de cada comercio.

El mapa usa OpenStreetMap/Leaflet en web y `react-native-maps` en móvil. El mapa web requiere internet. Cámara, fotos y ubicación solo se solicitan al utilizar esas funciones. En navegador, cámara y ubicación requieren un contexto seguro, como HTTPS o localhost. En compilaciones móviles propias se deben configurar los proveedores y permisos correspondientes.

Antes de publicar, sustituye el catálogo por información validada, incorpora una base de datos con cuentas y permisos, configura HTTPS y revisa el informe de dependencias descrito en `docs/VERIFICACION.md`.

Referencias técnicas: [Expo Router](https://docs.expo.dev/router/introduction/), [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/), [React Native Maps en Expo](https://docs.expo.dev/versions/latest/sdk/map-view/).
