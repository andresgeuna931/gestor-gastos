import { useState, useEffect } from 'react'
import { ArrowLeft, Users, Check, X, Gift, Clock, Shield, RefreshCw } from 'lucide-react'
import { supabase, supabaseRead } from '../lib/supabase'

const ADMIN_EMAIL = 'andresgeuna931@gmail.com'

const STATUS_CONFIG = {
    admin: { label: 'Admin', color: 'bg-purple-500/20 text-purple-300', icon: Shield },
    active: { label: 'Activo', color: 'bg-green-500/20 text-green-300', icon: Check },
    free: { label: 'Gratis', color: 'bg-blue-500/20 text-blue-300', icon: Gift },
    pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-300', icon: Clock },
    expired: { label: 'Expirado', color: 'bg-red-500/20 text-red-300', icon: X }
}

export default function AdminPanel({ user, onBack }) {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState(null)

    // Verificar si es admin
    const isAdmin = user?.email === ADMIN_EMAIL

    useEffect(() => {
        if (isAdmin) {
            loadUsers()
        }
    }, [isAdmin])

    const showToast = (message) => {
        setToast(message)
        setTimeout(() => setToast(null), 3000)
    }

    const loadUsers = async () => {
        setLoading(true)
        try {
            // Usar supabaseRead que no depende de la sesión
            const { data, error } = await supabaseRead
                .from('user_subscriptions')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error loading users:', error)
                showToast('❌ Error: ' + error.message)
                setUsers([])
            } else {
                setUsers(data || [])
            }
        } catch (error) {
            console.error('Error:', error)
            showToast('❌ ' + (error.message || 'Error al cargar'))
            setUsers([])
        } finally {
            setLoading(false)
        }
    }

    const updateStatus = async (userId, newStatus) => {
        try {
            console.log('Updating user:', userId, 'to status:', newStatus)
            const { data, error } = await supabase
                .from('user_subscriptions')
                .update({ status: newStatus })
                .eq('user_id', userId)
                .select()

            console.log('Update result:', { data, error })

            if (error) {
                console.error('Supabase error:', error)
                throw error
            }

            if (!data || data.length === 0) {
                console.error('No rows updated - check RLS policies')
                showToast('❌ No se pudo actualizar - verifica permisos')
                return
            }

            showToast(`✅ Usuario actualizado a ${STATUS_CONFIG[newStatus].label}`)
            await loadUsers()
        } catch (error) {
            console.error('Error updating status:', error)
            showToast('❌ Error al actualizar: ' + (error.message || 'Desconocido'))
        }
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass p-8 text-center">
                    <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h1>
                    <p className="text-gray-400 mb-4">No tenés permisos de administrador.</p>
                    <button onClick={onBack} className="btn-secondary">
                        Volver
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Shield className="w-6 h-6 text-purple-400" />
                            Panel Admin
                        </h1>
                        <p className="text-gray-400 text-sm">
                            {users.length} usuarios registrados
                        </p>
                    </div>
                </div>
                <button
                    onClick={loadUsers}
                    className="btn-secondary flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Actualizar
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                    const count = users.filter(u => u.status === status).length
                    const Icon = config.icon
                    return (
                        <div key={status} className={`glass-card p-4 ${config.color}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <Icon className="w-4 h-4" />
                                <span className="font-medium">{config.label}</span>
                            </div>
                            <div className="text-2xl font-bold">{count}</div>
                        </div>
                    )
                })}
            </div>

            {/* Users Table */}
            <div className="glass overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Usuarios
                    </h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="spinner mx-auto" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        No hay usuarios registrados aún
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 text-left text-gray-400 text-sm">
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Plan</th>
                                    <th className="p-4">Registrado</th>
                                    <th className="p-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => {
                                    const config = STATUS_CONFIG[u.status] || STATUS_CONFIG.pending
                                    const Icon = config.icon
                                    return (
                                        <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-4 text-white">{u.email}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.color}`}>
                                                    <Icon className="w-3 h-3" />
                                                    {config.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-400 capitalize">{u.plan}</td>
                                            <td className="p-4 text-gray-400 text-sm">
                                                {new Date(u.created_at).toLocaleDateString('es-AR')}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    {u.status !== 'admin' && (
                                                        <>
                                                            <button
                                                                onClick={() => updateStatus(u.user_id, 'active')}
                                                                className="p-1.5 rounded bg-green-500/20 text-green-300 hover:bg-green-500/30"
                                                                title="Activar"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => updateStatus(u.user_id, 'free')}
                                                                className="p-1.5 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                                                                title="Gratis"
                                                            >
                                                                <Gift className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => updateStatus(u.user_id, 'pending')}
                                                                className="p-1.5 rounded bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
                                                                title="Pendiente"
                                                            >
                                                                <Clock className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 glass-card px-6 py-3 animate-fade-in z-50">
                    {toast}
                </div>
            )}
        </div>
    )
}
