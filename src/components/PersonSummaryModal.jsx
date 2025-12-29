import { X, ShoppingCart, Users, Home } from 'lucide-react'
import {
    formatCurrency,
    getMonthlyAmount,
    calculatePersonShare,
    getShareTypeEmoji,
    getShareTypeLabel,
    formatDate
} from '../utils/calculations'

export default function PersonSummaryModal({
    person,
    expenses,
    month,
    onClose
}) {
    // Filtrar gastos donde esta persona participa
    const relevantExpenses = expenses.filter(expense => {
        if (expense.share_type === 'personal') {
            return expense.owner === person.name
        }
        if (expense.share_type === 'shared2') {
            return expense.owner === person.name || expense.shared_with === person.name
        }
        if (expense.share_type === 'shared3') {
            return true // Todos participan
        }
        return false
    })

    // Calcular totales por tipo
    const personalExpenses = relevantExpenses.filter(e => e.share_type === 'personal')
    const shared2Expenses = relevantExpenses.filter(e => e.share_type === 'shared2')
    const shared3Expenses = relevantExpenses.filter(e => e.share_type === 'shared3')

    const totalPersonal = personalExpenses.reduce((sum, e) =>
        sum + calculatePersonShare(e, person.name), 0)
    const totalShared2 = shared2Expenses.reduce((sum, e) =>
        sum + calculatePersonShare(e, person.name), 0)
    const totalShared3 = shared3Expenses.reduce((sum, e) =>
        sum + calculatePersonShare(e, person.name), 0)

    const grandTotal = totalPersonal + totalShared2 + totalShared3

    // Agrupar por categoría para mini-resumen
    const byCategory = relevantExpenses.reduce((acc, expense) => {
        const share = calculatePersonShare(expense, person.name)
        if (!acc[expense.category]) {
            acc[expense.category] = 0
        }
        acc[expense.category] += share
        return acc
    }, {})

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="text-4xl">{person.emoji}</div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                Resumen de {person.name}
                            </h2>
                            <p className="text-gray-400 text-sm">{month}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Total destacado */}
                <div className={`total-card ${person.colorClass} mb-6`}>
                    <div className="text-gray-300 mb-1">Total a pagar este mes</div>
                    <div className="text-3xl font-bold text-white">
                        {formatCurrency(grandTotal)}
                    </div>
                </div>

                {/* Desglose por tipo */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="glass-card p-3 text-center">
                        <div className="text-lg mb-1">👤</div>
                        <div className="text-xs text-gray-400">Personal</div>
                        <div className="text-lg font-semibold text-white">
                            {formatCurrency(totalPersonal)}
                        </div>
                    </div>
                    <div className="glass-card p-3 text-center">
                        <div className="text-lg mb-1">👥</div>
                        <div className="text-xs text-gray-400">Compartido (2)</div>
                        <div className="text-lg font-semibold text-white">
                            {formatCurrency(totalShared2)}
                        </div>
                    </div>
                    <div className="glass-card p-3 text-center">
                        <div className="text-lg mb-1">👨‍👩‍👦</div>
                        <div className="text-xs text-gray-400">Compartido (3)</div>
                        <div className="text-lg font-semibold text-white">
                            {formatCurrency(totalShared3)}
                        </div>
                    </div>
                </div>

                {/* Gastos por categoría */}
                {Object.keys(byCategory).length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                            Por Categoría
                        </h3>
                        <div className="space-y-2">
                            {Object.entries(byCategory)
                                .sort((a, b) => b[1] - a[1])
                                .map(([category, amount]) => (
                                    <div
                                        key={category}
                                        className="flex justify-between items-center p-2 bg-white/5 rounded-lg"
                                    >
                                        <span className="text-gray-300">{category}</span>
                                        <span className="text-white font-medium">
                                            {formatCurrency(amount)}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Lista detallada de gastos */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                        Detalle de Gastos ({relevantExpenses.length})
                    </h3>

                    {relevantExpenses.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No hay gastos para {person.name} este mes
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {relevantExpenses.map(expense => {
                                const myShare = calculatePersonShare(expense, person.name)
                                const monthlyTotal = getMonthlyAmount(expense.total_amount, expense.installments)

                                return (
                                    <div
                                        key={expense.id}
                                        className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm">
                                                        {getShareTypeEmoji(expense.share_type)}
                                                    </span>
                                                    <span className="text-white font-medium truncate">
                                                        {expense.description}
                                                    </span>
                                                    {expense.installments > 1 && (
                                                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded">
                                                            {expense.current_installment}/{expense.installments}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {expense.category} • {expense.card} • {formatDate(expense.date)}
                                                    {expense.share_type === 'shared2' && expense.owner !== person.name && (
                                                        <span> • Pagado por {expense.owner}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right ml-3">
                                                <div className="text-white font-semibold">
                                                    {formatCurrency(myShare)}
                                                </div>
                                                {expense.share_type !== 'personal' && (
                                                    <div className="text-xs text-gray-500">
                                                        de {formatCurrency(monthlyTotal)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Botón cerrar */}
                <div className="mt-6 pt-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="btn-secondary w-full"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}
