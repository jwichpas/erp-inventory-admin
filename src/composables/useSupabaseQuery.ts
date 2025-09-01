import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/stores/company'
import { useErrorHandler } from './useErrorHandler'
import type { MaybeRef } from 'vue'
import { unref, computed } from 'vue'

export interface QueryOptions {
  enabled?: MaybeRef<boolean>
  staleTime?: number
  gcTime?: number
  refetchOnWindowFocus?: boolean
  select?: (data: any) => any
}

export interface MutationOptions {
  onSuccess?: (data: any, variables: any) => void
  onError?: (error: any, variables: any) => void
  onSettled?: (data: any, error: any, variables: any) => void
}

export const useSupabaseQuery = () => {
  const queryClient = useQueryClient()
  const companyStore = useCompanyStore()
  const { handleSupabaseError, handleGenericError } = useErrorHandler()

  // Base query function for Supabase
  const createQuery = <T = any>(
    queryKey: MaybeRef<(string | number)[]>,
    queryFn: () => Promise<T>,
    options: QueryOptions = {},
  ) => {
    return useQuery({
      queryKey: computed(() => {
        const key = unref(queryKey)
        const companyId = companyStore.currentCompanyId
        return companyId ? [...key, companyId] : key
      }),
      queryFn: async () => {
        try {
          return await queryFn()
        } catch (error: any) {
          if (error.code) {
            throw handleSupabaseError(error)
          } else {
            throw handleGenericError(error)
          }
        }
      },
      enabled: computed(() => {
        const enabled = options.enabled ? unref(options.enabled) : true
        return enabled && !!companyStore.currentCompanyId
      }),
      staleTime: options.staleTime,
      gcTime: options.gcTime,
      refetchOnWindowFocus: options.refetchOnWindowFocus,
      select: options.select,
    })
  }

  // Base mutation function for Supabase
  const createMutation = <TData = any, TVariables = any>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    options: MutationOptions = {},
  ) => {
    return useMutation({
      mutationFn: async (variables: TVariables) => {
        try {
          return await mutationFn(variables)
        } catch (error: any) {
          if (error.code) {
            throw handleSupabaseError(error)
          } else {
            throw handleGenericError(error)
          }
        }
      },
      onSuccess: options.onSuccess,
      onError: options.onError,
      onSettled: options.onSettled,
    })
  }

  // Generic CRUD operations
  const createSelectQuery = <T = any>(
    table: string,
    select: string = '*',
    filters?: MaybeRef<Record<string, any>>,
    options: QueryOptions = {},
  ) => {
    return createQuery(
      computed(() => [table, 'select', select, unref(filters)]),
      async () => {
        let query = supabase.from(table).select(select)
        const resolvedFilters = unref(filters)

        // Add company filter if not explicitly disabled
        if (companyStore.currentCompanyId && !resolvedFilters?.skipCompanyFilter) {
          query = query.eq('company_id', companyStore.currentCompanyId)
        }

        // Apply additional filters
        if (resolvedFilters) {
          Object.entries(resolvedFilters).forEach(([key, value]) => {
            if (key !== 'skipCompanyFilter' && value !== undefined && value !== null) {
              // Handle PostgREST filter syntax
              if (typeof value === 'string' && value.includes('.')) {
                const [operator, filterValue] = value.split('.')
                switch (operator) {
                  case 'eq':
                    query = query.eq(key, filterValue)
                    break
                  case 'neq':
                    query = query.neq(key, filterValue)
                    break
                  case 'gt':
                    query = query.gt(key, filterValue)
                    break
                  case 'gte':
                    query = query.gte(key, filterValue)
                    break
                  case 'lt':
                    query = query.lt(key, filterValue)
                    break
                  case 'lte':
                    query = query.lte(key, filterValue)
                    break
                  case 'like':
                    query = query.like(key, filterValue)
                    break
                  case 'ilike':
                    query = query.ilike(key, filterValue)
                    break
                  case 'in':
                    query = query.in(key, filterValue.split(','))
                    break
                  default:
                    query = query.eq(key, value)
                }
              } else if (key === 'or') {
                // Handle OR queries
                query = query.or(value)
              } else {
                // Default equality filter
                query = query.eq(key, value)
              }
            }
          })
        }

        const { data, error } = await query
        if (error) throw error
        return data as T[]
      },
      options,
    )
  }

  const createInsertMutation = <T = any>(table: string, options: MutationOptions = {}) => {
    return createMutation(
      async (data: Partial<T>) => {
        // Add company_id if not present and we have a current company
        const insertData = {
          ...data,
          ...(companyStore.currentCompanyId && !data.hasOwnProperty('company_id')
            ? { company_id: companyStore.currentCompanyId }
            : {}),
        }

        const { data: result, error } = await supabase
          .from(table)
          .insert(insertData)
          .select()
          .single()

        if (error) throw error
        return result
      },
      {
        ...options,
        onSuccess: (data, variables) => {
          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: [table] })
          options.onSuccess?.(data, variables)
        },
      },
    )
  }

  const createUpdateMutation = <T = any>(table: string, options: MutationOptions = {}) => {
    return createMutation(
      async ({ id, data }: { id: string; data: Partial<T> }) => {
        const { data: result, error } = await supabase
          .from(table)
          .update(data)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        return result
      },
      {
        ...options,
        onSuccess: (data, variables) => {
          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: [table] })
          options.onSuccess?.(data, variables)
        },
      },
    )
  }

  const createDeleteMutation = (table: string, options: MutationOptions = {}) => {
    return createMutation(
      async (id: string) => {
        const { error } = await supabase.from(table).delete().eq('id', id)

        if (error) throw error
        return { id }
      },
      {
        ...options,
        onSuccess: (data, variables) => {
          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: [table] })
          options.onSuccess?.(data, variables)
        },
      },
    )
  }

  // RPC function wrapper
  const createRpcQuery = <T = any>(
    functionName: string,
    params?: Record<string, any>,
    options: QueryOptions = {},
  ) => {
    return createQuery(
      ['rpc', functionName, params || {}],
      async () => {
        const { data, error } = await supabase.rpc(functionName, params)
        if (error) throw error
        return data as T
      },
      options,
    )
  }

  const createRpcMutation = <TData = any, TVariables = any>(
    functionName: string,
    options: MutationOptions = {},
  ) => {
    return createMutation(async (params: TVariables) => {
      const { data, error } = await supabase.rpc(functionName, params as any)
      if (error) throw error
      return data as TData
    }, options)
  }

  return {
    createQuery,
    createMutation,
    createSelectQuery,
    createInsertMutation,
    createUpdateMutation,
    createDeleteMutation,
    createRpcQuery,
    createRpcMutation,
    queryClient,
  }
}
