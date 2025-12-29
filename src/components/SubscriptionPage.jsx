import { useState } from 'react'
import { CreditCard, Check, Zap, Shield, ArrowLeft, Loader2, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Links de pago de MercadoPago
const PAYMENT_LINKS = {
    monthly: 'https://mpago.li/2sT2RYt',
    yearly: 'https://mpago.li/1gZbuY3'
}

const PLANS = [
    {
        id: 'monthly',
        name: 'Mensual',
        price: 6000,
        priceLabel: '$6.000',
        period: '/mes',
        features: [
            'Gastos personales ilimitados',
            'Gastos familiares compartidos',
            'Eventos grupales',
            'Sincronización en tiempo real',
            'Soporte por email'
        ],
        popular: false
    },
    {
        id: 'yearly',
        name: 'Anual',
        price: 60000,
        priceLabel: '$60.000',
        period: '/año',
        savings: 'Ahorrás $12.000 (2 meses gratis)',
        features: [
            'Todo lo del plan mensual',
            'Gastos personales ilimitados',
            'Gastos familiares compartidos',
            'Eventos grupales',
            'Soporte prioritario'
        ],
        popular: true
    }
]

export default function SubscriptionPage({ user, onBack, onSubscribed }) {
    const [loading, setLoading] = useState(null)

    const handleSubscribe = async (planId) => {
        setLoading(planId)

        // Guardar en localStorage para después validar el pago
        localStorage.setItem('pending_subscription', JSON.stringify({
            userId: user.id,
            email: user.email,
            plan: planId,
            timestamp: Date.now()
        }))

        // Abrir link de pago en nueva pestaña
        const paymentLink = PAYMENT_LINKS[planId]
        if (paymentLink) {
            window.open(paymentLink, '_blank')
        }

        setLoading(null)
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            Elegí tu plan
                        </h1>
                        <p className="text-gray-400">
                            Accedé a todas las funciones de Gestor de Gastos
                        </p>
                    </div>
                </div>

                {/* Info */}
                <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300 text-sm">
                    <p className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Al hacer clic en "Suscribirse" se abrirá MercadoPago. Después de pagar, avisá al administrador para activar tu cuenta.
                    </p>
                </div>

                {/* Plans */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.id}
                            className={`glass relative overflow-hidden p-6 ${plan.popular ? 'ring-2 ring-purple-500' : ''
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                    MÁS POPULAR
                                </div>
                            )}

                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                {plan.savings && (
                                    <span className="inline-block mt-2 text-sm text-green-400 bg-green-500/20 px-2 py-1 rounded">
                                        {plan.savings}
                                    </span>
                                )}
                            </div>

                            <div className="mb-6">
                                <span className="text-4xl font-bold text-white">{plan.priceLabel}</span>
                                <span className="text-gray-400">{plan.period}</span>
                            </div>

                            <ul className="space-y-3 mb-6">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-gray-300">
                                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={loading !== null}
                                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${plan.popular
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                                    : 'bg-white/10 text-white hover:bg-white/20'
                                    } ${loading === plan.id ? 'opacity-70' : ''}`}
                            >
                                {loading === plan.id ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Abriendo...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-5 h-5" />
                                        Suscribirse
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap justify-center gap-6 text-gray-400 text-sm">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-green-400" />
                        <span>Pago seguro con MercadoPago</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        <span>Acceso inmediato</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-blue-400" />
                        <span>Cancelá cuando quieras</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
