// Formatea un número como moneda argentina
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount)
}

// Calcula el monto mensual basado en cuotas
export const getMonthlyAmount = (totalAmount, installments) => {
    return totalAmount / installments
}

// Calcula cuánto debe pagar cada persona por un gasto
export const calculatePersonShare = (expense, person) => {
    const monthlyAmount = getMonthlyAmount(expense.total_amount, expense.installments)

    switch (expense.share_type) {
        case 'personal':
            // Solo paga el dueño
            return expense.owner === person ? monthlyAmount : 0

        case 'shared2':
            // Se divide entre el dueño y la persona con quien comparte
            if (expense.owner === person || expense.shared_with === person) {
                return monthlyAmount / 2
            }
            return 0

        case 'shared3':
            // Se divide entre los 3
            return monthlyAmount / 3

        default:
            return 0
    }
}

// Calcula los totales de todos los gastos para una persona
export const calculateTotalsForPerson = (expenses, person) => {
    return expenses.reduce((total, expense) => {
        return total + calculatePersonShare(expense, person)
    }, 0)
}

// Calcula totales para las 3 personas
export const calculateAllTotals = (expenses) => {
    const people = ['Titular', 'Andrés', 'Pablo']
    const totals = {}

    people.forEach(person => {
        totals[person] = calculateTotalsForPerson(expenses, person)
    })

    totals.total = expenses.reduce((sum, exp) => {
        return sum + getMonthlyAmount(exp.total_amount, exp.installments)
    }, 0)

    return totals
}

// Obtiene el emoji según el tipo de gasto
export const getShareTypeEmoji = (shareType) => {
    switch (shareType) {
        case 'personal': return '👤'
        case 'shared2': return '👥'
        case 'shared3': return '👨‍👩‍👦'
        default: return '💰'
    }
}

// Obtiene el label del tipo de gasto
export const getShareTypeLabel = (shareType) => {
    switch (shareType) {
        case 'personal': return 'Personal'
        case 'shared2': return 'Compartido (2)'
        case 'shared3': return 'Compartido (3)'
        default: return 'Desconocido'
    }
}

// Obtiene el mes actual en formato YYYY-MM
export const getCurrentMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Formatea una fecha para mostrar
export const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short'
    })
}

// Obtiene el nombre del mes
export const getMonthName = (monthString) => {
    const [year, month] = monthString.split('-')
    const date = new Date(year, parseInt(month) - 1)
    return date.toLocaleDateString('es-AR', {
        month: 'long',
        year: 'numeric'
    })
}

// Lista de categorías disponibles
export const CATEGORIES = [
    'Supermercado',
    'MercadoLibre',
    'Servicios',
    'Entretenimiento',
    'Comida',
    'Transporte',
    'Salud',
    'Ropa',
    'Tecnología',
    'Hogar',
    'Otros'
]

// Lista de personas
export const PEOPLE = ['Titular', 'Andrés', 'Pablo']
