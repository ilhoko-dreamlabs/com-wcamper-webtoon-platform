const TARGET_TYPES = new Set(["AUTHOR", "SERIES", "EPISODE"]);

function requiredString(value, name, minLength, maxLength) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (normalized.length < minLength || normalized.length > maxLength) {
    throw Object.assign(new Error(`${name} length is invalid`), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "입력값 길이를 확인해주세요."
    });
  }

  return normalized;
}

function optionalUrl(value, name) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    return null;
  }

  if (normalized.length > 500) {
    throw Object.assign(new Error(`${name} is too long`), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "URL 길이를 확인해주세요."
    });
  }

  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Unsupported protocol");
    }
  } catch {
    throw Object.assign(new Error(`${name} must be a valid URL`), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "URL 형식을 확인해주세요."
    });
  }

  return normalized;
}

function normalizeTargetType(value) {
  const targetType = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (!TARGET_TYPES.has(targetType)) {
    throw Object.assign(new Error("Invalid targetType"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "피드백 대상을 확인해주세요."
    });
  }

  return targetType;
}

module.exports = {
  normalizeTargetType,
  optionalUrl,
  requiredString
};
