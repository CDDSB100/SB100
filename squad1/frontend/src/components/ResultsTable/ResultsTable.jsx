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
  LinearProgress,
  Modal
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ArticleIcon from '@mui/icons-material/Article';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ScienceIcon from '@mui/icons-material/Science';
import ClearIcon from '@mui/icons-material/Clear';
import StorageIcon from '@mui/icons-material/Storage';
import { useAuth } from '../../hooks/useAuth';

const headCells = [
  { id: 'title', label: 'Título' },
  { id: 'authors', label: 'Autores' },
  { id: 'year', label: 'Ano' },
  { id: 'retrievalSource', label: 'Base' },
  { id: 'methodology', label: 'Metodologia' },
  { id: 'journalTitle', label: 'Fonte' },
  { id: 'doi', label: 'DOI' },
  { id: 'actions', label: 'Ações' },
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
            {headCell.id !== 'actions' ? (
              <TableSortLabel
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : 'asc'}
                onClick={createSortHandler(headCell.id)}
              >
                {headCell.label}
              </TableSortLabel>
            ) : headCell.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

const ResultsTable = ({ results, onSave, loading }) => {
  const { userRole } = useAuth();
  const isVisitor = userRole === 'visitante';
  
  const [selected, setSelected] = useState([]);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('year');
  const [filterText, setFilterText] = useState('');
  
  // Preview states
  const [previewUrl, setPreviewUrl] = useState("");
  const [openPreview, setOpenPreview] = useState(false);

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = results.map((n) => n.workId || n.doi || n.title);
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
    const selectedData = results
      .filter((row) => selected.includes(row.workId || row.doi || row.title))
      .map(row => ({
        title: row.title || '',
        authors: Array.isArray(row.authors) ? row.authors.join(', ') : (row.authors || ''),
        year: row.year || '',
        journalTitle: row.source || row.journalTitle || '',
        doi: row.doi || '',
        workId: row.workId || '',
        documentUrl: row.pdf_url || row.documentUrl || '',
        methodology: row.methodology || 'Pendente extração IA',
        retrievalSource: row.retrievalSource || 'Desconhecida',
        status: 'Pendente'
      }));
    onSave(selectedData);
  };

  const generateBibTeX = (data) => {
    return data.map((row, index) => {
        const id = row.doi ? row.doi.split('/').pop() : `article_${index}`;
        const authors = Array.isArray(row.authors) ? row.authors.join(' and ') : row.authors;
        
        return `@article{${id},
  title = {${row.title}},
  author = {${authors}},
  journal = {${row.journalTitle || row.source || 'Unknown'}},
  year = {${row.year}},
  doi = {${row.doi || ''}},
  url = {${row.documentUrl || row.pdf_url || ''}}
}`;
    }).join('\n\n');
  };

  const handleExportBibTeX = () => {
      const selectedData = results.filter((row) => selected.includes(row.workId || row.doi || row.title));
      const bibtexContent = generateBibTeX(selectedData);
      
      const blob = new Blob([bibtexContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'export_cientometria.bib');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
  };

  const handlePreview = (url) => {
    if (!url) return;
    setPreviewUrl(url);
    setOpenPreview(true);
  };

  const filteredResults = useMemo(() => {
    if (!filterText) return results;
    const lowerFilter = filterText.toLowerCase();
    return results.filter((row) => {
      const title = row.title ? row.title.toLowerCase() : '';
      const authors = Array.isArray(row.authors) ? row.authors.join(' ').toLowerCase() : (row.authors ? row.authors.toLowerCase() : '');
      return title.includes(lowerFilter) || authors.includes(lowerFilter);
    });
  }, [results, filterText]);

  const sortedResults = useMemo(() => {
    const comparator = (a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];

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
                <Tooltip title={isVisitor ? "Usuários visitantes não podem salvar artigos" : ""}>
                  <span>
                    <Button
                      variant="contained"
                      onClick={handleSave}
                      disabled={selected.length === 0 || loading || isVisitor}
                      startIcon={<SaveIcon />}
                      sx={{ borderRadius: '50px', fontWeight: 800, px: 3 }}
                    >
                      Salvar Selecionados ({selected.length})
                    </Button>
                  </span>
                </Tooltip>
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
                const uniqueId = row.workId || row.doi || row.title;
                const isItemSelected = isSelected(uniqueId);
                const authorsText = Array.isArray(row.authors) ? row.authors.join(', ') : row.authors;
                const docUrl = row.pdf_url || row.documentUrl;

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
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                        {row.title || 'Sem título'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>{authorsText || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={row.year || '—'} size="small" sx={{ fontWeight: 700, borderRadius: 1 }} />
                    </TableCell>
                    <TableCell>
                       <Chip 
                        icon={<StorageIcon sx={{ fontSize: '12px !important' }} />} 
                        label={row.retrievalSource || "Bases"} 
                        size="small" 
                        variant="outlined"
                        color="info"
                        sx={{ fontWeight: 600, borderRadius: 1, fontSize: '0.7rem' }} 
                       />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                       <Stack direction="row" spacing={1} alignItems="center">
                          <ScienceIcon sx={{ fontSize: 14, color: 'secondary.main' }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, fontStyle: 'italic', color: 'text.secondary' }}>
                            {row.methodology || "Extraível via IA"}
                          </Typography>
                       </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        {row.journalTitle || row.source || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {row.doi ? (
                        <Tooltip title="Abrir DOI">
                          <IconButton size="small" href={`https://doi.org/${row.doi}`} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
                            <Link sx={{ fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>{row.doi.substring(0, 10)}...</Link>
                          </IconButton>
                        </Tooltip>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                       <Stack direction="row" spacing={1}>
                          <Tooltip title="Visualizar Documento">
                            <span>
                              <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={() => handlePreview(docUrl)}
                                disabled={!docUrl}
                                sx={{ bgcolor: 'primary.light', color: 'white', '&:hover': { bgcolor: 'primary.main' } }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          {docUrl && (
                            <Tooltip title="Abrir em Nova Aba">
                              <IconButton size="small" href={docUrl} target="_blank" rel="noopener" sx={{ border: '1px solid', borderColor: 'divider' }}>
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                       </Stack>
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

        {/* PDF Modal */}
        <Modal open={openPreview} onClose={() => setOpenPreview(false)}>
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', height: '90%', bgcolor: 'background.paper', borderRadius: 4, overflow: 'hidden', boxShadow: 24, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'grey.100', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ ml: 2, fontWeight: 700 }}>Visualização do Documento</Typography>
              <Stack direction="row" spacing={1}>
                {previewUrl?.startsWith('http') && (
                  <Button 
                    size="small" 
                    variant="contained" 
                    startIcon={<OpenInNewIcon />}
                    href={previewUrl}
                    target="_blank"
                    sx={{ borderRadius: '50px', textTransform: 'none', fontWeight: 700 }}
                  >
                    Abrir em nova aba
                  </Button>
                )}
                <IconButton onClick={() => setOpenPreview(false)}><ClearIcon /></IconButton>
              </Stack>
            </Box>
            <Box sx={{ flexGrow: 1, position: 'relative', bgcolor: '#f5f5f5' }}>
              {previewUrl?.startsWith('http') && (
                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 0, p: 4 }}>
                   <ArticleIcon sx={{ fontSize: 60, color: 'divider', mb: 2 }} />
                   <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>Link Externo Detectado</Typography>
                   <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                     Algumas bases científicas (como IEEE, Elsevier, Nature) impedem a visualização direta <br/> 
                     dentro da plataforma por questões de segurança.
                   </Typography>
                   <Button 
                    variant="outlined" 
                    href={previewUrl} 
                    target="_blank"
                    startIcon={<OpenInNewIcon />}
                    sx={{ borderRadius: '50px' }}
                   >
                     Clique aqui para abrir o site original
                   </Button>
                </Box>
              )}
              <iframe 
                src={previewUrl} 
                width="100%" 
                height="100%" 
                title="PDF Preview" 
                style={{ border: 'none', position: 'relative', zIndex: 1, backgroundColor: 'transparent' }} 
              />
            </Box>
          </Box>
        </Modal>
      </Paper>
    </Fade>
  );
};

export default ResultsTable;
