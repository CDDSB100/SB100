import React from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  IconButton,
  Avatar,
  Button,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import StorageIcon from "@mui/icons-material/Storage";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PersonIcon from "@mui/icons-material/Person";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ScienceIcon from "@mui/icons-material/Science";
import InfoIcon from "@mui/icons-material/Info";

const HelpPage = () => {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 10 }}>
      

      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: "primary.main",
          color: "white",
          py: { xs: 4, md: 8 },
          mb: 4,
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
        <Container maxWidth="lg">
          <Grid container alignItems="center" spacing={3}>
            <Grid item xs={12} md={8}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <IconButton
                  component={RouterLink}
                  to="/home"
                  sx={{
                    color: "white",
                    bgcolor: "rgba(255,255,255,0.1)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                  }}
                >
                  <ArrowBackIcon />
                </IconButton>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: "2rem", md: "3rem" },
                    color: "white",
                  }}
                >
                  Manual de Ajuda
                </Typography>
              </Stack>
              <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 400 }}>
                Guia completo para pesquisadores e curadores da plataforma SB100.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: "right", display: { xs: 'none', md: 'block' } }}>
              <MenuBookIcon sx={{ fontSize: 120, opacity: 0.2 }} />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <InfoIcon color="primary" /> Fluxo de Trabalho
            </Typography>

            <Accordion defaultExpanded sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
              <AccordionSummary expandMoreIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>1</Avatar>
                  <Typography sx={{ fontWeight: 700 }}>Busca e Identificação</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" paragraph>
                  O primeiro passo é utilizar a tela de <strong>Busca</strong> para encontrar artigos relevantes na base OpenAlex.
                </Typography>
                <List size="small">
                  <ListItem>
                    <ListItemIcon><SearchIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Utilize termos técnicos em inglês e português para melhores resultados." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><InfoIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Filtre por ano para focar em evidências recentes." />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
              <AccordionSummary expandMoreIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>2</Avatar>
                  <Typography sx={{ fontWeight: 700 }}>Inserção na Base de Dados</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" paragraph>
                  Após encontrar os artigos, você deve salvá-los para que entrem na fila de curadoria.
                </Typography>
                <List size="small">
                  <ListItem>
                    <ListItemIcon><CheckCircleIcon fontSize="small" color="success" /></ListItemIcon>
                    <ListItemText primary="Selecione os artigos desejados na tabela de resultados e clique em 'Salvar Selecionados'." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CloudUploadIcon fontSize="small" color="info" /></ListItemIcon>
                    <ListItemText primary="Caso tenha o arquivo PDF localmente, você pode usar a 'Inserção Manual' ou 'Subir ZIP' na tela de curadoria." />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
              <AccordionSummary expandMoreIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>3</Avatar>
                  <Typography sx={{ fontWeight: 700 }}>Curadoria e Validação</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" paragraph>
                  Esta é a fase mais importante, onde a inteligência artificial e o olhar humano se unem.
                </Typography>
                <List size="small">
                  <ListItem>
                    <ListItemIcon><AutoFixHighIcon fontSize="small" color="secondary" /></ListItemIcon>
                    <ListItemText primary="Curadoria por IA: O sistema extrai metadados e sugere aprovação/rejeição baseada no conteúdo do PDF." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircleIcon fontSize="small" color="success" /></ListItemIcon>
                    <ListItemText primary="Validação Manual: Curadores revisam a sugestão da IA e dão o veredito final (Aprovar ou Rejeitar) com um feedback obrigatório." />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Typography variant="h5" sx={{ fontWeight: 800, mt: 6, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <HelpOutlineIcon color="primary" /> Perguntas Frequentes (FAQ)
            </Typography>

            <Accordion sx={{ mb: 1 }}>
              <AccordionSummary expandMoreIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 600 }}>O que acontece quando rejeito um artigo?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  O artigo é movido para uma pasta de 'reprovados' no servidor e seu registro na planilha é atualizado. O arquivo PDF é mantido para fins de histórico, mas não será exibido como evidência científica aprovada.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mb: 1 }}>
              <AccordionSummary expandMoreIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 600 }}>Por que o feedback é obrigatório na aprovação manual?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  O feedback serve como uma justificativa científica do porquê aquele artigo é ou não relevante para o Boletim 100. Isso cria uma trilha de auditoria e ajuda outros pesquisadores a entenderem o critério utilizado.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mb: 1 }}>
              <AccordionSummary expandMoreIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 600 }}>Como funciona o processamento de ZIP?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  Você pode compactar dezenas de PDFs em um único arquivo .zip e enviá-lo. O sistema irá descompactar, identificar cada artigo, extrair metadados via IA e categorizá-los automaticamente entre 'Solos' ou 'Citros e Cana'.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Perfis de Acesso</Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" /> Administrador
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Gestão de usuários, alteração de permissões e visão total da base de dados.
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'secondary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScienceIcon fontSize="small" /> Pesquisador (Cientometria)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Busca artigos, insere na base e inicia o processamento por IA.
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon fontSize="small" /> Curador Especialista
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Valida os dados extraídos pela IA e decide a aprovação final dentro de sua área técnica (Solos ou Citros/Cana).
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            <Paper sx={{ p: 3, mt: 3, borderRadius: 4, bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Precisa de mais ajuda?</Typography>
              <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
                Se encontrar problemas técnicos ou erros no sistema, entre em contato com o suporte técnico.
              </Typography>
              <Button 
                variant="contained" 
                color="secondary" 
                fullWidth 
                sx={{ borderRadius: '50px', fontWeight: 700 }}
                href="mailto:suporte@cientometria.com"
              >
                Contatar Suporte
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default HelpPage;
