const heroSection = document.getElementById("hero");
const heroTitle = document.getElementById("heroTitle");
const heroDescription = document.getElementById("heroDescription");
const heroYear = document.getElementById("heroYear");
const heroDuration = document.getElementById("heroDuration");
const heroRating = document.getElementById("heroRating");
const heroPlayButton = document.getElementById("heroPlayButton");
const heroDetailsButton = document.getElementById("heroDetailsButton");
const heroPrevButton = document.getElementById("heroPrevButton");
const heroNextButton = document.getElementById("heroNextButton");
const heroIndicators = document.getElementById("heroIndicators");

const continueSection = document.getElementById("continue-section");
const continueContainer = document.getElementById("continueContainer");
const catalogContainer = document.getElementById("catalogContainer");
const catalogPagination = document.getElementById("catalogPagination");
const myListContainer = document.getElementById("myListContainer");
const searchInput = document.getElementById("searchInput");
const cardTemplate = document.getElementById("cardTemplate");

const playerModal = document.getElementById("playerModal");
const playerContainer = document.getElementById("playerContainer");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalHint = document.getElementById("modalHint");
const closePlayerButton = document.getElementById("closePlayerButton");

const detailsPage = document.getElementById("detailsPage");
const detailsCategory = document.getElementById("detailsCategory");
const detailsTitle = document.getElementById("detailsTitle");
const detailsDescription = document.getElementById("detailsDescription");
const detailsYear = document.getElementById("detailsYear");
const detailsDuration = document.getElementById("detailsDuration");
const detailsRating = document.getElementById("detailsRating");
const detailsPlayButton = document.getElementById("detailsPlayButton");
const detailsListButton = document.getElementById("detailsListButton");
const detailsRelatedContainer = document.getElementById("detailsRelatedContainer");
const backFromDetailsButton = document.getElementById("backFromDetailsButton");

const STORAGE_LIST_KEY = "cine_plus_my_list";
const STORAGE_PROGRESS_KEY = "cine_plus_progress";

let allVideos = [];
let filteredVideos = [];
let heroVideos = [];

let myListSlugs = new Set();
let watchProgress = {};

let currentDetailsVideo = null;
let currentHeroIndex = 0;
let heroTimer = null;
let activePlayerCleanup = null;
let currentCatalogPage = 1;
let catalogPageSize = calculateCatalogPageSize();

init();

async function init() {
  try {
    myListSlugs = loadMyList();
    watchProgress = loadProgress();

    allVideos = await loadVideosFromMarkdown("videos.md");
    allVideos = ensureUniqueSlugs(
      allVideos.map((video) => ({ ...video, slug: video.slug || slugify(video.titulo) }))
    );

    if (!allVideos.length) {
      renderEmptyState(catalogContainer, "Nenhum video encontrado no arquivo videos.md.");
      renderEmptyState(myListContainer, "Sua lista esta vazia.");
      continueSection.classList.add("is-hidden");
      return;
    }

    filteredVideos = [...allVideos];
    heroVideos = pickHeroVideos(allVideos);

    renderHero();
    renderHeroIndicators();
    renderCatalog(filteredVideos);
    renderMyList();
    renderContinueWatching();
    bindEvents();
    startHeroAutoRotate();
    handleHashRoute();
  } catch (error) {
    renderEmptyState(
      catalogContainer,
      "Falha ao carregar o catalogo. Rode em servidor local e confira o videos.md."
    );
    renderEmptyState(myListContainer, "Sua lista esta vazia.");
    continueSection.classList.add("is-hidden");
    console.error(error);
  }
}

