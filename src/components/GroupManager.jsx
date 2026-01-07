import { useState, useEffect } from 'react'
import { Plus, ArrowLeft, Users, Share2, Calendar, ChevronRight, Trash2, X, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Generar código único de 8 caracteres
function generateShareCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

// Formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export default function GroupManager({ user, onBack }) {
    const [groups, setGroups] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState(null)
    const [toast, setToast] = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(null) // grupo a eliminar

    // Formulario nuevo grupo
    const [newGroupName, setNewGroupName] = useState('')
    const [newGroupDescription, setNewGroupDescription] = useState('')

    useEffect(() => {
        loadGroups()
    }, [])

    const showToast = (message) => {
        setToast(message)
        setTimeout(() => setToast(null), 3000)
    }

    const loadGroups = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('groups')
                .select('*')
                .eq('user_id', user?.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })

            if (error) throw error
            setGroups(data || [])
        } catch (error) {
            console.error('Error loading groups:', error)
        }
        setLoading(false)
    }

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return

        try {
            const shareCode = generateShareCode()
            const { data, error } = await supabase
                .from('groups')
                .insert([{
                    name: newGroupName.trim(),
                    description: newGroupDescription.trim() || null,
                    share_code: shareCode,
                    created_by: 'owner',
                    user_id: user?.id
                }])
                .select()
                .single()

            if (error) throw error

            showToast('✅ Evento creado')
            setNewGroupName('')
            setNewGroupDescription('')
            setShowCreateForm(false)
            await loadGroups()

            // Abrir el grupo recién creado
            setSelectedGroup(data)
        } catch (error) {
            console.error('Error creating group:', error)
            showToast('❌ Error al crear')
        }
    }

    const handleDeleteGroup = async (groupId) => {
        try {
            const { error } = await supabase
                .from('groups')
                .update({ is_active: false })
                .eq('id', groupId)

            if (error) throw error
            showToast('🗑️ Evento eliminado')
            setConfirmDelete(null)
            await loadGroups()
        } catch (error) {
            console.error('Error deleting group:', error)
            showToast('❌ Error al eliminar')
        }
    }

    const handleShareGroup = async (group) => {
        try {
            // Cargar participantes y gastos del grupo
            const [{ data: participants }, { data: expenses }] = await Promise.all([
                supabase.from('group_participants').select('*').eq('group_id', group.id),
                supabase.from('group_expenses').select('*').eq('group_id', group.id)
            ])

            const parts = participants || []
            const exps = expenses || []

            // Calcular balances
            const balances = {}
            parts.forEach(p => balances[p.name] = 0)
            exps.forEach(exp => {
                const splitCount = exp.split_with.length
                const perPerson = exp.amount / splitCount
                const payerInSplit = exp.split_with.includes(exp.paid_by)
                if (balances[exp.paid_by] !== undefined) {
                    balances[exp.paid_by] += payerInSplit ? (exp.amount - perPerson) : exp.amount
                }
                exp.split_with.forEach(name => {
                    if (name !== exp.paid_by && balances[name] !== undefined) {
                        balances[name] -= perPerson
                    }
                })
            })

            // Calcular transferencias
            const debtors = Object.entries(balances).filter(([_, b]) => b < -0.01).map(([name, b]) => ({ name, amount: -b }))
            const creditors = Object.entries(balances).filter(([_, b]) => b > 0.01).map(([name, b]) => ({ name, amount: b }))
            const transfers = []
            debtors.forEach(debtor => {
                let remaining = debtor.amount
                creditors.forEach(creditor => {
                    if (remaining > 0 && creditor.amount > 0) {
                        const transfer = Math.min(remaining, creditor.amount)
                        if (transfer > 0.01) {
                            transfers.push({ from: debtor.name, to: creditor.name, amount: transfer })
                            remaining -= transfer
                            creditor.amount -= transfer
                        }
                    }
                })
            })

            // Total gastado
            const totalExpenses = exps.reduce((sum, e) => sum + e.amount, 0)

            // Construir texto
            let text = `🎉 *${group.name}*\n\n`
            text += `💰 *Total gastado:* $${totalExpenses.toLocaleString('es-AR')}\n\n`

            if (exps.length > 0) {
                text += `📝 *Gastos:*\n`
                exps.forEach(exp => {
                    text += `• ${exp.description}: $${exp.amount.toLocaleString('es-AR')} (pagó ${exp.paid_by})\n`
                })
                text += `\n`
            }

            if (transfers.length > 0) {
                text += `💸 *Quién paga a quién:*\n`
                transfers.forEach(t => {
                    text += `• ${t.from} → ${t.to}: $${Math.round(t.amount).toLocaleString('es-AR')}\n`
                })
            } else if (exps.length > 0) {
                text += `✅ Todos están en $0\n`
            }

            text += `\n_Generado con Gestor de Gastos_`

            if (navigator.share) {
                try {
                    await navigator.share({ title: group.name, text })
                } catch (err) {
                    // Usuario canceló
                }
            } else {
                await navigator.clipboard.writeText(text)
                showToast('📋 Resumen copiado')
            }
        } catch (error) {
            console.error('Error sharing:', error)
            showToast('❌ Error al compartir')
        }
    }

    // Si hay un grupo seleccionado, mostrar su detalle
    if (selectedGroup) {
        return (
            <GroupDetail
                group={selectedGroup}
                onBack={() => setSelectedGroup(null)}
                onShare={() => handleShareGroup(selectedGroup)}
            />
        )
    }

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <header className="flex items-center gap-4 mb-6">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-400" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            Gastos Grupales
                        </h1>
                        <p className="text-gray-400 text-sm">
                            Viajes, asados, regalos y más
                        </p>
                    </div>
                </header>

                {/* Botón crear */}
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="btn-primary flex items-center gap-2 mb-6"
                >
                    <Plus className="w-5 h-5" />
                    Crear Evento
                </button>

                {/* Lista de grupos */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="spinner" />
                    </div>
                ) : groups.length === 0 ? (
                    <div className="glass p-8 text-center">
                        <div className="text-4xl mb-4">🎉</div>
                        <p className="text-gray-400">No tenés eventos aún</p>
                        <p className="text-gray-500 text-sm mt-2">
                            Creá un evento para dividir gastos con amigos
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {groups.map(group => (
                            <div
                                key={group.id}
                                className="glass-card p-4 cursor-pointer hover:scale-[1.01] transition-all"
                                onClick={() => setSelectedGroup(group)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C4B090] to-[#E6D5B8] flex items-center justify-center">
                                        <Users className="w-6 h-6 text-[#2D3E40]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-white truncate">
                                            {group.name}
                                        </h3>
                                        <div className="flex items-center gap-3 text-sm text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(group.created_at)}
                                            </span>
                                            {group.description && (
                                                <span className="truncate">{group.description}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleShareGroup(group)
                                            }}
                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                            title="Compartir"
                                        >
                                            <Share2 className="w-5 h-5 text-gray-400" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setConfirmDelete(group)
                                            }}
                                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-400" />
                                        </button>
                                        <ChevronRight className="w-5 h-5 text-gray-500" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <footer className="mt-8 text-center text-gray-500 text-sm pb-4">
                    <p>Powered by <span className="text-[#E6D5B8]">AMG Digital</span></p>
                </footer>

                {/* Modal crear grupo */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
                        <div className="glass w-full max-w-md">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-semibold text-white">
                                        ➕ Nuevo Evento
                                    </h2>
                                    <button
                                        onClick={() => setShowCreateForm(false)}
                                        className="p-1 text-gray-400 hover:text-white"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Nombre del evento *</label>
                                        <input
                                            type="text"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            placeholder="Ej: Asado fin de año, Viaje a la costa..."
                                            className="input-field"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Descripción (opcional)</label>
                                        <input
                                            type="text"
                                            value={newGroupDescription}
                                            onChange={(e) => setNewGroupDescription(e.target.value)}
                                            placeholder="Ej: 28 de diciembre en lo de Juan"
                                            className="input-field"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setShowCreateForm(false)}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreateGroup}
                                        disabled={!newGroupName.trim()}
                                        className="btn-primary flex-1 disabled:opacity-50"
                                    >
                                        Crear Evento
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal confirmar eliminación */}
                {confirmDelete && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
                        <div className="glass w-full max-w-sm p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">
                                ¿Eliminar "{confirmDelete.name}"?
                            </h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Se eliminarán todos los participantes y gastos del evento. Esta acción no se puede deshacer.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDeleteGroup(confirmDelete.id)}
                                    className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Toast */}
                {toast && (
                    <div className="toast">{toast}</div>
                )}
            </div>
        </div>
    )
}

