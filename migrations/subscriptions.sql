-- =====================================================
-- TABLA: user_subscriptions
-- Sistema de suscripciones y control de acceso
-- =====================================================

-- Crear tabla de suscripciones
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'free', 'expired', 'admin')),
    plan TEXT DEFAULT 'monthly' CHECK (plan IN ('monthly', 'yearly')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: usuarios ven su propia suscripción
DROP POLICY IF EXISTS "Users see own subscription" ON user_subscriptions;
CREATE POLICY "Users see own subscription" ON user_subscriptions 
    FOR SELECT USING (auth.uid() = user_id);

-- Política: admin puede ver todas las suscripciones
DROP POLICY IF EXISTS "Admin sees all subscriptions" ON user_subscriptions;
CREATE POLICY "Admin sees all subscriptions" ON user_subscriptions 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions 
            WHERE user_id = auth.uid() AND status = 'admin'
        )
    );

-- Política: admin puede actualizar todas
DROP POLICY IF EXISTS "Admin updates all subscriptions" ON user_subscriptions;
CREATE POLICY "Admin updates all subscriptions" ON user_subscriptions 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions 
            WHERE user_id = auth.uid() AND status = 'admin'
        )
    );

-- Política: cualquiera puede insertar (al registrarse)
DROP POLICY IF EXISTS "Anyone can insert subscription" ON user_subscriptions;
CREATE POLICY "Anyone can insert subscription" ON user_subscriptions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Crear índice para búsqueda por email
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON user_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON user_subscriptions(status);

-- Insertar tu usuario como admin (ejecutar después de registrarte)
-- INSERT INTO user_subscriptions (user_id, email, status, plan)
-- SELECT id, email, 'admin', 'yearly'
-- FROM auth.users
-- WHERE email = 'andresgeuna931@gmail.com'
-- ON CONFLICT (user_id) DO UPDATE SET status = 'admin';
