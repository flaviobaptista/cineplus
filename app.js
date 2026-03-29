const pageType = document.body.dataset.page || "home";

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
const moviesContainer = document.getElementById("moviesContainer");
const seriesContainer = document.getElementById("seriesContainer");
const myListContainer = document.getElementById("myListContainer");

const catalogContainer = document.getElementById("catalogContainer");
const catalogPagination = document.getElementById("catalogPagination");
const catalogFilters = document.getElementById("catalogFilters");

const detailsPage = document.getElementById("detailsPage");
const detailsCategory = document.getElementById("detailsCategory");
const detailsTitle = document.getElementById("detailsTitle");
const detailsDescription = document.getElementById("detailsDescription");
const detailsYear = document.getElementById("detailsYear");
const detailsDuration = document.getElementById("detailsDuration");
const detailsRating = document.getElementById("detailsRating");
const detailsPlayButton = document.getElementById("detailsPlayButton");
const detailsNextEpisodeButton = document.getElementById("detailsNextEpisodeButton");
const detailsListButton = document.getElementById("detailsListButton");
const seriesPanel = document.getElementById("seriesPanel");
const seasonSelect = document.getElementById("seasonSelect");
const episodesContainer = document.getElementById("episodesContainer");

const searchInput = document.getElementById("searchInput");
const cardTemplate = document.getElementById("cardTemplate");

const playerModal = document.getElementById("playerModal");
const playerContainer = document.getElementById("playerContainer");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalHint = document.getElementById("modalHint");
const closePlayerButton = document.getElementById("closePlayerButton");

const STORAGE_LIST_KEY = "cine_plus_my_list";
const STORAGE_PROGRESS_KEY = "cine_plus_progress";

let allVideos = [];
let movies = [];
let seriesList = [];
let filteredCatalog = [];
let heroVideos = [];

let myListSlugs = new Set();
let watchProgress = {};

let currentDetailsVideo = null;
let currentHeroIndex = 0;
let heroTimer = null;
let activePlayerCleanup = null;
let currentCatalogPage = 1;
let catalogPageSize = calculateCatalogPageSize();
let currentSeriesSeasonIndex = 0;
let currentSeriesEpisodeIndex = 0;
let catalogTypeFilter = "all";

init();

async function init() {
  try {
    myListSlugs = loadMyList();
    watchProgress = loadProgress();

    const loaded = await loadLibraryData();
    allVideos = ensureUniqueSlugs(
      loaded.map((item) => ({
        ...item,
        slug: item.slug || slugify(item.titulo),
      }))
    );

    movies = allVideos.filter((item) => !isSeries(item));
    seriesList = allVideos.filter((item) => isSeries(item));

    bindGlobalEvents();

    if (!allVideos.length) {
      renderInitialEmptyState();
      return;
    }

    if (pageType === "home") {
      initHomePage();
      return;
    }

    if (pageType === "catalog") {
      initCatalogPage();
      return;
    }

    if (pageType === "details") {
      initDetailsPage();
      return;
    }

    if (pageType === "my-list") {
      initMyListPage();
      return;
    }
  } catch (error) {
    renderStartupError(error);
  }
}

function bindGlobalEvents() {
  if (closePlayerButton) {
    closePlayerButton.addEventListener("click", closePlayer);
  }

  if (playerModal) {
    playerModal.addEventListener("click", (event) => {
      if (event.target === playerModal) closePlayer();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && playerModal?.classList.contains("is-open")) {
      closePlayer();
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const term = searchInput.value.toLowerCase().trim();
      handleSearch(term);
    });
  }

  window.addEventListener("resize", () => {
    const nextPageSize = calculateCatalogPageSize();
    if (nextPageSize !== catalogPageSize) {
      catalogPageSize = nextPageSize;
      currentCatalogPage = 1;
      if (pageType === "catalog") {
        filteredCatalog = filterCatalogItems(searchInput?.value || "", catalogTypeFilter);
        renderCatalog(filteredCatalog);
      }
    }
  });
}

function initHomePage() {
  heroVideos = pickHeroVideos(allVideos);

  renderHero();
  renderHeroIndicators();
  renderHomeCollections(allVideos);
  renderMyList();
  renderContinueWatching();

  if (heroPlayButton) {
    heroPlayButton.addEventListener("click", () => {
      const item = heroVideos[currentHeroIndex];
      if (item) openPlayerForItem(item);
    });
  }

  if (heroDetailsButton) {
    heroDetailsButton.addEventListener("click", () => {
      const item = heroVideos[currentHeroIndex];
      if (item) navigateToDetails(item);
    });
  }

  if (heroPrevButton) {
    heroPrevButton.addEventListener("click", () => {
      moveHero(-1);
      restartHeroAutoRotate();
    });
  }

  if (heroNextButton) {
    heroNextButton.addEventListener("click", () => {
      moveHero(1);
      restartHeroAutoRotate();
    });
  }

  startHeroAutoRotate();
}

function initCatalogPage() {
  if (catalogFilters) {
    catalogFilters.querySelectorAll("button[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter || "all";
        catalogTypeFilter = filter;
        currentCatalogPage = 1;
        syncCatalogFilterButtons();
        filteredCatalog = filterCatalogItems(searchInput?.value || "", catalogTypeFilter);
        renderCatalog(filteredCatalog);
      });
    });
  }

  syncCatalogFilterButtons();
  filteredCatalog = filterCatalogItems("", catalogTypeFilter);
  renderCatalog(filteredCatalog);
}

function initDetailsPage() {
  const slug = getDetailsSlugFromQuery();
  if (!slug) {
    showDetailsNotFound("Nenhum titulo foi informado.");
    return;
  }

  const target = allVideos.find((item) => item.slug === slug);
  if (!target) {
    showDetailsNotFound("Titulo nao encontrado no catalogo.");
    return;
  }

  openDetailsPage(target);

  if (detailsPlayButton) {
    detailsPlayButton.addEventListener("click", () => {
      if (!currentDetailsVideo) return;
      if (!isSeries(currentDetailsVideo)) {
        openPlayerForItem(currentDetailsVideo);
        return;
      }

      playSelectedEpisodeInDetails();
    });
  }

  if (detailsNextEpisodeButton) {
    detailsNextEpisodeButton.addEventListener("click", () => {
      playNextEpisodeFromDetails();
    });
  }

  if (detailsListButton) {
    detailsListButton.addEventListener("click", () => {
      if (!currentDetailsVideo) return;
      toggleMyList(currentDetailsVideo.slug);
    });
  }

  if (seasonSelect) {
    seasonSelect.addEventListener("change", (event) => {
      if (!currentDetailsVideo || !isSeries(currentDetailsVideo)) return;
      currentSeriesSeasonIndex = Number(event.target.value) || 0;
      currentSeriesEpisodeIndex = 0;
      renderEpisodesForSeries(currentDetailsVideo, currentSeriesSeasonIndex);
      updateNextEpisodeButton();
    });
  }

}

function initMyListPage() {
  renderMyList(getMyListItems(""));
}