function bindEvents() {
  heroPlayButton.addEventListener("click", () => {
    const video = heroVideos[currentHeroIndex];
    if (video) openPlayer(video);
  });

  heroDetailsButton.addEventListener("click", () => {
    const video = heroVideos[currentHeroIndex];
    if (video) openDetailsPage(video, { updateHash: true });
  });

  heroPrevButton.addEventListener("click", () => {
    moveHero(-1);
    restartHeroAutoRotate();
  });

  heroNextButton.addEventListener("click", () => {
    moveHero(1);
    restartHeroAutoRotate();
  });

  closePlayerButton.addEventListener("click", closePlayer);
  playerModal.addEventListener("click", (event) => {
    if (event.target === playerModal) closePlayer();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && playerModal.classList.contains("is-open")) {
      closePlayer();
    }
  });

  searchInput.addEventListener("input", (event) => {
    const term = event.target.value.toLowerCase().trim();
    filteredVideos = allVideos.filter((video) =>
      [video.titulo, video.categoria, video.descricao].join(" ").toLowerCase().includes(term)
    );
    currentCatalogPage = 1;
    renderCatalog(filteredVideos);
  });

  window.addEventListener("resize", () => {
    const nextPageSize = calculateCatalogPageSize();
    if (nextPageSize !== catalogPageSize) {
      catalogPageSize = nextPageSize;
      currentCatalogPage = 1;
      renderCatalog(filteredVideos);
    }
  });

  backFromDetailsButton.addEventListener("click", () => {
    window.location.hash = "";
    closeDetailsPage();
  });

  detailsPlayButton.addEventListener("click", () => {
    if (currentDetailsVideo) openPlayer(currentDetailsVideo);
  });

  detailsListButton.addEventListener("click", () => {
    if (!currentDetailsVideo) return;
    toggleMyList(currentDetailsVideo.slug);
  });

  window.addEventListener("hashchange", handleHashRoute);
}

function pickHeroVideos(videos) {
  const featured = videos.filter((video) => video.destaque);
  const base = featured.length ? featured : videos;
  return base.slice(0, 8);
}

function renderHero() {
  const video = heroVideos[currentHeroIndex] || allVideos[0];
  if (!video) return;

  heroTitle.textContent = video.titulo;
  heroDescription.textContent = video.descricao || "";
  heroYear.textContent = video.ano ? `Ano: ${video.ano}` : "";
  heroDuration.textContent = video.duracao ? `Duracao: ${video.duracao}` : "";
  heroRating.textContent = video.classificacao ? `Classificacao: ${video.classificacao}` : "";
  heroSection.style.setProperty("--hero-bg", `url("${video.capa}")`);
}

function renderHeroIndicators() {
  heroIndicators.innerHTML = "";

  heroVideos.forEach((video, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `hero-dot${index === currentHeroIndex ? " is-active" : ""}`;
    dot.setAttribute("aria-label", `Ir para ${video.titulo}`);
    dot.addEventListener("click", () => {
      currentHeroIndex = index;
      renderHero();
      renderHeroIndicators();
      restartHeroAutoRotate();
    });
    heroIndicators.appendChild(dot);
  });
}

function moveHero(step) {
  if (!heroVideos.length) return;
  currentHeroIndex = (currentHeroIndex + step + heroVideos.length) % heroVideos.length;
  renderHero();
  renderHeroIndicators();
}

function startHeroAutoRotate() {
  if (heroVideos.length < 2) return;
  clearInterval(heroTimer);
  heroTimer = setInterval(() => moveHero(1), 7000);
}

function restartHeroAutoRotate() {
  startHeroAutoRotate();
}

function renderCatalog(videos) {
  catalogContainer.innerHTML = "";

  if (!videos.length) {
    renderEmptyState(catalogContainer, "Nenhum resultado para a busca atual.");
    renderCatalogPagination(0, 1);
    return;
  }

  const totalPages = Math.max(1, Math.ceil(videos.length / catalogPageSize));
  currentCatalogPage = Math.min(Math.max(1, currentCatalogPage), totalPages);

  const startIndex = (currentCatalogPage - 1) * catalogPageSize;
  const pageItems = videos.slice(startIndex, startIndex + catalogPageSize);

  pageItems.forEach((video) => {
    catalogContainer.appendChild(buildVideoCard(video));
  });

  renderCatalogPagination(videos.length, totalPages);
}

function renderMyList() {
  myListContainer.innerHTML = "";

  const videos = allVideos.filter((video) => myListSlugs.has(video.slug));
  if (!videos.length) {
    renderEmptyState(myListContainer, "Sua lista esta vazia. Clique no + para salvar.");
    return;
  }

  videos.forEach((video) => {
    myListContainer.appendChild(buildVideoCard(video));
  });
}

