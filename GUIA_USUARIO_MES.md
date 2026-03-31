# Guía de Usuario - Sistema MES.MG 🚀

Bienvenido al manual oficial del **Sistema de Ejecución de Manufactura (MES)** de Mi Gusto. Esta guía te ayudará a navegar y utilizar todas las funciones del sistema, desde la planificación inicial hasta el análisis gerencial.

---

## 📅 1. Módulo de Programación (Planificación)
Este es el punto de partida. Aquí defines qué se debe producir cada día.

1.  **Selección de Fecha**: Usa el calendario en la parte superior derecha para elegir el día de producción.
2.  **Selección de Sector y Turno**: Navega entre las pestañas de colores (Mesa de Carnes, Cocina, etc.) y los botones de turno (Mañana, Tarde, Noche).
3.  **Carga de Cantidades**: Ingresa los kilos planificados en la columna correspondiente de cada producto.
4.  **Guardar Plan**: Presiona el botón **"Guardar Plan"**. El sistema eliminará cualquier plan previo para esa fecha/sector/turno y guardará la nueva información.

> [!TIP]
> Solo necesitas cargar los productos que tendrán producción. Los ceros no ocupan espacio en el sistema.

---

## 🏭 2. Módulo de Producción (Registro Real)
Aquí es donde los operarios registran lo producido durante el turno.

1.  **Iniciar el Día**: Antes de empezar a cargar, presiona **"Iniciar Día"**. Esto prepara los registros de todos los sectores para la fecha seleccionada.
2.  **Registro de Kilos**: En la tabla, ingresa los kilos **producidos**. El sistema calculará automáticamente la **Diferencia** y el **Estado** (Adelanto, Atraso u OK) en tiempo real.
3.  **Filtrado Rápido**: Usa las pestañas centrales para saltar entre sectores. Recuerda que el sistema carga toda la planta a la vez, por lo que el cambio es instantáneo.
4.  **Guardar Producción**: Presiona **"Guardar Producción"** frecuentemente para no perder datos.
5.  **Cerrar Día/Turno**: Al finalizar la jornada, presiona **"Cerrar Día"**. Esto bloquea el registro y genera el historial definitivo que verás en otros módulos.

---

## 📊 3. Dashboard Gerencial (Indicadores)
Vista de alto nivel para la toma de decisiones.

*   **Producción Total (Armado)**: El sistema utiliza el sector "Armado" como el termómetro principal de la planta. Las tarjetas superiores muestran el Plan vs. Real solo de este sector.
*   **Desglose por Sector**: En la parte inferior verás una comparativa de kilos planificados vs. producidos para cada área.
*   **Top Productos**: Identifica rápidamente cuáles son los productos con mayor volumen de producción del día.

---

## 📜 4. Historial de Producción (Consultas)
Consulta los registros de días pasados.

1.  **Rango de Fechas**: Selecciona una fecha de inicio y fin para ver un listado de registros.
2.  **Filtro de Turnos**: Puedes ver todos los turnos juntos o filtrar por Mañana, Tarde o Noche.
3.  **Pestañas de Sectores**: Dentro de cada registro diario, usa las pestañas (Mesa de Carnes, Cocina, etc.) para intercalar los datos. Esto te permite auditar cada sector de forma individual sin salir del registro.

---

## 🖥️ 5. Pantalla de Planta (Visibilidad en Vivo)
Diseñada para ser proyectada en televisores o monitores grandes en la fábrica.

*   Muestra el progreso total de la planta en tiempo real.
*   Incluye gráficos de cumplimiento por sector y alertas visuales si hay atrasos significativos en la producción actual.

---

## 🌙 Nota sobre el Turno Noche e Integración
El sistema ha sido actualizado para incluir el **Turno Noche** en todos sus módulos. 
*   Los datos se guardan de forma independiente por turno.
*   El historial agrupa los turnos por fecha calendario, permitiendo una visión integral del día operativo de la planta.

---
*Manual generado automáticamente para el proyecto MES.MG - 2026*
