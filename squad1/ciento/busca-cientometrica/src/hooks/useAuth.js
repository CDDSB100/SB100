import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// Hook customizado para usar o contexto de autenticação
export function useAuth() {
    const context = useContext(AuthContext);
    
    // If context is null, it means the component is not wrapped by AuthProvider
    if (context === null) {
        throw new Error(
            'useAuth must be used within an AuthProvider. ' +
            'Make sure your component is inside the AuthProvider wrapper.'
        );
    }
    
    return context;
}
