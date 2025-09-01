# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server (runs on port 4525)
- `npm run build` - Build for production with type checking
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking only
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run test:unit` - Run unit tests with Vitest

### Build Commands
- `npm run build-only` - Build without type checking (faster)
- `npm install` - Install dependencies

## Project Architecture

### Technology Stack
- **Frontend**: Vue 3 with TypeScript, Composition API
- **Build Tool**: Vite with Rolldown (experimental fast bundler)
- **Styling**: Tailwind CSS v4.x with integrated Vite plugin
- **State Management**: Pinia stores with composables pattern
- **Authentication**: Supabase Auth with mock mode for development
- **Data Fetching**: TanStack Vue Query for caching and server state
- **UI Components**: Headless UI, Lucide icons, ApexCharts
- **Testing**: Vitest + Vue Test Utils
- **Type Safety**: Full TypeScript with strict configuration

### Application Structure

#### Core Architecture
The app follows a multi-tenant ERP structure with company-based access control:

- **Authentication Flow**: Supports both real Supabase auth and mock auth mode (configurable in `src/config/app.ts`)
- **Multi-Company Support**: Users can belong to multiple companies with different roles/permissions
- **Permission-Based Access**: Route-level permissions using guards (`requireAuth`, `requireCompanyAccess`, `requirePermission`)
- **Layout System**: Three main layouts - `AppLayout` (main app), `AuthLayout` (login/register), error layouts

#### State Management Pattern
Uses Pinia with composition API pattern:
- `useAuthStore` - Handles authentication, user sessions, company selection
- `useCompanyStore` - Company-specific data and operations
- Base store pattern in `src/stores/base.ts` for common store functionality
- Store initialization in `src/main.ts` with error handling

#### Routing & Guards
Complex routing system with multiple guard levels:
- Global router guard waits for auth initialization
- Route-specific guards: `requireAuth`, `requireCompanyAccess`, `requirePermission`
- Company selection flow: unauthenticated → login → company-select → main app
- Permission system integrated with route metadata

#### Configuration System
- **Mock Mode**: Set `useMockAuth: true` in `src/config/app.ts` for development without backend
- **Environment Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` for real Supabase connection
- **Feature Flags**: Configurable features like multi-company, real-time updates, file uploads

### Key Directories
- `src/stores/` - Pinia state management with auth and company stores
- `src/layouts/` - Layout components (AppLayout, AuthLayout)
- `src/views/` - Page components organized by module (auth/, inventory/, sales/, etc.)
- `src/components/` - Reusable components organized by type (ui/, common/, auth/, etc.)
- `src/composables/` - Vue composition functions and hooks
- `src/types/` - TypeScript type definitions
- `src/plugins/` - Vue plugins configuration (Vue Query setup)
- `src/config/` - Application configuration and feature flags
- `supabase/` - Database migrations and types

### Development Notes

#### Mock vs Real Data Mode
- Toggle between mock and real Supabase data using `src/config/app.ts`
- Mock mode provides demo companies and permissions for rapid development
- Real mode requires proper Supabase setup and database tables

#### Authentication States
The app handles complex auth initialization:
- App waits for auth store initialization before mounting
- Router guards wait for auth loading to complete
- Support for both authenticated and company-selected states

#### Permission System
- Role-based permissions stored per company association
- Route-level permission checking with `requirePermission('permission.name')` guard
- Permission helpers available in auth store: `hasPermission(permission)`

#### Company Selection Flow
Users may belong to multiple companies - the app enforces company selection:
1. Login → Company selection (if multiple companies) → Main app
2. Company context persisted in localStorage
3. All protected routes require company selection

### Development Workflow
1. Start with `npm run dev` (runs on localhost:4525)
2. Use mock mode initially for rapid development
3. Run `npm run type-check` and `npm run lint` before committing
4. Use `npm run test:unit` for unit testing
5. Switch to real Supabase mode when backend is ready