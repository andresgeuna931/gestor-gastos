import { useState, useEffect } from 'react'
import { Lock, Wallet, Settings, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Contraseña por defecto (solo se usa si no hay ninguna en la BD)
const DEFAULT_PASSWORD = 'familia2025'

export default function Login({ onLogin }) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showChangePassword, setShowChangePassword] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [storedPassword, setStoredPassword] = useState(DEFAULT_PASSWORD)

    // Cargar contraseña desde Supabase al inicio
    useEffect(() => {
        loadPassword()
    }, [])

    const loadPassword = async () => {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'family_password')
                .single()

            if (data && !error) {
                setStoredPassword(data.value)
            }
        } catch (error) {
            // Si no existe la tabla o el registro, usar contraseña por defecto
            console.log('Usando contraseña por defecto')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        await new Promise(resolve => setTimeout(resolve, 500))

        if (password === storedPassword) {
            onLogin()
        } else {
            setError('Contraseña incorrecta')
            setIsLoading(false)
        }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        // Validaciones
        if (currentPassword !== storedPassword) {
            setError('La contraseña actual es incorrecta')
            return
        }

        if (newPassword.length < 4) {
            setError('La nueva contraseña debe tener al menos 4 caracteres')
            return
        }

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas nuevas no coinciden')
            return
        }

        setIsLoading(true)

        try {
            // Intentar actualizar o insertar la contraseña
            const { error: upsertError } = await supabase
                .from('settings')
                .upsert({
                    key: 'family_password',
                    value: newPassword
                }, {
                    onConflict: 'key'
                })

            if (upsertError) throw upsertError

            setStoredPassword(newPassword)
            setSuccess('¡Contraseña cambiada exitosamente!')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')

            // Volver a la pantalla de login después de 2 segundos
            setTimeout(() => {
                setShowChangePassword(false)
                setSuccess('')
            }, 2000)

        } catch (error) {
            console.error('Error cambiando contraseña:', error)
            setError('Error al cambiar la contraseña. Contacta al administrador.')
        }

        setIsLoading(false)
    }

    // Vista de cambiar contraseña
    if (showChangePassword) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md animate-fade-in">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#2D3E40] to-[#1F2937] mb-4 shadow-lg shadow-amber-500/30">
                            <Settings className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Cambiar Contraseña
                        </h1>
                        <p className="text-gray-400">
                            Ingresa la contraseña actual y la nueva
                        </p>
                    </div>

                    <div className="glass p-8">
                        <form onSubmit={handleChangePassword} className="space-y-5">
                            <div>
                                <label className="label">Contraseña Actual</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Contraseña actual"
                                        className="input-field pl-11 pr-11"
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
                                <label className="label">Nueva Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Nueva contraseña"
                                        className="input-field pl-11"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Confirmar Nueva Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repetir nueva contraseña"
                                        className="input-field pl-11"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm animate-fade-in">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-green-300 text-sm animate-fade-in">
                                    {success}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowChangePassword(false)
                                        setError('')
                                        setCurrentPassword('')
                                        setNewPassword('')
                                        setConfirmPassword('')
                                    }}
                                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Volver
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <div className="spinner" />
                                    ) : (
                                        'Cambiar'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

    // Vista de login normal
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-fade-in">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#2D3E40] to-[#1F2937] mb-4 shadow-lg shadow-primary-500/30">
                        <Wallet className="w-10 h-10 text-[#C4B090]" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Gestor de Gastos
                    </h1>
                    <p className="text-gray-400">
                        Control familiar de gastos compartidos
                    </p>
                </div>

                <div className="glass p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="password" className="label">
                                🔒 Contraseña Familiar
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Ingresa la contraseña"
                                    className="input-field pr-11"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm animate-fade-in">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !password}
                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="spinner" />
                            ) : (
                                <>
                                    <Lock className="w-4 h-4" />
                                    Ingresar
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-white/10">
                        <button
                            onClick={() => setShowChangePassword(true)}
                            className="w-full text-gray-400 hover:text-white text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            Cambiar contraseña
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
