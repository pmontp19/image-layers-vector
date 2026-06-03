# Image → Layers → Vector 🪄

MVP / playground per provar aquesta idea: agafar una **imatge raster**, descompondre-la
en **capes RGBA** amb el model [Qwen-Image-Layered](https://fal.ai/models/fal-ai/qwen-image-layered)
de fal.ai, i **vectoritzar cada capa** amb [Recraft Vectorize](https://fal.ai/models/fal-ai/recraft/vectorize)
per acabar amb un conjunt de **SVGs per capa** llestos per importar a eines de tall com
**Cricut Design Space**.

És l'equivalent conceptual a la feature *Magic Layers* de Canva, però orientat a
exportar vectors tallables.

```
[Upload o Generate (Recraft V3)]
        │
        ▼
[Qwen-Image-Layered]  →  N capes PNG (RGBA, fons transparent)
        │
        ▼
[Recraft Vectorize]   →  1 SVG per capa
        │
        ▼
[Canvas + export ZIP] →  SVG/PNG per capa (Cricut-ready)
```

## Cas d'ús

1. Generes una imatge plana (o en tens una).
2. La passes pel workflow → obtens capes separades.
3. Importes cada SVG a Cricut Design Space (cada capa = un camí de tall independent).
   També pots fer servir la capa raster, però amb vector el tall és net i escalable.

## Stack

- **Next.js 15** (App Router) + **React 19** + TypeScript
- **@fal-ai/client** + **@fal-ai/server-proxy** — totes les crides a fal passen per un
  proxy de servidor (`/api/fal/proxy`) perquè la `FAL_KEY` **mai** arribi al navegador.
- CSS pla (sense build extra). UI tipus canvas amb capes apilades, toggles i exportació ZIP.

## Posada en marxa

```bash
# 1. Instal·la dependències
npm install

# 2. Configura la teva clau de fal (https://fal.ai/dashboard/keys)
cp .env.example .env.local
#   edita .env.local i posa-hi FAL_KEY=...

# 3. Arrenca
npm run dev
# obre http://localhost:3000
```

> La `FAL_KEY` només es llegeix al servidor (route `app/api/fal/proxy/route.ts`).

## Com funciona la UI

- **Esquerra** — pestanya *Upload* (arrossega una imatge) o *Generate* (text→imatge amb
  Recraft V3, estils flat/vector). Controls de descomposició: nombre de capes (1–10),
  prompt de guia opcional, i "auto-vectoritzar".
- **Centre** — canvas que reconstrueix la imatge apilant les capes visibles. Commutador
  **Raster / Vector** i botó d'export ZIP.
- **Dreta** — llista de capes: miniatura, estat (raster / vectorizing / SVG), toggle de
  visibilitat, i descàrrega individual de SVG/PNG.

## Models fal.ai utilitzats

| Pas | Endpoint | Cost aprox. |
|-----|----------|-------------|
| Generar (opcional) | `fal-ai/recraft/v3/text-to-image` | per imatge |
| Descompondre capes | `fal-ai/qwen-image-layered` | ~$0.05 / imatge |
| Vectoritzar | `fal-ai/recraft/vectorize` | per crida (una per capa) |

## Notes / límits de l'MVP

- La vectorització es fa **una crida per capa** (seqüencial) per no saturar.
- L'ordre de les capes és el que retorna el model; la capa 1 és la base de la pila.
- Requisits d'imatge del vectoritzador: PNG/JPG/WEBP, < 5 MB, < 16 MP, dimensió màx 4096px.
- Alternativa de vectorització esmentada: **Quiver AI** — es podria endollar afegint un
  endpoint més a `lib/workflow.ts::vectorizeLayer`.

## Estructura

```
app/
  api/fal/proxy/route.ts   # proxy de fal (clau server-side)
  api/download/route.ts    # proxy de descàrrega (CORS-safe, només fal.media)
  page.tsx · layout.tsx · globals.css
components/
  Playground.tsx           # estat + orquestració del pipeline
  Dropzone.tsx · LayerCanvas.tsx · LayerPanel.tsx
lib/
  fal.ts                   # config del client (proxyUrl)
  workflow.ts              # generate / upload / decompose / vectorize
  zip.ts                   # descàrregues i export ZIP (jszip)
  types.ts
```
