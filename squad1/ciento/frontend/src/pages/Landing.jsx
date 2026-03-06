import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  Box,
  Button,
  Typography,
  Container,
  Grid,
  Stack,
  useTheme,
  useMediaQuery,
  Paper,
  Avatar,
  Fade,
  IconButton,
  Chip,
  Divider
} from "@mui/material";
import ScienceIcon from "@mui/icons-material/Science";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import SearchIcon from "@mui/icons-material/Search";
import StorageIcon from "@mui/icons-material/Storage";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SchoolIcon from "@mui/icons-material/School";
import "./Landing.css";

const LandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { isAuthenticated } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home");
    }
  }, [isAuthenticated, navigate]);

  const features = [
    {
      icon: <SearchIcon fontSize="large" />,
      title: "Busca Inteligente",
      description:
        "Varredura automatizada em bases como OpenAlex, garantindo que você nunca perca um artigo relevante.",
      color: theme.palette.primary.main
    },
    {
      icon: <AutoFixHighIcon fontSize="large" />,
      title: "IA Especializada",
      description:
        "Modelos de linguagem treinados para extrair metadados técnicos e validar critérios acadêmicos com precisão.",
      color: theme.palette.secondary.main
    },
    {
      icon: <StorageIcon fontSize="large" />,
      title: "Gestão de Dados",
      description:
        "Organização sistemática em nuvem, permitindo que sua equipe foque na análise e não na burocracia.",
      color: "#2e7d32"
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "white", overflowX: "hidden" }}>
      {/* Hero Section */}
      <Box
        sx={{
          pt: { xs: 8, md: 15 },
          pb: { xs: 8, md: 20 },
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          position: "relative",
          color: 'white'
        }}
      >
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid
              item
              xs={12}
              md={7}
              sx={{ textAlign: { xs: "center", md: "left" }, zIndex: 2 }}
            >
              <Fade in timeout={1000}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'center', md: 'flex-start' }} sx={{ mb: 3 }}>
                    <Chip 
                      label="BETA 2.0" 
                      sx={{ bgcolor: 'secondary.main', color: 'black', fontWeight: 900, borderRadius: 1 }} 
                    />
                    <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 2, opacity: 0.8 }}>
                      SISTEMA DE PESQUISA AVANÇADA
                    </Typography>
                  </Stack>
                  
                  <Typography
                    variant="h1"
                    sx={{
                      fontWeight: 900,
                      color: "white",
                      fontSize: { xs: "2.8rem", sm: "4rem", md: "5rem" },
                      lineHeight: 1.1,
                      mb: 3,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    A inteligência que <br />
                    sua <Box component="span" sx={{ color: "secondary.main" }}>pesquisa</Box> merece.
                  </Typography>
                  
                  <Typography
                    variant="h5"
                    sx={{
                      mb: 6,
                      color: "rgba(255,255,255,0.85)",
                      fontWeight: 400,
                      fontSize: { xs: "1.1rem", md: "1.3rem" },
                      maxWidth: "600px",
                      lineHeight: 1.6,
                      mx: { xs: "auto", md: 0 },
                    }}
                  >
                    Acelere sua revisão sistemática. Automatize a extração de dados e a curadoria científica com o poder dos modelos de linguagem de última geração.
                  </Typography>
                  
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={3}
                    justifyContent={{ xs: "center", md: "flex-start" }}
                  >
                    <Button
                      variant="contained"
                      size="large"
                      color="secondary"
                      onClick={() => navigate("/login")}
                      sx={{
                        py: 2,
                        px: 6,
                        borderRadius: "50px",
                        fontWeight: 900,
                        fontSize: "1.1rem",
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 15px 40px rgba(0,0,0,0.4)' }
                      }}
                    >
                      Acessar Plataforma
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => document.getElementById("features").scrollIntoView({ behavior: "smooth" })}
                      sx={{
                        color: "white",
                        borderColor: 'rgba(255,255,255,0.3)',
                        py: 2,
                        px: 4,
                        borderRadius: "50px",
                        fontWeight: 700,
                        '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                      }}
                    >
                      Saber Mais
                    </Button>
                  </Stack>
                </Box>
              </Fade>
            </Grid>
            
            <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', zIndex: 2 }}>
              <Fade in timeout={1500}>
                <Paper sx={{ p: 4, borderRadius: 8, bgcolor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: -20, right: -20, bgcolor: 'secondary.main', p: 2, borderRadius: 4, boxShadow: 4 }}>
                    <SchoolIcon sx={{ color: 'black' }} />
                  </Box>
                  <Stack spacing={3}>
                    <Box sx={{ width: 300, height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.2)' }} />
                    <Box sx={{ width: 250, height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.1)' }} />
                    <Box sx={{ width: 280, height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.15)' }} />
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                    <Stack direction="row" spacing={2}>
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 40, height: 40 }} />
                      <Box>
                        <Box sx={{ width: 100, height: 8, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.2)', mb: 1 }} />
                        <Box sx={{ width: 60, height: 8, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.1)' }} />
                      </Box>
                    </Stack>
                  </Stack>
                </Paper>
              </Fade>
            </Grid>
          </Grid>
        </Container>
        
        <Box sx={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', opacity: 0.5, animation: 'bounce 2s infinite' }}>
          <KeyboardArrowDownIcon sx={{ fontSize: 40 }} />
        </Box>
      </Box>

      {/* Features Section */}
      <Container id="features" maxWidth="lg" sx={{ py: { xs: 10, md: 15 } }}>
        <Box sx={{ textAlign: "center", mb: 10 }}>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 900, letterSpacing: 2 }}>POTENCIALIDADE</Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, mt: 1, letterSpacing: "-0.02em" }}>
            Produtividade científica elevada a um novo nível.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Paper sx={{ p: 5, height: '100%', borderRadius: 6, transition: '0.3s', '&:hover': { transform: 'translateY(-10px)' } }}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: `${feature.color}15`,
                    color: feature.color,
                    mb: 4,
                    border: '1px solid',
                    borderColor: `${feature.color}30`
                  }}
                >
                  {feature.icon}
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
                  {feature.title}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: "text.secondary",
                    lineHeight: 1.7,
                  }}
                >
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box sx={{ py: 15, bgcolor: 'grey.50' }}>
        <Container maxWidth="md">
          <Paper sx={{ p: { xs: 4, md: 8 }, borderRadius: 8, bgcolor: 'primary.main', color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
            <Typography variant="h3" sx={{ fontWeight: 900, mb: 3 }}>
              Inicie sua jornada hoje.
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.8, mb: 5, fontWeight: 400 }}>
              Junte-se à elite da pesquisa acadêmica e transforme sua produção científica com tecnologia de ponta.
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              onClick={() => navigate("/login")}
              sx={{
                py: 2,
                px: 8,
                borderRadius: "50px",
                fontWeight: 900,
                fontSize: "1.2rem",
                boxShadow: 4
              }}
            >
              Começar Agora
            </Button>
          </Paper>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 8, borderTop: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={4}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                <ScienceIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Busca Cientométrica
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} Plataforma Acadêmica de Curadoria. Todos os direitos reservados.
            </Typography>
            <Stack direction="row" spacing={3}>
              <Typography variant="body2" sx={{ fontWeight: 700, cursor: "pointer" }}>Sobre</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, cursor: "pointer" }}>Termos</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, cursor: "pointer" }}>Suporte</Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
