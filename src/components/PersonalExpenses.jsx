import React, { useState, useEffect, useRef } from 'react'
import {
    Plus,
    ArrowLeft,
    CreditCard,
    Calendar,
    History,
    RefreshCw,
    Trash2,
    Edit2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, getCurrentMonth, getMonthName } from '../utils/calculations'
import CardManager from './CardManager'
import CategoryChart from './CategoryChart'
import { HelpButton } from './HelpPage'

export default function PersonalExpenses({ user, onBack }) {
    const currentMonth = getCurrentMonth()

    // Cargar del cache inmediatamente al montar (antes de cualquier efecto)
    const getInitialExpenses = () => {
        try {
            const cached = localStorage.getItem(`personal_expenses_${user?.id}_${currentMonth}`)
            return cached ? JSON.parse(cached) : []
        } catch { return [] }
    }

    const [expenses, setExpenses] = useState(getInitialExpenses)
    const [cards, setCards] = useState([])
    const [loading, setLoading] = useState(false)  // Empezar en false si hay cache
    const [viewMode, setViewMode] = useState('current')
    const [selectedMonth, setSelectedMonth] = useState(currentMonth)
    const [showExpenseForm, setShowExpenseForm] = useState(false)
    const [showCardManager, setShowCardManager] = useState(false)
    const [editingExpense, setEditingExpense] = useState(null)
    const [toast, setToast] = useState(null)
    const fetchedRef = useRef(false)

    const isReadOnly = viewMode === 'history'

    // Cargar datos solo una vez cuando user está listo
    useEffect(() => {
        if (user?.id && !fetchedRef.current) {
            fetchedRef.current = true
            loadCards()
            loadExpenses(currentMonth)
        }
    }, [user?.id])

    useEffect(() => {
        if (user?.id && fetchedRef.current) {
            loadExpenses(viewMode === 'current' ? currentMonth : selectedMonth)
        }
    }, [viewMode, selectedMonth])

    // REMOVIDO: Auto-refresh en visibilitychange causaba recargas problemáticas
    // Los datos ya están en memoria, no es necesario recargar cada vez

    // Sincronizar mes en histórico
    useEffect(() => {
        if (viewMode === 'history') {
            const now = new Date()
            const date = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const firstHistoryMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            setSelectedMonth(firstHistoryMonth)
        }
    }, [viewMode])

    // Manejar botón atrás del celular
    useEffect(() => {
        const handlePopState = () => {
            if (showExpenseForm) {
                setShowExpenseForm(false)
                setEditingExpense(null)
                window.history.pushState({ modal: 'closed' }, '')
            } else if (showCardManager) {
                setShowCardManager(false)
                window.history.pushState({ modal: 'closed' }, '')
            }
        }
        if (showExpenseForm || showCardManager) {
            window.history.pushState({ modal: 'open' }, '')
        }
        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [showExpenseForm, showCardManager])

    const showToast = (message) => {
        setToast(message)
        setTimeout(() => setToast(null), 3000)
    }

    // Cache key para localStorage
    const getCacheKey = (month) => `personal_expenses_${user?.id}_${month}`

    const loadExpenses = async (month) => {
        const cacheKey = getCacheKey(month)

        // Si no hay user_id, intentar cargar del cache
        if (!user?.id) {
            console.warn('No user_id, trying cache...')
            const cached = localStorage.getItem(cacheKey)
            if (cached) {
                try {
                    setExpenses(JSON.parse(cached))
                } catch (e) {
                    console.warn('Cache parse error')
                }
            }
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .eq('month', month)
                .eq('section', 'personal')
                .eq('user_id', user.id)
                .order('date', { ascending: false })

            if (error) throw error

            // Filtrar activos si es mes actual
            let filtered = data || []
            if (viewMode === 'current' && month === currentMonth) {
                filtered = filtered.filter(e => !e.status || e.status === 'active')
            }

            // Guardar en cache y mostrar
            localStorage.setItem(cacheKey, JSON.stringify(filtered))
            setExpenses(filtered)
        } catch (error) {
            console.error('Error loading expenses:', error.message)
            // Si falla, intentar cargar del cache
            const cached = localStorage.getItem(cacheKey)
            if (cached) {
                try {
                    setExpenses(JSON.parse(cached))
                    console.log('Loaded from cache')
                } catch (e) {
                    // mantener datos actuales
                }
            }
        } finally {
            setLoading(false)
        }
    }





    const loadCards = async () => {
        try {
            const { data, error } = await supabase
                .from('cards')
                .select('*')
                .order('name')
            if (error) throw error
            setCards(data || [])
        } catch (error) {
            console.error('Error loading cards:', error)
        }
    }

    const handleSaveExpense = async (expenseData) => {
        console.log('handleSaveExpense called:', expenseData)
        try {
            const personalExpense = {
                ...expenseData,
                section: 'personal',
                owner: 'Personal',
                share_type: 'personal',
                shared_with: null
            }

            if (editingExpense) {
                console.log('Updating expense:', editingExpense.id)
                const { error } = await supabase
                    .from('expenses')
                    .update(personalExpense)
                    .eq('id', editingExpense.id)
                console.log('Update result:', { error })
                if (error) throw error
                showToast('✅ Gasto actualizado')
            } else {
                console.log('Inserting new expense with user_id:', user?.id)
                const { error } = await supabase
                    .from('expenses')
                    .insert([{ ...personalExpense, user_id: user?.id }])
                console.log('Insert result:', { error })
                if (error) throw error
                showToast('✅ Gasto agregado')
            }

            setShowExpenseForm(false)
            setEditingExpense(null)
            console.log('Reloading expenses...')
            await loadExpenses(currentMonth)
            console.log('Done')
        } catch (error) {
            console.error('Error saving expense:', error)
            showToast('❌ ' + (error.message || 'Error al guardar'))
        }
    }

    const handleDeleteExpense = async (expense) => {
        const description = typeof expense === 'object' ? expense.description : 'este gasto'
        const expenseId = typeof expense === 'object' ? expense.id : expense

        if (!window.confirm(`¿Estás seguro de eliminar "${description}"?\n\nEsta acción no se puede deshacer.`)) {
            return
        }

        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expenseId)
            if (error) throw error
            showToast('🗑️ Gasto eliminado')
            await loadExpenses(viewMode === 'current' ? currentMonth : selectedMonth)
        } catch (error) {
            console.error('Error deleting expense:', error)
            showToast('❌ Error al eliminar')
        }
    }

    const handleMarkPaid = async (expense) => {
        const newInstallment = expense.current_installment + 1
        const isComplete = newInstallment > expense.installments

        try {
            const { error } = await supabase
                .from('expenses')
                .update({
                    current_installment: isComplete ? expense.installments : newInstallment,
                    status: isComplete ? 'completed' : 'active'
                })
                .eq('id', expense.id)
            if (error) throw error
            showToast(isComplete ? '🎉 ¡Gasto completado!' : '✅ Cuota pagada')
            await loadExpenses(currentMonth)
        } catch (error) {
            console.error('Error marking paid:', error)
            showToast('❌ Error al actualizar')
        }
    }

    // Calcular total del mes
    const monthlyTotal = expenses.reduce((sum, exp) => {
        const amount = exp.installments > 1
            ? exp.total_amount / exp.installments
            : exp.total_amount
        return sum + amount
    }, 0)

    const generateMonthOptions = () => {
        const months = []
        const now = new Date()
        for (let i = 1; i <= 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            months.push(monthStr)
        }
        return months
    }

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Volver"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white">
                                💰 Gastos Personales
                            </h1>
                            <p className="text-gray-400">
                                {getMonthName(viewMode === 'current' ? currentMonth : selectedMonth)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <HelpButton section="personal" />
                        <button
                            onClick={() => loadExpenses(viewMode === 'current' ? currentMonth : selectedMonth)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Actualizar"
                        >
                            <RefreshCw className="w-5 h-5 text-gray-400" />
                        </button>
                        <button
                            onClick={() => setShowCardManager(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <CreditCard className="w-4 h-4" />
                            <span className="hidden sm:inline">Tarjetas</span>
                        </button>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setViewMode('current')}
                        className={`tab-button flex items-center gap-2 ${viewMode === 'current' ? 'active' : ''}`}
                    >
                        <Calendar className="w-4 h-4" />
                        Mes Actual
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`tab-button flex items-center gap-2 ${viewMode === 'history' ? 'active' : ''}`}
                    >
                        <History className="w-4 h-4" />
                        Histórico
                    </button>
                </div>

                {/* Selector de mes en histórico */}
                {viewMode === 'history' && (
                    <div className="mb-6 animate-fade-in">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="input-field max-w-xs"
                        >
                            {generateMonthOptions().map(month => (
                                <option key={month} value={month}>
                                    {getMonthName(month)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Total del mes */}
                <div className="glass p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total del Mes</span>
                        <span className="text-3xl font-bold text-white">
                            {formatCurrency(monthlyTotal)}
                        </span>
                    </div>
                </div>

                {/* Gráfico por categoría */}
                {expenses.length > 0 && (
                    <CategoryChart expenses={expenses} />
                )}

                {/* Botón agregar */}
                {!isReadOnly && (
                    <div className="flex gap-3 mb-6">
                        <button
                            onClick={() => {
                                setEditingExpense(null)
                                setShowExpenseForm(true)
                            }}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Agregar Gasto
                        </button>
                    </div>
                )}

                {/* Lista de gastos */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="spinner w-8 h-8" />
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="glass p-8 text-center">
                        <p className="text-gray-400 text-lg">No hay gastos este mes</p>
                        {!isReadOnly && (
                            <p className="text-gray-500 mt-2">
                                Agregá tu primer gasto personal
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {expenses.map(expense => (
                            <PersonalExpenseCard
                                key={expense.id}
                                expense={expense}
                                onEdit={() => {
                                    setEditingExpense(expense)
                                    setShowExpenseForm(true)
                                }}
                                onDelete={() => handleDeleteExpense(expense)}
                                onMarkPaid={() => handleMarkPaid(expense)}
                                isReadOnly={isReadOnly}
                            />
                        ))}
                    </div>
                )}

                {/* Modal de formulario */}
                {showExpenseForm && (
                    <PersonalExpenseForm
                        expense={editingExpense}
                        cards={cards}
                        onSave={handleSaveExpense}
                        onClose={() => {
                            setShowExpenseForm(false)
                            setEditingExpense(null)
                        }}
                    />
                )}

                {/* Modal de tarjetas */}
                {showCardManager && (
                    <CardManager
                        cards={cards}
                        onAddCard={async (name) => {
                            await supabase.from('cards').insert([{ name, user_id: user?.id }])
                            await loadCards()
                            showToast('✅ Tarjeta agregada')
                        }}
                        onDeleteCard={async (id) => {
                            try {
                                const { error } = await supabase.from('cards').delete().eq('id', id)
                                if (error) {
                                    console.error('Error deleting card:', error)
                                    showToast('❌ Error al eliminar: ' + error.message)
                                    return
                                }
                                await loadCards()
                                showToast('🗑️ Tarjeta eliminada')
                            } catch (err) {
                                console.error('Error:', err)
                                showToast('❌ Error al eliminar tarjeta')
                            }
                        }}
                        onClose={() => setShowCardManager(false)}
                    />
                )}

                {/* Toast */}
                {toast && (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 glass-card px-6 py-3 animate-fade-in z-50">
                        {toast}
                    </div>
                )}

                {/* Mensaje solo lectura */}
                {isReadOnly && (
                    <div className="mt-6 glass-card p-4 text-center text-gray-400">
                        📅 Estás viendo un mes anterior. Los gastos son de solo lectura.
                    </div>
                )}
            </div>
        </div>
    )
}

// Componente de tarjeta de gasto personal simplificado
function PersonalExpenseCard({ expense, onEdit, onDelete, onMarkPaid, isReadOnly }) {
    const monthlyAmount = expense.installments > 1
        ? expense.total_amount / expense.installments
        : expense.total_amount
    const isCompleted = expense.status === 'completed'
    const isLastInstallment = expense.current_installment === expense.installments

    const formatDate = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00')
        return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    }

    return (
        <div className={`glass-card p-4 animate-fade-in ${isCompleted ? 'opacity-70' : ''}`}>
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                    {expense.installments > 1 && (
                        <div className="flex items-center gap-2 mb-1">
                            <span className="cuota-indicator">
                                📅 Cuota {expense.current_installment}/{expense.installments}
                            </span>
                            {isCompleted && (
                                <span className="badge bg-green-500/20 text-green-300 border border-green-500/30">
                                    ✓ Completado
                                </span>
                            )}
                        </div>
                    )}
                    <h3 className="text-white font-medium truncate mb-1">
                        {expense.description}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
                        <span>🏷️ {expense.category}</span>
                        <span>
                            {expense.payment_method === 'efectivo' && '💵 Efectivo'}
                            {expense.payment_method === 'transferencia' && '🏦 Transferencia'}
                            {expense.payment_method === 'qr' && '📱 QR'}
                            {expense.payment_method === 'tarjeta' && `💳 ${expense.card}`}
                            {!expense.payment_method && expense.card && `💳 ${expense.card}`}
                        </span>
                        <span>📅 {formatDate(expense.date)}</span>
                    </div>
                </div>

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

            {!isReadOnly && (
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/10">
                    {expense.installments > 1 && !isCompleted && (
                        <button
                            onClick={onMarkPaid}
                            className={`btn-success text-sm flex items-center gap-1 ${isLastInstallment ? 'bg-gradient-to-r from-amber-500 to-orange-500' : ''}`}
                        >
                            {isLastInstallment ? 'Finalizar' : 'Pagar Cuota'}
                        </button>
                    )}
                    <button
                        onClick={onEdit}
                        className="btn-secondary text-sm flex items-center gap-1"
                    >
                        <Edit2 className="w-4 h-4" />
                        Editar
                    </button>
                    <button
                        onClick={onDelete}
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

// Formulario simplificado para gastos personales
const PERSONAL_PAYMENT_METHODS = [
    { id: 'efectivo', label: 'Efectivo', icon: '💵', color: 'text-green-400' },
    { id: 'transferencia', label: 'Transferencia', icon: '📲', color: 'text-blue-400' },
    { id: 'qr', label: 'QR', icon: '📱', color: 'text-purple-400' },
    { id: 'tarjeta', label: 'Tarjeta', icon: '💳', color: 'text-orange-400' }
]

function PersonalExpenseForm({ expense, cards, onSave, onClose }) {
    const [formData, setFormData] = useState({
        description: expense?.description || '',
        total_amount: expense?.total_amount || '',
        category: expense?.category || 'Otros',
        payment_method: expense?.payment_method || 'efectivo',
        card: expense?.card || (cards[0]?.name || ''),
        date: expense?.date || new Date().toISOString().split('T')[0],
        installments: expense?.installments || 1,
        current_installment: expense?.current_installment || 1,
        month: expense?.month || getCurrentMonth()
    })

    const categories = [
        'Supermercado', 'Restaurantes', 'Transporte', 'Entretenimiento',
        'Salud', 'Ropa', 'Tecnología', 'Hogar', 'Servicios', 'Otros'
    ]

    const handleSubmit = (e) => {
        e.preventDefault()
        onSave({
            ...formData,
            total_amount: parseFloat(formData.total_amount),
            payment_method: formData.payment_method,
            card: formData.payment_method === 'tarjeta' ? formData.card : null,
            installments: formData.payment_method === 'tarjeta' ? parseInt(formData.installments) : 1,
            current_installment: formData.payment_method === 'tarjeta' ? parseInt(formData.current_installment) : 1
        })
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="glass w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-white">
                            {expense ? 'Editar Gasto' : 'Nuevo Gasto Personal'}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
                            ×
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="label">Descripción</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="input-field"
                                placeholder="Ej: Compra en supermercado"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">Monto Total</label>
                            <input
                                type="number"
                                value={formData.total_amount}
                                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                                className="input-field"
                                placeholder="0.00"
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Categoría</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="input-field"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Fecha</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="input-field"
                                />
                            </div>
                        </div>

                        {/* Método de Pago */}
                        <div>
                            <label className="label">Método de Pago</label>
                            <div className="grid grid-cols-4 gap-2">
                                {PERSONAL_PAYMENT_METHODS.map(method => (
                                    <button
                                        key={method.id}
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            payment_method: method.id,
                                            installments: method.id !== 'tarjeta' ? 1 : formData.installments
                                        })}
                                        className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all text-sm ${formData.payment_method === method.id
                                            ? 'bg-primary-600/30 border-primary-500 text-white'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        <span>{method.icon}</span>
                                        <span className="text-xs">{method.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tarjeta y Cuotas (solo si método es tarjeta) */}
                        {formData.payment_method === 'tarjeta' && (
                            <div className="animate-fade-in grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Tarjeta</label>
                                    <select
                                        value={formData.card}
                                        onChange={(e) => setFormData({ ...formData, card: e.target.value })}
                                        className="input-field"
                                    >
                                        {cards.length === 0 ? (
                                            <option value="">Sin tarjetas</option>
                                        ) : (
                                            cards.map(card => (
                                                <option key={card.id} value={card.name}>{card.name}</option>
                                            ))
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Cuotas</label>
                                    <select
                                        value={formData.installments}
                                        onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                                        className="input-field"
                                    >
                                        {[1, 3, 6, 9, 12, 18, 24].map(n => (
                                            <option key={n} value={n}>
                                                {n === 1 ? 'Sin cuotas' : `${n} cuotas`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={onClose} className="btn-secondary flex-1">
                                Cancelar
                            </button>
                            <button type="submit" className="btn-primary flex-1">
                                {expense ? 'Guardar' : 'Agregar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
