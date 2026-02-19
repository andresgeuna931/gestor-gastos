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

// Calcular totales dinámicos basados en personas de la BD
// Ahora también calcula balances y transferencias para saldar
export function calculateDynamicTotals(expenses, people) {
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
