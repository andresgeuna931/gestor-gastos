-- Agregar columna section a la tabla cards
ALTER TABLE cards ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'family';

-- Las tarjetas existentes se asignan a 'family' por defecto
-- Las nuevas tarjetas personales tendrán section = 'personal'
