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
    FileText,
    Search,
    X
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
        personal: { title: 'Gastos Personales', icon: null },
        family: { title: 'Gastos Familiares', icon: null }
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
    const [deletedLog, setDeletedLog] = useState([])
    const [showDeletedLog, setShowDeletedLog] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    const currentMonth = getCurrentMonth()
    // Solo es de solo lectura cuando estamos explícitamente en modo histórico
    const isReadOnly = viewMode === 'history'

    // Cargar datos iniciales
    useEffect(() => {
        if (user?.id) {
            loadCards()
            loadExpenses(currentMonth)
            loadPeople()
        }
    }, [user?.id])

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
    // Convertir mes (formato YYYY-MM) a rango de fechas
    const getMonthDateRange = (month) => {
        // month es algo como "2025-12" o "2025-11"
        const [year, monthNum] = month.split('-').map(Number)

        // Construcción segura de strings de fecha YYYY-MM-DD
        const start = `${year}-${String(monthNum).padStart(2, '0')}-01`

        const lastDay = new Date(year, monthNum, 0).getDate()
        const end = `${year}-${String(monthNum).padStart(2, '0')}-${lastDay}`

        return { start, end }
    }

    const loadExpenses = async (month) => {
        if (!user?.id) return
        setLoading(true)
        try {
            // Obtener rango de fechas del mes solicitado
            const { start, end } = getMonthDateRange(month)
            const requestedDate = new Date(start)

            // Obtener IDs de todos los miembros del grupo familiar
            // 1. Grupos donde soy miembro (buscar mis owners)
            const { data: myMemberships } = await supabase
                .from('family_members')
                .select('owner_id')
                .eq('member_id', user?.id)

            const relevantOwnerIds = new Set([user?.id])
            if (myMemberships) {
                myMemberships.forEach(m => {
                    if (m.owner_id) relevantOwnerIds.add(m.owner_id)
                })
            }

            // 2. Miembros de esos grupos (mis hijos + mis hermanos de grupo)
            const { data: groupMembers } = await supabase
                .from('family_members')
                .select('member_id')
                .in('owner_id', Array.from(relevantOwnerIds))

            const allFamilyIds = new Set(relevantOwnerIds)
            if (groupMembers) {
                groupMembers.forEach(m => {
                    if (m.member_id) allFamilyIds.add(m.member_id)
                })
            }

            const familyMemberIds = Array.from(allFamilyIds)
            console.log('Loading family expenses for IDs:', familyMemberIds)

            // Query 1: Gastos del mes solicitado (de todo el grupo familiar)
            let query = supabase
                .from('expenses')
                .select('*')
                .in('user_id', familyMemberIds)
                .gte('date', start)
                .lte('date', end)
                .neq('section', 'personal')
                .order('date', { ascending: false })

            if (viewMode === 'current' && month === currentMonth) {
                query = query.or('status.is.null,status.eq.active')
            }

            const { data: monthExpenses, error: error1 } = await query

            if (error1) throw error1

            // Query 2: Gastos en cuotas de meses anteriores que tienen cuotas en el mes actual
            // Traemos gastos con installments > 1 de hasta 24 meses atrás
            const pastDate = new Date(requestedDate)
            pastDate.setMonth(pastDate.getMonth() - 24)
            const pastStart = pastDate.toISOString().split('T')[0]

            const { data: installmentExpenses, error: error2 } = await supabase
                .from('expenses')
                .select('*')
                .in('user_id', familyMemberIds)
                .lt('date', start) // Fecha anterior al mes solicitado
                .gte('date', pastStart) // Pero no más de 24 meses atrás
                .gt('installments', 1) // Solo gastos con cuotas
                .neq('section', 'personal')
                .or('status.is.null,status.eq.active')

            if (error2) throw error2

            // Procesar gastos en cuotas para calcular cuál cuota corresponde al mes solicitado
            const processedInstallments = (installmentExpenses || []).filter(exp => {
                // Parsear fecha del gasto como fecha local (evitar UTC)
                const [expYear, expMonth] = exp.date.substring(0, 7).split('-').map(Number)
                // Parsear fecha del mes solicitado
                const [reqYear, reqMonth] = month.split('-').map(Number)

                // Calcular cuántos meses han pasado desde la fecha original
                const monthsDiff = (reqYear - expYear) * 12 + (reqMonth - expMonth)

                // La cuota que corresponde a este mes
                const cuotaForThisMonth = (exp.current_installment || 1) + monthsDiff

                // Solo incluir si la cuota está dentro del rango de cuotas totales
                if (cuotaForThisMonth >= 1 && cuotaForThisMonth <= exp.installments) {
                    // Agregar la cuota calculada al expense para mostrar
                    exp._calculatedInstallment = cuotaForThisMonth
                    return true
                }
                return false
            })

            // Combinar gastos del mes + cuotas de meses anteriores
            const allExpenses = [...(monthExpenses || []), ...processedInstallments]

            // Ordenar por fecha descendente
            allExpenses.sort((a, b) => new Date(b.date) - new Date(a.date))

            setExpenses(allExpenses)
        } catch (error) {
            console.error('Error loading expenses:', error)
            showToast('Error al cargar gastos: ' + (error.message || 'Error desconocido'))
        }
        setLoading(false)
    }

    const loadCards = async () => {
        if (!user?.id) return
        try {
            // Reutilizar lógica para obtener IDs de familia
            // 1. Grupos donde soy miembro (buscar mis owners)
            const { data: myMemberships } = await supabase
                .from('family_members')
                .select('owner_id')
                .eq('member_id', user?.id)

            const relevantOwnerIds = new Set([user?.id])
            if (myMemberships) {
                myMemberships.forEach(m => {
                    if (m.owner_id) relevantOwnerIds.add(m.owner_id)
                })
            }

            // 2. Miembros de esos grupos
            const { data: groupMembers } = await supabase
                .from('family_members')
                .select('member_id')
                .in('owner_id', Array.from(relevantOwnerIds))

            const allFamilyIds = new Set(relevantOwnerIds)
            if (groupMembers) {
                groupMembers.forEach(m => {
                    if (m.member_id) allFamilyIds.add(m.member_id)
                })
            }

            const familyMemberIds = Array.from(allFamilyIds)

            const { data, error } = await supabase
                .from('cards')
                .select('*')
                .in('user_id', familyMemberIds)  // Filtrar por todos los miembros
                .eq('section', 'family')
                .order('created_at', { ascending: true })

            if (error) throw error
            setCards(data || [])
        } catch (error) {
            console.error('Error loading cards:', error)
        }
    }

    const loadPeople = async () => {
        if (!user?.id) return
        try {
            // Cargar miembros de dos formas:
            // 1. Grupos que YO creé (soy owner)
            // 2. Grupos donde ME invitaron (soy member)

            // Primero: obtener los owner_ids de los grupos donde yo soy miembro
            const { data: myMemberships, error: membershipError } = await supabase
                .from('family_members')
                .select('owner_id')
                .eq('member_id', user?.id)

            // Construir lista de owner_ids a consultar (incluye mi propio id)
            const ownerIds = [user?.id]
            if (!membershipError && myMemberships) {
                myMemberships.forEach(m => {
                    if (m.owner_id && !ownerIds.includes(m.owner_id)) {
                        ownerIds.push(m.owner_id)
                    }
                })
            }

            // Cargar info de dueños de grupos (para mostrar nombre real en lugar de 'Yo')
            let ownersMapped = []
            try {
                const { data: ownersInfo } = await supabase
                    .from('user_subscriptions')
                    .select('user_id, email')
                    .in('user_id', ownerIds)

                if (ownersInfo) {
                    ownersMapped = ownersInfo
                        .filter(u => u.user_id !== user?.id) // Excluir al usuario actual (ya manejado)
                        .map(u => ({
                            id: u.user_id,
                            name: u.email.split('@')[0],
                            member_email: u.email,
                            member_id: u.user_id
                        }))
                }
            } catch (err) {
                console.error('Error loading owners:', err)
            }

            // Cargar todos los miembros de esos grupos
            const { data: familyData, error: familyError } = await supabase
                .from('family_members')
                .select('*')
                .in('owner_id', ownerIds)
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

            // Transformar datos para compatibilidad (eliminar duplicados)
            const seen = new Set()
            const transformed = (familyData || [])
                .filter(fm => {
                    if (seen.has(fm.member_id)) return false
                    seen.add(fm.member_id)
                    return true
                })
                .map(fm => ({
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
            // Unificar listas evitando duplicados, y EXCLUIR al usuario actual (ya está como "Yo")
            const uniquePeople = [...ownersMapped, ...transformed]
                .filter((person, index, self) =>
                    index === self.findIndex((p) => p.member_id === person.member_id)
                )
                .filter(person => person.member_id !== user?.id) // Excluir usuario actual (ya agregado como "Yo")
            setPeople([ownerPerson, ...uniquePeople])
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

    const loadDeletedLog = async () => {
        try {
            // Obtener IDs del grupo familiar
            const { data: myMemberships } = await supabase
                .from('family_members')
                .select('owner_id')
                .eq('member_id', user?.id)

            const familyMemberIds = [user?.id]
            if (myMemberships) {
                myMemberships.forEach(m => {
                    if (m.owner_id && !familyMemberIds.includes(m.owner_id)) {
                        familyMemberIds.push(m.owner_id)
                    }
                })
            }

            // Cargar eliminaciones del mes actual
            const { start } = getMonthDateRange(currentMonth)
            const { data, error } = await supabase
                .from('deleted_expenses_log')
                .select('*')
                .in('owner_id', familyMemberIds)
                .gte('deleted_at', start)
                .order('deleted_at', { ascending: false })

            if (error) throw error
            setDeletedLog(data || [])
        } catch (error) {
            console.error('Error loading deleted log:', error)
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
        // Verificar permisos ANTES de mostrar el modal
        // Si el gasto tiene user_id y no es del usuario actual, bloquear
        if (expense.user_id && expense.user_id !== user?.id) {
            showToast('⚠️ Solo quien creó el gasto puede eliminarlo')
            return
        }
        // Mostrar modal de confirmación
        setConfirmDelete(expense)
    }

    const confirmDeleteExpense = async () => {
        const expense = confirmDelete
        if (!expense?.id) return

        try {
            // Registrar en historial de eliminaciones
            // Obtener nombre del usuario desde people
            const currentUserPerson = people.find(p => p.member_id === user.id || p.isOwner)
            const userName = currentUserPerson?.name || user.email?.split('@')[0] || 'Usuario'

            const logData = {
                expense_description: expense.description,
                expense_amount: expense.total_amount,
                expense_date: expense.date,
                deleted_by_id: user.id,
                deleted_by_name: userName,
                owner_id: expense.user_id
            }
            await supabase.from('deleted_expenses_log').insert([logData])

            // Eliminar el gasto
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
        // Verificar permisos - solo el creador puede editar
        // Si el gasto tiene user_id y no es del usuario actual, bloquear
        if (expense.user_id && expense.user_id !== user?.id) {
            showToast('⚠️ Solo quien creó el gasto puede editarlo')
            return
        }
        setEditingExpense(expense)
        setShowExpenseForm(true)
    }


    // Calcular totales
    const totals = calculateAllTotals(expenses)

    // Filtrar gastos
    const filteredExpenses = expenses.filter(expense => {
        if (!searchTerm) return true
        const searchLower = searchTerm.toLowerCase()
        return (
            expense.description.toLowerCase().includes(searchLower) ||
            expense.category.toLowerCase().includes(searchLower) ||
            (expense.created_by_name && expense.created_by_name.toLowerCase().includes(searchLower)) ||
            (expense.payment_method && expense.payment_method.toLowerCase().includes(searchLower))
        )
    })

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
                            <h1 className="text-2xl md:text-3xl font-bold text-theme-primary">
                                {config.title}
                            </h1>
                            <p className="text-theme-secondary">
                                {getMonthName(viewMode === 'current' ? currentMonth : selectedMonth)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <HelpButton section="family" />
                        <button
                            onClick={() => loadExpenses(viewMode === 'current' ? currentMonth : selectedMonth)}
                            className="p-2 hover:bg-[var(--glass-card-hover)] rounded-lg transition-colors"
                            title="Actualizar"
                        >
                            <RefreshCw className="w-5 h-5 text-theme-secondary" />
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
                            className="p-2 hover:bg-[var(--glass-card-hover)] rounded-lg transition-colors"
                            title="Salir"
                        >
                            <LogOut className="w-5 h-5 text-theme-secondary" />
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
                    <button
                        onClick={() => { loadDeletedLog(); setShowDeletedLog(true) }}
                        className="tab-button flex items-center gap-2 ml-auto"
                        title="Ver gastos eliminados"
                    >
                        🗑️ Papelera
                    </button>
                </div>

                {/* Selector de mes (solo en histórico) */}
                {viewMode === 'history' && (
                    <div className="mb-6 animate-fade-in">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
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
                        <p className="text-xs text-theme-secondary">📅 Histórico disponible: últimos 12 meses</p>
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
                <div className="flex flex-wrap items-center gap-3 mb-6">
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

                    {/* Buscador */}
                    <div className="relative w-48">
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
                    ) : filteredExpenses.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="text-4xl mb-4">{searchTerm ? '🔍' : '📭'}</div>
                            <p>{searchTerm ? `No hay resultados para "${searchTerm}"` : 'No hay gastos registrados este mes'}</p>
                        </div>
                    ) : (
                        filteredExpenses.map(expense => (
                            <ExpenseCard
                                key={expense.id}
                                expense={expense}
                                people={people}
                                user={user}
                                onEdit={handleEditExpense}
                                onDelete={handleDeleteExpense}
                                onMarkPaid={handleMarkPaid}
                                isReadOnly={isReadOnly}
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                <footer className="mt-8 text-center text-gray-500 text-sm pb-4">
                    <p>Powered by <span className="text-[#E6D5B8]">AMG Digital</span></p>
                </footer>

                {/* Modales */}
                {showExpenseForm && (
                    <ExpenseForm
                        expense={editingExpense}
                        cards={cards}
                        people={people}
                        user={user}
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
                        people={people}
                        user={user}
                        section="family"
                        onClose={() => setShowReportModal(false)}
                    />
                )}

                {/* Modal historial de eliminados */}
                {showDeletedLog && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
                        <div className="glass w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Trash2 className="w-5 h-5" />
                                    Gastos Eliminados del Mes
                                </h3>
                                <button
                                    onClick={() => setShowDeletedLog(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg"
                                >
                                    ✕
                                </button>
                            </div>
                            {deletedLog.length === 0 ? (
                                <p className="text-gray-400 text-center py-8">
                                    No hay gastos eliminados este mes
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {deletedLog.map(log => (
                                        <div key={log.id} className="p-3 bg-white/5 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-red-400 line-through">{log.expense_description}</span>
                                                    <span className="text-gray-500 ml-2">${log.expense_amount?.toLocaleString('es-AR')}</span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Eliminado por <span className="text-orange-400">{log.deleted_by_name}</span> el {new Date(log.deleted_at).toLocaleDateString('es-AR')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={() => setShowDeletedLog(false)}
                                className="btn-secondary w-full mt-4"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
