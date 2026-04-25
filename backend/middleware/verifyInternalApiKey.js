const crypto = require("crypto");

const verifyInternalApiKey = (req, res, next) => {
  const configuredApiKey = process.env.INTERNAL_API_KEY;

  if (!configuredApiKey) {
    const error = new Error("Internal API key is not configured");
    error.statusCode = 500;
    return next(error);
  }

  const providedApiKey =
    req.headers["x-internal-api-key"] ||
    req.headers["x-api-key"] ||
    req.headers.authorization?.split(" ")[1];

  if (!providedApiKey) {
    const error = new Error("Internal API key is required");
    error.statusCode = 401;
    return next(error);
  }

  const expectedBuffer = Buffer.from(configuredApiKey, "utf8");
  const providedBuffer = Buffer.from(String(providedApiKey), "utf8");

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    const error = new Error("Invalid internal API key");
    error.statusCode = 401;
    return next(error);
  }

  next();
};

module.exports = verifyInternalApiKey;
