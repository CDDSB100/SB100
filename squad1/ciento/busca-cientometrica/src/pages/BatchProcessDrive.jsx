import { useState, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Header from '../components/Header';
import { batchUploadZip } from '../api';

function BatchProcessDrivePage() {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleZipUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setSnackbar({ open: true, message: 'Por favor, envie um arquivo compactado (.zip).', severity: 'error' });
      return;
    }

    setFileName(file.name);
    setLoading(true);
    setSnackbar({ open: true, message: "Enviando e processando ZIP... Isso pode levar alguns minutos dependendo da quantidade de arquivos.", severity: "info" });
    
    try {
      const response = await batchUploadZip(file);
      setSnackbar({ open: true, message: response.message || 'Processamento concluído com sucesso!', severity: "success" });
    } catch (err) {
      console.error('Error uploading ZIP:', err);
      setSnackbar({ open: true, message: "Erro: " + (err.response?.data?.error || err.message), severity: "error" });
    } finally {
      setLoading(false);
      // Reset input para permitir selecionar o mesmo arquivo novamente se necessário
      event.target.value = null;
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 10 }}>
      <Header />
      
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 4, md: 8 }, mb: 4, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
        <Container maxWidth="lg">
          <Grid container alignItems="center" spacing={3}>
            <Grid item xs={12}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <IconButton component={RouterLink} to="/home" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '3rem' }, color: 'white' }}>Processamento em Lote</Typography>
              </Stack>
              <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 400 }}>Suba múltiplos artigos de uma vez através de um arquivo compactado (.zip).</Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="md">
        <Paper elevation={0} sx={{ p: 6, borderRadius: 4, textAlign: 'center', border: '2px dashed', borderColor: loading ? 'primary.main' : 'divider', bgcolor: 'white' }}>
          <Box sx={{ mb: 4 }}>
            <CloudUploadIcon sx={{ fontSize: 80, color: loading ? 'primary.main' : 'text.disabled', mb: 2, transition: '0.3s' }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Faça o upload da sua biblioteca</Typography>
            <Typography variant="body1" color="text.secondary">
              O sistema irá descompactar o arquivo, extrair metadados via LLM local (Ollama) e categorizar cada artigo automaticamente.
            </Typography>
          </Box>

          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <Button
              component="label"
              variant="contained"
              size="large"
              startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <CloudUploadIcon />}
              disabled={loading}
              sx={{ borderRadius: '50px', px: 6, py: 2, fontSize: '1.1rem', fontWeight: 800, boxShadow: 4 }}
            >
              {loading ? 'Processando Arquivos...' : 'Selecionar Arquivo .ZIP'}
              <input type="file" hidden accept=".zip" onChange={handleZipUpload} />
            </Button>
            {loading && (
              <CircularProgress
                size={68}
                sx={{
                  color: 'primary.main',
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  zIndex: 1,
                }}
              />
            )}
          </Box>

          {fileName && !loading && (
            <Box sx={{ mt: 4, p: 2, bgcolor: 'success.light', borderRadius: 2, display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleOutlineIcon color="success" />
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.dark' }}>
                Último arquivo processado: {fileName}
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 6, textAlign: 'left', p: 4, bgcolor: 'grey.50', borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: 'primary.main' }}>Como funciona:</Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>1.</Typography>
                <Typography variant="body2">Prepare um arquivo <b>.zip</b> contendo todos os seus artigos em formato PDF.</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>2.</Typography>
                <Typography variant="body2">A LLM local analisará cada documento para extrair título, autores, ano, DOI e outras informações relevantes.</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>3.</Typography>
                <Typography variant="body2">Cada artigo será categorizado automaticamente entre SOLOS ou CITROS E CANA.</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>4.</Typography>
                <Typography variant="body2">Ao final, todos os dados estarão disponíveis na página de Curadoria para sua revisão manual.</Typography>
              </Box>
            </Stack>
          </Box>
        </Paper>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={8000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: "100%", borderRadius: 3, fontWeight: 700 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// Adicionando Grid que faltou na importação
import { Grid } from '@mui/material';

export default BatchProcessDrivePage;