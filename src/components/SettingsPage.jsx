import { ArrowLeft, User, Crown, LogOut, Info, AlertTriangle, Calendar } from 'lucide-react'

// Calcular días restantes
const getDaysRemaining = (expiresAt) => {
    if (!expiresAt) return null
    const now = new Date()
    const expires = new Date(expiresAt)
    const diffTime = expires - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
}

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
    const daysRemaining = getDaysRemaining(subscription?.expires_at)
    const showWarning = daysRemaining !== null && daysRemaining <= 10 && daysRemaining > 0
    const isExpired = daysRemaining !== null && daysRemaining < 0

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

                {/* Alerta de vencimiento */}
                {showWarning && (
                    <div className="glass p-4 mb-4 border border-amber-500/30 bg-amber-500/10">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
                            <div>
                                <p className="text-amber-400 font-medium">
                                    ⏳ Tu suscripción vence en {daysRemaining} días
                                </p>
                                <p className="text-amber-400/70 text-sm">
                                    {subscription?.plan === 'monthly' || subscription?.plan === 'yearly'
                                        ? 'Si no cancelás, se renovará automáticamente.'
                                        : 'Renovála para seguir usando la app.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

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
                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                            <span className="text-gray-400">Plan</span>
                            <span className="text-white capitalize">
                                {subscription?.plan === 'monthly' ? 'Mensual' :
                                    subscription?.plan === 'yearly' ? 'Anual' :
                                        subscription?.plan || 'N/A'}
                            </span>
                        </div>
                        {subscription?.expires_at && subscription?.status !== 'free' && (
                            <>
                                <div className="flex justify-between items-center py-2 border-b border-white/10">
                                    <span className="text-gray-400">Vence</span>
                                    <span className={isExpired ? 'text-red-400' : 'text-white'}>
                                        {new Date(subscription.expires_at).toLocaleDateString('es-AR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/10">
                                    <span className="text-gray-400">Días restantes</span>
                                    <span className={
                                        daysRemaining < 0 ? 'text-red-400' :
                                            daysRemaining <= 10 ? 'text-amber-400' :
                                                'text-green-400'
                                    }>
                                        {daysRemaining < 0
                                            ? `Expiró hace ${Math.abs(daysRemaining)} días`
                                            : `${daysRemaining} días`}
                                    </span>
                                </div>
                            </>
                        )}
                        {subscription?.status === 'free' && (
                            <div className="flex justify-between items-center py-2 border-b border-white/10">
                                <span className="text-gray-400">Vence</span>
                                <span className="text-blue-400">∞ Sin vencimiento</span>
                            </div>
                        )}
                        {(subscription?.plan === 'monthly' || subscription?.plan === 'yearly') && (
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-400">Renovación</span>
                                <span className="text-green-400">🔄 Automática</span>
                            </div>
                        )}
                    </div>

                    {/* Info de renovación automática */}
                    {(subscription?.plan === 'monthly' || subscription?.plan === 'yearly') && (
                        <div className="mt-4 p-3 bg-white/5 rounded-lg text-sm text-gray-400">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Si no cancelás antes del vencimiento, tu suscripción se renovará automáticamente.
                        </div>
                    )}
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
