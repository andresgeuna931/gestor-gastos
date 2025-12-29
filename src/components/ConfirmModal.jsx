import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal({
    isOpen,
    title = '¿Estás seguro?',
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    type = 'danger' // 'danger' | 'warning' | 'success'
}) {
    if (!isOpen) return null

    const colors = {
        danger: {
            icon: 'text-red-400',
            button: 'bg-red-500 hover:bg-red-600'
        },
        warning: {
            icon: 'text-amber-400',
            button: 'bg-amber-500 hover:bg-amber-600'
        },
        success: {
            icon: 'text-green-400',
            button: 'bg-green-500 hover:bg-green-600'
        }
    }

    const color = colors[type] || colors.danger

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] animate-fade-in">
            <div className="glass w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-12 h-12 rounded-full bg-white/10 flex items-center justify-center ${color.icon}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2">
                        {title}
                    </h3>

                    <p className="text-gray-400 text-sm mb-6">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="btn-secondary flex-1"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors ${color.button}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
