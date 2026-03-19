export function initAboutScrollAnimation() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return () => {};
  }
  gsap.registerPlugin(ScrollTrigger);

  const aboutSection = document.querySelector("#about");
  const aboutCard = document.querySelector(".about-card");

  if (!aboutSection || !aboutCard) return () => {};

  const children = aboutCard.querySelectorAll(
    ".card-title, .en-text, .ar-text, .contact-info-grid, .floating-contact-wrap"
  );
  
  // Temporarily disable CSS transitions on the card to prevent conflict with GSAP scrub
  // Store original transition to restore it later if needed (though scrub keeps it inline)
  const originalTransition = aboutCard.style.transition;
  aboutCard.style.transition = "none";
  
  gsap.set(aboutSection, { perspective: 2000 });
  
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: aboutSection,
      start: "top 85%", 
      end: "top 40%",
      scrub: 1, // Smooth scrubbing
      onUpdate: (self) => {
        // Ensure no CSS transitions interfere while scrolling
        if (self.isActive && aboutCard.style.transition !== "none") {
          aboutCard.style.transition = "none";
        }
      },
      onLeave: () => {
        // Restore hover transitions when user scrolls past
        aboutCard.style.transition = ""; 
      },
      onEnterBack: () => {
        aboutCard.style.transition = "none"; 
      }
    }
  });

  tl.fromTo(aboutCard, 
  {
    opacity: 0,
    scaleY: 0.1, 
    scaleX: 0.9,
    rotationX: -45,
    z: -200,
    y: 100,
    transformOrigin: "top center",
  },
  {
    opacity: 1,
    scaleY: 1,
    scaleX: 1,
    rotationX: 0,
    z: 0,
    y: 0,
    duration: 1,
    ease: "none" // linear ease is best for scrub
  })
  .fromTo(children, 
  {
    opacity: 0,
    y: 30,
  },
  {
    opacity: 1,
    y: 0,
    stagger: 0.1,
    duration: 0.5,
    ease: "none"
  }, "-=0.5");

  return () => {
    ScrollTrigger.getAll().forEach((t) => {
      if (t.trigger === aboutSection) t.kill();
    });
    aboutCard.style.transition = originalTransition;
  };
}
