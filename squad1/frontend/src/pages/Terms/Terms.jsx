import React from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Fade
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import GavelIcon from "@mui/icons-material/Gavel";
import { useAuth } from "../../hooks/useAuth";

const TermsPage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: 'flex', flexDirection: 'column' }}>
      

      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: "primary.dark",
          color: "white",
          py: { xs: 8, md: 12 },
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
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <GavelIcon sx={{ fontSize: 60, color: 'secondary.main' }} />
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: "2.5rem", md: "4rem" },
                    letterSpacing: "-0.02em"
                  }}
                >
                  Termos de Uso
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.7, fontWeight: 400 }}>
                  Transparência e responsabilidade na pesquisa científica.
                  <br />
                  Última atualização: 12 de Março de 2026
                </Typography>
              </Box>
            </Box>
          </Fade>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 10, mt: -8 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 4, md: 8 }, 
            borderRadius: 8, 
            boxShadow: '0 30px 60px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Stack spacing={6}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 4, height: 24, bgcolor: 'primary.main', borderRadius: 2 }} />
                1. Aceitação dos Termos
              </Typography>
              <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.8, fontSize: '1.1rem' }}>
                Ao acessar e utilizar a Plataforma SB100, você concorda expressamente em cumprir e estar vinculado a estes Termos de Uso. Este sistema é destinado exclusivamente para fins de pesquisa acadêmica e científica.
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 4, height: 24, bgcolor: 'primary.main', borderRadius: 2 }} />
                2. Propriedade Intelectual
              </Typography>
              <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.8, fontSize: '1.1rem' }}>
                Todo o conteúdo processado pela plataforma, incluindo metadados extraídos e algoritmos de IA, são de propriedade intelectual da instituição mantenedora. Os artigos originais (PDFs) permanecem sob os direitos autorais de seus respectivos editores e autores originais.
              </Typography>
            </Box>

            <Box sx={{ bgcolor: 'grey.50', p: 4, borderRadius: 4, borderLeft: '6px solid', borderColor: 'secondary.main' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Responsabilidades do Usuário</Typography>
              <List>
                {[
                  { t: "Sigilo", d: "Manter a confidencialidade de sua senha e conta." },
                  { t: "Uso Ético", d: "Proibido scraping ou extração massiva não autorizada." },
                  { t: "Precisão", d: "Curadores devem validar dados com rigor científico." }
                ].map((item, i) => (
                  <ListItem key={i} disableGutters>
                    <ListItemText 
                      primaryTypographyProps={{ fontWeight: 700 }}
                      primary={item.t} 
                      secondary={item.d} 
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ width: 4, height: 24, bgcolor: 'primary.main', borderRadius: 2 }} />
                3. Privacidade e LGPD
              </Typography>
              <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.8, fontSize: '1.1rem' }}>
                Em conformidade com a Lei Geral de Proteção de Dados (LGPD), informamos que coletamos apenas os dados necessários para a autenticação e atribuição de atividades de curadoria. Suas ações no sistema são registradas para fins de auditoria científica.
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center', pt: 4 }}>
              <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                Para questões jurídicas específicas, contate: juridico@cientometria.com
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Container>
      
      
    </Box>
  );
};

export default TermsPage;
