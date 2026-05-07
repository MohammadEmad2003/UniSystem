const axios = require("axios");

const baseURL = (process.env.AI_SERVICE_URL || "http://localhost:9000").replace(
  /\/+$/,
  ""
);

const client = axios.create({
  baseURL,
  timeout: Number(process.env.AI_SERVICE_TIMEOUT_MS || 60000),
});

const buildServiceError = (error, fallbackMessage) => {
  const serviceMessage =
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.message ||
    fallbackMessage;

  const wrappedError = new Error(serviceMessage);
  wrappedError.statusCode = error.response?.status || 502;
  return wrappedError;
};

const askQuestion = async (payload) => {
  try {
    const response = await client.post("/rag/ask", payload);
    return response.data;
  } catch (error) {
    throw buildServiceError(error, "AI service is unavailable");
  }
};

const askGeneral = async (payload) => {
  try {
    const response = await client.post("/ai/chat", payload);
    return response.data;
  } catch (error) {
    throw buildServiceError(error, "AI service is unavailable");
  }
};

const indexQuestion = async (questionId, payload = {}) => {
  try {
    const response = await client.post(`/rag/index/question/${questionId}`, payload);
    return response.data;
  } catch (error) {
    throw buildServiceError(error, "Failed to index question in AI service");
  }
};

const indexMaterial = async (materialId, payload = {}) => {
  try {
    const response = await client.post(`/rag/index/material/${materialId}`, payload);
    return response.data;
  } catch (error) {
    throw buildServiceError(error, "Failed to index material in AI service");
  }
};

const indexClass = async (classId, payload = {}) => {
  try {
    const response = await client.post(`/rag/index/class/${classId}`, payload);
    return response.data;
  } catch (error) {
    throw buildServiceError(error, "Failed to index class in AI service");
  }
};

// ── Auto re-index with per-class debounce ────────────────────────────────────
// Debounce prevents rapid back-to-back index calls (e.g. bulk uploads).
// The timer is reset each time a new trigger arrives within the window.

const _reindexTimers = new Map(); // classId -> NodeJS.Timeout
const REINDEX_DEBOUNCE_MS = 8000; // 8 s

const triggerReindex = (classId, source = 'unknown') => {
  const key = String(classId);

  if (_reindexTimers.has(key)) {
    clearTimeout(_reindexTimers.get(key));
  }

  const timer = setTimeout(async () => {
    _reindexTimers.delete(key);
    try {
      await indexClass(classId);
      console.log(`[RAG] Auto re-index OK  class=${classId}  source=${source}`);
    } catch (err) {
      console.error(`[RAG] Auto re-index FAIL  class=${classId}  source=${source}:`, err.message);
    }
  }, REINDEX_DEBOUNCE_MS);

  _reindexTimers.set(key, timer);
  console.log(`[RAG] Re-index scheduled  class=${classId}  source=${source}  delay=${REINDEX_DEBOUNCE_MS}ms`);
};

module.exports = {
  askQuestion,
  askGeneral,
  indexQuestion,
  indexMaterial,
  indexClass,
  triggerReindex,
};