function handleSearch(term) {
  if (pageType === "home") {
    const filtered = allVideos.filter((item) => buildSearchText(item).includes(term));
    renderHomeCollections(filtered);
    return;
  }

  if (pageType === "catalog") {
    currentCatalogPage = 1;
    filteredCatalog = filterCatalogItems(term, catalogTypeFilter);
    renderCatalog(filteredCatalog);
    return;
  }

  if (pageType === "my-list") {
    renderMyList(getMyListItems(term));
  }
}

function renderInitialEmptyState() {
  if (pageType === "home") {
    if (moviesContainer) renderEmptyState(moviesContainer, "Nenhum filme encontrado em videos.md.");
    if (seriesContainer) renderEmptyState(seriesContainer, "Nenhuma serie encontrada em series.md.");
    if (myListContainer) renderEmptyState(myListContainer, "Sua lista esta vazia.");
    if (continueSection) continueSection.classList.add("is-hidden");
    return;
  }

  if (pageType === "catalog") {
    if (catalogContainer) renderEmptyState(catalogContainer, "Nenhum titulo encontrado.");
    if (catalogPagination) catalogPagination.classList.add("is-hidden");
    return;
  }

  if (pageType === "details") {
    showDetailsNotFound("Nenhum titulo encontrado para exibir.");
    return;
  }

  if (pageType === "my-list") {
    if (myListContainer) renderEmptyState(myListContainer, "Sua lista esta vazia.");
  }
}

function renderStartupError(error) {
  console.error(error);

  const message =
    "Falha ao carregar o catalogo. Rode em servidor local e confira videos.md e series.md.";

  if (pageType === "home") {
    if (moviesContainer) renderEmptyState(moviesContainer, message);
    if (seriesContainer) renderEmptyState(seriesContainer, message);
    if (myListContainer) renderEmptyState(myListContainer, "Sua lista esta vazia.");
    if (continueSection) continueSection.classList.add("is-hidden");
    return;
  }

  if (pageType === "catalog") {
    if (catalogContainer) renderEmptyState(catalogContainer, message);
    return;
  }

  if (pageType === "details") {
    showDetailsNotFound(message);
    return;
  }

  if (pageType === "my-list") {
    if (myListContainer) renderEmptyState(myListContainer, message);
  }
}

function renderHomeCollections(items) {
  if (!moviesContainer || !seriesContainer) return;

  const movieItems = items.filter((item) => !isSeries(item)).slice(0, 12);
  const seriesItems = items.filter((item) => isSeries(item)).slice(0, 12);

  moviesContainer.innerHTML = "";
  seriesContainer.innerHTML = "";

  if (!movieItems.length) {
    renderEmptyState(moviesContainer, "Nenhum filme encontrado para esta busca.");
  } else {
    movieItems.forEach((item) => moviesContainer.appendChild(buildVideoCard(item)));
  }

  if (!seriesItems.length) {
    renderEmptyState(seriesContainer, "Nenhuma serie encontrada para esta busca.");
  } else {
    seriesItems.forEach((item) => seriesContainer.appendChild(buildVideoCard(item)));
  }
}

function filterCatalogItems(term, typeFilter) {
  const text = String(term || "").toLowerCase().trim();

  return allVideos
    .filter((item) => {
      if (typeFilter === "filme") return !isSeries(item);
      if (typeFilter === "serie") return isSeries(item);
      return true;
    })
    .filter((item) => buildSearchText(item).includes(text));
}

function syncCatalogFilterButtons() {
  if (!catalogFilters) return;

  catalogFilters.querySelectorAll("button[data-filter]").forEach((button) => {
    button.classList.toggle("is-active-filter", button.dataset.filter === catalogTypeFilter);
  });
}

function pickHeroVideos(videos) {
  const featured = videos.filter((item) => item.destaque);
  const base = featured.length ? featured : videos;
  return base.slice(0, 8);
}

function renderHero() {
  if (!heroSection || !heroTitle) return;
  const item = heroVideos[currentHeroIndex] || allVideos[0];
  if (!item) return;

  const durationText = isSeries(item)
    ? `${item.temporadas.length} temporadas | ${getSeriesEpisodeCount(item)} episodios`
    : item.duracao;

  heroTitle.textContent = item.titulo;
  if (heroDescription) heroDescription.textContent = item.descricao || "";
  if (heroYear) heroYear.textContent = item.ano ? `Ano: ${item.ano}` : "";
  if (heroDuration) heroDuration.textContent = durationText ? `Duracao: ${durationText}` : "";
  if (heroRating) heroRating.textContent = item.classificacao ? `Classificacao: ${item.classificacao}` : "";
  heroSection.style.setProperty("--hero-bg", `url("${item.capa}")`);
}

