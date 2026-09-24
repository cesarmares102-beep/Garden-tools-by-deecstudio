(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var i18n = window.__I18N__ || { es: {}, en: {} };
  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var currentLang = "es";

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  function t(key) {
    var dict = i18n[currentLang] || i18n.es || {};
    return dict[key] != null ? dict[key] : (i18n.es && i18n.es[key] != null ? i18n.es[key] : "");
  }

  /* ---------------------------------------------------------
     Split text into lines, preserving <br> and <em>
     --------------------------------------------------------- */
  function splitLines(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = "1";
    var nodes = Array.prototype.slice.call(el.childNodes);
    var html = "";
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        html += node.textContent;
      } else if (node.nodeName === "BR") {
        html += "<br>";
      } else if (node.nodeType === 1) {
        var tag = node.tagName.toLowerCase();
        html += "<" + tag + ">" + node.textContent + "</" + tag + ">";
      }
    });
    var parts = html.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(function (part) {
      return '<span class="split-line"><span>' + part + "</span></span>";
    }).join("<br>");
  }

  function initSplitText() {
    $$("[data-split]").forEach(function (el) { splitLines(el); });
  }

  /* ---------------------------------------------------------
     Nav — background state on scroll + dynamic height sync.
     The nav can wrap to two rows (mobile, or a longer translated
     string), so its real height is measured instead of assumed.
     --------------------------------------------------------- */
  function initNav() {
    var nav = $("[data-nav]");
    if (!nav) return;
    function update() {
      if (window.scrollY > 12) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  var syncNavHeight = function () {};
  function initNavHeight() {
    var nav = $("[data-nav]");
    if (!nav) return;
    function sync() {
      var rect = nav.getBoundingClientRect();
      var h = Math.ceil(rect.bottom + 14);
      if (h > 0) document.documentElement.style.setProperty("--nav-h", h + "px");
    }
    syncNavHeight = sync;
    sync();
    window.addEventListener("resize", function () {
      clearTimeout(nav._navResizeT);
      nav._navResizeT = setTimeout(sync, 120);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(sync).catch(function () {});
    }
  }

  /* ---------------------------------------------------------
     Sticky buy bar — separate from the nav, fixed at the bottom.
     Height synced the same way as the nav so body padding matches.
     --------------------------------------------------------- */
  var syncCtaBarHeight = function () {};
  function initCtaBarHeight() {
    var bar = $("[data-cta-bar]");
    if (!bar) return;
    function sync() {
      var h = Math.ceil(bar.getBoundingClientRect().height);
      if (h > 0) document.documentElement.style.setProperty("--cta-bar-h", h + "px");
    }
    syncCtaBarHeight = sync;
    sync();
    window.addEventListener("resize", function () {
      clearTimeout(bar._barResizeT);
      bar._barResizeT = setTimeout(sync, 120);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(sync).catch(function () {});
    }
  }

  /* ---------------------------------------------------------
     Sticky buy bar visibility — hidden while the hero section is
     in view, shown once it's scrolled past entirely. A single
     IntersectionObserver on the hero, no scroll listener needed.
     --------------------------------------------------------- */
  function initCtaBarVisibility() {
    var bar = $("[data-cta-bar]");
    var hero = $("#top");
    if (!bar || !hero) return;

    if (!("IntersectionObserver" in window)) {
      bar.classList.add("is-visible");
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      bar.classList.toggle("is-visible", !entries[0].isIntersecting);
    });
    observer.observe(hero);
  }

  /* ---------------------------------------------------------
     Reveal on scroll (IntersectionObserver + safety timeout)
     --------------------------------------------------------- */
  function initReveals() {
    var targets = $$(".reveal");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.02, rootMargin: "0px 0px -2% 0px" });

    targets.forEach(function (el) { io.observe(el); });

    setTimeout(function () {
      $$(".reveal:not(.is-visible)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  /* ---------------------------------------------------------
     Floating bubble tooltips — auto-show on load, auto-hide after
     a few seconds, and re-show whenever the user interacts with
     the bubble. The bubble itself always stays visible.
     --------------------------------------------------------- */
  /* Fab tooltips show together while the user is idle (reading) and
     hide the moment they scroll, so the labels don't clutter the view
     while scanning the page but still surface as a "you can ask here"
     nudge whenever the user pauses. A single scroll listener (with a
     debounced re-show timer) drives both tooltips — no per-item
     timers, no polling. */
  function initFabTooltips() {
    var items = $$(".fab-item");
    if (!items.length) return;
    var IDLE_DELAY = 1100;

    var tooltips = items
      .map(function (item) { return $("[data-fab-tooltip]", item); })
      .filter(Boolean);
    if (!tooltips.length) return;

    var idleTimer = null;

    function showAll() {
      tooltips.forEach(function (t) { t.classList.add("is-visible"); });
    }
    function hideAll() {
      tooltips.forEach(function (t) { t.classList.remove("is-visible"); });
    }
    function scheduleShow() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(showAll, IDLE_DELAY);
    }

    window.addEventListener("scroll", function () {
      hideAll();
      scheduleShow();
    }, { passive: true });

    items.forEach(function (item) {
      var trigger = $("[data-fab-trigger]", item);
      if (trigger) trigger.addEventListener("focus", showAll);
    });

    scheduleShow();
  }

  /* ---------------------------------------------------------
     Hamburger site menu — links to every section of the landing
     --------------------------------------------------------- */
  function initMenu() {
    var toggle = $("[data-menu-toggle]");
    var panel = $("[data-menu-panel]");
    var backdrop = $("[data-menu-backdrop]");
    if (!toggle || !panel || !backdrop) return;
    var isOpen = false;

    function open() {
      isOpen = true;
      panel.hidden = false;
      backdrop.hidden = false;
      requestAnimationFrame(function () {
        panel.classList.add("is-open");
        backdrop.classList.add("is-open");
      });
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", t("nav.menuClose"));
      toggle.setAttribute("title", t("nav.menuClose"));
      document.documentElement.classList.add("menu-open");
    }

    function close() {
      isOpen = false;
      panel.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", t("nav.menuOpen"));
      toggle.setAttribute("title", t("nav.menuOpen"));
      document.documentElement.classList.remove("menu-open");
      setTimeout(function () {
        if (!isOpen) { panel.hidden = true; backdrop.hidden = true; }
      }, 320);
    }

    toggle.addEventListener("click", function () { isOpen ? close() : open(); });
    backdrop.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen) close(); });
    $$("[data-menu-link]", panel).forEach(function (link) {
      link.addEventListener("click", close);
    });
  }

  /* ---------------------------------------------------------
     Accordion (FAQ) — two levels: categories, then questions
     nested inside each open category. Each level is its own
     exclusive group (opening one item in a group closes any other
     item already open in that same group), and the two levels
     don't interfere with each other since they use independent
     groups of items/triggers/panels.

     Categories are sized with a generous max-height cap instead of
     a measured pixel height, so the category panel never needs to
     be re-measured when the question accordion nested inside it
     opens or closes — the nested accordion just grows within an
     already-oversized ceiling.
     --------------------------------------------------------- */
  function bindExclusiveGroup(items, triggerSel, panelSel, setOpen) {
    items.forEach(function (item) {
      var trigger = $(triggerSel, item);
      var panel = $(panelSel, item);
      if (!trigger || !panel) return;

      trigger.addEventListener("click", function () {
        var isOpen = trigger.getAttribute("aria-expanded") === "true";

        items.forEach(function (other) {
          if (other === item) return;
          var otherTrigger = $(triggerSel, other);
          var otherPanel = $(panelSel, other);
          if (otherTrigger && otherTrigger.getAttribute("aria-expanded") === "true") {
            otherTrigger.setAttribute("aria-expanded", "false");
            setOpen(otherPanel, false);
          }
        });

        trigger.setAttribute("aria-expanded", isOpen ? "false" : "true");
        setOpen(panel, !isOpen);
      });
    });
  }

  function initAccordion() {
    bindExclusiveGroup($$(".accordion-category"), ".accordion-cat-trigger", ".accordion-cat-panel", function (panel, open) {
      panel.classList.toggle("is-open", open);
    });

    $$("[data-accordion]").forEach(function (root) {
      bindExclusiveGroup($$(".accordion-item", root), ".accordion-trigger", ".accordion-panel", function (panel, open) {
        panel.style.height = open ? panel.scrollHeight + "px" : "0px";
      });
    });

    window.addEventListener("resize", function () {
      $$("[data-accordion] .accordion-item").forEach(function (item) {
        var trigger = $(".accordion-trigger", item);
        var panel = $(".accordion-panel", item);
        if (trigger && trigger.getAttribute("aria-expanded") === "true") {
          panel.style.height = panel.scrollHeight + "px";
        }
      });
    });
  }

  /* ---------------------------------------------------------
     Hero mockup — subtle tilt following cursor (fine pointer only)
     --------------------------------------------------------- */
  function initTilt() {
    if (!fineHover) return;
    var wrap = $("[data-tilt]");
    var card = $(".mockup", wrap || document);
    if (!wrap || !card) return;

    wrap.addEventListener("mousemove", function (e) {
      var rect = wrap.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      var ry = px * 14 - 8;
      var rx = py * -10 + 2;
      card.style.transform = "rotateY(" + ry + "deg) rotateX(" + rx + "deg)";
    });

    wrap.addEventListener("mouseover", function (e) {
      if (wrap.contains(e.relatedTarget)) return;
      wrap.classList.add("is-active");
    });
    wrap.addEventListener("mouseout", function (e) {
      if (wrap.contains(e.relatedTarget)) return;
      wrap.classList.remove("is-active");
      card.style.transform = "";
    });
  }

  /* ---------------------------------------------------------
     Price count-up inside the mockup
     --------------------------------------------------------- */
  function initPriceCount() {
    $$("[data-count-to]").forEach(function (el) {
      var target = parseFloat(el.getAttribute("data-count-to")) || 0;
      var done = false;

      function run() {
        if (done) return;
        done = true;
        var duration = reduced ? 1 : 1400;
        var start = null;

        function step(ts) {
          if (start === null) start = ts;
          var progress = Math.min((ts - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = "$" + (eased * target).toFixed(2);
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = "$" + target.toFixed(2);
        }
        requestAnimationFrame(step);
      }

      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) { run(); io.disconnect(); }
          });
        }, { threshold: 0.4 });
        io.observe(el);
      } else {
        run();
      }
    });
  }

  /* ---------------------------------------------------------
     Toast helper — shared by checkout + WhatsApp placeholders
     --------------------------------------------------------- */
  var toastTimer = null;
  function showToast(html) {
    var toast = $("[data-toast]");
    if (!toast) return;
    var p = $("p", toast);
    if (p && html) p.innerHTML = html;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-visible"); }, 4200);
  }

  /* ---------------------------------------------------------
     Checkout CTA — every [data-checkout-cta] button opens the
     checkout modal (the embedded Whop widget) instead of following
     its href. The widget itself is mounted once, elsewhere, by the
     Whop SDK script in index.html — this only owns show/hide.
     --------------------------------------------------------- */
  function initCheckoutModal() {
    var modal = $("[data-checkout-modal]");
    var backdrop = $("[data-checkout-modal-backdrop]");
    var closeBtn = $("[data-checkout-modal-close]");
    var triggers = $$("[data-checkout-cta]");
    if (!modal || !triggers.length) return;

    function open(e) {
      if (e) e.preventDefault();
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      requestAnimationFrame(function () { modal.classList.add("is-open"); });
      // Real checkout intent — never fired on page load, never fired
      // more than once per open(). Purchase is NOT fired from here or
      // anywhere else in the frontend; it only comes from the
      // server-side Whop webhook once payment.succeeded is confirmed.
      try {
        if (typeof fbq === "function") fbq("track", "InitiateCheckout", { value: 49.99, currency: "USD" });
      } catch (err) { /* Pixel blocked/failed — modal must still open */ }
    }
    function close() {
      modal.classList.remove("is-open");
      document.body.style.overflow = "";
      setTimeout(function () { modal.hidden = true; }, 300);
    }

    triggers.forEach(function (btn) { btn.addEventListener("click", open); });
    if (backdrop) backdrop.addEventListener("click", close);
    if (closeBtn) closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) close();
    });
  }

  /* ---------------------------------------------------------
     Social proof — floating "viewing now" / "just bought" toasts.
     Config lives in SP_CONFIG so names/city/timing are easy to tweak
     without touching the scheduling logic below. Only one setTimeout
     is ever pending at a time (self-rescheduling chain, no
     setInterval) and only one toast node exists at a time, so there's
     no listener/loop buildup and no scroll or layout cost — the toast
     is `position:fixed` and animates opacity/transform only.
     --------------------------------------------------------- */
  var SP_CONFIG = {
    names: ["Alexis", "Jonathan", "Isaac", "Miguel", "Andrea", "Fernanda", "Carlos", "Daniela"],
    city: "Texas",
    visitorCounts: [2, 3, 4],
    visibleMs: 5000,
    firstDelayMs: 6000,
    gapMinMs: 14000,
    gapMaxMs: 24000
  };
  var SP_ICONS = {
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.6" stroke="currentColor" stroke-width="1.6"/>',
    cart: '<path d="M8 12.5L10.5 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>'
  };
  var SP_STAR_PATH = "M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7L10 1.5Z";
  var SP_STARS_HTML =
    ('<svg viewBox="0 0 20 20"><path fill="currentColor" d="' + SP_STAR_PATH + '"/></svg>').repeat(4) +
    '<svg viewBox="0 0 20 20"><defs><linearGradient id="starFill-toast"><stop offset="80%" stop-color="currentColor"/><stop offset="80%" stop-color="transparent"/></linearGradient></defs>' +
    '<path fill="url(#starFill-toast)" stroke="currentColor" stroke-width="1" stroke-linejoin="round" d="' + SP_STAR_PATH + '"/></svg>';

  function initSocialProof() {
    var stack = $("[data-sp-stack]");
    if (!stack) return;

    var cfg = SP_CONFIG;
    var hideTimer = null;
    var removeTimer = null;
    var nextTimer = null;
    var lastKind = null;

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function randomGap() { return cfg.gapMinMs + Math.random() * (cfg.gapMaxMs - cfg.gapMinMs); }

    var kinds = ["visitors", "purchase", "rating"];

    function nextKind() {
      var options = kinds.filter(function (k) { return k !== lastKind; });
      var kind = pick(options);
      lastKind = kind;
      return kind;
    }

    function buildToast(kind) {
      var el = document.createElement("div");
      el.className = "sp-toast";
      el.setAttribute("role", "status");

      if (kind === "rating") {
        el.innerHTML =
          '<div class="sp-toast-body">' +
            '<div class="hero-rating-lead"><span class="hero-rating-stars" aria-hidden="true">' + SP_STARS_HTML + '</span>' +
            '<strong class="hero-rating-score">4.8</strong></div>' +
            '<p></p>' +
          '</div>';
        $("p", el).textContent = t("socialproof.ratingText");
        return el;
      }

      var title, meta = "";
      if (kind === "visitors") {
        var count = pick(cfg.visitorCounts);
        title = t("socialproof.visitors").replace("{count}", count);
      } else {
        title = t("socialproof.purchase")
          .replace("{name}", pick(cfg.names))
          .replace("{city}", cfg.city)
          .replace("{product}", t("socialproof.product"));
        meta = t("socialproof.timeAgo");
      }

      el.innerHTML =
        '<svg class="sp-toast-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">' + SP_ICONS[kind === "visitors" ? "eye" : "cart"] + '</svg>' +
        '<div class="sp-toast-body"><p></p>' + (meta ? '<span class="sp-toast-time"></span>' : '') + '</div>';
      $("p", el).textContent = title;
      if (meta) $(".sp-toast-time", el).textContent = meta;
      return el;
    }

    function show() {
      stack.innerHTML = "";
      var el = buildToast(nextKind());
      stack.appendChild(el);
      requestAnimationFrame(function () { el.classList.add("is-visible"); });

      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
      hideTimer = setTimeout(function () {
        el.classList.remove("is-visible");
        removeTimer = setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 450);
      }, cfg.visibleMs);

      nextTimer = setTimeout(show, randomGap());
    }

    nextTimer = setTimeout(show, cfg.firstDelayMs);
  }

  /* ---------------------------------------------------------
     WhatsApp CTA — "¿Tienes dudas? / Need help?" contact link
     --------------------------------------------------------- */
  function initWhatsapp() {
    var links = $$("[data-whatsapp-cta]");
    if (!links.length) return;
    var number = (data.whatsappNumber || "").replace(/\D/g, "");
    var isConfigured = number.length >= 8;

    links.forEach(function (link) {
      if (isConfigured) {
        link.setAttribute("href", "https://wa.me/" + number);
      }
      link.addEventListener("click", function (e) {
        if (!isConfigured) {
          e.preventDefault();
          showToast(t("toast.whatsappNotConfigured"));
          return;
        }
        link.setAttribute("href", "https://wa.me/" + number + "?text=" + encodeURIComponent(t("whatsapp.message")));
      });
    });
  }

  /* ---------------------------------------------------------
     Footer year
     --------------------------------------------------------- */
  function initYear() {
    var el = $("[data-year]");
    if (!el) return;
    el.textContent = new Date().getFullYear();
  }

  /* ---------------------------------------------------------
     Limited-time offer countdown — one shared 25-minute window,
     persisted in localStorage so every instance on the page (and
     a returning visitor within the window) stays in sync. Once it
     reaches zero it quietly starts a fresh 25 minutes.
     --------------------------------------------------------- */
  var COUNTDOWN_KEY = "gt-offer-deadline";
  var COUNTDOWN_MINUTES = 25;

  function initCountdown() {
    var targets = $$("[data-countdown]");
    var mmTargets = $$("[data-countdown-mm]");
    var ssTargets = $$("[data-countdown-ss]");
    if (!targets.length && !mmTargets.length && !ssTargets.length) return;

    function readDeadline() {
      var stored = null;
      try { stored = parseInt(localStorage.getItem(COUNTDOWN_KEY), 10); } catch (e) {}
      if (!stored || isNaN(stored) || stored <= Date.now()) {
        stored = Date.now() + COUNTDOWN_MINUTES * 60 * 1000;
        try { localStorage.setItem(COUNTDOWN_KEY, String(stored)); } catch (e) {}
      }
      return stored;
    }

    var deadline = readDeadline();

    function render() {
      var remaining = deadline - Date.now();
      if (remaining <= 0) {
        deadline = readDeadline();
        remaining = deadline - Date.now();
      }
      var totalSeconds = Math.max(0, Math.floor(remaining / 1000));
      var mm = Math.floor(totalSeconds / 60);
      var ss = totalSeconds % 60;
      var mmStr = mm < 10 ? "0" + mm : String(mm);
      var ssStr = ss < 10 ? "0" + ss : String(ss);
      var label = mmStr + ":" + ssStr;
      targets.forEach(function (el) { el.textContent = label; });
      mmTargets.forEach(function (el) { el.textContent = mmStr; });
      ssTargets.forEach(function (el) { el.textContent = ssStr; });
    }

    render();
    setInterval(render, 1000);
  }

  /* ---------------------------------------------------------
     Steps carousel — mobile only. Tracks which card is snapped
     into view and lights up the matching progress dot. Desktop
     shows a plain 4-up row with no JS involved.
     --------------------------------------------------------- */
  function initStepsCarousel() {
    var track = $("[data-steps-track]");
    var dots = $$("[data-steps-dots] .steps-dot");
    if (!track || !dots.length) return;

    var cards = $$(".step-card", track);
    var ticking = false;

    function updateActive() {
      ticking = false;
      var center = track.scrollLeft + track.clientWidth / 2;
      var closest = 0;
      var closestDist = Infinity;
      cards.forEach(function (card, i) {
        var dist = Math.abs((card.offsetLeft + card.offsetWidth / 2) - center);
        if (dist < closestDist) { closestDist = dist; closest = i; }
      });
      dots.forEach(function (dot, i) { dot.classList.toggle("is-active", i === closest); });
    }

    track.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateActive);
    }, { passive: true });

    updateActive();
  }

  /* ---------------------------------------------------------
     Personalización — an automatic 4-stage cycle. Page scroll is
     never touched: this only toggles which of the 4 mockups/timeline
     steps is active, on a timer, while the section is on screen. An
     earlier version pinned the section (position: sticky) for a
     400vh scroll distance, one full scroll per stage — that read as
     "the page ended here" to users who didn't expect 4 consecutive
     scrolls in the same spot, so it was replaced with this
     always-scrollable, self-playing version instead.
     --------------------------------------------------------- */
  function initPersonalizacion() {
    var track = $("[data-pv-track]");
    if (!track) return;

    var mockups = $$("[data-pv-stage].pv-mockup");
    var steps = $$("[data-pv-stage].pv-step");
    var timeline = $("[data-pv-timeline]");
    var stages = ["generic", "business", "services", "final"];
    var STAGE_MS = 3200;

    var current = -1;
    function setStage(index) {
      index = ((index % stages.length) + stages.length) % stages.length;
      if (index === current) return;
      current = index;
      var stage = stages[index];
      var activeStep = null;

      mockups.forEach(function (el) {
        el.classList.toggle("is-active", el.getAttribute("data-pv-stage") === stage);
      });
      steps.forEach(function (el) {
        var isActive = el.getAttribute("data-pv-stage") === stage;
        el.classList.toggle("is-active", isActive);
        if (isActive) activeStep = el;
      });

      // On mobile the timeline is a horizontal carousel — keep it
      // synced to the mockup instead of requiring a separate swipe.
      if (activeStep && timeline && timeline.scrollWidth > timeline.clientWidth) {
        var target = activeStep.offsetLeft - timeline.clientWidth * 0.06;
        timeline.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
      }
    }

    setStage(0);

    // Auto-playing, looping, indefinitely-repeating motion is exactly
    // what prefers-reduced-motion asks sites to avoid — respect it by
    // leaving the section on its first stage instead of cycling.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var timer = null;
    function start() {
      if (timer) return;
      timer = setInterval(function () { setStage(current + 1); }, STAGE_MS);
    }
    function stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) start(); else stop();
        });
      }, { threshold: 0.35 });
      io.observe(track);
    } else {
      start();
    }
  }

  /* ---------------------------------------------------------
     Transformation showcase — notebook-to-mockup CSS animation
     (see .transform-showcase in styles.css). Runs only while the
     section is in view; freezes on its current frame when scrolled
     away instead of resetting, same as a paused video.
     --------------------------------------------------------- */
  function initTransformShowcase() {
    var el = $("[data-transform]");
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-playing");
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        el.classList.toggle("is-playing", entry.isIntersecting);
      });
    }, { threshold: 0.3 });
    io.observe(el);
  }

  /* ---------------------------------------------------------
     Language switch — ES / EN, persisted, no page reload.
     --------------------------------------------------------- */
  var LANG_KEY = "gt-lang";

  function applyLanguage(lang, opts) {
    if (!i18n[lang]) return;
    currentLang = lang;
    opts = opts || {};

    document.documentElement.lang = lang;

    $$("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var value = t(key);
      if (!value) return;
      var isSplit = el.hasAttribute("data-split");
      el.innerHTML = value;
      if (isSplit) {
        delete el.dataset.splitDone;
        splitLines(el);
      }
    });

    $$("[data-i18n-alt]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-alt");
      var value = t(key);
      if (value) el.setAttribute("alt", value);
    });

    $$("[data-i18n-content]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-content");
      var value = t(key);
      if (value) el.setAttribute("content", value);
    });

    $$("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      var value = t(key);
      if (value) el.setAttribute("aria-label", value);
    });

    $$("[data-i18n-title]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-title");
      var value = t(key);
      if (value) el.setAttribute("title", value);
    });

    var titleKey = document.querySelector("title[data-i18n]");
    if (!titleKey) {
      var titleValue = t("meta.title");
      if (titleValue) document.title = titleValue;
    }

    $$(".lang-toggle button", document).forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-lang") === lang));
    });

    $$(".accordion-item").forEach(function (item) {
      var trigger = $(".accordion-trigger", item);
      var panel = $(".accordion-panel", item);
      if (trigger && panel && trigger.getAttribute("aria-expanded") === "true") {
        panel.style.height = panel.scrollHeight + "px";
      }
    });

    if (!opts.silent) {
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    }

    syncNavHeight();
    syncCtaBarHeight();
  }

  function initLangToggle() {
    var group = $("[data-lang-toggle]");
    if (!group) return;

    var stored = "es";
    try { stored = localStorage.getItem(LANG_KEY) || "es"; } catch (e) {}
    if (stored !== "en") stored = "es";

    if (stored !== "es") applyLanguage(stored, { silent: true });
    else {
      $$(".lang-toggle button", group).forEach(function (btn) {
        btn.setAttribute("aria-pressed", String(btn.getAttribute("data-lang") === "es"));
      });
    }

    $$("button", group).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var lang = btn.getAttribute("data-lang");
        if (lang === currentLang) return;
        applyLanguage(lang);
      });
    });
  }

  /* ---------------------------------------------------------
     Hero parallax — subtle 30px scroll-linked shift on the mockup,
     desktop only. Plain scroll listener + transform, matching the
     scroll range a GSAP ScrollTrigger("top top" to "bottom top")
     would use, without pulling in the GSAP/ScrollTrigger bundle for
     a single decorative effect.
     --------------------------------------------------------- */
  function initHeroParallax() {
    if (!fineHover || reduced) return;
    var hero = $(".hero");
    var mockup = $(".hero-mockup");
    if (!hero || !mockup) return;

    var ticking = false;
    function update() {
      ticking = false;
      var rect = hero.getBoundingClientRect();
      var progress = rect.height > 0 ? Math.max(0, Math.min(1, -rect.top / rect.height)) : 0;
      mockup.style.transform = "translateY(" + (progress * -30) + "px)";
    }
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  function boot() {
    safe(initSplitText, "initSplitText");
    safe(initLangToggle, "initLangToggle");
    safe(initNav, "initNav");
    safe(initNavHeight, "initNavHeight");
    safe(initCtaBarHeight, "initCtaBarHeight");
    safe(initCtaBarVisibility, "initCtaBarVisibility");
    safe(initReveals, "initReveals");
    safe(initMenu, "initMenu");
    safe(initFabTooltips, "initFabTooltips");
    safe(initAccordion, "initAccordion");
    safe(initTilt, "initTilt");
    safe(initPriceCount, "initPriceCount");
    safe(initCheckoutModal, "initCheckoutModal");
    safe(initWhatsapp, "initWhatsapp");
    safe(initSocialProof, "initSocialProof");
    safe(initYear, "initYear");
    safe(initCountdown, "initCountdown");
    safe(initTransformShowcase, "initTransformShowcase");
    safe(initStepsCarousel, "initStepsCarousel");
    safe(initPersonalizacion, "initPersonalizacion");
    safe(initHeroParallax, "initHeroParallax");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
