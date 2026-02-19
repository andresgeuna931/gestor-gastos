import { formatCurrency } from '../utils/calculations'
import { getGenderEmoji } from '../utils/gender'
import { calculateDynamicTotals } from '../utils/expenseCalculations'

// Obtener emoji según género del nombre
const getEmoji = (name) => getGenderEmoji(name)

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
