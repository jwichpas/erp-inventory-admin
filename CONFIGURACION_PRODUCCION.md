# Configuración para Producción

Este documento explica cómo cambiar el sistema de datos mock a datos reales de Supabase.

## Estado Actual

El sistema está configurado para usar datos mock para facilitar el desarrollo y testing. Los IDs de empresa actuales son:

- **Empresa Principal**: `550e8400-e29b-41d4-a716-446655440000` (Demo Company)
- **Empresa Secundaria**: `550e8400-e29b-41d4-a716-446655440001` (Empresa Secundaria)

## Pasos para Cambiar a Producción

### 1. Configurar Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto con:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### 2. Actualizar Configuración de la Aplicación

En `src/config/app.ts`, cambiar:

```typescript
export const appConfig = {
  // ...
  useMockAuth: false, // Cambiar a false
  useMockData: false, // Cambiar a false
  // ...
}
```

### 3. Preparar la Base de Datos

Asegurarse de que la base de datos Supabase tenga:

1. **Tablas creadas**: Ejecutar la migración `supabase/migrations/20250101095700_erp_database_sunat_new.sql`
2. **Políticas RLS configuradas**: Las políticas de Row Level Security deben estar activas
3. **Funciones RPC**: Las funciones como `get_user_companies()`, `auth_has_company_access()`, etc.
4. **Datos iniciales**: Al menos una empresa y un usuario con acceso

### 4. Configurar Autenticación

El sistema cambiará automáticamente a usar:

- `supabase.auth.signInWithPassword()` para login
- `supabase.auth.signOut()` para logout
- `supabase.auth.getSession()` para obtener la sesión actual
- `supabase.auth.onAuthStateChange()` para escuchar cambios de autenticación

### 5. Datos de Empresa Reales

Una vez configurado, el sistema:

- Obtendrá las empresas del usuario desde la tabla `user_companies`
- Usará IDs reales de UUID de la base de datos
- Aplicará filtros de `company_id` automáticamente en todas las consultas

## Verificación

Para verificar que todo funciona correctamente:

1. **Login**: Debe funcionar con credenciales reales
2. **Selector de Empresa**: Debe mostrar las empresas reales del usuario
3. **Datos**: Los productos, marcas, categorías deben venir de la base de datos
4. **Filtros**: Los datos deben filtrarse correctamente por empresa

## Rollback a Mock

Si necesitas volver al modo mock:

```typescript
export const appConfig = {
  // ...
  useMockAuth: true,
  useMockData: true,
  // ...
}
```

## Notas Importantes

- Los IDs mock actuales usan formato UUID para facilitar la transición
- El sistema está diseñado para funcionar tanto en modo mock como real
- Todas las consultas incluyen automáticamente el filtro `company_id`
- Las políticas RLS en Supabase deben estar configuradas correctamente
