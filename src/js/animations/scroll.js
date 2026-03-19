function pushHash(targetId) {
  history.pushState(null, null, targetId);
}

export function initSectionNavigation() {
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".nav-links a");

  if (!sections.length || !navLinks.length) {
    return () => {};
  }

  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.5,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => link.classList.remove("active"));

        const id = entry.target.getAttribute("id");
        const activeLink = document.querySelector(`.nav-links a[href="#${id}"]`);

        if (activeLink) {
          activeLink.classList.add("active");
        }
      }
    });
  }, observerOptions);

  sections.forEach((section) => {
    observer.observe(section);
  });

  const cleanupHandlers = [];

  navLinks.forEach((link) => {
    const handleClick = function handleClick(event) {
      event.preventDefault();

      const targetId = this.getAttribute("href");
      const targetSection = document.querySelector(targetId);

      if (!targetSection) {
        return;
      }

      if (targetId === "#home") {
        targetSection.scrollIntoView({ behavior: "smooth" });
        pushHash(targetId);
        return;
      }

      let targetTitle = targetSection.querySelector(".target-word");

      if (!targetTitle) {
        targetTitle = targetSection.querySelector("h1, h2");
      }

      if (!targetTitle) {
        targetSection.scrollIntoView({ behavior: "smooth" });
        return;
      }

      const clone = this.cloneNode(true);
      clone.classList.add("active", "nav-clone");
      document.body.appendChild(clone);

      const startRect = this.getBoundingClientRect();
      const targetRect = targetTitle.getBoundingClientRect();

      const startAbsoluteCenterX = startRect.left + window.scrollX + startRect.width / 2;
      const startAbsoluteCenterY = startRect.top + window.scrollY + startRect.height / 2;

      const absoluteTargetCenterX = targetRect.left + window.scrollX + targetRect.width / 2;
      const absoluteTargetCenterY = targetRect.top + window.scrollY + targetRect.height / 2;

      const translateX = absoluteTargetCenterX - startAbsoluteCenterX;
      const translateY = absoluteTargetCenterY - startAbsoluteCenterY;

      clone.style.top = `${startRect.top + window.scrollY}px`;
      clone.style.left = `${startRect.left + window.scrollX}px`;
      clone.style.width = `${startRect.width}px`;
      clone.style.height = `${startRect.height}px`;
      clone.style.transformOrigin = "center center";

      targetSection.scrollIntoView({ behavior: "smooth" });

      const animation = clone.animate(
        [
          { transform: "translate(0px, 0px) scale(1)", opacity: 1, offset: 0 },
          { transform: `translate(${translateX}px, ${translateY}px) scale(3)`, opacity: 1, offset: 0.5 },
          { transform: `translate(${translateX}px, ${translateY}px) scale(3)`, opacity: 1, offset: 0.8 },
          { transform: `translate(${translateX}px, ${translateY}px) scale(3)`, opacity: 0, offset: 1 },
        ],
        {
          duration: 3000,
          easing: "ease-in-out",
          fill: "forwards",
        },
      );

      animation.onfinish = () => clone.remove();
      pushHash(targetId);
    };

    link.addEventListener("click", handleClick);
    cleanupHandlers.push(() => link.removeEventListener("click", handleClick));
  });

  return () => {
    observer.disconnect();
    cleanupHandlers.forEach((cleanup) => cleanup());
    document.querySelectorAll(".nav-clone").forEach((clone) => clone.remove());
  };
}
