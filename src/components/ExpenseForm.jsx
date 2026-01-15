import { useState, useEffect } from 'react'
import { X, Check, CreditCard, Banknote, QrCode, ArrowRightLeft, Plus } from 'lucide-react'
import { CATEGORIES, getCurrentMonth } from '../utils/calculations'
import { supabase } from '../lib/supabase'

const PAYMENT_METHODS = [
    { id: 'efectivo', label: 'Efectivo', icon: Banknote, color: 'text-green-400' },
    { id: 'transferencia', label: 'Transferencia', icon: ArrowRightLeft, color: 'text-blue-400' },
    { id: 'qr', label: 'QR', icon: QrCode, color: 'text-purple-400' },
    { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard, color: 'text-orange-400' }
]

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
    is_shared: false,
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

    // Cargar categorías personalizadas del usuario
    useEffect(() => {
        const loadCustomCategories = async () => {
            if (!user?.id) return
            const { data } = await supabase
                .from('user_categories')
                .select('name')
                .eq('user_id', user.id)
                .order('name')
            if (data) {
                setCustomCategories(data.map(c => c.name))
            }
        }
        loadCustomCategories()
    }, [user?.id])

    // Combinar categorías por defecto + personalizadas
    const allCategories = [...CATEGORIES, ...customCategories.filter(c => !CATEGORIES.includes(c))]

    // Agregar nueva categoría personalizada
    const handleAddCategory = async () => {
        const name = newCategoryName.trim()
        if (!name || !user?.id) return
        if (allCategories.includes(name)) {
            alert('Esa categoría ya existe')
            return
        }
        const { error } = await supabase
            .from('user_categories')
            .insert([{ user_id: user.id, name }])
        if (!error) {
            setCustomCategories(prev => [...prev, name].sort())
            setFormData(prev => ({ ...prev, category: name }))
            setNewCategoryName('')
            setShowAddCategory(false)
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
                is_shared: expense.share_type !== 'personal',
                shared_with: Array.isArray(sharedWithArray) ? sharedWithArray : []
            })
        } else {
            // Modo creación
            setFormData({
                ...initialFormData,
                payment_method: 'efectivo',
                card: cards[0]?.name || '',
                owner: people[0]?.name || ''
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

        // Determinar share_type basado en shared_with
        const sharedCount = formData.shared_with.length
        let shareType = 'personal'
        if (formData.is_shared && sharedCount > 0) {
            shareType = `shared${sharedCount + 1}` // +1 porque incluye al owner
        }

        // Obtener nombre real del usuario para reemplazar "Yo"
        const currentUserName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario'

        // Reemplazar "Yo" con nombre real en owner y shared_with
        const resolvedOwner = formData.owner === 'Yo' ? currentUserName : formData.owner
        const resolvedSharedWith = formData.shared_with.map(name =>
            name === 'Yo' ? currentUserName : name
        )

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
            month: getCurrentMonth(),
            share_type: shareType,
            shared_with: formData.is_shared ? JSON.stringify(resolvedSharedWith) : null,
            section: 'family'
        }

        await onSubmit(data, expense?.id)
        setIsSubmitting(false)
    }

    // Filtrar personas para compartir: excluir al usuario actual (ya está incluido como pagador)
    const availableToShare = people.filter(p => !p.isOwner)

    return (
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

                    {/* Quién pagó y Categoría */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">¿Quién pagó?</label>
                            <select
                                name="owner"
                                value={formData.owner}
                                onChange={handleChange}
                                className="input-field"
                                required
                            >
                                {people.length === 0 ? (
                                    <option value="">Sin miembros</option>
                                ) : (
                                    people.map(person => (
                                        <option key={person.id} value={person.name}>{person.name}</option>
                                    ))
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="label flex items-center justify-between">
                                <span>Categoría</span>
                                <button
                                    type="button"
                                    onClick={() => setShowAddCategory(true)}
                                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> Nueva
                                </button>
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

                    {/* ¿Es compartido? */}
                    <div>
                        <label className="label">¿Es gasto compartido?</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, is_shared: false, shared_with: [] }))}
                                className={`p-3 rounded-lg border text-center transition-all ${!formData.is_shared
                                    ? 'bg-primary-600/30 border-primary-500 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                <div className="text-lg mb-1">👤 Solo yo</div>
                                <div className="text-xs opacity-70">Gasto personal</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, is_shared: true }))}
                                className={`p-3 rounded-lg border text-center transition-all ${formData.is_shared
                                    ? 'bg-primary-600/30 border-primary-500 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                <div className="text-lg mb-1">👥 Compartido</div>
                                <div className="text-xs opacity-70">Dividir con otros</div>
                            </button>
                        </div>
                    </div>

                    {/* Selección de personas con checkboxes */}
                    {formData.is_shared && (
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
                                    💡 Se dividirá entre {formData.shared_with.filter(n => n !== formData.owner).length + 1} personas
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
                            disabled={isSubmitting || (formData.is_shared && formData.shared_with.length === 0)}
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
            </div>
        </div>
    )
}