function renderContinueWatching() {
  continueContainer.innerHTML = "";

  const items = getContinueItems();
  if (!items.length) {
    continueSection.classList.add("is-hidden");
    return;
  }

  continueSection.classList.remove("is-hidden");
  items.forEach((video) => continueContainer.appendChild(buildVideoCard(video)));
}

function getContinueItems() {
  const entries = Object.entries(watchProgress)
    .filter(([, data]) => Number.isFinite(data.time) && Number.isFinite(data.duration) && data.time > 8)
    .filter(([, data]) => data.time < data.duration - 8)
    .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
    .slice(0, 12);

  const result = [];
  entries.forEach(([slug]) => {
    const video = allVideos.find((item) => item.slug === slug);
    if (video) result.push(video);
  });
  return result;
}

function buildVideoCard(video) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  const thumb = card.querySelector(".video-thumb");
  const cardTitle = card.querySelector(".video-title");
  const cardMeta = card.querySelector(".video-meta");
  const overlayPlayButton = card.querySelector(".card-overlay-play");
  const playButton = card.querySelector(".card-watch-button");
  const detailButton = card.querySelector(".card-detail-button");
  const listButton = card.querySelector(".card-list-button");
  const progressBar = card.querySelector(".progress-bar");

  thumb.src = video.capa;
  thumb.alt = `Capa de ${video.titulo}`;
  cardTitle.textContent = video.titulo;

  const metaParts = [video.categoria, video.ano, video.duracao].filter(Boolean);
  cardMeta.textContent = metaParts.join(" | ");

  syncListButton(listButton, video.slug);
  progressBar.style.width = `${getProgressPercent(video.slug)}%`;

  overlayPlayButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openPlayer(video);
  });

  playButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openPlayer(video);
  });

  detailButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openDetailsPage(video, { updateHash: true });
  });

  listButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMyList(video.slug);
  });

  card.addEventListener("click", () => openDetailsPage(video, { updateHash: true }));

  return card;
}

function renderEmptyState(container, message) {
  container.innerHTML = "";
  const paragraph = document.createElement("p");
  paragraph.className = "empty-message";
  paragraph.textContent = message;
  container.appendChild(paragraph);
}

