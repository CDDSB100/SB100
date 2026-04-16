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
  ListItemText,
  Rating,
  Switch,
  FormControlLabel,
  Slider
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
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
import DownloadIcon from "@mui/icons-material/Download";
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import ThermostatIcon from '@mui/icons-material/Thermostat';
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
  updateArticle,
  downloadAllDocuments,
  downloadDocument
} from '../../api';

// Standard metadata fields to ensure they always appear
const FIELD_LABELS = {
  title: "Título",
  subtitle: "Subtítulo",
  authors: "Autor(es)",
  year: "Ano",
  citationsCount: "Citações",
  keywords: "Palavras-chave",
  abstract: "Resumo",
  documentType: "Tipo de Documento",
  publisher: "Editora",
  institution: "Instituição",
  location: "Local",
  workType: "Tipo de Trabalho",
  journalTitle: "Periódico",
  journalQuartile: "Quartil",
  volume: "Volume",
  issue: "Fascículo",
  pages: "Páginas",
  doi: "DOI",
  numbering: "Numeração",
  qualis: "Qualis",
  category: "Categoria",
  soilAndRegionCharacteristics: "Características do Solo/Região",
  toolsAndTechniques: "Ferramentas e Técnicas",
  nutrients: "Nutrientes",
  nutrientSupplyStrategies: "Estratégias de Fornecimento",
  cropGroups: "Grupos de Culturas",
  cropsPresent: "Culturas Presentes",
  aiFeedback: "Análise da IA",
  curatorFeedback: "Feedback do Curador",
  feedbackOnAi: "Avaliação sobre a IA",
  scientometricScore: "Score",
  status: "Status"
};

const MASTER_METADATA_FIELDS = [
  "authors",
  "title",
  "subtitle",
  "year",
  "citationsCount",
  "keywords",
  "abstract",
  "documentType",
  "publisher",
  "institution",
  "location",
  "workType",
  "journalTitle",
  "journalQuartile",
  "volume",
  "issue",
  "pages",
  "doi",
  "numbering",
  "qualis",
  "category",
  "soilAndRegionCharacteristics",
  "toolsAndTechniques",
  "nutrients",
  "nutrientSupplyStrategies",
  "cropGroups",
  "cropsPresent",
  "aiFeedback",
  "curatorFeedback",
  "feedbackOnAi",
];

const safelyParseJSON = (str) => {
  if (str === null || str === undefined) return str;
  if (typeof str !== 'string') return str;
  
  const trimmed = str.trim();
  if (trimmed === "" || trimmed === "---" || trimmed === "N/A") return null;

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return str;
    }
  }
  return str;
};

