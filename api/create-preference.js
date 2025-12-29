// API Route para crear preferencia de pago MercadoPago
// Este archivo se ejecuta en el servidor de Vercel

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { plan, userId, userEmail } = req.body

    if (!plan || !userId || !userEmail) {
        return res.status(400).json({ error: 'Missing required fields' })
    }

    // Configuración de precios
    const prices = {
        monthly: {
            title: 'Plan Mensual - Gestor de Gastos',
            price: 5000,
            description: 'Acceso completo por 1 mes'
        },
        yearly: {
            title: 'Plan Anual - Gestor de Gastos',
            price: 50000,
            description: 'Acceso completo por 1 año (2 meses gratis)'
        }
    }

    const selectedPlan = prices[plan]
    if (!selectedPlan) {
        return res.status(400).json({ error: 'Invalid plan' })
    }

    try {
        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                items: [{
                    title: selectedPlan.title,
                    description: selectedPlan.description,
                    quantity: 1,
                    currency_id: 'ARS',
                    unit_price: selectedPlan.price
                }],
                payer: {
                    email: userEmail
                },
                back_urls: {
                    success: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dashborad-gastoss.vercel.app'}/payment/success?userId=${userId}&plan=${plan}`,
                    failure: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dashborad-gastoss.vercel.app'}/payment/failure`,
                    pending: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dashborad-gastoss.vercel.app'}/payment/pending`
                },
                auto_return: 'approved',
                external_reference: `${userId}|${plan}`,
                notification_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dashborad-gastoss.vercel.app'}/api/webhook-mp`
            })
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('MercadoPago error:', data)
            return res.status(500).json({ error: 'Error creating payment preference' })
        }

        return res.status(200).json({
            init_point: data.init_point,
            sandbox_init_point: data.sandbox_init_point,
            id: data.id
        })

    } catch (error) {
        console.error('Error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
