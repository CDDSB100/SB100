import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://172.28.181.92:5001/api";

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
  const response = await api.post("/save", { selected_rows: selectedRows });
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

export const triggerSingleCuration = async (rowNumber) => {
  const response = await api.post("/trigger-curation-single", {
    row_number: rowNumber,
  });
  return response.data;
};

export const categorizeArticleRow = async (rowNumber) => {
  const response = await api.post("/categorize-single", {
    row_number: rowNumber,
  });
  return response.data;
};

export const deleteArticleRow = async (rowNumber) => {
  const response = await api.post("/delete-row", { row_number: rowNumber });
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

export const manualApproveArticle = async (rowNumber, fileName) => {
  const response = await api.post("/manual-approval", {
    row_number: rowNumber,
    fileName: fileName,
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

export const manualRejectArticle = async (rowNumber, fileName) => {
  const response = await api.post("/manual-rejection", {
    row_number: rowNumber,
    fileName: fileName,
  });
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

export const updateUserPermissions = async (id, role, allowed_categories) => {
  const response = await api.put(`/users/${id}/permissions`, {
    role,
    allowed_categories,
  });
  return response.data;
};
