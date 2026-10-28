(() => {
  document.querySelectorAll('.archive-media img, .archive-media video').forEach((media) => {
    const failed = () => {
      const placeholder = document.createElement('div');
      placeholder.className = 'archive-no-media';
      placeholder.textContent = 'Media unavailable. Try opening the original.';
      (media.closest('.archive-image-link') || media).replaceWith(placeholder);
    };
    media.addEventListener('error', failed, { once: true });
    if (media.tagName === 'IMG' && media.complete && !media.naturalWidth) failed();
    const source = media.querySelector('source');
    if (source) source.addEventListener('error', failed, { once: true });
  });
})();
