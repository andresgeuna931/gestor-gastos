import { Edit2, Trash2 } from 'lucide-react'
import { formatCurrency, getMonthlyAmount, formatDate } from '../utils/calculations'

// Parsear shared_with que ahora viene como JSON
function parseSharedWith(sharedWith) {
    if (!sharedWith) return []
    try {
        const parsed = typeof sharedWith === 'string' ? JSON.parse(sharedWith) : sharedWith
        return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
        return sharedWith ? [sharedWith] : []
    }
}

// Obtener label del tipo de gasto
function getShareLabel(expense) {
    const sharedWith = parseSharedWith(expense.shared_with)

    if (expense.share_type === 'personal' || sharedWith.length === 0) {
        return { emoji: '👤', label: 'Personal', type: 'personal' }
    }

    const count = sharedWith.length + 1 // +1 por el owner
    return {
        emoji: '👥',
        label: `Compartido (${count})`,
        type: 'shared'
    }
}

export default function ExpenseCard({
    expense,
    onEdit,
    onDelete,
    isReadOnly
}) {
    const monthlyAmount = getMonthlyAmount(expense.total_amount, expense.installments)
    const isCompleted = expense.status === 'completed'
    const shareInfo = getShareLabel(expense)
    const sharedWithList = parseSharedWith(expense.shared_with)

    return (
        <div className={`glass-card p-4 animate-fade-in ${isCompleted ? 'opacity-70' : ''}`}>
            <div className="flex justify-between items-start gap-4">
                {/* Info principal */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`badge ${shareInfo.type === 'personal' ? 'badge-personal' : 'badge-shared2'}`}>
                            {shareInfo.emoji} {shareInfo.label}
                        </span>
                        {expense.installments > 1 && (
                            <span className="cuota-indicator">
                                📅 Cuota {expense._calculatedInstallment || expense.current_installment || 1}/{expense.installments}
                            </span>
                        )}
                        {isCompleted && (
                            <span className="badge bg-green-500/20 text-green-300 border border-green-500/30">
                                ✓ Completado
                            </span>
                        )}
                    </div>

                    <h3 className="text-white font-medium truncate mb-1">
                        {expense.description}
                    </h3>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
                        <span>👤 {expense.owner}</span>
                        <span>🏷️ {expense.category}</span>
                        <span>💳 {expense.card}</span>
                        <span>📅 {formatDate(expense.date)}</span>
                        {sharedWithList.length > 0 && (
                            <span>👥 Con {sharedWithList.join(', ')}</span>
                        )}
                    </div>
                </div>

                {/* Monto */}
                <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold text-white">
                        {formatCurrency(monthlyAmount)}
                    </div>
                    {expense.installments > 1 && (
                        <div className="text-sm text-gray-400">
                            Total: {formatCurrency(expense.total_amount)}
                        </div>
                    )}
                </div>
            </div>

            {/* Acciones */}
            {!isReadOnly && (
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/10">

                    <button
                        onClick={() => onEdit(expense)}
                        className="btn-secondary text-sm flex items-center gap-1"
                    >
                        <Edit2 className="w-4 h-4" />
                        Editar
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete(expense)
                        }}
                        className="btn-danger text-sm flex items-center gap-1"
                    >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                    </button>
                </div>
            )}
        </div>
    )
}
