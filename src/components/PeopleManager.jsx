import { useState } from 'react'
import { Search, Plus, Trash2, Users, X, Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function PeopleManager({
    people,
    onSearchEmail,
    onAddPerson,
    onDeletePerson,
    onClose,
    currentUserEmail
}) {
    const [email, setEmail] = useState('')
    const [searchResult, setSearchResult] = useState(null) // { found, user, error }
    const [isSearching, setIsSearching] = useState(false)
    const [isAdding, setIsAdding] = useState(false)

    const handleSearch = async () => {
        if (!email.trim()) return

        // No permitir agregarse a sí mismo
        if (email.toLowerCase() === currentUserEmail?.toLowerCase()) {
            setSearchResult({
                found: false,
                error: 'No podés agregarte a vos mismo'
            })
            return
        }

        // Verificar si ya está agregado
        const alreadyAdded = people.some(
            p => p.member_email?.toLowerCase() === email.toLowerCase()
        )
        if (alreadyAdded) {
            setSearchResult({
                found: false,
                error: 'Este familiar ya está agregado'
            })
            return
        }

        setIsSearching(true)
        setSearchResult(null)

        try {
            const result = await onSearchEmail(email.trim())
            setSearchResult(result)
        } catch (error) {
            setSearchResult({
                found: false,
                error: 'Error al buscar. Intentá de nuevo.'
            })
        }

        setIsSearching(false)
    }

    const handleAdd = async () => {
        if (!searchResult?.found || !searchResult?.user) return

        setIsAdding(true)
        try {
            await onAddPerson({
                member_id: searchResult.user.user_id,
                member_email: searchResult.user.email,
                member_name: searchResult.user.name || searchResult.user.email.split('@')[0] // Nombre del registro o fallback
            })
            setEmail('')
            setSearchResult(null)
        } catch (error) {
            console.error('Error adding family member:', error)
        }
        setIsAdding(false)
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    // Emojis para las personas
    const getEmoji = (index) => {
        const emojis = ['👩', '👨', '👦', '👧', '🧑', '👴', '👵', '🧒']
        return emojis[index % emojis.length]
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="glass w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Miembros de la Familia
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Buscar por email */}
                    <div className="mb-4">
                        <label className="label">Buscar familiar por email</label>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    setSearchResult(null)
                                }}
                                onKeyPress={handleKeyPress}
                                placeholder="familiar@email.com"
                                className="input-field flex-1"
                            />
                            <button
                                onClick={handleSearch}
                                disabled={!email.trim() || isSearching}
                                className="btn-primary flex items-center gap-1 disabled:opacity-50"
                            >
                                {isSearching ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                                Buscar
                            </button>
                        </div>
                    </div>

                    {/* Resultado de búsqueda */}
                    {searchResult && (
                        <div className={`p-4 rounded-lg mb-4 animate-fade-in ${searchResult.found
                            ? 'bg-green-500/20 border border-green-500/30'
                            : 'bg-red-500/20 border border-red-500/30'
                            }`}>
                            {searchResult.found ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                        <div>
                                            <p className="text-white font-medium">
                                                {searchResult.user.email}
                                            </p>
                                            <p className="text-green-300 text-sm">
                                                ✅ Usuario con suscripción activa
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAdd}
                                        disabled={isAdding}
                                        className="btn-success flex items-center gap-1"
                                    >
                                        {isAdding ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Plus className="w-4 h-4" />
                                        )}
                                        Agregar
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <XCircle className="w-5 h-5 text-red-400" />
                                    <p className="text-red-300">
                                        {searchResult.error}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Nota informativa */}
                    <p className="text-gray-500 text-sm mb-4">
                        💡 Solo podés agregar usuarios que ya estén registrados y tengan suscripción activa.
                    </p>

                    {/* Lista de familiares */}
                    <div className="border-t border-white/10 pt-4">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">
                            Familiares agregados
                        </h3>

                        {people.length === 0 ? (
                            <div className="text-center py-6 text-gray-400">
                                <p>No hay miembros aún</p>
                                <p className="text-sm mt-2">Buscá por email para agregar familiares</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {people.map((person, index) => (
                                    <div
                                        key={person.id}
                                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{getEmoji(index)}</span>
                                            <div>
                                                <span className="text-white font-medium">
                                                    {person.member_name || person.name}
                                                </span>
                                                {person.member_email && (
                                                    <p className="text-gray-400 text-sm">
                                                        {person.member_email}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onDeletePerson(person.id)}
                                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10">
                        <p className="text-gray-500 text-sm text-center">
                            {people.length} {people.length === 1 ? 'miembro' : 'miembros'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
