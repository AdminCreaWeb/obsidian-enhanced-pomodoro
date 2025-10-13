// runs on demand via scripting.executeScript
(function () {
  const headings = Array.from(document.querySelectorAll("h1,h2,h3")).map(
    (el) => ({ text: el.innerText.trim(), tag: el.tagName }),
  );
  return headings;
})();
