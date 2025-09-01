# erp-inventory-admin

Sistema ERP para gestión de inventario, ventas y almacenes, desarrollado con Vue 3, Vite y Supabase.

## Características principales

- Gestión de productos, categorías y marcas
- Control de inventario y movimientos de stock
- Panel de dashboard con métricas y alertas
- Gestión de usuarios y autenticación
- Integración con Supabase para base de datos y autenticación
- Visualización 3D de almacenes
- Pruebas unitarias con Vitest
- Linting con ESLint

## Requisitos

- Node.js >= 18
- npm >= 9
- Supabase CLI (opcional para desarrollo local)

## Instalación

```sh
npm install
```

## Uso en desarrollo

```sh
npm run dev
```

## Compilar y minificar para producción

```sh
npm run build
```

## Ejecutar pruebas unitarias

```sh
npm run test:unit
```

## Linting

```sh
npm run lint
```

## Configuración de Supabase

Para inicializar la base de datos local y aplicar migraciones:

```sh
npx supabase db reset
```

## Documentación

- [Vite Configuration Reference](https://vite.dev/config/)
- [Vue 3](https://vuejs.org/)
- [Supabase](https://supabase.com/)
- [Vitest](https://vitest.dev/)
- [ESLint](https://eslint.org/)

## IDE recomendado

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (desactivar Vetur).

## Soporte de tipos para `.vue` en TypeScript

TypeScript no maneja tipos para `.vue` por defecto, por lo que se recomienda usar `vue-tsc` y Volar.

---

> Proyecto ERP Inventory Admin - Septiembre 2025
