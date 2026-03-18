import React from "react";
import {
  Container,
  Box,
  Typography,
  Grid,
  Paper,
  Stack,
  Avatar,
  Divider,
  Button,
  useTheme,
  Fade
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ScienceIcon from "@mui/icons-material/Science";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import StorageIcon from "@mui/icons-material/Storage";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useAuth } from "../../hooks/useAuth";

const AboutPage = () => {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();

  const values = [
    {
      icon: <ScienceIcon fontSize="large" />,
      title: "Rigor Científico",
      description: "Nossa plataforma é construída sobre os pilares da metodologia acadêmica, garantindo que cada dado processado mantenha sua integridade e origem.",
      color: theme.palette.primary.main
    },
    {
      icon: <AutoFixHighIcon fontSize="large" />,
      title: "Inovação com IA",
      description: "Utilizamos os modelos de linguagem mais avançados para auxiliar pesquisadores na triagem e extração de informações técnicas complexas.",
      color: theme.palette.secondary.main
    },
    {
      icon: <StorageIcon fontSize="large" />,
      title: "Transparência",
      description: "Todo o processo de curadoria, desde a busca inicial até a aprovação final, é rastreável e auditável por especialistas humanos.",
      color: "#2e7d32"
    }
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: 'flex', flexDirection: 'column' }}>
      
      
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: "primary.main",
          color: "white",
          pt: { xs: 8, md: 12 },
          pb: { xs: 10, md: 15 },
          position: "relative",
          overflow: "hidden",
          textAlign: "center"
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 300,
            height: 300,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.05)",
          }}
        />
        <Container maxWidth="md">
          <Fade in timeout={800}>
            <Box>
              <Button
                component={RouterLink}
                to={isAuthenticated ? "/home" : "/"}
                startIcon={<ArrowBackIcon />}
                sx={{ 
                  color: "white", 
                  bgcolor: "rgba(255,255,255,0.1)",
                  borderRadius: "50px",
                  px: 3,
                  mb: 6,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.2)" }
                }}
              >
                Voltar ao Início
              </Button>
              
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: "2.5rem", md: "4.5rem" },
                  mb: 3,
                  letterSpacing: "-0.04em",
                  lineHeight: 1
                }}
              >
                Sobre a <Box component="span" sx={{ color: "secondary.main" }}>Plataforma</Box>
              </Typography>
              
              <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400, mx: "auto", maxWidth: "700px", lineHeight: 1.6 }}>
                O SB100 é uma iniciativa de vanguarda que une inteligência artificial e curadoria humana para acelerar a pesquisa científica em solos, citros e cana-de-açúcar.
              </Typography>
            </Box>
          </Fade>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 12, mt: -6 }}>
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: { xs: 4, md: 6 }, height: '100%', borderRadius: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.04)' }}>
              <Typography variant="h4" sx={{ fontWeight: 900, mb: 4, color: 'primary.main' }}>Nossa Missão</Typography>
              <Typography variant="body1" paragraph sx={{ color: "text.secondary", fontSize: "1.15rem", lineHeight: 1.8 }}>
                Nascemos da necessidade de lidar com o volume exponencial de publicações científicas. Nossa missão é fornecer ferramentas que transformem dados brutos em conhecimento acionável, permitindo que pesquisadores foquem no que realmente importa: a descoberta científica.
              </Typography>
              <Typography variant="body1" sx={{ color: "text.secondary", fontSize: "1.15rem", lineHeight: 1.8 }}>
                Através da automatização de processos repetitivos, como a extração de metadados e a triagem inicial, reduzimos o tempo de revisão sistemática drasticamente, mantendo o rigor acadêmico.
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: { xs: 4, md: 6 }, height: '100%', borderRadius: 8, bgcolor: 'grey.900', color: 'white' }}>
              <Typography variant="h4" sx={{ fontWeight: 900, mb: 4, color: 'secondary.main' }}>Como Funcionamos</Typography>
              <Stack spacing={4}>
                <Stack direction="row" spacing={3} alignItems="flex-start">
                  <Avatar sx={{ bgcolor: 'secondary.main', color: 'black', fontWeight: 900 }}>1</Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Coleta Inteligente</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>Integração com APIs globais como OpenAlex e CrossRef.</Typography>
                  </Box>
                </Stack>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <Stack direction="row" spacing={3} alignItems="flex-start">
                  <Avatar sx={{ bgcolor: 'secondary.main', color: 'black', fontWeight: 900 }}>2</Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Processamento por IA</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>Análise profunda via LLMs para extração de variáveis técnicas.</Typography>
                  </Box>
                </Stack>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <Stack direction="row" spacing={3} alignItems="flex-start">
                  <Avatar sx={{ bgcolor: 'secondary.main', color: 'black', fontWeight: 900 }}>3</Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Curadoria Humana</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>Validação final por especialistas para garantir a qualidade total.</Typography>
                  </Box>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ mt: 15 }}>
          <Box sx={{ textAlign: "center", mb: 10 }}>
            <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: 3 }}>FILOSOFIA</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900, mt: 1 }}>Nossos Pilares</Typography>
          </Box>
          <Grid container spacing={4}>
            {values.map((value, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Paper sx={{ 
                  p: 6, 
                  height: '100%', 
                  borderRadius: 8, 
                  textAlign: "center", 
                  transition: '0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
                  '&:hover': { transform: 'translateY(-12px)', boxShadow: 6 } 
                }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: `${value.color}15`,
                      color: value.color,
                      mb: 4,
                      mx: "auto",
                      border: '1px solid',
                      borderColor: `${value.color}30`
                    }}
                  >
                    {value.icon}
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 900, mb: 2 }}>
                    {value.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.8, fontSize: '1rem' }}>
                    {value.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>

      {/* Footer-like CTA */}
      <Box sx={{ py: 12, bgcolor: 'primary.dark', color: 'white', textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ fontWeight: 900, mb: 4 }}>Pronto para acelerar sua pesquisa?</Typography>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            color="secondary"
            size="large"
            sx={{ px: 8, py: 2, borderRadius: "50px", fontWeight: 900, fontSize: '1.1rem', boxShadow: 4 }}
          >
            Acessar Plataforma Agora
          </Button>
        </Container>
      </Box>

      
    </Box>
  );
};

export default AboutPage;
