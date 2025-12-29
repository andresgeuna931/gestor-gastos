import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from './lib/supabase'
import AuthScreen from './components/AuthScreen'
import MainDashboard from './components/MainDashboard'
import Dashboard from './components/Dashboard'
import PersonalExpenses from './components/PersonalExpenses'
import GroupManager from './components/GroupManager'
import AdminPanel from './components/AdminPanel'
import SubscriptionPage from './components/SubscriptionPage'
import SettingsPage from './components/SettingsPage'
import { PaymentSuccess, PaymentFailure, PaymentPending } from './components/PaymentResults'

// Componente interno con navegación
function AppContent() {
    const [user, setUser] = useState(null)
    const [subscription, setSubscription] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    // Verificar sesión y suscripción al iniciar
    useEffect(() => {
        let isMounted = true
        const timeout = setTimeout(() => {
            if (isMounted && loading) {
                console.warn('Auth check timeout - forcing completion')
                setLoading(false)
            }
        }, 5000) // 5 segundos máximo de espera

        const checkAuth = async () => {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()

                if (sessionError) {
                    console.error('Session error:', sessionError)
                    // Limpiar sesión corrupta
                    await supabase.auth.signOut()
                    if (isMounted) {
                        setUser(null)
                        setSubscription(null)
                        setLoading(false)
                    }
                    return
                }

                const currentUser = session?.user ?? null
                if (isMounted) setUser(currentUser)

                if (currentUser) {
                    try {
                        const { data: sub, error } = await supabase
                            .from('user_subscriptions')
                            .select('*')
                            .eq('user_id', currentUser.id)
                            .single()

                        if (error && error.code !== 'PGRST116') {
                            console.error('Subscription error:', error)
                        }
                        if (isMounted) setSubscription(sub || null)
                    } catch (subError) {
                        console.error('Subscription fetch error:', subError)
                        if (isMounted) setSubscription(null)
                    }
                }
            } catch (error) {
                console.error('Auth error:', error)
                if (isMounted) {
                    setUser(null)
                    setSubscription(null)
                }
            } finally {
                clearTimeout(timeout)
                if (isMounted) setLoading(false)
            }
        }

        checkAuth()

        // Escuchar cambios de autenticación
        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                const currentUser = session?.user ?? null
                if (isMounted) setUser(currentUser)

                if (currentUser) {
                    try {
                        const { data: sub } = await supabase
                            .from('user_subscriptions')
                            .select('*')
                            .eq('user_id', currentUser.id)
                            .single()
                        if (isMounted) setSubscription(sub)
                    } catch (e) {
                        if (isMounted) setSubscription(null)
                    }
                } else {
                    if (isMounted) setSubscription(null)
                }
            }
        )

        return () => {
            isMounted = false
            clearTimeout(timeout)
            authSub.unsubscribe()
        }
    }, [])

    // Verificar si la suscripción está activa
    const ADMIN_EMAIL = 'andresgeuna931@gmail.com'

    const hasActiveSubscription = () => {
        // Admin siempre tiene acceso
        if (user?.email === ADMIN_EMAIL) return true

        // Si no hay subscription, no tiene acceso
        if (!subscription) return false
        if (subscription.status === 'admin') return true
        if (subscription.status === 'active') {
            if (subscription.expires_at) {
                return new Date(subscription.expires_at) > new Date()
            }
            return true
        }
        if (subscription.status === 'free') return true
        return false
    }

    const handleLogin = (userData) => {
        setUser(userData)
        navigate('/')
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setSubscription(null)
        navigate('/')
    }

    const handleNavigate = (section) => {
        navigate(`/${section}`)
    }

    const handleBack = () => {
        navigate('/')
    }

    // Pantalla de carga
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner w-12 h-12" />
            </div>
        )
    }

    // No autenticado
    if (!user) {
        return <AuthScreen onLogin={handleLogin} />
    }

    // Autenticado pero sin suscripción activa - mostrar página de suscripción
    if (!hasActiveSubscription()) {
        return (
            <Routes>
                <Route
                    path="/subscribe"
                    element={
                        <SubscriptionPage
                            user={user}
                            onBack={handleLogout}
                        />
                    }
                />
                <Route
                    path="/payment/success"
                    element={<PaymentSuccess />}
                />
                <Route
                    path="/payment/failure"
                    element={<PaymentFailure />}
                />
                <Route
                    path="/payment/pending"
                    element={<PaymentPending />}
                />
                <Route
                    path="*"
                    element={
                        <SubscriptionRequired
                            user={user}
                            subscription={subscription}
                            onLogout={handleLogout}
                            onSubscribe={() => navigate('/subscribe')}
                        />
                    }
                />
            </Routes>
        )
    }

    // Autenticado - mostrar rutas
    return (
        <Routes>
            <Route
                path="/"
                element={
                    <MainDashboard
                        user={user}
                        onNavigate={handleNavigate}
                        onLogout={handleLogout}
                    />
                }
            />
            <Route
                path="/personal"
                element={
                    <PersonalExpenses
                        user={user}
                        onBack={handleBack}
                    />
                }
            />
            <Route
                path="/family"
                element={
                    <Dashboard
                        section="family"
                        user={user}
                        onBack={handleBack}
                        onLogout={handleLogout}
                    />
                }
            />
            <Route
                path="/groups"
                element={
                    <GroupManager
                        user={user}
                        onBack={handleBack}
                        onLogout={handleLogout}
                    />
                }
            />
            <Route
                path="/admin"
                element={
                    <AdminPanel
                        user={user}
                        onBack={handleBack}
                    />
                }
            />
            <Route
                path="/subscribe"
                element={
                    <SubscriptionPage
                        user={user}
                        onBack={handleBack}
                    />
                }
            />
            <Route
                path="/settings"
                element={
                    <SettingsPage
                        user={user}
                        subscription={subscription}
                        onBack={handleBack}
                        onLogout={handleLogout}
                    />
                }
            />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />
            <Route path="/payment/pending" element={<PaymentPending />} />
            <Route
                path="/group/:shareCode"
                element={<GroupPublicView />}
            />
        </Routes>
    )
}

// Componente para usuarios sin suscripción activa
function SubscriptionRequired({ user, subscription, onLogout, onSubscribe }) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass p-8 text-center max-w-md">
                <div className="text-6xl mb-4">🔒</div>
                <h1 className="text-2xl font-bold text-white mb-2">
                    Suscripción Requerida
                </h1>
                <p className="text-gray-400 mb-6">
                    Para acceder al dashboard necesitas una suscripción activa.
                </p>
                {subscription?.status === 'expired' && (
                    <p className="text-amber-400 text-sm mb-4">
                        Tu suscripción expiró el {new Date(subscription.expires_at).toLocaleDateString('es-AR')}
                    </p>
                )}
                <div className="flex flex-col gap-3">
                    <button onClick={onSubscribe} className="btn-primary">
                        Ver Planes
                    </button>
                    <button onClick={onLogout} className="btn-secondary">
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    )
}

// Vista pública de evento grupal (acceso con link)
function GroupPublicView() {
    const { shareCode } = useParams()
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass p-8 text-center max-w-md">
                <h1 className="text-2xl font-bold text-white mb-4">👥 Evento Compartido</h1>
                <p className="text-gray-400">Código: {shareCode}</p>
                <p className="text-gray-500 mt-4">🚧 Próximamente: Vista pública para invitados</p>
            </div>
        </div>
    )
}

// App principal con BrowserRouter
function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    )
}

export default App
