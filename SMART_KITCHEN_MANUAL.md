# 👩‍🍳 Olga's Smart Kitchen - Manual de Uso

¡Bienvenida a tu nueva cocina digital! Aquí tienes la guía rápida para aprovechar al máximo las nuevas herramientas.

## 1. Configuración Inicial (Base de Datos)
Antes de empezar, asegúrate de que Yadir haya ejecutado el archivo `smart_kitchen_migration.sql` en Supabase para crear las tablas necesarias.

---

## 2. Flujo de Trabajo Recomendado

### Paso A: Registrar Insumos (🧮 Insumos)
Lo primero es alimentar el sistema con tus ingredientes y sus costos.
- Ve a **Panel Admin > Insumos**.
- Crea ingredientes como:
  - **Nombre:** Harina Trigo Haz de Oros
  - **Precio:** 4500
  - **Presentación:** 1000 g (es decir, el kilo cuesta $4.500)
- **Truco:** Si mañana sube el huevo, solo cambias el precio aquí y **todas** tus recetas se recalcularán solas.

### Paso B: Crear Recetas (📖 Recetario)
Ahora, digitaliza tus cuadernos.
- Ve a **Recetario > Nueva Receta**.
- Ponle nombre (ej: "Torta de Zanahoria") y molde base (ej: 14cm).
- **Agrega ingredientes:** Selecciona del combo y pon la cantidad para esa base.
- Verás el **Costo Total** en la tarjeta superior derecha.

### Paso C: Producción y Ventas
Cuando tengas un pedido:
1. Entra a la receta.
2. Usa el **Slider (Escalador)**: Si la receta es de 8 porciones y te pidieron una torta para 20, mueve el slider a 20.
3. El sistema te dirá exactamente cuántos gramos de harina y huevos necesitas para esas 20 porciones. ¡Cero matemáticas mentales!

### Paso D: Compras de la Semana (🛒 Compras)
Vas al supermercado el lunes:
1. Entra a **Compras**.
2. Selecciona todo lo que vas a hornear:
   - [x] 2 Tortas de Zanahoria (14cm)
   - [x] 1 Red Velvet (20cm)
3. El sistema mezcla todos los ingredientes y te da una **Lista Consolidada**:
   - *"Necesitas 3.5kg de Harina, 48 Huevos y 2 Bloques de Mantequilla"*.
4. Dale al botón **Copiar para WhatsApp** y envíatelo.

---

## 3. Preguntas Frecuentes

**¿Qué pasa si borro un ingrediente?**
El sistema no te dejará borrar un ingrediente si está siendo usado en una receta activa, para proteger tus datos. Primero quítalo de la receta.

**¿Cómo calculo el precio de venta?**
El sistema te da el **Costo de Producción (Materia Prima)**. A eso debes sumarle tu mano de obra, gas, luz y tu ganancia (generalmente multiplicar el costo por 2.5 o 3).

---
*Desarrollado con ❤️ para Victoria Cake.*
