import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        // Redireciona para a página de login se não estiver autenticado
        return <Navigate to="/login" replace />;
    }

    // Renderiza o componente da rota aninhada (e.g., HomePage, SearchPage)
    return <Outlet />;
}

export default ProtectedRoute;
