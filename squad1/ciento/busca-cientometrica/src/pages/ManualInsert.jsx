import { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  Stack,
  Avatar,
  Fade,
  Stepper,
  Step,
  StepLabel
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import SaveIcon from "@mui/icons-material/Save";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import Header from "../components/Header";
import {
  manualInsertArticle,
  extractMetadata,
  checkApiHealth,
} from "../api";

const ManualInsertPage = () => {
  const [formData, setFormData] = useState({
    "Autor(es)": "",
    "Titulo": "",
    "Subtítulo": "",
    "Ano": "",
    "Número de citações recebidas (Google Scholar)": "",
    "Palavras-chave": "",
    "Resumo": "",
    "Tipo de documento": "",
    "Editora": "",
    "Instituição": "",
    "Local": "",
    "Tipo de trabalho": "",
    "Título do periódico": "",
    "Quartil do periódico": "",
    "Volume": "",
    "Número/fascículo": "",
    "Páginas": "",
    "DOI": "",
    "Numeração": "",
    "Qualis": "",
    "pub_url": "",
  });

  const [searchTitle, setSearchTitle] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeStep, setActiveStep] = useState(0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleExtract = async () => {
    if (!searchTitle && !file) {
      setError("Forneça o título ou o PDF para extração automática.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const extractionData = new FormData();
    if (searchTitle) extractionData.append("title", searchTitle);
    if (file) extractionData.append("file", file);

    try {
      const response = await extractMetadata(extractionData);
      setFormData((prev) => {
        const updated = { ...prev };
        Object.keys(response).forEach(key => {
          if (key in updated) updated[key] = response[key];
        });
        return updated;
      });
      setSuccess("Dados extraídos com sucesso! Revise os campos abaixo.");
      setActiveStep(1);
    } catch (err) {
      setError(err.response?.data?.detail || "Falha na extração por IA.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.Titulo || !formData["Autor(es)"]) {
      setError("Título e Autor(es) são obrigatórios.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await manualInsertArticle(formData, file);
      setSuccess("Artigo catalogado com sucesso na base de dados!");
      setFormData({
        "Autor(es)": "", "Titulo": "", "Subtítulo": "", "Ano": "",
        "Número de citações recebidas (Google Scholar)": "", "Palavras-chave": "",
        "Resumo": "", "Tipo de documento": "", "Editora": "", "Instituição": "",
        "Local": "", "Tipo de trabalho": "", "Título do periódico": "",
        "Quartil do periódico": "", "Volume": "", "Número/fascículo": "",
        "Páginas": "", "DOI": "", "Numeração": "", "Qualis": "", "pub_url": "",
      });
      setSearchTitle("");
      setFile(null);
      setActiveStep(0);
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao salvar artigo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
      <Header />
      
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 6, mb: 4 }}>
        <Container maxWidth="lg">
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton component={RouterLink} to="/home" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 900, color: 'white' }}>Inserção Manual</Typography>
              <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 400, color: 'white' }}>Adicione novas evidências com auxílio de IA</Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <Stepper activeStep={activeStep} sx={{ mb: 6 }}>
          <Step><StepLabel>Extração IA</StepLabel></Step>
          <Step><StepLabel>Revisão de Dados</StepLabel></Step>
          <Step><StepLabel>Finalização</StepLabel></Step>
        </Stepper>

        <Grid container spacing={4}>
          {/* Step 1: Extraction */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 4, borderRadius: 4, height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoFixHighIcon color="secondary" /> 1. Assistente de IA
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Nossa IA pode preencher os campos automaticamente a partir do PDF ou apenas do título.
              </Typography>
              
              <Stack spacing={3}>
                <TextField
                  label="Título do Artigo"
                  placeholder="Cole o título aqui..."
                  fullWidth
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                />
                
                <Box>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    fullWidth
                    sx={{ py: 1.5, borderRadius: 3, borderStyle: 'dashed' }}
                  >
                    Selecionar PDF
                    <input type="file" hidden onChange={handleFileChange} accept="application/pdf" />
                  </Button>
                  {file && <Chip label={file.name} onDelete={() => setFile(null)} color="primary" sx={{ mt: 1, width: '100%' }} />}
                </Box>

                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  onClick={handleExtract}
                  disabled={loading || (!searchTitle && !file)}
                  sx={{ py: 1.5, borderRadius: 3, fontWeight: 800 }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : "Extrair com IA"}
                </Button>
              </Stack>
            </Paper>
          </Grid>

          {/* Step 2: Form */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 4, borderRadius: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                2. Metadados do Artigo
              </Typography>
              
              {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}

              <Grid container spacing={2}>
                {Object.keys(formData).map((key) => {
                  if (key === "pub_url") return null;
                  const isLarge = ["Titulo", "Autor(es)", "Resumo", "Palavras-chave"].includes(key);
                  return (
                    <Grid item xs={12} sm={isLarge ? 12 : 6} key={key}>
                      <TextField
                        name={key}
                        label={key}
                        value={formData[key]}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        multiline={key === "Resumo" || key === "Titulo"}
                        rows={key === "Resumo" ? 4 : 1}
                      />
                    </Grid>
                  );
                })}
              </Grid>

              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSave}
                  disabled={loading || !formData.Titulo}
                  startIcon={<SaveIcon />}
                  sx={{ py: 2, px: 10, borderRadius: '50px', fontWeight: 900 }}
                >
                  {loading ? "Processando..." : "Salvar na Base"}
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ManualInsertPage;
