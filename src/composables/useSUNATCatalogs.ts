import { computed } from 'vue'
import { useSupabaseQuery } from './useSupabaseQuery'
import type { SUNATUnitMeasure, SUNATTaxAffectation } from '@/types/database'

export const useSUNATCatalogs = () => {
  const { createRpcQuery } = useSupabaseQuery()

  // Query for unit measures using RPC function
  const {
    data: unitMeasures,
    isLoading: isLoadingUnitMeasures,
    error: unitMeasuresError,
  } = createRpcQuery<SUNATUnitMeasure[]>(
    'get_unit_measures',
    {},
    {
      staleTime: 60 * 60 * 1000, // 1 hour - catalogs don't change often
    },
  )

  // Query for tax affectations using RPC function
  const {
    data: taxAffectations,
    isLoading: isLoadingTaxAffectations,
    error: taxAffectationsError,
  } = createRpcQuery<SUNATTaxAffectation[]>(
    'get_tax_affectations',
    {},
    {
      staleTime: 60 * 60 * 1000, // 1 hour
    },
  )

  // Format options for dropdowns
  const unitMeasureOptions = computed(
    () =>
      unitMeasures.value?.map((unit) => ({
        value: unit.code,
        label: `${unit.code} - ${unit.descripcion}`,
      })) || [],
  )

  const taxAffectationOptions = computed(
    () =>
      taxAffectations.value?.map((tax) => ({
        value: tax.code,
        label: `${tax.code} - ${tax.descripcion}`,
      })) || [],
  )

  // Helper functions to get descriptions
  const getUnitMeasureDescription = (code: string) => {
    return unitMeasures.value?.find((unit) => unit.code === code)?.descripcion || code
  }

  const getTaxAffectationDescription = (code: string) => {
    return taxAffectations.value?.find((tax) => tax.code === code)?.descripcion || code
  }

  const isLoading = computed(() => isLoadingUnitMeasures.value || isLoadingTaxAffectations.value)

  const error = computed(() => unitMeasuresError.value || taxAffectationsError.value)

  return {
    // Raw data
    unitMeasures,
    taxAffectations,

    // Formatted options
    unitMeasureOptions,
    taxAffectationOptions,

    // Loading states
    isLoading,
    isLoadingUnitMeasures,
    isLoadingTaxAffectations,

    // Errors
    error,
    unitMeasuresError,
    taxAffectationsError,

    // Helper functions
    getUnitMeasureDescription,
    getTaxAffectationDescription,
  }
}
