-- ==========================================
-- GESTOR DE GASTOS FAMILIARES
-- Script SQL para Supabase
-- ==========================================

-- Ejecutar este script completo en el SQL Editor de Supabase
-- (Proyecto → SQL Editor → New query → Pegar y ejecutar)

-- ==========================================
-- TABLA: expenses (Gastos)
-- ==========================================

CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  installments INTEGER NOT NULL DEFAULT 1,
  current_installment INTEGER NOT NULL DEFAULT 1,
  owner TEXT NOT NULL,
  category TEXT NOT NULL,
  card TEXT NOT NULL,
  date DATE NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('personal', 'shared2', 'shared3')),
  shared_with TEXT,
  month TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- TABLA: cards (Tarjetas)
-- ==========================================

CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- DATOS INICIALES
-- ==========================================

-- Insertar tarjetas por defecto
INSERT INTO cards (name) VALUES 
  ('Visa Principal'),
  ('Mastercard')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- ÍNDICES (para mejor rendimiento)
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(month);
CREATE INDEX IF NOT EXISTS idx_expenses_owner ON expenses(owner);
CREATE INDEX IF NOT EXISTS idx_expenses_share_type ON expenses(share_type);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- ==========================================
-- TRIGGER: Actualizar updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at 
  BEFORE UPDATE ON expenses
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Habilitar RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público (para app familiar simple)
DROP POLICY IF EXISTS "Permitir acceso público a expenses" ON expenses;
CREATE POLICY "Permitir acceso público a expenses" 
  ON expenses FOR ALL 
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir acceso público a cards" ON cards;
CREATE POLICY "Permitir acceso público a cards" 
  ON cards FOR ALL 
  USING (true)
  WITH CHECK (true);

-- ==========================================
-- ¡LISTO! Base de datos configurada
-- ==========================================
