const { query } = require("./db");

const SETTING_DEFINITIONS = {
  "creatorApplications.enabled": {
    label: "작가모집 상태",
    public: true,
    defaultValue: true,
    validate: (value) => typeof value === "boolean"
  },
  "feedback.enabled": {
    label: "피드백 작성",
    public: true,
    defaultValue: true,
    validate: (value) => typeof value === "boolean"
  },
  "feedback.moderationMode": {
    label: "피드백 검수 방식",
    public: true,
    defaultValue: "post",
    validate: (value) => ["post", "pre", "closed"].includes(value)
  },
  "creatorTraining.visible": {
    label: "교육자료 노출",
    public: true,
    defaultValue: true,
    validate: (value) => typeof value === "boolean"
  },
  siteNotice: {
    label: "메인 공지",
    public: true,
    defaultValue: null,
    validate: validateNotice
  },
  maintenanceBanner: {
    label: "점검 배너",
    public: true,
    defaultValue: null,
    validate: validateNotice
  },
  "partnership.enabled": {
    label: "협업문의 상태",
    public: true,
    defaultValue: true,
    validate: (value) => typeof value === "boolean"
  },
  "adminNotification.email": {
    label: "관리자 알림 수신",
    public: false,
    defaultValue: null,
    validate: (value) => value === null || (typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
  }
};

function validateNotice(value) {
  if (value === null) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const body = typeof value.body === "string" ? value.body.trim() : "";
  const enabled = typeof value.enabled === "boolean" ? value.enabled : true;
  return typeof enabled === "boolean" && title.length <= 80 && body.length <= 500;
}

function defaultSettings({ publicOnly = false } = {}) {
  return Object.fromEntries(
    Object.entries(SETTING_DEFINITIONS)
      .filter(([, definition]) => !publicOnly || definition.public)
      .map(([key, definition]) => [key, {
        key,
        label: definition.label,
        value: definition.defaultValue,
        public: definition.public,
        source: "default"
      }])
  );
}

function isMissingSettingsStore(error) {
  return ["DB_NOT_CONFIGURED", "42P01", "3D000", "ECONNREFUSED", "ENOTFOUND"].includes(error.code);
}

function validateSettingValue(key, value) {
  const definition = SETTING_DEFINITIONS[key];

  if (!definition) {
    throw Object.assign(new Error("Unsupported site setting key"), {
      statusCode: 404,
      code: "SETTING_NOT_FOUND",
      publicMessage: "지원하지 않는 설정 항목입니다."
    });
  }

  if (!definition.validate(value)) {
    throw Object.assign(new Error("Invalid site setting value"), {
      statusCode: 400,
      code: "SETTING_VALIDATION_ERROR",
      publicMessage: "설정값 형식을 확인해주세요."
    });
  }

  return value;
}

async function listSiteSettings({ publicOnly = false } = {}) {
  const settings = defaultSettings({ publicOnly });
  const keys = Object.keys(settings);

  try {
    const result = await query(
      `select key, value, updated_by as "updatedBy", updated_at as "updatedAt"
       from site_settings
       where key = any($1::text[])`,
      [keys]
    );

    result.rows.forEach((row) => {
      if (!settings[row.key]) return;
      settings[row.key] = {
        ...settings[row.key],
        value: row.value,
        source: "database",
        updatedBy: row.updatedBy,
        updatedAt: row.updatedAt
      };
    });

    return {
      settings,
      persistence: "database"
    };
  } catch (error) {
    if (isMissingSettingsStore(error)) {
      return {
        settings,
        persistence: "default",
        warning: "site_settings table or database connection is not available"
      };
    }

    throw error;
  }
}

async function updateSiteSetting(key, value, admin) {
  const validatedValue = validateSettingValue(key, value);

  try {
    const result = await query(
      `insert into site_settings (key, value, updated_by, updated_at)
       values ($1, $2::jsonb, $3, now())
       on conflict (key)
       do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()
       returning key, value, updated_by as "updatedBy", updated_at as "updatedAt"`,
      [key, JSON.stringify(validatedValue), admin.id]
    );

    return {
      ...result.rows[0],
      label: SETTING_DEFINITIONS[key].label,
      public: SETTING_DEFINITIONS[key].public,
      source: "database"
    };
  } catch (error) {
    if (isMissingSettingsStore(error)) {
      throw Object.assign(new Error("site_settings table is not available"), {
        statusCode: 503,
        code: "SETTINGS_STORE_NOT_READY",
        publicMessage: "사이트 설정 저장소가 아직 준비되지 않았습니다."
      });
    }

    throw error;
  }
}

module.exports = {
  SETTING_DEFINITIONS,
  defaultSettings,
  isMissingSettingsStore,
  listSiteSettings,
  updateSiteSetting,
  validateSettingValue
};
