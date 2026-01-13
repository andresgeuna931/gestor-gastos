import { Wallet, Users, Plane, ChevronRight, LogOut, Settings, Shield, HelpCircle } from 'lucide-react'

const ADMIN_EMAIL = 'andresgeuna931@gmail.com'

// Paleta unificada AMG Digital
const sections = [
    {
        id: 'personal',
        name: 'Gastos Personales',
        description: 'Controla tus gastos individuales',
        icon: Wallet,
        color: 'from-[#2D3E40] to-[#3A5254]',
        shadowColor: 'shadow-[#2D3E40]/40'
    },
    {
        id: 'family',
        name: 'Gastos Familiares',
        description: 'Gastos compartidos con tu familia',
        icon: Users,
        color: 'from-[#3A5254] to-[#4A6668]',
        shadowColor: 'shadow-[#3A5254]/40'
    },
    {
        id: 'groups',
        name: 'Gastos Grupales',
        description: 'Viajes, asados, regalos, eventos compartidos',
        icon: Plane,
        color: 'from-[#C4B090] to-[#E6D5B8]',
        shadowColor: 'shadow-[#C4B090]/40'
    }
]

// Calcular días restantes
const getDaysRemaining = (expiresAt) => {
    if (!expiresAt) return null
    const now = new Date()
    const expires = new Date(expiresAt)
    const diffTime = expires - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
}

export default function MainDashboard({ user, subscription, onNavigate, onLogout }) {
    const isAdmin = user?.email === ADMIN_EMAIL
    const daysRemaining = getDaysRemaining(subscription?.expires_at)
    const showDaysBadge = subscription?.status === 'active' && daysRemaining !== null && daysRemaining <= 30

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            Gestor de Gastos
                        </h1>
                        <div className="flex items-center gap-3">
                            <p className="text-gray-400">
                                Selecciona una sección para comenzar
                            </p>
                            {showDaysBadge && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${daysRemaining <= 10
                                        ? 'bg-red-500/20 text-red-300'
                                        : 'bg-green-500/20 text-green-300'
                                    }`}>
                                    {daysRemaining} días restantes
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {isAdmin && (
                            <button
                                onClick={() => onNavigate('admin')}
                                className="p-2 text-[#E6D5B8] hover:text-white transition-colors"
                                title="Panel Admin"
                            >
                                <Shield className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={() => onNavigate('help')}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                            title="Ayuda"
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => onNavigate('settings')}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                            title="Configuración"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onLogout}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                            title="Cerrar sesión"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </header >

                {/* Secciones */}
                < div className="grid gap-4 md:gap-6" >
                    {
                        sections.map((section) => {
                            const Icon = section.icon
                            return (
                                <button
                                    key={section.id}
                                    onClick={() => onNavigate(section.id)}
                                    className="glass-card p-6 text-left group hover:scale-[1.02] transition-all duration-300"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg ${section.shadowColor}`}>
                                            <Icon className="w-7 h-7 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-xl font-semibold text-white mb-1">
                                                {section.name}
                                            </h2>
                                            <p className="text-gray-400 text-sm">
                                                {section.description}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-6 h-6 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                    </div>
                                </button>
                            )
                        })
                    }
                </div >

                {/* Footer */}
                < footer className="mt-12 text-center text-gray-500 text-sm" >
                    <p>Control de Gastos v2.0</p>
                    <p>Powered by <span className="text-[#E6D5B8]">AMG Digital</span></p>
                </footer >
            </div >
        </div >
    )
}
