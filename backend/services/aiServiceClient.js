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

module.exports = {
  askQuestion,
  indexQuestion,
  indexMaterial,
  indexClass,
};
