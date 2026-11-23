/* ==========================================================================
   Lizzy to Lana — progressive enhancement
   Everything here is optional: every page reads and navigates without it.
   ========================================================================== */

(() => {
  "use strict";

  const doc = document;
  const root = doc.documentElement;

  /* ------------------------------------------------------------------------
     Header shadow
     ------------------------------------------------------------------------ */

  const header = doc.querySelector("[data-header]");

  if (header) {
    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------------ */

  const menu = doc.getElementById("site-menu");
  const menuOpen = doc.querySelector("[data-menu-open]");

  if (menu && menuOpen && typeof menu.showModal === "function") {
    const menuClose = menu.querySelector("[data-menu-close]");

    const closeMenu = () => {
      if (menu.open) menu.close();
    };

    menuOpen.addEventListener("click", () => {
      menu.showModal();
      doc.body.classList.add("menu-open");
      const firstLink = menu.querySelector("a");
      if (firstLink) firstLink.focus();
    });

    if (menuClose) menuClose.addEventListener("click", closeMenu);

    menu.addEventListener("close", () => {
      doc.body.classList.remove("menu-open");
      menuOpen.focus();
    });

    menu.addEventListener("click", (event) => {
      if (event.target === menu) closeMenu();
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  } else if (menuOpen) {
    menuOpen.hidden = true;
  }

  /* ------------------------------------------------------------------------
     Gallery filters
     ------------------------------------------------------------------------ */

  const filterBar = doc.querySelector("[data-filter-bar]");

  if (filterBar) {
    const chips = Array.from(filterBar.querySelectorAll("[data-filter]"));
    const tiles = Array.from(doc.querySelectorAll("[data-gallery-item]"));
    const status = doc.querySelector("[data-filter-status]");
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("era");

    const apply = (value, updateUrl = true) => {
      let visible = 0;

      tiles.forEach((tile) => {
        const match = value === "all" || tile.dataset.era === value;
        tile.hidden = !match;
        if (match) visible += 1;
      });

      chips.forEach((chip) => {
        chip.setAttribute("aria-pressed", String(chip.dataset.filter === value));
      });

      if (status) {
        const label = visible === 1 ? "item" : "items";
        status.textContent = `Showing ${visible} ${label}.`;
      }

      if (updateUrl) {
        const url = new URL(window.location.href);
        if (value === "all") url.searchParams.delete("era");
        else url.searchParams.set("era", value);
        window.history.replaceState({}, "", url);
      }
    };

    const valid = initial && chips.some((chip) => chip.dataset.filter === initial);
    apply(valid ? initial : "all", false);

    chips.forEach((chip) => {
      chip.addEventListener("click", () => apply(chip.dataset.filter));
    });
  }

  /* ------------------------------------------------------------------------
     Lightbox
     ------------------------------------------------------------------------ */

  const lightbox = doc.getElementById("lightbox");

  if (lightbox && typeof lightbox.showModal === "function") {
    const image = doc.getElementById("lightbox-image");
    const counter = doc.getElementById("lightbox-counter");
    const title = doc.getElementById("lightbox-title");
    const credit = doc.getElementById("lightbox-credit");
    const links = doc.getElementById("lightbox-links");
    const closeButton = lightbox.querySelector("[data-lightbox-close]");
    const prevButton = lightbox.querySelector("[data-lightbox-prev]");
    const nextButton = lightbox.querySelector("[data-lightbox-next]");

    let group = [];
    let index = 0;
    let opener = null;

    const render = () => {
      const tile = group[index];
      if (!tile) return;

      const { full, fullWidth, fullHeight, alt, caption, credit: by, license, licenseUrl, source } = tile.dataset;

      image.src = full || "";
      image.alt = alt || "";
      if (fullWidth) image.width = Number(fullWidth);
      if (fullHeight) image.height = Number(fullHeight);

      if (counter) counter.textContent = `${index + 1} / ${group.length}`;
      if (title) title.textContent = caption || "";
      if (credit) {
        credit.textContent = [by, license].filter(Boolean).join(" · ");
      }

      const copy = doc.getElementById("lightbox-copy");
      if (copy) {
        copy.dataset.copyText = [caption, [by, license].filter(Boolean).join(" · "), source]
          .filter(Boolean)
          .join("\n");
      }

      if (links) {
        links.replaceChildren();

        if (source) {
          const sourceLink = doc.createElement("a");
          sourceLink.href = source;
          sourceLink.target = "_blank";
          sourceLink.rel = "noopener noreferrer";
          sourceLink.textContent = "Original file page";
          links.append(sourceLink);
        }

        if (licenseUrl) {
          const licenseLink = doc.createElement("a");
          licenseLink.href = licenseUrl;
          licenseLink.target = "_blank";
          licenseLink.rel = "noopener noreferrer";
          licenseLink.textContent = license;
          links.append(licenseLink);
        }
      }

      const single = group.length < 2;
      if (prevButton) prevButton.hidden = single;
      if (nextButton) nextButton.hidden = single;
    };

    const step = (delta) => {
      if (group.length < 2) return;
      index = (index + delta + group.length) % group.length;
      render();
    };

    const open = (tile) => {
      group = Array.from(doc.querySelectorAll("[data-photo]")).filter(
        (item) => !item.closest("[data-gallery-item]")?.hidden
      );
      index = Math.max(0, group.indexOf(tile));
      opener = tile;
      render();
      lightbox.showModal();
      doc.body.classList.add("lightbox-open");
    };

    doc.addEventListener("click", (event) => {
      const tile = event.target.closest("[data-photo]");
      if (tile) open(tile);
    });

    if (closeButton) {
      closeButton.addEventListener("click", () => lightbox.close());
    }

    if (prevButton) prevButton.addEventListener("click", () => step(-1));
    if (nextButton) nextButton.addEventListener("click", () => step(1));

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) lightbox.close();
    });

    lightbox.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
    });

    lightbox.addEventListener("close", () => {
      doc.body.classList.remove("lightbox-open");
      image.removeAttribute("src");
      if (opener && typeof opener.focus === "function") opener.focus();
    });
  }

  /* ------------------------------------------------------------------------
     Copy attribution
     ------------------------------------------------------------------------ */

  const writeClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const field = doc.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    doc.body.append(field);
    field.select();
    doc.execCommand("copy");
    field.remove();
  };

  doc.addEventListener("click", (event) => {
    const button = event.target.closest("[data-copy-credit]");
    if (!button) return;
    const text = button.dataset.copyText;
    if (!text) return;

    event.preventDefault();
    event.stopPropagation();

    writeClipboard(text)
      .then(() => {
        const original = button.dataset.originalLabel || button.textContent;
        button.dataset.originalLabel = original;
        button.textContent = "Copied ✓";
        button.classList.add("is-copied");
        window.setTimeout(() => {
          button.textContent = original;
          button.classList.remove("is-copied");
        }, 1600);
      })
      .catch(() => {
        button.textContent = "Copy failed";
        window.setTimeout(() => {
          button.textContent = button.dataset.originalLabel || "Copy credit";
        }, 1600);
      });
  });

  /* ------------------------------------------------------------------------
     Reading progress
     ------------------------------------------------------------------------ */

  const progressBar = doc.querySelector("[data-progress-bar]");

  if (progressBar) {
    let ticking = false;
    const paint = () => {
      const max = doc.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progressBar.style.transform = `scaleX(${ratio})`;
      ticking = false;
    };
    const queue = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(paint);
    };
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    paint();
  }

  /* ------------------------------------------------------------------------
     Search shortcut
     ------------------------------------------------------------------------ */

  doc.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      const input = doc.querySelector(".pagefind-ui__search-input");
      if (input) input.focus();
      else window.location.href = "/search";
    }
  });

  /* ------------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------------ */

  const revealSelectors = [
    ".section-head",
    ".card-grid > *",
    ".release-grid > *",
    ".photo-grid > *",
    ".journey-item",
    ".timeline-preview li",
    ".tracklist li",
    ".ref-list li",
    ".note-card",
    ".credit-card",
    ".fact-card"
  ].join(", ");

  doc.querySelectorAll(revealSelectors).forEach((element, index) => {
    element.classList.add("reveal");
    element.style.transitionDelay = `${(index % 6) * 45}ms`;
  });

  const revealItems = Array.from(doc.querySelectorAll(".reveal"));

  if (revealItems.length) {
    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );

      revealItems.forEach((item) => observer.observe(item));
    }
  }

  /* ------------------------------------------------------------------------
     Pagefind
     ------------------------------------------------------------------------ */

  const searchRoot = doc.getElementById("search");

  if (searchRoot && typeof window.PagefindUI === "function") {
    new window.PagefindUI({
      element: "#search",
      showSubResults: true,
      showImages: false,
      resetStyles: false,
      translations: {
        placeholder: "Search eras, releases, and photographs",
        zero_results: "No results for [SEARCH_TERM]. Try an album title or a year.",
        many_results: "[COUNT] results for [SEARCH_TERM]",
        one_result: "1 result for [SEARCH_TERM]",
        searching: "Searching…"
      }
    });

    const query = new URLSearchParams(window.location.search).get("q");
    if (query) {
      const input = searchRoot.querySelector(".pagefind-ui__search-input");
      if (input) {
        input.value = query;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  } else if (searchRoot) {
    const fallback = doc.getElementById("search-fallback");
    if (fallback) fallback.hidden = false;
  }

  /* ------------------------------------------------------------------------
     Lottie orbit — decorative, local, and always animated
     ------------------------------------------------------------------------ */

  const lottieNodes = doc.querySelectorAll("[data-lottie]");

  const startLottie = () => {
    if (typeof window.lottie !== "object") return;
    if (window.lottie.setQuality) window.lottie.setQuality("low");

    lottieNodes.forEach((node) => {
      window.lottie.loadAnimation({
        container: node,
        renderer: "svg",
        frameRate: 30,
        rendererSettings: { progressiveLoad: true },
        loop: true,
        autoplay: true,
        path: node.dataset.lottie,
      });
    });
  };

  if (lottieNodes.length) {
    if (typeof window.lottie === "object") {
      startLottie();
    } else {
      const library = lottieNodes[0].dataset.lottieLib;

      window.setTimeout(() => {
        const script = doc.createElement("script");
        script.src = library;
        script.addEventListener("load", startLottie);
        doc.head.append(script);
      }, 2500);
    }
  }

  /* ------------------------------------------------------------------------
     Click feedback — a soft ripple on every solid control
     ------------------------------------------------------------------------ */

  const rippleTargets =
    ".btn, .filter-chip, .menu-toggle, .menu-close, .copy-credit, .photo-tile, " +
    ".lightbox__close, .lightbox__prev, .lightbox__next, .gallery-strip__item, " +
    ".album-card, .era-card, .journey-item__link, .prev-next a, .era-link-card";

  doc.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const host = event.target.closest(rippleTargets);
    if (!host) return;

    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const size = Math.max(rect.width, rect.height);
    const ripple = doc.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

    host.classList.add("ripple-host");
    host.append(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  });

  /* ------------------------------------------------------------------------
     Small niceties
     ------------------------------------------------------------------------ */

  doc.querySelectorAll("[data-external]").forEach((link) => {
    link.setAttribute("rel", "noopener noreferrer");
  });

  if (root.classList.contains("no-js")) {
    root.classList.remove("no-js");
  }
})();
