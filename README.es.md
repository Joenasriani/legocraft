# Legocraft

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt.md">Português</a> ·
  <a href="README.ar.md">عربي</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.hi.md">हिन्दी</a> ·
  <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  <img src="docs/screenshots/Brick%20XR%20Builder%20Game%20Showcase.png" alt="Legocraft browser 3D brick-building sandbox showcase" width="100%">
</p>

[![CI](https://github.com/Joenasriani/legocraft/actions/workflows/ci.yml/badge.svg)](https://github.com/Joenasriani/legocraft/actions/workflows/ci.yml)

Sandbox 3D de construcción con bloques para navegador, creado con React Three Fiber, Three.js y WebXR.

Construye y edita estructuras digitales de bloques en el navegador con controles de escritorio o táctiles, guarda y vuelve a cargar proyectos, exporta tus creaciones y experimenta con el mismo espacio de trabajo en WebXR.

> **Estado del proyecto:** Experimental. La interacción de escritorio y táctil está implementada. La funcionalidad WebXR está presente, pero todavía no se ha completado la validación en hardware Meta Quest real. Consulta `docs/QUEST_QA.md`.

## Pruébalo

Aplicación en vivo: https://legocraftvr.vercel.app/

## Para desarrolladores

Legocraft también es un ejemplo inspeccionable de un sistema de construcción 3D en navegador: colocación ajustada a cuadrícula, geometría de bloques generada, selección de objetos conectados, persistencia local, exportación GLB e interacción experimental con controladores WebXR conviven en la misma base de código React Three Fiber.

- [Explorar la arquitectura](docs/ARCHITECTURE.md)
- [Contribuir](CONTRIBUTING.md)
- [Revisar la matriz QA WebXR / Quest](docs/QUEST_QA.md)

## Funciones

- Colocar, mover, rotar, recolorear y eliminar bloques en una cuadrícula 3D con ajuste
- Varios tamaños de bloques rectangulares y formas redondas, conos, domos, pendientes, curvas, cuñas, triángulos y arcos
- Selección individual, múltiple y de grupos conectados
- Copiar/pegar, deshacer y rehacer
- Presets integrados: Caballo, Oveja, Coche, Carretera, Montaña, Árbol, Cabaña, Pozo, Pino y Castillo
- Persistencia local en el navegador
- Guardar e importar datos del proyecto como `.json`
- Exportar la estructura actual como `.glb`
- Exportar capturas como `.png`
- Interacción de escritorio y táctil
- Modos de cámara órbita, desplazamiento y zoom
- Atajos de teclado para guardar, copiar/pegar, eliminar y editar
- Restauración automática al iniciar de construcciones guardadas localmente
- Modo WebXR experimental con controladores, háptica, locomoción, giro por saltos y menús VR

## Ejecutar localmente

### Requisitos

- Node.js 22 recomendado
- npm
- Un navegador compatible con WebGL

### Instalación

```bash
git clone https://github.com/Joenasriani/legocraft.git
cd legocraft
npm install
```

### Iniciar el servidor de desarrollo

```bash
npm run dev
```

El servidor de desarrollo de Vite está configurado para el puerto `3000`.

Una primera ejecución correcta debería cargar el espacio de construcción 3D en el navegador y permitir colocar y manipular bloques.

### Verificar el proyecto

```bash
npm run test
npm run lint
npm run build
```

Estos comandos están definidos en `package.json` y GitHub Actions los verifica con Node.js 22.

## Archivos de proyecto y exportación

- Guardar/importar proyecto en `.json`
- Exportación 3D en `.glb`
- Capturas `.png`
- Persistencia local automática en el navegador

La captura de pantalla funciona según disponibilidad y puede depender del comportamiento WebGL del navegador.

## Verificación y compatibilidad

GitHub Actions verifica actualmente el repositorio con Node.js 22 mediante:

- `npm ci`
- `npm run test`
- `npm run lint`
- `npm run build`

Estado actual de compatibilidad:

| Entorno | Estado |
| --- | --- |
| Build de producción | Verificado por CI |
| Pruebas automatizadas | Verificadas por CI |
| Comprobación TypeScript | Verificada por CI |
| Interacción en navegador de escritorio | Implementada; sin matriz formal entre navegadores |
| Interacción táctil | Implementada; sin matriz formal de dispositivos |
| WebXR | Experimental |
| Hardware Meta Quest | Aún no probado en hardware real |

## Estado de WebXR

La interacción WebXR está implementada, incluidos entrada de controladores, respuesta háptica, menús VR, controles de locomoción y giro por saltos.

Las pruebas en hardware Meta Quest real **aún no** se han completado, por lo que la compatibilidad y el rendimiento específicos de Quest deben considerarse experimentales y no garantizados.

Consulta [`docs/QUEST_QA.md`](docs/QUEST_QA.md) para ver la matriz actual de QA de hardware.

## Construir sobre Legocraft

Cualquier idea es bienvenida si puede producir una mejora real, experimento, función, diseño, herramienta, ganancia de rendimiento, mejora de accesibilidad o extensión útil.

El juego actual es el punto de partida, no el techo.

Formas concretas de explorar o ampliar el proyecto:

- **Jugar:** probar el constructor actual e identificar una interacción o flujo que valga la pena mejorar.
- **Explorar el código:** usar [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para localizar el subsistema relevante.
- **Añadir un bloque:** ampliar las definiciones de bloques y la geometría generada.
- **Crear un preset:** añadir y validar una estructura reutilizable con el sistema actual de presets.
- **Mejorar la interacción:** trabajar en escritorio, táctil, selección, edición o cámara.
- **Probar WebXR:** ejecutar el procedimiento QA de Quest y reportar resultados de hardware reales.
- **Mejorar XR:** trabajar en compatibilidad de controladores, locomoción, háptica, UI VR o rendimiento.
- **Mejorar la fiabilidad:** añadir pruebas enfocadas para colocación, selección, presets o lógica compartida.
- **Abrir una issue:** debatir cambios mayores o limitaciones reproducibles antes de implementar.
- **Enviar una pull request:** mantener el cambio enfocado y ejecutar los comandos CI existentes.

Legocraft es open source bajo licencia MIT. Puedes hacer fork, modificarlo, ampliarlo y redistribuirlo según los términos de [`LICENSE`](LICENSE). Consulta [`CONTRIBUTING.md`](CONTRIBUTING.md) para el flujo de contribución.

### Puntos de entrada actuales para colaboradores

- [Validación y extensión de WebXR / Meta Quest](https://github.com/Joenasriani/legocraft/issues/1)
- [Mover la validación de presets a cobertura automatizada con Vitest](https://github.com/Joenasriani/legocraft/issues/2)
- [Ampliar la cobertura automatizada de reglas de colocación y selección](https://github.com/Joenasriani/legocraft/issues/3)

### Contribuciones creativas y espaciales

No hace falta programar para que una contribución sea útil. Diseñadores y artistas técnicos pueden proponer mediante una issue de GitHub estructuras preset, composiciones espaciales, nuevos conceptos de formas, flujos de interacción, retos de construcción o mejoras de accesibilidad. Bocetos, diagramas, diseños de referencia y notas claras de comportamiento son útiles cuando describen algo compatible con el constructor existente.

Las contribuciones aceptadas reciben crédito a través del historial de Git y del registro de pull requests; los autores de propuestas deben ser mencionados en la discusión de implementación cuando otra persona convierta un concepto aceptado en código.

### Frontera WebXR / Quest

Legocraft ya incluye interacción WebXR experimental, entrada de controladores, locomoción, háptica, menús VR y flujos de construcción específicos de XR. La validación en hardware Meta Quest real sigue abierta. La capa XR está documentada y diseñada para ser extensible por desarrolladores que quieran probarla, mejorarla, optimizarla o llevarla más lejos.

## Stack

- React
- TypeScript
- Three.js
- React Three Fiber
- `@react-three/drei`
- `@react-three/xr`
- Zustand
- Vite
- Vitest

**Creado por Joe Nasr** — Experiencias interactivas, 3D y WebXR.

https://joe-nasr-signals.vercel.app/
