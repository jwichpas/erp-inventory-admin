import { computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/stores/company'
import { useToast } from '@/composables/useToast'
import type { POSSale, POSCartItem, POSPayment, POSCustomer, ReceiptData, POSSaleResult } from '@/types/pos'
import { posSaleSchema } from '@/schemas/posSchemas'

export const usePOSSales = () => {
  const companyStore = useCompanyStore()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // Complete sale mutation - Using optimized SQL function
  const completeSaleMutation = useMutation({
    mutationFn: async (params: {
      sessionId: string
      customerId: string
      items: POSCartItem[]
      payments: POSPayment[]
      notes?: string
    }) => {
      if (!companyStore.currentCompany?.id) {
        throw new Error('Empresa no válida')
      }

      // Validate sale data using schema
      const subtotal = params.items.reduce((sum, item) => sum + item.subtotal, 0)
      const taxAmount = params.items.reduce(
        (sum, item) => sum + (item.subtotal * item.taxRate) / 100,
        0,
      )
      const discountAmount = params.items.reduce(
        (sum, item) => sum + (item.subtotal * item.discount) / 100,
        0,
      )
      const total = subtotal + taxAmount - discountAmount

      const saleData = posSaleSchema.parse({
        customerId: params.customerId,
        items: params.items,
        payments: params.payments,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        notes: params.notes,
      })

      // Transform items to format expected by SQL function
      const cartItems = params.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount: item.discount,
      }))

      const payments = params.payments.map((payment) => ({
        type: payment.type,
        amount: payment.amount,
        reference: payment.reference || null,
        card_type: payment.cardType || null,
        auth_code: payment.authCode || null,
      }))

      // Use the optimized SQL function for processing POS sales
      const { data: result, error } = await supabase.rpc('process_pos_sale', {
        p_session_id: params.sessionId,
        p_customer_id: params.customerId,
        p_cart_items: cartItems,
        p_payments: payments,
        p_notes: params.notes || null,
      }) as { data: POSSaleResult | null; error: any }

      if (error) {
        console.error('Error processing POS sale:', error)
        throw new Error(error.message || 'Error al procesar la venta')
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Error al procesar la venta')
      }

      // Return formatted sale data
      return {
        id: result.sales_doc_id,
        sessionId: params.sessionId,
        customerId: params.customerId,
        docType: '03',
        series: 'B001',
        number: result.document_number?.replace('B001-', '') || '',
        saleDate: new Date(),
        items: params.items,
        payments: params.payments,
        subtotal: saleData.subtotal,
        taxAmount: saleData.taxAmount,
        discountAmount: saleData.discountAmount,
        total: saleData.total,
        status: 'COMPLETED',
        notes: params.notes,
      } as POSSale
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pos-session-stats'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] })
      showToast(`Venta ${data.series}-${data.number} completada exitosamente`, 'success')
    },
    onError: (error) => {
      console.error('Error completing sale:', error)
      showToast('Error al completar la venta', 'error')
    },
  })

  // Generate receipt data
  const generateReceiptData = async (
    sale: POSSale,
    customer: POSCustomer,
  ): Promise<ReceiptData> => {
    // Get company data
    const { data: company } = await supabase
      .from('companies')
      .select('legal_name, ruc, address, phone')
      .eq('id', companyStore.currentCompany?.id)
      .single()

    // Generate QR code data (for electronic invoicing)
    const qrData = `${company?.ruc}|${sale.docType}|${sale.series}|${sale.number}|${sale.taxAmount}|${sale.total}|${sale.saleDate.toISOString().split('T')[0]}|${customer.documentType}|${customer.documentNumber}`

    return {
      sale,
      customer,
      company: {
        name: company?.legal_name || '',
        ruc: company?.ruc || '',
        address: company?.address || '',
        phone: company?.phone,
      },
      qrCode: qrData,
    }
  }

  // Print receipt
  const printReceipt = async (receiptData: ReceiptData) => {
    try {
      // For thermal printer integration
      if ('bluetooth' in navigator) {
        // Bluetooth thermal printer logic would go here
        console.log('Printing to thermal printer...', receiptData)
      }

      // Fallback to browser print
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(generateReceiptHTML(receiptData))
        printWindow.document.close()
        printWindow.print()
      }

      showToast('Recibo enviado a impresora', 'success')
    } catch (error) {
      console.error('Error printing receipt:', error)
      showToast('Error al imprimir recibo', 'error')
    }
  }

  // Generate receipt HTML for printing
  const generateReceiptHTML = (receiptData: ReceiptData): string => {
    const { sale, customer, company } = receiptData

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Recibo de Venta</title>
        <style>
          body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; }
          .header { text-align: center; margin-bottom: 10px; }
          .company-name { font-weight: bold; font-size: 14px; }
          .line { border-bottom: 1px dashed #000; margin: 5px 0; }
          .item { display: flex; justify-content: space-between; }
          .total { font-weight: bold; font-size: 14px; }
          .footer { text-align: center; margin-top: 10px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${company.name}</div>
          <div>RUC: ${company.ruc}</div>
          <div>${company.address}</div>
          ${company.phone ? `<div>Tel: ${company.phone}</div>` : ''}
        </div>

        <div class="line"></div>

        <div>
          <div><strong>${sale.docType} ${sale.series}-${sale.number}</strong></div>
          <div>Fecha: ${new Date(sale.saleDate).toLocaleString()}</div>
          <div>Cliente: ${customer.name}</div>
          <div>${customer.documentType}: ${customer.documentNumber}</div>
        </div>

        <div class="line"></div>

        ${sale.items
          .map(
            (item) => `
          <div class="item">
            <div>${item.name}</div>
          </div>
          <div class="item">
            <div>${item.quantity} x S/ ${item.unitPrice.toFixed(2)}</div>
            <div>S/ ${item.total.toFixed(2)}</div>
          </div>
        `,
          )
          .join('')}

        <div class="line"></div>

        <div class="item">
          <div>Subtotal:</div>
          <div>S/ ${sale.subtotal.toFixed(2)}</div>
        </div>
        <div class="item">
          <div>IGV (18%):</div>
          <div>S/ ${sale.taxAmount.toFixed(2)}</div>
        </div>
        <div class="item total">
          <div>TOTAL:</div>
          <div>S/ ${sale.total.toFixed(2)}</div>
        </div>

        <div class="line"></div>

        <div>
          <strong>Pagos:</strong>
          ${sale.payments
            .map(
              (payment) => `
            <div class="item">
              <div>${payment.type}:</div>
              <div>S/ ${payment.amount.toFixed(2)}</div>
            </div>
          `,
            )
            .join('')}
        </div>

        <div class="footer">
          <div>¡Gracias por su compra!</div>
          <div>Sistema ERP - ${new Date().toLocaleString()}</div>
        </div>
      </body>
      </html>
    `
  }

  return {
    // Mutations
    completeSale: completeSaleMutation.mutate,
    isCompletingSale: computed(() => completeSaleMutation.isPending),

    // Methods
    generateReceiptData,
    printReceipt,
  }
}
