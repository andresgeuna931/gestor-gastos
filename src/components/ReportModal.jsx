import { useState, useMemo, useEffect } from 'react'
import { X, Download, FileText, Calendar, CreditCard, Filter, Loader } from 'lucide-react'
import { formatCurrency } from '../utils/calculations'
import { supabase } from '../lib/supabase'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ReportModal({ cards = [], onClose, user, section = 'family' }) {
    // Función helper para formatear fecha local a YYYY-MM-DD
    const formatLocalDate = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    // Fechas por defecto: último mes
    const today = new Date()
    const oneMonthAgo = new Date(today)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const [dateFrom, setDateFrom] = useState(formatLocalDate(oneMonthAgo))
    const [dateTo, setDateTo] = useState(formatLocalDate(today))
    const [selectedCards, setSelectedCards] = useState([]) // vacío = todas
    const [showFilters, setShowFilters] = useState(true)
    const [allExpenses, setAllExpenses] = useState([])
    const [loading, setLoading] = useState(true)

    // DEBUG: Ver valores en cada render
    console.log('🔵 RENDER - dateFrom:', dateFrom, '| dateTo:', dateTo, '| expenses:', allExpenses.length)

    const isPersonal = section === 'personal'
    const title = isPersonal ? 'Reporte Personal' : 'Reporte de Gastos'

    // Cargar TODOS los gastos al abrir el modal
    useEffect(() => {
        const loadAllExpenses = async () => {
            setLoading(true)
            try {
                let query = supabase
                    .from('expenses')
                    .select('*')
                    .order('date', { ascending: false })

                // Filtrar según la sección
                if (isPersonal) {
                    query = query.eq('section', 'personal')
                    if (user?.id) {
                        query = query.eq('user_id', user.id)
                    }
                } else {
                    query = query.neq('section', 'personal')
                }

                const { data, error } = await query

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
        console.log('=== FILTRO EJECUTÁNDOSE ===')
        console.log('STATE dateFrom:', dateFrom)
        console.log('STATE dateTo:', dateTo)
        console.log('Cantidad de gastos a filtrar:', allExpenses.length)

        const result = allExpenses.filter(exp => {
            // Filtro de fecha - extraer solo YYYY-MM-DD de la fecha del gasto
            const expDateStr = exp.date ? exp.date.substring(0, 10) : ''
            const fromDateStr = dateFrom ? dateFrom.substring(0, 10) : ''
            const toDateStr = dateTo ? dateTo.substring(0, 10) : ''

            const isBeforeFrom = expDateStr < fromDateStr
            const isAfterTo = expDateStr > toDateStr
            const shouldExclude = !expDateStr || isBeforeFrom || isAfterTo

            console.log(`[${exp.description}] fecha=${expDateStr} | from=${fromDateStr} to=${toDateStr} | exclude=${shouldExclude}`)

            if (shouldExclude) {
                return false
            }

            // Filtro de tarjeta (si hay seleccionadas)
            if (selectedCards.length > 0) {
                if (!selectedCards.includes(exp.card)) return false
            }

            return true
        })

        console.log('Gastos después de filtrar:', result.length)
        return result.sort((a, b) => new Date(b.date) - new Date(a.date))
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

    // Generar PDF para descarga
    const downloadPDF = () => {
        try {
            const doc = new jsPDF()

            // Título
            doc.setFontSize(20)
            doc.setTextColor(40, 40, 40)
            doc.text(title, 14, 22)

            // Período
            doc.setFontSize(11)
            doc.setTextColor(100, 100, 100)
            doc.text(`Período: ${formatDate(dateFrom)} al ${formatDate(dateTo)}`, 14, 32)

            // Información de filtros
            if (selectedCards.length > 0) {
                doc.text(`Tarjetas: ${selectedCards.join(', ')}`, 14, 39)
            } else {
                doc.text('Tarjetas: Todas', 14, 39)
            }

            // Total
            doc.setFontSize(14)
            doc.setTextColor(40, 40, 40)
            doc.text(`Total: ${formatCurrency(totals.total)}`, 14, 50)

            // Tabla de gastos
            const tableData = filteredExpenses.map(exp => {
                const amount = exp.installments > 1
                    ? exp.total_amount / exp.installments
                    : exp.total_amount
                return [
                    formatDate(exp.date),
                    exp.description + (exp.installments > 1 ? ` (${exp.current_installment || 1}/${exp.installments})` : ''),
                    exp.category,
                    exp.card || '-',
                    formatCurrency(amount)
                ]
            })

            autoTable(doc, {
                startY: 58,
                head: [['Fecha', 'Descripción', 'Categoría', 'Tarjeta', 'Monto']],
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [124, 58, 237],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 250]
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 4
                },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 60 },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 35 },
                    4: { cellWidth: 30, halign: 'right' }
                },
                margin: { left: 14, right: 14 }
            })

            // Pie de página
            const pageCount = doc.internal.getNumberOfPages()
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i)
                doc.setFontSize(8)
                doc.setTextColor(150, 150, 150)
                doc.text(
                    `Generado el ${new Date().toLocaleDateString('es-AR')} - Gestor de Gastos`,
                    14,
                    doc.internal.pageSize.height - 10
                )
                doc.text(
                    `Página ${i} de ${pageCount}`,
                    doc.internal.pageSize.width - 35,
                    doc.internal.pageSize.height - 10
                )
            }

            // Descargar
            const fileName = isPersonal
                ? `reporte_personal_${dateFrom}_a_${dateTo}.pdf`
                : `reporte_gastos_${dateFrom}_a_${dateTo}.pdf`
            doc.save(fileName)
        } catch (error) {
            console.error('Error generando PDF:', error)
            alert('Error al generar el PDF: ' + error.message)
        }
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
                        {title}
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
                                                    onChange={e => {
                                                        console.log('INPUT dateFrom changed:', e.target.value)
                                                        setDateFrom(e.target.value)
                                                    }}
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
                                                    onChange={e => {
                                                        console.log('INPUT dateTo changed:', e.target.value)
                                                        setDateTo(e.target.value)
                                                    }}
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
                                            {/* Mensaje de estado del filtro */}
                                            {cards.length > 0 && (
                                                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                                    {selectedCards.length === 0 ? (
                                                        <>📋 Sin filtro: mostrando todas las tarjetas</>
                                                    ) : (
                                                        <>🔍 Filtrando por: {selectedCards.length} {selectedCards.length === 1 ? 'tarjeta' : 'tarjetas'}</>
                                                    )}
                                                </p>
                                            )}
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

                {/* Footer con botones */}
                <div className="flex gap-3 p-4 border-t border-white/10">
                    <button
                        onClick={downloadPDF}
                        disabled={filteredExpenses.length === 0 || loading}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        Exportar PDF
                    </button>
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
