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
    const [userToken, setUserToken] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Inicialização robusta e unificada
    useEffect(() => {
        const initializeAuth = () => {
            try {
                const token = localStorage.getItem('accessToken');
                
                if (!token || token === 'undefined' || token === 'null') {
                    setUserToken(null);
                    setUserRole(null);
                    setIsLoading(false);
                    return;
                }

                const decodedToken = jwtDecode(token);
                const currentTime = Date.now() / 1000;

                // Verifica expiração
                if (decodedToken.exp && decodedToken.exp < currentTime) {
                    console.warn("Token expirado detectado na inicialização.");
                    localStorage.removeItem('accessToken');
                    setUserToken(null);
                    setUserRole(null);
                } else {
                    setUserToken(token);
                    setUserRole(decodedToken.role);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                }
            } catch (error) {
                console.error("Erro ao validar token na inicialização:", error);
                localStorage.removeItem('accessToken');
                setUserToken(null);
                setUserRole(null);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const login = useCallback((token) => {
        if (token) {
            localStorage.setItem('accessToken', token);
            setUserToken(token);
            try {
                const decodedToken = jwtDecode(token);
                setUserRole(decodedToken.role);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
        delete axios.defaults.headers.common['Authorization'];
    }, []);

    // Sincroniza axios sempre que o token mudar (para garantir consistência)
    useEffect(() => {
        if (userToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
        }
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