function renderHeroIndicators() {
  if (!heroIndicators) return;
  heroIndicators.innerHTML = "";

  heroVideos.forEach((item, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `hero-dot${index === currentHeroIndex ? " is-active" : ""}`;
    dot.setAttribute("aria-label", `Ir para ${item.titulo}`);
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

function renderCatalog(items) {
  if (!catalogContainer) return;
  catalogContainer.innerHTML = "";

  if (!items.length) {
    renderEmptyState(catalogContainer, "Nenhum resultado para a busca atual.");
    renderCatalogPagination(0, 1);
    return;
  }

  const totalPages = Math.max(1, Math.ceil(items.length / catalogPageSize));
  currentCatalogPage = Math.min(Math.max(1, currentCatalogPage), totalPages);

  const startIndex = (currentCatalogPage - 1) * catalogPageSize;
  const pageItems = items.slice(startIndex, startIndex + catalogPageSize);

  pageItems.forEach((item) => {
    catalogContainer.appendChild(buildVideoCard(item));
  });

  renderCatalogPagination(items.length, totalPages);
}

function getMyListItems(term = "") {
  const text = String(term || "").toLowerCase().trim();
  return allVideos
    .filter((item) => myListSlugs.has(item.slug))
    .filter((item) => (text ? buildSearchText(item).includes(text) : true));
}

function renderMyList(items = getMyListItems(searchInput?.value || "")) {
  if (!myListContainer) return;
  myListContainer.innerHTML = "";

  if (!items.length) {
    const message = pageType === "my-list"
      ? "Nenhum titulo na sua lista para essa busca."
      : "Sua lista esta vazia. Clique no + para salvar.";
    renderEmptyState(myListContainer, message);
    return;
  }

  items.forEach((item) => {
    myListContainer.appendChild(buildVideoCard(item));
  });
}

function renderContinueWatching() {
  if (!continueSection || !continueContainer) return;
  continueContainer.innerHTML = "";

  const items = getContinueItems();
  if (!items.length) {
    continueSection.classList.add("is-hidden");
    return;
  }

  continueSection.classList.remove("is-hidden");
  items.forEach((item) => continueContainer.appendChild(buildVideoCard(item)));
}

function getContinueItems() {
  const latestBySource = new Map();

  Object.entries(watchProgress).forEach(([progressKey, data]) => {
    if (!Number.isFinite(data.time) || !Number.isFinite(data.duration)) return;
    if (data.time <= 8 || data.time >= data.duration - 8) return;

    const sourceSlug = progressKey.split("::")[0];
    const sourceItem = allVideos.find((item) => item.slug === sourceSlug);
    if (!sourceItem) return;

    const current = latestBySource.get(sourceSlug);
    if (!current || (data.updatedAt || 0) > current.updatedAt) {
      latestBySource.set(sourceSlug, { item: sourceItem, updatedAt: data.updatedAt || 0 });
    }
  });

  return [...latestBySource.values()]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 12)
    .map((entry) => entry.item);
}

function buildVideoCard(item) {
  if (!cardTemplate) {
    const fallback = document.createElement("article");
    fallback.className = "video-card";
    fallback.textContent = item.titulo;
    return fallback;
  }

  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  const thumb = card.querySelector(".video-thumb");
  const cardTitle = card.querySelector(".video-title");
  const cardMeta = card.querySelector(".video-meta");
  const overlayPlayButton = card.querySelector(".card-overlay-play");
  const playButton = card.querySelector(".card-watch-button");
  const detailButton = card.querySelector(".card-detail-button");
  const listButton = card.querySelector(".card-list-button");
  const progressBar = card.querySelector(".progress-bar");

  if (thumb) {
    thumb.src = item.capa;
    thumb.alt = `Capa de ${item.titulo}`;
  }

  if (cardTitle) cardTitle.textContent = item.titulo;

  const metaParts = isSeries(item)
    ? ["Serie", item.categoria, item.ano, `${getSeriesEpisodeCount(item)} eps`].filter(Boolean)
    : ["Filme", item.categoria, item.ano, item.duracao].filter(Boolean);

  if (cardMeta) cardMeta.textContent = metaParts.join(" | ");

  if (listButton) {
    syncListButton(listButton, item.slug);
    listButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMyList(item.slug);
    });
  }

  if (progressBar) {
    progressBar.style.width = `${getProgressPercentForItem(item)}%`;
  }

  if (overlayPlayButton) {
    overlayPlayButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isSeries(item)) {
        navigateToDetails(item);
        return;
      }
      openPlayerForItem(item);
    });
  }

  if (playButton) {
    if (isSeries(item)) {
      playButton.textContent = "Episodios";
    }

    playButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isSeries(item)) {
        navigateToDetails(item);
        return;
      }
      openPlayerForItem(item);
    });
  }

  if (detailButton) {
    detailButton.addEventListener("click", (event) => {
      event.stopPropagation();
      navigateToDetails(item);
    });
  }

  card.addEventListener("click", () => navigateToDetails(item));

  return card;
}

function navigateToDetails(item) {
  if (!item?.slug) return;
  const target = `detalhes.html?slug=${encodeURIComponent(item.slug)}`;
  window.location.href = target;
}

function renderEmptyState(container, message) {
  if (!container) return;
  container.innerHTML = "";
  const paragraph = document.createElement("p");
  paragraph.className = "empty-message";
  paragraph.textContent = message;
  container.appendChild(paragraph);
}

function isSeries(item) {
  return item?.tipo === "serie" && Array.isArray(item.temporadas) && item.temporadas.length > 0;
}

function getSeriesEpisodeCount(item) {
  if (!isSeries(item)) return 0;
  return item.temporadas.reduce((sum, season) => sum + season.episodios.length, 0);
}

function buildSearchText(item) {
  const parts = [item.titulo, item.categoria, item.descricao, item.tipo, item.ano].filter(Boolean);

  if (isSeries(item)) {
    item.temporadas.forEach((season) => {
      parts.push(season.nome);
      season.episodios.forEach((ep) => {
        parts.push(ep.titulo, ep.descricao, ep.numero);
      });
    });
  }

  return parts.join(" ").toLowerCase();
}

function getProgressPercentForItem(item) {
  if (!isSeries(item)) return getProgressPercent(item.slug);

  const lastKey = getLastSeriesProgressKey(item);
  if (!lastKey) return 0;
  return getProgressPercent(lastKey);
}

function getLastSeriesProgressKey(serie) {
  const prefix = `${serie.slug}::`;
  const entries = Object.entries(watchProgress)
    .filter(([key, data]) => key.startsWith(prefix) && Number.isFinite(data.updatedAt))
    .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));

  return entries.length ? entries[0][0] : null;
}

function buildEpisodeProgressKey(serie, season, episode) {
  return `${serie.slug}::${season.slug}::${episode.slug}`;
}

function getSeriesEpisodePlayable(serie, seasonIndex, episodeIndex) {
  if (!isSeries(serie)) return null;

  const safeSeasonIndex = Math.max(0, Math.min(seasonIndex, serie.temporadas.length - 1));
  const season = serie.temporadas[safeSeasonIndex];
  if (!season || !season.episodios.length) return null;

  const safeEpisodeIndex = Math.max(0, Math.min(episodeIndex, season.episodios.length - 1));
  const episode = season.episodios[safeEpisodeIndex];
  if (!episode) return null;

  return {
    tipo: "episodio",
    slug: buildEpisodeProgressKey(serie, season, episode),
    sourceSlug: serie.slug,
    serieTitulo: serie.titulo,
    temporadaNome: season.nome,
    episodioTitulo: episode.titulo,
    episodioNumero: episode.numero,
    titulo: `${serie.titulo} - ${season.nome} - E${episode.numero} ${episode.titulo}`,
    descricao: episode.descricao || serie.descricao,
    video: episode.video,
    audioOptions: Array.isArray(episode.audioOptions) ? episode.audioOptions : [],
    capa: episode.capa || serie.capa,
    ano: serie.ano,
    duracao: episode.duracao || "",
    classificacao: serie.classificacao,
    categoria: serie.categoria,
  };
}
function getSeriesIndicesByProgressKey(serie, progressKey) {
  for (let seasonIndex = 0; seasonIndex < serie.temporadas.length; seasonIndex += 1) {
    const season = serie.temporadas[seasonIndex];
    for (let episodeIndex = 0; episodeIndex < season.episodios.length; episodeIndex += 1) {
      const episode = season.episodios[episodeIndex];
      if (buildEpisodeProgressKey(serie, season, episode) === progressKey) {
        return { seasonIndex, episodeIndex };
      }
    }
  }
  return null;
}

function getPrevEpisodeInSeason(serie, seasonIndex, episodeIndex) {
  if (!isSeries(serie)) return null;
  const season = serie.temporadas[seasonIndex];
  if (!season || !season.episodios.length) return null;
  if (episodeIndex - 1 < 0) return null;
  return { seasonIndex, episodeIndex: episodeIndex - 1 };
}

function getNextEpisodeInSeason(serie, seasonIndex, episodeIndex) {
  if (!isSeries(serie)) return null;
  const season = serie.temporadas[seasonIndex];
  if (!season || !season.episodios.length) return null;
  if (episodeIndex + 1 >= season.episodios.length) return null;
  return { seasonIndex, episodeIndex: episodeIndex + 1 };
}

