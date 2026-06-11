<div align="center">

<img src="https://img.shields.io/badge/TrashTracker-Medellín-6444c0?style=for-the-badge&logoColor=white" alt="TrashTracker" />

# <img width="543" height="170" alt="trashTrackerMedellin" src="https://github.com/user-attachments/assets/ceaa0286-a1df-45e5-b731-4df7704ba266" />


**Plataforma inteligente de monitoreo y recolección de residuos urbanos**

[![Next.js](https://img.shields.io/badge/Next.js_14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=flat-square&logo=greensock&logoColor=black)](https://gsap.com)

</div>

---

## ¿Qué es TrashTracker?

TrashTracker es una plataforma web desarrollada para empresas de aseo de Medellín que permite monitorear en tiempo real el nivel de llenado de contenedores de basura urbanos y calcular automáticamente la ruta óptima de recolección.

El sistema integra un sensor ultrasónico (HC-SR04) en cada contenedor que mide el nivel de basura y reporta al backend vía HTTP. Los operarios pueden visualizar todos los contenedores en un mapa interactivo y generar con un clic la ruta más eficiente para el camión recolector, siguiendo las calles reales de la ciudad.

---

## Funcionalidades

- **Mapa en tiempo real** — visualización de todos los contenedores con su estado actual (lleno, vacío, en recolección) sobre OpenStreetMap
- **Monitoreo de nivel** — cada contenedor muestra su porcentaje de llenado actualizado por el sensor ultrasónico
- **Ruta óptima** — cálculo automático del recorrido más eficiente para recoger todos los contenedores llenos, siguiendo las calles reales mediante OSRM
- **Gestión de contenedores** — agregar, editar y eliminar puntos de recolección con coordenadas geográficas reales
- **Simulación del sensor** — endpoint para simular lecturas del sensor durante desarrollo y demos
- **Reportes con Folium** — generación de mapas estáticos en Python para documentación e informes [EN DESARROLLO]

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS |
| Animaciones | GSAP |
| Mapa (web) | react-leaflet + OpenStreetMap |
| Mapa (reportes) | Folium (Python) |
| Base de datos | PostgreSQL vía Supabase |
| Enrutamiento | OSRM (Open Source Routing Machine) |
| Hardware | Arduino/ESP32 + sensor ultrasónico HC-SR04 |

---

## Estructura del proyecto

```
trash-tracker/
├── app/
│   ├── page.tsx                        # Dashboard principal
│   └── api/
│       ├── containers/
│       │   ├── route.ts                # GET todos, POST crear
│       │   └── [id]/
│       │       ├── route.ts            # PATCH, DELETE
│       │       └── sensor/
│       │           └── route.ts        # POST lectura sensor
│       └── route-optimizer/
│           └── route.ts                # POST calcular ruta óptima
├── components/
│   ├── Map.tsx                         # Mapa interactivo (client component)
│   └── AddContainerModal.tsx           # Modal para crear contenedor
├── lib/
│   ├── supabase.ts                     # Cliente Supabase
│   └── animations.ts                   # Funciones GSAP centralizadas
├── types/
│   └── index.ts                        # Tipos TypeScript globales
├── esp32/
│   └── main.py                          # Firmware MicroPython para ESP32 + HC-SR04
└── scripts/
    ├── generate_map.py                  # Mapa Folium estático
    └── simulate_sensor.py              # Simulación del sensor por CLI
```

---


## API Reference

### Contenedores

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/containers` | Retorna todos los contenedores |
| `POST` | `/api/containers` | Crea un contenedor nuevo |
| `PATCH` | `/api/containers/:id` | Actualiza estado o nivel de llenado |
| `DELETE` | `/api/containers/:id` | Elimina un contenedor |
| `POST` | `/api/containers/:id/sensor` | Recibe lectura del sensor ultrasónico |

### Ruta óptima

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/route-optimizer` | Calcula la ruta óptima por calles reales |


---

## Hardware — sensor ultrasónico

El sensor HC-SR04 mide la distancia desde la tapa del contenedor hasta el nivel de basura. El microcontrolador ESP32 convierte esa distancia a porcentaje y la envía al endpoint `/api/containers/:id/sensor`.

```
Profundidad del contenedor: 50 cm
fill_level (%) = ((50 - distance_cm) / 50) × 100

distance = 5cm  → fill_level = 90% → status: "full"
distance = 40cm → fill_level = 20% → status: "empty"
```

---

## Algoritmo de ruta óptima

Se implementa el algoritmo del **vecino más cercano (Nearest Neighbor Heuristic)**:

1. Parte desde las coordenadas de la empresa
2. En cada paso visita el contenedor lleno más cercano aún no visitado
3. La distancia entre puntos se calcula con la fórmula de **Haversine**
4. Una vez ordenados los puntos, se consulta **OSRM** para obtener la ruta real por calles
5. Si OSRM no está disponible, se muestra la ruta en línea recta como fallback (color naranja)

> El algoritmo no garantiza la solución matemáticamente óptima (NP-hard), pero produce resultados muy buenos en entornos urbanos con puntos relativamente cercanos.

---

## Créditos

Emanuel García Rios

Kevin Sebastián Cifuentes López

Heiver David Ruales

Proyecto académico desarrollado para la materia de **Electrónica Digital** — Universidad de Medellín, Colombia.

---

<div align="center">
  Medallo
</div>
