const QUOTES = [
  { text: 'You don\'t have to be who you were 10 tabs ago.', author: 'Timeline Compliance' },
  { text: 'Start where you are. Use what you have. Do what you can.', author: 'Arthur Ashe' },
  { text: 'The best time for a fresh start is now.', author: 'Corporate Timekeeping' },
  { text: 'Small steps. Clean slate. Same you.', author: 'Internal Memo #42' },
  { text: 'Progress, not perfection.', author: 'Unreasonably Effective Humans' },
  { text: 'You are one good decision away from a better afternoon.', author: 'Calendar Invite' },
  { text: 'Today is a great day to reduce complexity.', author: 'Systems Thinking' }
];

function pickRandomQuote() {
  const idx = Math.floor(Math.random() * QUOTES.length);
  return QUOTES[idx];
}

function renderQuote() {
  const quoteText = document.getElementById('quoteText');
  const quoteAuthor = document.getElementById('quoteAuthor');

  const q = pickRandomQuote();
  quoteText.textContent = `“${q.text}”`;
  quoteAuthor.textContent = q.author ? `— ${q.author}` : '';
}

document.getElementById('anotherQuote')?.addEventListener('click', renderQuote);
document.getElementById('closeTab')?.addEventListener('click', () => {
  try {
    chrome.tabs.create({ url: 'chrome://newtab/' });
  } catch (_) {
    window.location.href = 'about:blank';
  }
});

renderQuote();
