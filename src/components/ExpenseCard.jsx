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

    // Filtrar al owner de shared_with para evitar contar doble
    const uniqueShared = sharedWith.filter(name => name !== expense.owner)
    const count = uniqueShared.length + 1 // +1 por el owner
    return {
        emoji: '👥',
        label: `Compartido (${count})`,
        type: 'shared'
    }
}

export default function ExpenseCard({
    expense,
    people,
    user,
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

                    <h3 className="text-theme-primary font-medium truncate mb-2">
                        {expense.description}
                    </h3>

                    {/* Grid de información con etiquetas */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
                        {/* Quién pagó */}
                        <div className="flex flex-col">
                            <span className="text-theme-primary font-medium">
                                {(() => {
                                    // Lógica dinámica: "Yo" solo si el VIEWER es el creador del gasto
                                    if (expense.user_id === user?.id) return 'Yo'
                                    // Buscar nombre real del creador
                                    const person = people?.find(p => p.member_id === expense.user_id)
                                    return person?.name || expense.owner
                                })()}
                            </span>
                            <span className="text-xs text-theme-secondary">Quién pagó</span>
                        </div>

                        {/* Categoría */}
                        <div className="flex flex-col">
                            <span className="text-theme-primary">{expense.category}</span>
                            <span className="text-xs text-theme-secondary">Categoría</span>
                        </div>

                        {/* Tarjeta */}
                        <div className="flex flex-col">
                            <span className="text-theme-primary">{expense.card || '-'}</span>
                            <span className="text-xs text-theme-secondary">Tarjeta</span>
                        </div>

                        {/* Fecha */}
                        <div className="flex flex-col">
                            <span className="text-theme-primary">{formatDate(expense.date)}</span>
                            <span className="text-xs text-theme-secondary">Fecha</span>
                        </div>

                        {/* Compartido con (solo si hay) */}
                        {sharedWithList.length > 0 && (
                            <div className="flex flex-col col-span-2">
                                <span className="text-theme-primary">{sharedWithList.join(', ')}</span>
                                <span className="text-xs text-theme-secondary">Compartido con</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Monto */}
                <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold text-theme-primary">
                        {formatCurrency(monthlyAmount)}
                    </div>
                    {expense.installments > 1 && (
                        <div className="text-sm text-theme-secondary">
                            Total: {formatCurrency(expense.total_amount)}
                        </div>
                    )}
                </div>
            </div>

            {/* Acciones */}
            {!isReadOnly && (
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[var(--divider-color)]">

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
