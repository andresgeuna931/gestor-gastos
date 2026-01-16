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
- Tarjeta: Para crédito o débito (podés elegir cuotas de 2 a 36)

## 💳 Cuotas con tarjeta y mes de facturación
Cuando pagás con tarjeta, podés elegir **cuándo empieza la primera cuota**:
- Mes actual: Si tu tarjeta cierra después de la compra
- Próximo mes: Si tu tarjeta ya cerró y la cuota viene el mes que viene

Esto te permite registrar el gasto el mismo día que lo hacés, sin esperar el resumen.

### 📌 Ejemplo práctico
El 16 de enero comprás algo en 6 cuotas. Tu tarjeta cierra el día 10, así que la primera cuota viene en **febrero**.
- Ingresás el gasto con fecha 16/01
- En "¿Cuándo pagás la primera cuota?" elegís "Febrero"
- El gasto aparecerá en el mes de Febrero, no en Enero

## 📅 Navegación por meses
La app tiene 3 vistas:
- **Histórico**: Ver gastos de meses anteriores (hasta 12 meses)
- **Mes Actual**: Ver y agregar gastos del mes en curso
- **Próximos Meses**: Ver cuotas futuras de gastos ya cargados

## 🔮 Próximos Meses
Esta vista te muestra qué cuotas tenés que pagar en los próximos 12 meses. Ideal para:
- Planificar tus gastos futuros
- Saber cuánto vas a pagar de tarjeta cada mes
- Anticipar compromisos financieros

## 💡 Tip: Gastos con cuotas ya empezadas
Si ya tenés gastos en cuotas de meses anteriores (ej: vas por la cuota 6 de 12), podés cargarlos así:
- Ingresá el monto TOTAL original del gasto
- Poné las cuotas que te FALTAN pagar (en el ejemplo: 6 cuotas)
- El sistema lo tratará como si empezara este mes

## Gestionar tarjetas
Tocá el botón "Tarjetas" para agregar, editar o eliminar tus tarjetas.

## Ver reportes
Tocá "Ver Reporte" para generar un informe detallado. Podés filtrar por fechas y tarjetas, y exportar a PDF.

## Gráfico de categorías
El gráfico circular te muestra cómo se distribuyen tus gastos por categoría.
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

## ⚠️ Requisito importante
Para usar Gastos Familiares en grupo, todos los miembros deben estar registrados en la app con su propio email. Esto permite que cada uno vea los mismos gastos y miembros desde su cuenta.

## Agregar miembros familiares
1. Tocá el botón "Miembros"
2. Ingresá el email del familiar (debe estar registrado en la app)
3. El sistema buscará al usuario y lo agregará al grupo
4. Todos los miembros agregados verán los mismos gastos

## Agregar un gasto compartido
1. Tocá "+ Agregar Gasto"
2. Completá los datos del gasto
3. En "¿Quién lo paga?", elegí quién hizo el pago
4. En "Compartir con", seleccioná con quiénes dividir el gasto

## 💳 Gastos con tarjeta y mes de facturación
Cuando cargás un gasto con tarjeta, podés elegir **cuándo empieza la primera cuota**:
- Esto te permite registrar el gasto el día de la compra
- Sin tener que esperar al resumen de la tarjeta

### 📌 Ejemplo práctico
El 16 de enero la familia compra un electrodoméstico en 12 cuotas. La tarjeta cierra el día 10, así que la primera cuota viene en **febrero**.
- Ingresás el gasto con fecha 16/01
- En "¿Cuándo pagás la primera cuota?" elegís "Febrero"
- El gasto aparecerá en Febrero, dividido entre los miembros seleccionados

## 📅 Navegación por meses
La app tiene 3 pestañas principales:
- **Histórico**: Gastos de meses anteriores (hasta 12 meses)
- **Mes Actual**: Gastos del mes en curso
- **Próximos Meses**: Cuotas futuras a pagar

