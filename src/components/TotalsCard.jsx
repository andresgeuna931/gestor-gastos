import { formatCurrency } from '../utils/calculations'
import { getGenderEmoji } from '../utils/gender'

// Obtener emoji según género del nombre
const getEmoji = (name) => getGenderEmoji(name)

// Calcular totales dinámicos basados en personas de la BD
function calculateDynamicTotals(expenses, people) {
    const totals = {}
    let total = 0

    // Inicializar totales en 0 para cada persona
    people.forEach(p => {
        totals[p.name] = 0
    })

    expenses.forEach(exp => {
        const amount = exp.installments > 1
            ? exp.total_amount / exp.installments
            : exp.total_amount

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

        if (exp.share_type === 'personal' || sharedWith.length === 0) {
            // Gasto personal - todo para el owner
            if (totals[exp.owner] !== undefined) {
                totals[exp.owner] += amount
            }
        } else {
            // Gasto compartido - dividir entre owner y shared_with
            const participants = [exp.owner, ...sharedWith]
            const shareAmount = amount / participants.length

            participants.forEach(name => {
                if (totals[name] !== undefined) {
                    totals[name] += shareAmount
                }
            })
        }

        total += amount
    })

    totals.total = total
    return totals
}

export default function TotalsCard({ expenses, people = [], monthName }) {
    // Calcular totales dinámicamente
    const totals = calculateDynamicTotals(expenses, people)

    if (people.length === 0) {
        return (
            <div className="glass p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    💰 Resumen del Mes
                </h2>
                <p className="text-gray-400 text-center py-4">
                    Agregá miembros desde el botón "Miembros" para ver el resumen
                </p>
                <div className="border-t border-white/10 pt-4 mt-4">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total Familiar</span>
                        <span className="text-2xl font-bold text-white">
                            {formatCurrency(totals.total || 0)}
                        </span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="glass p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                💰 Resumen del Mes
            </h2>

            <div className={`grid grid-cols-1 ${people.length === 2 ? 'sm:grid-cols-2' : people.length >= 3 ? 'sm:grid-cols-3' : ''} gap-4 mb-4`}>
                {people.map((person) => (
                    <div key={person.id} className="total-card">
                        <div className="text-2xl mb-1">{getEmoji(person.name)}</div>
                        <div className="text-sm text-gray-300 mb-1">{person.name}</div>
                        <div className="text-xl font-bold text-white">
                            {formatCurrency(totals[person.name] || 0)}
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-t border-white/10 pt-4 mt-4">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Familiar</span>
                    <span className="text-2xl font-bold text-white">
                        {formatCurrency(totals.total || 0)}
                    </span>
                </div>
            </div>
        </div>
    )
}
