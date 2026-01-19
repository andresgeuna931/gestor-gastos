import React, { useState, useEffect, useRef } from 'react'
import {
    Plus,
    ArrowLeft,
    CreditCard,
    Calendar,
    History,
    RefreshCw,
    Trash2,
    Edit2,
    FileText,
    Search,
    X
} from 'lucide-react'
import { supabase, supabaseRead } from '../lib/supabase'
import { formatCurrency, getCurrentMonth, getMonthName } from '../utils/calculations'
import CardManager from './CardManager'
import CategoryChart from './CategoryChart'
import { HelpButton } from './HelpPage'
import ReportModal from './ReportModal'

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
    const [viewMode, setViewMode] = useState('current') // 'current', 'history', or 'future'
    const [selectedMonth, setSelectedMonth] = useState(currentMonth)
    const [futureMonth, setFutureMonth] = useState(() => {
        // Default to next month
        const now = new Date()
        const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
    })
    const [showExpenseForm, setShowExpenseForm] = useState(false)
    const [showCardManager, setShowCardManager] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [editingExpense, setEditingExpense] = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [toast, setToast] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const fetchedRef = useRef(false)

    // Solo histórico es de solo lectura (future permite edit/delete)
    const isReadOnly = viewMode === 'history'

    // Generar opciones de próximos 12 meses
    const generateFutureMonthOptions = () => {
        const options = []
        const now = new Date()
        for (let i = 1; i <= 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
            options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
        }
        return options
    }

    // Cargar datos cuando user cambia (removido fetchedRef para mayor robustez)
    useEffect(() => {
        if (user?.id) {
            loadCards()
            loadExpenses(currentMonth)
        }
    }, [user?.id])

    useEffect(() => {
        if (user?.id) {
            if (viewMode === 'future') {
                loadFutureExpenses(futureMonth)
            } else {
                loadExpenses(viewMode === 'current' ? currentMonth : selectedMonth)
            }
        }
    }, [viewMode, selectedMonth, futureMonth])

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
            // ... (código existente de cache)
            return
        }

        setLoading(true)
        try {
            // Construir fechas manualmente para evitar problemas de Timezone en móviles
            const [year, monthNum] = month.split('-').map(Number)

            // Inicio del mes: YYYY-MM-01
            const start = `${year}-${String(monthNum).padStart(2, '0')}-01`

            // Fin del mes: Calcular último día
            const lastDay = new Date(year, monthNum, 0).getDate() // día 0 del siguiente mes = último día de este
            const end = `${year}-${String(monthNum).padStart(2, '0')}-${lastDay}`

            const requestedDate = new Date(year, monthNum - 1, 1) // Para cálculos de installments

            // Query 1: Gastos del mes solicitado
            // Filtramos por el campo 'month' que indica cuándo se cobra la primera cuota
            let query = supabaseRead
                .from('expenses')
                .select('*')
                .eq('month', month) // Filtrar por mes de inicio de cuota, no por fecha de compra
                .eq('section', 'personal')
                .eq('user_id', user.id)
                .order('date', { ascending: false })

            if (viewMode === 'current' && month === currentMonth) {
                query = query.or('status.is.null,status.eq.active')
            }

            const { data: monthExpenses, error: error1 } = await query

            if (error1) throw error1

            // Query 2: Gastos en cuotas de meses anteriores que tienen cuotas en el mes actual
            // Buscamos gastos cuyo 'month' es anterior pero tienen cuotas que llegan hasta este mes
            const { data: installmentExpenses, error: error2 } = await supabaseRead
                .from('expenses')
                .select('*')
                .lt('month', month) // Mes de inicio anterior al mes solicitado
                .gt('installments', 1)
                .eq('section', 'personal')
                .eq('user_id', user.id)
                .or('status.is.null,status.eq.active')

            if (error2) throw error2

            // Procesar gastos en cuotas
            const processedInstallments = (installmentExpenses || []).filter(exp => {
                // Parsear mes del gasto (campo 'month' = mes de primera cuota)
                const [expYear, expMonth] = exp.month.split('-').map(Number)
                const [reqYear, reqMonth] = month.split('-').map(Number)

                // Calcular cuántos meses han pasado desde el mes de primera cuota
                const monthsDiff = (reqYear - expYear) * 12 + (reqMonth - expMonth)
                const cuotaForThisMonth = 1 + monthsDiff // Primera cuota = 1, luego sumar diferencia

                if (cuotaForThisMonth >= 1 && cuotaForThisMonth <= exp.installments) {
                    exp._calculatedInstallment = cuotaForThisMonth
                    return true
                }
                return false
            })

            const allExpenses = [...(monthExpenses || []), ...processedInstallments]
            allExpenses.sort((a, b) => new Date(b.date) - new Date(a.date))

            localStorage.setItem(cacheKey, JSON.stringify(allExpenses))
            setExpenses(allExpenses)
        } catch (error) {
            console.error('Error loading expenses:', error.message)
            // Fallback al cache
            const cached = localStorage.getItem(cacheKey)
            if (cached) {
                try {
                    setExpenses(JSON.parse(cached))
                } catch (e) { }
            }
        } finally {
            setLoading(false)
        }
    }

    // Cargar gastos que tienen cuotas en un mes futuro
    const loadFutureExpenses = async (targetMonth) => {
        if (!user?.id) return
        setLoading(true)

        try {
            const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number)

            // Query: Get all personal expenses with installments
            const { data: allExpenses, error } = await supabaseRead
                .from('expenses')
                .select('*')
                .eq('user_id', user.id)
                .eq('section', 'personal')
                .or('status.is.null,status.eq.active')

            if (error) throw error

            // Filter expenses that have an installment in the target month
            const futureExpenses = (allExpenses || []).filter(exp => {
                const [expYear, expMonth] = exp.month.split('-').map(Number)
                const totalInstallments = exp.installments || 1

                // Calcular en qué meses caen las cuotas
                for (let i = 0; i < totalInstallments; i++) {
                    const installmentDate = new Date(expYear, expMonth - 1 + i, 1)
                    const instYear = installmentDate.getFullYear()
                    const instMonth = installmentDate.getMonth() + 1

                    if (instYear === targetYear && instMonth === targetMonthNum) {
                        exp._calculatedInstallment = i + 1
                        return true
                    }
                }
                return false
            })

            futureExpenses.sort((a, b) => new Date(b.date) - new Date(a.date))
            setExpenses(futureExpenses)
        } catch (error) {
            console.error('Error loading future expenses:', error)
            showToast('Error al cargar gastos futuros')
        }
        setLoading(false)
    }


    const loadCards = async () => {
        try {
            const { data, error } = await supabase
                .from('cards')
                .select('*')
                .eq('user_id', user.id)  // CRÍTICO: filtrar por usuario
                .eq('section', 'personal')  // Solo tarjetas personales
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
            // Recargar la vista correcta
            if (viewMode === 'future') {
                await loadFutureExpenses(futureMonth)
            } else {
                await loadExpenses(currentMonth)
            }
            console.log('Done')
        } catch (error) {
            console.error('Error saving expense:', error)
            showToast('❌ ' + (error.message || 'Error al guardar'))
        }
    }

    const handleDeleteExpense = async (expense) => {
        // Si es el primer llamado, mostrar confirmación
        if (!confirmDelete) {
            setConfirmDelete(typeof expense === 'object' ? expense : { id: expense, description: 'este gasto' })
            return
        }

        // Si ya hay confirmación, proceder a eliminar
        const expenseId = confirmDelete.id
        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expenseId)
            if (error) throw error
            showToast('🗑️ Gasto eliminado')
            setConfirmDelete(null)
            // Recargar la vista correcta
            if (viewMode === 'future') {
                await loadFutureExpenses(futureMonth)
            } else {
                await loadExpenses(viewMode === 'current' ? currentMonth : selectedMonth)
            }
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
            // Recargar la vista correcta
            if (viewMode === 'future') {
                await loadFutureExpenses(futureMonth)
            } else {
                await loadExpenses(currentMonth)
            }
        } catch (error) {
            console.error('Error marking paid:', error)
            showToast('❌ Error al actualizar')
        }
    }

    // Filtrar gastos
    const filteredExpenses = expenses.filter(expense => {
        if (!searchTerm) return true
        const searchLower = searchTerm.toLowerCase()
        return (
            expense.description.toLowerCase().includes(searchLower) ||
            expense.category.toLowerCase().includes(searchLower) ||
            (expense.payment_method && expense.payment_method.toLowerCase().includes(searchLower))
        )
    })

    // Calcular total del mes (usando filteredExpenses para que el total refleje la búsqueda, o expenses si se prefiere total global)
    // El usuario generalmente quiere ver el total de lo que filtró
    const monthlyTotal = filteredExpenses.reduce((sum, exp) => {
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
                            <h1 className="text-2xl md:text-3xl font-bold text-theme-primary">
                                Gastos Personales
                            </h1>
                            <p className="text-theme-secondary">
                                {getMonthName(viewMode === 'current' ? currentMonth : viewMode === 'future' ? futureMonth : selectedMonth)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <HelpButton section="personal" />
                        <button
                            onClick={() => viewMode === 'future' ? loadFutureExpenses(futureMonth) : loadExpenses(viewMode === 'current' ? currentMonth : selectedMonth)}
                            className="p-2 hover:bg-[var(--glass-card-hover)] rounded-lg transition-colors"
                            title="Actualizar"
                        >
                            <RefreshCw className="w-5 h-5 text-theme-secondary" />
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
                <div className="flex gap-2 mb-6 flex-wrap">
                    <button
                        onClick={() => setViewMode('history')}
                        className={`tab-button flex items-center gap-2 ${viewMode === 'history' ? 'active' : ''}`}
                    >
                        <History className="w-4 h-4" />
                        Histórico
                    </button>
                    <button
                        onClick={() => setViewMode('current')}
                        className={`tab-button flex items-center gap-2 ${viewMode === 'current' ? 'active' : ''}`}
                    >
                        <Calendar className="w-4 h-4" />
                        Mes Actual
                    </button>
                    <button
                        onClick={() => setViewMode('future')}
                        className={`tab-button flex items-center gap-2 ${viewMode === 'future' ? 'active' : ''}`}
                    >
                        📅 Próximos Meses
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
                        <p className="text-xs text-theme-secondary mt-2">📅 Histórico disponible: últimos 12 meses</p>
                    </div>
                )}

                {/* Selector de mes futuro */}
                {viewMode === 'future' && (
                    <div className="mb-6 animate-fade-in">
                        <select
                            value={futureMonth}
                            onChange={(e) => setFutureMonth(e.target.value)}
                            className="input-field max-w-xs"
                        >
                            {generateFutureMonthOptions().map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-theme-secondary mt-2">📅 Vista de cuotas futuras: próximos 12 meses</p>
                    </div>
                )}

                {/* Total del mes */}
                <div className="glass p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <span className="text-theme-secondary">Total del Mes</span>
                        <span className="text-3xl font-bold text-theme-primary">
                            {formatCurrency(monthlyTotal)}
                        </span>
                    </div>
                </div>

                {/* Gráfico por categoría */}
                {expenses.length > 0 && (
                    <CategoryChart expenses={expenses} />
                )}

                {/* Botón agregar */}
                {/* Botón agregar y Buscador */}
                {!isReadOnly && (
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div className="flex gap-3">
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
                            <button
                                onClick={() => setShowReportModal(true)}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <FileText className="w-5 h-5" />
                                Ver Reporte
                            </button>
                        </div>

                        {/* Buscador (Derecha y más chico) */}
                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                placeholder="Nombre, categoría..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 text-sm rounded-full bg-[var(--glass-card-bg)] border border-[var(--divider-color)] text-theme-primary placeholder-theme-secondary focus:outline-none focus:border-theme-primary transition-colors focus:bg-[var(--glass-card-hover)]"
                            />
                            <Search className="w-4 h-4 text-theme-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--divider-color)] rounded-full"
                                >
                                    <X className="w-3 h-3 text-theme-secondary" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Lista de gastos */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="spinner w-8 h-8" />
                    </div>
                ) : filteredExpenses.length === 0 ? (
                    <div className="glass p-8 text-center">
                        <p className="text-gray-400 text-lg">
                            {searchTerm ? `No hay resultados para "${searchTerm}"` : 'No hay gastos este mes'}
                        </p>
                        {!isReadOnly && !searchTerm && (
                            <p className="text-gray-500 mt-2">
                                Agregá tu primer gasto personal
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredExpenses.map(expense => (
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
                        user={user}
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
                            await supabase.from('cards').insert([{
                                name,
                                user_id: user?.id,
                                section: 'personal'  // Marcar como tarjeta personal
                            }])
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

                {/* Modal de Reporte */}
                {showReportModal && (
                    <ReportModal
                        cards={cards}
                        onClose={() => setShowReportModal(false)}
                        user={user}
                        section="personal"
                    />
                )}

                {/* Modal confirmar eliminación */}
                {confirmDelete && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
                        <div className="glass w-full max-w-sm p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">
                                ¿Eliminar "{confirmDelete.description}"?
                            </h3>
                            <p className="text-gray-400 text-sm mb-6">
                                {confirmDelete.total_amount && `$${Number(confirmDelete.total_amount).toLocaleString()} - `}
                                Esta acción no se puede deshacer.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDeleteExpense()}
                                    className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
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

                {/* Footer */}
                <footer className="mt-8 text-center text-gray-500 text-sm pb-4">
                    <p>Powered by <span className="text-[#E6D5B8]">AMG Digital</span></p>
                </footer>
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
                                📅 Cuota {expense._calculatedInstallment || expense.current_installment || 1}/{expense.installments}
                            </span>
                            {isCompleted && (
                                <span className="badge bg-green-500/20 text-green-300 border border-green-500/30">
                                    ✓ Completado
                                </span>
                            )}
                        </div>
                    )}
                    <h3 className="text-theme-primary font-medium truncate mb-1">
                        {expense.description}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-theme-secondary">
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

            {!isReadOnly && (
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/10">
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

function PersonalExpenseForm({ expense, cards, user, onSave, onClose }) {
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

    const DEFAULT_CATEGORIES = [
        'Supermercado', 'Restaurantes', 'Transporte', 'Entretenimiento',
        'Salud', 'Ropa', 'Tecnología', 'Hogar', 'Servicios', 'Otros'
    ]
    const [customCategories, setCustomCategories] = useState([])
    const [showAddCategory, setShowAddCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [showManageCategories, setShowManageCategories] = useState(false)
    const [editingCategory, setEditingCategory] = useState(null)
    const [editCategoryName, setEditCategoryName] = useState('')

    // Cargar categorías personalizadas (con ID para edición confiable)
    useEffect(() => {
        const loadCustomCategories = async () => {
            if (!user?.id) return
            const { data } = await supabase
                .from('user_categories')
                .select('id, name')
                .eq('user_id', user.id)
                .order('name')
            if (data) {
                setCustomCategories(data) // Array de {id, name}
            }
        }
        loadCustomCategories()
    }, [user?.id])

    const customCategoryNames = customCategories.map(c => c.name)
    const allCategories = [...DEFAULT_CATEGORIES, ...customCategoryNames.filter(c => !DEFAULT_CATEGORIES.includes(c))]

    const handleAddCategory = async () => {
        const name = newCategoryName.trim()
        if (!name || !user?.id) return
        if (allCategories.includes(name)) {
            alert('Esa categoría ya existe')
            return
        }
        const { data, error } = await supabase
            .from('user_categories')
            .insert([{ user_id: user.id, name }])
            .select()
        if (!error && data && data[0]) {
            setCustomCategories(prev => [...prev, { id: data[0].id, name }].sort((a, b) => a.name.localeCompare(b.name)))
            setFormData(prev => ({ ...prev, category: name }))
            setNewCategoryName('')
            setShowAddCategory(false)
        }
    }

    // Editar categoría personalizada (usando ID)
    const handleEditCategory = async (categoryId, oldName, newName) => {
        const trimmedName = newName.trim()
        if (!trimmedName || !user?.id || trimmedName === oldName) {
            setEditingCategory(null)
            return
        }
        if (allCategories.includes(trimmedName)) {
            alert('Esa categoría ya existe')
            return
        }

        // Actualizar la categoría por ID (más confiable)
        const { error } = await supabase
            .from('user_categories')
            .update({ name: trimmedName })
            .eq('id', categoryId)

        if (error) {
            console.error('Error updating category:', error)
            alert('Error al actualizar la categoría. Por favor intentá de nuevo.')
            return
        }

        // Actualizar gastos que tengan la categoría vieja (cascade update)
        const { error: expenseError } = await supabase
            .from('expenses')
            .update({ category: trimmedName })
            .eq('user_id', user.id)
            .eq('category', oldName)

        if (expenseError) {
            console.warn('Could not update expenses with old category:', expenseError)
        }

        setCustomCategories(prev => prev.map(c => c.id === categoryId ? { ...c, name: trimmedName } : c).sort((a, b) => a.name.localeCompare(b.name)))
        setEditingCategory(null)
        setEditCategoryName('')
    }

    // Eliminar categoría personalizada (usando ID)
    const handleDeleteCategory = async (categoryId, name) => {
        if (!user?.id) return
        if (!confirm(`¿Eliminar la categoría "${name}"?\n\nLos gastos existentes con esta categoría mantendrán su nombre.`)) {
            return
        }
        const { error } = await supabase
            .from('user_categories')
            .delete()
            .eq('id', categoryId)
        if (!error) {
            setCustomCategories(prev => prev.filter(c => c.id !== categoryId))
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        // Validar que la fecha no sea de un mes anterior (comparando YYYY-MM)
        const selectedDateStr = formData.date.substring(0, 7) // "YYYY-MM"
        const today = new Date()
        const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

        if (selectedDateStr < currentMonth) {
            alert('No se pueden agregar gastos de meses anteriores al actual')
            return
        }

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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
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
                                <label className="label flex items-center justify-between">
                                    <span>Categoría</span>
                                    <div className="flex gap-2">
                                        {customCategories.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setShowManageCategories(true)}
                                                className="text-xs text-gray-400 hover:text-white"
                                                title="Gestionar categorías"
                                            >
                                                ⚙️
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setShowAddCategory(true)}
                                            className="text-xs text-primary-400 hover:text-primary-300"
                                        >
                                            + Nueva
                                        </button>
                                    </div>
                                </label>
                                {showAddCategory ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            placeholder="Nombre"
                                            className="input-field flex-1"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCategory}
                                            className="px-3 bg-green-500/20 text-green-400 rounded-lg"
                                        >
                                            ✓
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setShowAddCategory(false); setNewCategoryName('') }}
                                            className="px-3 bg-red-500/20 text-red-400 rounded-lg"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="input-field"
                                    >
                                        {allCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="label">Fecha</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    min={new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]}
                                    className="input-field"
                                />
                                <p className="text-xs text-gray-500 mt-1">Solo mes actual o futuros</p>
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
                            <div className="animate-fade-in space-y-4">
                                <div className="grid grid-cols-2 gap-4">
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
                                            <option value="1">Sin cuotas</option>
                                            {Array.from({ length: 35 }, (_, i) => i + 2).map(n => (
                                                <option key={n} value={n}>{n} cuotas</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {/* Mes de inicio de primera cuota */}
                                <div>
                                    <label className="label">¿Cuándo pagás la primera cuota?</label>
                                    <select
                                        value={formData.month}
                                        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                        className="input-field"
                                    >
                                        {(() => {
                                            const options = []
                                            const now = new Date()
                                            for (let i = 0; i <= 3; i++) {
                                                const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
                                                const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                                const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
                                                options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
                                            }
                                            return options.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))
                                        })()}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Según el cierre de tu tarjeta</p>
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

            {/* Modal para gestionar categorías */}
            {showManageCategories && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
                    <div className="glass help-section w-full max-w-sm">
                        <div className="p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-white">⚙️ Mis Categorías</h3>
                                <button
                                    onClick={() => { setShowManageCategories(false); setEditingCategory(null) }}
                                    className="text-gray-400 hover:text-white text-xl"
                                >
                                    ×
                                </button>
                            </div>

                            {customCategories.length === 0 ? (
                                <p className="text-gray-400 text-sm">No tenés categorías personalizadas.</p>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {customCategories.map(cat => (
                                        <div key={cat.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                                            {editingCategory === cat.id ? (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={editCategoryName}
                                                        onChange={(e) => setEditCategoryName(e.target.value)}
                                                        className="input-field flex-1 py-1 text-sm"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleEditCategory(cat.id, cat.name, editCategoryName)
                                                            if (e.key === 'Escape') setEditingCategory(null)
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleEditCategory(cat.id, cat.name, editCategoryName)}
                                                        className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingCategory(null)}
                                                        className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm"
                                                    >
                                                        ×
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="flex-1 text-white text-sm">{cat.name}</span>
                                                    <button
                                                        onClick={() => { setEditingCategory(cat.id); setEditCategoryName(cat.name) }}
                                                        className="px-2 py-1 text-gray-400 hover:text-white text-sm"
                                                        title="Editar"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                        className="px-2 py-1 text-gray-400 hover:text-red-400 text-sm"
                                                        title="Eliminar"
                                                    >
                                                        🗑️
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => { setShowManageCategories(false); setEditingCategory(null) }}
                                className="btn-primary w-full mt-4"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
