-- ==========================================
-- MIGRACIÓN: Agregar campo status a expenses
-- ==========================================
-- Ejecutar este script en Supabase SQL Editor
-- (Proyecto → SQL Editor → New query → Pegar y ejecutar)

-- Agregar columna status
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Actualizar gastos existentes (todos son activos por defecto)
UPDATE expenses SET status = 'active' WHERE status IS NULL;

-- Mensaje de confirmación
SELECT 'Migración completada: campo status agregado a expenses' as resultado;
