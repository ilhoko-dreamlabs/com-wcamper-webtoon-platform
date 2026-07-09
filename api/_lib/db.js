const { Pool } = require("pg");

let pool;

function databaseUrl() {
  return process.env.WEBTOON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
}

function getPool() {
  const connectionString = databaseUrl();

  if (!connectionString) {
    throw Object.assign(new Error("WEBTOON_DATABASE_URL, POSTGRES_URL, or DATABASE_URL is required"), {
      statusCode: 503,
      code: "DB_NOT_CONFIGURED",
      publicMessage: "웹툰 DB 환경변수가 설정되지 않았습니다."
    });
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: process.env.WEBTOON_DATABASE_SSL === "disable" ? false : { rejectUnauthorized: false }
    });
  }

  return pool;
}

async function query(text, params = []) {
  return getPool().query(text, params);
}

async function transaction(callback) {
  const client = await getPool().connect();

  try {
    await client.query("begin");
    const result = await callback((text, params = []) => client.query(text, params));
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  query,
  transaction
};
