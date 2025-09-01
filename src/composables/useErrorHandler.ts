import { ref } from 'vue'
import type { PostgrestError } from '@supabase/supabase-js'

export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: Date
  userId?: string
  companyId?: string
}

export const useErrorHandler = () => {
  const error = ref<AppError | null>(null)
  const isLoading = ref(false)

  const handleSupabaseError = (supabaseError: PostgrestError): AppError => {
    const appError: AppError = {
      code: supabaseError.code || 'UNKNOWN_ERROR',
      message: getErrorMessage(supabaseError),
      details: supabaseError.details,
      timestamp: new Date(),
    }

    error.value = appError
    return appError
  }

  const handleGenericError = (err: any): AppError => {
    const appError: AppError = {
      code: err.code || 'GENERIC_ERROR',
      message: err.message || 'Ha ocurrido un error inesperado',
      details: err,
      timestamp: new Date(),
    }

    error.value = appError
    return appError
  }

  const getErrorMessage = (supabaseError: PostgrestError): string => {
    // Map common Supabase errors to user-friendly messages in Spanish
    const errorMessages: Record<string, string> = {
      PGRST116: 'No se encontraron registros',
      PGRST301: 'No tienes permisos para realizar esta acción',
      '23505': 'Ya existe un registro con estos datos',
      '23503': 'No se puede eliminar porque está siendo usado por otros registros',
      '23502': 'Faltan campos obligatorios',
      '42501': 'No tienes permisos suficientes',
      '42P01': 'Tabla o vista no encontrada',
      connection_error: 'Error de conexión con el servidor',
      timeout: 'La operación ha tardado demasiado tiempo',
    }

    return (
      errorMessages[supabaseError.code] ||
      supabaseError.message ||
      'Ha ocurrido un error en la base de datos'
    )
  }

  const clearError = () => {
    error.value = null
  }

  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const showErrorToast = (errorMessage: string) => {
    // This will be implemented when we create the toast system
    console.error('Error:', errorMessage)
  }

  const showSuccessToast = (message: string) => {
    // This will be implemented when we create the toast system
    console.log('Success:', message)
  }

  const handleError = (err: any) => {
    if (err?.code && err?.message) {
      // It's already a Supabase error
      return handleSupabaseError(err)
    } else {
      // Generic error
      return handleGenericError(err)
    }
  }

  return {
    error,
    isLoading,
    handleError,
    handleSupabaseError,
    handleGenericError,
    clearError,
    setLoading,
    showErrorToast,
    showSuccessToast,
  }
}
