// Composable para gestión de recepciones de mercancía
import { ref, computed, reactive } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
  Reception,
  ReceptionListItem,
  ReceptionFormData,
  ReceptionFilters
} from '../types'

export function useReceptions() {
  // Estado reactivo
  const receptions = ref<ReceptionListItem[]>([])
  const currentReception = ref<Reception | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Filtros y paginación
  const filters = reactive<ReceptionFilters>({
    page: 1,
    limit: 20,
    sort_by: 'reception_date',
    sort_direction: 'desc'
  })
  
  const pagination = reactive({
    page: 1,
    limit: 20,
    total: 0,
    hasNext: false,
    hasPrevious: false
  })

  // Computed properties
  const hasReceptions = computed(() => receptions.value.length > 0)
  const isEmpty = computed(() => !loading.value && !hasReceptions.value)
  const totalPages = computed(() => Math.ceil(pagination.total / (filters.limit || 20)))
  
  // ============================================================================
  // FUNCIONES PRINCIPALES
  // ============================================================================
  
  /**
   * Cargar lista de recepciones
   */
  const loadReceptions = async (newFilters?: Partial<ReceptionFilters>) => {
    loading.value = true
    error.value = null
    
    try {
      // Aplicar nuevos filtros si se proporcionan
      if (newFilters) {
        Object.assign(filters, newFilters)
      }
      
      let query = supabase
        .from('receptions')
        .select(`
          id,
          reception_date,
          status,
          doc_reference,
          created_at,
          warehouse:warehouses!warehouse_id(
            id,
            name
          ),
          supplier:parties!supplier_id(
            id,
            fullname
          ),
          purchase_doc:purchase_docs!purchase_doc_id(
            id,
            doc_type,
            series,
            number
          ),
          items:reception_items(id)
        `, { count: 'exact' })
      
      // Aplicar filtros
      if (filters.warehouse_id) {
        query = query.eq('warehouse_id', filters.warehouse_id)
      }
      
      if (filters.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id)
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters.date_from) {
        query = query.gte('reception_date', filters.date_from)
      }
      
      if (filters.date_to) {
        query = query.lte('reception_date', filters.date_to)
      }
      
      if (filters.search) {
        query = query.or(`doc_reference.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`)
      }
      
      // Ordenamiento
      const sortBy = filters.sort_by || 'reception_date'
      const sortDirection = filters.sort_direction || 'desc'
      query = query.order(sortBy, { ascending: sortDirection === 'asc' })
      
      // Paginación
      const page = filters.page || 1
      const limit = filters.limit || 20
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)
      
      const { data, error: queryError, count } = await query
      
      if (queryError) throw queryError
      
      // Para cada recepción, calcular cantidad total
      const receptionIds = data?.map(r => r.id) || []
      let quantitiesMap: Record<string, number> = {}
      
      if (receptionIds.length > 0) {
        const { data: quantities } = await supabase
          .from('reception_items')
          .select('reception_id, quantity_received')
          .in('reception_id', receptionIds)
        
        quantitiesMap = (quantities || []).reduce((acc, item) => {
          acc[item.reception_id] = (acc[item.reception_id] || 0) + item.quantity_received
          return acc
        }, {} as Record<string, number>)
      }
      
      // Transformar datos para la vista de lista
      receptions.value = (data || []).map((reception: any) => ({
        id: reception.id,
        reception_number: `REC-${reception.id.slice(-8).toUpperCase()}`,
        supplier_name: reception.supplier?.fullname || 'Sin proveedor',
        warehouse_name: reception.warehouse?.name || 'Sin almacén',
        reception_date: reception.reception_date,
        status: reception.status,
        items_count: reception.items?.length || 0,
        total_qty: quantitiesMap[reception.id] || 0,
        doc_reference: reception.purchase_doc 
          ? `${reception.purchase_doc.doc_type}-${reception.purchase_doc.series}-${reception.purchase_doc.number}`
          : reception.doc_reference || 'Sin referencia',
        can_edit: reception.status !== 'COMPLETE'
      }))
      
      // Actualizar paginación
      pagination.total = count || 0
      pagination.hasNext = (page * limit) < (count || 0)
      pagination.hasPrevious = page > 1
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error cargando recepciones'
      console.error('Error loading receptions:', err)
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Cargar una recepción específica
   */
  const loadReception = async (id: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: queryError } = await supabase
        .from('receptions')
        .select(`
          *,
          warehouse:warehouses!warehouse_id(
            id,
            name,
            code
          ),
          supplier:parties!supplier_id(
            id,
            fullname,
            doc_type,
            doc_number,
            email,
            phone,
            address
          ),
          purchase_doc:purchase_docs!purchase_doc_id(
            id,
            doc_type,
            series,
            number,
            issue_date,
            supplier:parties!supplier_id(fullname)
          ),
          purchase_order:purchase_orders!purchase_order_id(
            id,
            order_date,
            status
          ),
          items:reception_items(
            *,
            product:products(
              id,
              sku,
              name,
              unit_code,
              description
            )
          )
        `)
        .eq('id', id)
        .single()
      
      if (queryError) throw queryError
      
      currentReception.value = data as Reception
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error cargando recepción'
      console.error('Error loading reception:', err)
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Crear nueva recepción
   */
  const createReception = async (formData: ReceptionFormData): Promise<Reception> => {
    loading.value = true
    error.value = null
    
    try {
      // Crear la recepción
      const { data: reception, error: receptionError } = await supabase
        .from('receptions')
        .insert({
          purchase_doc_id: formData.purchase_doc_id,
          supplier_id: formData.supplier_id,
          warehouse_id: formData.warehouse_id,
          reception_date: formData.reception_date,
          doc_reference: formData.doc_reference,
          status: 'COMPLETE', // Por defecto completo
          notes: formData.notes
        })
        .select()
        .single()
      
      if (receptionError) throw receptionError
      
      // Crear los items
      const receptionItems = formData.items.map(item => ({
        reception_id: reception.id,
        product_id: item.product_id,
        quantity_received: item.quantity_received,
        quality_notes: item.quality_notes,
        batch_number: item.batch_number,
        expiration_date: item.expiration_date
      }))
      
      const { error: itemsError } = await supabase
        .from('reception_items')
        .insert(receptionItems)
      
      if (itemsError) throw itemsError
      
      // Recargar la lista
      await loadReceptions()
      
      return reception as Reception
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error creando recepción'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Actualizar recepción
   */
  const updateReception = async (id: string, formData: Partial<ReceptionFormData>) => {
    loading.value = true
    error.value = null
    
    try {
      const { items, ...receptionData } = formData
      
      // Actualizar la recepción
      const { error: receptionError } = await supabase
        .from('receptions')
        .update(receptionData)
        .eq('id', id)
      
      if (receptionError) throw receptionError
      
      // Actualizar items si se proporcionan
      if (items) {
        // Eliminar items existentes
        await supabase
          .from('reception_items')
          .delete()
          .eq('reception_id', id)
        
        // Insertar nuevos items
        if (items.length > 0) {
          const receptionItems = items.map(item => ({
            reception_id: id,
            product_id: item.product_id,
            quantity_received: item.quantity_received,
            quality_notes: item.quality_notes,
            batch_number: item.batch_number,
            expiration_date: item.expiration_date
          }))
          
          const { error: itemsError } = await supabase
            .from('reception_items')
            .insert(receptionItems)
          
          if (itemsError) throw itemsError
        }
      }
      
      // Recargar datos
      await Promise.all([
        loadReceptions(),
        currentReception.value ? loadReception(id) : Promise.resolve()
      ])
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error actualizando recepción'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Eliminar recepción
   */
  const deleteReception = async (id: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { error: deleteError } = await supabase
        .from('receptions')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      
      // Recargar la lista
      await loadReceptions()
      
      // Limpiar recepción actual si es la que se eliminó
      if (currentReception.value?.id === id) {
        currentReception.value = null
      }
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error eliminando recepción'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  // ============================================================================
  // ACCIONES DE ESTADO
  // ============================================================================
  
  /**
   * Aprobar recepción
   */
  const approveReception = async (id: string, notes?: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { error: updateError } = await supabase
        .from('receptions')
        .update({ 
          status: 'COMPLETE',
          notes: notes ? `${notes}\n\n[APROBADA]` : '[APROBADA]'
        })
        .eq('id', id)
      
      if (updateError) throw updateError
      
      await loadReceptions()
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error aprobando recepción'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Rechazar recepción
   */
  const rejectReception = async (id: string, reason: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { error: updateError } = await supabase
        .from('receptions')
        .update({ 
          status: 'REJECTED',
          notes: `[RECHAZADA] ${reason}`
        })
        .eq('id', id)
      
      if (updateError) throw updateError
      
      await loadReceptions()
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error rechazando recepción'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  // ============================================================================
  // UTILIDADES ESPECIALIZADAS
  // ============================================================================
  
  /**
   * Crear recepción desde un documento de compra
   */
  const createFromDoc = async (docId: string, additionalData?: Partial<ReceptionFormData>) => {
    loading.value = true
    error.value = null
    
    try {
      // Obtener datos del documento
      const { data: doc, error: docError } = await supabase
        .from('purchase_docs')
        .select(`
          *,
          items:purchase_doc_items(
            *,
            product:products(id, sku, name, unit_code)
          )
        `)
        .eq('id', docId)
        .single()
      
      if (docError) throw docError
      
      // Preparar datos de la recepción
      const formData: ReceptionFormData = {
        purchase_doc_id: doc.id,
        supplier_id: doc.supplier_id,
        warehouse_id: '', // Debe ser proporcionado
        reception_date: new Date().toISOString().split('T')[0],
        doc_reference: `${doc.doc_type}-${doc.series}-${doc.number}`,
        notes: `Recepción generada desde documento ${doc.series}-${doc.number}`,
        items: doc.items.map((item: any) => ({
          product_id: item.product_id,
          quantity_received: item.quantity, // Cantidad completa por defecto
          quality_notes: '',
          batch_number: '',
          expiration_date: ''
        })),
        ...additionalData
      }
      
      return await createReception(formData)
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error creando recepción desde documento'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Obtener recepciones por documento
   */
  const getByDocument = async (docId: string): Promise<Reception[]> => {
    try {
      const { data, error } = await supabase
        .from('receptions')
        .select(`
          *,
          warehouse:warehouses(id, name),
          items:reception_items(
            *,
            product:products(id, sku, name)
          )
        `)
        .eq('purchase_doc_id', docId)
        .order('reception_date', { ascending: false })
      
      if (error) throw error
      
      return data as Reception[]
      
    } catch (err) {
      console.error('Error loading receptions for document:', err)
      return []
    }
  }
  
  /**
   * Duplicar recepción
   */
  const duplicateReception = async (originalId: string, newData?: Partial<ReceptionFormData>) => {
    loading.value = true
    error.value = null
    
    try {
      const original = await loadReception(originalId)
      if (!currentReception.value) throw new Error('No se pudo cargar la recepción original')
      
      const formData: ReceptionFormData = {
        purchase_doc_id: currentReception.value.purchase_doc_id,
        supplier_id: currentReception.value.supplier_id,
        warehouse_id: currentReception.value.warehouse_id,
        reception_date: new Date().toISOString().split('T')[0],
        doc_reference: currentReception.value.doc_reference,
        notes: `Duplicado de REC-${originalId.slice(-8).toUpperCase()}`,
        items: currentReception.value.items?.map(item => ({
          product_id: item.product_id,
          quantity_received: item.quantity_received,
          quality_notes: item.quality_notes,
          batch_number: item.batch_number,
          expiration_date: item.expiration_date
        })) || [],
        ...newData
      }
      
      return await createReception(formData)
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error duplicando recepción'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  // ============================================================================
  // UTILIDADES
  // ============================================================================
  
  const refreshReceptions = () => loadReceptions()
  const clearError = () => { error.value = null }
  const clearCurrentReception = () => { currentReception.value = null }
  
  // Cambiar página
  const changePage = (page: number) => {
    filters.page = page
    loadReceptions()
  }
  
  // Aplicar filtros
  const applyFilters = (newFilters: Partial<ReceptionFilters>) => {
    filters.page = 1 // Reset a primera página
    loadReceptions(newFilters)
  }
  
  return {
    // Estado
    receptions,
    currentReception,
    loading,
    error,
    filters,
    pagination,
    
    // Computed
    hasReceptions,
    isEmpty,
    totalPages,
    
    // Acciones principales
    loadReceptions,
    loadReception,
    createReception,
    updateReception,
    deleteReception,
    
    // Acciones de estado
    approveReception,
    rejectReception,
    
    // Utilidades especializadas
    createFromDoc,
    getByDocument,
    duplicateReception,
    
    // Utilidades
    refreshReceptions,
    clearError,
    clearCurrentReception,
    changePage,
    applyFilters
  }
}