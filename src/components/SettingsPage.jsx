import { ArrowLeft, User, Crown, LogOut, Palette, Bell, Info } from 'lucide-react'

export default function SettingsPage({ user, subscription, onBack, onLogout }) {
    const getSubscriptionStatus = () => {
        if (!subscription) return { text: 'Sin suscripción', color: 'text-gray-400' }
        if (subscription.status === 'admin') return { text: '👑 Administrador', color: 'text-purple-400' }
        if (subscription.status === 'active') return { text: '✅ Activa', color: 'text-green-400' }
        if (subscription.status === 'free') return { text: '🆓 Gratuita', color: 'text-blue-400' }
        if (subscription.status === 'expired') return { text: '⚠️ Expirada', color: 'text-amber-400' }
        return { text: subscription.status, color: 'text-gray-400' }
    }

    const status = getSubscriptionStatus()

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <header className="flex items-center gap-4 mb-8">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            ⚙️ Configuración
                        </h1>
                        <p className="text-gray-400">Gestiona tu cuenta y preferencias</p>
                    </div>
                </header>

                {/* Cuenta */}
                <section className="glass p-6 mb-4">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Cuenta
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                            <span className="text-gray-400">Email</span>
                            <span className="text-white">{user?.email || 'No disponible'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-gray-400">ID de Usuario</span>
                            <span className="text-gray-500 text-sm font-mono">
                                {user?.id?.slice(0, 8)}...
                            </span>
                        </div>
                    </div>
                </section>

                {/* Suscripción */}
                <section className="glass p-6 mb-4">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Crown className="w-5 h-5" />
                        Suscripción
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                            <span className="text-gray-400">Estado</span>
                            <span className={status.color}>{status.text}</span>
                        </div>
                        {subscription?.expires_at && (
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-400">Expira</span>
                                <span className="text-white">
                                    {new Date(subscription.expires_at).toLocaleDateString('es-AR', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Información */}
                <section className="glass p-6 mb-4">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        Acerca de
                    </h2>
                    <div className="space-y-2 text-gray-400 text-sm">
                        <p>Control de Gastos v2.0</p>
                        <p>Dashboard para gestionar gastos personales, familiares y grupales.</p>
                    </div>
                </section>

                {/* Cerrar sesión */}
                <button
                    onClick={onLogout}
                    className="w-full glass p-4 flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/10 transition-colors rounded-xl"
                >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión
                </button>
            </div>
        </div>
    )
}
