import axios from "axios";

// IMPORTANTE: Use apenas '/api' para que o proxy do Vite funcione.
// Isso evita erros de "Mixed Content" (HTTPS chamando HTTP).
const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para adicionar o token JWT a todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken") || import.meta.env.VITE_JWT_TOKEN;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export const login = async (username, password) => {
  const response = await api.post("/login", { username, password });
  return response.data;
};

export const searchArticles = async (searchParams) => {
  const response = await api.post("/search", searchParams);
  return response.data;
};

export const saveArticles = async (selectedRows) => {
  const response = await api.post("/save", { selectedRows });
  return response.data;
};

export const getCuratedArticles = async () => {
  const response = await api.get("/curation");
  return response.data;
};

export const triggerBatchCuration = async () => {
  const response = await api.post("/trigger-curation");
  return response.data;
};

export const triggerSingleCuration = async (workId) => {
  const response = await api.post("/trigger-curation-single", {
    workId,
  });
  return response.data;
};

export const categorizeArticleRow = async (workId) => {
  const response = await api.post("/categorize-single", {
    workId,
  });
  return response.data;
};

export const deleteArticleRow = async (workId) => {
  const response = await api.post("/delete-row", { workId });
  return response.data;
};

export const deleteUnavailableArticles = async () => {
  const response = await api.post("/delete-unavailable");
  return response.data;
};

export const manualInsertArticle = async (dataToSave, file) => {
  let response;
  if (file) {
    const form = new FormData();
    Object.keys(dataToSave).forEach((k) => form.append(k, dataToSave[k] || ""));
    form.append("file", file, file.name);
    response = await api.post("/manual-insert", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } else {
    response = await api.post("/manual-insert", dataToSave);
  }
  return response.data;
};

export const manualApproveArticle = async (workId, fileName, curatorFeedback, feedbackOnAi, aiFeedback) => {
  const response = await api.post("/manual-approval", {
    workId,
    fileName,
    curatorFeedback,
    feedbackOnAi,
    aiFeedback,
  });
  return response.data;
};

export const batchUploadZip = async (file) => {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post("/batch-upload-zip", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const manualRejectArticle = async (workId, fileName, curatorFeedback, feedbackOnAi, aiFeedback) => {
  const response = await api.post("/manual-rejection", {
    workId,
    fileName,
    curatorFeedback,
    feedbackOnAi,
    aiFeedback,
  });
  return response.data;
};

export const getBatchProgress = async () => {
  const response = await api.get("/batch-progress");
  return response.data;
};

export const getLlmLogs = async () => {
  const response = await api.get("/llm-logs");
  return response.data;
};

export const processLocalFolder = async (folderPath) => {
  const response = await api.post("/batch-process-local-folder", {
    folder_path: folderPath,
  });
  return response.data;
};

export const extractMetadata = async (extractionData) => {
  const response = await api.post("/extract-metadata", extractionData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const fixMissingTitles = async () => {
  const response = await api.post("/fix-titles");
  return response.data;
};

export const updateArticle = async (id, data) => {
  const response = await api.put(`/articles/${id}`, data);
  return response.data;
};

export const downloadAllDocuments = async () => {
  const response = await api.get("/download-all", { responseType: 'blob' });
  return response.data;
};

export const downloadDocument = async (fileName) => {
  const response = await api.get(`/documents/${encodeURIComponent(fileName)}`, { responseType: 'blob' });
  return response.data;
};

export const registerUser = async (username, email, password, role) => {
  const response = await api.post("/register", {
    username,
    email,
    password,
    role,
  });
  return response.data;
};

export const checkApiHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get("/users");
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

export const updateUserPermissions = async (id, role, allowedCategories) => {
  const response = await api.put(`/users/${id}/permissions`, {
    role,
    allowedCategories,
  });
  return response.data;
};

export const getApiBaseUrl = () => {
  // Em desenvolvimento, o proxy do Vite redireciona /api para o backend.
  // Em produção, geralmente é o mesmo domínio ou configurado via env.
  // Como o Swagger está em /api-docs (fora do prefixo /api do backend se não for mapeado),
  // precisamos saber onde o backend está rodando.
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return window.location.origin; // Assume que o backend está no mesmo host
};
