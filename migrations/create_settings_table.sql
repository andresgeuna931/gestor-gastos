-- Crear tabla de configuraciones para guardar la contraseña familiar
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Habilitar RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Política para acceso público (toda la familia puede leer/escribir)
CREATE POLICY "settings_public_access" ON settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Insertar contraseña por defecto si no existe
INSERT INTO settings (key, value) 
VALUES ('family_password', 'familia2025')
ON CONFLICT (key) DO NOTHING;
