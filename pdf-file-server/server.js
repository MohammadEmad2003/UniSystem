const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const loadEnvFile = () => {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadEnvFile();

const app = express();
const PORT = process.env.PORT || 3001;
const DOWNLOADS_DIR = path.resolve(
  process.env.DOWNLOADS_DIR || "C:/Users/ASUS/Downloads"
);

app.use(cors());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PDF file server is running",
    usage: "/files/<filename>",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PDF file server is running",
    files_route: "/files",
  });
});

app.get("/files/*filePath", (req, res, next) => {
  try {
    const requestedPath = Array.isArray(req.params.filePath)
      ? req.params.filePath.join("/")
      : req.params.filePath;

    if (!requestedPath) {
      return res.status(400).json({
        success: false,
        message: "File path is required",
      });
    }

    const decodedPath = decodeURIComponent(requestedPath);
    const absoluteFilePath = path.resolve(DOWNLOADS_DIR, decodedPath);

    if (!absoluteFilePath.startsWith(DOWNLOADS_DIR)) {
      console.error(`Denied access attempt: ${absoluteFilePath}`);
      return res.status(403).json({
        success: false,
        message: "Access to this file path is not allowed",
      });
    }

    fs.stat(absoluteFilePath, (error, stats) => {
      if (error || !stats.isFile()) {
        console.error(`File not found: ${absoluteFilePath}`);
        return res.status(404).json({
          success: false,
          message: "File not found",
        });
      }

      res.sendFile(absoluteFilePath, (sendError) => {
        if (sendError) {
          next(sendError);
        }
      });
    });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((error, req, res, next) => {
  console.error("File server error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`PDF server running at http://localhost:${PORT}`);
  console.log(`Serving files from: ${DOWNLOADS_DIR}`);
});
