// Webhook para recibir notificaciones de pago de MercadoPago
// Este endpoint se llama automáticamente cuando un pago cambia de estado

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { type, data } = req.body

    // Solo procesamos notificaciones de pago
    if (type !== 'payment') {
        return res.status(200).json({ received: true })
    }

    try {
        // Obtener detalles del pago desde MercadoPago
        const paymentResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/${data.id}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
                }
            }
        )

        const payment = await paymentResponse.json()

        if (payment.status === 'approved') {
            // El pago fue aprobado, activar la suscripción
            const [userId, plan] = (payment.external_reference || '').split('|')

            if (userId && plan) {
                // Calcular fecha de expiración
                const expiresAt = new Date()
                if (plan === 'yearly') {
                    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
                } else {
                    expiresAt.setMonth(expiresAt.getMonth() + 1)
                }

                // Actualizar estado de suscripción
                const { error } = await supabase
                    .from('user_subscriptions')
                    .update({
                        status: 'active',
                        plan: plan,
                        expires_at: expiresAt.toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId)

                if (error) {
                    console.error('Error updating subscription:', error)
                } else {
                    console.log(`Subscription activated for user ${userId}, plan ${plan}`)
                }
            }
        }

        return res.status(200).json({ received: true })

    } catch (error) {
        console.error('Webhook error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
