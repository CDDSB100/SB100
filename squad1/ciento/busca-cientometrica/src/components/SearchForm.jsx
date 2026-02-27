import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  TextField,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Stack,
  InputAdornment,
  Avatar,
  Fade
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SortIcon from '@mui/icons-material/Sort';

const SearchForm = ({ onSearch, loading }) => {
  const [searchTerms, setSearchTerms] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [sortOption, setSortOption] = useState('relevance');
  const [searchHistory, setSearchHistory] = useState(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  useEffect(() => {
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  const saveToHistory = (params) => {
    const newHistory = [params, ...searchHistory.filter(h => h.search_terms !== params.search_terms)].slice(0, 5);
    setSearchHistory(newHistory);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = {
      search_terms: searchTerms,
      start_year: startYear,
      end_year: endYear,
      sort_option: sortOption,
    };
    onSearch(params);
    saveToHistory(params);
  };

  const handleDateShortcut = (years) => {
    const currentYear = new Date().getFullYear();
    setEndYear(currentYear);
    setStartYear(currentYear - years);
  };

  const restoreHistory = (historyItem) => {
    setSearchTerms(historyItem.search_terms);
    setStartYear(historyItem.start_year);
    setEndYear(historyItem.end_year);
    setSortOption(historyItem.sort_option || 'relevance');
  };

  return (
    <Box>
      <Fade in timeout={500}>
        <Paper
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            mb: 4,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', bgcolor: 'primary.main' }} />
          
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
              <SearchIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Configurar Pesquisa
            </Typography>
          </Stack>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Expressão de Busca (OpenAlex)"
                placeholder="Ex: 'climate change' AND ('adaptation' OR 'mitigation')"
                variant="outlined"
                fullWidth
                multiline
                rows={2}
                value={searchTerms}
                onChange={(e) => setSearchTerms(e.target.value)}
                required
                InputProps={{
                  sx: { borderRadius: 3 }
                }}
                helperText="Combine termos usando AND, OR, NOT e parênteses."
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Ano Inicial"
                type="number"
                fullWidth
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start"><CalendarTodayIcon fontSize="small" /></InputAdornment>,
                  sx: { borderRadius: 3 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Ano Final"
                type="number"
                fullWidth
                value={endYear}
                onChange={(e) => setEndYear(e.target.value)}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start"><CalendarTodayIcon fontSize="small" /></InputAdornment>,
                  sx: { borderRadius: 3 }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
               <FormControl fullWidth>
                  <InputLabel>Ordenar por</InputLabel>
                  <Select
                    value={sortOption}
                    label="Ordenar por"
                    onChange={(e) => setSortOption(e.target.value)}
                    sx={{ borderRadius: 3 }}
                    startAdornment={<InputAdornment position="start" sx={{ ml: 1, mr: -0.5 }}><SortIcon fontSize="small" /></InputAdornment>}
                  >
                    <MenuItem value="relevance">Relevância</MenuItem>
                    <MenuItem value="newest">Mais Recentes</MenuItem>
                    <MenuItem value="cited">Mais Citados</MenuItem>
                  </Select>
               </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                sx={{ height: '56px', borderRadius: 3, fontWeight: 800, fontSize: '1.1rem' }}
              >
                {loading ? 'BUSCANDO...' : 'EXECUTAR'}
              </Button>
            </Grid>

            <Grid item xs={12}>
               <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                 <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, mr: 1 }}>INTERVALOS RÁPIDOS:</Typography>
                 <Chip label="5 Anos" variant="outlined" size="small" onClick={() => handleDateShortcut(5)} sx={{ borderRadius: 1.5, fontWeight: 600 }} />
                 <Chip label="10 Anos" variant="outlined" size="small" onClick={() => handleDateShortcut(10)} sx={{ borderRadius: 1.5, fontWeight: 600 }} />
                 <Chip label="20 Anos" variant="outlined" size="small" onClick={() => handleDateShortcut(20)} sx={{ borderRadius: 1.5, fontWeight: 600 }} />
               </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Fade>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Accordion sx={{ borderRadius: 4, '&:before': { display: 'none' }, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <LightbulbIcon color="primary" fontSize="small" />
                <Typography sx={{ fontWeight: 700 }}>Dicas de Pesquisa e Operadores</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 3, pb: 3 }}>
              <Grid container spacing={3}>
                 <Grid item xs={12}>
                     <Typography variant="body2" color="text.secondary" paragraph>
                        A plataforma utiliza a API do OpenAlex. Use operadores lógicos para criar filtros complexos.
                     </Typography>
                 </Grid>
                 <Grid item xs={6}>
                    <Typography variant="caption" sx={{ fontWeight: 900, display: 'block', mb: 1, color: 'primary.main' }}>OPERADORES</Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      • <b>AND</b>: resultados com ambos os termos.<br/>
                      • <b>OR</b>: resultados com pelo menos um termo.<br/>
                      • <b>NOT</b>: exclui termos específicos.
                    </Typography>
                 </Grid>
                 <Grid item xs={6}>
                    <Typography variant="caption" sx={{ fontWeight: 900, display: 'block', mb: 1, color: 'primary.main' }}>EXEMPLO</Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', fontSize: '0.8rem', bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                      "solos" AND ("citros" OR "cana")
                    </Typography>
                 </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        <Grid item xs={12} md={5}>
          {searchHistory.length > 0 && (
            <Paper sx={{ p: 2.5, borderRadius: 4 }} elevation={0}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <HistoryIcon color="action" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Histórico Recente</Typography>
              </Stack>
              <List dense disablePadding>
                {searchHistory.map((item, index) => (
                  <Fade in timeout={300 + (index * 100)} key={index}>
                    <Box>
                      <ListItem 
                        button 
                        onClick={() => restoreHistory(item)}
                        sx={{ borderRadius: 2, py: 1 }}
                      >
                        <ListItemText 
                          primary={item.search_terms} 
                          primaryTypographyProps={{ fontWeight: 600, noWrap: true, fontSize: '0.85rem' }}
                          secondary={`${item.start_year}-${item.end_year} • ${item.sort_option === 'relevance' ? 'Relevância' : 'Data'}`}
                          secondaryTypographyProps={{ fontSize: '0.75rem' }}
                        />
                      </ListItem>
                      {index < searchHistory.length - 1 && <Divider sx={{ my: 0.5, opacity: 0.5 }} />}
                    </Box>
                  </Fade>
                ))}
              </List>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

const CircularProgress = ({ size, color }) => (
  <Box component="span" sx={{ display: 'inline-flex', mr: 1 }}>
    <svg width={size} height={size} viewBox="22 22 44 44">
      <circle cx="44" cy="44" r="20.2" fill="none" stroke="currentColor" strokeWidth="3.6" />
    </svg>
  </Box>
);

export default SearchForm;
