import { ref, computed, readonly } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/stores/company'
import { useToast } from '@/composables/useToast'
import type { POSCustomer } from '@/types/pos'
import { quickCustomerSchema } from '@/schemas/posSchemas'

export const usePOSCustomers = () => {
  const companyStore = useCompanyStore()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const searchQuery = ref('')

  // Search customers
  const { data: customers, isLoading: isSearchingCustomers } = useQuery({
    queryKey: ['pos-customers', companyStore.currentCompany?.id, searchQuery],
    queryFn: async () => {
      if (!companyStore.currentCompany?.id) return []

      let query = supabase
        .from('parties')
        .select('id, doc_type, doc_number, fullname, email, phone, address')
        .eq('company_id', companyStore.currentCompany.id)
        .eq('is_customer', true)
        .is('deleted_at', null)
        .order('fullname')
        .limit(50)

      if (searchQuery.value.trim()) {
        query = query.or(
          `fullname.ilike.%${searchQuery.value}%,doc_number.ilike.%${searchQuery.value}%`,
        )
      }

      const { data, error } = await query

      if (error) {
        console.error('Error searching customers:', error)
        return []
      }

      return (
        (data?.map((customer) => ({
          id: customer.id,
          documentType: customer.doc_type,
          documentNumber: customer.doc_number,
          name: customer.fullname || 'Cliente Sin Nombre',
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          isFrequent: true, // All existing customers are considered frequent
        })) as POSCustomer[]) || []
      )
    },
    enabled: computed(() => !!companyStore.currentCompany?.id),
    staleTime: 60000, // 1 minute
  })

  // Get frequent customers (most recent or most purchases)
  const { data: frequentCustomers } = useQuery({
    queryKey: ['pos-frequent-customers', companyStore.currentCompany?.id],
    queryFn: async () => {
      if (!companyStore.currentCompany?.id) return []

      const { data, error } = await supabase
        .from('parties')
        .select(
          `
          id,
          doc_type,
          doc_number,
          fullname,
          email,
          phone,
          address,
          sales_docs(id)
        `,
        )
        .eq('company_id', companyStore.currentCompany.id)
        .eq('is_customer', true)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching frequent customers:', error)
        return []
      }

      return (
        (data?.map((customer) => ({
          id: customer.id,
          documentType: customer.doc_type,
          documentNumber: customer.doc_number,
          name: customer.fullname || 'Cliente Sin Nombre',
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          isFrequent: true,
        })) as POSCustomer[]) || []
      )
    },
    enabled: computed(() => !!companyStore.currentCompany?.id),
  })

  // Create quick customer mutation
  const createQuickCustomerMutation = useMutation({
    mutationFn: async (customerData: {
      documentType: string
      documentNumber: string
      name: string
      email?: string
      phone?: string
      address?: string
    }) => {
      if (!companyStore.currentCompany?.id) {
        throw new Error('Empresa no válida')
      }

      // Validate customer data
      const validatedData = quickCustomerSchema.parse(customerData)

      // Check if customer already exists
      const { data: existingCustomer } = await supabase
        .from('parties')
        .select('id')
        .eq('company_id', companyStore.currentCompany.id)
        .eq('doc_number', validatedData.documentNumber)
        .eq('is_customer', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (existingCustomer) {
        throw new Error('Ya existe un cliente con este número de documento')
      }

      // Create new customer
      const { data, error } = await supabase
        .from('parties')
        .insert({
          company_id: companyStore.currentCompany.id,
          doc_type: validatedData.documentType,
          doc_number: validatedData.documentNumber,
          fullname: validatedData.name,
          email: validatedData.email || null,
          phone: validatedData.phone || null,
          address: validatedData.address || null,
          is_customer: true,
          is_supplier: false,
        })
        .select()
        .single()

      if (error) throw error

      return {
        id: data.id,
        documentType: data.doc_type,
        documentNumber: data.doc_number,
        name: data.fullname,
        email: data.email,
        phone: data.phone,
        address: data.address,
        isFrequent: false,
      } as POSCustomer
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pos-customers'] })
      queryClient.invalidateQueries({ queryKey: ['pos-frequent-customers'] })
      showToast(`Cliente ${data.name} creado exitosamente`, 'success')
    },
    onError: (error: any) => {
      console.error('Error creating customer:', error)
      showToast(error.message || 'Error al crear cliente', 'error')
    },
  })

  // Get default customer (for cash sales without specific customer)
  const { data: defaultCustomer } = useQuery({
    queryKey: ['pos-default-customer', companyStore.currentCompany?.id],
    queryFn: async () => {
      if (!companyStore.currentCompany?.id) return null

      const { data, error } = await supabase
        .from('parties')
        .select('id, doc_type, doc_number, fullname, email, phone, address')
        .eq('company_id', companyStore.currentCompany.id)
        .eq('doc_number', '00000000') // Default customer document number
        .eq('is_customer', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        // Create default customer if it doesn't exist
        const { data: newDefault, error: createError } = await supabase
          .from('parties')
          .insert({
            company_id: companyStore.currentCompany.id,
            doc_type: '1',
            doc_number: '00000000',
            fullname: 'Cliente General',
            is_customer: true,
            is_supplier: false,
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating default customer:', createError)
          return null
        }

        return {
          id: newDefault.id,
          documentType: newDefault.doc_type,
          documentNumber: newDefault.doc_number,
          name: newDefault.fullname,
          email: newDefault.email,
          phone: newDefault.phone,
          address: newDefault.address,
          isFrequent: false,
        } as POSCustomer
      }

      return {
        id: data.id,
        documentType: data.doc_type,
        documentNumber: data.doc_number,
        name: data.fullname || 'Cliente General',
        email: data.email,
        phone: data.phone,
        address: data.address,
        isFrequent: false,
      } as POSCustomer
    },
    enabled: computed(() => !!companyStore.currentCompany?.id),
  })

  const createQuickCustomer = (customerData: {
    documentType: string
    documentNumber: string
    name: string
    email?: string
    phone?: string
    address?: string
  }) => {
    return createQuickCustomerMutation.mutateAsync(customerData)
  }

  return {
    // State
    searchQuery,

    // Data
    customers: readonly(customers),
    frequentCustomers: readonly(frequentCustomers),
    defaultCustomer: readonly(defaultCustomer),

    // Loading states
    isSearchingCustomers: readonly(isSearchingCustomers),
    isCreatingCustomer: computed(() => createQuickCustomerMutation.isPending),

    // Methods
    createQuickCustomer,
  }
}
