import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    // Inicializar con lo que haya en localStorage o por defecto 'dark'
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme')
        return savedTheme || 'dark'
    })

    useEffect(() => {
        // Guardar en localStorage
        localStorage.setItem('theme', theme)

        // Aplicar atributo al body o html
        document.documentElement.setAttribute('data-theme', theme)

        // Opcional: cambiar meta color-scheme si quisieran integración nativa
        // document.documentElement.style.colorScheme = theme
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark')
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    return useContext(ThemeContext)
}