function getNextSeasonStartPosition(serie, seasonIndex) {
  if (!isSeries(serie)) return null;
  const nextSeasonIndex = seasonIndex + 1;
  if (nextSeasonIndex >= serie.temporadas.length) return null;

  const nextSeason = serie.temporadas[nextSeasonIndex];
  if (!nextSeason || !nextSeason.episodios.length) return null;

  return { seasonIndex: nextSeasonIndex, episodeIndex: 0 };
}

function getEpisodeContextFromPlayable(videoData) {
  if (!videoData || videoData.tipo !== "episodio" || !videoData.slug) return null;

  const serieSlug = videoData.sourceSlug || videoData.slug.split("::")[0];
  const serie = allVideos.find((item) => item.slug === serieSlug && isSeries(item));
  if (!serie) return null;

  const indices = getSeriesIndicesByProgressKey(serie, videoData.slug);
  if (!indices) return null;

  return {
    serie,
    seasonIndex: indices.seasonIndex,
    episodeIndex: indices.episodeIndex,
  };
}

function syncDetailsEpisodeSelection(serie, seasonIndex, episodeIndex) {
  if (!currentDetailsVideo || currentDetailsVideo.slug !== serie.slug) return;
  currentSeriesSeasonIndex = seasonIndex;
  currentSeriesEpisodeIndex = episodeIndex;

  if (seasonSelect) seasonSelect.value = String(currentSeriesSeasonIndex);
  renderEpisodesForSeries(currentDetailsVideo, currentSeriesSeasonIndex);
  updateNextEpisodeButton();
}

function getResumeSeriesIndices(serie) {
  const lastKey = getLastSeriesProgressKey(serie);
  if (!lastKey) return { seasonIndex: 0, episodeIndex: 0 };

  const indices = getSeriesIndicesByProgressKey(serie, lastKey);
  if (!indices) return { seasonIndex: 0, episodeIndex: 0 };

  const progress = watchProgress[lastKey];
  const finished =
    progress &&
    Number.isFinite(progress.time) &&
    Number.isFinite(progress.duration) &&
    progress.duration > 0 &&
    progress.time >= progress.duration - 8;

  if (!finished) return indices;

  const nextPosition = getNextEpisodeInSeason(serie, indices.seasonIndex, indices.episodeIndex);
  return nextPosition || indices;
}

function toMoviePlayable(item) {
  return {
    ...item,
    slug: item.slug,
    sourceSlug: item.slug,
  };
}

function getPlayableForItem(item, options = {}) {
  if (!isSeries(item)) return toMoviePlayable(item);

  if (typeof options.seasonIndex === "number" && typeof options.episodeIndex === "number") {
    const direct = getSeriesEpisodePlayable(item, options.seasonIndex, options.episodeIndex);
    if (direct) return direct;
  }

  if (
    options.preferCurrentSelection &&
    currentDetailsVideo &&
    currentDetailsVideo.slug === item.slug
  ) {
    const selected = getSeriesEpisodePlayable(item, currentSeriesSeasonIndex, currentSeriesEpisodeIndex);
    if (selected) return selected;
  }

  if (options.preferLastWatched !== false) {
    const indices = getResumeSeriesIndices(item);
    const fromProgress = getSeriesEpisodePlayable(item, indices.seasonIndex, indices.episodeIndex);
    if (fromProgress) return fromProgress;
  }

  return getSeriesEpisodePlayable(item, 0, 0);
}

function openPlayerForItem(item, options = {}) {
  const playable = getPlayableForItem(item, options);
  if (!playable) return;
  openPlayer(playable, options);
}

