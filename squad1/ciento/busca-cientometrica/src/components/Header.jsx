import { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Box,
  useTheme,
  useMediaQuery,
  Divider,
  Container,
  Avatar,
  Tooltip
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import LogoutIcon from '@mui/icons-material/Logout';
import ScienceIcon from '@mui/icons-material/Science';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import ArticleIcon from '@mui/icons-material/Article';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const { isAuthenticated, logout, userRole, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/home', show: isAuthenticated },
    { text: 'Busca', icon: <SearchIcon />, path: '/search', show: isAuthenticated },
    { text: 'Inserção Manual', icon: <PlaylistAddIcon />, path: '/manual-insert', show: isAuthenticated },
    { text: 'Curadoria', icon: <ArticleIcon />, path: '/curation', show: isAuthenticated },
    { text: 'Usuários', icon: <GroupIcon />, path: '/user-management', show: isAuthenticated && userRole === 'admin' },
  ];

  const drawer = (
    <Box sx={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Avatar sx={{ bgcolor: 'secondary.main' }}>
          <ScienceIcon />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            Cientometria
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Plataforma Acadêmica
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ p: 2, flexGrow: 1 }}>
        <Typography variant="overline" sx={{ px: 2, color: 'text.secondary', fontWeight: 700 }}>
          Menu Principal
        </Typography>
        <List sx={{ mt: 1 }}>
          <ListItem 
            component={RouterLink} 
            to="/" 
            onClick={handleDrawerToggle}
            sx={{ 
              borderRadius: 2, 
              mb: 0.5,
              bgcolor: location.pathname === '/' ? 'primary.light' : 'transparent',
              color: location.pathname === '/' ? 'white' : 'text.primary',
              '&:hover': { bgcolor: location.pathname === '/' ? 'primary.light' : 'rgba(0,0,0,0.04)' }
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === '/' ? 'white' : 'primary.main', minWidth: 40 }}>
              <DashboardIcon size="small" />
            </ListItemIcon>
            <ListItemText primary="Home" primaryTypographyProps={{ fontWeight: 600 }} />
          </ListItem>
          
          {menuItems.filter(item => item.show).map((item) => (
            <ListItem 
              key={item.text} 
              component={RouterLink} 
              to={item.path}
              onClick={handleDrawerToggle}
              sx={{ 
                borderRadius: 2, 
                mb: 0.5,
                bgcolor: location.pathname === item.path ? 'primary.light' : 'transparent',
                color: location.pathname === item.path ? 'white' : 'text.primary',
                '&:hover': { bgcolor: location.pathname === item.path ? 'primary.light' : 'rgba(0,0,0,0.04)' }
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : 'primary.main', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider />
      
      <Box sx={{ p: 2 }}>
        {!isAuthenticated ? (
          <Button 
            fullWidth 
            variant="contained" 
            component={RouterLink} 
            to="/login"
            onClick={handleDrawerToggle}
            sx={{ borderRadius: 2 }}
          >
            Entrar
          </Button>
        ) : (
          <Button 
            fullWidth 
            variant="outlined" 
            color="error" 
            startIcon={<LogoutIcon />} 
            onClick={handleLogout}
            sx={{ borderRadius: 2 }}
          >
            Sair
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar 
        position="sticky" 
        elevation={scrolled ? 4 : 0} 
        sx={{ 
          transition: 'all 0.3s ease',
          bgcolor: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'white',
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          borderBottom: scrolled ? 'none' : '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ height: { xs: 64, md: 80 } }}>
            <Box 
              component={RouterLink} 
              to="/" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5, 
                textDecoration: 'none', 
                color: 'primary.main',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'scale(1.02)' }
              }}
            >
              <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, boxShadow: '0 4px 8px rgba(27, 94, 32, 0.2)' }}>
                <ScienceIcon />
              </Avatar>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 800,
                  fontSize: { xs: '1.1rem', md: '1.3rem' },
                  letterSpacing: '-0.5px',
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                Busca Cientométrica
              </Typography>
            </Box>
            
            <Box sx={{ flexGrow: 1 }} />
            
            {isMobile ? (
              <IconButton
                color="primary"
                aria-label="open drawer"
                onClick={handleDrawerToggle}
                sx={{ bgcolor: 'rgba(27, 94, 32, 0.05)' }}
              >
                <MenuIcon />
              </IconButton>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {menuItems.filter(item => item.show).map((item) => (
                  <Button 
                    key={item.text} 
                    component={RouterLink} 
                    to={item.path}
                    sx={{ 
                      px: 2,
                      fontWeight: 600,
                      color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
                      position: 'relative',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 4,
                        left: 16,
                        right: 16,
                        height: 2,
                        bgcolor: 'primary.main',
                        transform: location.pathname === item.path ? 'scaleX(1)' : 'scaleX(0)',
                        transition: 'transform 0.3s'
                      },
                      '&:hover': { 
                        color: 'primary.main',
                        bgcolor: 'rgba(27, 94, 32, 0.04)' 
                      }
                    }}
                  >
                    {item.text}
                  </Button>
                ))}
                
                <Box sx={{ ml: 2, pl: 2, borderLeft: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                  {!isAuthenticated ? (
                    <Button 
                      variant="contained" 
                      component={RouterLink} 
                      to="/login" 
                      sx={{ borderRadius: '50px', px: 3 }}
                    >
                      Login
                    </Button>
                  ) : (
                    <>
                      <Tooltip title={`Perfil: ${userRole}`}>
                        <Avatar sx={{ width: 35, height: 35, bgcolor: 'secondary.main', fontSize: '0.9rem', fontWeight: 'bold' }}>
                          {user?.username?.substring(0, 1).toUpperCase() || 'U'}
                        </Avatar>
                      </Tooltip>
                      <IconButton color="error" onClick={handleLogout} sx={{ bgcolor: 'rgba(211, 47, 47, 0.05)' }}>
                        <LogoutIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        PaperProps={{ sx: { borderTopLeftRadius: 20, borderBottomLeftRadius: 20 } }}
        ModalProps={{ keepMounted: true }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Header;
