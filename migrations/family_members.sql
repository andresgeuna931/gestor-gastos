-- =====================================================
-- TABLA: family_members
-- Vincula usuarios como familia para compartir gastos
-- =====================================================

-- Crear tabla de miembros familiares
CREATE TABLE IF NOT EXISTS family_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES auth.users(id) NOT NULL,      -- Quien agregó al familiar
    member_id UUID REFERENCES auth.users(id) NOT NULL,     -- El familiar agregado
    member_email TEXT NOT NULL,                             -- Email del familiar
    member_name TEXT,                                       -- Nombre para mostrar (opcional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice único para evitar duplicados (no agregar al mismo familiar 2 veces)
CREATE UNIQUE INDEX IF NOT EXISTS idx_family_unique 
ON family_members(owner_id, member_id);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_family_owner ON family_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_family_member ON family_members(member_id);

-- Habilitar RLS
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Política: usuarios ven sus propios familiares (los que agregaron)
DROP POLICY IF EXISTS "Users see own family" ON family_members;
CREATE POLICY "Users see own family" ON family_members 
    FOR SELECT USING (auth.uid() = owner_id);

-- Política: usuarios pueden agregar familiares
DROP POLICY IF EXISTS "Users add family" ON family_members;
CREATE POLICY "Users add family" ON family_members 
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Política: usuarios pueden eliminar sus propios familiares
DROP POLICY IF EXISTS "Users delete family" ON family_members;
CREATE POLICY "Users delete family" ON family_members 
    FOR DELETE USING (auth.uid() = owner_id);

-- =====================================================
-- FUNCIÓN: Buscar usuario por email (para el frontend)
-- =====================================================

-- Crear función para buscar usuarios suscritos por email
CREATE OR REPLACE FUNCTION search_user_by_email(search_email TEXT)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    status TEXT,
    is_valid BOOLEAN,
    name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.user_id,
        us.email,
        us.status,
        (us.status IN ('active', 'admin', 'free')) AS is_valid,
        COALESCE(au.raw_user_meta_data->>'name', split_part(us.email, '@', 1)) AS name
    FROM user_subscriptions us
    LEFT JOIN auth.users au ON us.user_id = au.id
    WHERE LOWER(us.email) = LOWER(search_email);
END;
$$;

-- Dar acceso a usuarios autenticados
GRANT EXECUTE ON FUNCTION search_user_by_email TO authenticated;
