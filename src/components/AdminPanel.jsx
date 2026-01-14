import { useState, useEffect } from 'react'
import { ArrowLeft, Users, Check, X, Gift, Clock, Shield, RefreshCw, Trash2, AlertTriangle } from 'lucide-react'
import { supabase, supabaseRead } from '../lib/supabase'

const ADMIN_EMAIL = 'andresgeuna931@gmail.com'

const STATUS_CONFIG = {
    admin: { label: 'Admin', color: 'bg-purple-500/20 text-purple-300', icon: Shield },
    active: { label: 'Activo', color: 'bg-green-500/20 text-green-300', icon: Check },
    free: { label: 'Gratis', color: 'bg-blue-500/20 text-blue-300', icon: Gift },
    pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-300', icon: Clock },
    expired: { label: 'Expirado', color: 'bg-red-500/20 text-red-300', icon: X }
}

// Calcular días restantes
const getDaysRemaining = (expiresAt) => {
    if (!expiresAt) return null
    const now = new Date()
    const expires = new Date(expiresAt)
    const diffTime = expires - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
}

// Color según días restantes
const getDaysColor = (days) => {
    if (days === null) return 'text-gray-400'
    if (days < 0) return 'text-red-400'
    if (days <= 10) return 'text-red-400'
    if (days <= 30) return 'text-yellow-400'
    return 'text-green-400'
}

export default function AdminPanel({ user, onBack }) {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [confirmAction, setConfirmAction] = useState(null)

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
        // Si es dar acceso gratis, pedir confirmación
        if (newStatus === 'free' && !confirmAction) {
            setConfirmAction({ userId, status: newStatus, message: '¿Confirmar acceso GRATUITO a este usuario?' })
            return
        }

        try {
            const { data, error } = await supabase
                .from('user_subscriptions')
                .update({ status: newStatus })
                .eq('user_id', userId)
                .select()

            if (error) throw error
            if (!data || data.length === 0) {
                showToast('❌ No se pudo actualizar - verifica permisos')
                return
            }

            showToast(`✅ Usuario actualizado a ${STATUS_CONFIG[newStatus].label}`)
            setConfirmAction(null)
            await loadUsers()
        } catch (error) {
            console.error('Error updating status:', error)
            showToast('❌ Error al actualizar: ' + (error.message || 'Desconocido'))
        }
    }

    const deleteUser = async (userId) => {
        try {
            const { error } = await supabase
                .from('user_subscriptions')
                .delete()
                .eq('user_id', userId)

            if (error) throw error

            showToast('🗑️ Usuario eliminado')
            setConfirmDelete(null)
            await loadUsers()
        } catch (error) {
            console.error('Error deleting user:', error)
            showToast('❌ Error al eliminar: ' + (error.message || 'Desconocido'))
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
                        <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-2">
                            <Shield className="w-6 h-6 text-[#C4B090]" />
                            Panel Admin
                        </h1>
                        <p className="text-theme-secondary text-sm">
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
                <div className="p-4 border-b border-[var(--divider-color)]">
                    <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
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
                                <tr className="border-b border-[var(--divider-color)] text-left text-theme-secondary text-sm">
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Plan</th>
                                    <th className="p-4">Vence</th>
                                    <th className="p-4">Restante</th>
                                    <th className="p-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => {
                                    const config = STATUS_CONFIG[u.status] || STATUS_CONFIG.pending
                                    const Icon = config.icon
                                    const daysRemaining = getDaysRemaining(u.expires_at)
                                    const daysColor = getDaysColor(daysRemaining)

                                    return (
                                        <tr key={u.id} className="border-b border-[var(--divider-color)] hover:bg-[var(--glass-card-hover)]">
                                            <td className="p-4 text-theme-primary text-sm">{u.email}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.color}`}>
                                                    <Icon className="w-3 h-3" />
                                                    {config.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-theme-secondary capitalize text-sm">{u.plan || '-'}</td>
                                            <td className="p-4 text-theme-secondary text-sm">
                                                {u.expires_at
                                                    ? new Date(u.expires_at).toLocaleDateString('es-AR')
                                                    : u.status === 'free' ? '∞' : '-'
                                                }
                                            </td>
                                            <td className={`p-4 text-sm font-medium ${daysColor}`}>
                                                {u.status === 'free' ? '∞' :
                                                    daysRemaining === null ? '-' :
                                                        daysRemaining < 0 ? `Expiró hace ${Math.abs(daysRemaining)}d` :
                                                            `${daysRemaining} días`}
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
                                                            <button
                                                                onClick={() => setConfirmDelete(u)}
                                                                className="p-1.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30"
                                                                title="Eliminar usuario"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
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

            {/* Modal confirmar eliminación */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="glass w-full max-w-sm p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                            <h3 className="text-lg font-semibold text-white">
                                Eliminar Usuario
                            </h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">
                            ¿Seguro que querés eliminar a:
                        </p>
                        <p className="text-white font-medium mb-4">{confirmDelete.email}</p>
                        <p className="text-red-400 text-xs mb-6">
                            ⚠️ Esta acción elimina la suscripción pero NO los datos del usuario (gastos, tarjetas, etc.)
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="btn-secondary flex-1"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => deleteUser(confirmDelete.user_id)}
                                className="btn-danger flex-1"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal confirmar acción */}
            {confirmAction && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="glass w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            ✅ Confirmar acción
                        </h3>
                        <p className="text-gray-400 mb-6">{confirmAction.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="btn-secondary flex-1"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => updateStatus(confirmAction.userId, confirmAction.status)}
                                className="btn-primary flex-1"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 glass-card px-6 py-3 animate-fade-in z-50">
                    {toast}
                </div>
            )}
        </div>
    )
}