function openPlayer(videoData, options = {}) {
  if (!playerContainer || !playerModal || !modalTitle || !modalDescription || !modalHint) return;

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
    const customPlayer = createCustomVideoPlayer(videoData, options);
    playerContainer.appendChild(customPlayer.element);
    activePlayerCleanup = customPlayer.cleanup;
  } else {
    modalHint.classList.remove("is-hidden");
    modalHint.textContent =
      "Este link usa embed externo. O player custom vale para arquivos de video diretos (.mp4/.webm/.ogg/.mkv).";
    playerContainer.appendChild(buildEmbedPlayer(videoData.video, videoData.titulo));
  }

  playerModal.classList.add("is-open");
  playerModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closePlayer() {
  if (!playerContainer || !playerModal) return;

  const activeVideo = playerContainer.querySelector("video");
  const hasPlayableState =
    activeVideo &&
    activeVideo.dataset.progressKey &&
    Number.isFinite(activeVideo.currentTime) &&
    Number.isFinite(activeVideo.duration) &&
    activeVideo.duration > 0;

  if (hasPlayableState) {
    persistProgress(activeVideo.dataset.progressKey, activeVideo.currentTime || 0, activeVideo.duration || 0, {
      refreshUi: true,
    });
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
  const videoFilePattern = /\.(mp4|webm|ogg|mkv)(\?.*)?$/i;
  if (videoFilePattern.test(url)) return "file";
  return "embed";
}

function createCustomVideoPlayer(videoData, options = {}) {
  const root = document.createElement("div");
  root.className = "custom-player";

  const videoEl = document.createElement("video");
  videoEl.src = videoData.video;
  videoEl.preload = "metadata";
  videoEl.setAttribute("playsinline", "");
  videoEl.dataset.progressKey = videoData.slug;
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

  const playPauseButton = createControlButton("> ");
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

  const audioSelect = document.createElement("select");
  audioSelect.className = "audio-select is-hidden";
  audioSelect.setAttribute("aria-label", "Selecionar audio");
  audioSelect.disabled = true;

  const audioPlaceholder = document.createElement("option");
  audioPlaceholder.value = "";
  audioPlaceholder.textContent = "Audio";
  audioSelect.appendChild(audioPlaceholder);

  const spacer = document.createElement("div");
  spacer.className = "spacer";

  const fullscreenButton = createControlButton("Tela");
  const playerEpisodeContext = getEpisodeContextFromPlayable(videoData);

  const episodeNav = document.createElement("div");
  episodeNav.className = "episode-player-nav";

  const prevEpisodeButton = document.createElement("button");
  prevEpisodeButton.type = "button";
  prevEpisodeButton.className = "control-button episode-nav-button";
  prevEpisodeButton.textContent = "EP anterior";

  const nextEpisodeButton = document.createElement("button");
  nextEpisodeButton.type = "button";
  nextEpisodeButton.className = "control-button episode-nav-button";
  nextEpisodeButton.textContent = "Proximo EP";

  const nextSeasonButton = document.createElement("button");
  nextSeasonButton.type = "button";
  nextSeasonButton.className = "control-button episode-nav-button";
  nextSeasonButton.textContent = "Proxima temporada";

  episodeNav.appendChild(prevEpisodeButton);
  episodeNav.appendChild(nextEpisodeButton);
  episodeNav.appendChild(nextSeasonButton);

  row.appendChild(playPauseButton);
  row.appendChild(muteButton);
  row.appendChild(timeLabel);
  row.appendChild(volumeRange);
  row.appendChild(audioSelect);
  row.appendChild(speedSelect);
  row.appendChild(spacer);
  row.appendChild(fullscreenButton);

  controls.appendChild(timeline);
  controls.appendChild(row);

  if (playerEpisodeContext) {
    const openEpisodeFromPlayer = (position) => {
      if (!position) return;

      const playable = getSeriesEpisodePlayable(
        playerEpisodeContext.serie,
        position.seasonIndex,
        position.episodeIndex
      );
      if (!playable) return;

      syncDetailsEpisodeSelection(
        playerEpisodeContext.serie,
        position.seasonIndex,
        position.episodeIndex
      );
      openPlayer(playable);
    };

    const updateEpisodeNavButtons = () => {
      const prev = getPrevEpisodeInSeason(
        playerEpisodeContext.serie,
        playerEpisodeContext.seasonIndex,
        playerEpisodeContext.episodeIndex
      );
      const next = getNextEpisodeInSeason(
        playerEpisodeContext.serie,
        playerEpisodeContext.seasonIndex,
        playerEpisodeContext.episodeIndex
      );
      const nextSeason = getNextSeasonStartPosition(
        playerEpisodeContext.serie,
        playerEpisodeContext.seasonIndex
      );

      prevEpisodeButton.disabled = !prev;

      if (next) {
        nextEpisodeButton.disabled = false;
        nextEpisodeButton.classList.remove("is-hidden");
        nextSeasonButton.classList.add("is-hidden");
      } else if (nextSeason) {
        nextEpisodeButton.classList.add("is-hidden");
        nextSeasonButton.classList.remove("is-hidden");
        nextSeasonButton.disabled = false;
      } else {
        nextEpisodeButton.disabled = true;
        nextEpisodeButton.classList.remove("is-hidden");
        nextSeasonButton.classList.add("is-hidden");
      }
    };

    prevEpisodeButton.addEventListener("click", () => {
      openEpisodeFromPlayer(
        getPrevEpisodeInSeason(
          playerEpisodeContext.serie,
          playerEpisodeContext.seasonIndex,
          playerEpisodeContext.episodeIndex
        )
      );
    });

    nextEpisodeButton.addEventListener("click", () => {
      openEpisodeFromPlayer(
        getNextEpisodeInSeason(
          playerEpisodeContext.serie,
          playerEpisodeContext.seasonIndex,
          playerEpisodeContext.episodeIndex
        )
      );
    });

    nextSeasonButton.addEventListener("click", () => {
      openEpisodeFromPlayer(
        getNextSeasonStartPosition(
          playerEpisodeContext.serie,
          playerEpisodeContext.seasonIndex
        )
      );
    });

    updateEpisodeNavButtons();
    controls.appendChild(episodeNav);
  }

  root.appendChild(videoEl);
  root.appendChild(bigPlay);
  root.appendChild(controls);

  const saved = watchProgress[videoData.slug];
  let lastPersist = 0;
  let hideControlsTimer = null;
  let removeAudioTrackListener = () => {};
  let pendingSourceSeekTime = null;

  const normalizeUrlForCompare = (rawUrl) => {
    if (!rawUrl) return "";
    try {
      return new URL(rawUrl, window.location.href).href;
    } catch (_error) {
      return String(rawUrl);
    }
  };

  const externalAudioOptions = (() => {
    const optionsFromData = Array.isArray(videoData.audioOptions) ? videoData.audioOptions : [];
    const seen = new Set();
    const normalized = [];

    const pushOption = (label, url, isDefault = false) => {
      if (!url || typeof url !== "string") return;
      const cleanUrl = url.trim();
      if (!cleanUrl) return;
      const key = normalizeUrlForCompare(cleanUrl);
      if (seen.has(key)) return;
      seen.add(key);
      normalized.push({
        label: label?.trim() || (isDefault ? "Padrao" : `Audio ${normalized.length + 1}`),
        url: cleanUrl,
      });
    };

    pushOption("Padrao", videoData.video, true);
    optionsFromData.forEach((option, index) => {
      if (!option || typeof option !== "object") return;
      pushOption(option.label || `Audio ${index + 1}`, option.url, false);
    });

    return normalized;
  })();

  const clearHideControlsTimer = () => {
    if (!hideControlsTimer) return;
    clearTimeout(hideControlsTimer);
    hideControlsTimer = null;
  };

  const getAudioTrackEntries = () => {
    const trackList = videoEl.audioTracks;
    if (!trackList || typeof trackList.length !== "number") return [];

    const entries = [];
    for (let index = 0; index < trackList.length; index += 1) {
      const track =
        trackList[index] || (typeof trackList.item === "function" ? trackList.item(index) : null);
      if (track) entries.push({ track, index });
    }
    return entries;
  };

  const getAudioTrackLabel = (entry) => {
    const label = entry.track.label ? entry.track.label.trim() : "";
    const lang = entry.track.language ? entry.track.language.trim().toUpperCase() : "";
    if (label && lang) return `${label} (${lang})`;
    if (label) return label;
    if (lang) return lang;
    return `Audio ${entry.index + 1}`;
  };

  const setActiveAudioTrack = (selectedIndex) => {
    const entries = getAudioTrackEntries();
    entries.forEach((entry) => {
      entry.track.enabled = entry.index === selectedIndex;
    });
  };

  const switchToExternalAudio = (selectedIndex) => {
    const target = externalAudioOptions[selectedIndex];
    if (!target) return;

    const currentSource = normalizeUrlForCompare(videoEl.currentSrc || videoEl.src);
    const targetSource = normalizeUrlForCompare(target.url);
    if (currentSource === targetSource) return;

    const wasPlaying = !videoEl.paused;
    const currentTime = Number.isFinite(videoEl.currentTime) ? videoEl.currentTime : 0;
    const playbackRate = Number(videoEl.playbackRate) || 1;
    const muted = Boolean(videoEl.muted);
    const volume = Number.isFinite(videoEl.volume) ? videoEl.volume : 1;

    pendingSourceSeekTime = currentTime;
    videoEl.src = target.url;
    videoEl.load();
    videoEl.playbackRate = playbackRate;
    videoEl.muted = muted;
    videoEl.volume = volume;

    if (wasPlaying) {
      videoEl.play().catch(() => {});
    }
  };

  const syncAudioTrackPicker = () => {
    if (externalAudioOptions.length > 1) {
      const currentSource = normalizeUrlForCompare(videoEl.currentSrc || videoEl.src);
      const selectedIndex = Math.max(
        0,
        externalAudioOptions.findIndex(
          (option) => normalizeUrlForCompare(option.url) === currentSource
        )
      );

      audioSelect.innerHTML = "";
      externalAudioOptions.forEach((option, index) => {
        const item = document.createElement("option");
        item.value = String(index);
        item.textContent = option.label;
        if (index === selectedIndex) item.selected = true;
        audioSelect.appendChild(item);
      });

      audioSelect.dataset.mode = "external";
      audioSelect.disabled = false;
      audioSelect.classList.remove("is-hidden");
      return;
    }

    const entries = getAudioTrackEntries();

    if (entries.length <= 1) {
      audioSelect.disabled = true;
      audioSelect.classList.add("is-hidden");
      audioSelect.innerHTML = "";
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Audio";
      audioSelect.appendChild(option);
      audioSelect.dataset.mode = "none";
      return;
    }

    const currentValue = Number(audioSelect.value);
    const enabledTrack = entries.find((entry) => Boolean(entry.track.enabled));
    const activeIndex = enabledTrack ? enabledTrack.index : entries[0].index;
    if (!enabledTrack) {
      setActiveAudioTrack(activeIndex);
    }

    audioSelect.innerHTML = "";
    entries.forEach((entry) => {
      const option = document.createElement("option");
      option.value = String(entry.index);
      option.textContent = getAudioTrackLabel(entry);
      if (entry.index === activeIndex) option.selected = true;
      audioSelect.appendChild(option);
    });

    if (Number.isFinite(currentValue) && entries.some((entry) => entry.index === currentValue)) {
      audioSelect.value = String(currentValue);
    }

    audioSelect.disabled = false;
    audioSelect.classList.remove("is-hidden");
    audioSelect.dataset.mode = "native";
  };

  const bindAudioTrackEvents = () => {
    const trackList = videoEl.audioTracks;
    if (!trackList || typeof trackList.addEventListener !== "function") return () => {};

    const onTrackChange = () => syncAudioTrackPicker();
    trackList.addEventListener("change", onTrackChange);

    return () => {
      if (typeof trackList.removeEventListener === "function") {
        trackList.removeEventListener("change", onTrackChange);
      }
    };
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
    if (Number.isFinite(pendingSourceSeekTime)) {
      const maxSeek = Number.isFinite(videoEl.duration) && videoEl.duration > 0
        ? Math.max(0, videoEl.duration - 0.4)
        : pendingSourceSeekTime;
      videoEl.currentTime = Math.min(pendingSourceSeekTime, maxSeek);
      pendingSourceSeekTime = null;
    } else if (saved && saved.time > 5 && saved.time < videoEl.duration - 5) {
      videoEl.currentTime = saved.time;
    }
    updateTimeLabel(videoEl, timeLabel);
    syncAudioTrackPicker();

    removeAudioTrackListener();
    removeAudioTrackListener =
      externalAudioOptions.length > 1 ? () => {} : bindAudioTrackEvents();
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

    if (typeof options.onEnded === "function") {
      options.onEnded(videoData);
    }
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

  audioSelect.addEventListener("change", () => {
    const selectedIndex = Number(audioSelect.value);
    if (!Number.isFinite(selectedIndex)) return;

    if (audioSelect.dataset.mode === "external") {
      switchToExternalAudio(selectedIndex);
      onPlayerInteraction();
      return;
    }

    if (audioSelect.dataset.mode === "native") {
      setActiveAudioTrack(selectedIndex);
    }

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
    removeAudioTrackListener();
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
  return null;
}

function getDetailsSlugFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug")?.trim() || "";
}

function showDetailsNotFound(message) {
  if (!detailsPage) return;

  detailsPage.innerHTML = "";
  const box = document.createElement("article");
  box.className = "details-not-found";

  const title = document.createElement("h2");
  title.textContent = "Detalhes indisponiveis";

  const desc = document.createElement("p");
  desc.textContent = message;

  const back = document.createElement("a");
  back.href = "catalogo.html";
  back.className = "ghost-button";
  back.textContent = "Voltar ao catalogo";

  box.appendChild(title);
  box.appendChild(desc);
  box.appendChild(back);
  detailsPage.appendChild(box);
}

function openDetailsPage(item) {
  if (!detailsPage) return;

  currentDetailsVideo = item;

  if (detailsCategory) detailsCategory.textContent = item.categoria || "Geral";
  if (detailsTitle) detailsTitle.textContent = item.titulo;
  if (detailsDescription) detailsDescription.textContent = item.descricao || "";
  if (detailsYear) detailsYear.textContent = item.ano ? `Ano: ${item.ano}` : "";
  if (detailsRating) {
    detailsRating.textContent = item.classificacao ? `Classificacao: ${item.classificacao}` : "";
  }

  detailsPage.style.setProperty("--details-bg", `url("${item.capa}")`);

  if (isSeries(item)) {
    if (detailsDuration) {
      detailsDuration.textContent =
        `Duracao: ${item.temporadas.length} temporadas | ${getSeriesEpisodeCount(item)} episodios`;
    }
    if (detailsPlayButton) detailsPlayButton.textContent = "Assistir episodio";
    if (seriesPanel) seriesPanel.classList.remove("is-hidden");

    renderSeriesPanelForDetails(item);

    if (detailsNextEpisodeButton) {
      detailsNextEpisodeButton.classList.remove("is-hidden");
      updateNextEpisodeButton();
    }
  } else {
    if (detailsDuration) detailsDuration.textContent = item.duracao ? `Duracao: ${item.duracao}` : "";
    if (detailsPlayButton) detailsPlayButton.textContent = "Assistir";
    if (seriesPanel) seriesPanel.classList.add("is-hidden");
    if (detailsNextEpisodeButton) detailsNextEpisodeButton.classList.add("is-hidden");
  }

  syncDetailsListButton();
}

function renderSeriesPanelForDetails(serie) {
  if (!seriesPanel || !seasonSelect || !episodesContainer) return;

  seriesPanel.classList.remove("is-hidden");

  const resumeIndices = getResumeSeriesIndices(serie);
  currentSeriesSeasonIndex = resumeIndices.seasonIndex;
  currentSeriesEpisodeIndex = resumeIndices.episodeIndex;

  seasonSelect.innerHTML = "";
  serie.temporadas.forEach((season, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `Temporada ${index + 1}`;
    seasonSelect.appendChild(option);
  });

  seasonSelect.value = String(currentSeriesSeasonIndex);
  renderEpisodesForSeries(serie, currentSeriesSeasonIndex);
}

function renderEpisodesForSeries(serie, seasonIndex) {
  if (!episodesContainer) return;
  episodesContainer.innerHTML = "";

  const season = serie.temporadas[seasonIndex];
  if (!season || !season.episodios.length) {
    renderEmptyState(episodesContainer, "Nenhum episodio encontrado nesta temporada.");
    return;
  }

  const seasonGroup = document.createElement("section");
  seasonGroup.className = "season-group";

  const seasonTitle = document.createElement("h4");
  seasonTitle.className = "season-group-title";
  seasonTitle.textContent = `Temporada ${seasonIndex + 1}`;
  seasonGroup.appendChild(seasonTitle);

  const seasonGrid = document.createElement("div");
  seasonGrid.className = "season-episodes-grid";

  season.episodios.forEach((episode, episodeIndex) => {
    const playable = getSeriesEpisodePlayable(serie, seasonIndex, episodeIndex);
    if (!playable) return;

    const isActive =
      seasonIndex === currentSeriesSeasonIndex && episodeIndex === currentSeriesEpisodeIndex;

    const card = document.createElement("article");
    card.className = `episode-card${isActive ? " is-active" : ""}`;

    const head = document.createElement("div");
    head.className = "episode-card-head";

    const badge = document.createElement("span");
    badge.className = "episode-index";
    badge.textContent = `Temporada ${seasonIndex + 1}`;

    const meta = document.createElement("span");
    meta.className = "episode-meta";
    meta.textContent = episode.duracao || "";

    head.appendChild(badge);
    head.appendChild(meta);

    const title = document.createElement("p");
    title.className = "episode-title";
    title.textContent = `Episodio - ${episode.numero || episodeIndex + 1}`;

    const footer = document.createElement("div");
    footer.className = "episode-footer";

    const progressWrap = document.createElement("div");
    progressWrap.className = "episode-progress-wrap";

    const progressBar = document.createElement("div");
    progressBar.className = "episode-progress";
    progressBar.style.width = `${getProgressPercent(playable.slug)}%`;
    progressWrap.appendChild(progressBar);

    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "play-button";
    playBtn.textContent = "Assistir";

    playBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      currentSeriesSeasonIndex = seasonIndex;
      currentSeriesEpisodeIndex = episodeIndex;
      playSelectedEpisodeInDetails();
      renderEpisodesForSeries(serie, seasonIndex);
      updateNextEpisodeButton();
    });

    footer.appendChild(progressWrap);
    footer.appendChild(playBtn);

    card.addEventListener("click", () => {
      currentSeriesSeasonIndex = seasonIndex;
      currentSeriesEpisodeIndex = episodeIndex;
      renderEpisodesForSeries(serie, seasonIndex);
      updateNextEpisodeButton();
    });

    card.appendChild(head);
    card.appendChild(title);
    card.appendChild(footer);

    seasonGrid.appendChild(card);
  });

  seasonGroup.appendChild(seasonGrid);
  episodesContainer.appendChild(seasonGroup);
}

function playSelectedEpisodeInDetails() {
  if (!currentDetailsVideo || !isSeries(currentDetailsVideo)) return;

  const playable = getSeriesEpisodePlayable(
    currentDetailsVideo,
    currentSeriesSeasonIndex,
    currentSeriesEpisodeIndex
  );

  if (!playable) return;

  openPlayer(playable);
}

function playNextEpisodeFromDetails() {
  if (!currentDetailsVideo || !isSeries(currentDetailsVideo)) return;

  const nextInSeason = getNextEpisodeInSeason(
    currentDetailsVideo,
    currentSeriesSeasonIndex,
    currentSeriesEpisodeIndex
  );

  const next = nextInSeason || getNextSeasonStartPosition(currentDetailsVideo, currentSeriesSeasonIndex);
  if (!next) return;

  currentSeriesSeasonIndex = next.seasonIndex;
  currentSeriesEpisodeIndex = next.episodeIndex;

  if (seasonSelect) seasonSelect.value = String(currentSeriesSeasonIndex);
  renderEpisodesForSeries(currentDetailsVideo, currentSeriesSeasonIndex);
  updateNextEpisodeButton();
  playSelectedEpisodeInDetails();
}

function updateNextEpisodeButton() {
  if (!detailsNextEpisodeButton || !currentDetailsVideo || !isSeries(currentDetailsVideo)) return;

  const nextInSeason = getNextEpisodeInSeason(
    currentDetailsVideo,
    currentSeriesSeasonIndex,
    currentSeriesEpisodeIndex
  );
  const nextSeason = getNextSeasonStartPosition(currentDetailsVideo, currentSeriesSeasonIndex);

  if (!nextInSeason && !nextSeason) {
    detailsNextEpisodeButton.disabled = true;
    detailsNextEpisodeButton.textContent = "Ultimo episodio";
    return;
  }

  detailsNextEpisodeButton.disabled = false;

  if (nextInSeason) {
    const nextPlayable = getSeriesEpisodePlayable(
      currentDetailsVideo,
      nextInSeason.seasonIndex,
      nextInSeason.episodeIndex
    );
    detailsNextEpisodeButton.textContent = nextPlayable
      ? `Proximo EP: E${nextPlayable.episodioNumero}`
      : "Proximo episodio";
    return;
  }

  detailsNextEpisodeButton.textContent = "Proxima temporada";
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
  if (!button) return;
  const inList = myListSlugs.has(slug);
  button.classList.toggle("is-active", inList);
  button.textContent = inList ? "v" : "+";
  button.setAttribute("aria-label", inList ? "Remover da lista" : "Adicionar na lista");
  button.title = inList ? "Remover da lista" : "Adicionar na lista";
}

function syncDetailsListButton() {
  if (!detailsListButton || !currentDetailsVideo) return;
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

function persistProgress(progressKey, time, duration, options = { refreshUi: false }) {
  if (!progressKey || !Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return;
  watchProgress[progressKey] = { time, duration, updatedAt: Date.now() };
  saveProgress();
  if (options.refreshUi) {
    refreshCardsAndLists();
  }
}

function getProgressPercent(progressKey) {
  const data = watchProgress[progressKey];
  if (!data || !Number.isFinite(data.time) || !Number.isFinite(data.duration) || data.duration <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (data.time / data.duration) * 100));
}

function refreshCardsAndLists() {
  if (pageType === "home") {
    const term = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const filtered = term
      ? allVideos.filter((item) => buildSearchText(item).includes(term))
      : allVideos;

    renderHomeCollections(filtered);
    renderMyList();
    renderContinueWatching();
    renderHero();
    renderHeroIndicators();
    return;
  }

  if (pageType === "catalog") {
    filteredCatalog = filterCatalogItems(searchInput?.value || "", catalogTypeFilter);
    renderCatalog(filteredCatalog);
    return;
  }

  if (pageType === "details") {
    if (!currentDetailsVideo) return;
    syncDetailsListButton();
    if (isSeries(currentDetailsVideo)) {
      renderEpisodesForSeries(currentDetailsVideo, currentSeriesSeasonIndex);
      updateNextEpisodeButton();
    }
    return;
  }

  if (pageType === "my-list") {
    renderMyList(getMyListItems(searchInput?.value || ""));
  }
}

async function loadLibraryData() {
  const [moviesMdText, seriesMdText] = await Promise.all([
    loadMarkdownText("videos.md", { required: true }),
    loadMarkdownText("series.md", { required: false }),
  ]);

  const loadedMovies = parseVideosMarkdown(moviesMdText).filter((item) => !isSeries(item));
  const loadedSeries = parseVideosMarkdown(seriesMdText).filter((item) => isSeries(item));

  return [...loadedMovies, ...loadedSeries];
}

async function loadMarkdownText(path, options = { required: false }) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      if (options.required) {
        throw new Error(`Falha ao carregar ${path} (${response.status}).`);
      }
      return "";
    }

    return await response.text();
  } catch (error) {
    if (options.required) throw error;
    return "";
  }
}

