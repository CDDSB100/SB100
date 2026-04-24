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
        const t = localStorage.getItem('accessToken');
        return (t === 'undefined' || t === 'null') ? null : t;
    });
    
    const [userRole, setUserRole] = useState(() => {
        const t = localStorage.getItem('accessToken');
        if (t && t !== 'undefined' && t !== 'null') {
            try {
                return jwtDecode(t).role;
            } catch (e) {
                return null;
            }
        }
        return null;
    });

    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('accessToken');
        setUserToken(null);
        setUserRole(null);
        delete axios.defaults.headers.common['Authorization'];
    }, []);

    // Sincronização e validação centralizada
    useEffect(() => {
        if (userToken) {
            try {
                const decodedToken = jwtDecode(userToken);
                const currentTime = Date.now() / 1000;

                if (decodedToken.exp && decodedToken.exp < currentTime) {
                    console.warn("Token expirado detectado.");
                    logout();
                } else {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
                }
            } catch (error) {
                console.error("Erro ao validar token:", error);
                logout();
            }
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
        setIsLoading(false);
    }, [userToken, logout]);

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