function openPlayer(videoData) {
  if (typeof activePlayerCleanup === "function") {
    activePlayerCleanup();
    activePlayerCleanup = null;
  }

  modalTitle.textContent = videoData.titulo;
  modalDescription.textContent = videoData.descricao || "";
  modalHint.classList.add("is-hidden");
  modalHint.textContent = "";
  playerContainer.innerHTML = "";

  const mediaType = detectMediaType(videoData.video);

  if (mediaType === "file") {
    const customPlayer = createCustomVideoPlayer(videoData);
    playerContainer.appendChild(customPlayer.element);
    activePlayerCleanup = customPlayer.cleanup;
  } else {
    modalHint.classList.remove("is-hidden");
    modalHint.textContent =
      "Este link usa embed externo. O player custom vale para arquivos de video diretos (.mp4/.webm/.ogg).";
    playerContainer.appendChild(buildEmbedPlayer(videoData.video, videoData.titulo));
  }

  playerModal.classList.add("is-open");
  playerModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closePlayer() {
  const activeVideo = playerContainer.querySelector("video");
  const hasPlayableState =
    activeVideo &&
    activeVideo.dataset.slug &&
    Number.isFinite(activeVideo.currentTime) &&
    Number.isFinite(activeVideo.duration) &&
    activeVideo.duration > 0;

  if (hasPlayableState) {
    persistProgress(
      activeVideo.dataset.slug,
      activeVideo.currentTime || 0,
      activeVideo.duration || 0,
      { refreshUi: true }
    );
  } else {
    refreshCardsAndLists();
  }

  if (typeof activePlayerCleanup === "function") {
    activePlayerCleanup();
    activePlayerCleanup = null;
  }

  playerModal.classList.remove("is-open");
  playerModal.setAttribute("aria-hidden", "true");
  playerContainer.innerHTML = "";
  document.body.classList.remove("no-scroll");
}

function detectMediaType(url) {
  if (!url) return "embed";
  const videoFilePattern = /\.(mp4|webm|ogg)(\?.*)?$/i;
  if (videoFilePattern.test(url)) return "file";
  return "embed";
}

function createCustomVideoPlayer(videoData) {
  const root = document.createElement("div");
  root.className = "custom-player";

  const videoEl = document.createElement("video");
  videoEl.src = videoData.video;
  videoEl.preload = "metadata";
  videoEl.setAttribute("playsinline", "");
  videoEl.dataset.slug = videoData.slug;
  videoEl.autoplay = true;

  const bigPlay = document.createElement("button");
  bigPlay.type = "button";
  bigPlay.className = "big-play";
  bigPlay.textContent = ">";

  const controls = document.createElement("div");
  controls.className = "custom-controls";

  const timeline = document.createElement("input");
  timeline.className = "timeline";
  timeline.type = "range";
  timeline.min = "0";
  timeline.max = "1000";
  timeline.value = "0";

  const row = document.createElement("div");
  row.className = "controls-row";

  const playPauseButton = createControlButton(">");
  const muteButton = createControlButton("Som");
  const timeLabel = document.createElement("span");
  timeLabel.className = "time-label";
  timeLabel.textContent = "00:00 / 00:00";

  const volumeRange = document.createElement("input");
  volumeRange.className = "volume-range";
  volumeRange.type = "range";
  volumeRange.min = "0";
  volumeRange.max = "1";
  volumeRange.step = "0.01";
  volumeRange.value = "1";

  const speedSelect = document.createElement("select");
  speedSelect.className = "speed-select";
  [0.75, 1, 1.25, 1.5, 2].forEach((speed) => {
    const option = document.createElement("option");
    option.value = String(speed);
    option.textContent = `${speed}x`;
    if (speed === 1) option.selected = true;
    speedSelect.appendChild(option);
  });

  const spacer = document.createElement("div");
  spacer.className = "spacer";

  const fullscreenButton = createControlButton("Tela");

  row.appendChild(playPauseButton);
  row.appendChild(muteButton);
  row.appendChild(timeLabel);
  row.appendChild(volumeRange);
  row.appendChild(speedSelect);
  row.appendChild(spacer);
  row.appendChild(fullscreenButton);

  controls.appendChild(timeline);
  controls.appendChild(row);

  root.appendChild(videoEl);
  root.appendChild(bigPlay);
  root.appendChild(controls);

  const saved = watchProgress[videoData.slug];
  let lastPersist = 0;
  let hideControlsTimer = null;

  const clearHideControlsTimer = () => {
    if (!hideControlsTimer) return;
    clearTimeout(hideControlsTimer);
    hideControlsTimer = null;
  };

  const isFullscreen = () => document.fullscreenElement === root;

  const showControls = ({ autoHide = true } = {}) => {
    root.classList.remove("is-controls-hidden");
    if (autoHide) {
      queueHideControls();
    } else {
      clearHideControlsTimer();
    }
  };

  const hideControls = () => {
    if (!isFullscreen() || videoEl.paused) return;
    root.classList.add("is-controls-hidden");
  };

  const queueHideControls = () => {
    clearHideControlsTimer();
    if (!isFullscreen() || videoEl.paused) return;
    hideControlsTimer = setTimeout(hideControls, 2200);
  };

  const onPlayerInteraction = () => {
    showControls({ autoHide: true });
  };

  videoEl.addEventListener("loadedmetadata", () => {
    if (saved && saved.time > 5 && saved.time < videoEl.duration - 5) {
      videoEl.currentTime = saved.time;
    }
    updateTimeLabel(videoEl, timeLabel);
  });

  videoEl.addEventListener("timeupdate", () => {
    if (videoEl.duration) {
      timeline.value = String(Math.round((videoEl.currentTime / videoEl.duration) * 1000));
    }
    updateTimeLabel(videoEl, timeLabel);

    const now = Date.now();
    if (now - lastPersist > 1500 && Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
      persistProgress(videoData.slug, videoEl.currentTime, videoEl.duration);
      lastPersist = now;
    }
  });

  videoEl.addEventListener("play", () => {
    playPauseButton.textContent = "II";
    bigPlay.classList.add("is-hidden");
    showControls({ autoHide: true });
  });

  videoEl.addEventListener("pause", () => {
    playPauseButton.textContent = ">";
    bigPlay.classList.remove("is-hidden");
    showControls({ autoHide: false });
  });

  videoEl.addEventListener("ended", () => {
    persistProgress(videoData.slug, videoEl.duration, videoEl.duration, { refreshUi: true });
    showControls({ autoHide: false });
  });

  timeline.addEventListener("input", () => {
    if (!videoEl.duration) return;
    const targetTime = (Number(timeline.value) / 1000) * videoEl.duration;
    videoEl.currentTime = targetTime;
  });

  playPauseButton.addEventListener("click", () => {
    togglePlayPause(videoEl);
    onPlayerInteraction();
  });

  bigPlay.addEventListener("click", () => {
    togglePlayPause(videoEl);
    onPlayerInteraction();
  });

  videoEl.addEventListener("click", () => {
    togglePlayPause(videoEl);
    onPlayerInteraction();
  });

  muteButton.addEventListener("click", () => {
    videoEl.muted = !videoEl.muted;
    muteButton.textContent = videoEl.muted ? "Mudo" : "Som";
    onPlayerInteraction();
  });

  volumeRange.addEventListener("input", () => {
    videoEl.volume = Number(volumeRange.value);
    videoEl.muted = videoEl.volume === 0;
    muteButton.textContent = videoEl.muted ? "Mudo" : "Som";
    onPlayerInteraction();
  });

  speedSelect.addEventListener("change", () => {
    videoEl.playbackRate = Number(speedSelect.value);
    onPlayerInteraction();
  });

  fullscreenButton.addEventListener("click", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      root.requestFullscreen().catch(() => {});
    }
    onPlayerInteraction();
  });

  root.addEventListener("mousemove", onPlayerInteraction);
  root.addEventListener("touchstart", onPlayerInteraction, { passive: true });
  controls.addEventListener("mouseenter", () => showControls({ autoHide: false }));
  controls.addEventListener("mouseleave", () => queueHideControls());

  const onFullscreenChange = () => {
    if (isFullscreen()) {
      showControls({ autoHide: true });
      return;
    }
    showControls({ autoHide: false });
  };

  document.addEventListener("fullscreenchange", onFullscreenChange);

  const cleanup = () => {
    clearHideControlsTimer();
    document.removeEventListener("fullscreenchange", onFullscreenChange);
  };

  return { element: root, cleanup };
}

