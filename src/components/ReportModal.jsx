import { useState, useMemo, useEffect } from 'react'
import { X, Download, FileText, Calendar, CreditCard, Filter, Loader } from 'lucide-react'
import { formatCurrency } from '../utils/calculations'
import { supabase } from '../lib/supabase'

export default function ReportModal({ cards = [], onClose, user }) {
    // Fechas por defecto: último mes
    const today = new Date()
    const oneMonthAgo = new Date(today)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const [dateFrom, setDateFrom] = useState(oneMonthAgo.toISOString().split('T')[0])
    const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0])
    const [selectedCards, setSelectedCards] = useState([]) // vacío = todas
    const [showFilters, setShowFilters] = useState(true)
    const [allExpenses, setAllExpenses] = useState([])
    const [loading, setLoading] = useState(true)

    // Cargar TODOS los gastos al abrir el modal
    useEffect(() => {
        const loadAllExpenses = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('expenses')
                    .select('*')
                    .neq('section', 'personal')  // Solo gastos familiares
                    .order('date', { ascending: false })

                if (error) throw error
                setAllExpenses(data || [])
            } catch (error) {
                console.error('Error loading all expenses:', error)
            } finally {
                setLoading(false)
            }
        }

        loadAllExpenses()
    }, [])

    // Bloquear scroll del fondo cuando el modal está abierto
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    // Filtrar gastos según criterios
    const filteredExpenses = useMemo(() => {
        return allExpenses.filter(exp => {
            // Filtro de fecha
            const expDate = new Date(exp.date)
            const from = new Date(dateFrom)
            const to = new Date(dateTo)
            // Ajustar las fechas para comparación correcta de zonas horarias
            from.setHours(0, 0, 0, 0)
            to.setHours(23, 59, 59, 999)
            expDate.setHours(12, 0, 0, 0)

            if (expDate < from || expDate > to) return false

            // Filtro de tarjeta (si hay seleccionadas)
            if (selectedCards.length > 0) {
                if (!selectedCards.includes(exp.card)) return false
            }

            return true
        }).sort((a, b) => new Date(b.date) - new Date(a.date))
    }, [allExpenses, dateFrom, dateTo, selectedCards])

    // Calcular totales
    const totals = useMemo(() => {
        const byCard = {}
        let total = 0

        filteredExpenses.forEach(exp => {
            const amount = exp.installments > 1
                ? exp.total_amount / exp.installments
                : exp.total_amount
            total += amount

            const cardName = exp.card || 'Sin tarjeta'
            byCard[cardName] = (byCard[cardName] || 0) + amount
        })

        return { total, byCard }
    }, [filteredExpenses])

    // Toggle tarjeta seleccionada
    const toggleCard = (cardName) => {
        setSelectedCards(prev =>
            prev.includes(cardName)
                ? prev.filter(c => c !== cardName)
                : [...prev, cardName]
        )
    }

    // Formatear fecha para mostrar
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    // Generar CSV para descarga
    const downloadCSV = () => {
        const headers = ['Fecha', 'Descripción', 'Categoría', 'Tarjeta', 'Monto']
        const rows = filteredExpenses.map(exp => [
            formatDate(exp.date),
            exp.description,
            exp.category,
            exp.card || 'Sin tarjeta',
            (exp.installments > 1 ? exp.total_amount / exp.installments : exp.total_amount).toFixed(2)
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `reporte_gastos_${dateFrom}_a_${dateTo}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-6 h-6" />
                        Reporte de Gastos
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Contenido con scroll */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader className="w-8 h-8 animate-spin text-primary-400" />
                            <span className="ml-3 text-gray-400">Cargando gastos...</span>
                        </div>
                    ) : (
                        <>
                            {/* Filtros */}
                            <div className="mb-4">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-2"
                                >
                                    <Filter className="w-4 h-4" />
                                    {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                                </button>

                                {showFilters && (
                                    <div className="bg-white/5 rounded-lg p-4 space-y-4">
                                        {/* Fechas */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    Desde
                                                </label>
                                                <input
                                                    type="date"
                                                    value={dateFrom}
                                                    onChange={e => setDateFrom(e.target.value)}
                                                    className="input-field"
                                                />
                                            </div>
                                            <div>
                                                <label className="label flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    Hasta
                                                </label>
                                                <input
                                                    type="date"
                                                    value={dateTo}
                                                    onChange={e => setDateTo(e.target.value)}
                                                    className="input-field"
                                                />
                                            </div>
                                        </div>

                                        {/* Tarjetas */}
                                        <div>
                                            <label className="label flex items-center gap-1 mb-2">
                                                <CreditCard className="w-4 h-4" />
                                                Tarjetas {selectedCards.length > 0 && `(${selectedCards.length} seleccionadas)`}
                                            </label>
                                            <div className="flex flex-col gap-2">
                                                {cards.map(card => (
                                                    <label
                                                        key={card.id}
                                                        className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCards.includes(card.name)}
                                                            onChange={() => toggleCard(card.name)}
                                                            className="w-5 h-5 rounded border-2 border-gray-500 bg-transparent checked:bg-primary-500 checked:border-primary-500 cursor-pointer accent-primary-500"
                                                        />
                                                        <span className="text-gray-300">{card.name}</span>
                                                    </label>
                                                ))}
                                                {selectedCards.length > 0 && (
                                                    <button
                                                        onClick={() => setSelectedCards([])}
                                                        className="mt-2 px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-300 hover:bg-red-500/30 self-start"
                                                    >
                                                        ✕ Limpiar selección
                                                    </button>
                                                )}
                                            </div>
                                            {cards.length === 0 && (
                                                <p className="text-xs text-gray-500">No hay tarjetas registradas</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Resumen */}
                            <div className="bg-gradient-to-r from-primary-500/20 to-purple-500/20 rounded-lg p-4 mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-300">Total del período</span>
                                    <span className="text-2xl font-bold text-white">
                                        {formatCurrency(totals.total)}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400">
                                    {filteredExpenses.length} gastos • {formatDate(dateFrom)} al {formatDate(dateTo)}
                                </div>

                                {/* Desglose por tarjeta */}
                                {Object.keys(totals.byCard).length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
                                        {Object.entries(totals.byCard).map(([card, amount]) => (
                                            <div key={card} className="flex justify-between text-sm">
                                                <span className="text-gray-400">{card}</span>
                                                <span className="text-white">{formatCurrency(amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tabla de gastos */}
                            <div>
                                {filteredExpenses.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        No hay gastos en el período seleccionado
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-lg border border-white/10">
                                        <table className="w-full text-sm">
                                            <thead className="bg-white/10">
                                                <tr>
                                                    <th className="text-left p-3 text-gray-300 font-semibold">Fecha</th>
                                                    <th className="text-left p-3 text-gray-300 font-semibold">Descripción</th>
                                                    <th className="text-left p-3 text-gray-300 font-semibold">Categoría</th>
                                                    <th className="text-left p-3 text-gray-300 font-semibold">Tarjeta</th>
                                                    <th className="text-right p-3 text-gray-300 font-semibold">Monto</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {filteredExpenses.map(exp => {
                                                    const amount = exp.installments > 1
                                                        ? exp.total_amount / exp.installments
                                                        : exp.total_amount
                                                    return (
                                                        <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                                                            <td className="p-3 text-gray-400 whitespace-nowrap">{formatDate(exp.date)}</td>
                                                            <td className="p-3 text-white">
                                                                {exp.description}
                                                                {exp.installments > 1 && (
                                                                    <span className="ml-2 text-xs text-gray-500">
                                                                        ({exp.current_installment || 1}/{exp.installments})
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-gray-400">{exp.category}</td>
                                                            <td className="p-3 text-gray-400">{exp.card || '-'}</td>
                                                            <td className="p-3 text-white font-semibold text-right whitespace-nowrap">
                                                                {formatCurrency(amount)}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer con botón */}
                <div className="flex gap-3 p-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="btn-primary flex-1"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}
