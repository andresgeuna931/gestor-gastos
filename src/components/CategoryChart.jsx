import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { formatCurrency, getMonthlyAmount } from '../utils/calculations'

// Colores para las categorías (paleta premium)
const COLORS = [
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#ec4899', // pink
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#f97316', // orange
    '#84cc16', // lime
    '#a855f7', // purple
]

export default function CategoryChart({ expenses, title = "Gastos por Categoría" }) {
    // Agrupar gastos por categoría
    const categoryData = expenses.reduce((acc, expense) => {
        const monthlyAmount = getMonthlyAmount(expense.total_amount, expense.installments)

        if (!acc[expense.category]) {
            acc[expense.category] = 0
        }
        acc[expense.category] += monthlyAmount
        return acc
    }, {})

    // Convertir a formato para Recharts y ordenar por monto
    const chartData = Object.entries(categoryData)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

    // Si no hay datos
    if (chartData.length === 0) {
        return (
            <div className="glass p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    📊 {title}
                </h3>
                <div className="text-center py-8 text-gray-400">
                    No hay datos para mostrar
                </div>
            </div>
        )
    }

    // Total para calcular porcentajes
    const total = chartData.reduce((sum, item) => sum + item.value, 0)

    // Tooltip personalizado
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0]
            const percentage = ((data.value / total) * 100).toFixed(1)
            return (
                <div className="glass-card p-3 border border-white/20">
                    <p className="text-white font-medium">{data.name}</p>
                    <p className="text-gray-300">{formatCurrency(data.value)}</p>
                    <p className="text-gray-400 text-sm">{percentage}% del total</p>
                </div>
            )
        }
        return null
    }

    // Leyenda personalizada
    const CustomLegend = ({ payload }) => (
        <div className="flex flex-wrap justify-center gap-3 mt-4">
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5 text-sm">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-300">{entry.value}</span>
                </div>
            ))}
        </div>
    )

    return (
        <div className="glass p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                📊 {title}
            </h3>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={800}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    stroke="transparent"
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend content={<CustomLegend />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Lista de categorías con montos */}
            <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                {chartData.map((item, index) => {
                    const percentage = ((item.value / total) * 100).toFixed(1)
                    return (
                        <div
                            key={item.name}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="text-gray-300">{item.name}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-white font-medium">
                                    {formatCurrency(item.value)}
                                </span>
                                <span className="text-gray-500 text-sm ml-2">
                                    ({percentage}%)
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
