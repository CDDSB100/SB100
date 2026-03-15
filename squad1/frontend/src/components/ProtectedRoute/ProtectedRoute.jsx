import { Navigate, Outlet } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../layouts/MainLayout';

function ProtectedRoute() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuthenticated) {
        // Redireciona para a página de login se não estiver autenticado
        return <Navigate to="/login" replace />;
    }

    // Renderiza o componente da rota aninhada envolvido pelo MainLayout
    return (
        <MainLayout>
            <Outlet />
        </MainLayout>
    );
}

export default ProtectedRoute;
