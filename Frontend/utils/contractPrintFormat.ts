import { escapeHtml, sanitizeHtml } from './htmlSanitize';

const CLAUSE_AR = /^البند\s+/;
const CLAUSE_EN = /^(?:Article|Clause|Section)\s+\d+/i;
const SECTION_AR = /^(?:مقدمة|الشروط\s*والأحكام|تم\s+توقيع)/;
const SECTION_EN = /^(?:Introduction|Preamble|Terms\s*(?:and|&)\s*Conditions|Signed)/i;
const NUMBERED_ITEM = /^(\d+|[٠-٩]+)\s*[-–—.)]\s+/;
const COLON_HEADER = /^[^\n]{2,72}:$/;
const DOC_TITLE_AR = /^عقد\s+/;

type InlineBlock =
    | { kind: 'doc-title'; text: string }
    | { kind: 'clause'; text: string }
    | { kind: 'section'; text: string }
    | { kind: 'subheading'; text: string }
    | { kind: 'numbered'; text: string }
    | { kind: 'bullet'; text: string }
    | { kind: 'paragraph'; text: string };

function hasBlockHtml(content: string): boolean {
    return /<(p|div|h[1-6]|ul|ol|li|br|table|blockquote|article)\b/i.test(content);
}

function isClauseLine(line: string, language: 'ar' | 'en'): boolean {
    return language === 'ar' ? CLAUSE_AR.test(line) : CLAUSE_EN.test(line);
}

function isSectionLine(line: string, language: 'ar' | 'en'): boolean {
    if (COLON_HEADER.test(line)) return true;
    return language === 'ar' ? SECTION_AR.test(line) : SECTION_EN.test(line);
}

function isDocTitle(line: string, language: 'ar' | 'en', index: number): boolean {
    return index === 0 && language === 'ar' && DOC_TITLE_AR.test(line) && line.length < 80;
}

function isSubHeading(line: string, language: 'ar' | 'en'): boolean {
    if (line.length > 52 || line.length < 3) return false;
    if (/[.!?؟]$/.test(line)) return false;
    if (isClauseLine(line, language) || isSectionLine(line, language)) return false;
    if (NUMBERED_ITEM.test(line)) return false;
    return true;
}

function isBulletLine(line: string): boolean {
    return line.length <= 110 && /[.؟!]$/.test(line.trim());
}

function classifyLine(line: string, language: 'ar' | 'en', index: number): InlineBlock['kind'] {
    if (isDocTitle(line, language, index)) return 'doc-title';
    if (isClauseLine(line, language)) return 'clause';
    if (isSectionLine(line, language)) return 'section';
    if (NUMBERED_ITEM.test(line)) return 'numbered';
    if (isSubHeading(line, language)) return 'subheading';
    return 'paragraph';
}

function normalizeContractLineBreaks(raw: string, language: 'ar' | 'en'): string {
    let text = raw.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ');

    if (language === 'ar') {
        text = text
            .replace(/\s+(?=البند\s+)/g, '\n\n')
            .replace(/\s+(?=مقدمة:)/g, '\n\n')
            .replace(/\s+(?=الشروط\s*والأحكام:?)/g, '\n\n')
            .replace(/\s+(?=تم\s+توقيع\s+العقد)/g, '\n\n')
            .replace(/(\s)(?=\d+\s*[-–—.)]\s+)/g, '\n');
    } else {
        text = text
            .replace(/\s+(?=(?:Article|Clause|Section)\s+\d+)/gi, '\n\n')
            .replace(/(\s)(?=\d+\s*[-–—.)]\s+)/g, '\n');
    }

    return text.replace(/\n{3,}/g, '\n\n');
}

/** Split very long single-line paragraphs into readable sentence blocks. */
function expandLongLines(lines: string[]): string[] {
    const expanded: string[] = [];
    for (const line of lines) {
        if (line.length > 260) {
            const parts = line.split(/(?<=[.!?؟])\s+/).map((p) => p.trim()).filter(Boolean);
            if (parts.length > 1) {
                expanded.push(...parts);
                continue;
            }
        }
        expanded.push(line);
    }
    return expanded;
}

