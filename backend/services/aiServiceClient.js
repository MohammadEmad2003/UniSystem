const axios = require("axios");

const baseURL = (process.env.AI_SERVICE_URL || "http://127.0.0.1:9000").replace(
  /\/+$/,
  ""
);

console.log(`[AI_CLIENT] baseURL=${baseURL}`);

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

const logError = (label, error) => {
  console.error(`[AI_CLIENT] ${label} FAILED:`, {
    message: error.message,
    code: error.code,
    url: error.config?.url,
    status: error.response?.status,
    data: error.response?.data,
  });
};

const askQuestion = async (payload) => {
  console.log(`[AI_CLIENT] POST /rag/ask  payload=${JSON.stringify(payload)}`);
  try {
    const response = await client.post("/rag/ask", payload);
    console.log(`[AI_CLIENT] /rag/ask  status=${response.status}  answer="${String(response.data?.answer||'').slice(0,80)}"`);
    return response.data;
  } catch (error) {
    logError('/rag/ask', error);
    throw buildServiceError(error, "AI service is unavailable");
  }
};

const askGeneral = async (payload) => {
  console.log(`[AI_CLIENT] POST /ai/chat  payload=${JSON.stringify(payload)}`);
  try {
    const response = await client.post("/ai/chat", payload);
    console.log(`[AI_CLIENT] /ai/chat  status=${response.status}`);
    return response.data;
  } catch (error) {
    logError('/ai/chat', error);
    throw buildServiceError(error, "AI service is unavailable");
  }
};

const indexQuestion = async (questionId, payload = {}) => {
  console.log(`[AI_CLIENT] POST /rag/index/question/${questionId}`);
  try {
    const response = await client.post(`/rag/index/question/${questionId}`, payload);
    console.log(`[AI_CLIENT] index/question/${questionId}  status=${response.status}`);
    return response.data;
  } catch (error) {
    logError(`index/question/${questionId}`, error);
    throw buildServiceError(error, "Failed to index question in AI service");
  }
};

const indexMaterial = async (materialId, payload = {}) => {
  console.log(`[AI_CLIENT] POST /rag/index/material/${materialId}`);
  try {
    const response = await client.post(`/rag/index/material/${materialId}`, payload);
    console.log(`[AI_CLIENT] index/material/${materialId}  status=${response.status}`);
    return response.data;
  } catch (error) {
    logError(`index/material/${materialId}`, error);
    throw buildServiceError(error, "Failed to index material in AI service");
  }
};

const indexClass = async (classId, payload = {}) => {
  console.log(`[AI_CLIENT] POST /rag/index/class/${classId}`);
  try {
    const response = await client.post(`/rag/index/class/${classId}`, payload);
    console.log(`[AI_CLIENT] index/class/${classId}  status=${response.status}`);
    return response.data;
  } catch (error) {
    logError(`index/class/${classId}`, error);
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
