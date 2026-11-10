/* Keep scrollable dialogs above the virtual keyboard and inside notch safe areas. */
(() => {
  let queued = false;
  function update() {
    queued = false;
    const vp = window.visualViewport, style = document.documentElement.style;
    style.setProperty('--view-height', (vp?.height || innerHeight) + 'px');
    style.setProperty('--view-width', (vp?.width || innerWidth) + 'px');
    style.setProperty('--view-top', (vp?.offsetTop || 0) + 'px');
    style.setProperty('--view-left', (vp?.offsetLeft || 0) + 'px');
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener('resize', queue);
  window.visualViewport?.addEventListener('resize', queue);
  window.visualViewport?.addEventListener('scroll', queue);
  update();
})();
