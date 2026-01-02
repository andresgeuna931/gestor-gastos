import { useState } from 'react'
import { Lock, Mail, User, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import logoPrimary from '../assets/logo-primary.png'

export default function AuthScreen({ onLogin }) {
    const [mode, setMode] = useState('login') // 'login', 'register', 'forgot'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [name, setName] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) throw error
            onLogin(data.user)
        } catch (error) {
            console.error('Login error:', error)
            if (error.message.includes('Invalid login')) {
                setError('Email o contraseña incorrectos')
            } else {
                setError(error.message)
            }
        }

        setIsLoading(false)
    }

    const handleRegister = async (e) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            return
        }

        setIsLoading(true)

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name
                    }
                }
            })

            if (error) throw error

            // Crear registro de suscripción con status pending
            if (data.user) {
                await supabase.from('user_subscriptions').insert([{
                    user_id: data.user.id,
                    email: data.user.email,
                    status: 'pending',
                    plan: 'monthly'
                }])
            }

            if (data.user && !data.session) {
                // Necesita confirmar email
                setSuccess('¡Cuenta creada! Revisá tu email para confirmar.')
                setMode('login')
            } else if (data.session) {
                // Auto-login (email confirmation disabled)
                onLogin(data.user)
            }
        } catch (error) {
            console.error('Register error:', error)
            if (error.message.includes('already registered')) {
                setError('Este email ya está registrado')
            } else {
                setError(error.message)
            }
        }

        setIsLoading(false)
    }

    const handleForgotPassword = async (e) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            })

            if (error) throw error
            setSuccess('Te enviamos un email para restablecer tu contraseña')
        } catch (error) {
            console.error('Forgot password error:', error)
            setError(error.message)
        }

        setIsLoading(false)
    }

    const resetForm = () => {
        setError('')
        setSuccess('')
        setPassword('')
        setConfirmPassword('')
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <img
                        src={logoPrimary}
                        alt="AMG Digital"
                        className="w-20 h-20 rounded-full object-cover shadow-lg mb-4"
                    />
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Gestor de Gastos
                    </h1>
                    <p className="text-gray-400">
                        {mode === 'login' && 'Ingresá a tu cuenta'}
                        {mode === 'register' && 'Creá tu cuenta gratis'}
                        {mode === 'forgot' && 'Recuperá tu contraseña'}
                    </p>
                </div>

                <div className="glass p-8">
                    {/* LOGIN */}
                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="label">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="tu@email.com"
                                        className="input-field with-icon"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Tu contraseña"
                                        className="input-field with-icon pr-11"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-green-300 text-sm">
                                    {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {isLoading ? <div className="spinner" /> : 'Ingresar'}
                            </button>

                            <div className="text-center space-y-2">
                                <button
                                    type="button"
                                    onClick={() => { setMode('forgot'); resetForm() }}
                                    className="text-gray-400 hover:text-white text-sm"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                                <div className="border-t border-white/10 pt-4 mt-4">
                                    <span className="text-gray-500 text-sm">¿No tenés cuenta? </span>
                                    <button
                                        type="button"
                                        onClick={() => { setMode('register'); resetForm() }}
                                        className="text-primary-400 hover:text-primary-300 font-medium"
                                    >
                                        Registrate
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* REGISTER */}
                    {mode === 'register' && (
                        <form onSubmit={handleRegister} className="space-y-5">
                            <div>
                                <label className="label">Nombre</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Tu nombre"
                                        className="input-field with-icon"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="tu@email.com"
                                        className="input-field with-icon"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        className="input-field with-icon pr-11"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="label">Confirmar Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repetir contraseña"
                                        className="input-field with-icon"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {isLoading ? <div className="spinner" /> : 'Crear Cuenta'}
                            </button>

                            <div className="text-center">
                                <span className="text-gray-500 text-sm">¿Ya tenés cuenta? </span>
                                <button
                                    type="button"
                                    onClick={() => { setMode('login'); resetForm() }}
                                    className="text-primary-400 hover:text-primary-300 font-medium"
                                >
                                    Ingresá
                                </button>
                            </div>
                        </form>
                    )}

                    {/* FORGOT PASSWORD */}
                    {mode === 'forgot' && (
                        <form onSubmit={handleForgotPassword} className="space-y-5">
                            <p className="text-gray-400 text-sm mb-4">
                                Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
                            </p>

                            <div>
                                <label className="label">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="tu@email.com"
                                        className="input-field with-icon"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-green-300 text-sm">
                                    {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {isLoading ? <div className="spinner" /> : 'Enviar Email'}
                            </button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => { setMode('login'); resetForm() }}
                                    className="text-gray-400 hover:text-white text-sm"
                                >
                                    ← Volver al login
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
