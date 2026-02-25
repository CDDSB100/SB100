import { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderIcon from '@mui/icons-material/Folder';
import Header from '../components/Header';
import { processLocalFolder } from '../api';

function BatchProcessDrivePage() {
  const [folderPath, setFolderPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleProcess = async () => {
    if (!folderPath.trim()) {
      setSnackbar({ open: true, message: 'Digite o caminho da pasta.', severity: 'error' });
      return;
    }

    setLoading(true);
    setSnackbar({ open: false, message: '', severity: 'success' });

    try {
      const response = await processLocalFolder(folderPath.trim());
      setSnackbar({ open: true, message: response.message || 'Processamento em lote concluído!', severity: 'success' });
      console.log(response);
    } catch (error) {
      console.error('Error processing local folder:', error);
      setSnackbar({ open: true, message: 'Erro ao processar pasta local.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ open: false, message: '', severity: 'success' });
  };

  return (
    <>
      <Header />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} sx={{ mr: 2 }}>
            Voltar
          </Button>
          <Typography variant="h4" component="h1">
            Processamento em Lote de Pasta Local
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="body1" gutterBottom>
            Insira o caminho da pasta local (relativo à raiz do projeto ou caminho absoluto) para processar todos os arquivos PDF em lote.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <TextField
              label="Caminho da Pasta"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              fullWidth
              placeholder="Ex: api-cientometria/temp_uploads"
            />
            <Button
              variant="contained"
              onClick={handleProcess}
              disabled={loading || !folderPath.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <FolderIcon />}
            >
              {loading ? 'Processando...' : 'Processar'}
            </Button>
          </Box>
        </Paper>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
}

export default BatchProcessDrivePage;