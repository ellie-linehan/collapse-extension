document.addEventListener('DOMContentLoaded', () => {
  const collapseButton = document.getElementById('collapseButton');
  const statusElement = document.getElementById('status');
  const modeInputs = document.querySelectorAll('input[name="collapseMode"]');
  const confirmReset = document.getElementById('confirmReset');
  const confirmResetButton = document.getElementById('confirmResetButton');
  const cancelResetButton = document.getElementById('cancelResetButton');

  function getSelectedMode() {
    const selected = document.querySelector('input[name="collapseMode"]:checked');
    return selected?.value || 'current';
  }

  function updateCollapseButtonText() {
    const mode = getSelectedMode();
    if (mode === 'reset') {
      collapseButton.textContent = 'Close Everything';
    } else {
      collapseButton.textContent = mode === 'all' ? 'Collapse All Windows' : 'Collapse Current Window';
    }
  }

  function updateButtonStates() {
    const mode = getSelectedMode();
    if (mode === 'reset') {
      collapseButton.textContent = 'Close Everything';
    } else {
      collapseButton.textContent = mode === 'all' ? 'Collapse All Windows' : 'Collapse Current Window';
    }
  }

  function showResetConfirm(show) {
    if (!confirmReset) return;
    if (show) {
      confirmReset.classList.add('visible');
    } else {
      confirmReset.classList.remove('visible');
    }
  }

  // Hide confirmation panel by default
  showResetConfirm(false);

  modeInputs.forEach((input) => {
    input.addEventListener('change', updateButtonStates);
  });

  updateButtonStates();

  collapseButton.addEventListener('click', async () => {
    const mode = getSelectedMode();

    if (mode === 'reset') {
      showResetConfirm(true);
      return;
    }

    collapseButton.disabled = true;
    collapseButton.textContent = 'Collapsing...';
    statusElement.textContent = '';

    try {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'collapse', mode }, (response) => {
          if (chrome.runtime.lastError) {
            throw new Error(chrome.runtime.lastError.message);
          }
          resolve(response);
        });
      });

      statusElement.textContent = 'Windows collapsed successfully';
    } catch (error) {
      console.error('Error collapsing windows:', error);
      await setStatus('Failed to collapse windows', 3000);
    } finally {
      collapseButton.disabled = false;
      updateCollapseButtonText();
    }
  });

  function setStatus(text, duration = 2000) {
    return new Promise((resolve) => {
      statusElement.textContent = text;
      statusElement.className = 'status';
      // Force reflow to ensure the initial styles are applied
      void statusElement.offsetWidth;
      // Add visible class to trigger the animation
      statusElement.classList.add('visible');
      
      if (duration > 0) {
        setTimeout(() => {
          statusElement.classList.remove('visible');
          // Wait for the fade-out animation to complete
          setTimeout(resolve, 300);
        }, duration);
      } else {
        resolve();
      }
    });
  }

  cancelResetButton?.addEventListener('click', () => {
    showResetConfirm(false);
    collapseButton.disabled = false;
  });

  confirmResetButton?.addEventListener('click', async () => {
    collapseButton.disabled = true;
    confirmResetButton.disabled = true;
    cancelResetButton.disabled = true;

    try {
      // Show a brief toast in the popup. The "established" moment happens on the new page.
      await setStatus('Entering a new timeline . . .', 1200);

      chrome.runtime.sendMessage({ action: 'closeEverything' }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error closing everything:', chrome.runtime.lastError);
        }
      });
    } catch (error) {
      console.error('Error closing everything:', error);
      statusElement.textContent = 'Failed to close everything';
      collapseButton.disabled = false;
      confirmResetButton.disabled = false;
      cancelResetButton.disabled = false;
    }
  });
});
