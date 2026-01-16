import { formatCurrency } from '../utils/calculations'
import { getGenderEmoji } from '../utils/gender'

// Obtener emoji según género del nombre
const getEmoji = (name) => getGenderEmoji(name)

// Calcular totales dinámicos basados en personas de la BD
// Ahora también calcula balances y transferencias para saldar
function calculateDynamicTotals(expenses, people) {
    const owes = {} // Lo que cada persona debe pagar
    const paid = {} // Lo que cada persona pagó
    let total = 0

    // Inicializar en 0 para cada persona
    // Usamos realName como key para matching con nombres guardados en gastos
    const idToRealName = {}
    const realNameToDisplayName = {} // Para mostrar "Yo" en lugar del nombre real
    const normalizedNameMap = {} // Mapa de nombre normalizado -> realName

    // Función para normalizar nombres (lowercase, sin acentos, sin espacios extra)
    const normalizeName = (name) => {
        if (!name) return ''
        return name.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
            .trim()
    }

    // Función para encontrar el realName que corresponde a un nombre dado
    const findMatchingRealName = (name) => {
        if (!name) return null
        // Primero buscar coincidencia exacta
        if (owes[name] !== undefined) return name
        // Si no, buscar por nombre normalizado
        const normalized = normalizeName(name)
        return normalizedNameMap[normalized] || null
    }

    people.forEach(p => {
        const realName = p.realName || p.name // Fallback a name si no hay realName
        owes[realName] = 0
        paid[realName] = 0
        realNameToDisplayName[realName] = p.name // Ej: "Andres" -> "Yo"
        normalizedNameMap[normalizeName(realName)] = realName // Ej: "andres" -> "Andres"
        if (p.member_id) {
            idToRealName[p.member_id] = realName
        }
    })

    expenses.forEach(exp => {
        const amount = exp.installments > 1
            ? exp.total_amount / exp.installments
            : exp.total_amount

        // Resolver nombre del owner usando user_id (quien pagó)
        const ownerName = idToRealName[exp.user_id] || exp.owner

        // Parsear shared_with
        let sharedWith = []
        if (exp.shared_with) {
            try {
                sharedWith = typeof exp.shared_with === 'string'
                    ? JSON.parse(exp.shared_with)
                    : exp.shared_with
            } catch {
                sharedWith = [exp.shared_with]
            }
        }

        // Resolver "Yo" en shared_with al nombre del owner (creador)
        sharedWith = sharedWith.map(name => name === 'Yo' ? ownerName : name)

        // Registrar que el owner PAGÓ este monto
        if (paid[ownerName] !== undefined) {
            paid[ownerName] += amount
        }

        // Calcular cuánto le CORRESPONDE pagar a cada uno
        if (exp.share_type === 'belongs_to_other') {
            // Gasto de otra persona - 100% le corresponde a esa persona
            const belongsToRaw = sharedWith[0]
            const belongsTo = findMatchingRealName(belongsToRaw)
            if (belongsTo && owes[belongsTo] !== undefined) {
                owes[belongsTo] += amount
            }
        } else if (exp.share_type === 'personal' || sharedWith.length === 0) {
            // Gasto personal - todo para el owner
            if (owes[ownerName] !== undefined) {
                owes[ownerName] += amount
            }
        } else {
            // Gasto compartido - dividir entre owner y shared_with
            // Resolver todos los nombres usando findMatchingRealName
            const resolvedSharedWith = sharedWith
                .map(name => findMatchingRealName(name))
                .filter(name => name && name !== ownerName && name !== exp.owner)

            const participants = [ownerName, ...resolvedSharedWith]
            const shareAmount = amount / participants.length

            participants.forEach(name => {
                if (owes[name] !== undefined) {
                    owes[name] += shareAmount
                }
            })
        }

        total += amount
    })

    // Calcular balance de cada persona: positivo = le deben, negativo = debe
    // Usamos realName como key
    const balances = {}
    people.forEach(p => {
        const realName = p.realName || p.name
        balances[realName] = (paid[realName] || 0) - (owes[realName] || 0)
    })

    // Calcular transferencias para saldar (usando realName)
    const settlements = calculateSettlements(balances, realNameToDisplayName)

    return { owes, paid, balances, settlements, total, realNameToDisplayName }
}

