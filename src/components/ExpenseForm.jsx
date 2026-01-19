import { useState, useEffect } from 'react'
import { X, Check, CreditCard, Banknote, QrCode, ArrowRightLeft, Plus } from 'lucide-react'
import { CATEGORIES } from '../utils/calculations'
import { supabase } from '../lib/supabase'

const PAYMENT_METHODS = [
    { id: 'efectivo', label: 'Efectivo', icon: Banknote, color: 'text-green-400' },
    { id: 'transferencia', label: 'Transferencia', icon: ArrowRightLeft, color: 'text-blue-400' },
    { id: 'qr', label: 'QR', icon: QrCode, color: 'text-purple-400' },
    { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard, color: 'text-orange-400' }
]

// Generar opciones de meses (actual + próximos 3)
const generateStartMonthOptions = () => {
    const options = []
    const now = new Date()
    for (let i = 0; i <= 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
        options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
    }
    return options
}

const getCurrentMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const initialFormData = {
    description: '',
    total_amount: '',
    installments: 1,
    current_installment: 1,
    owner: '',
    category: 'Supermercado',
    payment_method: 'efectivo',
    card: '',
    date: new Date().toISOString().split('T')[0],
    start_month: getCurrentMonth(), // Mes de inicio de primera cuota
    is_shared: true,
    share_mode: 'shared', // 'shared' or 'belongs_to_other' (personal removed - use PersonalExpenses section)
    belongs_to: '', // Persona a quien pertenece el gasto (si share_mode = 'belongs_to_other')
    shared_with: []
}

