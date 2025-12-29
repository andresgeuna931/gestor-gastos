-- =====================================================
-- MIGRACIÓN: Sistema de Autenticación con Supabase Auth
-- =====================================================
-- Ejecutar este script en Supabase SQL Editor
-- IMPORTANTE: Hacer backup antes de ejecutar

-- 1. Agregar columna user_id a todas las tablas
-- =====================================================

-- Tabla expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Tabla cards
ALTER TABLE cards ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Tabla people
ALTER TABLE people ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Tabla groups (gastos grupales)
ALTER TABLE groups ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Habilitar RLS en las tablas
-- =====================================================

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas para que cada usuario vea solo sus datos
-- =====================================================

-- Políticas para expenses
DROP POLICY IF EXISTS "Users see own expenses" ON expenses;
CREATE POLICY "Users see own expenses" ON expenses 
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own expenses" ON expenses;
CREATE POLICY "Users insert own expenses" ON expenses 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own expenses" ON expenses;
CREATE POLICY "Users update own expenses" ON expenses 
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own expenses" ON expenses;
CREATE POLICY "Users delete own expenses" ON expenses 
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para cards
DROP POLICY IF EXISTS "Users see own cards" ON cards;
CREATE POLICY "Users see own cards" ON cards 
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own cards" ON cards;
CREATE POLICY "Users insert own cards" ON cards 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own cards" ON cards;
CREATE POLICY "Users update own cards" ON cards 
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own cards" ON cards;
CREATE POLICY "Users delete own cards" ON cards 
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para people
DROP POLICY IF EXISTS "Users see own people" ON people;
CREATE POLICY "Users see own people" ON people 
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own people" ON people;
CREATE POLICY "Users insert own people" ON people 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own people" ON people;
CREATE POLICY "Users update own people" ON people 
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own people" ON people;
CREATE POLICY "Users delete own people" ON people 
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para groups
DROP POLICY IF EXISTS "Users see own groups" ON groups;
CREATE POLICY "Users see own groups" ON groups 
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own groups" ON groups;
CREATE POLICY "Users insert own groups" ON groups 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own groups" ON groups;
CREATE POLICY "Users update own groups" ON groups 
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own groups" ON groups;
CREATE POLICY "Users delete own groups" ON groups 
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Mantener políticas públicas para group_participants y group_expenses
-- (porque se acceden por link compartido)
-- =====================================================
-- Ya tienen políticas públicas, no hay que cambiar nada

-- 5. DESPUÉS de registrarte, ejecuta esto para migrar tus datos:
-- Reemplaza 'TU_USER_ID' con tu UUID de auth.users
-- =====================================================
/*
UPDATE expenses SET user_id = 'TU_USER_ID' WHERE user_id IS NULL;
UPDATE cards SET user_id = 'TU_USER_ID' WHERE user_id IS NULL;
UPDATE people SET user_id = 'TU_USER_ID' WHERE user_id IS NULL;
UPDATE groups SET user_id = 'TU_USER_ID' WHERE user_id IS NULL;
*/
