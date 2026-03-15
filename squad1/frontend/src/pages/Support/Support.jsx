import React from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Button,
  TextField,
  MenuItem,
  useTheme,
  Avatar,
  Fade
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import EmailIcon from "@mui/icons-material/Email";
import HelpCenterIcon from "@mui/icons-material/HelpCenter";
import BugReportIcon from "@mui/icons-material/BugReport";
import { useAuth } from "../../hooks/useAuth";

const SupportPage = () => {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();

  const supportOptions = [
    {
      icon: <EmailIcon />,
      title: "E-mail Direto",
      description: "suporte@cientometria.com",
      action: "Enviar E-mail",
      link: "mailto:suporte@cientometria.com",
      color: theme.palette.primary.main
    },
    {
      icon: <HelpCenterIcon />,
      title: "Central de Ajuda",
      description: "Manuais e tutoriais passo a passo.",
      action: "Ver Manuais",
      link: "/help",
      color: theme.palette.secondary.main
    },
    {
      icon: <BugReportIcon />,
      title: "Relatar Bug",
      description: "Encontrou um erro técnico no sistema?",
      action: "Abrir Ticket",
      link: "mailto:devs@cientometria.com?subject=Relato de Bug - SB100",
      color: "#d32f2f"
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
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 200,
            height: 200,
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
                  mb: 4,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.2)" }
                }}
              >
                Voltar
              </Button>
              <Stack direction="column" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'secondary.main', width: 80, height: 80, mb: 2, boxShadow: 4 }}>
                  <SupportAgentIcon sx={{ fontSize: 40, color: 'black' }} />
                </Avatar>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: "2.5rem", md: "4rem" },
                    letterSpacing: "-0.02em"
                  }}
                >
                  Suporte Técnico
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 400, maxWidth: 600, mx: 'auto' }}>
                  Nossa equipe de especialistas está pronta para ajudar você a superar qualquer obstáculo técnico.
                </Typography>
              </Stack>
            </Box>
          </Fade>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 10, mt: -8 }}>
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: { xs: 4, md: 6 }, borderRadius: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
              <Typography variant="h5" sx={{ fontWeight: 900, mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 8, height: 32, bgcolor: 'primary.main', borderRadius: 4 }} />
                Abrir Chamado
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Seu Nome" variant="filled" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Seu E-mail" variant="filled" />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    select
                    label="Assunto do Contato"
                    defaultValue="duvida"
                    variant="filled"
                  >
                    <MenuItem value="duvida">Dúvida Técnica</MenuItem>
                    <MenuItem value="bug">Relato de Bug</MenuItem>
                    <MenuItem value="sugestao">Sugestão de Melhoria</MenuItem>
                    <MenuItem value="outro">Outro</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={5}
                    label="Descreva detalhadamente sua solicitação"
                    variant="filled"
                    placeholder="Quanto mais detalhes você fornecer, mais rápido poderemos ajudar."
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    sx={{ borderRadius: "12px", py: 2, fontWeight: 900, fontSize: '1.1rem', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
                  >
                    Enviar Solicitação de Suporte
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Stack spacing={3}>
              {supportOptions.map((option, index) => (
                <Paper key={index} sx={{ 
                  p: 4, 
                  borderRadius: 6, 
                  border: '1px solid', 
                  borderColor: 'divider',
                  transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                  '&:hover': { bgcolor: 'background.paper', boxShadow: 3, transform: 'scale(1.02)' } 
                }}>
                  <Stack direction="row" spacing={3} alignItems="center">
                    <Avatar sx={{ bgcolor: `${option.color}15`, color: option.color, width: 56, height: 56 }}>
                      {option.icon}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>{option.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{option.description}</Typography>
                      <Button 
                        component={option.link.startsWith('http') || option.link.startsWith('mailto') ? 'a' : RouterLink}
                        href={option.link.startsWith('http') || option.link.startsWith('mailto') ? option.link : undefined}
                        to={!option.link.startsWith('http') && !option.link.startsWith('mailto') ? option.link : undefined}
                        variant="text" 
                        size="small" 
                        sx={{ fontWeight: 800, p: 0, minWidth: 0 }}
                      >
                        {option.action} →
                      </Button>
                    </Box>
                  </Stack>
                </Paper>
              ))}
              
              <Box sx={{ 
                p: 4, 
                bgcolor: 'secondary.main', 
                borderRadius: 8, 
                color: 'black',
                textAlign: 'center',
                boxShadow: '0 15px 30px rgba(255, 215, 0, 0.2)'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>SLA de Atendimento</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, opacity: 0.9 }}>
                  Respostas garantidas em até <strong>24 horas úteis</strong> para chamados técnicos.
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>
      
      
    </Box>
  );
};

export default SupportPage;
