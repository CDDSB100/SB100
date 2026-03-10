import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Button,
  TablePagination,
  Snackbar,
  Grid,
  Card,
  CardActions,
  CardContent,
  Chip,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Modal,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  Tooltip,
  Avatar,
  Fade,
  LinearProgress,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemText
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import Header from "../components/Header";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import ScienceIcon from "@mui/icons-material/Science";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import StorageIcon from "@mui/icons-material/Storage";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import InfoIcon from "@mui/icons-material/Info";
import CategoryIcon from "@mui/icons-material/Category";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import TerminalIcon from "@mui/icons-material/Terminal";
import ErrorIcon from "@mui/icons-material/Error";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import BuildIcon from "@mui/icons-material/Build";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import "./Curation.css";
import { 
  getCuratedArticles, 
  triggerBatchCuration, 
  triggerSingleCuration, 
  categorizeArticleRow, 
  deleteArticleRow, 
  deleteUnavailableArticles, 
  manualApproveArticle,
  manualRejectArticle,
  batchUploadZip,
  getLlmLogs,
  getBatchProgress,
  fixMissingTitles,
  updateArticle
} from '../api';

function CurationPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [previewUrl, setPreviewUrl] = useState(null);
  const [openPreview, setOpenPreview] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [editedResult, setEditedResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [openAnalysisDialog, setOpenAnalysisDialog] = useState(false);

  const [allHeaders, setAllHeaders] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("__row_number");
  const [sortOrder, setSortOrder] = useState("desc");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(9);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [isTriggering, setIsTriggering] = useState(false);
  const [processingRow, setProcessingRow] = useState(null);

  const [logs, setLogs] = useState("");
  const [openLogs, setOpenLogs] = useState(false);

  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [pendingAction, setPendingAction] = useState(null); // { rowNumber, fileName, action: 'approve' | 'reject' }

  // Batch Progress state
  const [batchProgress, setBatchProgress] = useState(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCuratedArticles();
      setArticles(data);
      if (data.length > 0) {
        const headers = Object.keys(data[0]).filter((h) => !h.startsWith("__") && h !== "createdAt" && h !== "updatedAt" && h !== "_id");
        setAllHeaders(headers);
        
        const categories = [...new Set(data.map(a => a.CATEGORIA || a.categoria).filter(Boolean))];
        setUniqueCategories(categories);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Falha ao carregar artigos da curadoria.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let interval;
    if (openLogs) {
      const fetchLogs = async () => {
        try {
          const data = await getLlmLogs();
          setLogs(data.logs || "Sem logs disponíveis.");
        } catch (e) {
          console.error("Erro ao buscar logs:", e);
        }
      };
      fetchLogs();
      interval = setInterval(fetchLogs, 3000);
    }
    return () => clearInterval(interval);
  }, [openLogs]);

  // Progress polling effect
  useEffect(() => {
    let pollInterval;
    if (isTriggering && showProgressDialog) {
      pollInterval = setInterval(async () => {
        try {
          const progress = await getBatchProgress();
          setBatchProgress(progress);
          if (progress.status === 'completed' || progress.status === 'idle') {
            setIsTriggering(false);
            // Wait a bit then refresh articles
            setTimeout(() => {
              fetchArticles();
            }, 2000);
          }
        } catch (e) {
          console.error("Erro ao buscar progresso:", e);
        }
      }, 2000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isTriggering, showProgressDialog, fetchArticles]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const filteredArticles = useMemo(() => {
    const filtered = articles.filter((article) => {
      const category = (article.CATEGORIA || article.categoria || "").trim();
      const matchCategory = categoryFilter === "all" || category === categoryFilter;

      const aprov = String(article["APROVAÇÃO CURADOR (marcar)"] || "").toLowerCase();
      const manualAprov = String(article["APROVAÇÃO MANUAL"] || "").toLowerCase();
      const rejected = String(article["ARTIGOS REJEITADOS"] || "").toLowerCase();
      
      let status = "pending";
      if (manualAprov === "true" || manualAprov === "sim") status = "approved_manual";
      else if (aprov === "true" || aprov === "sim") status = "approved_ia";
      else if (rejected === "true" || rejected === "sim") status = "rejected";

      const matchStatus = statusFilter === "all" || status === statusFilter;

      const title = (article.Titulo || article["Título"] || "").toLowerCase();
      const authors = (article["Autor(es)"] || "").toLowerCase();
      const matchSearch = title.includes(searchQuery.toLowerCase()) || authors.includes(searchQuery.toLowerCase());

      return matchCategory && matchStatus && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (valA === null || valA === undefined) valA = "";
      if (valB === null || valB === undefined) valB = "";

      if (sortBy === "__row_number") {
        // Agora __row_number é o _id do MongoDB, então não é numérico sequencial simples
        // Mas o sortBy __row_number ainda é usado pelo frontend
        return sortOrder === "asc" ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      }

      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [articles, categoryFilter, statusFilter, searchQuery, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const total = articles.length;
    const approved_manual = articles.filter(a => {
      const manual = String(a["APROVAÇÃO MANUAL"] || "").toLowerCase();
      return manual === "true" || manual === "sim";
    }).length;
    const approved_ia = articles.filter(a => {
      const aprov = String(a["APROVAÇÃO CURADOR (marcar)"] || "").toLowerCase();
      const manual = String(a["APROVAÇÃO MANUAL"] || "").toLowerCase();
      return (aprov === "true" || aprov === "sim") && !(manual === "true" || manual === "sim");
    }).length;
    const rejected = articles.filter(a => {
      const rej = String(a["ARTIGOS REJEITADOS"] || "").toLowerCase();
      return rej === "true" || rej === "sim";
    }).length;
    const pending = total - approved_manual - approved_ia - rejected;
    return { total, approved_manual, approved_ia, rejected, pending };
  }, [articles]);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleBatchCuration = async () => {
    setIsTriggering(true);
    setSnackbar({ open: true, message: "Iniciando curadoria em lote...", severity: "info" });
    try {
      await triggerBatchCuration();
      setSnackbar({ open: true, message: "Curadoria em lote concluída!", severity: "success" });
      setTimeout(fetchArticles, 1000);
    } catch (err) {
      setSnackbar({ open: true, message: "Erro: " + err.message, severity: "error" });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleFixTitles = async () => {
    setIsTriggering(true);
    setSnackbar({ open: true, message: "Iniciando reparo de títulos...", severity: "info" });
    try {
      const res = await fixMissingTitles();
      setSnackbar({ open: true, message: res.message, severity: "success" });
      setTimeout(fetchArticles, 1000);
    } catch (err) {
      setSnackbar({ open: true, message: "Erro: " + err.message, severity: "error" });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleZipUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsTriggering(true);
    setBatchProgress({ total: 0, current: 0, processed: 0, errors: 0, skipped: 0, status: 'processing', message: 'Enviando arquivo...' });
    setShowProgressDialog(true);
    
    try {
      const response = await batchUploadZip(file);
      setSnackbar({ open: true, message: response.message, severity: "success" });
      setTimeout(fetchArticles, 1000);
    } catch (err) {
      setSnackbar({ open: true, message: "Erro: " + (err.response?.data?.error || err.message), severity: "error" });
      setIsTriggering(false);
    } finally {
      // Reset input
      event.target.value = null;
    }
  };

  const handleSingleCuration = async (rowNumber) => {
    setProcessingRow(rowNumber);
    try {
      const response = await triggerSingleCuration(rowNumber);
      setAnalysisResult(response.updatedArticle || response.article);
      setOpenAnalysisDialog(true);
      setSnackbar({ open: true, message: "Análise concluída!", severity: "success" });
      fetchArticles();
    } catch (err) {
      setSnackbar({ open: true, message: "Erro na análise: " + err.message, severity: "error" });
    } finally {
      setProcessingRow(null);
    }
  };

  const handleCategorize = async (rowNumber) => {
    setProcessingRow(rowNumber);
    try {
      const response = await categorizeArticleRow(rowNumber);
      setAnalysisResult(response.updatedArticle || response.article);
      setOpenAnalysisDialog(true);
      setSnackbar({ open: true, message: "Categorização concluída!", severity: "success" });
      fetchArticles();
    } catch (err) {
      setSnackbar({ open: true, message: "Erro: " + err.message, severity: "error" });
    } finally {
      setProcessingRow(null);
    }
  };

  const handleDelete = async (article) => {
    const rowNumber = article.__row_number;
    if (!window.confirm(`Excluir artigo "${article.Titulo || article.Título}"?`)) return;
    setProcessingRow(rowNumber);
    try {
      await deleteArticleRow(rowNumber);
      setSnackbar({ open: true, message: "Artigo removido!", severity: "success" });
      fetchArticles();
    } catch (err) {
      setSnackbar({ open: true, message: "Erro: " + err.message, severity: "error" });
    } finally {
      setProcessingRow(null);
    }
  };

  const handleManualApprove = (rowNumber, fileName) => {
    setPendingAction({ rowNumber, fileName, action: 'approve' });
    setFeedbackText("");
    setFeedbackDialogOpen(true);
  };

  const handleManualReject = (rowNumber, fileName) => {
    setPendingAction({ rowNumber, fileName, action: 'reject' });
    setFeedbackText("");
    setFeedbackDialogOpen(true);
  };

  const confirmFeedbackAction = async () => {
    if (!feedbackText.trim()) {
      setSnackbar({ open: true, message: "O feedback é obrigatório.", severity: "warning" });
      return;
    }

    const { rowNumber, fileName, action } = pendingAction;
    setProcessingRow(rowNumber);
    setFeedbackDialogOpen(false);

    try {
      if (action === 'approve') {
        await manualApproveArticle(rowNumber, fileName, feedbackText);
        setSnackbar({ open: true, message: "Artigo aprovado manualmente!", severity: "success" });
      } else {
        await manualRejectArticle(rowNumber, fileName, feedbackText);
        setSnackbar({ open: true, message: "Artigo rejeitado manualmente!", severity: "success" });
      }
      fetchArticles();
    } catch (err) {
      setSnackbar({ open: true, message: "Erro: " + err.message, severity: "error" });
    } finally {
      setProcessingRow(null);
      setPendingAction(null);
    }
  };

  const handlePreview = (url) => {
    if (!url) return;
    let finalUrl = url;
    if (!url.startsWith("http")) {
      finalUrl = `/api/documents/${encodeURIComponent(url)}`;
    } else if (url.includes("drive.google.com/file/d/")) {
      finalUrl = url.replace("/view", "/preview");
    }
    setPreviewUrl(finalUrl);
    setOpenPreview(true);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancelar edição
      setEditedResult(null);
      setIsEditing(false);
    } else {
      // Iniciar edição
      setEditedResult({ ...analysisResult });
      setIsEditing(true);
    }
  };

  const handleFieldChange = (header, value) => {
    setEditedResult(prev => ({
      ...prev,
      [header]: value
    }));
  };

  const handleSaveChanges = async () => {
    try {
      const id = analysisResult._id || analysisResult.__row_number;
      await updateArticle(id, editedResult);
      setAnalysisResult({ ...editedResult });
      setIsEditing(false);
      setEditedResult(null);
      setSnackbar({ open: true, message: "Metadados atualizados com sucesso!", severity: "success" });
      fetchArticles();
    } catch (err) {
      setSnackbar({ open: true, message: "Erro ao salvar: " + err.message, severity: "error" });
    }
  };

  const getStatusChip = (article) => {
    const aprov = String(article["APROVAÇÃO CURADOR (marcar)"] || "").toLowerCase();
    const manual = String(article["APROVAÇÃO MANUAL"] || "").toLowerCase();
    const rejected = String(article["ARTIGOS REJEITADOS"] || "").toLowerCase();

    if (manual === "true" || manual === "sim") 
      return <Chip icon={<CheckCircleIcon />} label="Aprovado Manualmente" color="success" size="small" sx={{ fontWeight: 700 }} />;
    
    if (aprov === "true" || aprov === "sim") 
      return <Chip icon={<AutoFixHighIcon />} label="Aprovado por IA" color="info" size="small" sx={{ fontWeight: 700 }} />;

    if (rejected === "true" || rejected === "sim") 
      return <Chip icon={<CancelIcon />} label="Rejeitado" color="error" size="small" sx={{ fontWeight: 700 }} />;

    return <Chip icon={<HourglassEmptyIcon />} label="Pendente" color="warning" size="small" sx={{ fontWeight: 700 }} />;
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 10 }}>
      <Header />
      
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 4, md: 8 }, mb: 4, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
        <Container maxWidth="lg">
          <Grid container alignItems="center" spacing={3}>
            <Grid item xs={12} md={8}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <IconButton component={RouterLink} to="/home" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '3rem' }, color: 'white' }}>Curadoria</Typography>
              </Stack>
              <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 400 }}>Validação e categorização de evidências científicas.</Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 2, flexWrap: 'wrap' }}>
              <Button 
                component="label"
                variant="contained" 
                color="info" 
                startIcon={isTriggering ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                disabled={isTriggering || loading}
                sx={{ borderRadius: '50px', px: 4, fontWeight: 800 }}
              >
                Subir ZIP
                <input type="file" hidden accept=".zip" onChange={handleZipUpload} />
              </Button>
              <Button 
                variant="contained" 
                color="secondary" 
                startIcon={isTriggering ? <CircularProgress size={20} color="inherit" /> : <AutoFixHighIcon />}
                onClick={handleBatchCuration}
                disabled={isTriggering || loading}
                sx={{ borderRadius: '50px', px: 4, fontWeight: 800 }}
              >
                IA em Lote
              </Button>
              <Button 
                variant="outlined" 
                color="inherit" 
                startIcon={isTriggering ? <CircularProgress size={20} color="inherit" /> : <BuildIcon />}
                onClick={handleFixTitles}
                disabled={isTriggering || loading}
                sx={{ borderRadius: '50px', px: 3, fontWeight: 800, color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              >
                Reparar Títulos
              </Button>
              <Tooltip title="Recarregar Artigos">
                <IconButton onClick={fetchArticles} sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Ver Console da LLM">
                <IconButton onClick={() => setOpenLogs(true)} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>
                  <TerminalIcon />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* Stats Summary */}
        <Grid container spacing={2} sx={{ mb: 6 }}>
          {[
            { label: 'Total', value: stats.total, color: 'primary.main', icon: <StorageIcon /> },
            { label: 'Aprov. Manual', value: stats.approved_manual, color: 'success.main', icon: <CheckCircleIcon /> },
            { label: 'Aprov. IA', value: stats.approved_ia, color: 'info.main', icon: <AutoFixHighIcon /> },
            { label: 'Rejeitados', value: stats.rejected, color: 'error.main', icon: <CancelIcon /> },
            { label: 'Pendentes', value: stats.pending, color: 'warning.main', icon: <HourglassEmptyIcon /> },
          ].map((stat, i) => (
            <Grid item xs={6} sm={4} md={2.4} key={i} sx={{ display: { md: 'block' }, flexBasis: { md: '20%' }, maxWidth: { md: '20%' } }}>
              <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 4, transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: 4 }, height: '100%' }}>
                <Avatar sx={{ bgcolor: `${stat.color}15`, color: stat.color, mx: 'auto', mb: 1 }}>{stat.icon}</Avatar>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, lineHeight: 1.2, display: 'block', mb: 1 }}>{stat.label}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: stat.color }}>{stat.value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Search & Filters */}
        <Paper sx={{ p: 4, mb: 4, borderRadius: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar por título, autores ou palavras-chave..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                  <MenuItem value="all">Todos os Status</MenuItem>
                  <MenuItem value="approved_manual">Aprovado Manualmente</MenuItem>
                  <MenuItem value="approved_ia">Aprovado por IA</MenuItem>
                  <MenuItem value="rejected">Rejeitados</MenuItem>
                  <MenuItem value="pending">Pendentes</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select value={categoryFilter} label="Categoria" onChange={(e) => setCategoryFilter(e.target.value)}>
                  <MenuItem value="all">Todas as Categorias</MenuItem>
                  {uniqueCategories.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Ordenar por</InputLabel>
                <Select value={sortBy} label="Ordenar por" onChange={(e) => setSortBy(e.target.value)}>
                  <MenuItem value="__row_number">Ordem de Inserção</MenuItem>
                  <MenuItem value="Titulo">Título</MenuItem>
                  <MenuItem value="Autor(es)">Autores</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Ordem</InputLabel>
                <Select value={sortOrder} label="Ordem" onChange={(e) => setSortOrder(e.target.value)}>
                  <MenuItem value="asc">Crescente</MenuItem>
                  <MenuItem value="desc">Decrescente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 15 }}>
            <CircularProgress size={60} thickness={4} />
            <Typography sx={{ mt: 3, fontWeight: 700, color: 'text.secondary' }}>Processando biblioteca científica...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" variant="filled" sx={{ borderRadius: 4 }}>{error}</Alert>
        ) : filteredArticles.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 15, bgcolor: 'white', borderRadius: 4, border: '2px dashed', borderColor: 'divider' }}>
            <SearchIcon sx={{ fontSize: 80, color: 'divider', mb: 2 }} />
            <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 700 }}>Nenhum artigo corresponde aos filtros.</Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={3}>
              {filteredArticles.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((article) => (
                <Grid item xs={12} md={4} key={article.__row_number}>
                  <Fade in timeout={500}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 4, position: 'relative' }}>
                      <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
                        {getStatusChip(article)}
                      </Box>
                      <CardContent sx={{ pt: 5, flexGrow: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                          <CategoryIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'secondary.main', textTransform: 'uppercase' }}>
                            {article.CATEGORIA || article.categoria || "Sem Categoria"}
                          </Typography>
                        </Stack>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.2, height: '3.6em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                          {article.Titulo || article["Título"] || "Sem Título"}
                        </Typography>
                        <Stack spacing={1.5}>
                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'primary.light' }}>A</Avatar>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {article["Autor(es)"] || "Autor Desconhecido"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'grey.300' }}>D</Avatar>
                            <Typography variant="body2" color="text.secondary">DOI: {article.DOI || "N/A"}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'success.light' }}>I</Avatar>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                              Inserido por: <strong>{article["INSERIDO POR"] || "Sistema"}</strong>
                            </Typography>
                          </Box>
                          {article["APROVADO POR"] && (
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                              <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'info.light' }}>C</Avatar>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                Curador: <strong>{article["APROVADO POR"]}</strong>
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                        
                        {article["FEEDBACK DO CURADOR (escrever)"] && article["FEEDBACK DO CURADOR (escrever)"] !== "N/A" && (
                          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.5, color: 'primary.main' }}>FEEDBACK DA INTELIGÊNCIA ARTIFICIAL:</Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'text.primary' }}>
                              "{article["FEEDBACK DO CURADOR (escrever)"]}"
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                      <Divider />
                      <CardActions sx={{ p: 2, justifyContent: 'space-between', bgcolor: 'grey.50' }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Visualizar PDF">
                            <IconButton 
                              color="primary" 
                              onClick={() => handlePreview(article["URL DO DOCUMENTO"])}
                              disabled={!article["URL DO DOCUMENTO"]}
                              sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}
                            >
                              <PictureAsPdfIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Ver Metadados Completos">
                            <IconButton 
                              onClick={() => { setAnalysisResult(article); setIsEditing(false); setOpenAnalysisDialog(true); }}
                              sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}
                            >
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>
                          <Tooltip title="Análise IA">
                            <IconButton 
                              size="small"
                              color="primary"
                              onClick={() => handleSingleCuration(article.__row_number)}
                              disabled={processingRow === article.__row_number}
                              sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}
                            >
                              <AutoFixHighIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Button 
                            variant="contained" 
                            size="small" 
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleManualApprove(article.__row_number, article["URL DO DOCUMENTO"])}
                            disabled={processingRow === article.__row_number}
                            sx={{ borderRadius: '50px' }}
                          >
                            Aprovar
                          </Button>

                          <Button 
                            variant="contained" 
                            size="small" 
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => handleManualReject(article.__row_number, article["URL DO DOCUMENTO"])}
                            disabled={processingRow === article.__row_number}
                            sx={{ borderRadius: '50px' }}
                          >
                            Rejeitar
                          </Button>

                          <Tooltip title="Excluir Registro">
                            <IconButton 
                              color="default"
                              onClick={() => handleDelete(article)}
                              disabled={processingRow === article.__row_number}
                              sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </CardActions>
                      {processingRow === article.__row_number && <LinearProgress sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} />}
                    </Card>
                  </Fade>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
              <Paper sx={{ borderRadius: '50px', px: 2 }}>
                <TablePagination
                  component="div"
                  count={filteredArticles.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[9, 18, 27, 36]}
                  labelRowsPerPage="Exibir"
                />
              </Paper>
            </Box>
          </>
        )}
      </Container>

      {/* PDF Modal */}
      <Modal open={openPreview} onClose={() => setOpenPreview(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', height: '90%', bgcolor: 'background.paper', borderRadius: 4, overflow: 'hidden', boxShadow: 24 }}>
          <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', bgcolor: 'grey.100', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ flexGrow: 1, ml: 2, fontWeight: 700 }}>Visualização do Documento</Typography>
            <IconButton onClick={() => setOpenPreview(false)}><ClearIcon /></IconButton>
          </Box>
          <iframe src={previewUrl} width="100%" height="100%" title="PDF Preview" style={{ border: 'none' }} />
        </Box>
      </Modal>

      {/* Details Dialog */}
      <Dialog open={openAnalysisDialog} onClose={() => { if(!isEditing) setOpenAnalysisDialog(false); }} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900, bgcolor: 'primary.main', color: 'white', py: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <InfoIcon />
              <Typography variant="h5" sx={{ fontWeight: 900 }}>{isEditing ? "Editar Metadados" : "Metadados do Artigo"}</Typography>
            </Stack>
            {!isEditing && (
              <Button 
                startIcon={<EditIcon />} 
                variant="contained" 
                color="secondary" 
                onClick={handleEditToggle}
                sx={{ borderRadius: '50px' }}
              >
                Editar
              </Button>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 4, mt: 2 }}>
          {analysisResult && (
            <Grid container spacing={3}>
              {allHeaders.map((header) => (
                <Grid item xs={12} sm={header === "Resumo" || header === "Título" ? 12 : 6} key={header}>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      label={header}
                      value={editedResult[header] || ""}
                      onChange={(e) => handleFieldChange(header, e.target.value)}
                      multiline={header === "Resumo" || header === "Palavras-chave"}
                      rows={header === "Resumo" ? 4 : 1}
                      variant="outlined"
                    />
                  ) : (
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 3, height: '100%' }}>
                      <Typography variant="caption" color="primary" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>{header}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5, wordBreak: 'break-word' }}>{analysisResult[header] || "---"}</Typography>
                    </Box>
                  )}
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: 'grey.50' }}>
          {isEditing ? (
            <>
              <Button onClick={handleEditToggle} color="inherit">Cancelar</Button>
              <Button onClick={handleSaveChanges} startIcon={<SaveIcon />} variant="contained" color="success" sx={{ borderRadius: '50px', px: 4 }}>Salvar Alterações</Button>
            </>
          ) : (
            <>
              <Button onClick={() => handleCategorize(analysisResult.__row_number)} startIcon={<CategoryIcon />} color="secondary" variant="outlined" sx={{ borderRadius: '50px' }}>Recategorizar</Button>
              <Button onClick={() => setOpenAnalysisDialog(false)} variant="contained" size="large" sx={{ borderRadius: '50px', px: 4 }}>Fechar</Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: "100%", borderRadius: 3, fontWeight: 700 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Drawer
        anchor="right"
        open={openLogs}
        onClose={() => setOpenLogs(false)}
        PaperProps={{ sx: { width: { xs: '100%', md: 600 }, bgcolor: '#1e1e1e', color: '#d4d4d4', p: 3, display: 'flex', flexDirection: 'column' } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, borderBottom: '1px solid #333', pb: 2 }}>
          <TerminalIcon sx={{ mr: 2, color: '#4fc1ff' }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, color: '#4fc1ff', fontFamily: 'monospace' }}>LLM_CONSOLE @ OLLAMA</Typography>
          <IconButton onClick={() => setOpenLogs(false)} sx={{ color: '#d4d4d4' }}><ClearIcon /></IconButton>
        </Box>
        <Box 
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            fontFamily: '"Fira Code", "Courier New", monospace', 
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
            bgcolor: '#000',
            p: 2,
            borderRadius: 2,
            border: '1px solid #333',
            color: '#32cd32'
          }}
        >
          {logs}
        </Box>
        <Typography variant="caption" sx={{ mt: 2, color: '#888', textAlign: 'center', fontFamily: 'monospace' }}>
          AUTO_REFRESH_ACTIVE [3S]
        </Typography>
      </Drawer>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onClose={() => setFeedbackDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {pendingAction?.action === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Por favor, forneça um feedback sobre esta decisão. Este comentário será salvo no registro do artigo.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Feedback do Curador"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Descreva o motivo da aprovação ou rejeição..."
            variant="outlined"
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setFeedbackDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button 
            onClick={confirmFeedbackAction} 
            variant="contained" 
            color={pendingAction?.action === 'approve' ? 'success' : 'error'}
            disabled={!feedbackText.trim()}
            sx={{ borderRadius: '50px', px: 3 }}
          >
            Confirmar {pendingAction?.action === 'approve' ? 'Aprovação' : 'Rejeição'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch Progress Dialog */}
      <Dialog 
        open={showProgressDialog} 
        onClose={() => batchProgress?.status === 'completed' && setShowProgressDialog(false)}
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, bgcolor: 'primary.main', color: 'white' }}>
          Processamento em Lote
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              {batchProgress?.message || 'Iniciando...'}
            </Typography>
            <LinearProgress 
              variant={batchProgress?.total > 0 ? "determinate" : "indeterminate"} 
              value={batchProgress?.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0} 
              sx={{ height: 10, borderRadius: 5 }}
            />
            {batchProgress?.total > 0 && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'right', fontWeight: 700 }}>
                {batchProgress.current} de {batchProgress.total} artigos analisados
              </Typography>
            )}
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white', borderRadius: 3 }}>
                <CheckCircleIcon sx={{ mb: 0.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>{batchProgress?.processed || 0}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>Inseridos</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'white', borderRadius: 3 }}>
                <SkipNextIcon sx={{ mb: 0.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>{batchProgress?.skipped || 0}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>Duplicados</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'white', borderRadius: 3 }}>
                <ErrorIcon sx={{ mb: 0.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>{batchProgress?.errors || 0}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>Erros</Typography>
              </Paper>
            </Grid>
          </Grid>

          {batchProgress?.status === 'processing' && (
            <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                A Inteligência Artificial está extraindo metadados e analisando o conteúdo...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setShowProgressDialog(false)} 
            variant="contained" 
            disabled={batchProgress?.status === 'processing'}
            sx={{ borderRadius: '50px', px: 4 }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CurationPage;