export default function ExpenseForm({
    expense,
    cards,
    people = [],
    user,
    onSubmit,
    onClose,
    onAddCard
}) {
    const [formData, setFormData] = useState(initialFormData)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showAddCard, setShowAddCard] = useState(false)
    const [newCardName, setNewCardName] = useState('')
    const [customCategories, setCustomCategories] = useState([])
    const [showAddCategory, setShowAddCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [showManageCategories, setShowManageCategories] = useState(false)
    const [editingCategory, setEditingCategory] = useState(null)
    const [editCategoryName, setEditCategoryName] = useState('')

    // Cargar categorías personalizadas del usuario (con ID para edición confiable)
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

    // Combinar categorías por defecto + personalizadas (extraer nombres)
    const customCategoryNames = customCategories.map(c => c.name)
    const allCategories = [...CATEGORIES, ...customCategoryNames.filter(c => !CATEGORIES.includes(c))]

    // Agregar nueva categoría personalizada
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
        console.log('handleEditCategory called:', { categoryId, oldName, newName })

        const trimmedName = newName.trim()

        // Validaciones con feedback
        if (!trimmedName) {
            alert('Error: El nombre de la categoría no puede estar vacío.')
            setEditingCategory(null)
            return
        }

        if (!user?.id) {
            alert('Error: No hay usuario autenticado.')
            setEditingCategory(null)
            return
        }

        if (trimmedName === oldName) {
            // No hay cambios, simplemente cerrar
            setEditingCategory(null)
            return
        }

        if (allCategories.includes(trimmedName)) {
            alert('Esa categoría ya existe')
            return
        }

        // Verificar que tenemos un ID válido
        if (!categoryId) {
            alert('Error: No se pudo identificar la categoría a editar (ID faltante).')
            return
        }

        console.log('About to update category in DB:', { categoryId, trimmedName })

        // Actualizar la categoría por ID (más confiable)
        const { error, data } = await supabase
            .from('user_categories')
            .update({ name: trimmedName })
            .eq('id', categoryId)
            .select()

        console.log('Supabase update result:', { error, data })

        if (error) {
            console.error('Error updating category:', error)
            alert(`Error al actualizar la categoría: ${error.message}`)
            return
        }

        if (!data || data.length === 0) {
            console.error('No rows updated:', categoryId)
            alert('Error: La categoría no se pudo actualizar (0 filas afectadas). Puede ser un problema de permisos.')
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
        alert(`✅ Categoría actualizada: "${oldName}" → "${trimmedName}"`)
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

    useEffect(() => {
        if (expense) {
            // Modo edición - parsear shared_with
            let sharedWithArray = []
            if (expense.shared_with) {
                try {
                    // Puede ser array JSON o string simple
                    sharedWithArray = typeof expense.shared_with === 'string'
                        ? JSON.parse(expense.shared_with)
                        : expense.shared_with
                } catch {
                    sharedWithArray = expense.shared_with ? [expense.shared_with] : []
                }
            }

            // Limpiar shared_with: remover "Yo" y cualquier referencia al owner
            // para evitar duplicados de datos antiguos
            const ownerName = expense.owner
            sharedWithArray = sharedWithArray.filter(name =>
                name !== 'Yo' && name !== ownerName
            )

            // Determinar share_mode basado en share_type
            let shareMode = 'personal'
            let belongsTo = ''
            if (expense.share_type?.startsWith('shared')) {
                shareMode = 'shared'
            } else if (expense.share_type === 'belongs_to_other') {
                shareMode = 'belongs_to_other'
                // belongs_to debería estar en shared_with como único elemento
                belongsTo = sharedWithArray[0] || ''
            }

            setFormData({
                description: expense.description,
                total_amount: expense.total_amount.toString(),
                installments: expense.installments,
                current_installment: expense.current_installment,
                owner: expense.owner,
                category: expense.category,
                payment_method: expense.payment_method || 'tarjeta',
                card: expense.card,
                date: expense.date,
                is_shared: expense.share_type !== 'personal' && expense.share_type !== 'belongs_to_other',
                share_mode: shareMode,
                belongs_to: belongsTo,
                shared_with: shareMode === 'shared' ? (Array.isArray(sharedWithArray) ? sharedWithArray : []) : []
            })
        } else {
            // Modo creación
            setFormData({
                ...initialFormData,
                payment_method: 'efectivo',
                card: cards[0]?.name || '',
                owner: people[0]?.name || '' // "Yo" - el usuario actual
            })
        }
    }, [expense, cards, people])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const toggleSharedWith = (personName) => {
        setFormData(prev => {
            const currentShared = prev.shared_with || []
            if (currentShared.includes(personName)) {
                return { ...prev, shared_with: currentShared.filter(n => n !== personName) }
            } else {
                return { ...prev, shared_with: [...currentShared, personName] }
            }
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validar que la fecha no sea de un mes anterior (comparando YYYY-MM)
        const selectedDateStr = formData.date.substring(0, 7) // "YYYY-MM"
        const today = new Date()
        const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

        if (selectedDateStr < currentMonth) {
            alert('No se pueden agregar gastos de meses anteriores al actual')
            return
        }

        setIsSubmitting(true)

        // Determinar share_type basado en share_mode
        let shareType = 'personal'
        let sharedWithData = null

        if (formData.share_mode === 'shared' && formData.shared_with.length > 0) {
            shareType = `shared${formData.shared_with.length + 1}` // +1 porque incluye al owner
        } else if (formData.share_mode === 'belongs_to_other' && formData.belongs_to) {
            shareType = 'belongs_to_other'
        }

        // Obtener nombre real del usuario para reemplazar "Yo"
        const currentUserName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario'

        // Reemplazar "Yo" con nombre real en owner y shared_with
        const resolvedOwner = formData.owner === 'Yo' ? currentUserName : formData.owner

        // Preparar shared_with según el modo
        if (formData.share_mode === 'shared') {
            const resolvedSharedWith = formData.shared_with.map(name =>
                name === 'Yo' ? currentUserName : name
            )
            sharedWithData = JSON.stringify(resolvedSharedWith)
        } else if (formData.share_mode === 'belongs_to_other') {
            // Para belongs_to_other, guardamos el nombre de la persona en shared_with
            const resolvedBelongsTo = formData.belongs_to === 'Yo' ? currentUserName : formData.belongs_to
            sharedWithData = JSON.stringify([resolvedBelongsTo])
        }

        const data = {
            description: formData.description,
            total_amount: parseFloat(formData.total_amount),
            installments: formData.payment_method === 'tarjeta' ? parseInt(formData.installments) : 1,
            current_installment: formData.payment_method === 'tarjeta' ? parseInt(formData.current_installment) : 1,
            owner: resolvedOwner,
            category: formData.category,
            payment_method: formData.payment_method,
            card: formData.payment_method === 'tarjeta' ? formData.card : null,
            date: formData.date,
            month: formData.payment_method === 'tarjeta' ? formData.start_month : getCurrentMonth(),
            share_type: shareType,
            shared_with: sharedWithData,
            section: 'family'
        }

        await onSubmit(data, expense?.id)
        setIsSubmitting(false)
    }

    // Filtrar personas para compartir: excluir al usuario actual (ya está incluido como pagador)
    const availableToShare = people.filter(p => !p.isOwner)

    return (
        <>
            <div className="modal-backdrop" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">
                            {expense ? '✏️ Editar Gasto' : '➕ Nuevo Gasto'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Descripción */}
                        <div>
                            <label className="label">Descripción</label>
                            <input
                                type="text"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Ej: Compra Carrefour"
                                className="input-field"
                                required
                            />
                        </div>

                        {/* Monto */}
                        <div>
                            <label className="label">Monto Total ($)</label>
                            <input
                                type="number"
                                name="total_amount"
                                value={formData.total_amount}
                                onChange={handleChange}
                                placeholder="12000"
                                className="input-field"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        {/* ¿Quién lo paga? */}
                        <div>
                            <label className="label">¿Quién lo paga?</label>
                            <div className="flex flex-wrap gap-2">
                                {people.map(person => (
                                    <button
                                        key={person.id}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, owner: person.name }))}
                                        className={`px-4 py-2 rounded-lg border transition-all ${formData.owner === person.name
                                            ? 'bg-primary-600/30 border-primary-500 text-white'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        {person.isOwner ? '👤 Yo' : `👤 ${person.name}`}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Elegí quién hizo el pago</p>
                        </div>

                        {/* Cuota Actual (solo en edición) */}
                        {expense && formData.installments > 1 && (
                            <div>
                                <label className="label">Cuota Actual</label>
                                <input
                                    type="number"
                                    name="current_installment"
                                    value={formData.current_installment}
                                    onChange={handleChange}
                                    className="input-field"
                                    min="1"
                                    max={formData.installments}
                                    required
                                />
                            </div>
                        )}

                        {/* Categoría */}
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
                                        className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Nueva
                                    </button>
                                </div>
                            </label>
                            {showAddCategory ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Nombre de categoría"
                                        className="input-field flex-1"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCategory}
                                        className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddCategory(false); setNewCategoryName('') }}
                                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="input-field"
                                    required
                                >
                                    {allCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Método de Pago */}
                        <div>
                            <label className="label">Método de Pago</label>
                            <div className="grid grid-cols-4 gap-2">
                                {PAYMENT_METHODS.map(method => {
                                    const Icon = method.icon
                                    return (
                                        <button
                                            key={method.id}
                                            type="button"
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                payment_method: method.id,
                                                installments: method.id !== 'tarjeta' ? 1 : prev.installments
                                            }))}
                                            className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${formData.payment_method === method.id
                                                ? 'bg-primary-600/30 border-primary-500 text-white'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <Icon className={`w-5 h-5 ${formData.payment_method === method.id ? method.color : ''}`} />
                                            <span className="text-xs">{method.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Tarjeta y Cuotas (solo si método es tarjeta) */}
                        {formData.payment_method === 'tarjeta' && (
                            <div className="animate-fade-in space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Tarjeta</label>
                                        {cards.length === 0 ? (
                                            <div className="space-y-2">
                                                {showAddCard ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={newCardName}
                                                            onChange={(e) => setNewCardName(e.target.value)}
                                                            placeholder="Nombre de la tarjeta"
                                                            className="input-field flex-1"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (newCardName.trim() && onAddCard) {
                                                                    await onAddCard(newCardName.trim())
                                                                    setNewCardName('')
                                                                    setShowAddCard(false)
                                                                }
                                                            }}
                                                            className="btn-primary px-4"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAddCard(true)}
                                                        className="btn-secondary w-full flex items-center justify-center gap-2"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Agregar Tarjeta
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <select
                                                name="card"
                                                value={formData.card}
                                                onChange={handleChange}
                                                className="input-field"
                                                required
                                            >
                                                {cards.map(card => (
                                                    <option key={card.id} value={card.name}>{card.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div>
                                        <label className="label">Cuotas</label>
                                        <select
                                            name="installments"
                                            value={formData.installments}
                                            onChange={handleChange}
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
                                        name="start_month"
                                        value={formData.start_month}
                                        onChange={handleChange}
                                        className="input-field"
                                    >
                                        {generateStartMonthOptions().map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Según el cierre de tu tarjeta</p>
                                </div>
                            </div>
                        )}

                        {/* Fecha */}
                        <div>
                            <label className="label">Fecha</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                min={new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]}
                                className="input-field"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Solo mes actual o futuros</p>
                        </div>

                        {/* Tipo de gasto */}
                        <div>
                            <label className="label">¿Cómo se divide este gasto?</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, share_mode: 'shared', is_shared: true, belongs_to: '' }))}
                                    className={`p-3 rounded-lg border text-center transition-all ${formData.share_mode === 'shared'
                                        ? 'bg-primary-600/30 border-primary-500 text-white'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="text-lg mb-1">👥</div>
                                    <div className="text-xs">Compartido</div>
                                    <div className="text-[10px] opacity-60">Dividir entre varios</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, share_mode: 'belongs_to_other', is_shared: false, shared_with: [] }))}
                                    className={`p-3 rounded-lg border text-center transition-all ${formData.share_mode === 'belongs_to_other'
                                        ? 'bg-orange-600/30 border-orange-500 text-white'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="text-lg mb-1">👆</div>
                                    <div className="text-xs">De otro</div>
                                    <div className="text-[10px] opacity-60">100% de otra persona</div>
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {formData.share_mode === 'shared' && '💡 Se dividirá el monto entre los seleccionados'}
                                {formData.share_mode === 'belongs_to_other' && '💡 Lo pagaste vos pero te lo debe otra persona'}
                            </p>
                        </div>

                        {/* Selección de personas para compartir */}
                        {formData.share_mode === 'shared' && (
                            <div className="animate-fade-in">
                                <label className="label">¿Con quién compartís?</label>
                                {people.length <= 1 ? (
                                    <p className="text-gray-400 text-sm">
                                        Agregá más miembros desde el botón "Miembros"
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {availableToShare.map(person => (
                                            <button
                                                key={person.id}
                                                type="button"
                                                onClick={() => toggleSharedWith(person.name)}
                                                className={`w-full p-3 rounded-lg border flex items-center justify-between transition-all ${formData.shared_with.includes(person.name)
                                                    ? 'bg-green-600/30 border-green-500 text-white'
                                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span className="text-xl">👤</span>
                                                    {person.name}
                                                </span>
                                                {formData.shared_with.includes(person.name) && (
                                                    <Check className="w-5 h-5 text-green-400" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {formData.shared_with.length > 0 && (
                                    <p className="text-sm text-gray-400 mt-2">
                                        💡 Se dividirá entre {formData.shared_with.length + 1} personas
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Selección de persona para "De otro" */}
                        {formData.share_mode === 'belongs_to_other' && (
                            <div className="animate-fade-in">
                                <label className="label">¿De quién es este gasto?</label>
                                {people.length <= 1 ? (
                                    <p className="text-gray-400 text-sm">
                                        Agregá más miembros desde el botón "Miembros"
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {availableToShare.map(person => (
                                            <button
                                                key={person.id}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, belongs_to: person.name }))}
                                                className={`w-full p-3 rounded-lg border flex items-center justify-between transition-all ${formData.belongs_to === person.name
                                                    ? 'bg-orange-600/30 border-orange-500 text-white'
                                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span className="text-xl">👤</span>
                                                    {person.name}
                                                </span>
                                                {formData.belongs_to === person.name && (
                                                    <Check className="w-5 h-5 text-orange-400" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {formData.belongs_to && (
                                    <p className="text-sm text-orange-400 mt-2">
                                        💰 {formData.belongs_to} te debe ${formData.total_amount || '0'}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Botones */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-secondary flex-1"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || (formData.share_mode === 'shared' && formData.shared_with.length === 0) || (formData.share_mode === 'belongs_to_other' && !formData.belongs_to)}
                                className="btn-primary flex-1 flex items-center justify-center disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <div className="spinner" />
                                ) : (
                                    expense ? 'Guardar Cambios' : 'Agregar Gasto'
                                )}
                            </button>
                        </div>
                    </form>
                </div >
            </div >

            {/* Modal para gestionar categorías */}
            {
                showManageCategories && (
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
                )
            }
        </>
    )
}
