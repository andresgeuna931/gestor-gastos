import { formatCurrency, calculateAllTotals, getMonthlyAmount, getMonthName } from './calculations'

// Genera el texto formateado para compartir por WhatsApp
export const generateWhatsAppSummary = (expenses, month) => {
    const totals = calculateAllTotals(expenses)
    const monthName = getMonthName(month)

    let text = `💰 *RESUMEN GASTOS FAMILIARES*\n`
    text += `📅 ${monthName.toUpperCase()}\n`
    text += `${'─'.repeat(25)}\n\n`

    // Totales por persona
    text += `👩 *Miriam (Titular):* ${formatCurrency(totals['Titular'])}\n`
    text += `👦 *Andrés:* ${formatCurrency(totals['Andrés'])}\n`
    text += `👦 *Pablo:* ${formatCurrency(totals['Pablo'])}\n\n`

    text += `${'─'.repeat(25)}\n`
    text += `💵 *TOTAL MES:* ${formatCurrency(totals.total)}\n`
    text += `${'─'.repeat(25)}\n\n`

    // Detalle de gastos (opcional, solo los más relevantes)
    if (expenses.length > 0) {
        text += `📋 *DETALLE DE GASTOS:*\n\n`

        expenses.forEach(expense => {
            const monthly = getMonthlyAmount(expense.total_amount, expense.installments)
            const cuota = expense.installments > 1
                ? ` (${expense.current_installment}/${expense.installments})`
                : ''

            text += `• ${expense.description}${cuota}\n`
            text += `  ${formatCurrency(monthly)} - ${expense.owner}\n\n`
        })
    }

    text += `\n_Generado por Gestor de Gastos Familiares_`

    return text
}

// Copia el texto al portapapeles
export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch (err) {
        console.error('Error al copiar:', err)
        // Fallback para navegadores antiguos
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        return true
    }
}
