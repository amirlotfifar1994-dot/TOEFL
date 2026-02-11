// Offline page interactions (CSP-friendly: no inline handlers)
(() => {
  const btn = document.getElementById('backHome');
  if (btn) {
    btn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }
})(); 