function parseVideosMarkdown(markdown) {
  if (!markdown || typeof markdown !== "string") return [];

  const lines = markdown.replace(/\r/g, "").split("\n");
  const videos = [];
  let current = null;
  let currentSeason = null;
  let lastEpisode = null;

  const createSeason = (name) => ({
    nome: name || `Temporada ${(current?.temporadas?.length || 0) + 1}`,
    slug: slugify(name || `Temporada ${(current?.temporadas?.length || 0) + 1}`),
    episodios: [],
  });

  const commitCurrent = () => {
    if (!current) return;

    const hasEpisodes = current.temporadas.some((season) => season.episodios.length > 0);

    if ((current.tipo === "serie" || hasEpisodes) && hasEpisodes) {
      const totalEpisodios = current.temporadas.reduce((sum, season) => sum + season.episodios.length, 0);
      const firstEpisode = current.temporadas[0].episodios[0];

      videos.push({
        titulo: current.titulo || "Sem titulo",
        tipo: "serie",
        categoria: current.categoria || "Geral",
        descricao: current.descricao || "Sem descricao.",
        capa: current.capa || "https://placehold.co/1280x720/1f1f26/FFFFFF?text=Serie",
        video: firstEpisode.video,
        ano: current.ano || "",
        duracao: current.duracao || `${totalEpisodios} episodios`,
        classificacao: current.classificacao || "",
        destaque: Boolean(current.destaque),
        slug: current.slug || "",
        audioOptions: current.audioOptions || [],
        temporadas: current.temporadas,
      });
      return;
    }

    if (!current.video) return;

    videos.push({
      titulo: current.titulo || "Sem titulo",
      tipo: "filme",
      categoria: current.categoria || "Geral",
      descricao: current.descricao || "Sem descricao.",
      capa: current.capa || "https://placehold.co/1280x720/1f1f26/FFFFFF?text=Capa+do+Video",
      video: current.video,
      ano: current.ano || "",
      duracao: current.duracao || "",
      classificacao: current.classificacao || "",
      destaque: Boolean(current.destaque),
      slug: current.slug || "",
      audioOptions: current.audioOptions || [],
      temporadas: [],
    });
  };

  const parseEpisode = (value) => {
    const parts = value
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length < 2) return null;

    let numero = currentSeason.episodios.length + 1;
    let titulo = "";
    let duracao = "";
    let video = "";
    let capa = current.capa || "";
    let descricao = "";

    if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
      numero = Number(parts[0]);
      titulo = parts[1];
      duracao = parts[2];
      video = parts[3];
      capa = parts[4] || capa;
      descricao = parts[5] || "";
    } else if (parts.length >= 4) {
      titulo = parts[0];
      duracao = parts[1];
      video = parts[2];
      capa = parts[3] || capa;
      descricao = parts[4] || "";
    } else if (parts.length === 3) {
      titulo = parts[0];
      duracao = parts[1];
      video = parts[2];
    } else if (parts.length === 2) {
      titulo = parts[0];
      video = parts[1];
    }

    if (!video) return null;

    return {
      numero,
      titulo: titulo || `Episodio ${numero}`,
      duracao,
      video,
      capa,
      descricao,
      audioOptions: [],
      slug: slugify(`e${numero}-${titulo || `episodio-${numero}`}`),
    };
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line || line.startsWith("<!--")) continue;

    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      commitCurrent();
      current = {
        titulo: headingMatch[1].trim(),
        tipo: "filme",
        categoria: "",
        descricao: "",
        capa: "",
        video: "",
        ano: "",
        duracao: "",
        classificacao: "",
        destaque: false,
        slug: "",
        audioOptions: [],
        temporadas: [],
      };
      currentSeason = null;
      lastEpisode = null;
      continue;
    }

    const seasonHeadingMatch = line.match(/^###\s+(.+)$/);
    if (seasonHeadingMatch && current) {
      current.tipo = "serie";
      currentSeason = createSeason(seasonHeadingMatch[1].trim());
      current.temporadas.push(currentSeason);
      lastEpisode = null;
      continue;
    }

    if (!current) continue;

    const fieldMatch = line.match(/^-+\s*([^:]+):\s*(.+)$/);
    if (!fieldMatch) continue;

    const key = normalizeKey(fieldMatch[1]);
    const value = fieldMatch[2].trim();

    if (["tipo", "kind"].includes(key)) {
      current.tipo = value.toLowerCase().includes("serie") ? "serie" : "filme";
      continue;
    }

    if (["temporada", "season"].includes(key)) {
      current.tipo = "serie";
      currentSeason = createSeason(value);
      current.temporadas.push(currentSeason);
      lastEpisode = null;
      continue;
    }

    if (["episodio", "episode", "ep"].includes(key)) {
      current.tipo = "serie";
      if (!currentSeason) {
        currentSeason = createSeason("Temporada 1");
        current.temporadas.push(currentSeason);
      }

      const episode = parseEpisode(value);
      if (episode) {
        currentSeason.episodios.push(episode);
        lastEpisode = episode;
      }
      continue;
    }

    if (["audio", "audiotrack", "faixaaudio"].includes(key)) {
      const parsedAudio = parseAudioOptionValue(value);
      if (!parsedAudio) continue;

      if (current.tipo === "serie" && lastEpisode) {
        lastEpisode.audioOptions = Array.isArray(lastEpisode.audioOptions)
          ? lastEpisode.audioOptions
          : [];
        lastEpisode.audioOptions.push(parsedAudio);
      } else {
        current.audioOptions = Array.isArray(current.audioOptions) ? current.audioOptions : [];
        current.audioOptions.push(parsedAudio);
      }
      continue;
    }

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

function parseAudioOptionValue(rawValue) {
  if (!rawValue || typeof rawValue !== "string") return null;

  const parts = rawValue
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) return null;
  if (parts.length === 1) {
    return { label: "Alternativo", url: parts[0] };
  }

  const label = parts[0];
  const url = parts[1];
  if (!url) return null;
  return { label, url };
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
  return videos.map((item) => {
    const base = item.slug || slugify(item.titulo) || "video";
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    const slug = count === 0 ? base : `${base}-${count + 1}`;

    if (isSeries(item)) {
      item.temporadas = item.temporadas.map((season, seasonIndex) => {
        const seasonSlug = season.slug || slugify(season.nome) || `temporada-${seasonIndex + 1}`;
        const episodios = season.episodios.map((episode, episodeIndex) => ({
          ...episode,
          slug:
            episode.slug ||
            slugify(`e${episode.numero || episodeIndex + 1}-${episode.titulo || `episodio-${episodeIndex + 1}`}`),
        }));

        return { ...season, slug: seasonSlug, episodios };
      });
    }

    return { ...item, slug };
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
  info.textContent = `Pagina ${currentCatalogPage} de ${totalPages} (${totalItems} titulos)`;

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
    pageButton.className = `ghost-button pagination-btn${item === currentCatalogPage ? " is-active-page" : ""}`;
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
  renderCatalog(filteredCatalog);
  document.querySelector("main")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
