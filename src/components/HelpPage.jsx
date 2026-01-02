import { useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'

const helpSections = [
    {
        id: 'personal',
        icon: '💰',
        title: 'Gastos Personales',
        description: 'Registrá y controlá tus gastos individuales',
        content: `
## ¿Qué es?
Esta sección es para registrar tus gastos personales que no compartís con nadie.

## ¿Cómo agregar un gasto?
1. Tocá el botón "+ Agregar Gasto"
2. Completá la descripción (ej: "Almuerzo", "Nafta")
3. Ingresá el monto
4. Elegí una categoría
5. Seleccioná el método de pago

## Métodos de pago
- Efectivo: Para pagos en cash
- Transferencia: Para débito automático o transferencias
- QR: Para pagos con Mercado Pago, Modo, etc.
- Tarjeta: Para crédito o débito (podés elegir cuotas)

## Cuotas con tarjeta
Si pagás en cuotas, el sistema calcula automáticamente cuánto pagás por mes y muestra las cuotas restantes.

## Ver historial
Tocá la pestaña "Histórico" para ver gastos de meses anteriores. Podés ver hasta 12 meses atrás.

## Gestionar tarjetas
Tocá el botón "Tarjetas" para agregar, editar o eliminar tus tarjetas.

## Ver reportes
Tocá "Ver Reporte" para generar un informe detallado. Podés filtrar por fechas y tarjetas, y exportar a PDF.

## Gráfico de categorías
El gráfico circular te muestra cómo se distribuyen tus gastos por categoría.

## Nota sobre fechas
El sistema solo permite registrar gastos con fecha del mes en curso. Esto asegura que el historial de meses anteriores quede cerrado y ordenado. Si necesitás revisar gastos pasados, usá la pestaña "Histórico".
        `
    },
    {
        id: 'family',
        icon: '👨‍👩‍👧‍👦',
        title: 'Gastos Familiares',
        description: 'Gastos compartidos con tu familia o pareja',
        content: `
## ¿Qué es?
Esta sección es para gastos que compartís con tu familia o pareja. El sistema calcula automáticamente cuánto debe pagar cada miembro.

## Agregar miembros
1. Tocá el botón "Miembros"
2. Ingresá el nombre de cada persona
3. Los miembros aparecerán en el resumen del mes

## Agregar un gasto compartido
1. Tocá "+ Agregar Gasto"
2. Completá los datos del gasto
3. En "¿Quién lo paga?", elegí quién hizo el pago
4. En "Compartir con", seleccioná si es Personal, Compartido en 2, o Compartido en 3

## Ver resumen del mes
La sección "Resumen del Mes" muestra cuánto debe pagar cada miembro y el total familiar.

## Ver reportes
Tocá "Ver Reporte" para generar un informe detallado con todos los gastos. Podés exportarlo a PDF.

## Gestionar tarjetas
Igual que en gastos personales, podés agregar las tarjetas de todos los miembros.

## Nota sobre fechas
El sistema solo permite registrar gastos con fecha del mes en curso. Esto asegura que el historial de meses anteriores quede cerrado y ordenado. Si necesitás revisar gastos pasados, usá la pestaña "Histórico".
        `
    },
    {
        id: 'groups',
        icon: '👥',
        title: 'Gastos Grupales',
        description: 'Para eventos, viajes, asados y más',
        content: `
## ¿Qué es?
Ideal para dividir gastos de eventos puntuales: asados, viajes, regalos grupales, cumpleaños, etc.

## Crear un evento
1. Tocá "+ Crear Evento"
2. Dale un nombre (ej: "Asado Año Nuevo")
3. Opcionalmente agregá una descripción

## Agregar participantes
1. Dentro del evento, tocá "+ Agregar" en la sección Participantes
2. Ingresá el nombre de cada persona (no necesitan tener cuenta)

## Registrar gastos
1. Tocá "+ Agregar" en la sección Gastos
2. Escribí la descripción y monto
3. Indicá quién pagó
4. Seleccioná entre quiénes se divide

## Balance automático
El sistema calcula automáticamente:
- Cuánto gastó cada persona
- El balance de cada uno (positivo = le deben, negativo = debe)
- Quién tiene que pagarle a quién para saldar cuentas

## Compartir evento
Tocá el botón "Compartir" para enviar el link del evento por WhatsApp.
        `
    },
    {
        id: 'methods',
        icon: '💳',
        title: 'Métodos de Pago',
        description: 'Efectivo, Transferencia, QR y Tarjeta',
        content: `
## Métodos disponibles

### 💵 Efectivo
Para pagos en efectivo. No requiere seleccionar tarjeta.

### 🏦 Transferencia
Para pagos por transferencia bancaria o débito automático.

### 📱 QR
Para pagos con aplicaciones como Mercado Pago, Modo, BIND, etc.

### 💳 Tarjeta
Para pagos con tarjeta de crédito o débito. Podés:
- Seleccionar la tarjeta específica
- Indicar la cantidad de cuotas (1 a 18)
- Ver el monto por cuota automáticamente calculado
        `
    },
    {
        id: 'reports',
        icon: '📊',
        title: 'Reportes y Exportación',
        description: 'Generá informes detallados en PDF',
        content: `
## Ver Reporte
Tocá "Ver Reporte" en cualquier sección para acceder al generador de reportes.

## Filtros disponibles
- Rango de fechas: Elegí desde y hasta qué fecha
- Tarjetas: Filtrá por una o varias tarjetas específicas

## Exportar a PDF
1. Configurá los filtros que necesites
2. Tocá "Descargar PDF"
3. Se genera un archivo PDF profesional con el logo de la marca

## Contenido del PDF
- Título y período del reporte
- Branding de AMG Digital
- Tabla detallada con todos los gastos
- Total general
        `
    },
    {
        id: 'tips',
        icon: '💡',
        title: 'Tips y Consejos',
        description: 'Sacale el máximo provecho a la app',
        content: `
## Consejos útiles

### 📊 Revisá semanalmente
Dedicale 5 minutos por semana para revisar tus gastos y mantener el control.

### 🏷️ Usá categorías consistentes
Las categorías te ayudan a ver en qué gastás más. Siempre usá la misma categoría para gastos similares.

### 📅 Registrá al momento
Es más fácil recordar los detalles si registrás el gasto apenas lo hacés.

### 📈 Mirá los gráficos
Los gráficos te muestran patrones que no verías solo mirando números.

### 📱 Agregá la app a tu pantalla de inicio
Podés instalar la app como un acceso directo para abrirla más rápido.

### 💾 Exportá reportes mensuales
Al final de cada mes, exportá un PDF como respaldo de tus gastos.
        `
    }
]

export default function HelpPage({ onBack }) {
    const [expandedSection, setExpandedSection] = useState(null)

    return (
        <div className="min-h-screen p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <header className="flex items-center gap-4 mb-6">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            ❓ Centro de Ayuda
                        </h1>
                        <p className="text-gray-400">
                            Aprendé a usar la app
                        </p>
                    </div>
                </header>

                {/* Welcome */}
                <div className="glass p-6 mb-6">
                    <h2 className="text-xl font-semibold text-white mb-2">
                        ¡Bienvenido al Gestor de Gastos!
                    </h2>
                    <p className="text-gray-400">
                        Esta app te ayuda a llevar el control de tus gastos personales, familiares
                        y grupales. Tocá cada sección para aprender cómo funciona.
                    </p>
                </div>

                {/* Help Sections */}
                <div className="space-y-3">
                    {helpSections.map(section => (
                        <div key={section.id} className="glass overflow-hidden">
                            <button
                                onClick={() => setExpandedSection(
                                    expandedSection === section.id ? null : section.id
                                )}
                                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/5 transition-colors"
                            >
                                <div className="text-3xl">{section.icon}</div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white">
                                        {section.title}
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        {section.description}
                                    </p>
                                </div>
                                {expandedSection === section.id ? (
                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                            </button>

                            {expandedSection === section.id && (
                                <div className="px-4 pb-4 border-t border-white/10">
                                    <div className="prose prose-invert prose-sm max-w-none pt-4">
                                        {section.content.split('\n').map((line, i) => {
                                            if (line.startsWith('## ')) {
                                                return <h3 key={i} className="text-lg font-semibold text-[#E6D5B8] mt-4 mb-2">{line.replace('## ', '')}</h3>
                                            }
                                            if (line.startsWith('### ')) {
                                                return <h4 key={i} className="text-md font-medium text-white mt-3 mb-1">{line.replace('### ', '')}</h4>
                                            }
                                            if (line.trim().startsWith('- ')) {
                                                return <li key={i} className="text-gray-300 ml-4">{line.replace('- ', '')}</li>
                                            }
                                            if (line.match(/^\d+\./)) {
                                                return <p key={i} className="text-gray-300 ml-2">{line}</p>
                                            }
                                            if (line.trim()) {
                                                return <p key={i} className="text-gray-400 my-1">{line}</p>
                                            }
                                            return null
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Contact */}
                <div className="glass p-6 mt-6 text-center">
                    <p className="text-gray-400">
                        ¿Tenés dudas? Escribinos a{' '}
                        <a href="mailto:amgdigital.ok@gmail.com" className="text-[#E6D5B8] hover:underline">
                            amgdigital.ok@gmail.com
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}

// Componente reutilizable para botón de ayuda contextual
export function HelpButton({ section, className = '' }) {
    const [showHelp, setShowHelp] = useState(false)

    const sectionData = helpSections.find(s => s.id === section)
    if (!sectionData) return null

    return (
        <>
            <button
                onClick={() => setShowHelp(true)}
                className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${className}`}
                title="Ayuda"
            >
                <HelpCircle className="w-5 h-5 text-gray-400" />
            </button>

            {showHelp && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="glass w-full max-w-lg max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{sectionData.icon}</span>
                                    <h2 className="text-xl font-semibold text-white">
                                        {sectionData.title}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setShowHelp(false)}
                                    className="text-gray-400 hover:text-white text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="prose prose-invert prose-sm max-w-none">
                                {sectionData.content.split('\n').map((line, i) => {
                                    if (line.startsWith('## ')) {
                                        return <h3 key={i} className="text-lg font-semibold text-[#E6D5B8] mt-4 mb-2">{line.replace('## ', '')}</h3>
                                    }
                                    if (line.startsWith('### ')) {
                                        return <h4 key={i} className="text-md font-medium text-white mt-3 mb-1">{line.replace('### ', '')}</h4>
                                    }
                                    if (line.trim().startsWith('- ')) {
                                        return <li key={i} className="text-gray-300 ml-4">{line.replace('- ', '')}</li>
                                    }
                                    if (line.match(/^\d+\./)) {
                                        return <p key={i} className="text-gray-300 ml-2">{line}</p>
                                    }
                                    if (line.trim()) {
                                        return <p key={i} className="text-gray-400 my-1">{line}</p>
                                    }
                                    return null
                                })}
                            </div>

                            <button
                                onClick={() => setShowHelp(false)}
                                className="btn-primary w-full mt-6"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
