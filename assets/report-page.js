import {
  formatNumber,
  requirementText,
  actualText,
  assessmentText,
  statusLabel,
} from './result-format.js?v=7e3ce3ad26d3';
import { filletGeometrySvg } from './fillet-geometry-svg.js?v=151dab4563de';
import { buttGeometrySvg } from './butt-geometry-svg.js';

const inspectionLabels = {
  complete: 'vollständig',
  one_sided: 'einseitig',
  not_assessable: 'nicht bewertbar',
};
const aASourceLabels = {
  legs: 'aus dem kleineren Schenkel',
  middle: 'aus dem mittleren Messwert',
  direct: 'direkt gemessen',
  model: 'aus der interpolierten Modellkontur',
};
const profileLabels = {
  straight: 'gerades Profil',
  convex: 'Überhöhung',
  concave: 'Unterwölbung',
};
const geometryStatusLabels = {
  pass: 'erfüllt',
  fail: 'nicht erfüllt',
  incomplete: 'noch unvollständig',
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function mm(value) {
  return Number.isFinite(Number(value)) ? `${formatNumber(value)} mm` : '—';
}

function degree(value) {
  return Number.isFinite(Number(value)) ? `${formatNumber(value)}°` : '—';
}

function geometryRows(geometry, jointType) {
  const t1 = geometry.t1 ?? geometry.t;
  const t2 = geometry.t2;
  if (jointType === 'Stumpfnaht') {
    const faceValue = value => geometry.accessibility?.face === false ? 'schematisch – nicht geprüft' : mm(value);
    const rootValue = value => geometry.accessibility?.root === false ? 'schematisch – nicht geprüft' : mm(value);
    return `<tr><td>Bauteildicke t1</td><td>${mm(t1)}</td><td>Bauteildicke t2</td><td>${mm(t2)}</td></tr>
      <tr><td>Nahtdicke s (Konstruktions-/Expertenwert)</td><td>${mm(geometry.s)}</td><td>Kantenversatz hKV (t2 höher)</td><td>${mm(geometry.hKV)}</td></tr>
      <tr><td>Breite der Nahtüberhöhung bD</td><td>${faceValue(geometry.bD)}</td><td>Nahtüberhöhung hD</td><td>${faceValue(geometry.hD)}</td></tr>
      <tr><td>Breite der Wurzelüberhöhung bW</td><td>${rootValue(geometry.bW)}</td><td>Wurzelüberhöhung hW</td><td>${rootValue(geometry.hW)}</td></tr>
      <tr><td>Ausführung Kantenversatz</td><td>${escapeHtml(geometry.misalignment_variant || '5071')}</td><td>Innere Darstellungsbreite bI</td><td>3,0 mm</td></tr>`;
  }
  const profile = profileLabels[geometry.profile_class] || '—';
  const source = aASourceLabels[geometry.aA_source] || '—';
  const geometryStatus = geometryStatusLabels[geometry.geometry_status?.status] || geometryStatusLabels.incomplete;
  return `<tr><td>Bauteildicke t1</td><td>${mm(t1)}</td><td>Bauteildicke t2</td><td>${mm(t2)}</td></tr>
    <tr><td>Nenn-Kehlnahtdicke a</td><td>${mm(geometry.a)}</td><td>Bauteilwinkel γ</td><td>${degree(geometry.gamma)}</td></tr>
    <tr><td>Schenkellänge z2</td><td>${mm(geometry.z2)}</td><td>Höhenmesswert m</td><td>${mm(geometry.m)}</td></tr>
    <tr><td>Schenkellänge z1</td><td>${mm(geometry.z1)}</td><td>Spalt h an der Wurzelseite</td><td>${geometry.accessibility?.root === false ? 'nicht geprüft' : mm(geometry.fitup_gap_h)}</td></tr>
    <tr><td>Vergleichshöhe m0</td><td>${mm(geometry.m0)}</td><td>Nahtbreite b</td><td>${mm(geometry.b)}</td></tr>
    <tr><td>Schenkelbezogene Kehlnahtdicke az</td><td>${mm(geometry.az)}</td><td>Tatsächliche Kehlnahtdicke aA</td><td>${mm(geometry.aA)}</td></tr>
    <tr><td>Profilabweichung</td><td>${escapeHtml(profile)} | ${mm(geometry.profile_h)}</td><td>Ungleichschenkligkeit hz</td><td>${mm(geometry.asymmetry_h)}</td></tr>
    <tr><td>Ermittlungsart aA</td><td>${escapeHtml(source)}</td><td>Direkt gemessenes aA</td><td>${mm(geometry.direct_aA)}</td></tr>
    <tr><td>Direkt gemessene Überhöhung h</td><td>${mm(geometry.direct_h)}</td><td>Messtechnische Toleranz</td><td>${mm(geometry.tolerance_mm)}</td></tr>
    <tr><td>Geometriestatus aus Nr. 1.10, 1.16, 1.20 und 1.21</td><td>${escapeHtml(geometryStatus)}</td><td></td><td></td></tr>
    <tr><td>Messlinie</td><td>Wurzelpunkt bis m auf der Winkelhalbierenden</td><td></td><td></td></tr>
    <tr><td>Einbrandkerbe 1 an Bauteil 1 (horizontal, z1)</td><td>${mm(geometry.notch1)}</td><td>Einbrandkerbe 2 an Bauteil 2 (senkrecht/abgewinkelt, z2)</td><td>${mm(geometry.notch2)}</td></tr>`;
}


function geometryFigure(geometry, jointType) {
  const svg = jointType === 'Kehlnaht'
    ? filletGeometrySvg(geometry, geometry.a, geometry.geometry_status?.status)
    : buttGeometrySvg(geometry, geometry.accessibility);
  if (!svg) return '';
  const caption = jointType === 'Kehlnaht'
    ? 'Grau: Sollkontur | Schwarz: modellierte Istkontur | Grün/Rot/Grau: maßlicher Geometriestatus nach RGL-01'
    : 'Stumpfnaht im I-Stoß | durchgezogen: gemessene Seite | gestrichelt: schematische, nicht geprüfte Seite';
  return `<figure class="report-geometry-figure">
    ${svg}
    <figcaption class="report-geometry-caption">${caption}</figcaption>
  </figure>`;
}
function messagesText(item) {
  return (item?.messages || []).map(message => `<div>${escapeHtml(message)}</div>`).join('') || '—';
}

function statusText(item) {
  if (!item) return '—';
  return `<span class="status-text ${escapeHtml(item.status)}">${escapeHtml(assessmentText(item))}</span>`;
}

function resultRows(result, otherResult, edition) {
  const otherEdition = edition === 2023 ? 2014 : 2023;
  const otherById = Object.fromEntries((otherResult?.results || []).map(item => [item.rule_id, item]));
  return (result?.results || []).map(item => {
    const other = otherById[item.rule_id];
    const differs = Boolean(other) && (item.status !== other.status || item.achieved_quality !== other.achieved_quality);
    const formula = item.formula
      ? `<div class="small"><strong>Berechnung:</strong> ${escapeHtml(item.formula)}</div>`
      : '';
    const comparisonStatus = other
      ? `<div class="status-line comparison-status ${differs ? 'norm-result-difference' : ''}"><strong>${otherEdition}</strong>${statusText(other)}${differs ? '<span class="norm-difference-note">Anderes Ergebnis nach DIN EN ISO 5817:2014</span>' : ''}</div>`
      : '';
    return `<tr>
      <td>${escapeHtml(item.table_no)}</td>
      <td><strong>${escapeHtml(item.name)}</strong><div class="small">${escapeHtml(item.ui?.section || '')}</div>${formula}</td>
      <td>${escapeHtml(requirementText(item))}</td>
      <td>${escapeHtml(actualText(item))}</td>
      <td>${messagesText(item)}</td>
      <td><div class="status-line"><strong>${edition}</strong>${statusText(item)}</div>${comparisonStatus}</td>
    </tr>`;
  }).join('');
}
function reportHeader(report, access, result, edition, config, today) {
  const accessText = result.joint_type === 'Kehlnaht'
    ? `Deckseite: vorausgesetzt; Wurzelseite: ${access.root ? 'ja' : 'nein'}`
    : `Deckseite: ${access.face ? 'ja' : 'nein'}; Wurzelseite: ${access.root ? 'ja' : 'nein'}`;
  return `<header><div class="brand">${escapeHtml(config.title)}</div><div class="subtitle">${escapeHtml(config.subtitle)}</div><div class="meta">${escapeHtml(config.platform || 'Hardt-Wiehl Connect')} | ${escapeHtml(config.domain)}</div></header>
    <h1>${edition === 2023 ? 'Bericht nach DIN EN ISO 5817:2023' : 'Vergleichsbericht nach DIN EN ISO 5817:2014'}</h1>
    ${edition === 2014 ? '<div class="legacy-notice"><strong>Vergleich nach älterer Normausgabe.</strong> Maßgebend bleibt die Ausgabe 2023.</div>' : ''}
    <table class="info">
      <tr><td>Prüfort</td><td>${escapeHtml(report.location || '—')}</td><td>Berichtsnummer</td><td>${escapeHtml(report.report_id || '—')}</td></tr>
      <tr><td>Prüfer</td><td>${escapeHtml(report.inspector || '—')}</td><td>Prüfdatum</td><td>${escapeHtml(report.inspection_date || today)}</td></tr>
      <tr><td>Bauteil</td><td>${escapeHtml(report.component || '—')}</td><td>WPS-Nr.</td><td>${escapeHtml(report.wps || '—')}</td></tr>
      <tr><td>Nahtart</td><td>${escapeHtml(result.joint_type)}</td><td>Normausgabe</td><td>DIN EN ISO 5817:${edition}</td></tr>
      <tr><td>SOLL-Bewertungsgruppe</td><td>${escapeHtml(result.required_quality)}</td><td>Zugänglichkeit</td><td>${accessText}</td></tr>
    </table>
    <div class="summary"><div><strong>Prüfstatus</strong><span>${escapeHtml(inspectionLabels[result.inspection_status] || result.inspection_status)}</span></div><div><strong>Gesamtergebnis</strong><span>${escapeHtml(statusLabel(result.status))}</span></div><div><strong>Bewertung</strong><span>${escapeHtml(result.achieved_quality ? `${result.achieved_quality} erreicht` : statusLabel(result.status))}</span></div></div>`;
}

function reportSection({ edition, result, otherResult, report, geometry, access, config, today, isTest }) {
  const isLegacy = edition === 2014;
  const testNotice = isTest ? '<div class="test-notice"><strong>TESTSYSTEM:</strong> Dieser Bericht ist noch nicht zur produktiven Verwendung freigegeben.</div>' : '';
  const combinedNotice = geometry.combined_features
    ? '<div class="note"><strong>Kombinierte Geometriemerkmale:</strong> Ungleichschenkligkeit und Profilabweichung treten im selben Querschnitt auf. Die Merkmale wurden nach den jeweiligen Einzelkriterien bewertet und nicht automatisch summiert.</div>'
    : '';
  return `<section class="report-section ${isLegacy ? 'comparison-report' : 'current-report'}" data-edition="${edition}">
    ${isTest ? '<div class="watermark">TESTBERICHT</div>' : ''}<div class="report-content">
    ${testNotice}${reportHeader(report, access, result, edition, config, today)}
    <div class="traceability">Regelbibliothek ${escapeHtml(result.library_version)} | Inhaltshash ${escapeHtml(result.library_content_sha256.slice(0, 16))}… | Assistentversion ${escapeHtml(config.prototype_version)}. Die Bewertung gilt nur für den dokumentierten, zugänglichen Prüfbereich.</div>
    <h2>Vorgaben, Messung und Berechnung</h2><table class="info">${geometryRows(geometry, result.joint_type)}</table>
    ${geometryFigure(geometry, result.joint_type)}
    ${combinedNotice}
    <div class="report-results">
    <h2>Einzelergebnisse – Ausgabe ${edition}</h2>
    <div class="table-context">SOLL bezeichnet die Anforderung, IST den festgestellten Befund oder Messwert. Berechnungsgrundlage und Normvergleich sind kompakt in Kriterium beziehungsweise Status zusammengeführt.</div>
    <table class="result-table"><thead><tr><th>Nr.</th><th>Kriterium / Berechnungsgrundlage</th><th>SOLL</th><th>IST</th><th>Bemerkung</th><th>Status</th></tr></thead><tbody>${resultRows(result, otherResult, edition)}</tbody></table>
    ${report.notes ? `<h2 class="report-notes-title">Bemerkungen</h2><div class="report-notes">${escapeHtml(report.notes)}</div>` : ''}
    <div class="signature"><div><span class="signature-line"></span><div><strong>Prüfer:</strong> ${escapeHtml(report.inspector || '—')} <strong>Datum:</strong> ${escapeHtml(today)}</div></div></div>
    </div>
    <div class="report-actions"><button class="print" type="button" data-print-edition="${edition}">Bericht ${edition} drucken</button></div>
    </div></section>`;
}

function loadStoredReport() {
  const key = decodeURIComponent(location.hash.slice(1));
  if (!key) throw new Error('Die Berichtsdaten konnten nicht zugeordnet werden. Bitte den Bericht erneut aus der Prüfung öffnen.');
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error('Die Berichtsdaten sind nicht mehr verfügbar. Bitte den Bericht erneut aus der Prüfung öffnen.');
  localStorage.removeItem(key);
  return JSON.parse(raw);
}

function renderReport(payload) {
  const { data, config } = payload;
  const primary = data.primary;
  const comparison = data.comparison;
  const report = data.report || {};
  const geometry = data.geometry || {};
  const access = data.accessibility || {};
  geometry.accessibility = access;
  const isTest = (data.app_mode || config.app_mode) !== 'production';
  const today = new Intl.DateTimeFormat('de-DE', {day:'2-digit', month:'2-digit', year:'numeric'}).format(new Date());
  document.title = report.report_id || 'ISO5817-Prüfbericht';
  document.querySelector('#reports').innerHTML =
    reportSection({ edition: 2023, result: primary, otherResult: comparison, report, geometry, access, config, today, isTest })
    + (comparison ? reportSection({ edition: 2014, result: comparison, otherResult: primary, report, geometry, access, config, today, isTest }) : '');
}

function printEdition(edition) {
  document.body.dataset.printEdition = String(edition);
  const cleanup = () => { delete document.body.dataset.printEdition; };
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  window.setTimeout(cleanup, 1000);
}

function returnToInspection() {
  if (window.opener && !window.opener.closed) {
    window.opener.focus();
    window.close();
    window.setTimeout(() => location.assign('./'), 250);
    return;
  }
  location.assign('./');
}

function showError(error) {
  const element = document.querySelector('#report-error');
  element.hidden = false;
  element.textContent = String(error?.message || error);
}

try {
  renderReport(loadStoredReport());
} catch (error) {
  showError(error);
}

document.querySelector('#back-to-inspection').addEventListener('click', returnToInspection);
document.querySelector('#reports').addEventListener('click', event => {
  const button = event.target.closest('[data-print-edition]');
  if (button) printEdition(button.dataset.printEdition);
});
