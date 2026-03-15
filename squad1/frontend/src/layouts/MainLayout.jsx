import { Box } from '@mui/material';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Outlet } from 'react-router-dom';

const MainLayout = ({ children }) => {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Header />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children || <Outlet />}
      </Box>
      <Footer />
    </Box>
  );
};

export default MainLayout;
