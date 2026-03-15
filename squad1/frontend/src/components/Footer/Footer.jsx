import React from "react";
import { Box, Container, Stack, Typography, Avatar, useTheme, Divider } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ScienceIcon from "@mui/icons-material/Science";

const Footer = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box 
      component="footer" 
      sx={{ 
        py: 6, 
        mt: 'auto', 
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={4}>
            <Stack 
              direction="row" 
              spacing={2} 
              alignItems="center" 
              justifyContent={{ xs: 'center', md: 'flex-start' }}
            >
              <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, boxShadow: 2 }}>
                <ScienceIcon sx={{ fontSize: 22 }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1, mb: 0.5 }}>
                  SB100
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                  CIENTOMETRIA AVANÇADA
                </Typography>
              </Box>
            </Stack>
          </Grid>

          <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              © {new Date().getFullYear()} Plataforma Acadêmica de Curadoria.
              <br />
              Todos os direitos reservados.
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Stack 
              direction="row" 
              spacing={4} 
              justifyContent={{ xs: 'center', md: 'flex-end' }}
              sx={{ mt: { xs: 2, md: 0 } }}
            >
              {['Sobre', 'Termos', 'Suporte'].map((item) => (
                <Typography 
                  key={item}
                  variant="body2" 
                  sx={{ 
                    fontWeight: 700, 
                    cursor: "pointer", 
                    transition: '0.2s',
                    '&:hover': { color: 'primary.main', transform: 'translateY(-2px)' } 
                  }} 
                  onClick={() => navigate(`/${item.toLowerCase()}`)}
                >
                  {item}
                </Typography>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

// Importação do Grid que faltava no escopo anterior
import { Grid } from "@mui/material";

export default Footer;
