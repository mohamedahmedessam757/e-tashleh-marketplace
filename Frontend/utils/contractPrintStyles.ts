import { CONTRACT_PRINT_FONT_STACK, CTR } from './contractPrintTheme';

/** Isolated A4 contract stylesheet — editorial legal layout, E-Tashleh brand */
export const CONTRACT_PRINT_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0 !important;
  padding: 0 !important;
  background: ${CTR.paper} !important;
  color: ${CTR.ink} !important;
  font-family: ${CONTRACT_PRINT_FONT_STACK};
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
@page { size: A4 portrait; margin: 12mm 14mm; }

.ctr-print-root {
  display: block !important;
  position: static !important;
  width: 100% !important;
  max-width: 182mm !important;
  margin: 0 auto !important;
  padding: 0 !important;
  background: ${CTR.paper} !important;
  color: ${CTR.ink} !important;
  font-size: 11px !important;
  line-height: 1.65 !important;
}
.ctr-print-root * {
  box-shadow: none !important;
  text-shadow: none !important;
  animation: none !important;
  transition: none !important;
}

/* ── Letterhead ── */
.ctr-sheet-bar {
  height: 3px !important;
  background: linear-gradient(90deg, transparent 0%, ${CTR.gold} 18%, ${CTR.goldLight} 50%, ${CTR.gold} 82%, transparent 100%) !important;
  margin: 0 0 14px 0 !important;
}
.ctr-print-logo-header {
  display: flex !important;
  align-items: flex-end !important;
  justify-content: space-between !important;
  gap: 16px !important;
  padding-bottom: 12px !important;
  margin-bottom: 14px !important;
  border-bottom: 1px solid ${CTR.line} !important;
  page-break-inside: avoid !important;
}
.ctr-brand-row {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}
.ctr-print-root img.inv-brand-logo {
  width: 52px !important;
  height: 52px !important;
  max-width: 52px !important;
  max-height: 52px !important;
  object-fit: contain !important;
}
.ctr-print-logo-header h1 {
  margin: 0 !important;
  font-size: 19px !important;
  font-weight: 800 !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
  color: ${CTR.gold} !important;
  line-height: 1.1 !important;
}
.ctr-subtitle {
  margin: 3px 0 0 0 !important;
  font-size: 9.5px !important;
  font-weight: 600 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  color: ${CTR.muted} !important;
}
.ctr-title-block { text-align: end !important; min-width: 0 !important; }
.ctr-doc-type {
  margin: 0 !important;
  font-size: 12.5px !important;
  font-weight: 800 !important;
  color: ${CTR.ink} !important;
  letter-spacing: 0.02em !important;
  line-height: 1.35 !important;
}
.ctr-store-ref {
  margin: 5px 0 0 0 !important;
  font-size: 9.5px !important;
  color: ${CTR.muted} !important;
  font-family: ui-monospace, "Cascadia Mono", monospace !important;
}
.ctr-status-pill {
  display: inline-block !important;
  margin-top: 8px !important;
  padding: 3px 10px !important;
  font-size: 8.5px !important;
  font-weight: 800 !important;
  letter-spacing: 0.1em !important;
  text-transform: uppercase !important;
  color: ${CTR.gold} !important;
  border: 1px solid ${CTR.goldBorder} !important;
  background: ${CTR.goldTint} !important;
  border-radius: 999px !important;
}

