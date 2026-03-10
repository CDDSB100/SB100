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
import UploadIcon from '@mui/icons-material/Upload';
import Header from '../components/Header';
import { extractMetadata } from '../api';

function ExtractMetadataPage() {
  const [file, setFile] = useState(null);
  const [extractionData, setExtractionData] = useState({
    title: '',
    authors: '',
    abstract: '',
    keywords: '',
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
  };

  const handleInputChange = (field) => (event) => {
    setExtractionData({ ...extractionData, [field]: event.target.value });
  };

  const handleExtract = async () => {
    if (!file) {
      setSnackbar({ open: true, message: 'Selecione um arquivo.', severity: 'error' });
      return;
    }

    setLoading(true);
    setSnackbar({ open: false, message: '', severity: 'success' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      Object.keys(extractionData).forEach(key => {
        if (extractionData[key]) formData.append(key, extractionData[key]);
      });

      const response = await extractMetadata(formData);
      setSnackbar({ open: true, message: 'Metadados extraídos com sucesso!', severity: 'success' });
      // Optionally, display the extracted data
      console.log(response);
    } catch (error) {
      console.error('Error extracting metadata:', error);
      setSnackbar({ open: true, message: 'Erro ao extrair metadados.', severity: 'error' });
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
            Extrair Metadados
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Upload de Arquivo
          </Typography>
          <Box sx={{ mb: 3 }}>
            <input
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload">
              <Button variant="outlined" component="span" startIcon={<UploadIcon />}>
                Selecionar Arquivo
              </Button>
            </label>
            {file && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Arquivo selecionado: {file.name}
              </Typography>
            )}
          </Box>

          <Typography variant="h6" gutterBottom>
            Dados Opcionais (para auxiliar na extração)
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <TextField
              label="Título"
              value={extractionData.title}
              onChange={handleInputChange('title')}
              fullWidth
            />
            <TextField
              label="Autores"
              value={extractionData.authors}
              onChange={handleInputChange('authors')}
              fullWidth
            />
            <TextField
              label="Resumo"
              value={extractionData.abstract}
              onChange={handleInputChange('abstract')}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Palavras-chave"
              value={extractionData.keywords}
              onChange={handleInputChange('keywords')}
              fullWidth
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={handleExtract}
              disabled={loading || !file}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Extraindo...' : 'Extrair Metadados'}
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

export default ExtractMetadataPage;