## 🔮 Próximos Meses
Esta vista muestra qué cuotas van a venir en los próximos 12 meses:
- Seleccioná un mes futuro del dropdown
- Verás todas las cuotas que caen en ese mes
- Útil para planificar el presupuesto familiar

## Ver resumen del mes
La sección "Resumen del Mes" muestra cuánto debe pagar cada miembro y el total familiar. Cada miembro ve el mismo resumen desde su cuenta.

## 💡 Tip: Gastos con cuotas ya empezadas
Si compran algo compartido en cuotas y ya llevan pagadas algunas (ej: van por la cuota 6 de 12), pueden cargarlo así:
- Ingresen el monto TOTAL original
- Pongan las cuotas que FALTAN pagar (ej: 6 cuotas)
- El sistema dividirá automáticamente las cuotas restantes entre los miembros seleccionados

## 🗑️ Papelera - Gastos eliminados
- Tocá el botón "🗑️ Papelera" para ver los gastos eliminados del mes
- Muestra qué gasto fue eliminado, quién lo eliminó y cuándo
- Los registros de la papelera se borran automáticamente después de 30 días
- Esta función existe para dar transparencia a todos los miembros del grupo

## ⚠️ Restricción de eliminación
Por seguridad, solo podés eliminar tus propios gastos. No podés eliminar gastos cargados por otros miembros.

## Gestionar tarjetas
Tocá "Tarjetas" para agregar tus tarjetas. Cada miembro gestiona sus propias tarjetas.

## Ver reportes
Tocá "Ver Reporte" para generar un informe detallado con todos los gastos del grupo. Podés exportarlo a PDF.
        `
    },
    {
        id: 'groups',
        icon: '👥',
        title: 'Gastos Grupales',
        description: 'Para eventos, viajes, asados y más',
        content: `
## ¿Qué es?
Ideal para dividir gastos de eventos puntuales: asados, viajes, regalos grupales, cumpleaños, etc. Los participantes **no necesitan** estar registrados en la app.

## Crear un evento
1. Tocá "+ Crear Evento"
2. Dale un nombre (ej: "Asado Año Nuevo")
3. Opcionalmente agregá una descripción

## Agregar participantes
1. Dentro del evento, tocá "+ Agregar" en la sección Participantes
2. Ingresá el nombre de cada persona (no necesitan tener cuenta)
3. Podés agregar tantos participantes como necesites

## Registrar gastos
1. Tocá "+ Agregar" en la sección Gastos
2. Escribí la descripción y monto
3. Indicá quién pagó
4. Seleccioná entre quiénes se divide (podés usar "Seleccionar todos" para dividir entre todos)

## ⚠️ Alerta de gasto duplicado
Si intentás agregar un gasto con el mismo nombre y monto que uno existente, el sistema te preguntará si querés agregarlo igual. Esto evita cargar gastos duplicados por error.

## 🔍 Buscar gastos
Si tenés más de 3 gastos, aparecerá un buscador para encontrar gastos fácilmente por descripción.

## Balance automático
El sistema calcula automáticamente:
- Cuánto gastó cada persona
- El balance de cada uno (positivo = le deben, negativo = debe)
- Quién tiene que pagarle a quién para saldar cuentas

## Compartir evento
Tocá el botón "Compartir" para enviar el resumen por WhatsApp. Incluye la lista de gastos y quién debe a quién.
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
- Indicar la cantidad de cuotas (2 a 36)
- Elegir en qué mes empieza la primera cuota
- Ver el monto por cuota automáticamente calculado

## 📆 Mes de primera cuota
Al pagar con tarjeta, podés elegir cuándo se cobra la primera cuota:
- **Mes actual**: Si tu tarjeta aún no cerró
- **Próximo mes**: Si tu tarjeta ya cerró y la cuota viene después

Esto te da flexibilidad para registrar el gasto cuando querés:
- El día de la compra (eligiendo el mes correcto de facturación)
- O cuando llega el resumen
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