function parsePlainContractLines(raw: string, language: 'ar' | 'en'): InlineBlock[] {
    const normalized = normalizeContractLineBreaks(raw, language);

    const lines = expandLongLines(
        normalized.split('\n').map((l) => l.trim()).filter(Boolean),
    );
    const blocks: InlineBlock[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const kind = classifyLine(line, language, i);

        if (kind === 'paragraph' && blocks.length > 0) {
            const prev = blocks[blocks.length - 1];
            const inClauseContext =
                prev.kind === 'clause' ||
                prev.kind === 'bullet' ||
                prev.kind === 'numbered' ||
                prev.kind === 'subheading';

            if (inClauseContext && isBulletLine(line)) {
                blocks.push({ kind: 'bullet', text: line });
                continue;
            }
        }

        blocks.push({ kind, text: line });
    }

    return blocks;
}

function splitClauseTitle(text: string, language: 'ar' | 'en'): { label: string; topic: string } {
    const colonIdx = text.indexOf(':');
    if (colonIdx > 0 && colonIdx < text.length - 1) {
        return {
            label: text.slice(0, colonIdx).trim(),
            topic: text.slice(colonIdx + 1).trim(),
        };
    }
    if (language === 'en') {
        const m = text.match(/^((?:Article|Clause|Section)\s+\d+(?:\.\d+)?)\s*[:\-.]?\s*(.*)$/i);
        if (m) return { label: m[1], topic: m[2] || '' };
    }
    return { label: text, topic: '' };
}

function renderInlineBlocks(blocks: InlineBlock[], language: 'ar' | 'en'): string {
    let html = '';
    let openList: 'ol' | 'ul' | null = null;
    let clauseOpen = false;
    let clauseCounter = 0;

    const closeList = () => {
        if (openList) {
            html += openList === 'ol' ? '</ol>' : '</ul>';
            openList = null;
        }
    };

    const closeClause = () => {
        closeList();
        if (clauseOpen) {
            html += '</div></article>';
            clauseOpen = false;
        }
    };

    for (const block of blocks) {
        const safe = escapeHtml(block.text);

        switch (block.kind) {
            case 'doc-title':
                closeClause();
                html += `<h2 class="ctr-doc-title">${safe}</h2>`;
                break;
            case 'clause': {
                closeClause();
                clauseCounter += 1;
                const { label, topic } = splitClauseTitle(block.text, language);
                html += `<article class="ctr-clause"><header class="ctr-clause-head">`;
                html += `<span class="ctr-clause-num">${String(clauseCounter).padStart(2, '0')}</span>`;
                html += `<div class="ctr-clause-titles">`;
                html += `<span class="ctr-clause-label">${escapeHtml(label)}</span>`;
                if (topic) html += `<span class="ctr-clause-topic">${escapeHtml(topic)}</span>`;
                html += `</div></header><div class="ctr-clause-body">`;
                clauseOpen = true;
                break;
            }
            case 'section':
                closeClause();
                html += `<h3 class="ctr-part-heading"><span>${safe}</span></h3>`;
                break;
            case 'subheading':
                closeList();
                html += `<h5 class="ctr-subheading">${safe}</h5>`;
                break;
            case 'numbered': {
                const itemText = escapeHtml(block.text.replace(NUMBERED_ITEM, ''));
                if (openList !== 'ol') {
                    closeList();
                    html += '<ol class="ctr-numbered-list">';
                    openList = 'ol';
                }
                html += `<li class="ctr-list-item">${itemText}</li>`;
                break;
            }
            case 'bullet':
                if (openList !== 'ul') {
                    closeList();
                    html += '<ul class="ctr-bullet-list">';
                    openList = 'ul';
                }
                html += `<li class="ctr-list-item">${safe}</li>`;
                break;
            default:
                closeList();
                html += `<p class="ctr-paragraph">${safe}</p>`;
                break;
        }
    }

    closeClause();
    return html;
}

/** Parse plain-text contract snapshots into structured, print-safe HTML. */
export function formatContractContentForPrint(
    raw: string,
    language: 'ar' | 'en',
): string {
    const content = raw?.trim();
    if (!content) return '';

    if (hasBlockHtml(content)) {
        return sanitizeHtml(content);
    }

    const blocks = parsePlainContractLines(content, language);
    return sanitizeHtml(renderInlineBlocks(blocks, language));
}
