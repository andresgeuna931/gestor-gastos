-- Agregar columna payment_method a la tabla expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'tarjeta';

-- Comentario: Los valores posibles son:
-- 'efectivo' - Pago en efectivo
-- 'transferencia' - Transferencia bancaria
-- 'qr' - Pago con QR (MercadoPago, etc)
-- 'tarjeta' - Pago con tarjeta de crédito/débito
