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

## ¿Cómo usar?
1. **Agregar gasto**: Tocá "+ Agregar Gasto" y completá la descripción, monto, categoría y fecha
2. **Método de pago**: Elegí entre Efectivo, Transferencia, QR o Tarjeta
3. **Cuotas**: Si pagás con tarjeta, podés indicar en cuántas cuotas
4. **Ver histórico**: Tocá "Histórico" para ver gastos de meses anteriores

## Tarjetas
Tocá el botón "Tarjetas" para agregar o eliminar las tarjetas que usás.

## Gráficos
El gráfico de torta te muestra cómo se distribuyen tus gastos por categoría.
        `
    },
    {
        id: 'family',
        icon: '👨‍👩‍👧‍👦',
        title: 'Gastos Familiares',
        description: 'Gastos compartidos con tu familia o pareja',
        content: `
## ¿Qué es?
Esta sección es para gastos que compartís con tu familia o pareja.

## ¿Cómo usar?
1. **Agregar gasto**: Igual que en gastos personales
2. **Compartir gasto**: Podés indicar si el gasto es personal, compartido en 2 o compartido en 3
3. **Miembros**: Agregá los miembros de tu familia para ver cuánto gasta cada uno

## Ver totales
El resumen te muestra cuánto gastó cada miembro y el total familiar.

## Cierre de mes
Al final de cada mes, podés hacer "Cierre de Mes" para archivar los gastos y empezar limpio.
        `
    },
    {
        id: 'groups',
        icon: '👥',
        title: 'Gastos Grupales',
        description: 'Para eventos, viajes, asados y más',
        content: `
## ¿Qué es?
Perfecta para dividir gastos de eventos puntuales como asados, viajes, regalos grupales, etc.

## ¿Cómo usar?
1. **Crear evento**: Tocá "Crear Evento" y dale un nombre (ej: "Asado Año Nuevo")
2. **Agregar participantes**: Agregá a las personas que participan (no necesitan tener cuenta)
3. **Registrar gastos**: Indicá quién pagó y entre quiénes se divide

## Balance automático
El sistema calcula automáticamente:
- Cuánto gastó cada persona
- Quién le debe a quién
- Cómo saldar las cuentas con la menor cantidad de transferencias

## Compartir
Tocá "Compartir" para enviar el link del evento por WhatsApp a los participantes.
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
Para pagos en efectivo. No requiere tarjeta.

### 🏦 Transferencia
Para pagos por transferencia bancaria. No requiere tarjeta.

### 📱 QR
Para pagos con QR (Modo, Mercado Pago, etc). No requiere tarjeta.

### 💳 Tarjeta
Para pagos con tarjeta de crédito o débito. Podés:
- Seleccionar la tarjeta
- Indicar cantidad de cuotas
- El sistema muestra cuánto pagás por mes
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
Dedicale 5 minutos a la semana para revisar tus gastos.

### 🏷️ Usá categorías
Las categorías te ayudan a ver en qué gastás más. Sé consistente.

### 📅 Registrá al momento
Es más fácil recordar los detalles si registrás el gasto apenas lo hacés.

### 📈 Mirá los gráficos
Los gráficos te muestran patrones que no verías solo con números.

### 🎯 Establecé límites
Sabiendo cuánto gastás, podés establecer límites mensuales por categoría.
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
                                                return <h3 key={i} className="text-lg font-semibold text-primary-400 mt-4 mb-2">{line.replace('## ', '')}</h3>
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
                        <a href="mailto:soporte@gestordegastos.com" className="text-primary-400 hover:underline">
                            soporte@gestordegastos.com
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
                                        return <h3 key={i} className="text-lg font-semibold text-primary-400 mt-4 mb-2">{line.replace('## ', '')}</h3>
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
