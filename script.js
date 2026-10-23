const menuToggle = document.querySelector(".menu-toggle");
const siteMenu = document.querySelector("#site-menu");
const welcomeScreen = document.querySelector("#welcome-screen");
const siteContent = document.querySelector("#site-content");
const startButton = document.querySelector(".start-button");

if (startButton && welcomeScreen && siteContent) {
  startButton.addEventListener("click", () => {
    welcomeScreen.hidden = true;
    siteContent.hidden = false;
  });
}

if (menuToggle && siteMenu) {
  menuToggle.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isExpanded));
    menuToggle.setAttribute("aria-label", isExpanded ? "Open menu" : "Close menu");
    siteMenu.hidden = isExpanded;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !siteMenu.hidden) {
      siteMenu.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open menu");
      menuToggle.focus();
    }
  });
}

const travelPins = document.querySelectorAll(".travel-pin[data-place]");
const worldMap = document.querySelector(".world-map");
const arrangePinsButton = document.querySelector(".travel-arrange-button");
const resetPinsButton = document.querySelector(".travel-reset-button");
const travelMapStatus = document.querySelector(".travel-map-status");
const travelGalleryTitle = document.querySelector(".travel-gallery-title");
const travelGalleryMessage = document.querySelector(".travel-gallery-message");
const travelGalleryPhotos = document.querySelector(".travel-gallery-photos");
const travelPinStorageKey = "my-wonderland-travel-pin-positions";
let isArrangingPins = false;
let activePinDrag = null;

function getPinId(pin) {
  return [...pin.classList].find((className) => className.startsWith("pin-"));
}

function setTravelPinPosition(pin, left, top) {
  const mapBounds = worldMap.getBoundingClientRect();
  if (!mapBounds.width || !mapBounds.height) return;

  const leftPercent = Math.max(0, Math.min(100, (left / mapBounds.width) * 100));
  const topPercent = Math.max(0, Math.min(100, (top / mapBounds.height) * 100));
  pin.style.left = `${leftPercent.toFixed(2)}%`;
  pin.style.top = `${topPercent.toFixed(2)}%`;
}

function saveTravelPinPositions() {
  if (!worldMap || !travelMapStatus) return;

  const mapBounds = worldMap.getBoundingClientRect();
  if (!mapBounds.width || !mapBounds.height) return;

  const positions = {};
  travelPins.forEach((pin) => {
    const pinId = getPinId(pin);
    if (!pinId) return;

    const computedPosition = getComputedStyle(pin);
    positions[pinId] = {
      left: (parseFloat(computedPosition.left) / mapBounds.width) * 100,
      top: (parseFloat(computedPosition.top) / mapBounds.height) * 100,
    };
  });

  try {
    localStorage.setItem(travelPinStorageKey, JSON.stringify(positions));
    travelMapStatus.textContent = "Marker positions saved in this browser.";
  } catch (error) {
    travelMapStatus.textContent = "Could not save marker positions in this browser. They will reset when you leave this page.";
  }
}

function loadTravelPinPositions() {
  if (!worldMap || !travelMapStatus) return;

  try {
    const savedPositions = localStorage.getItem(travelPinStorageKey);
    if (!savedPositions) return;

    const positions = JSON.parse(savedPositions);
    if (!positions || typeof positions !== "object" || Array.isArray(positions)) {
      travelMapStatus.textContent = "Saved marker positions could not be read. Use reset to restore the original layout.";
      return;
    }

    travelPins.forEach((pin) => {
      const pinId = getPinId(pin);
      const position = positions[pinId];
      if (
        !position
        || !Number.isFinite(position.left)
        || !Number.isFinite(position.top)
        || position.left < 0
        || position.left > 100
        || position.top < 0
        || position.top > 100
      ) return;

      pin.style.left = `${position.left}%`;
      pin.style.top = `${position.top}%`;
    });
  } catch (error) {
    travelMapStatus.textContent = "Could not load saved marker positions. Use reset to restore the original layout.";
  }
}

