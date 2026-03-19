import { initSectionNavigation } from "../animations/scroll.js";
import { initTypingAnimation } from "../animations/typing.js";
import { initThreeBackground } from "../background/threeBackground.js";
import { initAboutScrollAnimation } from "../animations/aboutScroll.js";

const cleanupTasks = [];

function registerCleanup(cleanup) {
  if (typeof cleanup === "function") {
    cleanupTasks.push(cleanup);
  }
}

function runCleanup() {
  while (cleanupTasks.length > 0) {
    const cleanup = cleanupTasks.pop();

    try {
      cleanup();
    } catch (error) {
      console.error("Cleanup failed:", error);
    }
  }
}


[
  initThreeBackground,
  initTypingAnimation,
  initSectionNavigation,
  initAboutScrollAnimation,
].forEach((initializer) => registerCleanup(initializer()));

const viewBtn = document.getElementById("view-work");

if (viewBtn) {
  const handleViewClick = () => {
    viewBtn.animate(
      [
        { transform: "translateY(0px)" },
        { transform: "translateY(-6px)" },
        { transform: "translateY(0px)" },
      ],
      {
        duration: 400,
        easing: "ease-out",
      },
    );
  };

  viewBtn.addEventListener("click", handleViewClick);
  registerCleanup(() => viewBtn.removeEventListener("click", handleViewClick));
}

window.addEventListener("pagehide", runCleanup, { once: true });
window.addEventListener("beforeunload", runCleanup, { once: true });
