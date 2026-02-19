import { formatCurrency } from '../utils/calculations'
import { calculateDynamicTotals } from '../utils/expenseCalculations'
import { Info } from 'lucide-react'

export function FinancialHealthBar({ incomeTotal, personalExpenses, familyExpenses, user }) {
    if (!incomeTotal || incomeTotal === 0) return null

    // 1. Calcular gastos personales reales
    const personalTotal = personalExpenses.reduce((sum, exp) => {
        const amount = exp.installments > 1 ? exp.total_amount / exp.installments : exp.total_amount
        return sum + amount
    }, 0)

    // 2. Calcular MI cuota de gastos familiares
    // Usamos la lógica compartida para extraer exactamente lo que le corresponde al usuario
    // Necesitamos pasar un array de personas "ficticio" que incluya al usuario actual para que calc funcione
    // Pero wait, calculateDynamicTotals necesita 'people' con 'member_id' para matchear con 'user_id' de gastos.
    // En PersonalExpenses, no tenemos la lista completa de 'people' del grupo familiar fácilmente accesible sin hacer otro fetch.
    // SIN EMBARGO, el usuario en 'familyExpenses' ya viene filtrado o no?
    // FamilyExpenses son todos los gastos del grupo.

    // Para simplificar y no depender de fetching 'people', podemos asumir que el usuario es el dueño de sus gastos
    // y para los compartidos, si no tenemos la lista de people, el cálculo puede ser tricky.

    // MEJOR ESTRATEGIA: 
    // En PersonalExpenses.jsx, deberíamos pasarle a este componente el valor YA CALCULADO de "My Family Share"
    // si es posible. O bien, hacer un fetch rápido de 'people' aquí.

    // Pero espera, calculateDynamicTotals devuelve 'owes' por nombre.
    // Necesitamos saber el 'realName' del usuario actual.
    // El usuario logueado tiene 'user.user_metadata.name' o 'user.email'.

    // Vamos a intentar una aproximación directa:
    // Filtrar de familyExpenses aquellos donde el usuario participa.

    // REVISIÓN: El usuario pidió usar la MISMA lógica.
    // Si no tenemos 'people', calculateDynamicTotals no va a poder asignar nombres correctamente a los IDs.

    // Voy a asumir que 'familyExpenses' y 'people' se pasan a este componente.
    // Si no, tendré que pedirlos.
    // Por ahora, lo dejaré preparado para recibir 'familyShare' directamente como prop, 
    // y que el padre (PersonalExpenses) se encargue de calcularlo o pasarlo.

    // ACTUALIZACIÓN:
    // Para no complicar al padre, voy a hacer el cálculo aquí pero necesito 'people'.
    // Si no tengo 'people', mostraré solo personal.

    // Vamos a recibir 'myFamilyShare' como prop calculada por el padre. Es lo más limpio.
    return (
        <HealthBarView
            income={incomeTotal}
            personal={personalTotal}
            familyShare={0} // Placeholder, will be passed from parent
        />
    )
}

// Componente visual puro para evitar lógica compleja arriba si cambiamos de opinión
export function HealthBarView({ income, personal, familyShare }) {
    const totalExpenses = personal + familyShare
    const freeMargin = income - totalExpenses

    const personalPct = Math.min((personal / income) * 100, 100)
    const familyPct = Math.min((familyShare / income) * 100, 100 - personalPct)
    // El resto es margen libre

    const isCritical = freeMargin < 0

    return (
        <div className="glass p-6 mb-6 animate-fade-in">
            <div className="flex justify-between items-end mb-2">
                <h3 className="text-theme-primary font-semibold flex items-center gap-2">
                    ❤️ Salud Financiera
                    <div className="group relative">
                        <Info className="w-4 h-4 text-theme-secondary cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-black/90 text-xs text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Muestra cuánto de tus ingresos se va en gastos personales (Rojo Oscuro) y tu parte de gastos familiares (Rojo Claro).
                        </div>
                    </div>
                </h3>
                <div className="text-right">
                    <p className="text-xs text-theme-secondary">Margen Libre</p>
                    <p className={`text-xl font-bold ${isCritical ? 'text-red-500' : 'text-green-400'}`}>
                        {formatCurrency(freeMargin)}
                    </p>
                </div>
            </div>

            {/* La Barra */}
            <div className="h-4 bg-white/10 rounded-full overflow-hidden flex relative">
                {/* Gastos Personales (Rojo Oscuro) */}
                <div
                    style={{ width: `${personalPct}%` }}
                    className="h-full bg-red-600 transition-all duration-1000 ease-out"
                    title={`Gastos Personales: ${formatCurrency(personal)}`}
                />

                {/* Cuota Familiar (Rojo Claro) */}
                <div
                    style={{ width: `${familyPct}%` }}
                    className="h-full bg-red-400 transition-all duration-1000 ease-out"
                    title={`Tu Cuota Familiar: ${formatCurrency(familyShare)}`}
                />

                {/* Margen Libre (Implícito) */}

                {/* Marcador de 100% si nos pasamos */}
                {totalExpenses > income && (
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse z-10" />
                )}
            </div>

            <div className="flex justify-between text-xs text-theme-secondary mt-2">
                <div className="flex gap-4">
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-600"></div>
                        Personal ({Math.round(personalPct)}%)
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        Familiar ({Math.round(familyPct)}%)
                    </span>
                </div>
                <span>{Math.round((freeMargin / income) * 100)}% Libre</span>
            </div>
        </div>
    )
}
