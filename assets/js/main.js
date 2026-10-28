/* ==========================================================================
   agnogad — interface behaviour
   Nav, mobile menu, SI reveals, counters, copy feedback, screenshot tilt.
   No dependencies. The 3D scene lives in scene.js.
   ========================================================================== */

(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Enables the enhanced-only styles. Without JS the page stays fully readable.
  root.classList.add("js");

  /* ------------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------------ */

  const menu = document.getElementById("menu");
  const menuToggle = document.querySelector(".nav-toggle");
  const narrow = window.matchMedia("(max-width: 900px)");

  const setMenu = (open) => {
    if (!menu || !menuToggle) return;

    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", String(!open));
    menu.inert = !open;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);

    // Keep the page behind the sheet out of the tab order while it is open.
    const pageRegions = document.querySelectorAll("main, .footer");
    pageRegions.forEach((region) => {
      region.inert = open;
    });

    if (open) {
      requestAnimationFrame(() => {
        menu.querySelector(".menu__link")?.focus();
      });
    }
  };

  const closeMenu = ({ restoreFocus = true } = {}) => {
    if (!menu || !menu.classList.contains("is-open")) return;
    if (restoreFocus) menuToggle?.focus();
    setMenu(false);
  };

  menuToggle?.addEventListener("click", () => {
    setMenu(!menu.classList.contains("is-open"));
  });

  menu?.querySelectorAll(".menu__link").forEach((link) => {
    link.addEventListener("click", () => closeMenu({ restoreFocus: false }));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  // Rotating a tablet into desktop width must not leave the body scroll-locked.
  narrow.addEventListener("change", (event) => {
    if (!event.matches) closeMenu({ restoreFocus: false });
  });

  /* ------------------------------------------------------------------------
     Scroll reveals + stagger
     ------------------------------------------------------------------------ */

  const revealNodes = Array.from(document.querySelectorAll("[data-reveal]"));

  document.querySelectorAll("[data-stagger]").forEach((group) => {
    Array.from(group.children)
      .filter((child) => child.matches("[data-reveal]"))
      .forEach((child, index) => {
        child.style.setProperty("--d", `${index * 80}ms`);
      });
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("is-in"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );

    revealNodes.forEach((node) => revealObserver.observe(node));
  }

  /* ------------------------------------------------------------------------
     Stat counters
     ------------------------------------------------------------------------ */

  const counters = Array.from(document.querySelectorAll(".stat__num[data-count]"));
  const numberFormat = (decimals) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const finishCounter = (node) => {
    const decimals = Number.parseInt(node.dataset.decimals || "0", 10);
    const value = Number.parseFloat(node.dataset.count);
    node.textContent = numberFormat(decimals).format(value);
  };

  const runCounter = (node) => {
    const target = Number.parseFloat(node.dataset.count);
    const decimals = Number.parseInt(node.dataset.decimals || "0", 10);
    const format = numberFormat(decimals);
    const start = performance.now();
    const duration = 1400;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = format.format(target * eased);
      if (t < 1) requestAnimationFrame(tick);
      else finishCounter(node);
    };

    requestAnimationFrame(tick);
  };

  if (counters.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      counters.forEach(finishCounter);
    } else {
      const counterObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            runCounter(entry.target);
          });
        },
        { threshold: 0.6 }
      );

      counters.forEach((node) => counterObserver.observe(node));
    }
  }

  /* ------------------------------------------------------------------------
     Copy the install command
     ------------------------------------------------------------------------ */

  const live = document.getElementById("live-region");

  const announce = (message) => {
    if (!live) return;
    live.textContent = "";
    // A tick lets repeat announcements still be read by screen readers.
    window.setTimeout(() => {
      live.textContent = message;
    }, 30);
  };

  const legacyCopy = (text) => {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
    document.body.appendChild(field);
    field.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    field.remove();
    return copied;
  };

  document.querySelectorAll("[data-copy]").forEach((button) => {
    const label = button.querySelector("span");
    let resetTimer = 0;

    button.addEventListener("click", async () => {
      const text = button.dataset.copy || "";
      let copied = false;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          copied = true;
        }
      } catch {
        copied = false;
      }

      if (!copied) copied = legacyCopy(text);

      if (copied) {
        if (label) label.textContent = "Copied";
        button.classList.add("is-copied");
        announce(`${text} copied to the clipboard.`);
      } else {
        const code = button.closest(".command")?.querySelector("code");
        if (code) {
          const range = document.createRange();
          range.selectNodeContents(code);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
        announce("Copy failed. The command is selected; use your copy shortcut.");
      }

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        if (label) label.textContent = "Copy";
        button.classList.remove("is-copied");
      }, 1600);
    });
  });

  /* ------------------------------------------------------------------------
     Screenshot tilt. Pointer-fine only, never under reduced motion.
     ------------------------------------------------------------------------ */

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (finePointer && !reduceMotion) {
    document.querySelectorAll("[data-tilt]").forEach((target) => {
      const host = target.closest(".shot") || target;

      host.addEventListener("pointermove", (event) => {
        const rect = target.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        target.style.setProperty("--rx", `${(0.5 - y) * 7}deg`);
        target.style.setProperty("--ry", `${x * 8}deg`);
      });

      host.addEventListener("pointerleave", () => {
        target.style.removeProperty("--rx");
        target.style.removeProperty("--ry");
      });
    });
  }
})();