function CurationPage() {
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  
  // Novos estados para Feedback Estruturado
  const [aiEvaluation, setAiEvaluation] = useState({
    is_accurate: true,
    is_useful: true,
    human_correction_notes: "",
    ai_performance_rating: 5,
    adjustment_required: false
  });
  const [aiAnalysis, setAiAnalysis] = useState({
    technical_summary: "",
    agronomic_insights: "",
    relevance_score: 8
  });

  const [pendingAction, setPendingAction] = useState(null); // { rowNumber, fileName, action: 'approve' | 'reject' | 'ai_feedback' }

  // Missing states added below
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allHeaders, setAllHeaders] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  
  const [openLogs, setOpenLogs] = useState(false);
  const [logs, setLogs] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("workId");
  const [sortOrder, setSortOrder] = useState("asc");

  const [isTriggering, setIsTriggering] = useState(false);
  const [processingRow, setProcessingRow] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [analysisResult, setAnalysisResult] = useState(null);
  const [openAnalysisDialog, setOpenAnalysisDialog] = useState(false);
  
  const [previewUrl, setPreviewUrl] = useState("");
  const [openPreview, setOpenPreview] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedResult, setEditedResult] = useState(null);

  console.log("CurationPage rendering, feedbackDialogOpen:", typeof feedbackDialogOpen);

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
        // Coletar cabeçalhos para filtros e ordenação
        const categories = [...new Set(data.map(a => a.category).filter(Boolean))];
        setUniqueCategories(categories);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Falha ao carregar artigos da curadoria.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      const blob = await downloadAllDocuments();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'documentos_curadoria.zip');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setSnackbar({
        open: true,
        message: "Download iniciado com sucesso!",
        severity: "success",
      });
    } catch (err) {
      console.error("Download error:", err);
      setSnackbar({
        open: true,
        message: "Falha ao baixar documentos: " + (err.message || "Erro desconhecido"),
        severity: "error",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSingle = async (fileName) => {
    if (!fileName) return;
    setProcessingRow(fileName);
    try {
      const blob = await downloadDocument(fileName);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setSnackbar({
        open: true,
        message: `Download de "${fileName}" iniciado!`,
        severity: "success",
      });
    } catch (err) {
      console.error("Download error:", err);
      setSnackbar({
        open: true,
        message: "Falha ao baixar documento: " + (err.message || "Erro desconhecido"),
        severity: "error",
      });
    } finally {
      setProcessingRow(null);
    }
  };

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
      const category = (article.category || "").trim();
      const matchCategory = categoryFilter === "all" || category === categoryFilter;

      const currentStatus = article.status || "Pendente";
      
      let statusKey = "pending";
      if (currentStatus === "Aprovado Manualmente") statusKey = "approved_manual";
      else if (currentStatus === "Aprovado por IA") statusKey = "approved_ia";
      else if (currentStatus === "Rejeitado") statusKey = "rejected";

      const matchStatus = statusFilter === "all" || statusKey === statusFilter;

      const title = (article.title || "").toLowerCase();
      const authors = (article.authors || "").toLowerCase();
      const matchSearch = title.includes(searchQuery.toLowerCase()) || authors.includes(searchQuery.toLowerCase());

      return matchCategory && matchStatus && matchSearch;
    });

    return [...filtered].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (valA === null || valA === undefined) valA = "";
      if (valB === null || valB === undefined) valB = "";

      if (sortBy === "workId") {
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
    const approved_manual = articles.filter(a => a.status === "Aprovado Manualmente").length;
    const approved_ia = articles.filter(a => a.status === "Aprovado por IA").length;
    const rejected = articles.filter(a => a.status === "Rejeitado").length;
    const pending = articles.filter(a => a.status === "Pendente" || !a.status).length;
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

  const handleSingleCuration = async (workId) => {
    setProcessingRow(workId);
    try {
      const response = await triggerSingleCuration(workId);
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

  const handleCategorize = async (workId) => {
    setProcessingRow(workId);
    try {
      const response = await categorizeArticleRow(workId);
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
    const workId = article.workId;
    if (!window.confirm(`Excluir artigo "${article.title}"?`)) return;
    setProcessingRow(workId);
    try {
      await deleteArticleRow(workId);
      setSnackbar({ open: true, message: "Artigo removido!", severity: "success" });
      fetchArticles();
    } catch (err) {
      setSnackbar({ open: true, message: "Erro: " + err.message, severity: "error" });
    } finally {
      setProcessingRow(null);
    }
  };

  const handleManualApprove = (article) => {
    setPendingAction({ 
      workId: article.workId, 
      fileName: article.documentUrl, 
      action: 'approve' 
    });
    setFeedbackText(article.curatorFeedback || "");
    
    const currentAiEval = article.feedbackOnAi;
    if (typeof currentAiEval === 'object' && currentAiEval !== null) {
      setAiEvaluation(currentAiEval);
    } else {
      setAiEvaluation({ is_accurate: true, is_useful: true, human_correction_notes: "", ai_performance_rating: 5, adjustment_required: false });
    }

    const currentAiAnalysis = article.aiFeedback;
    if (typeof currentAiAnalysis === 'object' && currentAiAnalysis !== null) {
      setAiAnalysis(currentAiAnalysis);
    } else {
      setAiAnalysis({ technical_summary: article.aiFeedback || "", agronomic_insights: "", relevance_score: 7 });
    }

    setFeedbackDialogOpen(true);
  };

  const handleManualReject = (article) => {
    setPendingAction({ 
      workId: article.workId, 
      fileName: article.documentUrl, 
      action: 'reject' 
    });
    setFeedbackText(article.curatorFeedback || "");
    
    const currentAiEval = article.feedbackOnAi;
    if (typeof currentAiEval === 'object' && currentAiEval !== null) {
      setAiEvaluation(currentAiEval);
    } else {
      setAiEvaluation({ is_accurate: false, is_useful: false, human_correction_notes: "", ai_performance_rating: 1, adjustment_required: true });
    }

    const currentAiAnalysis = article.aiFeedback;
    if (typeof currentAiAnalysis === 'object' && currentAiAnalysis !== null) {
      setAiAnalysis(currentAiAnalysis);
    } else {
      setAiAnalysis({ technical_summary: article.aiFeedback || "", agronomic_insights: "", relevance_score: 3 });
    }
    
    setFeedbackDialogOpen(true);
  };

  const handleAiFeedbackOnly = (article) => {
    setPendingAction({ 
      workId: article.workId, 
      fileName: article.documentUrl, 
      action: 'ai_feedback' 
    });
    setFeedbackText(article.curatorFeedback || "");
    
    const currentAiEval = article.feedbackOnAi;
    if (typeof currentAiEval === 'object' && currentAiEval !== null) {
      setAiEvaluation(currentAiEval);
    } else {
      setAiEvaluation({ is_accurate: true, is_useful: true, human_correction_notes: "", ai_performance_rating: 5, adjustment_required: false });
    }
    setFeedbackDialogOpen(true);
  };

  const confirmFeedbackAction = async () => {
    const { workId, fileName, action } = pendingAction;
    
    if (action !== 'ai_feedback' && !feedbackText.trim()) {
      setSnackbar({ open: true, message: "O feedback do curador é obrigatório.", severity: "warning" });
      return;
    }

    setProcessingRow(workId);
    setFeedbackDialogOpen(false);

    try {
      if (action === 'approve') {
        await manualApproveArticle(workId, fileName, feedbackText, aiEvaluation, aiAnalysis);
        setSnackbar({ open: true, message: "Artigo aprovado manualmente!", severity: "success" });
      } else if (action === 'reject') {
        await manualRejectArticle(workId, fileName, feedbackText, aiEvaluation, aiAnalysis);
        setSnackbar({ open: true, message: "Artigo rejeitado manualmente!", severity: "success" });
      } else if (action === 'ai_feedback') {
        await updateArticle(workId, {
          curatorFeedback: feedbackText,
          feedbackOnAi: aiEvaluation
        });
        setSnackbar({ open: true, message: "Feedback atualizado com sucesso!", severity: "success" });
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
      const token = localStorage.getItem("accessToken");
      finalUrl = `/api/documents/${encodeURIComponent(url)}${token ? `?token=${token}` : ""}`;
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
      // Iniciar edição - Garantir que objetos sejam formatados para edição
      const prepareForEdit = { ...analysisResult };
      Object.keys(prepareForEdit).forEach(key => {
        const val = prepareForEdit[key];
        if (typeof val === 'object' && val !== null) {
          // Caso especial: aiFeedback - mostrar apenas o texto do sumário técnico para o usuário
          if (key === "aiFeedback" && val.technical_summary) {
            prepareForEdit[key] = val.technical_summary;
          } else {
            prepareForEdit[key] = JSON.stringify(val, null, 2);
          }
        }
      });
      setEditedResult(prepareForEdit);
      setIsEditing(true);
    }
  };

  const renderMetadataValue = (fieldKey, value) => {
    if (!value || value === "N/A" || value === "---") return "---";
    
    if (fieldKey === "aiFeedback") {
      const aiFeedback = typeof value === 'string' ? safelyParseJSON(value) : value;
      if (typeof aiFeedback === 'object' && aiFeedback !== null) {
        // Retorna apenas o sumário técnico conforme solicitado pelo usuário
        return aiFeedback.technical_summary || "---";
      }
    }
    
    if (fieldKey === "feedbackOnAi") {
      const aiEval = typeof value === 'string' ? safelyParseJSON(value) : value;
      if (typeof aiEval === 'object' && aiEval !== null) {
        return (
          <Stack spacing={0.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>Precisão: {aiEval.is_accurate ? "✅" : "❌"}</Typography>
              <Rating size="small" value={Number(aiEval.ai_performance_rating) || 0} readOnly />
            </Box>
            {aiEval.human_correction_notes && (
              <Typography variant="body2" sx={{ fontSize: '0.75rem', borderTop: '1px dashed rgba(0,0,0,0.1)', pt: 0.5, mt: 0.5, fontStyle: 'italic' }}>
                Nota: {aiEval.human_correction_notes}
              </Typography>
            )}
          </Stack>
        );
      }
    }

    if (fieldKey === "curatorFeedback") {
        return <Typography variant="body2" sx={{ fontStyle: 'italic', fontWeight: 500 }}>"{value}"</Typography>;
    }

    if (typeof value === 'object') {
      return <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{JSON.stringify(value, null, 2)}</pre>;
    }
    
    return value;
  };

  const handleFieldChange = (fieldKey, value) => {
    setEditedResult(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleSaveChanges = async () => {
    try {
      const id = analysisResult.workId || analysisResult._id;
      
      // Antes de salvar, verificar se precisamos remontar o objeto do aiFeedback
      const dataToSave = { ...editedResult };
      const originalFeedback = safelyParseJSON(analysisResult.aiFeedback);
      
      if (typeof originalFeedback === 'object' && originalFeedback !== null && originalFeedback.technical_summary) {
        // Se mudou o texto, preservamos a estrutura do objeto mas atualizamos o sumário
        dataToSave.aiFeedback = {
          ...originalFeedback,
          technical_summary: editedResult.aiFeedback
        };
      }

      await updateArticle(id, dataToSave);
      setAnalysisResult({ ...dataToSave });
      setIsEditing(false);
      setEditedResult(null);
      setSnackbar({ open: true, message: "Metadados atualizados com sucesso!", severity: "success" });
      fetchArticles();
    } catch (err) {
      setSnackbar({ open: true, message: "Erro ao salvar: " + err.message, severity: "error" });
    }
  };

  const getStatusChip = (article) => {
    const currentStatus = article.status || "Pendente";

    if (currentStatus === "Aprovado Manualmente") 
      return <Chip icon={<CheckCircleIcon />} label="Aprovado Manualmente" color="success" size="small" sx={{ fontWeight: 700 }} />;
    
    if (currentStatus === "Aprovado por IA") 
      return <Chip icon={<AutoFixHighIcon />} label="Aprovado por IA" color="info" size="small" sx={{ fontWeight: 700 }} />;

    if (currentStatus === "Rejeitado") 
      return <Chip icon={<CancelIcon />} label="Rejeitado" color="error" size="small" sx={{ fontWeight: 700 }} />;

    return <Chip icon={<HourglassEmptyIcon />} label="Pendente" color="warning" size="small" sx={{ fontWeight: 700 }} />;
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 10 }}>
      
      
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
              <Tooltip title="Baixar Todos os Documentos Aprovados">
                <IconButton 
                  onClick={handleDownloadAll} 
                  disabled={isDownloading}
                  sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                >
                  {isDownloading ? <CircularProgress size={24} color="inherit" /> : <DownloadIcon />}
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
                  <MenuItem value="workId">Ordem de Inserção</MenuItem>
                  <MenuItem value="title">Título</MenuItem>
                  <MenuItem value="authors">Autores</MenuItem>
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
                <Grid item xs={12} md={4} key={article.workId}>
                  <Fade in timeout={500}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 4, position: 'relative' }}>
                      <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
                        {getStatusChip(article)}
                      </Box>
                      <CardContent sx={{ pt: 5, flexGrow: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                          <CategoryIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'secondary.main', textTransform: 'uppercase' }}>
                            {article.category || "Sem Categoria"}
                          </Typography>
                        </Stack>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.2, height: '3.6em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                          {article.title || "Sem Título"}
                        </Typography>
                        <Stack spacing={1.5}>
                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'primary.light' }}>A</Avatar>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {article.authors || "Autor Desconhecido"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'grey.300' }}>D</Avatar>
                            <Typography variant="body2" color="text.secondary">DOI: {article.doi || "N/A"}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'success.light' }}>I</Avatar>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                              Inserido por: <strong>{article.insertedBy || "Sistema"}</strong>
                            </Typography>
                          </Box>
                          {article.approvedBy && (
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                              <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'info.light' }}>C</Avatar>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                Curador: <strong>{article.approvedBy}</strong>
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                        
                        {/* 1. ANÁLISE DA INTELIGÊNCIA ARTIFICIAL (aiFeedback) */}
                        {(() => {
                          const val = article.aiFeedback;
                          const aiFeedback = typeof val === 'string' ? safelyParseJSON(val) : val;
                          
                          if (!aiFeedback || aiFeedback === "N/A" || aiFeedback === "---") return null;

                          return (
                            <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(79, 193, 255, 0.05)', borderRadius: 3, borderLeft: '4px solid', borderColor: '#4fc1ff' }}>
                              <Typography variant="caption" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, color: '#4fc1ff' }}>
                                <AutoFixHighIcon fontSize="small" /> ANÁLISE DA INTELIGÊNCIA ARTIFICIAL:
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                {typeof aiFeedback === 'object' ? aiFeedback.technical_summary : aiFeedback}
                              </Typography>
                            </Box>
                          );
                        })()}

                        {/* 2. FEEDBACK DO CURADOR (Manual) */}
                        {article.curatorFeedback && article.curatorFeedback !== "N/A" && article.curatorFeedback !== "---" && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(76, 175, 80, 0.05)', borderRadius: 3, borderLeft: '4px solid', borderColor: '#4caf50' }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, color: '#4caf50' }}>
                              <ScienceIcon fontSize="small" /> RELEVÂNCIA TÉCNICA (HUMANO):
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
                              "{article.curatorFeedback}"
                            </Typography>
                          </Box>
                        )}

                        {/* 3. FEEDBACK SOBRE A IA (Observation about AI) */}
                        {(() => {
                          const val = article.feedbackOnAi;
                          const aiEvaluationField = typeof val === 'string' ? safelyParseJSON(val) : val;
                          if (!aiEvaluationField || aiEvaluationField === "N/A" || aiEvaluationField === "---") return null;

                          return (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255, 152, 0, 0.05)', borderRadius: 3, borderLeft: '4px solid', borderColor: '#ff9800' }}>
                              <Typography variant="caption" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, color: '#ff9800' }}>
                                <VisibilityIcon fontSize="small" /> AVALIAÇÃO DO MODELO:
                              </Typography>
                              {typeof aiEvaluationField === 'object' ? (
                                <Stack spacing={0.5}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption">Precisão: {aiEvaluationField.is_accurate ? "✅" : "❌"}</Typography>
                                    <Rating size="small" value={aiEvaluationField.ai_performance_rating} readOnly />
                                  </Box>
                                  {aiEvaluationField.human_correction_notes && (
                                    <Typography variant="body2" sx={{ fontSize: '0.75rem', borderTop: '1px dashed #ff980033', pt: 0.5 }}>
                                      Note: {aiEvaluationField.human_correction_notes}
                                    </Typography>
                                  )}
                                </Stack>
                              ) : (
                                <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
                                  "{aiEvaluationField}"
                                </Typography>
                              )}
                            </Box>
                          );
                        })()}
                      </CardContent>
                      <Divider />
                      <CardActions sx={{ p: 2, justifyContent: 'space-between', bgcolor: 'grey.50' }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Visualizar PDF">
                            <IconButton 
                              color="primary" 
                              onClick={() => handlePreview(article.documentUrl)}
                              disabled={!article.documentUrl}
                              sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}
                            >
                              <PictureAsPdfIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Baixar PDF">
                            <IconButton 
                              color="primary" 
                              onClick={() => handleDownloadSingle(article.documentUrl)}
                              disabled={!article.documentUrl}
                              sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}
                            >
                              {processingRow === article.documentUrl ? <CircularProgress size={20} /> : <DownloadIcon fontSize="small" />}
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
                              onClick={() => handleSingleCuration(article.workId)}
                              disabled={processingRow === article.workId}
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
                            onClick={() => handleManualApprove(article)}
                            disabled={processingRow === article.workId}
                            sx={{ borderRadius: '50px' }}
                          >
                            Aprovar
                          </Button>

                          <Button 
                            variant="contained" 
                            size="small" 
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => handleManualReject(article)}
                            disabled={processingRow === article.workId}
                            sx={{ borderRadius: '50px' }}
                          >
                            Rejeitar
                          </Button>

                          <Tooltip title="Excluir Registro">
                            <IconButton 
                              color="default"
                              onClick={() => handleDelete(article)}
                              disabled={processingRow === article.workId}
                              sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </CardActions>
                      {processingRow === article.workId && <LinearProgress sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} />}
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
              {/* Render Standard Fields first */}
              {MASTER_METADATA_FIELDS.map((fieldKey) => {
                const label = FIELD_LABELS[fieldKey] || fieldKey;
                const value = analysisResult[fieldKey];
                
                const isFullWidth = fieldKey === "abstract" || fieldKey === "title" || fieldKey.includes("Feedback");
                
                return (
                  <Grid item xs={12} sm={isFullWidth ? 12 : 6} key={fieldKey}>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        label={label}
                        value={editedResult[fieldKey] || ""}
                        onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                        multiline={fieldKey === "abstract" || fieldKey.includes("Feedback") || fieldKey === "keywords"}
                        rows={fieldKey === "abstract" ? 4 : (fieldKey.includes("Feedback") ? 6 : 1)}
                        variant="outlined"
                      />
                    ) : (
                      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 3, height: '100%' }}>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Typography>
                        <Box sx={{ mt: 0.5, wordBreak: 'break-word' }}>
                          {renderMetadataValue(fieldKey, value)}
                        </Box>
                      </Box>
                    )}
                  </Grid>
                );
              })}

              {/* Render any extra fields found in the object that are not in MASTER_METADATA_FIELDS */}
              {Object.keys(analysisResult).map((key) => {
                if (MASTER_METADATA_FIELDS.includes(key) || 
                    key.startsWith("_") || 
                    key === "createdAt" || 
                    key === "updatedAt" || 
                    key === "__v" || 
                    key === "workId" ||
                    key === "status") return null;
                
                return (
                  <Grid item xs={12} sm={6} key={key}>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        label={key}
                        value={editedResult[key] || ""}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        variant="outlined"
                      />
                    ) : (
                      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 3, height: '100%' }}>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>{key}</Typography>
                        <Box sx={{ mt: 0.5, wordBreak: 'break-word' }}>
                          {renderMetadataValue(key, analysisResult[key])}
                        </Box>
                      </Box>
                    )}
                  </Grid>
                );
              })}
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
              <Button onClick={() => handleCategorize(analysisResult.workId)} startIcon={<CategoryIcon />} color="secondary" variant="outlined" sx={{ borderRadius: '50px' }}>Recategorizar</Button>
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
      <Dialog open={feedbackDialogOpen} onClose={() => setFeedbackDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900, bgcolor: pendingAction?.action === 'approve' ? 'success.main' : (pendingAction?.action === 'reject' ? 'error.main' : 'info.main'), color: 'white', py: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            {pendingAction?.action === 'approve' ? <CheckCircleIcon fontSize="large" /> : (pendingAction?.action === 'reject' ? <CancelIcon fontSize="large" /> : <AutoFixHighIcon fontSize="large" />)}
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              {pendingAction?.action === 'approve' ? 'Curadoria: Aprovação Técnica' : (pendingAction?.action === 'reject' ? 'Curadoria: Rejeição de Documento' : 'Atualizar Feedback de IA')}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 700, color: 'text.secondary' }}>
            Preencha os metadados de curadoria para o "Human-in-the-loop".
          </Typography>
          
          <Grid container spacing={4}>
            {/* Feedback do Curador */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScienceIcon color="primary" /> Relevância Técnica (Humano)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Descreva a importância deste artigo para o produtor"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Ex: Fundamental para o manejo de estresse hídrico em citros..."
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12}><Divider sx={{ borderStyle: 'dashed' }} /></Grid>

            {/* Análise da IA (Ajustável pelo Curador) */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoFixHighIcon color="info" /> Análise Automática da IA
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Resumo Técnico da IA"
                  multiline
                  rows={2}
                  value={aiAnalysis.technical_summary}
                  onChange={(e) => setAiAnalysis({...aiAnalysis, technical_summary: e.target.value})}
                />
                <TextField
                  fullWidth
                  label="Insights Agronômicos"
                  value={aiAnalysis.agronomic_insights}
                  onChange={(e) => setAiAnalysis({...aiAnalysis, agronomic_insights: e.target.value})}
                />
                <Box>
                  <Typography gutterBottom variant="caption" sx={{ fontWeight: 700 }}>Pontuação de Relevância (0-10): {aiAnalysis.relevance_score}</Typography>
                  <Slider
                    value={aiAnalysis.relevance_score}
                    step={0.1}
                    min={0}
                    max={10}
                    valueLabelDisplay="auto"
                    onChange={(e, val) => setAiAnalysis({...aiAnalysis, relevance_score: val})}
                  />
                </Box>
              </Stack>
            </Grid>

            {/* Avaliação da IA pelo Humano */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <VisibilityIcon color="secondary" /> Avaliação sobre a IA
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>A análise foi precisa?</Typography>
                  <Switch checked={aiEvaluation.is_accurate} onChange={(e) => setAiEvaluation({...aiEvaluation, is_accurate: e.target.checked})} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>A análise foi útil?</Typography>
                  <Switch checked={aiEvaluation.is_useful} onChange={(e) => setAiEvaluation({...aiEvaluation, is_useful: e.target.checked})} />
                </Box>
                <Box>
                  <Typography gutterBottom variant="body2" sx={{ fontWeight: 600 }}>Desempenho da IA:</Typography>
                  <Rating value={aiEvaluation.ai_performance_rating} onChange={(e, val) => setAiEvaluation({...aiEvaluation, ai_performance_rating: val})} />
                </Box>
                <TextField
                  fullWidth
                  label="Notas de Correção Humana"
                  multiline
                  rows={2}
                  value={aiEvaluation.human_correction_notes}
                  onChange={(e) => setAiEvaluation({...aiEvaluation, human_correction_notes: e.target.value})}
                  placeholder="O que a IA ignorou ou errou?"
                />
                <FormControlLabel
                  control={<Switch checked={aiEvaluation.adjustment_required} onChange={(e) => setAiEvaluation({...aiEvaluation, adjustment_required: e.target.checked})} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Requer ajuste de prompt?</Typography>}
                />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: 'grey.50' }}>
          <Button onClick={() => setFeedbackDialogOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>Cancelar</Button>
          <Button 
            onClick={confirmFeedbackAction} 
            variant="contained" 
            color={pendingAction?.action === 'approve' ? 'success' : (pendingAction?.action === 'reject' ? 'error' : 'info')}
            disabled={pendingAction?.action !== 'ai_feedback' && !feedbackText.trim()}
            startIcon={pendingAction?.action === 'approve' ? <CheckCircleIcon /> : (pendingAction?.action === 'reject' ? <CancelIcon /> : <SaveIcon />)}
            sx={{ borderRadius: '50px', px: 4, fontWeight: 800, py: 1.5 }}
          >
            {pendingAction?.action === 'ai_feedback' ? 'Salvar Feedback' : `Finalizar ${pendingAction?.action === 'approve' ? 'Aprovação' : 'Rejeição'}`}
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
