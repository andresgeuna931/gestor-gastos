import { Wallet, Users, Plane, ChevronRight, LogOut, Settings, Shield, HelpCircle } from 'lucide-react'

const ADMIN_EMAIL = 'andresgeuna931@gmail.com'

const sections = [
    {
        id: 'personal',
        name: 'Gastos Personales',
        description: 'Controla tus gastos individuales',
        icon: Wallet,
        color: 'from-violet-500 to-purple-600',
        shadowColor: 'shadow-violet-500/30'
    },
    {
        id: 'family',
        name: 'Gastos Familiares',
        description: 'Gastos compartidos con tu familia',
        icon: Users,
        color: 'from-cyan-500 to-blue-600',
        shadowColor: 'shadow-cyan-500/30'
    },
    {
        id: 'groups',
        name: 'Gastos Grupales',
        description: 'Viajes, asados, regalos, eventos compartidos',
        icon: Plane,
        color: 'from-amber-500 to-orange-600',
        shadowColor: 'shadow-amber-500/30'
    }
]

export default function MainDashboard({ user, onNavigate, onLogout }) {
    const isAdmin = user?.email === ADMIN_EMAIL
    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            💰 Gestor de Gastos
                        </h1>
                        <p className="text-gray-400">
                            Selecciona una sección para comenzar
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {isAdmin && (
                            <button
                                onClick={() => onNavigate('admin')}
                                className="p-2 text-purple-400 hover:text-purple-300 transition-colors"
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
                </header>

                {/* Secciones */}
                <div className="grid gap-4 md:gap-6">
                    {sections.map((section) => {
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
                    })}
                </div>

                {/* Footer */}
                <footer className="mt-12 text-center text-gray-500 text-sm">
                    <p>Control de Gastos v2.0</p>
                </footer>
            </div>
        </div>
    )
}
