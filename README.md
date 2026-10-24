# Playa

Aplicación web PWA para estimar las mejores franjas de baño en Sanlúcar de Barrameda entre las 09:00 y las 21:00. Combina mareas, meteorología horaria y un motor de puntuación explicable de 0 a 100.

## Publicación

Esta versión se llama **Playa** y se publica en GitHub Pages desde este repositorio. La aplicación original de ChatGPT Sites se mantiene independiente.

- Repositorio: https://github.com/osrever/playa
- Web: https://osrever.github.io/playa/
- Compilación para Pages: `pnpm run build:pages`.
- En Settings → Pages, seleccionar GitHub Actions. Los cambios en `main` activan el workflow de publicación.
- `pnpm run build` conserva el empaquetado original para Sites; no lo necesita GitHub Pages.

## Stack

- Vite
- React
- TypeScript
- CSS responsive mobile-first
- Vitest

## Arquitectura

- `src/config/scoring.ts`: horarios, resolución, pesos, umbrales y clasificaciones.
- `src/providers/tides`: proveedor de mareas. Incluye simulación y una implementación IHM preparada para integrar un endpoint estructurado legítimo.
- `src/providers/weather`: proveedores meteorológicos AEMET, Open-Meteo y simulación.
- `src/services/tideCalculations.ts`: interpolación cosenoidal de altura y porcentaje de marea.
- `src/services/recommendationEngine.ts`: puntuación, hard constraints, agrupación y selección de mejor franja.
- `src/tests`: pruebas unitarias del dominio.

## Fuentes de datos

Meteorología:

- Por defecto se usa Open-Meteo porque permite predicción horaria sin clave y es estable para una primera versión ejecutable.
- AEMET OpenData está implementado como proveedor opcional. Requiere `VITE_AEMET_API_KEY`.

Mareas:

- La referencia oficial para Sanlúcar es Bonanza, del Instituto Hidrográfico de la Marina / Armada Española.
- La app usa por defecto el endpoint que carga la propia web del IHM: `https://ideihm.covam.es/api-ihm/getmarea?request=gettide&id=37&date=YYYYMMDD`.
- Para uso en playa se aplica `tide.localTimeOffsetMinutes`, porque Bonanza no coincide con la tabla práctica de Sanlúcar de Barrameda: el 15/08/2026 la tabla de Sanlúcar marca bajamar 12:14 y pleamar 18:15, no 10:16 y 16:17.
- Si el IHM falla, se muestra aviso y se usa el modo simulado como fallback visual para no dejar la interfaz inutilizable.

## Instalación

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm run dev
```

Abre la URL local que indique Vite.

## Variables de entorno

```bash
VITE_DATA_MODE=auto
VITE_WEATHER_PROVIDER=open-meteo
VITE_TIDE_PROVIDER=ihm
VITE_AEMET_API_KEY=
```

Opciones útiles:

- `VITE_DATA_MODE=simulated`: fuerza datos simulados.
- `VITE_DATA_MODE=strict`: no usa fallback simulado si falla una fuente.
- `VITE_WEATHER_PROVIDER=aemet`: usa AEMET OpenData si hay clave.
- `VITE_TIDE_PROVIDER=simulated`: fuerza mareas simuladas para pruebas.

## Puntuación

La puntuación se normaliza a 0-100 con pesos configurables:

- marea: 40
- temperatura/sensación térmica: 25
- viento: 20
- cielo/lluvia: 10
- hora del día: 5

Clasificación inicial:

- 85-100: Excelente
- 70-84: Muy buena
- 55-69: Buena
- 40-54: Justa
- 0-39: Mala

La marea se interpola con esta curva entre extremos:

```text
eased = (1 - cos(pi * progreso)) / 2
altura = alturaInicial + (alturaFinal - alturaInicial) * eased
```

Así se suaviza el cambio cerca de pleamar y bajamar.

La primera calibración distingue entre marea subiendo y marea bajando: cuando baja hacia bajamar dentro de la ventana crítica, exige más porcentaje para considerarla útil. El rango de altura entre bajamar y pleamar queda disponible como aproximación del coeficiente de marea cuando usemos datos reales.

La temperatura se valora usando temperatura y sensación térmica cuando el proveedor la ofrece. Esa sensación ya incorpora humedad, viento y radiación en Open-Meteo; además la app muestra la humedad relativa para que se entienda mejor por qué 30 °C húmedos pueden ser más incómodos que 40 °C secos.

El viento se interpreta por dirección meteorológica: Levante, Poniente, Norte o Sur. Los ajustes por dirección están centralizados en `appConfig.wind.directionEffects`, porque en Sanlúcar no basta con saber la velocidad.

El índice UV se muestra en las tarjetas principales y en los resúmenes horarios como aviso de exposición. No penaliza la comodidad del baño por sí solo: con UV alto la app recomienda protección solar, gorra/sombra o evitar sol directo prolongado, pero no baja la puntuación de marea y baño.

## Comandos

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run preview
```

## PWA en iPhone

Cuando esté desplegada con HTTPS:

1. Abre la URL en Safari.
2. Pulsa compartir.
3. Elige "Añadir a pantalla de inicio".

La app incluye manifest, icono y service worker básico.

## Siguiente iteración

- Integrar mareas reales mediante fuente estructurada oficial o proxy propio.
- Afinar reglas de Levante/Poniente con experiencia local.
- Añadir altura absoluta mínima de marea cuando haya datos reales consistentes.
- Afinar pesos por preferencia personal cuando haya una forma clara de aplicar esa calibración.