/* ── Meta panels (2-col) ── */
.ctr-meta-row {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 10px !important;
  margin-bottom: 12px !important;
}
.ctr-section {
  background: ${CTR.paperWarm} !important;
  border: 1px solid ${CTR.line} !important;
  border-radius: 4px !important;
  padding: 10px 12px 11px !important;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.ctr-section-title {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  margin: 0 0 9px 0 !important;
  padding-bottom: 7px !important;
  border-bottom: 1px solid ${CTR.goldBorder} !important;
  font-size: 9px !important;
  font-weight: 800 !important;
  letter-spacing: 0.14em !important;
  text-transform: uppercase !important;
  color: ${CTR.gold} !important;
}
.ctr-section-title::before {
  content: "" !important;
  display: block !important;
  width: 14px !important;
  height: 2px !important;
  background: ${CTR.gold} !important;
  flex-shrink: 0 !important;
}
.ctr-meta-table {
  width: 100% !important;
  border-collapse: collapse !important;
  font-size: 10px !important;
}
.ctr-meta-table td {
  padding: 5px 0 !important;
  vertical-align: top !important;
  border: none !important;
  border-bottom: 1px solid ${CTR.line} !important;
}
.ctr-meta-table tr:last-child td { border-bottom: none !important; }
.ctr-label {
  width: 42% !important;
  padding-inline-end: 8px !important;
  color: ${CTR.muted} !important;
  font-weight: 600 !important;
  font-size: 9px !important;
  letter-spacing: 0.03em !important;
}
.ctr-value {
  color: ${CTR.inkSoft} !important;
  font-weight: 700 !important;
  word-break: break-word !important;
}

/* ── Agreement body ── */
.ctr-agreement-section {
  margin: 0 0 14px 0 !important;
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
}
.ctr-agreement-head {
  text-align: center !important;
  margin: 0 0 12px 0 !important;
  page-break-after: avoid !important;
}
.ctr-agreement-title {
  margin: 0 !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  letter-spacing: 0.16em !important;
  text-transform: uppercase !important;
  color: ${CTR.ink} !important;
}
.ctr-agreement-rule {
  width: 48px !important;
  height: 2px !important;
  background: ${CTR.gold} !important;
  margin: 8px auto 0 auto !important;
}
.ctr-body-wrap {
  background: ${CTR.cream} !important;
  border: 1px solid ${CTR.goldBorder} !important;
  border-radius: 2px !important;
  padding: 18px 20px 20px !important;
  position: relative !important;
}
.ctr-body-wrap::before,
.ctr-body-wrap::after {
  content: "" !important;
  position: absolute !important;
  width: 18px !important;
  height: 18px !important;
  border-color: ${CTR.gold} !important;
  border-style: solid !important;
  opacity: 0.35 !important;
}
.ctr-body-wrap::before {
  top: 8px !important;
  inset-inline-start: 8px !important;
  border-width: 1px 0 0 1px !important;
}
.ctr-body-wrap::after {
  bottom: 8px !important;
  inset-inline-end: 8px !important;
  border-width: 0 1px 1px 0 !important;
}
.ctr-body {
  font-size: 10.5px !important;
  line-height: 1.9 !important;
  color: ${CTR.body} !important;
  text-align: start !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
}

/* Document title inside agreement */
.ctr-doc-title {
  margin: 0 0 16px 0 !important;
  padding-bottom: 12px !important;
  border-bottom: 1px solid ${CTR.line} !important;
  font-size: 14px !important;
  font-weight: 800 !important;
  color: ${CTR.ink} !important;
  text-align: center !important;
  letter-spacing: 0.01em !important;
}

/* Section breaks (مقدمة، الشروط...) */
.ctr-part-heading {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  margin: 20px 0 12px 0 !important;
  font-size: 10.5px !important;
  font-weight: 800 !important;
  color: ${CTR.ink} !important;
  letter-spacing: 0.04em !important;
}
.ctr-part-heading::before,
.ctr-part-heading::after {
  content: "" !important;
  flex: 1 !important;
  height: 1px !important;
  background: ${CTR.line} !important;
}
.ctr-part-heading span { white-space: nowrap !important; padding: 0 4px !important; }

/* Clauses — editorial card, no gradient slop */
.ctr-clause {
  margin: 0 0 14px 0 !important;
  padding: 0 !important;
  background: ${CTR.paper} !important;
  border: 1px solid ${CTR.line} !important;
  border-inline-start: 3px solid ${CTR.gold} !important;
  border-radius: 0 3px 3px 0 !important;
  break-inside: avoid-page !important;
  page-break-inside: avoid !important;
}
[dir="ltr"] .ctr-clause {
  border-inline-start: 1px solid ${CTR.line} !important;
  border-inline-end: 3px solid ${CTR.gold} !important;
  border-radius: 3px 0 0 3px !important;
}
.ctr-clause-head {
  display: flex !important;
  align-items: flex-start !important;
  gap: 10px !important;
  padding: 10px 12px 8px !important;
  background: ${CTR.goldTint} !important;
  border-bottom: 1px solid ${CTR.goldBorder} !important;
}
.ctr-clause-num {
  flex-shrink: 0 !important;
  width: 26px !important;
  height: 26px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 9px !important;
  font-weight: 800 !important;
  font-family: ui-monospace, monospace !important;
  color: ${CTR.gold} !important;
  border: 1px solid ${CTR.goldBorder} !important;
  border-radius: 50% !important;
  background: ${CTR.paper} !important;
}
.ctr-clause-titles { min-width: 0 !important; flex: 1 !important; }
.ctr-clause-label {
  display: block !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  color: ${CTR.gold} !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  margin-bottom: 2px !important;
}
.ctr-clause-topic {
  display: block !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  color: ${CTR.ink} !important;
  line-height: 1.4 !important;
}
.ctr-clause-body {
  padding: 10px 14px 12px !important;
}

.ctr-subheading {
  margin: 12px 0 6px 0 !important;
  font-size: 10.5px !important;
  font-weight: 800 !important;
  color: ${CTR.inkSoft} !important;
  padding-inline-start: 10px !important;
  border-inline-start: 2px solid ${CTR.goldMuted} !important;
}
.ctr-paragraph {
  margin: 0 0 9px 0 !important;
  text-align: justify !important;
  text-justify: inter-word !important;
  color: ${CTR.body} !important;
}
.ctr-body p, .ctr-body .ctr-paragraph { margin: 0 0 9px 0 !important; }

.ctr-numbered-list,
.ctr-bullet-list {
  margin: 4px 0 10px 0 !important;
  padding-inline-start: 20px !important;
  list-style-position: outside !important;
}
.ctr-numbered-list { list-style-type: decimal !important; }
.ctr-bullet-list { list-style-type: none !important; padding-inline-start: 0 !important; }
.ctr-bullet-list .ctr-list-item {
  position: relative !important;
  padding-inline-start: 14px !important;
}
.ctr-bullet-list .ctr-list-item::before {
  content: "" !important;
  position: absolute !important;
  inset-inline-start: 0 !important;
  top: 0.65em !important;
  width: 5px !important;
  height: 5px !important;
  border-radius: 50% !important;
  background: ${CTR.gold} !important;
}
.ctr-list-item {
  margin: 0 0 7px 0 !important;
  line-height: 1.8 !important;
  text-align: justify !important;
  color: ${CTR.body} !important;
}
.ctr-body table {
  width: 100% !important;
  border-collapse: collapse !important;
  margin: 10px 0 !important;
  font-size: 10px !important;
}
.ctr-body th, .ctr-body td {
  border: 1px solid ${CTR.line} !important;
  padding: 6px 8px !important;
  vertical-align: top !important;
}

/* ── Signatures ── */
.ctr-signatures {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 12px !important;
  margin: 16px 0 12px 0 !important;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.ctr-signature-box {
  padding: 14px 12px 12px !important;
  text-align: center !important;
  background: ${CTR.paperWarm} !important;
  border: 1px solid ${CTR.line} !important;
  border-radius: 3px !important;
  min-height: 110px !important;
}
.ctr-signature-label {
  margin: 0 0 14px 0 !important;
  font-size: 8px !important;
  font-weight: 800 !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
  color: ${CTR.muted} !important;
}
.ctr-platform-seal {
  margin: 0 !important;
  font-size: 16px !important;
  font-weight: 900 !important;
  letter-spacing: 0.2em !important;
  color: ${CTR.gold} !important;
}
.ctr-signer-name {
  margin: 0 !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  color: ${CTR.ink} !important;
  font-style: italic !important;
}
.ctr-signature-line {
  width: 60% !important;
  height: 1px !important;
  background: ${CTR.gold} !important;
  margin: 10px auto 8px auto !important;
  opacity: 0.5 !important;
}
.ctr-signature-note,
.ctr-signature-meta {
  margin: 4px 0 0 0 !important;
  font-size: 8px !important;
  color: ${CTR.muted} !important;
  letter-spacing: 0.04em !important;
}

/* ── Footer ── */
.ctr-footer {
  border-top: 1px solid ${CTR.line} !important;
  padding-top: 12px !important;
  text-align: center !important;
  break-inside: avoid !important;
}
.ctr-qr-wrap {
  display: flex !important;
  justify-content: center !important;
  margin-bottom: 8px !important;
}
.ctr-print-root svg { max-width: 72px !important; max-height: 72px !important; }
.ctr-footer-note {
  margin: 0 0 4px 0 !important;
  font-size: 9px !important;
  color: ${CTR.muted} !important;
}
.ctr-footer-meta {
  margin: 0 !important;
  font-size: 8px !important;
  font-family: ui-monospace, monospace !important;
  color: ${CTR.muted} !important;
  letter-spacing: 0.06em !important;
}

a, a[href]::after, a[href]::before { color: inherit !important; text-decoration: none !important; content: none !important; }
`;
