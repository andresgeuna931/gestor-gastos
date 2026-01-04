import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function PaymentSuccess() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [updating, setUpdating] = useState(true)
    const [activated, setActivated] = useState(false)

    useEffect(() => {
        const updateSubscription = async () => {
            // Intentar obtener datos de la URL primero
            let userId = searchParams.get('userId')
            let plan = searchParams.get('plan')

            // Si no hay datos en URL, buscar en localStorage (fallback para links de MP)
            if (!userId || !plan) {
                try {
                    const pending = localStorage.getItem('pending_subscription')
                    if (pending) {
                        const data = JSON.parse(pending)
                        userId = data.userId
                        plan = data.plan
                        // Limpiar localStorage después de usarlo
                        localStorage.removeItem('pending_subscription')
                    }
                } catch (e) {
                    console.error('Error leyendo pending_subscription:', e)
                }
            }

            if (userId && plan) {
                const expiresAt = new Date()
                if (plan === 'yearly') {
                    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
                } else {
                    expiresAt.setMonth(expiresAt.getMonth() + 1)
                }

                const { error } = await supabase
                    .from('user_subscriptions')
                    .update({
                        status: 'active',
                        plan: plan,
                        expires_at: expiresAt.toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId)

                if (!error) {
                    setActivated(true)
                }
            }
            setUpdating(false)
        }

        updateSubscription()
    }, [searchParams])

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass p-8 text-center max-w-md">
                <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">¡Pago exitoso!</h1>
                <p className="text-gray-400 mb-6">
                    {activated
                        ? 'Tu suscripción está activa. Ya podés usar todas las funciones.'
                        : 'Tu pago fue recibido. Si ya tenés cuenta, tu suscripción se activará automáticamente.'}
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="btn-primary flex items-center gap-2 mx-auto"
                >
                    Ir al Dashboard
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

export function PaymentFailure() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass p-8 text-center max-w-md">
                <XCircle className="w-20 h-20 text-red-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Pago no completado</h1>
                <p className="text-gray-400 mb-6">
                    Hubo un problema con tu pago. Podés intentar nuevamente.
                </p>
                <button
                    onClick={() => navigate('/subscribe')}
                    className="btn-primary flex items-center gap-2 mx-auto"
                >
                    Intentar de nuevo
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

export function PaymentPending() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass p-8 text-center max-w-md">
                <Clock className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Pago pendiente</h1>
                <p className="text-gray-400 mb-6">
                    Tu pago está siendo procesado. Te avisaremos cuando se confirme.
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="btn-secondary flex items-center gap-2 mx-auto"
                >
                    Volver al inicio
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