if (worldMap && arrangePinsButton && resetPinsButton && travelMapStatus) {
  loadTravelPinPositions();

  arrangePinsButton.addEventListener("click", () => {
    isArrangingPins = !isArrangingPins;
    worldMap.classList.toggle("is-arranging", isArrangingPins);
    arrangePinsButton.setAttribute("aria-pressed", String(isArrangingPins));
    arrangePinsButton.textContent = isArrangingPins ? "Done arranging" : "Arrange markers";
    travelMapStatus.textContent = isArrangingPins
      ? "Drag markers, or focus one and use the arrow keys. Changes save automatically."
      : "Marker positions saved in this browser.";
  });

  resetPinsButton.addEventListener("click", () => {
    travelPins.forEach((pin) => {
      pin.style.left = "";
      pin.style.top = "";
    });
    try {
      localStorage.removeItem(travelPinStorageKey);
      travelMapStatus.textContent = "Marker positions reset to the original layout.";
    } catch (error) {
      travelMapStatus.textContent = "Markers were reset for this page, but the saved positions could not be cleared from this browser.";
    }
  });

  travelPins.forEach((pin) => {
    pin.addEventListener("pointerdown", (event) => {
      if (!isArrangingPins || event.button !== 0) return;
      event.preventDefault();
      pin.setPointerCapture(event.pointerId);
      activePinDrag = {
        pin,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
    });

    pin.addEventListener("pointermove", (event) => {
      if (!activePinDrag || activePinDrag.pin !== pin || activePinDrag.pointerId !== event.pointerId) return;
      const mapBounds = worldMap.getBoundingClientRect();
      if (!mapBounds.width || !mapBounds.height) return;

      if (Math.hypot(event.clientX - activePinDrag.startX, event.clientY - activePinDrag.startY) > 3) {
        activePinDrag.moved = true;
      }
      setTravelPinPosition(pin, event.clientX - mapBounds.left, event.clientY - mapBounds.top);
    });

    const finishPinDrag = (event) => {
      if (!activePinDrag || activePinDrag.pin !== pin || activePinDrag.pointerId !== event.pointerId) return;
      const didMove = activePinDrag.moved;
      activePinDrag = null;
      if (didMove) saveTravelPinPositions();
    };

    pin.addEventListener("pointerup", finishPinDrag);
    pin.addEventListener("pointercancel", finishPinDrag);

    pin.addEventListener("keydown", (event) => {
      if (!isArrangingPins || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const mapBounds = worldMap.getBoundingClientRect();
      const position = getComputedStyle(pin);
      const step = event.shiftKey ? 5 : 1;
      const left = parseFloat(position.left);
      const top = parseFloat(position.top);
      const nextLeft = left + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0);
      const nextTop = top + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0);
      setTravelPinPosition(pin, nextLeft, nextTop);
      saveTravelPinPositions();
    });
  });
}

function showTravelPlace(pin) {
  if (isArrangingPins) return;
  if (!travelGalleryTitle || !travelGalleryMessage || !travelGalleryPhotos) return;

  const place = pin.dataset.place;
  const isWishlistPlace = pin.dataset.status === "wishlist";
  const photos = pin.dataset.photos?.split(",").filter(Boolean) ?? [];
  travelGalleryTitle.textContent = `Photos from ${place}`;
  travelGalleryMessage.textContent = photos.length
    ? `${photos.length} photos from ${place}.`
    : isWishlistPlace
      ? `${place} is on your travel wishlist. Photos can go here after you visit.`
      : `Photos you took in ${place} will appear here once you share them.`;
  travelGalleryPhotos.replaceChildren();
  photos.forEach((photo, index) => {
    const image = document.createElement("img");
    image.src = photo;
    image.alt = `${place} travel photo ${index + 1}`;
    image.loading = "lazy";
    travelGalleryPhotos.appendChild(image);
  });
  travelPins.forEach((travelPin) => {
    travelPin.setAttribute("aria-pressed", String(travelPin === pin));
  });
}

travelPins.forEach((pin) => {
  pin.addEventListener("pointerenter", () => {
    if (!isArrangingPins) showTravelPlace(pin);
  });
  pin.addEventListener("focus", () => {
    if (!isArrangingPins) showTravelPlace(pin);
  });
  pin.addEventListener("click", () => {
    if (!isArrangingPins) showTravelPlace(pin);
  });
});

const artistButtons = document.querySelectorAll(".artist-button");
const spotifyPlayer = document.querySelector(".spotify-player");

artistButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const trackId = button.dataset.track;
    if (!trackId || !spotifyPlayer) return;

    spotifyPlayer.src = `https://open.spotify.com/embed/track/${encodeURIComponent(trackId)}?utm_source=generator`;
    artistButtons.forEach((artistButton) => {
      artistButton.setAttribute("aria-pressed", String(artistButton === button));
    });
  });
});

const moviePages = [...document.querySelectorAll(".movie-page")];
const moviePageButtons = document.querySelectorAll("[data-movie-direction]");
const moviePageStatus = document.querySelector(".movie-page-status");
let activeMoviePage = 0;

function showMoviePage(pageIndex) {
  if (!moviePages.length || !moviePageStatus) return;

  activeMoviePage = Math.max(0, Math.min(pageIndex, moviePages.length - 1));
  moviePages.forEach((page, index) => {
    page.hidden = index !== activeMoviePage;
  });
  moviePageStatus.textContent = `${activeMoviePage + 1} / ${moviePages.length}`;
  moviePageButtons.forEach((button) => {
    const direction = Number(button.dataset.movieDirection);
    button.disabled = activeMoviePage + direction < 0 || activeMoviePage + direction >= moviePages.length;
  });
}

moviePageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showMoviePage(activeMoviePage + Number(button.dataset.movieDirection));
  });
});

showMoviePage(0);

const showPages = [...document.querySelectorAll(".shows-page")];
const showPageButtons = document.querySelectorAll("[data-show-direction]");
const showPageStatus = document.querySelector(".shows-page-status");
let activeShowPage = 0;

function showShowPage(pageIndex) {
  if (!showPages.length || !showPageStatus) return;

  activeShowPage = Math.max(0, Math.min(pageIndex, showPages.length - 1));
  showPages.forEach((page, index) => {
    page.hidden = index !== activeShowPage;
  });
  showPageStatus.textContent = `${activeShowPage + 1} / ${showPages.length}`;
  showPageButtons.forEach((button) => {
    const direction = Number(button.dataset.showDirection);
    button.disabled = activeShowPage + direction < 0 || activeShowPage + direction >= showPages.length;
  });
}

showPageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showShowPage(activeShowPage + Number(button.dataset.showDirection));
  });
});

showShowPage(0);

const certificateTiles = [...document.querySelectorAll(".certificate-tile")];
const certificatePageButtons = document.querySelectorAll("[data-certificate-direction]");
const certificatePageStatus = document.querySelector(".certificate-page-status");
const certificatesPerPage = 5;
let activeCertificatePage = 0;
const certificatePageCount = Math.ceil(certificateTiles.length / certificatesPerPage);

function showCertificatePage(pageIndex) {
  if (!certificateTiles.length || !certificatePageStatus) return;

  activeCertificatePage = Math.max(0, Math.min(pageIndex, certificatePageCount - 1));
  certificateTiles.forEach((tile, index) => {
    tile.hidden = Math.floor(index / certificatesPerPage) !== activeCertificatePage;
  });
  certificatePageStatus.textContent = `${activeCertificatePage + 1} / ${certificatePageCount}`;
  certificatePageButtons.forEach((button) => {
    const direction = Number(button.dataset.certificateDirection);
    button.disabled = activeCertificatePage + direction < 0 || activeCertificatePage + direction >= certificatePageCount;
  });
}

certificatePageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showCertificatePage(activeCertificatePage + Number(button.dataset.certificateDirection));
  });
});

showCertificatePage(0);

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const effectLayer = document.createElement("div");
  const trailSymbols = ["♥", "♫"];
  const trailColors = ["#8a2be2", "#333", "#888", "#fff", "#ffdee5"];
  const burstColors = ["#03f", "#f03", "#0a5", "#93f", "#0cf", "#f93", "#f0c"];
  let lastTrailTime = 0;
  let lastTrailX = 0;
  let lastTrailY = 0;

  effectLayer.className = "pointer-effects";
  effectLayer.setAttribute("aria-hidden", "true");
  document.body.appendChild(effectLayer);

  function addParticle(symbol, x, y, color, dx, dy, duration, size) {
    if (effectLayer.childElementCount >= 100) {
      effectLayer.firstElementChild.remove();
    }

    const particle = document.createElement("span");
    particle.className = "pointer-particle";
    particle.textContent = symbol;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.color = color;
    particle.style.fontSize = `${size}px`;
    particle.style.setProperty("--particle-x", `${dx}px`);
    particle.style.setProperty("--particle-y", `${dy}px`);
    particle.style.setProperty("--particle-duration", `${duration}ms`);
    particle.addEventListener("animationend", () => particle.remove(), { once: true });
    effectLayer.appendChild(particle);
  }

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;

    const now = performance.now();
    const movedEnough = Math.hypot(event.clientX - lastTrailX, event.clientY - lastTrailY) > 12;
    if (now - lastTrailTime < 55 || !movedEnough) return;

    lastTrailTime = now;
    lastTrailX = event.clientX;
    lastTrailY = event.clientY;
    addParticle(
      trailSymbols[Math.floor(Math.random() * trailSymbols.length)],
      event.clientX,
      event.clientY,
      trailColors[Math.floor(Math.random() * trailColors.length)],
      (Math.random() - 0.5) * 24,
      -18 - Math.random() * 20,
      1000 + Math.random() * 400,
      12 + Math.random() * 4
    );
  });

  document.addEventListener("click", (event) => {
    if (event.detail === 0) return;

    for (let index = 0; index < 18; index += 1) {
      const angle = (Math.PI * 2 * index) / 18;
      const distance = 24 + Math.random() * 46;
      addParticle(
        "✦",
        event.clientX,
        event.clientY,
        burstColors[Math.floor(Math.random() * burstColors.length)],
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        450 + Math.random() * 350,
        10 + Math.random() * 7
      );
    }
  });
}