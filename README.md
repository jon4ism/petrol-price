# petrol-price

Bot de Telegram que envía los precios de gasolina y diésel de las gasolineras más baratas en un radio de 10km desde Usansolo (Bizkaia, España).

## Características

- Comando `/precios`: muestra las 5 gasolineras más baratas de Gasolina 95 y Diésel, con una gráfica comparativa de las top 10
- Suscripción a actualizaciones diarias automáticas a las 8:00 AM (hora Madrid)
- Datos del Ministerio de Industria de España (sin API key)

## Requisitos previos

- [Bun](https://bun.sh/) >= 1.1
- [pnpm](https://pnpm.io/) >= 9
- Un bot de Telegram (obtén el token en [@BotFather](https://t.me/BotFather))

### Dependencias del sistema (necesarias para generar gráficas)

En **Ubuntu/Debian** (incluye Raspberry Pi OS):

```bash
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  pkg-config
```

> **Nota para Raspberry Pi 3:** La compilación del módulo nativo `canvas` durante `pnpm install` puede tardar entre 5 y 10 minutos. Es normal.

## Instalación

```bash
git clone <repo-url>
cd petrol-price
pnpm install
```

## Configuración

```bash
cp .env.example .env
```

Edita `.env` y añade tu token:

```
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
```

## Ejecución

```bash
# Producción
pnpm start

# Desarrollo (con recarga automática)
pnpm dev
```

## Ejecutar como servicio systemd (Raspberry Pi)

Crea el archivo `/etc/systemd/system/petrol-price.service`:

```ini
[Unit]
Description=Petrol Price Telegram Bot
After=network.target

[Service]
Type=simple
User=jon
WorkingDirectory=/home/jon/develop/petrol-price
EnvironmentFile=/home/jon/develop/petrol-price/.env
ExecStart=/home/jon/.bun/bin/bun run index.ts
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Activa el servicio:

```bash
sudo systemctl daemon-reload
sudo systemctl enable petrol-price
sudo systemctl start petrol-price
sudo systemctl status petrol-price
```

## Comandos del bot

| Comando | Descripción |
|---|---|
| `/start` o `/subscribe` | Suscribirse a actualizaciones diarias |
| `/precios` | Ver los precios actuales ahora |
| `/stop` o `/unsubscribe` | Cancelar la suscripción |

## Fuente de datos

- **API**: [Ministerio de Industria, Turismo y Comercio](https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/)
- Sin API key requerida
- Datos actualizados diariamente (normalmente por la mañana)
- Filtrado a gasolineras en un radio de 10km desde Usansolo (43.217194, -2.817696)

## Arquitectura

```
src/
  bot/         Handlers de comandos de Telegram
  scheduler/   Cron job de difusión diaria
  services/    Lógica de negocio (API, suscriptores, formato)
  charts/      Generación de gráficas con Chart.js
index.ts       Punto de entrada
```

- **Long polling** (sin webhook): no requiere IP pública ni dominio
- **subscribers.json**: lista de chat IDs suscritos (excluido de git)
