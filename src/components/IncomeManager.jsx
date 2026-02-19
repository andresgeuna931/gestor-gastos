import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, X, Check, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../utils/calculations'

export function IncomeManager({ user, currentMonth, onIncomeChange }) {
    const [incomes, setIncomes] = useState([])
    const [loading, setLoading] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [editingIncome, setEditingIncome] = useState(null)
    const [formData, setFormData] = useState({
        description: '',
        amount: ''
    })

    useEffect(() => {
        if (user && currentMonth) {
            loadIncomes()
        }
    }, [user, currentMonth])

    const loadIncomes = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('incomes')
                .select('*')
                .eq('user_id', user.id)
                .eq('month', currentMonth)
                .order('created_at', { ascending: false })

            if (error) throw error
            setIncomes(data || [])
            // Notificar al padre sobre el cambio en los ingresos totales
            const total = (data || []).reduce((sum, item) => sum + Number(item.amount), 0)
            if (onIncomeChange) onIncomeChange(total)
        } catch (error) {
            console.error('Error loading incomes:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.description || !formData.amount) return

        try {
            const incomeData = {
                user_id: user.id,
                month: currentMonth,
                description: formData.description,
                amount: parseFloat(formData.amount),
                date: new Date().toISOString().split('T')[0] // Fecha de hoy por defecto
            }

            if (editingIncome) {
                const { error } = await supabase
                    .from('incomes')
                    .update(incomeData)
                    .eq('id', editingIncome.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('incomes')
                    .insert([incomeData])
                if (error) throw error
            }

            setFormData({ description: '', amount: '' })
            setShowForm(false)
            setEditingIncome(null)
            loadIncomes()
        } catch (error) {
            console.error('Error saving income:', error)
            alert('Error al guardar el ingreso')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este ingreso?')) return
        try {
            const { error } = await supabase
                .from('incomes')
                .delete()
                .eq('id', id)
            if (error) throw error
            loadIncomes()
        } catch (error) {
            console.error('Error deleting income:', error)
        }
    }

    const startEdit = (income) => {
        setFormData({
            description: income.description,
            amount: income.amount
        })
        setEditingIncome(income)
        setShowForm(true)
    }

    const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0)

    return (
        <div className="glass p-6 mb-6 animate-fade-in relative overflow-hidden group">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-green-500/20 transition-all duration-500"></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        Ingresos del Mes
                    </h2>
                    <p className="text-2xl font-bold text-white mt-1">
                        {formatCurrency(totalIncome)}
                    </p>
                </div>
                <button
                    onClick={() => {
                        setShowForm(!showForm)
                        setEditingIncome(null)
                        setFormData({ description: '', amount: '' })
                    }}
                    className={`p-2 rounded-xl transition-all ${showForm
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        }`}
                >
                    {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </button>
            </div>

            {/* Formulario */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-black/20 p-4 rounded-xl mb-4 animate-slide-down border border-white/5">
                    <div className="grid gap-3">
                        <div>
                            <label className="text-xs text-theme-secondary mb-1 block">Descripción (Ej: Sueldo, Venta)</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-green-500/50"
                                placeholder="Descripción"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-xs text-theme-secondary mb-1 block">Monto</label>
                            <input
                                type="number"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-green-500/50"
                                placeholder="$ 0.00"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-1"
                        >
                            <Check className="w-4 h-4" />
                            {editingIncome ? 'Actualizar' : 'Agregar'}
                        </button>
                    </div>
                </form>
            )}

            {/* Lista de Ingresos */}
            <div className="space-y-2 relative z-10">
                {incomes.map(income => (
                    <div key={income.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg group/item hover:bg-white/10 transition-colors border border-white/5 hover:border-white/10">
                        <div>
                            <p className="font-medium text-theme-primary">{income.description}</p>
                            <p className="text-xs text-theme-secondary opacity-60">
                                {new Date(income.date).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-green-400">
                                + {formatCurrency(income.amount)}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <button
                                    onClick={() => startEdit(income)}
                                    className="p-1.5 hover:bg-white/10 rounded text-blue-400 transition-colors"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(income.id)}
                                    className="p-1.5 hover:bg-white/10 rounded text-red-400 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {!loading && incomes.length === 0 && !showForm && (
                    <div className="text-center py-4 text-theme-secondary text-sm italic opacity-60">
                        No hay ingresos registrados este mes
                    </div>
                )}
            </div>
        </div>
    )
}
