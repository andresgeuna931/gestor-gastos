import { useState, useMemo, useEffect } from 'react'
import { X, Download, FileText, Calendar, CreditCard, Filter, Loader, Users } from 'lucide-react'
import { formatCurrency } from '../utils/calculations'
import { supabase } from '../lib/supabase'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ReportModal({ cards = [], people = [], onClose, user, section = 'family' }) {
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
    const [selectedPeople, setSelectedPeople] = useState([]) // vacío = todos
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('') // vacío = todos
    const [selectedCategories, setSelectedCategories] = useState([]) // vacío = todas
    const [showFilters, setShowFilters] = useState(true)
    const [allExpenses, setAllExpenses] = useState([])
    const [loading, setLoading] = useState(true)

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

    // Helper para parsear shared_with
    const parseSharedWith = (sharedWith) => {
        if (!sharedWith) return []
        try {
            return typeof sharedWith === 'string' ? JSON.parse(sharedWith) : sharedWith
        } catch {
            return Array.isArray(sharedWith) ? sharedWith : [sharedWith]
        }
    }

    // Filtrar gastos según criterios
    const filteredExpenses = useMemo(() => {
        return allExpenses.filter(exp => {
            // Filtro de fecha - extraer solo YYYY-MM-DD de la fecha del gasto
            const expDateStr = exp.date ? exp.date.substring(0, 10) : ''
            const fromDateStr = dateFrom ? dateFrom.substring(0, 10) : ''
            const toDateStr = dateTo ? dateTo.substring(0, 10) : ''

            // Comparación de strings (funciona porque el formato es YYYY-MM-DD)
            if (!expDateStr || expDateStr < fromDateStr || expDateStr > toDateStr) {
                return false
            }

            // Filtro de tarjeta (si hay seleccionadas)
            if (selectedCards.length > 0) {
                if (!selectedCards.includes(exp.card)) return false
            }

            // Filtro de miembros (si hay seleccionados) - mostrar si participa
            if (selectedPeople.length > 0) {
                const sharedWith = parseSharedWith(exp.shared_with)
                const owner = exp.owner || ''

                // Función para normalizar strings (quita acentos, espacios, lowercase)
                const normalize = (str) => str
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // quita acentos
                    .trim()
                    .toLowerCase()

                // Convertir nombres de display a nombres reales para comparar
                const selectedRealNames = selectedPeople.map(displayName => {
                    const person = people.find(p => p.name === displayName)
                    return person?.realName || person?.name || displayName
                })

                // Mostrar si el miembro es owner O está en shared_with (comparación normalizada)
                const participates = selectedRealNames.some(realName => {
                    const normalizedRealName = normalize(realName)
                    const normalizedOwner = normalize(owner)
                    const normalizedShared = sharedWith.map(normalize)

                    return normalizedRealName === normalizedOwner ||
                        normalizedShared.includes(normalizedRealName)
                })
                if (!participates) return false
            }

            // Filtro de método de pago
            if (selectedPaymentMethod && exp.payment_method !== selectedPaymentMethod) {
                return false
            }

            // Filtro de categoría
            if (selectedCategories.length > 0 && !selectedCategories.includes(exp.category)) {
                return false
            }

            return true
        }).sort((a, b) => new Date(b.date) - new Date(a.date))
    }, [allExpenses, dateFrom, dateTo, selectedCards, selectedPeople, selectedPaymentMethod, selectedCategories])

    // Calcular totales - LÓGICA SIMPLE
    const totals = useMemo(() => {
        const byCard = {}
        let total = 0

        // Normalizar para comparar nombres con acentos
        const normalize = (str) => {
            if (!str) return ''
            return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
        }

        // Obtener realNames de los seleccionados
        const selectedRealNames = selectedPeople.map(displayName => {
            const person = people.find(p => p.name === displayName)
            return normalize(person?.realName || person?.name || displayName)
        })

        filteredExpenses.forEach(exp => {
            // Monto de la cuota
            const amount = exp.installments > 1
                ? exp.total_amount / exp.installments
                : exp.total_amount

            let amountToAdd = amount

            // Si hay filtro de miembro, calcular su parte
            if (selectedPeople.length > 0 && !isPersonal) {
                // Obtener todos los participantes del gasto
                const sharedWith = parseSharedWith(exp.shared_with)
                const ownerNormalized = normalize(exp.owner)

                // Crear set de participantes normalizados (owner + shared_with sin duplicados)
                const participantsSet = new Set([ownerNormalized])
                sharedWith.forEach(name => {
                    if (name === 'Yo') {
                        // "Yo" es quien creó el gasto, agregar con su realName
                        const creator = people.find(p => p.member_id === exp.user_id)
                        participantsSet.add(normalize(creator?.realName || creator?.name || exp.owner))
                    } else {
                        participantsSet.add(normalize(name))
                    }
                })

                const participantCount = participantsSet.size || 1
                const sharePerPerson = amount / participantCount

                // Contar cuántos de los seleccionados participan en este gasto
                let selectedInThisExpense = 0
                selectedRealNames.forEach(selName => {
                    if (participantsSet.has(selName)) {
                        selectedInThisExpense++
                    }
                })

                amountToAdd = sharePerPerson * selectedInThisExpense
            }

            total += amountToAdd
            const cardName = exp.card || 'Sin tarjeta'
            byCard[cardName] = (byCard[cardName] || 0) + amountToAdd
        })

        return { total, byCard }
    }, [filteredExpenses, selectedPeople, isPersonal, people])

    // Toggle tarjeta seleccionada
    const toggleCard = (cardName) => {
        setSelectedCards(prev =>
            prev.includes(cardName)
                ? prev.filter(c => c !== cardName)
                : [...prev, cardName]
        )
    }

    // Toggle persona seleccionada
    const togglePerson = (personName) => {
        setSelectedPeople(prev =>
            prev.includes(personName)
                ? prev.filter(p => p !== personName)
                : [...prev, personName]
        )
    }

    // Toggle categoría seleccionada
    const toggleCategory = (categoryName) => {
        setSelectedCategories(prev =>
            prev.includes(categoryName)
                ? prev.filter(c => c !== categoryName)
                : [...prev, categoryName]
        )
    }

    // Obtener categorías únicas
    const uniqueCategories = useMemo(() => {
        const categories = [...new Set(allExpenses.map(exp => exp.category).filter(Boolean))]
        return categories.sort()
    }, [allExpenses])

    // Formatear fecha para mostrar (evitando problemas de zona horaria)
    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        // Agregar T12:00:00 para evitar que UTC cause desfase de día
        const date = new Date(dateStr.substring(0, 10) + 'T12:00:00')
        return date.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    // Generar PDF para descarga
    const downloadPDF = () => {
        try {
            const doc = new jsPDF()

            // Línea decorativa superior (verde petróleo)
            doc.setFillColor(45, 62, 64)
            doc.rect(0, 0, 220, 8, 'F')

            // Título
            doc.setFontSize(22)
            doc.setTextColor(45, 62, 64)
            doc.text(title, 14, 22)

            // Subtítulo de marca
            doc.setFontSize(10)
            doc.setTextColor(196, 176, 144) // Dorado
            doc.text('Powered by AMG Digital', 14, 29)

            // Período
            doc.setFontSize(11)
            doc.setTextColor(100, 100, 100)
            doc.text(`Período: ${formatDate(dateFrom)} al ${formatDate(dateTo)}`, 14, 40)

            // Información de filtros
            let yPos = 47
            if (selectedCards.length > 0) {
                doc.text(`Tarjetas: ${selectedCards.join(', ')}`, 14, yPos)
                yPos += 7
            }

            // Si hay miembros seleccionados, generar sección por cada uno
            if (!isPersonal && selectedPeople.length > 0) {
                doc.text(`Miembros: ${selectedPeople.join(', ')}`, 14, yPos)
                yPos += 10

                // Total general
                doc.setFontSize(14)
                doc.setTextColor(45, 62, 64)
                doc.text(`Total General: ${formatCurrency(totals.total)}`, 14, yPos)
                yPos += 15

                // Para cada miembro seleccionado, generar una sección
                selectedPeople.forEach((personName, index) => {
                    // Filtrar gastos donde participa esta persona
                    const personExpenses = filteredExpenses.filter(exp => {
                        const owner = exp.owner || 'Yo'
                        const sharedWith = parseSharedWith(exp.shared_with)
                        return owner === personName || sharedWith.includes(personName)
                    })

                    // Calcular subtotal de esta persona
                    const personTotal = personExpenses.reduce((sum, exp) => {
                        const amount = exp.installments > 1
                            ? exp.total_amount / exp.installments
                            : exp.total_amount
                        return sum + amount
                    }, 0)

                    // Agregar nueva página si no es el primero y hay poco espacio
                    if (index > 0 && yPos > 200) {
                        doc.addPage()
                        yPos = 20
                    }

                    // Encabezado de sección del miembro
                    doc.setFillColor(45, 62, 64)
                    doc.rect(14, yPos - 5, 180, 10, 'F')
                    doc.setFontSize(12)
                    doc.setTextColor(230, 213, 184)
                    doc.text(`GASTOS DE ${personName.toUpperCase()}`, 18, yPos + 2)
                    yPos += 12

                    doc.setFontSize(11)
                    doc.setTextColor(45, 62, 64)
                    doc.text(`Subtotal ${personName}: ${formatCurrency(personTotal)}`, 14, yPos)
                    yPos += 8

                    // Tabla de gastos de esta persona
                    const tableData = personExpenses.map(exp => {
                        const amount = exp.installments > 1
                            ? exp.total_amount / exp.installments
                            : exp.total_amount
                        const owner = exp.owner || 'Yo'
                        const sharedWith = parseSharedWith(exp.shared_with)
                        const sharedText = sharedWith.length > 0 ? sharedWith.join(', ') : 'Personal'
                        return [
                            formatDate(exp.date),
                            exp.description + (exp.installments > 1 ? ` (${exp.current_installment || 1}/${exp.installments})` : ''),
                            owner,
                            sharedText,
                            exp.card || '-',
                            formatCurrency(amount)
                        ]
                    })

                    if (tableData.length > 0) {
                        autoTable(doc, {
                            startY: yPos,
                            head: [['Fecha', 'Descripción', 'Pagó', 'Compartido', 'Tarjeta', 'Monto']],
                            body: tableData,
                            theme: 'striped',
                            headStyles: {
                                fillColor: [45, 62, 64],
                                textColor: [230, 213, 184],
                                fontStyle: 'bold',
                                fontSize: 8
                            },
                            alternateRowStyles: {
                                fillColor: [245, 245, 250]
                            },
                            styles: {
                                fontSize: 8,
                                cellPadding: 3
                            },
                            columnStyles: {
                                0: { cellWidth: 22 },
                                1: { cellWidth: 45 },
                                2: { cellWidth: 25 },
                                3: { cellWidth: 30 },
                                4: { cellWidth: 25 },
                                5: { cellWidth: 25, halign: 'right' }
                            },
                            margin: { left: 14, right: 14 }
                        })
                        yPos = doc.lastAutoTable.finalY + 15
                    } else {
                        doc.setFontSize(10)
                        doc.setTextColor(150, 150, 150)
                        doc.text('No hay gastos para este miembro', 14, yPos)
                        yPos += 15
                    }
                })
            } else {
                // Sin filtro de miembros - tabla general
                doc.setFontSize(14)
                doc.setTextColor(45, 62, 64)
                doc.text(`Total: ${formatCurrency(totals.total)}`, 14, yPos + 7)

                const tableData = filteredExpenses.map(exp => {
                    const amount = exp.installments > 1
                        ? exp.total_amount / exp.installments
                        : exp.total_amount
                    const owner = exp.owner || 'Yo'
                    const sharedWith = parseSharedWith(exp.shared_with)
                    const sharedText = sharedWith.length > 0 ? sharedWith.join(', ') : 'Personal'

                    if (isPersonal) {
                        return [
                            formatDate(exp.date),
                            exp.description + (exp.installments > 1 ? ` (${exp.current_installment || 1}/${exp.installments})` : ''),
                            exp.category,
                            exp.card || '-',
                            formatCurrency(amount)
                        ]
                    } else {
                        return [
                            formatDate(exp.date),
                            exp.description + (exp.installments > 1 ? ` (${exp.current_installment || 1}/${exp.installments})` : ''),
                            owner,
                            sharedText,
                            exp.card || '-',
                            formatCurrency(amount)
                        ]
                    }
                })

                const headers = isPersonal
                    ? [['Fecha', 'Descripción', 'Categoría', 'Tarjeta', 'Monto']]
                    : [['Fecha', 'Descripción', 'Pagó', 'Compartido', 'Tarjeta', 'Monto']]

                const columnStyles = isPersonal
                    ? {
                        0: { cellWidth: 25 },
                        1: { cellWidth: 60 },
                        2: { cellWidth: 35 },
                        3: { cellWidth: 35 },
                        4: { cellWidth: 30, halign: 'right' }
                    }
                    : {
                        0: { cellWidth: 22 },
                        1: { cellWidth: 45 },
                        2: { cellWidth: 25 },
                        3: { cellWidth: 30 },
                        4: { cellWidth: 25 },
                        5: { cellWidth: 25, halign: 'right' }
                    }

                autoTable(doc, {
                    startY: yPos + 15,
                    head: headers,
                    body: tableData,
                    theme: 'striped',
                    headStyles: {
                        fillColor: [45, 62, 64],
                        textColor: [230, 213, 184],
                        fontStyle: 'bold'
                    },
                    alternateRowStyles: {
                        fillColor: [245, 245, 250]
                    },
                    styles: {
                        fontSize: 9,
                        cellPadding: 4
                    },
                    columnStyles,
                    margin: { left: 14, right: 14 }
                })
            }

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
                : selectedPeople.length > 0
                    ? `reporte_${selectedPeople.join('_')}_${dateFrom}_a_${dateTo}.pdf`
                    : `reporte_gastos_${dateFrom}_a_${dateTo}.pdf`
            doc.save(fileName)
        } catch (error) {
            console.error('Error generando PDF:', error)
            alert('Error al generar el PDF: ' + error.message)
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-[var(--divider-color)]">
                    <h2 className="text-xl font-bold text-theme-primary flex items-center gap-2">
                        <FileText className="w-6 h-6" />
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--glass-card-hover)] rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-theme-secondary" />
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
                                    className="flex items-center gap-2 text-sm text-theme-secondary hover:text-theme-primary mb-2"
                                >
                                    <Filter className="w-4 h-4" />
                                    {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                                </button>

                                {showFilters && (
                                    <div className="bg-[var(--glass-bg)] border border-[var(--divider-color)] rounded-lg p-4 space-y-4">
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

                                        {/* Método de Pago */}
                                        <div>
                                            <label className="label flex items-center gap-1 mb-2">
                                                <Filter className="w-4 h-4" />
                                                Método de Pago
                                            </label>
                                            <select
                                                value={selectedPaymentMethod}
                                                onChange={e => setSelectedPaymentMethod(e.target.value)}
                                                className="input-field"
                                            >
                                                <option value="">Todos</option>
                                                <option value="efectivo">Efectivo</option>
                                                <option value="transferencia">Transferencia</option>
                                                <option value="qr">QR</option>
                                                <option value="tarjeta">Tarjeta</option>
                                            </select>
                                        </div>

                                        {/* Categorías */}
                                        {uniqueCategories.length > 0 && (
                                            <div>
                                                <label className="label flex items-center gap-1 mb-2">
                                                    <Filter className="w-4 h-4" />
                                                    Categorías {selectedCategories.length > 0 && `(${selectedCategories.length})`}
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {uniqueCategories.map(category => (
                                                        <label
                                                            key={category}
                                                            className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedCategories.includes(category)
                                                                ? 'bg-blue-600 text-white shadow-md'
                                                                : 'bg-[var(--selection-inactive-bg)] text-[var(--selection-inactive-text)] hover:bg-[var(--glass-card-hover)]'
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedCategories.includes(category)}
                                                                onChange={() => toggleCategory(category)}
                                                                className="hidden"
                                                            />
                                                            {category}
                                                        </label>
                                                    ))}
                                                </div>
                                                {selectedCategories.length > 0 && (
                                                    <button
                                                        onClick={() => setSelectedCategories([])}
                                                        className="mt-2 px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30"
                                                    >
                                                        ✕ Limpiar
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Tarjetas */}
                                        {cards.length > 0 && (
                                            <div>
                                                <label className="label flex items-center gap-1 mb-2">
                                                    <Filter className="w-4 h-4" />
                                                    Tarjetas {selectedCards.length > 0 && `(${selectedCards.length})`}
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {cards.map(card => (
                                                        <label
                                                            key={card.id}
                                                            className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedCards.includes(card.name)
                                                                ? 'bg-blue-600 text-white shadow-md'
                                                                : 'bg-[var(--selection-inactive-bg)] text-[var(--selection-inactive-text)] hover:bg-[var(--glass-card-hover)]'
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedCards.includes(card.name)}
                                                                onChange={() => toggleCard(card.name)}
                                                                className="hidden"
                                                            />
                                                            {card.name}
                                                        </label>
                                                    ))}
                                                </div>
                                                {selectedCards.length > 0 && (
                                                    <button
                                                        onClick={() => setSelectedCards([])}
                                                        className="mt-2 px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30"
                                                    >
                                                        ✕ Limpiar
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {cards.length === 0 && (
                                            <div>
                                                <label className="label flex items-center gap-1 mb-2">
                                                    <Filter className="w-4 h-4" />
                                                    Tarjetas
                                                </label>
                                                <p className="text-xs text-gray-500">No hay tarjetas</p>
                                            </div>
                                        )}

                                        {/* Miembros (solo para gastos familiares) */}
                                        {!isPersonal && people.length > 0 && (
                                            <div>
                                                <label className="label flex items-center gap-1 mb-2">
                                                    <Filter className="w-4 h-4" />
                                                    Miembros {selectedPeople.length > 0 && `(${selectedPeople.length})`}
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {people.map(person => (
                                                        <label
                                                            key={person.id || person.name}
                                                            className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedPeople.includes(person.name)
                                                                ? 'bg-blue-600 text-white shadow-md'
                                                                : 'bg-[var(--selection-inactive-bg)] text-[var(--selection-inactive-text)] hover:bg-[var(--glass-card-hover)]'
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedPeople.includes(person.name)}
                                                                onChange={() => togglePerson(person.name)}
                                                                className="hidden"
                                                            />
                                                            {person.name}
                                                        </label>
                                                    ))}
                                                </div>
                                                {selectedPeople.length > 0 && (
                                                    <button
                                                        onClick={() => setSelectedPeople([])}
                                                        className="mt-2 px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30"
                                                    >
                                                        ✕ Limpiar
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Resumen */}
                            <div className="bg-gradient-to-r from-[#2D3E40]/10 to-[#C4B090]/10 border border-[var(--divider-color)] rounded-lg p-4 mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-theme-secondary">Total del período</span>
                                    <span className="text-2xl font-bold text-theme-primary">
                                        {formatCurrency(totals.total)}
                                    </span>
                                </div>
                                <div className="text-xs text-theme-secondary">
                                    {filteredExpenses.length} gastos • {formatDate(dateFrom)} al {formatDate(dateTo)}
                                </div>

                                {/* Desglose por tarjeta */}
                                {Object.keys(totals.byCard).length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-[var(--divider-color)] grid grid-cols-2 gap-2">
                                        {Object.entries(totals.byCard).map(([card, amount]) => (
                                            <div key={card} className="flex justify-between text-sm">
                                                <span className="text-theme-secondary">{card}</span>
                                                <span className="text-theme-primary">{formatCurrency(amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tabla de gastos */}
                            <div>
                                {filteredExpenses.length === 0 ? (
                                    <div className="text-center py-8 text-theme-secondary">
                                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        No hay gastos en el período seleccionado
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-lg border border-[var(--divider-color)]">
                                        <table className="w-full text-sm">
                                            <thead className="bg-[var(--glass-bg)] border-b border-[var(--divider-color)]">
                                                <tr>
                                                    <th className="text-left p-3 text-theme-secondary font-semibold">Fecha</th>
                                                    <th className="text-left p-3 text-theme-secondary font-semibold">Descripción</th>
                                                    <th className="text-left p-3 text-theme-secondary font-semibold">Categoría</th>
                                                    {!isPersonal && <th className="text-left p-3 text-theme-secondary font-semibold">Pagó</th>}
                                                    {!isPersonal && <th className="text-left p-3 text-theme-secondary font-semibold">Compartido</th>}
                                                    <th className="text-left p-3 text-theme-secondary font-semibold">Tarjeta</th>
                                                    <th className="text-right p-3 text-theme-secondary font-semibold">Monto</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--divider-color)]">
                                                {filteredExpenses.map(exp => {
                                                    const amount = exp.installments > 1
                                                        ? exp.total_amount / exp.installments
                                                        : exp.total_amount
                                                    const owner = exp.owner || 'Yo'
                                                    const sharedWith = parseSharedWith(exp.shared_with)
                                                    const sharedText = sharedWith.length > 0
                                                        ? sharedWith.join(', ')
                                                        : 'Personal'
                                                    return (
                                                        <tr key={exp.id} className="hover:bg-[var(--glass-card-hover)] transition-colors">
                                                            <td className="p-3 text-theme-secondary whitespace-nowrap">{formatDate(exp.date)}</td>
                                                            <td className="p-3 text-theme-primary">
                                                                {exp.description}
                                                                {exp.installments > 1 && (
                                                                    <span className="ml-2 text-xs text-theme-secondary">
                                                                        ({exp.current_installment || 1}/{exp.installments})
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-theme-secondary">{exp.category}</td>
                                                            {!isPersonal && <td className="p-3 text-theme-secondary">{owner}</td>}
                                                            {!isPersonal && <td className="p-3 text-theme-secondary">{sharedText}</td>}
                                                            <td className="p-3 text-theme-secondary">{exp.card || '-'}</td>
                                                            <td className="p-3 text-theme-primary font-semibold text-right whitespace-nowrap">
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
                <div className="flex gap-3 p-4 border-t border-[var(--divider-color)]">
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
