import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Container,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
  Stack,
  Chip,
  Fade,
  useTheme,
  Button
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArticleIcon from "@mui/icons-material/Article";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import FolderIcon from "@mui/icons-material/Folder";
import GroupIcon from "@mui/icons-material/Group";
import HubIcon from "@mui/icons-material/Hub";
import Header from "../components/Header";
import { useAuth } from "../hooks/useAuth";
import { checkApiHealth } from "../api";

function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { userRole, user } = useAuth();
  const [apiStatus, setApiStatus] = useState("checking");

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await checkApiHealth();
        setApiStatus("online");
      } catch (error) {
        setApiStatus("offline");
      }
    };
    checkHealth();
  }, []);

  const menuItems = [
    {
      title: "Busca Cientométrica",
      description: "Pesquise artigos em múltiplas bases de dados acadêmicas.",
      icon: <SearchIcon sx={{ fontSize: 32 }} />,
      path: "/search",
      color: theme.palette.primary.main,
    },
    {
      title: "Curadoria",
      description: "Gerencie, classifique e mova artigos salvos.",
      icon: <ArticleIcon sx={{ fontSize: 32 }} />,
      path: "/curation",
      color: theme.palette.secondary.main,
    },
    {
      title: "Inserção Manual",
      description: "Adicione artigos e PDFs manualmente ao sistema.",
      icon: <PlaylistAddIcon sx={{ fontSize: 32 }} />,
      path: "/manual-insert",
      color: "#2e7d32",
    },
    {
      title: "Processamento em Lote",
      description: "Analise múltiplos PDFs de pastas locais de uma vez.",
      icon: <FolderIcon sx={{ fontSize: 32 }} />,
      path: "/batch-process-drive",
      color: "#ed6c02",
    },
  ];

  if (userRole === "admin") {
    menuItems.push({
      title: "Gestão de Usuários",
      description: "Gerencie pesquisadores, permissões e categorias.",
      icon: <GroupIcon sx={{ fontSize: 32 }} />,
      path: "/user-management",
      color: "#1976d2",
    });
    menuItems.push({
      title: "Novos Registros",
      description: "Cadastre novos membros na equipe de pesquisa.",
      icon: <PersonAddIcon sx={{ fontSize: 32 }} />,
      path: "/register-user",
      color: "#9c27b0",
    });
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: 'flex', flexDirection: 'column' }}>
      <Header />
      
      {/* Hero Section */}
      <Box 
        sx={{ 
          bgcolor: 'primary.main', 
          color: 'primary.contrastText', 
          pt: { xs: 6, md: 10 }, 
          pb: { xs: 12, md: 16 },
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1
        }}
      >
        {/* Decorative background element */}
        <Box 
          sx={{ 
            position: 'absolute', 
            top: -50, 
            right: -50, 
            width: { xs: 200, md: 400 }, 
            height: { xs: 200, md: 400 }, 
            borderRadius: '50%', 
            bgcolor: 'rgba(255,255,255,0.08)',
            pointerEvents: 'none'
          }} 
        />
        
        <Container maxWidth="lg">
          <Fade in timeout={800}>
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Chip 
                  label={apiStatus === 'online' ? "SISTEMA ONLINE" : "SISTEMA OFFLINE"} 
                  color={apiStatus === 'online' ? "success" : "error"} 
                  size="small"
                  sx={{ 
                    fontWeight: 900, 
                    px: 1,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    color: 'white'
                  }}
                />
                <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 600, color: 'primary.contrastText' }}>
                  Versão 2.0 • Dashboard de Pesquisa
                </Typography>
              </Stack>
              
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 900, 
                  mb: 1, 
                  letterSpacing: '-1px',
                  fontSize: { xs: '2rem', md: '3rem' },
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                Olá, {user?.username || 'Pesquisador'}
              </Typography>
              
              <Typography 
                variant="h6" 
                sx={{ 
                  opacity: 0.95, 
                  fontWeight: 400, 
                  maxWidth: 700,
                  lineHeight: 1.4,
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: { xs: '1rem', md: '1.25rem' }
                }}
              >
                Sua central de inteligência científica. Gerencie seus dados, automatize sua curadoria e acelere suas descobertas.
              </Typography>
            </Box>
          </Fade>
        </Container>
      </Box>

      {/* Main Content - Grid Section */}
      <Container maxWidth="lg" sx={{ mt: { xs: -6, md: -8 }, pb: 8, position: 'relative', zIndex: 10 }}>
        <Grid container spacing={3}>
          {menuItems.map((item, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Fade in timeout={800 + (index * 100)}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <CardActionArea 
                    onClick={() => navigate(item.path)}
                    sx={{ p: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                  >
                    <CardContent sx={{ flexGrow: 1, width: '100%', pt: 3 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: `${item.color}15`, 
                          color: item.color,
                          width: 64, 
                          height: 64, 
                          mb: 3,
                          border: '1px solid',
                          borderColor: `${item.color}30`,
                          boxShadow: `0 4px 12px ${item.color}20`
                        }}
                      >
                        {item.icon}
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, color: 'text.primary', lineHeight: 1.2 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, fontWeight: 500 }}>
                        {item.description}
                      </Typography>
                    </CardContent>
                    <Box sx={{ p: 2, width: '100%', display: 'flex', justifyContent: 'flex-end', opacity: 0.2 }}>
                      <HubIcon />
                    </Box>
                  </CardActionArea>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>
        
        {/* Productivity Section */}
        <Box sx={{ mt: 6 }}>
          <Fade in timeout={1500}>
            <Paper 
              elevation={0}
              sx={{ 
                p: { xs: 3, md: 5 }, 
                borderRadius: 4, 
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
              }}
            >
              <Grid container spacing={4} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Stack spacing={2}>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 8, height: 24, bgcolor: 'secondary.main', borderRadius: 4 }} />
                      Dica de Produtividade
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.7, maxWidth: 600, fontWeight: 500 }}>
                      Utilize a <strong>Inserção Manual</strong> para adicionar artigos que não foram encontrados nas buscas automáticas. Você pode anexar o PDF diretamente e nossa IA extrairá os metadados para você.
                    </Typography>
                    <Box sx={{ pt: 1 }}>
                      <Button 
                        variant="contained" 
                        size="large" 
                        color="primary"
                        onClick={() => navigate('/manual-insert')}
                        sx={{ borderRadius: '50px', px: 4, fontWeight: 800 }}
                      >
                        Experimentar Agora
                      </Button>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
                  <Box 
                    component="img" 
                    src="https://img.icons8.com/bubbles/200/idea.png" 
                    sx={{ width: 180, filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.1))' }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Fade>
        </Box>
      </Container>
    </Box>
  );
}

export default HomePage;
