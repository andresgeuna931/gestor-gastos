import { useState } from 'react'
import { X, Plus, Trash2, CreditCard } from 'lucide-react'

export default function CardManager({ cards, onAddCard, onDeleteCard, onClose }) {
    const [newCardName, setNewCardName] = useState('')
    const [isAdding, setIsAdding] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(null)

    const handleAdd = async () => {
        if (!newCardName.trim()) return
        setIsAdding(true)
        await onAddCard(newCardName.trim())
        setNewCardName('')
        setIsAdding(false)
    }

    const handleDelete = async () => {
        if (!confirmDelete) return
        await onDeleteCard(confirmDelete.id)
        setConfirmDelete(null)
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CreditCard className="w-6 h-6" />
                        Gestionar Tarjetas
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Lista de tarjetas */}
                <div className="space-y-2 mb-6">
                    {cards.map(card => (
                        <div
                            key={card.id}
                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white">{card.name}</span>
                            </div>
                            <button
                                onClick={() => {
                                    if (cards.length <= 1) {
                                        alert('Debe haber al menos una tarjeta')
                                        return
                                    }
                                    setConfirmDelete(card)
                                }}
                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                disabled={cards.length <= 1}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Agregar nueva */}
                <div className="border-t border-white/10 pt-4">
                    <label className="label">Nueva Tarjeta</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCardName}
                            onChange={(e) => setNewCardName(e.target.value)}
                            placeholder="Ej: Visa Gold"
                            className="input-field flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newCardName.trim() || isAdding}
                            className="btn-primary flex items-center gap-1"
                        >
                            {isAdding ? (
                                <div className="spinner" />
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Agregar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal confirmar eliminación */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]" onClick={e => e.stopPropagation()}>
                    <div className="glass w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            ¿Eliminar "{confirmDelete.name}"?
                        </h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Esta tarjeta será eliminada permanentemente.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="btn-secondary flex-1"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
