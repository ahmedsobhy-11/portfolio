const DEFAULT_TYPING_WORDS = [
  "Cyber Security",
  "Penetration Tester",
  "Bug Bounty Hunter",
  "Full Stack Web Developer",
];

export function initTypingAnimation({
  selector = ".typing-text",
  words = DEFAULT_TYPING_WORDS,
  startDelay = 1000,
} = {}) {
  const typingText = document.querySelector(selector);

  if (!typingText || !Array.isArray(words) || words.length === 0) {
    return () => {};
  }

  let typingWordIndex = 0;
  let typingCharIndex = 0;
  let isTypingDeleting = false;
  let timeoutId = null;
  let isDestroyed = false;

  function scheduleNext(delay) {
    timeoutId = window.setTimeout(runTyping, delay);
  }

  function runTyping() {
    if (isDestroyed) {
      return;
    }

    const currentWord = words[typingWordIndex];

    if (isTypingDeleting) {
      typingText.textContent = currentWord.substring(0, typingCharIndex - 1);
      typingCharIndex -= 1;
    } else {
      typingText.textContent = currentWord.substring(0, typingCharIndex + 1);
      typingCharIndex += 1;
    }

    let typeSpeed = isTypingDeleting ? 40 : 100;

    if (!isTypingDeleting && typingCharIndex === currentWord.length) {
      typeSpeed = 5000;
      isTypingDeleting = true;
    } else if (isTypingDeleting && typingCharIndex === 0) {
      isTypingDeleting = false;
      typingWordIndex = (typingWordIndex + 1) % words.length;
      typeSpeed = 400;
    }

    scheduleNext(typeSpeed);
  }

  scheduleNext(startDelay);

  return () => {
    isDestroyed = true;

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  };
}