function createControlButton(label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "control-button";
  button.textContent = label;
  return button;
}

function updateTimeLabel(videoEl, label) {
  const current = formatTime(videoEl.currentTime || 0);
  const total = formatTime(videoEl.duration || 0);
  label.textContent = `${current} / ${total}`;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  const whole = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function togglePlayPause(videoEl) {
  if (videoEl.paused) {
    videoEl.play().catch(() => {});
  } else {
    videoEl.pause();
  }
}

function buildEmbedPlayer(url, title) {
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return createIframe(`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`, title);
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return createIframe(`https://player.vimeo.com/video/${vimeoId}?autoplay=1`, title);
  }

  return createIframe(url, title);
}

function createIframe(src, title) {
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allowFullscreen = true;
  iframe.title = title || "Player";
  return iframe;
}

function extractYouTubeId(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
    if (url.searchParams.get("v")) return url.searchParams.get("v");
    if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2];
  } catch (_error) {
    return null;
  }
  return null;
}

function extractVimeoId(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!url.hostname.includes("vimeo.com")) return null;
    const match = url.pathname.match(/\/(\d+)/);
    return match ? match[1] : null;
  } catch (_error) {
    return null;
  }
}

function openDetailsPage(video, options = { updateHash: true }) {
  currentDetailsVideo = video;
  detailsCategory.textContent = video.categoria || "Geral";
  detailsTitle.textContent = video.titulo;
  detailsDescription.textContent = video.descricao || "";
  detailsYear.textContent = video.ano ? `Ano: ${video.ano}` : "";
  detailsDuration.textContent = video.duracao ? `Duracao: ${video.duracao}` : "";
  detailsRating.textContent = video.classificacao ? `Classificacao: ${video.classificacao}` : "";
  detailsPage.style.setProperty("--details-bg", `url("${video.capa}")`);

  syncDetailsListButton();
  renderRelated(video);

  detailsPage.classList.remove("is-hidden");
  detailsPage.scrollIntoView({ behavior: "smooth", block: "start" });

  if (options.updateHash && window.location.hash !== `#video=${video.slug}`) {
    window.location.hash = `video=${video.slug}`;
  }
}