// Componente para el detalle del grupo
function GroupDetail({ group, onBack, onShare }) {
    const [participants, setParticipants] = useState([])
    const [expenses, setExpenses] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAddExpense, setShowAddExpense] = useState(false)
    const [showAddParticipant, setShowAddParticipant] = useState(false)
    const [newParticipantName, setNewParticipantName] = useState('')
    const [toast, setToast] = useState(null)
    const [editingExpense, setEditingExpense] = useState(null)
    const [confirmDeleteParticipant, setConfirmDeleteParticipant] = useState(null)
    const [newPayerFor, setNewPayerFor] = useState({}) // {expenseId: 'nombreNuevoPagador'}
    const [confirmDeleteExpense, setConfirmDeleteExpense] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [pendingDuplicate, setPendingDuplicate] = useState(null) // gasto duplicado esperando confirmación

    // Formulario gasto
    const [expenseForm, setExpenseForm] = useState({
        description: '',
        amount: '',
        paid_by: '',
        split_with: []
    })

    useEffect(() => {
        loadData()
    }, [group.id])

    const showToast = (msg) => {
        setToast(msg)
        setTimeout(() => setToast(null), 3000)
    }

    const loadData = async () => {
        setLoading(true)
        try {
            // Cargar participantes
            const { data: parts } = await supabase
                .from('group_participants')
                .select('*')
                .eq('group_id', group.id)
                .order('created_at')

            setParticipants(parts || [])

            // Cargar gastos
            const { data: exps } = await supabase
                .from('group_expenses')
                .select('*')
                .eq('group_id', group.id)
                .order('created_at', { ascending: false })

            setExpenses(exps || [])
        } catch (error) {
            console.error('Error loading data:', error)
        }
        setLoading(false)
    }

    const handleAddParticipant = async () => {
        if (!newParticipantName.trim()) return

        try {
            const { error } = await supabase
                .from('group_participants')
                .insert([{
                    group_id: group.id,
                    name: newParticipantName.trim()
                }])

            if (error) throw error
            setNewParticipantName('')
            setShowAddParticipant(false)
            showToast('✅ Participante agregado')
            await loadData()
        } catch (error) {
            console.error('Error:', error)
            showToast('❌ Error')
        }
    }

    const handleDeleteParticipant = async (participant) => {
        try {
            // 1. Actualizar gastos: quitar al participante de split_with
            const affectedExpenses = expenses.filter(exp =>
                exp.split_with.includes(participant.name) || exp.paid_by === participant.name
            )

            for (const exp of affectedExpenses) {
                const newSplitWith = exp.split_with.filter(name => name !== participant.name)

                // Si el participante era quien pagó, usar el nuevo pagador seleccionado
                let newPaidBy = exp.paid_by
                if (exp.paid_by === participant.name && newSplitWith.length > 0) {
                    newPaidBy = newPayerFor[exp.id] || newSplitWith[0]
                }

                // Si queda al menos una persona, actualizar; si no, eliminar el gasto
                if (newSplitWith.length > 0) {
                    await supabase
                        .from('group_expenses')
                        .update({ split_with: newSplitWith, paid_by: newPaidBy })
                        .eq('id', exp.id)
                } else {
                    await supabase
                        .from('group_expenses')
                        .delete()
                        .eq('id', exp.id)
                }
            }

            // 2. Eliminar el participante
            const { error } = await supabase
                .from('group_participants')
                .delete()
                .eq('id', participant.id)

            if (error) throw error

            setConfirmDeleteParticipant(null)
            setNewPayerFor({})
            showToast('🗑️ Participante eliminado y gastos reasignados')
            await loadData()
        } catch (error) {
            console.error('Error:', error)
            showToast('❌ Error')
        }
    }

    const handleAddExpense = async (forceAdd = false) => {
        if (!expenseForm.description || !expenseForm.amount || !expenseForm.paid_by) return
        if (expenseForm.split_with.length === 0) return

        try {
            if (editingExpense) {
                // Modo edición - actualizar
                const { error } = await supabase
                    .from('group_expenses')
                    .update({
                        description: expenseForm.description,
                        amount: parseFloat(expenseForm.amount),
                        paid_by: expenseForm.paid_by,
                        split_with: expenseForm.split_with
                    })
                    .eq('id', editingExpense.id)

                if (error) throw error
                showToast('✅ Gasto actualizado')
            } else {
                // Verificar duplicado antes de insertar (solo si no es forceAdd)
                if (!forceAdd) {
                    const duplicate = expenses.find(exp =>
                        exp.description.toLowerCase().trim() === expenseForm.description.toLowerCase().trim() &&
                        Math.abs(exp.amount - parseFloat(expenseForm.amount)) < 0.01
                    )
                    if (duplicate) {
                        setPendingDuplicate(duplicate)
                        return // No insertar, esperar confirmación
                    }
                }

                // Modo creación - insertar
                const { error } = await supabase
                    .from('group_expenses')
                    .insert([{
                        group_id: group.id,
                        description: expenseForm.description,
                        amount: parseFloat(expenseForm.amount),
                        paid_by: expenseForm.paid_by,
                        split_with: expenseForm.split_with
                    }])

                if (error) throw error
                showToast('✅ Gasto agregado')
            }

            setExpenseForm({ description: '', amount: '', paid_by: '', split_with: [] })
            setShowAddExpense(false)
            setEditingExpense(null)
            setPendingDuplicate(null)
            await loadData()
        } catch (error) {
            console.error('Error:', error)
            showToast('❌ Error')
        }
    }

    const handleDeleteExpense = async (expenseId) => {
        try {
            const { error } = await supabase
                .from('group_expenses')
                .delete()
                .eq('id', expenseId)

            if (error) throw error
            setConfirmDeleteExpense(null)
            showToast('🗑️ Gasto eliminado')
            await loadData()
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const toggleSplitWith = (name) => {
        setExpenseForm(prev => {
            const current = prev.split_with
            if (current.includes(name)) {
                return { ...prev, split_with: current.filter(n => n !== name) }
            } else {
                return { ...prev, split_with: [...current, name] }
            }
        })
    }

    // Calcular balances
    const calculateBalances = () => {
        const balances = {}
        participants.forEach(p => balances[p.name] = 0)

        expenses.forEach(exp => {
            const splitCount = exp.split_with.length
            const perPerson = exp.amount / splitCount
            const payerInSplit = exp.split_with.includes(exp.paid_by)

            // El que pagó recibe crédito
            if (balances[exp.paid_by] !== undefined) {
                if (payerInSplit) {
                    // Si está en la división, su crédito es lo que pagó menos su parte
                    balances[exp.paid_by] += exp.amount - perPerson
                } else {
                    // Si NO está en la división, le deben todo
                    balances[exp.paid_by] += exp.amount
                }
            }

            // Los que dividen deben (excepto el que pagó si está en la división)
            exp.split_with.forEach(name => {
                if (name !== exp.paid_by && balances[name] !== undefined) {
                    balances[name] -= perPerson
                }
            })
        })

        return balances
    }

    const balances = calculateBalances()
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

    // Generar resumen para compartir
    const handleShare = async () => {
        // Calcular transferencias
        const debtors = Object.entries(balances).filter(([_, b]) => b < -0.01).map(([name, b]) => ({ name, amount: -b }))
        const creditors = Object.entries(balances).filter(([_, b]) => b > 0.01).map(([name, b]) => ({ name, amount: b }))

        const transfers = []
        debtors.forEach(debtor => {
            let remaining = debtor.amount
            creditors.forEach(creditor => {
                if (remaining > 0 && creditor.amount > 0) {
                    const transfer = Math.min(remaining, creditor.amount)
                    if (transfer > 0.01) {
                        transfers.push({ from: debtor.name, to: creditor.name, amount: transfer })
                        remaining -= transfer
                        creditor.amount -= transfer
                    }
                }
            })
        })

        // Construir texto
        let text = `🎉 *${group.name}*\n\n`
        text += `💰 *Total gastado:* $${totalExpenses.toLocaleString('es-AR')}\n\n`

        if (expenses.length > 0) {
            text += `📝 *Gastos:*\n`
            expenses.forEach(exp => {
                text += `• ${exp.description}: $${exp.amount.toLocaleString('es-AR')} (pagó ${exp.paid_by})\n`
            })
            text += `\n`
        }

        if (transfers.length > 0) {
            text += `💸 *Quién paga a quién:*\n`
            transfers.forEach(t => {
                text += `• ${t.from} → ${t.to}: $${Math.round(t.amount).toLocaleString('es-AR')}\n`
            })
        } else if (expenses.length > 0) {
            text += `✅ Todos están en $0\n`
        }

        text += `\n_Generado con Gestor de Gastos_`

        if (navigator.share) {
            try {
                await navigator.share({ title: group.name, text })
            } catch (err) {
                // Usuario canceló
            }
        } else {
            await navigator.clipboard.writeText(text)
            showToast('📋 Resumen copiado')
        }
    }

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <header className="flex items-center gap-4 mb-6">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-400" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-white">{group.name}</h1>
                        {group.description && (
                            <p className="text-gray-400 text-sm">{group.description}</p>
                        )}
                    </div>
                    <button onClick={handleShare} className="btn-secondary flex items-center gap-2">
                        <Share2 className="w-4 h-4" />
                        Compartir
                    </button>
                </header>

                {loading ? (
                    <div className="flex justify-center py-12"><div className="spinner" /></div>
                ) : (
                    <>
                        {/* Participantes */}
                        <div className="glass p-4 mb-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-white font-medium">👥 Participantes ({participants.length})</h3>
                                <button
                                    onClick={() => setShowAddParticipant(true)}
                                    className="text-sm text-primary-400 hover:text-primary-300"
                                >
                                    + Agregar
                                </button>
                            </div>
                            {participants.length === 0 ? (
                                <p className="text-gray-500 text-sm">Agregá participantes para empezar</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {participants.map(p => (
                                        <span key={p.id} className="px-3 py-1 bg-white/10 rounded-full text-sm text-white flex items-center gap-2">
                                            {p.name}
                                            <button
                                                onClick={() => setConfirmDeleteParticipant(p)}
                                                className="text-gray-400 hover:text-red-400"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Resumen / Balances */}
                        {participants.length > 0 && (
                            <div className="glass p-4 mb-4">
                                <h3 className="text-white font-medium mb-3">💰 Balance</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {participants.map(p => {
                                        const balance = balances[p.name] || 0
                                        return (
                                            <div key={p.id} className="text-center p-3 bg-white/5 rounded-lg">
                                                <div className="text-sm text-gray-400">{p.name}</div>
                                                <div className={`text-lg font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {balance >= 0 ? '+' : ''}{balance.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="mt-3 pt-3 border-t border-white/10 text-center">
                                    <span className="text-gray-400">Total gastado: </span>
                                    <span className="text-white font-bold">
                                        {totalExpenses.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Transferencias sugeridas */}
                        {expenses.length > 0 && (() => {
                            // Calcular transferencias para saldar cuentas
                            const debtors = [] // Los que deben (balance negativo)
                            const creditors = [] // Los que les deben (balance positivo)

                            Object.entries(balances).forEach(([name, balance]) => {
                                if (balance < -0.01) debtors.push({ name, amount: Math.abs(balance) })
                                if (balance > 0.01) creditors.push({ name, amount: balance })
                            })

                            // Ordenar para optimizar transferencias
                            debtors.sort((a, b) => b.amount - a.amount)
                            creditors.sort((a, b) => b.amount - a.amount)

                            const transfers = []
                            let i = 0, j = 0

                            while (i < debtors.length && j < creditors.length) {
                                const debtor = debtors[i]
                                const creditor = creditors[j]
                                const amount = Math.min(debtor.amount, creditor.amount)

                                if (amount > 0.01) {
                                    transfers.push({
                                        from: debtor.name,
                                        to: creditor.name,
                                        amount: Math.round(amount * 100) / 100
                                    })
                                }

                                debtor.amount -= amount
                                creditor.amount -= amount

                                if (debtor.amount < 0.01) i++
                                if (creditor.amount < 0.01) j++
                            }

                            if (transfers.length === 0) return null

                            return (
                                <div className="glass p-4 mb-4">
                                    <h3 className="text-white font-medium mb-3">💸 ¿Quién paga a quién?</h3>
                                    <div className="space-y-2">
                                        {transfers.map((t, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-red-400 font-medium">{t.from}</span>
                                                    <span className="text-gray-500">→</span>
                                                    <span className="text-green-400 font-medium">{t.to}</span>
                                                </div>
                                                <span className="text-white font-bold">
                                                    {t.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-3 text-center">
                                        ✅ Con estas transferencias todos quedan en $0
                                    </p>
                                </div>
                            )
                        })()}

                        {/* Gastos */}
                        <div className="glass p-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-white font-medium">📝 Gastos ({expenses.length})</h3>
                                {participants.length >= 2 && (
                                    <button
                                        onClick={() => {
                                            // Empezar con checkboxes vacíos
                                            setExpenseForm({
                                                description: '',
                                                amount: '',
                                                paid_by: '',
                                                split_with: []
                                            })
                                            setShowAddExpense(true)
                                        }}
                                        className="btn-primary text-sm flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Agregar
                                    </button>
                                )}
                            </div>

                            {participants.length < 2 ? (
                                <p className="text-gray-500 text-sm">Necesitás al menos 2 participantes</p>
                            ) : expenses.length === 0 ? (
                                <p className="text-gray-500 text-sm">No hay gastos aún</p>
                            ) : (
                                <div className="space-y-2">
                                    {expenses.length > 3 && (
                                        <input
                                            type="text"
                                            placeholder="🔍 Buscar gasto..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="input-field text-sm mb-2"
                                        />
                                    )}
                                    {expenses
                                        .filter(exp => exp.description.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(exp => (
                                            <div key={exp.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                                <div>
                                                    <div className="text-white">{exp.description}</div>
                                                    <div className="text-sm text-gray-400">
                                                        <span className="text-gray-500">
                                                            {new Date(exp.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                        {' · '}Pagó: {exp.paid_by} · Dividido: {exp.split_with.join(', ')}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-bold">
                                                        ${exp.amount.toLocaleString('es-AR')}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setEditingExpense(exp)
                                                            setExpenseForm({
                                                                description: exp.description,
                                                                amount: exp.amount.toString(),
                                                                paid_by: exp.paid_by,
                                                                split_with: exp.split_with || []
                                                            })
                                                            setShowAddExpense(true)
                                                        }}
                                                        className="p-1 hover:text-blue-400"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4 text-gray-500" />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteExpense(exp)}
                                                        className="p-1 hover:text-red-400"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-gray-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Modal agregar participante */}
                {showAddParticipant && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                        <div className="glass w-full max-w-sm p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Agregar participante</h3>
                            <input
                                type="text"
                                value={newParticipantName}
                                onChange={(e) => setNewParticipantName(e.target.value)}
                                placeholder="Nombre"
                                className="input-field mb-4"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setShowAddParticipant(false)} className="btn-secondary flex-1">Cancelar</button>
                                <button onClick={handleAddParticipant} className="btn-primary flex-1">Agregar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal agregar gasto */}
                {showAddExpense && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
                        <div className="glass w-full max-w-md p-6 my-8">
                            <h3 className="text-lg font-semibold text-white mb-4">
                                {editingExpense ? 'Editar gasto' : 'Agregar gasto'}
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="label">Descripción</label>
                                    <input
                                        type="text"
                                        value={expenseForm.description}
                                        onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Ej: Carne, Bebidas..."
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="label">Monto ($)</label>
                                    <input
                                        type="number"
                                        value={expenseForm.amount}
                                        onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                                        placeholder="5000"
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="label">¿Quién pagó?</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {participants.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => setExpenseForm(prev => ({ ...prev, paid_by: p.name }))}
                                                className={`p-2 rounded-lg border text-sm transition-all ${expenseForm.paid_by === p.name
                                                    ? 'bg-primary-600/30 border-primary-500 text-white'
                                                    : 'bg-white/5 border-white/10 text-gray-400'
                                                    }`}
                                            >
                                                {p.name}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        💡 ¿Pagaron entre 2? Registrá un gasto por cada uno con el monto que puso.
                                    </p>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="label mb-0">¿Entre quiénes se divide?</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const allNames = participants.map(p => p.name)
                                                const allSelected = allNames.every(n => expenseForm.split_with.includes(n))
                                                setExpenseForm(prev => ({
                                                    ...prev,
                                                    split_with: allSelected ? [] : allNames
                                                }))
                                            }}
                                            className="text-xs text-primary-400 hover:text-primary-300"
                                        >
                                            {participants.every(p => expenseForm.split_with.includes(p.name)) ? 'Deseleccionar' : 'Seleccionar todos'}
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {participants.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => toggleSplitWith(p.name)}
                                                className={`w-full p-2 rounded-lg border text-left text-sm transition-all flex justify-between ${expenseForm.split_with.includes(p.name)
                                                    ? 'bg-green-600/30 border-green-500 text-white'
                                                    : 'bg-white/5 border-white/10 text-gray-400'
                                                    }`}
                                            >
                                                {p.name}
                                                {expenseForm.split_with.includes(p.name) && <span>✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={() => { setShowAddExpense(false); setEditingExpense(null) }}
                                    className="btn-secondary flex-1"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleAddExpense()}
                                    disabled={!expenseForm.description || !expenseForm.amount || !expenseForm.paid_by || expenseForm.split_with.length === 0}
                                    className="btn-primary flex-1 disabled:opacity-50"
                                >
                                    {editingExpense ? 'Guardar' : 'Agregar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal confirmar eliminar participante */}
                {confirmDeleteParticipant && (() => {
                    const expensesAsPayer = expenses.filter(exp => exp.paid_by === confirmDeleteParticipant.name)
                    const otherParticipants = participants.filter(p => p.name !== confirmDeleteParticipant.name)

                    return (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
                            <div className="glass w-full max-w-md p-6 my-8">
                                <h3 className="text-lg font-semibold text-white mb-4">
                                    ¿Eliminar a "{confirmDeleteParticipant.name}"?
                                </h3>

                                {expensesAsPayer.length > 0 ? (
                                    <>
                                        <p className="text-gray-400 text-sm mb-4">
                                            {confirmDeleteParticipant.name} pagó {expensesAsPayer.length} gasto(s). Elegí quién asume cada uno:
                                        </p>
                                        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                                            {expensesAsPayer.map(exp => {
                                                // Mostrar TODOS los participantes restantes, no solo los del split_with
                                                const availableParticipants = otherParticipants.map(p => p.name)
                                                return (
                                                    <div key={exp.id} className="p-3 bg-white/5 rounded-lg">
                                                        <div className="text-white text-sm mb-2">
                                                            {exp.description} - ${exp.amount.toLocaleString('es-AR')}
                                                        </div>
                                                        <select
                                                            value={newPayerFor[exp.id] || availableParticipants[0] || ''}
                                                            onChange={(e) => setNewPayerFor(prev => ({ ...prev, [exp.id]: e.target.value }))}
                                                            className="input-field text-sm w-full"
                                                        >
                                                            {availableParticipants.map(name => (
                                                                <option key={name} value={name}>Reasignar a: {name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-gray-400 text-sm mb-6">
                                        Se quitará de los gastos donde participaba.
                                    </p>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setConfirmDeleteParticipant(null); setNewPayerFor({}) }}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => handleDeleteParticipant(confirmDeleteParticipant)}
                                        className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })()}

                {/* Modal confirmar eliminar gasto */}
                {confirmDeleteExpense && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
                        <div className="glass w-full max-w-sm p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">
                                ¿Eliminar "{confirmDeleteExpense.description}"?
                            </h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Este gasto de ${confirmDeleteExpense.amount.toLocaleString('es-AR')} será eliminado.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDeleteExpense(null)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDeleteExpense(confirmDeleteExpense.id)}
                                    className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal confirmar gasto duplicado */}
                {pendingDuplicate && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
                        <div className="glass w-full max-w-sm p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">
                                ⚠️ Gasto duplicado
                            </h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Ya existe un gasto "{pendingDuplicate.description}" por ${pendingDuplicate.amount.toLocaleString('es-AR')}. ¿Querés agregarlo igual?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPendingDuplicate(null)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        setPendingDuplicate(null)
                                        handleAddExpense(true)
                                    }}
                                    className="btn-primary flex-1"
                                >
                                    Agregar igual
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {toast && <div className="toast">{toast}</div>}
            </div>
        </div>
    )
}
