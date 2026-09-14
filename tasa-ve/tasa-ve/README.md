# Tasa VE — Dólar BCV, Binance P2P y promedio

App web (y PWA instalable en el móvil) que muestra:

- **Tasa BCV** (oficial, vía pyDolarVenezuela)
- **Tasa Binance P2P** (USDT/VES, mediana de los anuncios más activos)
- **Promedio** entre ambas
- Histórico por hora (7/30/90 días)
- Alertas por notificación push cuando una tasa cruza un umbral que tú definas

## 1. Requisitos

- Una cuenta gratuita en [vercel.com](https://vercel.com) (puedes entrar con GitHub)
- Una cuenta en [github.com](https://github.com) para subir el código (Vercel despliega desde ahí)
- Node.js instalado si quieres probarlo en tu computadora antes de publicarlo (opcional)

## 2. Subir el código a GitHub

1. Crea un repositorio nuevo y vacío en GitHub (ej. `tasa-ve`).
2. Desde esta carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "Primera versión de Tasa VE"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/tasa-ve.git
   git push -u origin main
   ```

## 3. Crear el proyecto en Vercel

1. Entra a [vercel.com/new](https://vercel.com/new) e importa el repositorio `tasa-ve`.
2. Framework Preset: Vercel detecta **Next.js** automáticamente. No cambies nada.
3. Dale a **Deploy**. En unos 2 minutos tendrás una URL tipo `tasa-ve.vercel.app`.

En este punto la app ya funciona mostrando las tasas en vivo — lo único que faltará es el histórico y las alertas, porque necesitan la base de datos y las claves de notificaciones.

## 4. Conectar la base de datos (histórico)

1. En el dashboard de tu proyecto en Vercel, ve a la pestaña **Storage**.
2. Click en **Create Database** → elige **Upstash** → **Redis** (tiene un plan gratuito generoso).
3. Al crearla, Vercel te preguntará a qué proyecto conectarla — elige `tasa-ve`. Esto agrega automáticamente las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` a tu proyecto.
4. Ve a **Settings → Environment Variables** de tu proyecto y confirma que ahí aparecen esas dos variables.
5. Vuelve a **Deployments** y dale **Redeploy** al último deployment para que tome las nuevas variables.

Desde este momento, el cron job horario empezará a guardar el histórico automáticamente.

## 5. Activar las notificaciones (alertas)

1. En tu computadora, dentro de la carpeta del proyecto, corre:
   ```bash
   npx web-push generate-vapid-keys
   ```
   Esto te da un `Public Key` y un `Private Key`. Guárdalos, son solo tuyos.
2. En Vercel, ve a **Settings → Environment Variables** y agrega:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` → el Public Key
   - `VAPID_PRIVATE_KEY` → el Private Key
   - `VAPID_SUBJECT` → `mailto:tu-correo@ejemplo.com` (puede ser cualquier correo tuyo)
3. Agrega también `CRON_SECRET` con cualquier texto secreto que inventes (ej. una contraseña larga aleatoria). Esto evita que cualquiera en internet pueda llamar a tus rutas de cron manualmente.
4. Vuelve a hacer **Redeploy**.

**Nota sobre los cron jobs:** el plan gratuito de Vercel ("Hobby") solo permite tareas automáticas una vez al día, así que esta app no depende de un cron. En su lugar, cada vez que alguien abre la app (o el navegador la consulta automáticamente cada minuto mientras está abierta), se aprovecha esa misma visita para guardar el histórico (si ya pasó como una hora desde el último punto) y revisar las alertas (si ya pasaron como 15 minutos). Si nadie usa la app durante varias horas, simplemente no se guardan puntos en ese lapso — no afecta nada más.

Si más adelante quieres precisión exacta aunque nadie esté usando la app, puedes usar un servicio gratuito externo como [cron-job.org](https://cron-job.org) para que llame cada hora a `https://tu-app.vercel.app/api/cron/snapshot` (y cada 15 min a `/api/cron/check-alerts`), agregando el header `Authorization: Bearer TU_CRON_SECRET`. Es opcional — la app funciona bien sin esto.

## 6. Instalar la app en el teléfono

- **Android (Chrome)**: entra a tu URL de Vercel, aparecerá un botón "Instalar" dentro de la app (o el menú ⋮ → "Instalar app" / "Agregar a pantalla de inicio").
- **iPhone (Safari)**: entra a tu URL, toca el ícono de compartir (el cuadrado con la flecha) → "Agregar a pantalla de inicio".

Una vez instalada, abre como cualquier otra app, sin la barra del navegador.

## 7. Probar en tu computadora antes de publicar (opcional)

```bash
npm install
cp .env.example .env.local   # y llena las variables que quieras probar
npm run dev
```

Abre `http://localhost:3000`. Sin las variables de entorno configuradas, la app funciona igual pero sin histórico ni alertas (las tasas en vivo sí funcionan si tienes internet).

## Notas sobre las fuentes de datos

- **BCV** no publica una API oficial — se usa pyDolarVenezuela, un proyecto independiente que sincroniza tanto la tasa del dólar como la del euro publicadas en la web del Banco Central. Si en algún momento cambia de dirección o deja de funcionar, hay que actualizar la URL en `src/lib/bcv.ts`.
- **Binance P2P** no tiene una API pública oficial documentada; se usa el mismo endpoint que usa la página web de Binance internamente. Binance podría cambiarlo sin aviso — si un día deja de traer datos, hay que revisar `src/lib/binance.ts`.
- **Euro paralelo**: Binance P2P no tiene un mercado de euros para Venezuela (solo dólares vía USDT), así que el "euro paralelo" se calcula de forma indirecta: dólar paralelo (Binance) × tasa EUR/USD internacional (fuente: Frankfurter, tasas del Banco Central Europeo). Es una estimación razonable — así lo hacen la mayoría de los sitios de referencia venezolanos — pero no es un precio de mercado real como sí lo es el dólar P2P.
- **Brecha cambiaria**: es el % de diferencia entre la tasa paralela (o el promedio) y la oficial del BCV. Un número positivo significa que esa tasa está por encima del BCV.
- Estas tasas son datos de referencia para decidir a qué precio comprar o vender divisas en efectivo; no son asesoría financiera.

## Estructura del proyecto

```
src/
  app/
    page.tsx                  Página principal
    api/rates                 Tasas actuales (BCV + Binance + promedio)
    api/history                Histórico guardado en Redis
    api/subscribe              Alta/baja de alertas push
    api/vapid-public-key       Expone la clave pública VAPID al navegador
    api/cron/snapshot          Job: guarda una foto de las tasas cada hora
    api/cron/check-alerts      Job: revisa umbrales y notifica
  components/                  UI (tablero, gráfico, alertas, instalación)
  lib/                         Lógica de datos (BCV, Binance, Redis, push)
public/
  manifest.json, sw.js, icons/ PWA
vercel.json                    Horario de los cron jobs
```
