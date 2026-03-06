import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Create context with a default value to prevent null issues
const defaultAuthValue = {
    isAuthenticated: false,
    token: null,
    userRole: null,
    isLoading: true,
    login: () => {},
    logout: () => {},
};

export const AuthContext = createContext(defaultAuthValue);

export function AuthProvider({ children }) {
    const [userToken, setUserToken] = useState(() => {
        try {
            const token = localStorage.getItem('accessToken');
            if (token === 'undefined' || token === 'null' || !token) return null;
            return token;
        } catch (e) {
            return null;
        }
    });

    const [userRole, setUserRole] = useState(() => {
        try {
            const token = localStorage.getItem('accessToken');
            if (token && token !== 'undefined' && token !== 'null') {
                const decodedToken = jwtDecode(token);
                // Verifica expiração básica (opcional mas recomendado)
                if (decodedToken.exp && decodedToken.exp * 1000 < Date.now()) {
                    localStorage.removeItem('accessToken');
                    return null;
                }
                return decodedToken.role;
            }
        } catch (error) {
            return null;
        }
        return null;
    });

    const [isLoading, setIsLoading] = useState(true);

    const login = useCallback((token) => {
        if (token) {
            localStorage.setItem('accessToken', token);
            setUserToken(token);
            try {
                const decodedToken = jwtDecode(token);
                setUserRole(decodedToken.role);
            } catch (error) {
                console.error("Error decoding token on login:", error);
                setUserRole(null);
            }
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('accessToken');
        setUserToken(null);
        setUserRole(null);
    }, []);

    // Sincroniza axios sempre que o token mudar
    useEffect(() => {
        if (userToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
        // Marcar como carregado após a primeira inicialização
        setIsLoading(false);
    }, [userToken]);

    const authValue = useMemo(() => ({
        isAuthenticated: !!userToken,
        token: userToken,
        userRole,
        isLoading,
        login,
        logout,
    }), [userToken, userRole, isLoading, login, logout]);

    return (
        <AuthContext.Provider value={authValue}>
            {children}
        </AuthContext.Provider>
    );
}
