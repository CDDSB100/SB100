import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext

// Hook customizado para usar o contexto de autenticação
export function useAuth() {
    return useContext(AuthContext);
}
