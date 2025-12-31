import { useState, useEffect } from 'react'
import {
    Plus,
    LogOut,
    Share2,
    CreditCard,
    Calendar,
    History,
    RefreshCw,
    Check,
    Trash2,
    ArrowLeft,
    Users,
    FileText
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calculateAllTotals, getCurrentMonth, getMonthName } from '../utils/calculations'
import { generateWhatsAppSummary, copyToClipboard } from '../utils/export'
import TotalsCard from './TotalsCard'
import ExpenseCard from './ExpenseCard'
import ExpenseForm from './ExpenseForm'
import { HelpButton } from './HelpPage'
import CardManager from './CardManager'
import CategoryChart from './CategoryChart'
import PeopleManager from './PeopleManager'
import ConfirmModal from './ConfirmModal'
import ReportModal from './ReportModal'

export default function Dashboard({ section = 'family', user, onBack, onLogout }) {
    // Configuración según sección
    const sectionConfig = {
        personal: { title: '💰 Gastos Personales', icon: '💰' },
        family: { title: '👨‍👩‍👧‍👦 Gastos Familiares', icon: '👨‍👩‍👧‍👦' }
    }
    const config = sectionConfig[section] || sectionConfig.family
    const [expenses, setExpenses] = useState([])
    const [cards, setCards] = useState([])
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState('current') // 'current' o 'history'
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
    const [showExpenseForm, setShowExpenseForm] = useState(false)
    const [showCardManager, setShowCardManager] = useState(false)
    const [showPeopleManager, setShowPeopleManager] = useState(false)
    const [editingExpense, setEditingExpense] = useState(null)
    const [toast, setToast] = useState(null)
    const [people, setPeople] = useState([])
    const [confirmDelete, setConfirmDelete] = useState(null) // Expense a eliminar
    const [showReportModal, setShowReportModal] = useState(false)

    const currentMonth = getCurrentMonth()
    // Solo es de solo lectura cuando estamos explícitamente en modo histórico
    const isReadOnly = viewMode === 'history'

    // Cargar datos iniciales
    useEffect(() => {
        loadCards()
        loadExpenses(currentMonth)
        loadPeople()
    }, [])

    // Auto-refresh cuando el usuario vuelve a la app
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Recargar datos cuando la app vuelve a estar visible
                loadCards()
                loadExpenses(viewMode === 'current' ? currentMonth : selectedMonth)
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [viewMode, selectedMonth, currentMonth])

    // Cargar gastos cuando cambia el mes seleccionado
    useEffect(() => {
        loadExpenses(viewMode === 'current' ? currentMonth : selectedMonth)
    }, [viewMode, selectedMonth])

    // Sincronizar mes seleccionado cuando se cambia a modo histórico
    useEffect(() => {
        if (viewMode === 'history') {
            // Generar el primer mes del histórico (mes anterior al actual)
            const now = new Date()
            const date = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const firstHistoryMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            setSelectedMonth(firstHistoryMonth)
        }
    }, [viewMode])

    // Manejar botón "atrás" del celular para cerrar modales
    useEffect(() => {
        const handlePopState = (e) => {
            // Si hay algún modal abierto, cerrarlo
            if (showExpenseForm) {
                e.preventDefault()
                setShowExpenseForm(false)
                setEditingExpense(null)
                // Agregar una entrada de vuelta al historial
                window.history.pushState({ modal: 'closed' }, '')
            } else if (showCardManager) {
                e.preventDefault()
                setShowCardManager(false)
                window.history.pushState({ modal: 'closed' }, '')
            }
        }

        // Agregar entrada al historial cuando se abre un modal
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

    // ========== CRUD OPERATIONS ==========

    // Convertir mes (formato YYYY-MM) a rango de fechas
    const getMonthDateRange = (month) => {
        // month es algo como "2025-12" o "2025-11"
        const [year, monthNum] = month.split('-').map(Number)

        const startDate = new Date(year, monthNum - 1, 1) // monthNum - 1 porque Date usa 0-11
        const endDate = new Date(year, monthNum, 0) // Día 0 del mes siguiente = último día del mes actual

        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        }
    }

    const loadExpenses = async (month) => {
        setLoading(true)
        try {
            // Obtener rango de fechas del mes
            const { start, end } = getMonthDateRange(month)

            let query = supabase
                .from('expenses')
                .select('*')
                .gte('date', start)  // Fecha >= inicio del mes
                .lte('date', end)    // Fecha <= fin del mes
                .neq('section', 'personal')  // Excluir gastos personales
                .order('date', { ascending: false })

            // En mes actual: solo mostrar gastos activos
            // En histórico: mostrar todos (activos y completados)
            if (viewMode === 'current' && month === currentMonth) {
                query = query.or('status.is.null,status.eq.active')
            }

            const { data, error } = await query

            if (error) throw error
            setExpenses(data || [])
        } catch (error) {
            console.error('Error loading expenses:', error)
            showToast('Error al cargar gastos')
        }
        setLoading(false)
    }

    const loadCards = async () => {
        try {
            const { data, error } = await supabase
                .from('cards')
                .select('*')
                .eq('section', 'family')  // Solo tarjetas familiares
                .order('created_at', { ascending: true })

            if (error) throw error
            setCards(data || [])
        } catch (error) {
            console.error('Error loading cards:', error)
        }
    }

    const loadPeople = async () => {
        try {
            // Cargar desde family_members (nuevo sistema por email)
            const { data: familyData, error: familyError } = await supabase
                .from('family_members')
                .select('*')
                .eq('owner_id', user?.id)
                .order('created_at', { ascending: true })

            if (familyError) {
                // Si la tabla no existe o hay error, caer al sistema viejo
                console.warn('family_members error, using old people table:', familyError.message)
                const { data, error } = await supabase
                    .from('people')
                    .select('*')
                    .eq('group_type', 'family')
                    .order('created_at', { ascending: true })
                if (error) throw error

                // Agregar al usuario actual como primera opción
                const ownerPerson = {
                    id: 'owner',
                    name: 'Yo',
                    member_email: user?.email,
                    member_id: user?.id,
                    isOwner: true
                }
                setPeople([ownerPerson, ...(data || [])])
                return
            }

            // Transformar datos para compatibilidad
            const transformed = (familyData || []).map(fm => ({
                id: fm.id,
                name: fm.member_name || fm.member_email?.split('@')[0],
                member_email: fm.member_email,
                member_id: fm.member_id
            }))

            // Agregar al usuario actual (dueño) como primera opción
            const ownerPerson = {
                id: 'owner',
                name: 'Yo',
                member_email: user?.email,
                member_id: user?.id,
                isOwner: true
            }
            setPeople([ownerPerson, ...transformed])
        } catch (error) {
            console.error('Error loading people:', error)
            // Aunque haya error, agregar al propietario
            const ownerPerson = {
                id: 'owner',
                name: 'Yo',
                member_email: user?.email,
                member_id: user?.id,
                isOwner: true
            }
            setPeople([ownerPerson])
        }
    }

    // Buscar usuario por email usando la función de Supabase
    const handleSearchEmail = async (email) => {
        try {
            const { data, error } = await supabase
                .rpc('search_user_by_email', { search_email: email })

            if (error) {
                console.error('Search error:', error)
                // Fallback: buscar directo en user_subscriptions
                const { data: subData, error: subError } = await supabase
                    .from('user_subscriptions')
                    .select('user_id, email, status')
                    .ilike('email', email)
                    .single()

                if (subError || !subData) {
                    return { found: false, error: 'Email no registrado en la app' }
                }

                if (!['active', 'admin', 'free'].includes(subData.status)) {
                    return { found: false, error: 'Este usuario no tiene suscripción activa' }
                }

                return { found: true, user: subData }
            }

            if (!data || data.length === 0) {
                return { found: false, error: 'Email no registrado en la app' }
            }

            const userData = data[0]
            if (!userData.is_valid) {
                return { found: false, error: 'Este usuario no tiene suscripción activa' }
            }

            return { found: true, user: userData }
        } catch (error) {
            console.error('Error searching user:', error)
            return { found: false, error: 'Error al buscar usuario' }
        }
    }

    const handleAddPerson = async (memberData) => {
        try {
            const { error } = await supabase
                .from('family_members')
                .insert([{
                    owner_id: user?.id,
                    member_id: memberData.member_id,
                    member_email: memberData.member_email,
                    member_name: memberData.member_name
                }])
            if (error) throw error
            await loadPeople()
            showToast('✅ Familiar agregado')
        } catch (error) {
            console.error('Error adding family member:', error)
            showToast('❌ Error al agregar')
        }
    }

    const handleDeletePerson = async (personId) => {
        if (!window.confirm('¿Eliminar este familiar?')) return
        try {
            const { error } = await supabase
                .from('family_members')
                .delete()
                .eq('id', personId)
            if (error) throw error
            await loadPeople()
            showToast('🗑️ Familiar eliminado')
        } catch (error) {
            console.error('Error deleting person:', error)
            showToast('❌ Error al eliminar')
        }
    }

    const handleSubmitExpense = async (expenseData, expenseId) => {
        try {
            if (expenseId) {
                // Actualizar
                const { error } = await supabase
                    .from('expenses')
                    .update(expenseData)
                    .eq('id', expenseId)

                if (error) throw error
                showToast('✅ Gasto actualizado')
            } else {
                // Crear con user_id
                const { error } = await supabase
                    .from('expenses')
                    .insert([{ ...expenseData, user_id: user?.id }])

                if (error) throw error
                showToast('✅ Gasto agregado')
            }

            await loadExpenses(currentMonth)
            setShowExpenseForm(false)
            setEditingExpense(null)
        } catch (error) {
            console.error('Error saving expense:', error)
            showToast('❌ Error al guardar')
        }
    }

    const handleDeleteExpense = (expense) => {
        // Mostrar modal de confirmación
        setConfirmDelete(expense)
    }

    const confirmDeleteExpense = async () => {
        const expense = confirmDelete
        if (!expense?.id) return

        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expense.id)

            if (error) throw error
            showToast('🗑️ Gasto eliminado')
            await loadExpenses(viewMode === 'current' ? currentMonth : selectedMonth)
        } catch (error) {
            console.error('Error deleting expense:', error)
            showToast('❌ Error al eliminar')
        }
        setConfirmDelete(null)
    }

    const handleMarkPaid = async (expense) => {
        const isLast = expense.current_installment === expense.installments

        if (isLast) {
            // Última cuota: marcar como completado
            try {
                const { error } = await supabase
                    .from('expenses')
                    .update({
                        current_installment: expense.installments,
                        status: 'completed'
                    })
                    .eq('id', expense.id)

                if (error) throw error
                showToast('🎉 ¡Gasto finalizado!')
                await loadExpenses(currentMonth)
            } catch (error) {
                console.error('Error:', error)
                showToast('❌ Error')
            }
        } else {
            // Incrementar cuota
            try {
                const { error } = await supabase
                    .from('expenses')
                    .update({ current_installment: expense.current_installment + 1 })
                    .eq('id', expense.id)

                if (error) throw error
                showToast(`✅ Cuota ${expense.current_installment + 1} marcada`)
                await loadExpenses(currentMonth)
            } catch (error) {
                console.error('Error:', error)
                showToast('❌ Error')
            }
        }
    }

    const handleAddCard = async (name) => {
        try {
            const { error } = await supabase
                .from('cards')
                .insert([{
                    name,
                    user_id: user?.id,
                    section: 'family'  // Marcar como tarjeta familiar
                }])

            if (error) throw error
            showToast('✅ Tarjeta agregada')
            await loadCards()
        } catch (error) {
            console.error('Error adding card:', error)
            showToast('❌ Error al agregar tarjeta')
        }
    }

    const handleDeleteCard = async (cardId) => {
        try {
            const { error } = await supabase
                .from('cards')
                .delete()
                .eq('id', cardId)

            if (error) throw error
            showToast('🗑️ Tarjeta eliminada')
            await loadCards()
        } catch (error) {
            console.error('Error deleting card:', error)
            showToast('❌ Error al eliminar tarjeta')
        }
    }

    const handleShare = async () => {
        const summary = generateWhatsAppSummary(
            expenses,
            viewMode === 'current' ? currentMonth : selectedMonth
        )
        await copyToClipboard(summary)
        showToast('📋 Copiado al portapapeles')
    }

    const handleClearMonth = async () => {
        const monthToClear = selectedMonth
        const monthName = getMonthName(monthToClear)

        if (!window.confirm(`⚠️ ¿Estás seguro de eliminar TODOS los gastos de ${monthName}?\n\nEsta acción no se puede deshacer.`)) {
            return
        }

        // Segunda confirmación para evitar errores
        if (!window.confirm(`🗑️ Confirmar: Se eliminarán ${expenses.length} gastos de ${monthName}`)) {
            return
        }

        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('month', monthToClear)

            if (error) throw error
            showToast(`🗑️ ${expenses.length} gastos eliminados de ${monthName}`)
            await loadExpenses(monthToClear)
        } catch (error) {
            console.error('Error clearing month:', error)
            showToast('❌ Error al limpiar el mes')
        }
    }

    const handleEditExpense = (expense) => {
        setEditingExpense(expense)
        setShowExpenseForm(true)
    }


    // Calcular totales
    const totals = calculateAllTotals(expenses)

    // Generar lista de meses para el histórico
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
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                title="Volver"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-400" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white">
                                {config.title}
                            </h1>
                            <p className="text-gray-400">
                                {getMonthName(viewMode === 'current' ? currentMonth : selectedMonth)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <HelpButton section="family" />
                        <button
                            onClick={() => loadExpenses(viewMode === 'current' ? currentMonth : selectedMonth)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Actualizar"
                        >
                            <RefreshCw className="w-5 h-5 text-gray-400" />
                        </button>
                        <button
                            onClick={() => setShowPeopleManager(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Users className="w-4 h-4" />
                            <span className="hidden sm:inline">Miembros</span>
                        </button>
                        <button
                            onClick={() => setShowCardManager(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <CreditCard className="w-4 h-4" />
                            <span className="hidden sm:inline">Tarjetas</span>
                        </button>
                        <button
                            onClick={onLogout}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Salir"
                        >
                            <LogOut className="w-5 h-5 text-gray-400" />
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

                {/* Selector de mes (solo en histórico) */}
                {viewMode === 'history' && (
                    <div className="mb-6 animate-fade-in flex flex-wrap items-center gap-3">
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

                        {expenses.length > 0 && (
                            <button
                                onClick={handleClearMonth}
                                className="btn-danger text-sm flex items-center gap-2"
                                title="Eliminar todos los gastos de este mes"
                            >
                                <Trash2 className="w-4 h-4" />
                                Limpiar Mes ({expenses.length})
                            </button>
                        )}
                    </div>
                )}

                {/* Totales */}
                <TotalsCard
                    expenses={expenses}
                    people={people}
                    monthName={getMonthName(viewMode === 'current' ? currentMonth : selectedMonth)}
                />

                {/* Gráfico por categoría */}
                {expenses.length > 0 && (
                    <CategoryChart expenses={expenses} />
                )}

                {/* Acciones */}
                <div className="flex flex-wrap gap-3 mb-6">
                    {!isReadOnly && (
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
                    )}
                    <button
                        onClick={() => setShowReportModal(true)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Ver Reporte
                    </button>
                    <button
                        onClick={handleShare}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <Share2 className="w-4 h-4" />
                        Compartir por WhatsApp
                    </button>
                </div>

                {/* Aviso solo lectura */}
                {isReadOnly && (
                    <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-3 mb-6 text-amber-200 text-sm">
                        📅 Estás viendo un mes anterior. Los gastos son de solo lectura.
                    </div>
                )}

                {/* Lista de gastos */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="spinner" />
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="text-4xl mb-4">📭</div>
                            <p>No hay gastos registrados este mes</p>
                        </div>
                    ) : (
                        expenses.map(expense => (
                            <ExpenseCard
                                key={expense.id}
                                expense={expense}
                                onEdit={handleEditExpense}
                                onDelete={handleDeleteExpense}
                                onMarkPaid={handleMarkPaid}
                                isReadOnly={isReadOnly}
                            />
                        ))
                    )}
                </div>

                {/* Modales */}
                {showExpenseForm && (
                    <ExpenseForm
                        expense={editingExpense}
                        cards={cards}
                        people={people}
                        onSubmit={handleSubmitExpense}
                        onAddCard={handleAddCard}
                        onClose={() => {
                            setShowExpenseForm(false)
                            setEditingExpense(null)
                        }}
                    />
                )}

                {showCardManager && (
                    <CardManager
                        cards={cards}
                        onAddCard={handleAddCard}
                        onDeleteCard={handleDeleteCard}
                        onClose={() => setShowCardManager(false)}
                    />
                )}

                {showPeopleManager && (
                    <PeopleManager
                        people={people}
                        currentUserEmail={user?.email}
                        onSearchEmail={handleSearchEmail}
                        onAddPerson={handleAddPerson}
                        onDeletePerson={handleDeletePerson}
                        onClose={() => setShowPeopleManager(false)}
                    />
                )}

                {/* Modal de confirmación para eliminar */}
                <ConfirmModal
                    isOpen={confirmDelete !== null}
                    title="¿Eliminar gasto?"
                    message={`¿Estás seguro de eliminar "${confirmDelete?.description || ''}"? Esta acción no se puede deshacer.`}
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    type="danger"
                    onConfirm={confirmDeleteExpense}
                    onCancel={() => setConfirmDelete(null)}
                />

                {/* Toast */}
                {toast && (
                    <div className="toast flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        {toast}
                    </div>
                )}

                {/* Modal de Reporte */}
                {showReportModal && (
                    <ReportModal
                        cards={cards}
                        onClose={() => setShowReportModal(false)}
                    />
                )}
            </div>
        </div>
    )
}
