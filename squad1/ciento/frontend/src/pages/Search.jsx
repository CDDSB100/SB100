import { useState } from 'react';
import { Container, Box, Snackbar, Alert, Typography, IconButton, Stack, Fade } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Header from '../components/Header';
import SearchForm from '../components/SearchForm';
import ResultsTable from '../components/ResultsTable';
import { searchArticles, saveArticles } from '../api';

function SearchPage() {
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleSearch = async (searchParams) => {
    setSearchLoading(true);
    setSnackbar({ open: false, message: '', severity: 'success' });
    try {
      const response = await searchArticles(searchParams);
      setResults(response);
      if (response.length === 0) {
        setSnackbar({ open: true, message: 'Nenhum resultado encontrado.', severity: 'info' });
      }
    } catch (error) {
      console.error('Error searching:', error);
      setSnackbar({ open: true, message: 'Erro ao buscar resultados.', severity: 'error' });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSave = async (selectedRows) => {
    setSaveLoading(true);
    setSnackbar({ open: false, message: '', severity: 'success' });
    try {
      await saveArticles(selectedRows);
      setSnackbar({ open: true, message: 'Dados salvos com sucesso na planilha!', severity: 'success' });
    } catch (error) {
      console.error('Error saving:', error);
      setSnackbar({ open: true, message: 'Erro ao salvar dados.', severity: 'error' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
      <Header />
      
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 4, md: 6 }, mb: 4 }}>
        <Container maxWidth="lg">
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton component={RouterLink} to="/home" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '3rem' }, color: 'white' }}>Busca de Artigos</Typography>
              <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 400, color: 'white' }}>Pesquisa avançada em bases globais como OpenAlex</Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <SearchForm onSearch={handleSearch} loading={searchLoading} />
        
        {results.length > 0 && (
          <Fade in timeout={500}>
            <Box mt={4}>
              <ResultsTable results={results} onSave={handleSave} loading={saveLoading} />
            </Box>
          </Fade>
        )}
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%', borderRadius: 2, fontWeight: 700 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default SearchPage;
