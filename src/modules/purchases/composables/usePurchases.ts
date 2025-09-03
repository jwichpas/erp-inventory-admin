// Composable principal que coordina todo el módulo de compras
import { computed, ref } from 'vue'
import { usePurchaseOrders } from './usePurchaseOrders'
import { usePurchaseDocs } from './usePurchaseDocs'
import { useReceptions } from './useReceptions'
import { supabase, supabaseSunat } from '@/lib/supabase'
import type {
  ThreeWayMatchResult,
  PurchasesAnalytics
} from '../types'

export function usePurchases() {
  // Usar los composables individuales
  const ordersComposable = usePurchaseOrders()
  const docsComposable = usePurchaseDocs()
  const receptionsComposable = useReceptions()

  // Estado global del módulo
  const globalLoading = ref(false)
  const globalError = ref<string | null>(null)

  // Computed para estados combinados
  const isLoading = computed(() =>
    globalLoading.value ||
    ordersComposable.loading.value ||
    docsComposable.loading.value ||
    receptionsComposable.loading.value
  )

  const hasError = computed(() =>
    globalError.value ||
    ordersComposable.error.value ||
    docsComposable.error.value ||
    receptionsComposable.error.value
  )

  // ============================================================================
  // FUNCIONES DE CATÁLOGOS Y DATOS MAESTROS
  // ============================================================================

  /**
   * Cargar sucursales desde la base de datos
   */
  const getBranches = async (companyId?: string) => {
    try {
      let query = supabase
        .from('branches')
        .select('id, company_id, code, name, address, created_at')
        .is('deleted_at', null)
        .order('name')

      if (companyId) {
        query = query.eq('company_id', companyId)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error loading branches:', error)
      return []
    }
  }

  /**
   * Cargar monedas desde el catálogo SUNAT usando RPC
   */
  const getCurrencies = async () => {
    try {
      // Usar la función RPC get_currencies
      const { data, error } = await supabase.rpc('get_currencies')

      if (!error && data && data.length > 0) {
        return data.map((currency: any) => ({
          code: currency.code,
          name: currency.descripcion,
          symbol: getCurrencySymbol(currency.code)
        }))
      }
    } catch (error) {
      console.error('Error loading currencies from RPC function:', error)
    }

    // Fallback a monedas principales del catálogo SUNAT
    return [
      { code: 'PEN', name: 'Nuevos Soles', symbol: 'S/' },
      { code: 'USD', name: 'Dólares Americanos', symbol: '$' },
      { code: 'EUR', name: 'Euros', symbol: '€' },
      { code: 'GBP', name: 'Libras Esterlinas', symbol: '£' },
      { code: 'CAD', name: 'Dólares Canadienses', symbol: 'C$' },
      { code: 'JPY', name: 'Yen Japonés', symbol: '¥' },
      { code: 'CHF', name: 'Franco Suizo', symbol: 'CHF' }
    ]
  }

  /**
   * Obtener símbolo de moneda
   */
  const getCurrencySymbol = (code: string): string => {
    const symbols: Record<string, string> = {
      'PEN': 'S/',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'JPY': '¥',
      'CHF': 'CHF',
      'AUD': 'A$',
      'BRL': 'R$'
    }
    return symbols[code] || code
  }

  /**
   * Inicializar catálogo SUNAT de monedas si está vacío
   */
  const initializeSunatCurrencies = async () => {
    try {
      const currencies = [
        { code: 'PEN', descripcion: 'Nuevos Soles' },
        { code: 'USD', descripcion: 'Dólares Americanos' },
        { code: 'EUR', descripcion: 'Euros' },
        { code: 'GBP', descripcion: 'Libras Esterlinas' },
        { code: 'CAD', descripcion: 'Dólares Canadienses' },
        { code: 'JPY', descripcion: 'Yen Japonés' },
        { code: 'CHF', descripcion: 'Franco Suizo' },
        { code: 'AUD', descripcion: 'Dólares Australianos' },
        { code: 'BRL', descripcion: 'Reales Brasileños' }
      ]

      await supabaseSunat
        .from('cat_02_monedas')
        .upsert(currencies, { onConflict: 'code' })

    } catch (error) {
      console.error('Error initializing SUNAT currencies:', error)
    }
  }

  /**
   * Buscar proveedores
   */
  const searchSuppliers = async (search: string, limit = 10) => {
    try {
      let query = supabase
        .from('parties')
        .select('id, doc_type, doc_number, fullname, email, phone, address')
        .eq('is_supplier', true)
        .is('deleted_at', null)
        .limit(limit)

      if (search.trim()) {
        query = query.or(`fullname.ilike.%${search}%,doc_number.ilike.%${search}%`)
      }

      const { data, error } = await query.order('fullname')

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error searching suppliers:', error)
      return []
    }
  }

  /**
   * Buscar productos
   */
  const searchProducts = async (search: string, limit = 10) => {
    try {
      let query = supabase
        .from('products')
        .select('id, sku, name, description, unit_code, active')
        .eq('active', true)
        .limit(limit)

      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`)
      }

      const { data, error } = await query.order('name')

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error searching products:', error)
      return []
    }
  }

  /**
   * Obtener almacenes
   */
  const getWarehouses = async (companyId?: string) => {
    try {
      let query = supabase
        .from('warehouses')
        .select('id, company_id, code, name, branch_id, branches:branch_id(name)')
        .is('deleted_at', null)
        .order('name')

      if (companyId) {
        query = query.eq('company_id', companyId)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(warehouse => ({
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code,
        branch_name: warehouse.branches?.name
      }))
    } catch (error) {
      console.error('Error loading warehouses:', error)
      return []
    }
  }

  /**
   * Obtener tipo de cambio actual (API externa o configuración)
   */
  const getExchangeRate = async (fromCurrency: string, toCurrency: string) => {
    try {
      if (fromCurrency === toCurrency) return 1

      // Consultar la base de datos para obtener el tipo de cambio más reciente
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency_code', fromCurrency)
        .eq('to_currency_code', toCurrency)
        .order('rate_date', { ascending: false }) // Ordenar por fecha descendente
        .limit(1) // Obtener solo el registro más reciente
        .single() // Obtener un solo registro

      if (error) {
        console.error('Error fetching exchange rate from database:', error)

        // Fallback: intentar con el par inverso
        const { data: inverseData, error: inverseError } = await supabase
          .from('exchange_rates')
          .select('rate')
          .eq('from_currency_code', toCurrency)
          .eq('to_currency_code', fromCurrency)
          .order('rate_date', { ascending: false })
          .limit(1)
          .single()

        if (inverseError) {
          console.error('Error fetching inverse exchange rate from database:', inverseError)

          // Fallback final: valores por defecto para pares comunes
          if (fromCurrency === 'USD' && toCurrency === 'PEN') return 3.75
          if (fromCurrency === 'PEN' && toCurrency === 'USD') return 0.267

          console.warn(`No exchange rate found for ${fromCurrency} to ${toCurrency}`)
          return 1
        }

        // Devolver el inverso de la tasa encontrada
        return inverseData.rate ? 1 / inverseData.rate : 1
      }

      return data.rate || 1
    } catch (error) {
      console.error('Error getting exchange rate:', error)

      // Fallback para errores inesperados
      if (fromCurrency === 'USD' && toCurrency === 'PEN') return 3.75
      if (fromCurrency === 'PEN' && toCurrency === 'USD') return 0.267

      return 1
    }
  }

  // ============================================================================
  // FUNCIONES DE INTEGRACIÓN
  // ============================================================================

  /**
   * Realizar coincidencia de tres vías (Three-way matching)
   */
  const performThreeWayMatch = async (
    orderId: string,
    docId?: string,
    receptionId?: string
  ): Promise<ThreeWayMatchResult> => {
    globalLoading.value = true
    globalError.value = null

    try {
      // Obtener datos de la orden
      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          items:purchase_order_items(
            *,
            product:products(id, name)
          )
        `)
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError

      // Obtener documento si se especifica
      let doc = null
      if (docId) {
        const { data: docData, error: docError } = await supabase
          .from('purchase_docs')
          .select(`
            *,
            items:purchase_doc_items(*)
          `)
          .eq('id', docId)
          .single()

        if (docError) throw docError
        doc = docData
      }

      // Obtener recepción si se especifica
      let reception = null
      if (receptionId) {
        const { data: receptionData, error: receptionError } = await supabase
          .from('receptions')
          .select(`
            *,
            items:reception_items(*)
          `)
          .eq('id', receptionId)
          .single()

        if (receptionError) throw receptionError
        reception = receptionData
      }

      // Realizar la lógica de coincidencia
      const variances: ThreeWayMatchResult['variances'] = []
      let status: ThreeWayMatchResult['status'] = 'MATCHED'

      // Comparar cantidades y precios por producto
      for (const orderItem of order.items) {
        const docItem = doc?.items?.find((item: any) => item.product_id === orderItem.product_id)
        const receptionItem = reception?.items?.find((item: any) => item.product_id === orderItem.product_id)

        // Verificar variaciones de cantidad
        if (receptionItem && orderItem.quantity !== receptionItem.quantity_received) {
          variances.push({
            type: 'QUANTITY',
            product_id: orderItem.product_id,
            product_name: orderItem.product.name,
            ordered_qty: orderItem.quantity,
            received_qty: receptionItem.quantity_received,
            invoiced_qty: docItem?.quantity
          })
          status = 'QUANTITY_VARIANCE'
        }

        // Verificar variaciones de precio
        if (docItem && Math.abs(orderItem.unit_price - docItem.unit_cost) > 0.01) {
          variances.push({
            type: 'PRICE',
            product_id: orderItem.product_id,
            product_name: orderItem.product.name,
            ordered_price: orderItem.unit_price,
            invoiced_price: docItem.unit_cost,
            variance_amount: (docItem.unit_cost - orderItem.unit_price) * orderItem.quantity
          })
          if (status === 'MATCHED') status = 'PRICE_VARIANCE'
        }
      }

      return {
        purchase_order_id: orderId,
        purchase_doc_id: docId,
        reception_id: receptionId,
        status,
        variances
      }

    } catch (err) {
      globalError.value = err instanceof Error ? err.message : 'Error en coincidencia de tres vías'
      throw err
    } finally {
      globalLoading.value = false
    }
  }

  /**
   * Generar documento de compra desde una orden
   */
  const generateDocFromOrder = async (orderId: string) => {
    globalLoading.value = true
    globalError.value = null

    try {
      // Obtener datos de la orden
      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          items:purchase_order_items(*)
        `)
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError

      // Crear documento base
      const docData = {
        supplier_id: order.supplier_id,
        doc_type: '01', // Factura por defecto
        series: 'F001', // Serie por defecto
        number: `${Date.now()}`, // Número temporal
        issue_date: new Date().toISOString().split('T')[0],
        currency_code: order.currency_code,
        exchange_rate: order.exchange_rate,
        purchase_order_id: order.id,
        items: order.items.map((item: any) => ({
          product_id: item.product_id,
          description: item.description,
          unit_code: item.unit_code,
          quantity: item.quantity,
          unit_cost: item.unit_price,
          discount_pct: 0,
          igv_affectation: '10' // Operación gravada por defecto
        }))
      }

      return await docsComposable.createDoc(docData)

    } catch (err) {
      globalError.value = err instanceof Error ? err.message : 'Error generando documento'
      throw err
    } finally {
      globalLoading.value = false
    }
  }

  /**
   * Generar recepción desde un documento
   */
  const generateReceptionFromDoc = async (docId: string, warehouseId: string) => {
    try {
      return await receptionsComposable.createFromDoc(docId, { warehouse_id: warehouseId })
    } catch (err) {
      globalError.value = err instanceof Error ? err.message : 'Error generando recepción'
      throw err
    }
  }

  /**
   * Sincronizar estado de orden basado en documentos y recepciones
   */
  const syncOrderStatus = async (orderId: string) => {
    globalLoading.value = true
    globalError.value = null

    try {
      // Obtener documentos relacionados
      const { data: docs } = await supabase
        .from('purchase_docs')
        .select('status')
        .eq('purchase_order_id', orderId)

      // Obtener recepciones relacionadas
      const { data: receptions } = await supabase
        .from('receptions')
        .select('status')
        .eq('purchase_order_id', orderId)

      let newStatus = 'PENDING'

      if (docs && docs.length > 0) {
        const allReceived = docs.every(doc => doc.status === 'RECEIVED')
        const someReceived = docs.some(doc => doc.status === 'RECEIVED' || doc.status === 'PARTIALLY_RECEIVED')

        if (allReceived) {
          newStatus = 'RECEIVED'
        } else if (someReceived) {
          newStatus = 'APPROVED' // En proceso
        }
      }

      // Actualizar estado de la orden
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (updateError) throw updateError

      // Recargar órdenes
      await ordersComposable.loadOrders()

    } catch (err) {
      globalError.value = err instanceof Error ? err.message : 'Error sincronizando estado'
      throw err
    } finally {
      globalLoading.value = false
    }
  }

  // ============================================================================
  // ANALÍTICAS Y REPORTES
  // ============================================================================

  /**
   * Obtener analíticas del período
   */
  const getAnalytics = async (dateFrom: string, dateTo: string): Promise<PurchasesAnalytics> => {
    globalLoading.value = true
    globalError.value = null

    try {
      // Obtener conteos
      const [ordersResult, docsResult, receptionsResult] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select('id, total_amount, currency_code, status', { count: 'exact' })
          .gte('order_date', dateFrom)
          .lte('order_date', dateTo),

        supabase
          .from('purchase_docs')
          .select('id, total, currency_code, status, supplier_id', { count: 'exact' })
          .gte('issue_date', dateFrom)
          .lte('issue_date', dateTo),

        supabase
          .from('receptions')
          .select('id, status', { count: 'exact' })
          .gte('reception_date', dateFrom)
          .lte('reception_date', dateTo)
      ])

      const orders = ordersResult.data || []
      const docs = docsResult.data || []
      const receptions = receptionsResult.data || []

      // Calcular totales
      const totalAmount = docs.reduce((sum, doc) => sum + doc.total, 0)

      // Breakdown por moneda
      const currencyBreakdown = docs.reduce((acc, doc) => {
        const existing = acc.find(item => item.currency_code === doc.currency_code)
        if (existing) {
          existing.amount += doc.total
        } else {
          acc.push({
            currency_code: doc.currency_code,
            amount: doc.total,
            percentage: 0
          })
        }
        return acc
      }, [] as any[])

      // Calcular porcentajes
      currencyBreakdown.forEach(item => {
        item.percentage = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0
      })

      // Breakdown por proveedor (top 10)
      const supplierMap = new Map()
      docs.forEach(doc => {
        const current = supplierMap.get(doc.supplier_id) || 0
        supplierMap.set(doc.supplier_id, current + doc.total)
      })

      const supplierBreakdown = Array.from(supplierMap.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([supplier_id, amount]) => ({
          supplier_id,
          supplier_name: `Proveedor ${supplier_id}`, // TODO: obtener nombre real
          total_amount: amount,
          percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }))

      // Breakdown por estado
      const statusBreakdown = [
        { status: 'PENDING', count: 0, percentage: 0 },
        { status: 'RECEIVED', count: 0, percentage: 0 },
        { status: 'CANCELLED', count: 0, percentage: 0 }
      ]

      docs.forEach(doc => {
        const statusItem = statusBreakdown.find(item => item.status === doc.status)
        if (statusItem) statusItem.count++
      })

      const totalDocs = docs.length
      statusBreakdown.forEach(item => {
        item.percentage = totalDocs > 0 ? (item.count / totalDocs) * 100 : 0
      })

      return {
        period_start: dateFrom,
        period_end: dateTo,
        total_orders: ordersResult.count || 0,
        total_documents: docsResult.count || 0,
        total_receptions: receptionsResult.count || 0,
        total_amount: totalAmount,
        currency_breakdown: currencyBreakdown,
        supplier_breakdown: supplierBreakdown,
        status_breakdown: statusBreakdown
      }

    } catch (err) {
      globalError.value = err instanceof Error ? err.message : 'Error obteniendo analíticas'
      throw err
    } finally {
      globalLoading.value = false
    }
  }

  // ============================================================================
  // UTILIDADES AUXILIARES
  // ============================================================================



  // Limpiar todos los errores
  const clearAllErrors = () => {
    globalError.value = null
    ordersComposable.clearError()
    docsComposable.clearError()
    receptionsComposable.clearError()
  }

  return {
    // Estado global
    isLoading,
    hasError,
    globalError,

    // Composables individuales
    orders: ordersComposable,
    docs: docsComposable,
    receptions: receptionsComposable,

    // Funciones de integración
    performThreeWayMatch,
    generateDocFromOrder,
    generateReceptionFromDoc,
    syncOrderStatus,

    // Analíticas
    getAnalytics,

    // Funciones de catálogos y datos maestros
    getBranches,
    getCurrencies,
    getExchangeRate,

    // Utilidades auxiliares (funciones existentes)
    searchSuppliers,
    searchProducts,
    getWarehouses,
    clearAllErrors
  }
}
