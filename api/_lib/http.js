function sendJson(response, statusCode, body, headers = {}) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");

  for (const [key, value] of Object.entries(headers)) {
    response.setHeader(key, value);
  }

  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_000) {
        reject(Object.assign(new Error("Request body is too large"), { statusCode: 413 }));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error("Invalid JSON body"), { statusCode: 400 }));
      }
    });

    request.on("error", reject);
  });
}

function methodNotAllowed(response, allowedMethods) {
  sendJson(
    response,
    405,
    { error: "METHOD_NOT_ALLOWED", message: "지원하지 않는 메서드입니다." },
    { Allow: allowedMethods.join(", ") }
  );
}

function handleError(response, error) {
  const statusCode = error.statusCode || 500;
  const code = error.code || (statusCode >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST");

  sendJson(response, statusCode, {
    error: code,
    message: error.publicMessage || error.message || "요청을 처리하지 못했습니다."
  });
}

module.exports = {
  handleError,
  methodNotAllowed,
  readJson,
  sendJson
};