function closeDetailsPage() {
  detailsPage.classList.add("is-hidden");
  currentDetailsVideo = null;
}

function renderRelated(video) {
  detailsRelatedContainer.innerHTML = "";
  const related = allVideos
    .filter((item) => item.slug !== video.slug)
    .filter((item) => item.categoria === video.categoria)
    .slice(0, 8);

  const fallback = allVideos.filter((item) => item.slug !== video.slug).slice(0, 8);
  const source = related.length ? related : fallback;

  source.forEach((item) => detailsRelatedContainer.appendChild(buildVideoCard(item)));
}

function handleHashRoute() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#video=")) {
    closeDetailsPage();
    return;
  }

  const slug = hash.replace("#video=", "").trim();
  if (!slug) {
    closeDetailsPage();
    return;
  }

  const target = allVideos.find((video) => video.slug === slug);
  if (!target) {
    closeDetailsPage();
    return;
  }

  openDetailsPage(target, { updateHash: false });
}

function loadMyList() {
  try {
    const raw = localStorage.getItem(STORAGE_LIST_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed);
  } catch (_error) {
    return new Set();
  }
}

function saveMyList() {
  localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify([...myListSlugs]));
}

function toggleMyList(slug) {
  if (myListSlugs.has(slug)) {
    myListSlugs.delete(slug);
  } else {
    myListSlugs.add(slug);
  }

  saveMyList();
  refreshCardsAndLists();
}

function syncListButton(button, slug) {
  const inList = myListSlugs.has(slug);
  button.classList.toggle("is-active", inList);
  button.textContent = inList ? "v" : "+";
  button.setAttribute("aria-label", inList ? "Remover da lista" : "Adicionar na lista");
  button.title = inList ? "Remover da lista" : "Adicionar na lista";
}

function syncDetailsListButton() {
  if (!currentDetailsVideo) return;
  const inList = myListSlugs.has(currentDetailsVideo.slug);
  detailsListButton.textContent = inList ? "Remover da Lista" : "Adicionar na Lista";
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(watchProgress));
}