// Calcular transferencias óptimas para saldar
function calculateSettlements(balances, realNameToDisplayName = {}) {
    const settlements = []

    // Crear arrays de deudores y acreedores
    const debtors = [] // Los que deben (balance negativo)
    const creditors = [] // Los que les deben (balance positivo)

    Object.entries(balances).forEach(([name, balance]) => {
        if (balance < -0.5) { // Umbral para evitar decimales muy pequeños
            debtors.push({ name, amount: Math.abs(balance) })
        } else if (balance > 0.5) {
            creditors.push({ name, amount: balance })
        }
    })

    // Ordenar por monto (mayor a menor) para optimizar
    debtors.sort((a, b) => b.amount - a.amount)
    creditors.sort((a, b) => b.amount - a.amount)

    // Generar transferencias
    let i = 0, j = 0
    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i]
        const creditor = creditors[j]
        const transferAmount = Math.min(debtor.amount, creditor.amount)

        if (transferAmount > 0.5) { // Solo agregar si es significativo
            settlements.push({
                // Convertir realName a displayName para la UI
                from: realNameToDisplayName[debtor.name] || debtor.name,
                to: realNameToDisplayName[creditor.name] || creditor.name,
                amount: Math.round(transferAmount) // Redondear a entero
            })
        }

        debtor.amount -= transferAmount
        creditor.amount -= transferAmount

        if (debtor.amount < 0.5) i++
        if (creditor.amount < 0.5) j++
    }

    return settlements
}

export default function TotalsCard({ expenses, people = [], monthName }) {
    // Calcular totales dinámicamente
    const { owes, paid, balances, settlements, total, realNameToDisplayName } = calculateDynamicTotals(expenses, people)

    if (people.length === 0) {
        return (
            <div className="glass p-6 mb-6">
                <h2 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                    💰 Resumen del Mes
                </h2>
                <p className="text-theme-secondary text-center py-4">
                    Agregá miembros desde el botón "Miembros" para ver el resumen
                </p>
                <div className="border-t border-[var(--divider-color)] pt-4 mt-4">
                    <div className="flex justify-between items-center">
                        <span className="text-theme-secondary">Total Familiar</span>
                        <span className="text-2xl font-bold text-theme-primary">
                            {formatCurrency(total || 0)}
                        </span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="glass p-6 mb-6">
            <h2 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                💰 Resumen del Mes
            </h2>

            <div className={`grid grid-cols-1 ${people.length === 2 ? 'sm:grid-cols-2' : people.length >= 3 ? 'sm:grid-cols-3' : ''} gap-4 mb-4`}>
                {people.map((person) => {
                    // Usar realName para el lookup, pero mostrar name (que puede ser "Yo")
                    const realName = person.realName || person.name
                    return (
                        <div key={person.id} className="total-card">
                            <div className="text-2xl mb-1">{getEmoji(person.name)}</div>
                            <div className="text-sm text-theme-secondary mb-1">{person.name}</div>
                            <div className="text-xl font-bold text-theme-primary">
                                {formatCurrency(owes[realName] || 0)}
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="border-t border-white/10 pt-4 mt-4">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Familiar</span>
                    <span className="text-2xl font-bold text-white">
                        {formatCurrency(total || 0)}
                    </span>
                </div>
            </div>

            {/* Sección Para saldar */}
            {settlements.length > 0 && (
                <div className="border-t border-white/10 pt-4 mt-4">
                    <h3 className="text-sm font-medium text-theme-secondary mb-3 flex items-center gap-2">
                        💸 Para saldar este mes:
                    </h3>
                    <div className="space-y-2">
                        {settlements.map((s, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm bg-white/5 p-2 rounded-lg">
                                <span className="text-theme-primary font-medium">{s.from}</span>
                                <span className="text-gray-500">→</span>
                                <span className="text-theme-primary font-medium">{s.to}</span>
                                <span className="ml-auto text-green-400 font-bold">
                                    {formatCurrency(s.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Si están saldados */}
            {settlements.length === 0 && expenses.length > 0 && (
                <div className="border-t border-white/10 pt-4 mt-4">
                    <div className="text-sm text-green-400 flex items-center gap-2">
                        ✅ Todos los gastos están saldados
                    </div>
                </div>
            )}
        </div>
    )
}
