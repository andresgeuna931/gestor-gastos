import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { formatCurrency, getMonthlyAmount } from '../utils/calculations'
import { useTheme } from '../context/ThemeContext'

// Paletas de colores optimizadas para cada tema
const DARK_THEME_COLORS = [
    '#E6D5B8', // Dorado principal (resalta en oscuro)
    '#2D3E40', // Verde Petróleo (oscuro pero visible)
    '#C4B090', // Dorado oscuro
    '#4A6668', // Verde petróleo claro
    '#D4C3A5', // Beige claro
    '#6B8284', // Verde grisáceo
]

const LIGHT_THEME_COLORS = [
    '#2D3E40', // Verde Petróleo principal (fuerte contraste en claro)
    '#C4B090', // Dorado (suave)
    '#3A5254', // Verde Petróleo medio
    '#D4C3A5', // Beige
    '#1F2C2E', // Verde muy oscuro
    '#E6D5B8', // Dorado muy claro
]

const OTHERS_COLOR = {
    dark: '#6B7280', // Gray 500 (más claro que antes para mejor visibilidad)
    light: '#9CA3AF'  // Gray 400
}

export default function CategoryChart({ expenses, title = "Gastos por Categoría" }) {
    const { theme } = useTheme()

    // Seleccionar paleta según el tema
    const activeColors = theme === 'light' ? LIGHT_THEME_COLORS : DARK_THEME_COLORS
    const otherColor = theme === 'light' ? OTHERS_COLOR.light : OTHERS_COLOR.dark

    // Color de fondo para tooltip (solido para legibilidad)
    const tooltipBg = theme === 'light' ? '#ffffff' : '#1f2937' // White vs Gray-800
    const tooltipBorder = theme === 'light' ? '#e5e7eb' : '#374151'
    const tooltipTextPrimary = theme === 'light' ? '#111827' : '#f9fafb'
    const tooltipTextSecondary = theme === 'light' ? '#4b5563' : '#d1d5db'

    // 1. Agrupar gastos por categoría
    const categoryData = expenses.reduce((acc, expense) => {
        const monthlyAmount = getMonthlyAmount(expense.total_amount, expense.installments)

        if (!acc[expense.category]) {
            acc[expense.category] = 0
        }
        acc[expense.category] += monthlyAmount
        return acc
    }, {})

    // 2. Convertir a array y ordenar
    let sortedData = Object.entries(categoryData)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

    // 3. Lógica "Top N + Otros"
    const TOP_N = 6
    let chartData = []

    if (sortedData.length <= TOP_N) {
        chartData = sortedData
    } else {
        // Tomar los top N
        const topCategories = sortedData.slice(0, TOP_N)

        // Sumar el resto
        const otherSum = sortedData
            .slice(TOP_N)
            .reduce((sum, item) => sum + item.value, 0)

        chartData = [...topCategories, { name: 'Varios', value: otherSum, isOther: true }]
    }

    // Si no hay datos
    if (chartData.length === 0) {
        return (
            <div className="glass p-6 mb-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                    📊 {title}
                </h3>
                <div className="text-center py-8 text-theme-secondary">
                    No hay datos para mostrar
                </div>
            </div>
        )
    }

    // Total para calcular porcentajes
    const total = chartData.reduce((sum, item) => sum + item.value, 0)

    // Tooltip personalizado (Mejorado contraste)
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            const percentage = ((data.value / total) * 100).toFixed(1)
            return (
                <div
                    className="p-3 shadow-xl rounded-lg"
                    style={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderWidth: '1px'
                    }}
                >
                    <p style={{ color: tooltipTextPrimary }} className="font-bold mb-1">{data.name}</p>
                    <p style={{ color: tooltipTextPrimary }} className="font-mono text-lg">{formatCurrency(data.value)}</p>
                    <p style={{ color: tooltipTextSecondary }} className="text-xs">{percentage}% del total</p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="glass p-6 mb-6">
            <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                📊 {title}
            </h3>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isOther ? otherColor : activeColors[index % activeColors.length]}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            formatter={(value, entry) => (
                                <span className="text-theme-secondary text-xs font-medium ml-1">{value}</span>
                            )}
                            wrapperStyle={{ paddingTop: '20px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Lista: Si hubo agrupación, mostramos un resumen de qué hay en "Otros" es útil, pero para mantener simpleza solo nota */}
            {sortedData.length > TOP_N && (
                <div className="mt-4 text-center">
                    <p className="text-[10px] text-theme-secondary opacity-60">
                        * {sortedData.length - TOP_N} categorías menores agrupadas en "Varios"
                    </p>
                </div>
            )}
        </div>
    )
}
