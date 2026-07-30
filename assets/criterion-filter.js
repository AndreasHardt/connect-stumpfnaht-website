const state = { measurementOnly: false };
const centralRules = {
  fillet: new Set(['IMP-000010', 'IMP-000016', 'IMP-000020', 'IMP-000021', 'IMP-000039']),
  butt: new Set(['IMP-000009', 'IMP-000011', 'IMP-000038']),
};

function activeJointType() {
  return document.documentElement.dataset.appTarget === 'stumpfnaht'
    ? 'butt'
    : document.documentElement.dataset.appTarget === 'kehlnaht'
      ? 'fillet'
      : document.querySelector('input[name="joint_type"]:checked')?.value || 'fillet';
}

function filterLabel() {
  return activeJointType() === 'fillet'
    ? 'Nur die von Z1, Z2, m und h abhängigen Prüfkriterien anzeigen'
    : 'Nur die von hKV, bD, hD, bW und hW abhängigen Prüfkriterien anzeigen';
}

function classifyCards() {
  document.querySelectorAll('[data-criterion]').forEach(card => {
    const type = activeJointType();
    let measurementRelevant = centralRules[type].has(card.dataset.criterion);
    if (type === 'fillet' && card.dataset.criterion === 'IMP-000039') {
      measurementRelevant = measurementRelevant && Boolean(document.querySelector('#access_root')?.checked);
    }
    if (type === 'butt' && card.dataset.criterion === 'IMP-000009') {
      measurementRelevant = measurementRelevant && Boolean(document.querySelector('#access_face')?.checked);
    }
    if (type === 'butt' && card.dataset.criterion === 'IMP-000011') {
      measurementRelevant = measurementRelevant && Boolean(document.querySelector('#access_root')?.checked);
    }
    card.dataset.measurementRelevant = measurementRelevant ? 'true' : 'false';
  });
}

function applyFilter() {
  classifyCards();
  document.querySelectorAll('[data-criterion]').forEach(card => {
    card.classList.toggle('hidden', state.measurementOnly && card.dataset.measurementRelevant !== 'true');
  });
  document.querySelectorAll('.criterion-group').forEach(group => {
    const visibleCards = [...group.querySelectorAll('[data-criterion]')].some(card => !card.classList.contains('hidden'));
    group.classList.toggle('hidden', !visibleCards);
  });
  const button = document.querySelector('#toggle-measurement-only');
  if (button) {
    button.setAttribute('aria-pressed', String(state.measurementOnly));
    button.textContent = state.measurementOnly ? 'Alle Kriterien anzeigen' : filterLabel();
  }
}

function ensureButton() {
  const actions = document.querySelector('.criteria-toolbar .toolbar-actions');
  if (!actions || document.querySelector('#toggle-measurement-only')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  button.id = 'toggle-measurement-only';
  button.setAttribute('aria-pressed', 'false');
  button.textContent = filterLabel();
  button.addEventListener('click', () => {
    state.measurementOnly = !state.measurementOnly;
    applyFilter();
  });
  actions.prepend(button);
}

function refresh() {
  ensureButton();
  applyFilter();
}

const criteriaList = document.querySelector('#criteria-list');
if (criteriaList) new MutationObserver(refresh).observe(criteriaList, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', refresh);
document.querySelector('#access_face')?.addEventListener('change', refresh);
document.querySelector('#access_root')?.addEventListener('change', refresh);
document.querySelectorAll('input[name="joint_type"]').forEach(input => input.addEventListener('change', refresh));
refresh();
