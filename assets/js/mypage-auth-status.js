(function () {
  const data = window.WCAMPER_WEBTOON || {};
  const authConfig = data.feedback?.authProvider || {};
  let state = { checked: false, authenticated: false, error: null };
  let loading = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function maskEmail(email) {
    if (!email || !String(email).includes("@")) return "";
    const [localPart, domain] = String(email).split("@");
    const visibleLocal = localPart.slice(0, Math.min(2, localPart.length));
    return `${visibleLocal}${localPart.length > 2 ? "***" : "*"}@${domain}`;
  }

  function currentReturnTo() {
    return `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  function buildLoginUrl() {
    const url = new URL("/login", authConfig.loginUrl || "https://auth.wcamper.com/login");
    url.searchParams.set("service", authConfig.service || "wcamper-webtoon");
    url.searchParams.set("returnTo", currentReturnTo());
    return url.toString();
  }

  function userDisplayName(user) {
    if (!user) return "통합회원";
    return user.displayName || user.name || user.nickname || user.email?.split("@")[0] || "통합회원";
  }

  function statusLabel(status, fallback = "상태 확인") {
    const labels = {
      PENDING: "접수됨",
      REVIEWING: "검토중",
      APPROVED: "승인됨",
      REJECTED: "반려됨",
      ACTIVE: "활성",
      INACTIVE: "비활성",
      SUSPENDED: "중지"
    };
    return labels[String(status || "").toUpperCase()] || fallback;
  }

  async function loadState() {
    if (loading) return loading;
    loading = fetch(authConfig.meUrl || "/api/me", {
      credentials: "include",
      headers: { Accept: "application/json" }
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("회원 상태를 확인하지 못했습니다.");
        const payload = await response.json();
        state = {
          checked: true,
          authenticated: Boolean(payload.authenticated),
          profileComplete: Boolean(payload.profileComplete),
          user: payload.user || null,
          author: payload.author || null,
          authorApplication: payload.authorApplication || null,
          error: null
        };
      })
      .catch(() => {
        state = { checked: true, authenticated: false, error: true };
      });
    return loading;
  }

  function summaryText() {
    if (!state.checked) return "통합로그인 상태를 확인하고 있습니다.";
    if (state.error) return "회원 상태 확인에 실패했습니다. 잠시 후 다시 시도해주세요.";
    if (!state.authenticated) {
      return "통합로그인이 필요합니다. 로그인 완료 시 최근 본 웹툰과 피드백 현황을 개인 데이터로 표시합니다.";
    }
    const profileText = state.profileComplete ? "프로필 완료" : "프로필 미완료";
    const authorText = state.author
      ? `작가 ${statusLabel(state.author.status, "등록됨")}`
      : state.authorApplication
        ? `작가신청 ${statusLabel(state.authorApplication.status, "접수됨")}`
        : "일반회원";
    return `${profileText} 상태의 ${authorText}입니다.`;
  }

  function panelHtml() {
    const loginUrl = buildLoginUrl();

    if (!state.checked) {
      return `
        <div class="account-status-card">
          <span class="status-pill neutral">확인중</span>
          <h3>로그인 상태 확인 중</h3>
          <p>통합로그인 세션과 웹툰 서비스 회원 상태를 확인하고 있습니다.</p>
        </div>
      `;
    }

    if (state.error) {
      return `
        <div class="account-status-card">
          <span class="status-pill warning">확인 실패</span>
          <h3>회원 상태를 불러오지 못했습니다</h3>
          <p>잠시 후 다시 접속하거나 통합로그인 상태를 확인해주세요.</p>
          <a class="button primary" href="${escapeHtml(loginUrl)}">통합로그인</a>
        </div>
      `;
    }

    if (!state.authenticated) {
      return `
        <div class="account-status-card">
          <span class="status-pill warning">로그인 필요</span>
          <h3>통합로그인이 필요합니다</h3>
          <p>로그인하면 관심작, 피드백 작성 조건, 작가신청 상태를 이 화면에서 확인할 수 있습니다.</p>
          <a class="button primary" href="${escapeHtml(loginUrl)}">통합로그인</a>
        </div>
      `;
    }

    const author = state.author;
    const application = state.authorApplication;
    const isActiveAuthor = String(author?.status || "").toUpperCase() === "ACTIVE";
    const authorLabel = author
      ? `작가 ${statusLabel(author.status, "등록됨")}`
      : application
        ? `작가신청 ${statusLabel(application.status, "접수됨")}`
        : "일반회원";
    const email = maskEmail(state.user?.email);

    return `
      <div class="account-status-card">
        <span class="status-pill success">로그인됨</span>
        <h3>${escapeHtml(userDisplayName(state.user))}</h3>
        <p class="account-email">${email ? escapeHtml(email) : "통합계정 정보 확인됨"}</p>
        <dl class="account-status-list">
          <div>
            <dt>프로필</dt>
            <dd><span class="status-pill ${state.profileComplete ? "success" : "warning"}">${state.profileComplete ? "프로필 완료" : "프로필 미완료"}</span></dd>
          </div>
          <div>
            <dt>작가 상태</dt>
            <dd><span class="status-pill ${isActiveAuthor ? "success" : "neutral"}">${escapeHtml(authorLabel)}</span></dd>
          </div>
        </dl>
        <div class="account-actions">
          <a class="button primary" href="${state.profileComplete ? "/webtoons" : escapeHtml(authConfig.signupUrl || loginUrl)}"${state.profileComplete ? " data-link" : ""}>${state.profileComplete ? "웹툰 보러가기" : "프로필 완료하기"}</a>
          <a class="button ghost" href="${isActiveAuthor ? "/creator-studio" : "/creators"}" data-link>${isActiveAuthor ? "작가페이지" : application ? "작가신청 보기" : "작가로 참여하기"}</a>
        </div>
      </div>
    `;
  }

  function renderPanel() {
    if (window.location.pathname.replace(/\/+$/, "") !== "/mypage") return;
    const main = document.querySelector("#main");
    const hero = main?.querySelector(".page-hero");
    if (!main || !hero || main.querySelector(".account-status-section")) return;

    const infoText = hero.querySelector(".info-panel p");
    if (infoText) infoText.textContent = summaryText();

    const section = document.createElement("section");
    section.className = "section account-status-section";
    section.setAttribute("data-mypage-auth-status", "");
    section.innerHTML = `
      <div class="section-heading">
        <p class="eyebrow">Account</p>
        <h2>로그인 상태</h2>
      </div>
      ${panelHtml()}
    `;
    hero.insertAdjacentElement("afterend", section);
  }

  function updateHeaderLinks() {
    const memberLink = document.querySelector('[data-auth-label="member"]');
    const creatorLink = document.querySelector('[data-auth-label="creator"]');
    const loginUrl = buildLoginUrl();
    const isActiveAuthor = String(state.author?.status || "").toUpperCase() === "ACTIVE";

    if (memberLink) {
      memberLink.setAttribute("href", state.authenticated ? "/mypage" : loginUrl);
      memberLink.toggleAttribute("data-link", state.authenticated);
      memberLink.setAttribute("title", state.authenticated ? "마이페이지" : "통합로그인");
      memberLink.setAttribute("aria-label", state.authenticated ? "마이페이지" : "통합로그인");
    }

    if (creatorLink) {
      const href = !state.authenticated ? loginUrl : isActiveAuthor ? "/creator-studio" : "/creators";
      const label = !state.authenticated
        ? "통합로그인 후 작가신청"
        : isActiveAuthor
          ? "작가페이지"
          : state.authorApplication
            ? "작가신청 상태"
            : "작가신청";
      creatorLink.setAttribute("href", href);
      creatorLink.toggleAttribute("data-link", state.authenticated);
      creatorLink.setAttribute("title", label);
      creatorLink.setAttribute("aria-label", label);
    }
  }

  function scheduleRender() {
    window.setTimeout(() => {
      renderPanel();
      updateHeaderLinks();
    }, 0);
  }

  loadState().then(scheduleRender);
  window.addEventListener("popstate", scheduleRender);
  document.addEventListener("click", () => window.setTimeout(scheduleRender, 50));

  const main = document.querySelector("#main");
  if (main) {
    new MutationObserver(scheduleRender).observe(main, { childList: true });
  }
})();