function persistProgress(slug, time, duration, options = { refreshUi: false }) {
  if (!slug || !Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return;
  watchProgress[slug] = { time, duration, updatedAt: Date.now() };
  saveProgress();
  if (options.refreshUi) {
    refreshCardsAndLists();
  }
}

function getProgressPercent(slug) {
  const data = watchProgress[slug];
  if (!data || !Number.isFinite(data.time) || !Number.isFinite(data.duration) || data.duration <= 0) return 0;
  return Math.min(100, Math.max(0, (data.time / data.duration) * 100));
}

function refreshCardsAndLists() {
  renderCatalog(filteredVideos);
  renderMyList();
  renderContinueWatching();
  if (currentDetailsVideo) {
    syncDetailsListButton();
    renderRelated(currentDetailsVideo);
  }
}

async function loadVideosFromMarkdown(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Falha ao carregar ${path} (${response.status}).`);
  }
  const markdown = await response.text();
  return parseVideosMarkdown(markdown);
}

function parseVideosMarkdown(markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const videos = [];
  let current = null;

  const commitCurrent = () => {
    if (!current || !current.video) return;
    videos.push({
      titulo: current.titulo || "Sem titulo",
      categoria: current.categoria || "Geral",
      descricao: current.descricao || "Sem descricao.",
      capa: current.capa || "https://placehold.co/1280x720/1f1f26/FFFFFF?text=Capa+do+Video",
      video: current.video,
      ano: current.ano || "",
      duracao: current.duracao || "",
      classificacao: current.classificacao || "",
      destaque: Boolean(current.destaque),
      slug: current.slug || "",
    });
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line || line.startsWith("<!--")) continue;

    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      commitCurrent();
      current = { titulo: headingMatch[1].trim() };
      continue;
    }

    if (!current) continue;

    const fieldMatch = line.match(/^-+\s*([^:]+):\s*(.+)$/);
    if (!fieldMatch) continue;

    const key = normalizeKey(fieldMatch[1]);
    const value = fieldMatch[2].trim();

    if (["categoria", "genero", "secao"].includes(key)) current.categoria = value;
    if (["descricao", "sinopse", "desc"].includes(key)) current.descricao = value;
    if (["capa", "thumb", "thumbnail", "poster", "imagem"].includes(key)) current.capa = value;
    if (["video", "link", "url", "fonte", "arquivo"].includes(key)) current.video = value;
    if (["ano"].includes(key)) current.ano = value;
    if (["duracao", "tempo"].includes(key)) current.duracao = value;
    if (["classificacao", "idade", "faixaetaria"].includes(key)) current.classificacao = value;
    if (["slug", "id"].includes(key)) current.slug = value;
    if (["destaque", "featured", "hero"].includes(key)) {
      current.destaque = ["sim", "true", "1", "yes", "y"].includes(value.toLowerCase());
    }
  }

  commitCurrent();
  return videos;
}

function normalizeKey(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function slugify(text) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function ensureUniqueSlugs(videos) {
  const used = new Map();
  return videos.map((video) => {
    const base = video.slug || slugify(video.titulo) || "video";
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    const slug = count === 0 ? base : `${base}-${count + 1}`;
    return { ...video, slug };
  });
}

function calculateCatalogPageSize() {
  const width = window.innerWidth || 1280;
  if (width <= 520) return 4;
  if (width <= 900) return 6;
  if (width <= 1280) return 8;
  return 10;
}

function renderCatalogPagination(totalItems, totalPages) {
  if (!catalogPagination) return;
  catalogPagination.innerHTML = "";

  if (totalItems <= catalogPageSize) {
    catalogPagination.classList.add("is-hidden");
    return;
  }

  catalogPagination.classList.remove("is-hidden");

  const info = document.createElement("span");
  info.className = "pagination-info";
  info.textContent = `Pagina ${currentCatalogPage} de ${totalPages} (${totalItems} videos)`;

  const controls = document.createElement("div");
  controls.className = "pagination-controls";

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "ghost-button pagination-btn";
  prev.textContent = "Anterior";
  prev.disabled = currentCatalogPage === 1;
  prev.addEventListener("click", () => goToCatalogPage(currentCatalogPage - 1, totalPages));

  const next = document.createElement("button");
  next.type = "button";
  next.className = "ghost-button pagination-btn";
  next.textContent = "Proximo";
  next.disabled = currentCatalogPage === totalPages;
  next.addEventListener("click", () => goToCatalogPage(currentCatalogPage + 1, totalPages));

  controls.appendChild(prev);

  buildVisiblePages(totalPages, currentCatalogPage).forEach((item) => {
    if (item === "...") {
      const dots = document.createElement("span");
      dots.className = "pagination-dots";
      dots.textContent = "...";
      controls.appendChild(dots);
      return;
    }

    const pageButton = document.createElement("button");
    pageButton.type = "button";
    pageButton.className = `ghost-button pagination-btn${
      item === currentCatalogPage ? " is-active-page" : ""
    }`;
    pageButton.textContent = String(item);
    pageButton.addEventListener("click", () => goToCatalogPage(item, totalPages));
    controls.appendChild(pageButton);
  });

  controls.appendChild(next);
  catalogPagination.appendChild(info);
  catalogPagination.appendChild(controls);
}

function buildVisiblePages(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("...");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push("...");

  pages.push(totalPages);
  return pages;
}

function goToCatalogPage(page, totalPages) {
  currentCatalogPage = Math.min(Math.max(1, page), totalPages);
  renderCatalog(filteredVideos);
  document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
