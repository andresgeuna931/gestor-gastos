// Utilidad para detectar género basado en nombre
// Retorna 'male', 'female', o 'neutral'

// Nombres masculinos comunes en español
const MALE_NAMES = new Set([
    'andres', 'andrés', 'pablo', 'juan', 'carlos', 'miguel', 'jose', 'josé',
    'luis', 'antonio', 'manuel', 'francisco', 'pedro', 'diego', 'jorge',
    'fernando', 'rafael', 'daniel', 'alejandro', 'ricardo', 'eduardo',
    'mario', 'sergio', 'roberto', 'alberto', 'enrique', 'javier', 'oscar',
    'óscar', 'raúl', 'raul', 'victor', 'víctor', 'martin', 'martín',
    'gabriel', 'adrian', 'adrián', 'nicolas', 'nicolás', 'mateo', 'lucas',
    'santiago', 'sebastian', 'sebastián', 'tomas', 'tomás', 'felipe',
    'ignacio', 'rodrigo', 'facundo', 'bruno', 'agustin', 'agustín',
    'ezequiel', 'máximo', 'maximo', 'thiago', 'lautaro', 'benjamin',
    'benjamín', 'marco', 'marcos', 'emiliano', 'franco', 'ivan', 'iván',
    'axel', 'dante', 'joaquin', 'joaquín', 'gonzalo', 'ramiro', 'alan',
    'cristian', 'gustavo', 'julio', 'walter', 'hector', 'héctor', 'fabian',
    'fabián', 'cesar', 'césar', 'ruben', 'rubén', 'omar', 'hugo', 'dario',
    'darío', 'claudio', 'mauricio', 'marcelo', 'nestor', 'néstor', 'federico'
])

// Nombres femeninos comunes en español
const FEMALE_NAMES = new Set([
    'maria', 'maría', 'ana', 'carmen', 'rosa', 'lucia', 'lucía', 'isabel',
    'laura', 'claudia', 'paula', 'patricia', 'gabriela', 'andrea', 'marta',
    'miriam', 'elena', 'silvia', 'adriana', 'alicia', 'beatriz', 'carolina',
    'daniela', 'diana', 'eva', 'florencia', 'gloria', 'irene', 'julia',
    'karla', 'lorena', 'mariana', 'natalia', 'olivia', 'pamela', 'romina',
    'sandra', 'sofia', 'sofía', 'tamara', 'valentina', 'victoria', 'ximena',
    'yamila', 'zoe', 'camila', 'martina', 'julieta', 'catalina', 'emilia',
    'agustina', 'micaela', 'milagros', 'rocio', 'rocío', 'celeste', 'sol',
    'abril', 'antonella', 'guadalupe', 'fernanda', 'macarena', 'pilar',
    'veronica', 'verónica', 'monica', 'mónica', 'cecilia', 'soledad',
    'valeria', 'silvana', 'viviana', 'analia', 'analía', 'marina', 'carla',
    'alejandra', 'susana', 'graciela', 'norma', 'liliana', 'stella', 'estela',
    'mercedes', 'josefina', 'juana', 'teresa', 'dolores', 'consuelo'
])

/**
 * Detecta el género basado en el nombre
 * @param {string} name - El nombre a analizar
 * @returns {'male' | 'female' | 'neutral'} El género detectado
 */
export function detectGender(name) {
    if (!name || typeof name !== 'string') return 'neutral'

    // Limpiar y normalizar el nombre
    const cleanName = name.toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos para comparar

    // Extraer el primer nombre (antes de espacio o número)
    const firstName = cleanName.split(/[\s\d@._-]/)[0]

    // Versión sin acentos para comparación
    const normalizedFirst = firstName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // Buscar en listas (con y sin acentos)
    if (MALE_NAMES.has(firstName) || MALE_NAMES.has(normalizedFirst)) {
        return 'male'
    }

    if (FEMALE_NAMES.has(firstName) || FEMALE_NAMES.has(normalizedFirst)) {
        return 'female'
    }

    // Heurística: nombres terminados en 'a' suelen ser femeninos (con excepciones)
    const maleEndingsInA = ['luca', 'joshua', 'elia', 'isaias', 'nehemias', 'jeremias']
    if (firstName.endsWith('a') && !maleEndingsInA.includes(firstName)) {
        return 'female'
    }

    // Nombres terminados en 'o' suelen ser masculinos
    if (firstName.endsWith('o')) {
        return 'male'
    }

    return 'neutral'
}

/**
 * Retorna el emoji apropiado según el género
 * @param {string} name - El nombre a analizar
 * @returns {string} El emoji correspondiente
 */
export function getGenderEmoji(name) {
    const gender = detectGender(name)
    switch (gender) {
        case 'male': return '👨'
        case 'female': return '👩'
        default: return '🧑'
    }
}

/**
 * Retorna el emoji con tono de piel opcional
 * @param {string} name - El nombre
 * @param {boolean} withColor - Si usar tono de piel
 * @returns {string} El emoji
 */
export function getPersonEmoji(name, withColor = false) {
    const gender = detectGender(name)
    if (withColor) {
        switch (gender) {
            case 'male': return '👨🏻'
            case 'female': return '👩🏻'
            default: return '🧑🏻'
        }
    }
    return getGenderEmoji(name)
}
