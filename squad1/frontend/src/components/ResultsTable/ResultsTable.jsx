import { useState, useMemo } from 'react';
import {
  Box,
  Checkbox,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  Link,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Stack,
  Tooltip,
  IconButton,
  Chip,
  Avatar,
  Fade,
  LinearProgress
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ArticleIcon from '@mui/icons-material/Article';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const headCells = [
  { id: 'title', label: 'Título' },
  { id: 'authors', label: 'Autores' },
  { id: 'year', label: 'Ano' },
  { id: 'source', label: 'Fonte' },
  { id: 'doi', label: 'DOI' },
];

function EnhancedTableHead(props) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props;
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead sx={{ bgcolor: 'grey.50' }}>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{ 'aria-label': 'selecionar todos' }}
          />
        </TableCell>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align="left"
            padding="normal"
            sortDirection={orderBy === headCell.id ? order : false}
            sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

const ResultsTable = ({ results, onSave, loading }) => {
  const [selected, setSelected] = useState([]);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('year');
  const [filterText, setFilterText] = useState('');

  // Helper para normalizar o acesso aos dados (suporta chaves em PT e EN)
  const getRowValue = (row, field) => {
    if (!row) return '';
    switch(field) {
      case 'title': return row.title || row['Título'] || '';
      case 'authors': return row.authors || row['Autor(es)'] || '';
      case 'year': return row.year || row['Ano'] || '';
      case 'source': return row.source || row['Título do periódico'] || '';
      case 'doi': return row.doi || row['DOI'] || '';
      case 'pdf_url': return row.pdf_url || row['URL DO DOCUMENTO'] || '';
      default: return row[field] || '';
    }
  };

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = results.map((n, i) => n.id || n.work_id || `row-${i}`);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) newSelected = newSelected.concat(selected, id);
    else if (selectedIndex === 0) newSelected = newSelected.concat(selected.slice(1));
    else if (selectedIndex === selected.length - 1) newSelected = newSelected.concat(selected.slice(0, -1));
    else if (selectedIndex > 0) newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    
    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const handleSave = () => {
    const selectedData = results.filter((row, i) => selected.includes(row.id || row.work_id || `row-${i}`));
    
    // Normalizar para o formato que o backend espera (sempre chaves em PT)
    const normalizedData = selectedData.map(row => ({
      "Título": getRowValue(row, 'title'),
      "Autor(es)": getRowValue(row, 'authors'),
      "Ano": String(getRowValue(row, 'year')),
      "DOI": getRowValue(row, 'doi'),
      "URL DO DOCUMENTO": getRowValue(row, 'pdf_url'),
      "work_id": row.work_id || row.id,
      "Número de citações recebidas (Google Scholar)": String(row.cited_by_count || row['Número de citações recebidas (Google Scholar)'] || "0"),
      "Tipo de documento": row.type || row['Tipo de documento'] || "article",
      "Título do periódico": getRowValue(row, 'source')
    }));

    onSave(normalizedData);
  };

  const generateBibTeX = (data) => {
    return data.map((row, index) => {
        const title = getRowValue(row, 'title');
        const authorsRaw = getRowValue(row, 'authors');
        const authors = Array.isArray(authorsRaw) ? authorsRaw.join(' and ') : authorsRaw;
        const year = getRowValue(row, 'year');
        const doi = getRowValue(row, 'doi');
        const source = getRowValue(row, 'source');
        const pdf = getRowValue(row, 'pdf_url');

        const id = doi ? doi.split('/').pop() : `article_${index}`;
        
        return `@article{${id},
  title = {${title}},
  author = {${authors}},
  journal = {${source || 'Unknown'}},
  year = {${year}},
  doi = {${doi || ''}},
  url = {${pdf || ''}}
}`;
    }).join('\n\n');
  };

  const handleExportBibTeX = () => {
      const selectedData = results.filter((row, i) => selected.includes(row.id || row.work_id || `row-${i}`));
      const bibtexContent = generateBibTeX(selectedData);
      
      const blob = new Blob([bibtexContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'export_cientometria.bib');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const filteredResults = useMemo(() => {
    if (!filterText) return results;
    const lowerFilter = filterText.toLowerCase();
    return results.filter((row) => {
      const title = getRowValue(row, 'title').toLowerCase();
      const authorsRaw = getRowValue(row, 'authors');
      const authors = Array.isArray(authorsRaw) ? authorsRaw.join(' ').toLowerCase() : authorsRaw.toLowerCase();
      return title.includes(lowerFilter) || authors.includes(lowerFilter);
    });
  }, [results, filterText]);

  const sortedResults = useMemo(() => {
    const comparator = (a, b) => {
      let aValue = getRowValue(a, orderBy);
      let bValue = getRowValue(b, orderBy);

      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      if (Array.isArray(aValue)) aValue = aValue.join(', ');
      if (Array.isArray(bValue)) bValue = bValue.join(', ');

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (bValue < aValue) return order === 'asc' ? 1 : -1;
      if (bValue > aValue) return order === 'asc' ? -1 : 1;
      return 0;
    };
    return [...filteredResults].sort(comparator);
  }, [filteredResults, order, orderBy]);

  return (
    <Fade in timeout={800}>
      <Paper sx={{ borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
        {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />}
        
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'secondary.main', width: 40, height: 40 }}>
                  <ArticleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>Resultados</Typography>
                  <Typography variant="caption" color="text.secondary">{filteredResults.length} artigos encontrados</Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} md={8}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
                <TextField
                  placeholder="Filtrar nesta lista..."
                  size="small"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  InputProps={{
                    startAdornment: <FilterAltIcon fontSize="small" color="action" sx={{ mr: 1 }} />,
                    sx: { borderRadius: '50px', bgcolor: 'grey.50', width: { md: 250 } }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={handleExportBibTeX}
                  disabled={selected.length === 0}
                  startIcon={<DownloadIcon />}
                  sx={{ borderRadius: '50px', fontWeight: 700 }}
                >
                  BibTeX
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={selected.length === 0 || loading}
                  startIcon={<SaveIcon />}
                  sx={{ borderRadius: '50px', fontWeight: 800, px: 3 }}
                >
                  Salvar Selecionados ({selected.length})
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="resultados da busca">
            <EnhancedTableHead
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              rowCount={filteredResults.length}
            />
            <TableBody>
              {sortedResults.map((row, index) => {
                const uniqueId = row.id || row.work_id || `row-${index}`;
                const isItemSelected = isSelected(uniqueId);
                
                // Normalização para exibição amigável
                const title = getRowValue(row, 'title') || 'Sem título';
                const authorsRaw = getRowValue(row, 'authors');
                const authorsText = Array.isArray(authorsRaw) ? authorsRaw.join(', ') : (authorsRaw || '—');
                const year = getRowValue(row, 'year') || '—';
                const source = getRowValue(row, 'source') || '—';
                const doi = getRowValue(row, 'doi');
                const pdf_url = getRowValue(row, 'pdf_url');

                return (
                  <TableRow
                    hover
                    onClick={(event) => handleClick(event, uniqueId)}
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={uniqueId}
                    selected={isItemSelected}
                    sx={{ 
                      cursor: 'pointer',
                      '&.Mui-selected': { bgcolor: 'rgba(27, 94, 32, 0.08) !important' },
                      '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.02) !important' }
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox color="primary" checked={isItemSelected} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 400 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                        {title}
                      </Typography>
                      {pdf_url && (
                        <Link 
                          href={pdf_url} 
                          target="_blank" 
                          rel="noopener" 
                          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem', fontWeight: 600 }}
                        >
                          ACESSO AO PDF <OpenInNewIcon sx={{ fontSize: 10 }} />
                        </Link>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{authorsText}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={year} size="small" sx={{ fontWeight: 700, borderRadius: 1 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        {source}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {doi ? (
                        <Tooltip title="Abrir DOI">
                          <IconButton size="small" href={doi.startsWith('http') ? doi : `https://doi.org/${doi}`} target="_blank" rel="noopener">
                            <Link sx={{ fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>{doi.length > 15 ? doi.substring(0, 15) + '...' : doi}</Link>
                          </IconButton>
                        </Tooltip>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        
        {filteredResults.length === 0 && !loading && (
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="h6">Nenhum resultado para exibir.</Typography>
          </Box>
        )}
      </Paper>
    </Fade>
  );
};

export default ResultsTable;
