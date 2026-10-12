// ============================================================
// Kerala Lottery - Standalone Individual Public Portal Script
// ============================================================

const DB_KEY = 'kerala_lottery_db';
const THEME_KEY = 'kl_theme';

// Load shared database
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load DB:', e);
  }
  return { draws: {}, lotteryTypes: {} };
}

// ─── HELPERS ──────────────────────────────────────────────
function formatDate(dStr) {
  if (!dStr) return '-';
  const parts = dStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dStr;
}

function todayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function formatCurrency(n) {
  if (n === null || n === undefined || n === '' || isNaN(Number(n))) return '₹0';
  const val = typeof n === 'string' ? parseFloat(n.replace(/,/g, '')) : Number(n);
  if (isNaN(val)) return '₹' + n;

  const hasDecimals = (val % 1 !== 0);

  if (val >= 10000000) {
    const cr = val / 10000000;
    const crFormatted = (cr % 1 === 0) ? cr : cr.toFixed(2).replace(/\.?0+$/, '');
    return '₹' + crFormatted + ' Cr';
  }
  if (val >= 100000) {
    const lk = val / 100000;
    const lkFormatted = (lk % 1 === 0) ? lk : lk.toFixed(2).replace(/\.?0+$/, '');
    return '₹' + lkFormatted + ' Lakh';
  }
  return '₹' + val.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}

function toast(msg, type = 'info', ms = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  const container = document.getElementById('toast-container');
  if (container) {
    container.appendChild(el);
    setTimeout(() => { el.style.animation = 'slideOut .3s forwards'; setTimeout(() => el.remove(), 300); }, ms);
  }
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

function openModal(id) {
  const bg = document.getElementById('modal-bg');
  const modal = document.getElementById(id);
  if (bg) bg.classList.add('on');
  if (modal) modal.classList.add('on');
}

function closeModal(id) {
  const bg = document.getElementById('modal-bg');
  const modal = document.getElementById(id);
  if (bg) bg.classList.remove('on');
  if (modal) modal.classList.remove('on');
}

document.querySelectorAll('.mcls, [data-close]').forEach(btn => {
  btn.addEventListener('click', e => {
    const id = btn.dataset.close || btn.closest('.modal')?.id;
    if (id) closeModal(id);
  });
});

document.getElementById('modal-bg')?.addEventListener('click', () => {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('on'));
  document.getElementById('modal-bg')?.classList.remove('on');
});

// ─── THEME ────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  setTheme(saved);
  const sel = document.getElementById('theme-select-public');
  if (sel) sel.value = saved;
  const selIndiv = document.getElementById('theme-select-indiv');
  if (selIndiv) selIndiv.value = saved;
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const sel1 = document.getElementById('theme-select-public');
  if (sel1) sel1.value = theme;
  const sel2 = document.getElementById('theme-select-indiv');
  if (sel2) sel2.value = theme;
}

document.getElementById('theme-select-public')?.addEventListener('change', e => setTheme(e.target.value));
document.getElementById('theme-select-indiv')?.addEventListener('change', e => setTheme(e.target.value));

// ─── LOTTERY TYPES ────────────────────────────────────────
function getLotteryById(id) {
  const db = loadDB();
  if (db.lotteryTypes && db.lotteryTypes[id]) return db.lotteryTypes[id];
  return { id, name: id, code: id, prize1: 7500000 };
}

function getLotteryTypes(includeHidden = false) {
  const db = loadDB();
  let types = [];
  if (db.customLotteryTypes && Array.isArray(db.customLotteryTypes)) {
    types = db.customLotteryTypes;
  } else if (db.lotteryTypes) {
    types = Object.values(db.lotteryTypes);
  }
  if (!includeHidden) {
    types = types.filter(t => !t.hidden);
  }
  return types;
}

// ─── PUBLIC RESULTS LIST ──────────────────────────────────
function populatePublicFilters() {
  const db = loadDB();
  const types = getLotteryTypes();
  const sel1 = document.getElementById('checker-lottery');
  if (sel1) {
    sel1.innerHTML = '<option value="">All Lottery Types</option>' +
      types.map(t => `<option value="${t.id}">${t.name} (${t.code})</option>`).join('');
  }
  const sel2 = document.getElementById('pub-lottery-filter');
  if (sel2) {
    sel2.innerHTML = '<option value="">All Lotteries</option>' +
      types.map(t => `<option value="${t.id}">${t.name} (${t.code})</option>`).join('');
  }
  const checkerDate = document.getElementById('checker-date');
  if (checkerDate) checkerDate.value = todayStr();
}

function buildDrawCard(d) {
  const lt = getLotteryById(d.lotteryId);
  const p1 = d.prizes ? d.prizes.find(p => p.rank === '1') : null;
  const p1Num = p1 && p1.numbers && p1.numbers[0] ? p1.numbers[0] : null;
  const p1Amt = p1 ? formatCurrency(p1.amount) : (lt ? formatCurrency(lt.prize1) : '₹75 Lakh');

  const numDisplay = p1Num
    ? `${p1Num.series && p1Num.series !== 'ALL' ? p1Num.series + ' ' : ''}${p1Num.number}${p1Num.location ? ` <span class="loc-tag">(${p1Num.location})</span>` : ''}`
    : 'Winning ticket pending';

  return `
    <div class="draw-result-card clickable" onclick="showIndividualDraw('${d.id}')" title="Click to view complete official results">
      <div class="drc-header pub-hdr">
        <div class="drc-h-left">
          <div class="drc-lottery-name">${lt ? lt.name : d.lotteryId}</div>
          <div class="drc-draw-no">Draw No: ${d.drawNo}</div>
          <div class="drc-date">📅 ${formatDate(d.drawDate)}</div>
        </div>
        <span class="pill pill-green">${d.status}</span>
      </div>
      <div class="drc-summary-body">
        <div class="c1st-highlight-box">
          <div class="c1st-tag">🏆 1ST PRIZE &bull; ${p1Amt}</div>
          <div class="c1st-ticket mono">${numDisplay}</div>
        </div>
        <div class="drc-hint-bar">
          <span>📍 ${d.venue ? d.venue.split(',')[0] : 'Kerala'}</span>
          <span class="view-link">Click for 1st - 8th Prizes &amp; Consolation &rarr;</span>
        </div>
      </div>
      <div class="drc-footer" onclick="event.stopPropagation()">
        <span style="font-size:11px;color:var(--text3)">Govt. of Kerala</span>
        <button class="btn btn-sm btn-gold" onclick="event.stopPropagation(); showIndividualDraw('${d.id}')">📄 Full Official Result</button>
      </div>
    </div>`;
}

function renderPublicResults() {
  const db = loadDB();
  const lotF = document.getElementById('pub-lottery-filter')?.value || '';
  const dateF = document.getElementById('pub-date-filter')?.value || '';
  const sortO = document.getElementById('pub-sort-order')?.value || 'desc';
  const grid = document.getElementById('pub-results-grid');
  if (!grid) return;

  // Apply row or column layout class
  const savedLayout = localStorage.getItem('kl_layout_pub_results') || 'cols';
  if (savedLayout === 'rows') grid.classList.add('view-rows');
  else grid.classList.remove('view-rows');

  const draws = Object.values(db.draws || {})
    .filter(d => d.status === 'published' && (!lotF || d.lotteryId === lotF) && (!dateF || d.drawDate === dateF))
    .sort((a, b) => {
      if (sortO === 'asc') return a.drawDate.localeCompare(b.drawDate);
      return b.drawDate.localeCompare(a.drawDate);
    });

  grid.innerHTML = draws.map(d => buildDrawCard(d)).join('') ||
    `<div style="text-align:center;color:var(--text2);padding:48px;grid-column:1/-1">
      <div style="font-size:48px;margin-bottom:12px">🎟</div>
      <p>No published results found for the selected filters.</p>
    </div>`;
}

function initPublicLayoutToggle() {
  const container = document.getElementById('toggle-pub-layout');
  const target = document.getElementById('pub-results-grid');
  if (!container || !target) return;

  let currentMode = localStorage.getItem('kl_layout_pub_results') || 'cols';
  const updateButtons = (mode) => {
    container.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-layout') === mode);
    });
    if (mode === 'rows') target.classList.add('view-rows');
    else target.classList.remove('view-rows');
  };
  updateButtons(currentMode);

  container.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-layout');
      currentMode = mode;
      localStorage.setItem('kl_layout_pub_results', mode);
      updateButtons(mode);
    });
  });
}

document.getElementById('pub-filter-btn')?.addEventListener('click', renderPublicResults);
document.getElementById('pub-lottery-filter')?.addEventListener('change', renderPublicResults);
document.getElementById('pub-sort-order')?.addEventListener('change', renderPublicResults);

function renderRibbon() {
  const ribbon = document.getElementById('ribbon-items');
  if (!ribbon) return;
  const types = getLotteryTypes();
  ribbon.innerHTML = types.map(lt =>
    `<div class="ribbon-chip" onclick="filterByLottery('${lt.id}')">
      <div class="rc-name">${lt.name}</div>
      <div class="rc-day">${lt.day}</div>
    </div>`
  ).join('');
}

function filterByLottery(id) {
  const filter = document.getElementById('pub-lottery-filter');
  if (filter) filter.value = id;
  renderPublicResults();
  document.querySelector('.latest-section')?.scrollIntoView({ behavior: 'smooth' });
}

// ─── TICKET CHECKER ───────────────────────────────────────
document.getElementById('check-btn')?.addEventListener('click', checkTicket);
document.getElementById('checker-number')?.addEventListener('keydown', e => { if (e.key === 'Enter') checkTicket(); });
document.getElementById('checker-series')?.addEventListener('keydown', e => { if (e.key === 'Enter') checkTicket(); });
document.getElementById('checker-series')?.addEventListener('input', e => {
  if (e.target) e.target.value = e.target.value.toUpperCase();
});

function checkTicket() {
  const db = loadDB();
  const lotId = document.getElementById('checker-lottery')?.value;
  const dateStr = document.getElementById('checker-date')?.value;
  let rawInput = document.getElementById('checker-number')?.value?.trim() || '';
  let manualSeries = document.getElementById('checker-series')?.value?.trim().toUpperCase() || '';
  const output = document.getElementById('checker-result');
  if (!output) return;

  // Smart detect if user accidentally swapped series and number fields
  if (/^[A-Za-z]{1,3}$/.test(rawInput) && /^[0-9\.]+$/.test(manualSeries)) {
    const tmp = rawInput;
    rawInput = manualSeries;
    manualSeries = tmp.toUpperCase();
  }

  // If number input is empty but series input has combined format (e.g., "BT 886602")
  if (!rawInput && manualSeries) {
    const comboMatch = manualSeries.match(/^([A-Za-z]{1,3})[\s\-]+([0-9\.]+)/i);
    if (comboMatch) {
      manualSeries = comboMatch[1].toUpperCase();
      rawInput = comboMatch[2];
    }
  }

  if (!rawInput) {
    toast('Enter a 6-digit ticket or 4-digit winning number to verify', 'warning');
    return;
  }

  // Parse input - supports 6-digit, 4-digit, embedded series, and decimal values
  let text = rawInput;
  let parsedSeries = manualSeries;

  // Extract embedded series if present in number box (e.g. "BT 886602", "BT-886602", "BT886602")
  const serMatch = text.match(/^([A-Za-z]{1,3})[\s\-]+([0-9\.]+)/i);
  if (serMatch) {
    if (!parsedSeries) parsedSeries = serMatch[1].toUpperCase();
    text = serMatch[2];
  } else {
    const serPrefix = text.match(/^([A-Za-z]{1,3})([0-9]{4,6})/i);
    if (serPrefix) {
      if (!parsedSeries) parsedSeries = serPrefix[1].toUpperCase();
      text = serPrefix[2];
    }
  }

  // Check for decimal value
  let isDecimal = text.includes('.');
  let decimalVal = null;
  let cleanNumber = text;

  if (isDecimal) {
    const parsedFloat = parseFloat(text);
    if (!isNaN(parsedFloat)) {
      decimalVal = parsedFloat;
      // Extract integer portion for ticket matching
      cleanNumber = text.split('.')[0];
    }
  }

  // Clean pure digits for ticket matching
  cleanNumber = cleanNumber.replace(/\D/g, '');

  const isFourDigit = cleanNumber.length === 4;
  const isSixDigit = cleanNumber.length === 6;

  // Filter published draws
  const allPublishedDraws = Object.values(db.draws || {}).filter(d => d.status === 'published');
  let draws = allPublishedDraws.filter(d =>
    (!lotId || d.lotteryId === lotId) &&
    (!dateStr || d.drawDate === dateStr)
  );

  // If specific date/lottery filter gave no draws, fallback to all published draws
  if (draws.length === 0 && allPublishedDraws.length > 0) {
    draws = allPublishedDraws;
  }

  // Search published draws for matching prize
  let foundPrize = null;
  let foundDraw = null;
  let matchedNumber = null;
  let matchType = '';
  let seriesMismatchInfo = null;

  function scanDraws(list) {
    for (const d of list) {
      if (!d.prizes) continue;
      for (const p of d.prizes) {
        for (const n of p.numbers) {
          const nNum = String(n.number).trim();
          const nDigits = nNum.length;

          if (isSixDigit) {
            if (nDigits === 6) {
              const numMatches = (nNum === cleanNumber);
              const serMatches = !parsedSeries || n.series === 'ALL' || n.series === parsedSeries;
              if (numMatches && serMatches) {
                return { prize: p, draw: d, number: n, type: '6-digit exact' };
              } else if (numMatches && !serMatches && !seriesMismatchInfo) {
                seriesMismatchInfo = {
                  prize: p,
                  draw: d,
                  winningSeries: n.series || 'ALL',
                  enteredSeries: parsedSeries,
                  number: nNum
                };
              }
            } else if (nDigits === 4 && cleanNumber.slice(-4) === nNum) {
              return { prize: p, draw: d, number: n, type: '4-digit last-digits' };
            }
          } else if (isFourDigit && nDigits === 4 && nNum === cleanNumber) {
            return { prize: p, draw: d, number: n, type: '4-digit exact' };
          }
        }
      }
    }
    return null;
  }

  if (isSixDigit || isFourDigit) {
    // 1. Check in user's selected draw/date
    const res = scanDraws(draws);
    if (res) {
      foundPrize = res.prize;
      foundDraw = res.draw;
      matchedNumber = res.number;
      matchType = res.type;
    } else {
      // 2. Fallback: Check across all published draws so user never misses a win if date is today's default
      const remainingDraws = allPublishedDraws.filter(d => !draws.includes(d));
      if (remainingDraws.length > 0) {
        const fallbackRes = scanDraws(remainingDraws);
        if (fallbackRes) {
          foundPrize = fallbackRes.prize;
          foundDraw = fallbackRes.draw;
          matchedNumber = fallbackRes.number;
          matchType = fallbackRes.type;
        }
      }
    }
  }

  // If ticket didn't win or was not a ticket, check if user searched by decimal prize amount (e.g. 5000.00, 500.50, 7500000.00)
  if (!foundPrize && decimalVal !== null) {
    let matchedPrize = null;
    let matchedDraw = null;
    for (const d of draws) {
      if (!d.prizes) continue;
      for (const p of d.prizes) {
        if (Math.abs(parseFloat(p.amount) - decimalVal) < 0.001) {
          matchedPrize = p;
          matchedDraw = d;
          break;
        }
      }
      if (matchedPrize) break;
    }

    if (matchedPrize && matchedDraw) {
      const lt = getLotteryById(matchedDraw.lotteryId);
      const sampleNums = (matchedPrize.numbers || []).slice(0, 10).map(n => n.series && n.series !== 'ALL' ? `${n.series} ${n.number}` : n.number).join(', ');
      output.innerHTML = `
        <div class="check-win">
          <h3>💰 Prize Tier Found by Decimal Amount!</h3>
          <p><b>Lottery:</b> ${lt ? lt.name : matchedDraw.lotteryId} — Draw ${matchedDraw.drawNo}</p>
          <p><b>Draw Date:</b> ${formatDate(matchedDraw.drawDate)}</p>
          <p><b>Prize Tier:</b> ${matchedPrize.label} — <span style="color:var(--gold-l);font-weight:800;font-size:22px">${formatCurrency(matchedPrize.amount)}</span></p>
          <div style="margin-top:10px;background:rgba(255,255,255,.05);padding:10px;border-radius:var(--rs);text-align:left">
            <span style="font-size:12px;color:var(--text2)">Winning Numbers (${matchedPrize.numbers.length} total):</span>
            <div class="mono" style="font-size:14px;color:var(--text);margin-top:4px;word-break:break-all">${sampleNums}${matchedPrize.numbers.length > 10 ? '...' : ''}</div>
          </div>
          <div style="margin-top:14px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-gold btn-sm" onclick="showIndividualDraw('${matchedDraw.id}')">📄 View Official Gazette Sheet</button>
          </div>
        </div>`;
      toast(`Found prize tier: ${matchedPrize.label} (${formatCurrency(matchedPrize.amount)})`, 'success');
      return;
    }
  }

  // Strict validation: Winning number find six digit and four digit only!
  if (!foundPrize && !seriesMismatchInfo && !isFourDigit && !isSixDigit) {
    output.innerHTML = `
      <div class="check-lose" style="border-color:rgba(212,169,65,.4)">
        <h3 style="color:var(--gold-l)">⚠️ 6-Digit or 4-Digit Numbers Only</h3>
        <p>Winning numbers can only be verified for <b>6-digit</b> full tickets or <b>4-digit</b> winning numbers (decimal values also supported).</p>
        <p style="font-size:13px;color:var(--text3);margin-top:8px">You entered: <b class="mono">${escapeHTML(rawInput)}</b> (${cleanNumber.length} digits). Please manual enter your 2-digit series (e.g. BT) and 6-digit ticket (e.g. 886602) or 4-digit winning number (e.g. 0101).</p>
      </div>`;
    toast('Enter a 6-digit ticket or 4-digit winning number', 'warning');
    return;
  }

  // Check if ticket won!
  if (foundPrize && foundDraw) {
    const lt = getLotteryById(foundDraw.lotteryId);
    const displayTicket = (parsedSeries ? parsedSeries + ' ' : '') + cleanNumber + (isDecimal ? ' (' + rawInput + ')' : '');
    const reasonText = matchType === '4-digit last-digits'
      ? `(Matched on winning last 4 digits: <b class="mono">${matchedNumber.number}</b>)`
      : matchType === '4-digit exact'
      ? `(Exact 4-digit winning number: <b class="mono">${matchedNumber.number}</b>)`
      : `(Exact 6-digit ticket: <b class="mono">${(matchedNumber.series && matchedNumber.series !== 'ALL' ? matchedNumber.series + ' ' : '') + matchedNumber.number}</b>)`;

    output.innerHTML = `
      <div class="check-win">
        <h3>🎉 CONGRATULATIONS! YOU WON!</h3>
        <p style="font-size:16px;margin-bottom:8px">Ticket <b>${displayTicket}</b> has won the <b>${foundPrize.label}</b>!</p>
        <div style="font-size:28px;font-weight:900;color:var(--gold-l);margin-bottom:8px">${formatCurrency(foundPrize.amount)}</div>
        <p style="font-size:13px;color:var(--text2);margin-bottom:6px">${reasonText}</p>
        <p style="font-size:13px;color:var(--text3)">Draw: ${lt ? lt.name : foundDraw.lotteryId} (${foundDraw.drawNo}) on ${formatDate(foundDraw.drawDate)}</p>
        <div style="margin-top:14px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-gold btn-sm" onclick="showIndividualDraw('${foundDraw.id}')">📄 View Official Result Sheet</button>
        </div>
        <p style="margin-top:12px;font-size:11px;color:var(--text3)">Please verify with Kerala Government Gazette and surrender the winning ticket within 30 days.</p>
      </div>`;
    toast(`🎉 Winner! ${foundPrize.label} - ${formatCurrency(foundPrize.amount)}`, 'success', 5000);
  } else if (seriesMismatchInfo) {
    // Official 6-digit winning number matched, but manual 2-digit series code was different!
    const lt = getLotteryById(seriesMismatchInfo.draw.lotteryId);
    output.innerHTML = `
      <div class="check-lose" style="border-color:rgba(212,169,65,.5)">
        <h3 style="color:var(--gold-l)">⚠️ Series Mismatch (Official Winning Number)</h3>
        <p style="font-size:15px;margin-bottom:8px">Ticket number <b class="mono" style="font-size:17px">${seriesMismatchInfo.number}</b> won <b>${seriesMismatchInfo.prize.label}</b> (<span style="color:var(--gold-l);font-weight:700">${formatCurrency(seriesMismatchInfo.prize.amount)}</span>) in <b>${lt ? lt.name : seriesMismatchInfo.draw.lotteryId}</b> on <b>${formatDate(seriesMismatchInfo.draw.drawDate)}</b>.</p>
        <div style="background:rgba(255,255,255,.05);padding:12px;border-radius:var(--rs);margin:10px 0;display:inline-block;text-align:left">
          <div>Official Winning Series: <b class="mono" style="color:var(--gold-l);font-size:16px">${seriesMismatchInfo.winningSeries}</b></div>
          <div style="margin-top:4px">Your Entered Series: <b class="mono" style="color:#FC8181;font-size:16px">${seriesMismatchInfo.enteredSeries}</b></div>
        </div>
        <p style="font-size:12px;color:var(--text3);margin-top:4px">Under Kerala Government Lottery Rules, top prizes require matching the exact 2-digit series code.</p>
        <div style="margin-top:12px;display:flex;gap:10px;justify-content:center">
          <button class="btn btn-outline btn-sm" onclick="showIndividualDraw('${seriesMismatchInfo.draw.id}')">📄 View Official Gazette Sheet</button>
        </div>
      </div>`;
    toast(`Series mismatch: Winning series is ${seriesMismatchInfo.winningSeries}`, 'warning', 4500);
  } else {
    const displayTicket = (parsedSeries ? parsedSeries + ' ' : '') + cleanNumber + (isDecimal ? ' (' + rawInput + ')' : '');
    output.innerHTML = `
      <div class="check-lose">
        <h3>😔 Better Luck Next Time!</h3>
        <p>Ticket <b class="mono">${displayTicket}</b> (${cleanNumber.length}-digit) did not win a prize${dateStr ? ` in the draw on ${formatDate(dateStr)}` : ''}.</p>
        <p style="margin-top:8px;font-size:12px;color:var(--text3)">Verified across official published draws for 6-digit winning tickets and 4-digit prize numbers.</p>
      </div>`;
  }
}

// ─── INDIVIDUAL LOTTERY RESULT PAGE ───────────────────────
function showIndividualDraw(id) {
  const db = loadDB();
  const d = db.draws ? db.draws[id] : null;
  if (!d) { toast('Draw results not found', 'warning'); return; }
  const lt = getLotteryById(d.lotteryId);

  const p1 = d.prizes ? d.prizes.find(p => p.rank === '1') : null;
  const p1Ticket = p1 && p1.numbers && p1.numbers[0] ? p1.numbers[0] : null;
  const p1Amt = p1 ? formatCurrency(p1.amount) : (lt ? formatCurrency(lt.prize1) : '₹75,00,000');
  const pCons = d.prizes ? d.prizes.find(p => p.rank === 'C') : null;
  const p2 = d.prizes ? d.prizes.find(p => p.rank === '2') : null;
  const p3 = d.prizes ? d.prizes.find(p => p.rank === '3') : null;
  const otherPrizes = d.prizes ? d.prizes.filter(p => !['1', 'C', '2', '3'].includes(p.rank)) : [];

  const titleEl = document.getElementById('indiv-top-title');
  if (titleEl) titleEl.textContent = `${lt ? lt.name : d.lotteryId} (${d.drawNo})`;
  const subEl = document.getElementById('indiv-top-sub');
  if (subEl) subEl.textContent = `Official Gazette Result • ${formatDate(d.drawDate)}`;

  // Consolation tickets HTML
  const consolHTML = pCons && pCons.numbers.length > 0 ? `
    <div class="indiv-sec-card" data-prize-amt="${pCons.amount}">
      <div class="indiv-sec-hdr">
        <div class="indiv-sec-title"><span>🏅</span> Consolation Prize: <b style="color:var(--gold-l)">${formatCurrency(pCons.amount)}</b></div>
        <span style="font-size:12px;color:var(--text2)">${pCons.numbers.length} Winning Series</span>
      </div>
      <div class="indiv-consol-grid">
        ${pCons.numbers.map(n => `
          <div class="indiv-consol-item indiv-num-item" data-num="${n.number}" data-digits="${String(n.number).length}" data-series="${n.series || 'ALL'}" data-prize="Consolation Prize">
            <span class="indiv-consol-ser">${n.series && n.series !== 'ALL' ? n.series : 'ALL'}</span>
            <span class="indiv-consol-num mono">${n.number}</span>
            ${n.location ? `<span class="loc-tag">(${n.location})</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>` : '';

  // 2nd Prize HTML
  const p2HTML = p2 && p2.numbers.length > 0 ? `
    <div class="indiv-sec-card" data-prize-amt="${p2.amount}">
      <div class="indiv-sec-hdr">
        <div class="indiv-sec-title"><span>🥈</span> 2nd Prize: <b style="color:var(--gold-l)">${formatCurrency(p2.amount)}</b></div>
        <span style="font-size:12px;color:var(--text2)">${p2.numbers.length} Ticket${p2.numbers.length > 1 ? 's' : ''}</span>
      </div>
      <div class="indiv-consol-grid">
        ${p2.numbers.map(n => `
          <div class="indiv-consol-item indiv-num-item" data-num="${n.number}" data-digits="${String(n.number).length}" data-series="${n.series || 'ALL'}" data-prize="2nd Prize" style="border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.05)">
            <span class="indiv-consol-ser" style="background:var(--green);color:#fff">${n.series && n.series !== 'ALL' ? n.series : 'ALL'}</span>
            <span class="indiv-consol-num mono" style="font-size:16px">${n.number}</span>
            ${n.location ? `<span class="loc-tag" style="background:rgba(16,185,129,.2);color:var(--green-l)">(${n.location})</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>` : '';

  // 3rd Prize HTML
  const p3HTML = p3 && p3.numbers.length > 0 ? `
    <div class="indiv-sec-card" data-prize-amt="${p3.amount}">
      <div class="indiv-sec-hdr">
        <div class="indiv-sec-title"><span>🥉</span> 3rd Prize: <b style="color:var(--gold-l)">${formatCurrency(p3.amount)}</b></div>
        <span style="font-size:12px;color:var(--text2)">${p3.numbers.length} Ticket${p3.numbers.length > 1 ? 's' : ''}</span>
      </div>
      <div class="indiv-consol-grid">
        ${p3.numbers.map(n => `
          <div class="indiv-consol-item indiv-num-item" data-num="${n.number}" data-digits="${String(n.number).length}" data-series="${n.series || 'ALL'}" data-prize="3rd Prize">
            <span class="indiv-consol-ser">${n.series && n.series !== 'ALL' ? n.series : 'ALL'}</span>
            <span class="indiv-consol-num mono">${n.number}</span>
            ${n.location ? `<span class="loc-tag">(${n.location})</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>` : '';

  // Other prizes HTML
  const otherHTML = otherPrizes.map(p => `
    <div class="indiv-sec-card" data-prize-amt="${p.amount}">
      <div class="indiv-sec-hdr">
        <div class="indiv-sec-title"><span>🎁</span> ${p.label}: <b style="color:var(--gold-l)">${formatCurrency(p.amount)}</b></div>
        <span style="font-size:12px;color:var(--text2)">${p.numbers.length} Winning Numbers</span>
      </div>
      <div class="indiv-nums-grid">
        ${p.numbers.map(n => `<span class="indiv-num-box indiv-num-item" data-num="${n.number}" data-digits="${String(n.number).length}" data-prize="${p.label}">${n.number}</span>`).join('')}
      </div>
    </div>
  `).join('');

  const content = document.getElementById('indiv-result-content');
  if (!content) return;

  content.innerHTML = `
    <div class="indiv-sheet" id="printable-indiv-sheet">
      <div class="indiv-gazette-head">
        <div class="indiv-gov-badge">🏛️ Government of Kerala • Directorate of State Lotteries</div>
        <h1 class="indiv-title">${lt ? lt.name.toUpperCase() : d.lotteryId} LOTTERY RESULT</h1>
        <div class="indiv-sub">Official Gazette Publication • Prize Winning Numbers List</div>
        <div class="indiv-meta-grid">
          <div class="indiv-meta-item">
            <span class="indiv-meta-label">Draw Number</span>
            <span class="indiv-meta-val" style="color:var(--gold-l)">${d.drawNo}</span>
          </div>
          <div class="indiv-meta-item">
            <span class="indiv-meta-label">Draw Date</span>
            <span class="indiv-meta-val">${formatDate(d.drawDate)}</span>
          </div>
          <div class="indiv-meta-item">
            <span class="indiv-meta-label">Venue / Place</span>
            <span class="indiv-meta-val">${d.venue || 'Gorky Bhavan, Near Gandhari Amman Kovil, Thiruvananthapuram'}</span>
          </div>
          <div class="indiv-meta-item">
            <span class="indiv-meta-label">Publication Status</span>
            <span class="indiv-meta-val" style="color:var(--green-l)">✓ ${d.status.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <!-- Quick Number Live Finder -->
      <div class="indiv-toolbar">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-weight:700;font-size:13px;color:var(--gold-l)">🔍 Fast Number Finder:</span>
          <input type="text" id="indiv-num-search" class="indiv-search-input mono" placeholder="Enter 6-digit ticket, 4-digit number, or decimal..." maxlength="15"/>
        </div>
        <span id="indiv-match-counter" style="font-size:13px;font-weight:600"></span>
      </div>

      <!-- 1st Prize Showcase -->
      <div class="indiv-1st-card" data-prize-amt="${p1 ? p1.amount : ''}">
        <div class="indiv-1st-badge">
          <span>🏆 OFFICIAL 1ST PRIZE WINNER</span>
          <span class="indiv-1st-amt">${p1Amt}</span>
        </div>
        <div class="indiv-1st-ticket-wrap indiv-num-item" data-num="${p1Ticket ? p1Ticket.number : ''}" data-digits="${p1Ticket ? String(p1Ticket.number).length : 6}" data-series="${p1Ticket ? p1Ticket.series : ''}" data-prize="1st Prize">
          ${p1Ticket ? `
            <span class="indiv-1st-series">${p1Ticket.series && p1Ticket.series !== 'ALL' ? p1Ticket.series : ''}</span>
            <span class="indiv-1st-no mono">${p1Ticket.number}</span>
            ${p1Ticket.location ? `<span class="indiv-1st-loc">📍 Agent / Location: ${p1Ticket.location}</span>` : ''}
          ` : '<span style="color:var(--text2);font-weight:700">1st Prize details pending</span>'}
        </div>
      </div>

      <!-- Consolation Prize -->
      ${consolHTML}

      <!-- 2nd Prize -->
      ${p2HTML}

      <!-- 3rd Prize -->
      ${p3HTML}

      <!-- 4th - 8th Prizes -->
      ${otherHTML}

      <!-- Statutory Rules & Signatures -->
      <div class="indiv-statutory">
        <p><b>Statutory Notice:</b> The prize winners are advised to verify the winning numbers with the results published in the Kerala Government Gazette and surrender the winning tickets within 30 days from the date of draw.</p>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;padding-top:16px;border-top:1px dashed var(--border);flex-wrap:wrap;gap:16px;text-align:left">
          <div>
            <b>Directorate of State Lotteries</b><br/>
            Vikas Bhavan, Thiruvananthapuram, Kerala - 695033<br/>
            Phone: 0471-2305230 | www.keralalotteries.com
          </div>
          <div style="text-align:right">
            <b>Joint Director / Director</b><br/>
            Directorate of State Lotteries<br/>
            <small style="color:var(--text3)">Government of Kerala</small>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach search listener - strictly 6-digit, 4-digit, and decimal values
  const searchInp = document.getElementById('indiv-num-search');
  const counter = document.getElementById('indiv-match-counter');
  if (searchInp) {
    searchInp.addEventListener('input', (e) => {
      const rawQ = e.target.value.trim();
      const allItems = content.querySelectorAll('.indiv-num-item, .indiv-num-box');
      const allCards = content.querySelectorAll('.indiv-sec-card, .indiv-1st-card');

      // Clear previous matches
      allItems.forEach(el => el.classList.remove('matched'));
      allCards.forEach(el => el.classList.remove('card-matched'));

      if (!rawQ) {
        if (counter) counter.textContent = '';
        return;
      }

      // Check decimal prize amount search (e.g. 5000.00, 1000.50, 500.50, 7500000)
      let decVal = null;
      if (rawQ.includes('.')) {
        const parsed = parseFloat(rawQ);
        if (!isNaN(parsed)) decVal = parsed;
      }

      // Check if user entered prize amount with decimals or exact amount search
      if (decVal !== null) {
        let matchedCards = 0;
        let firstCard = null;
        allCards.forEach(card => {
          const cardAmt = parseFloat(card.getAttribute('data-prize-amt') || '0');
          if (cardAmt && Math.abs(cardAmt - decVal) < 0.001) {
            card.classList.add('card-matched');
            matchedCards++;
            if (!firstCard) firstCard = card;
          }
        });
        if (matchedCards > 0) {
          if (counter) {
            counter.textContent = `💰 Matched Prize Tier: ${formatCurrency(decVal)} (${matchedCards} section${matchedCards > 1 ? 's' : ''})`;
            counter.style.color = 'var(--gold-l)';
          }
          if (firstCard) firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }

      // Ticket number search: Handle decimal representations like 886602.00 or 0101.00
      let cleanQ = rawQ;
      if (cleanQ.includes('.')) {
        cleanQ = cleanQ.split('.')[0];
      }
      cleanQ = cleanQ.replace(/\D/g, '');

      // Rule: Winning number find six digit and four digit only!
      if (cleanQ.length < 4) {
        if (counter) {
          counter.textContent = `⌨️ Enter 4 or 6 digits to find winning numbers (${cleanQ.length}/4 digits)`;
          counter.style.color = 'var(--text3)';
        }
        return;
      }

      if (cleanQ.length === 5 || cleanQ.length > 6) {
        if (counter) {
          counter.textContent = `⚠️ Kerala winning numbers are 6-digit or 4-digit only (${cleanQ.length} entered)`;
          counter.style.color = '#FC8181';
        }
        return;
      }

      // Now cleanQ is exactly 4 digits or exactly 6 digits!
      let matches = 0;
      let firstEl = null;

      allItems.forEach(item => {
        const itemNum = (item.getAttribute('data-num') || item.textContent).trim();
        const digits = parseInt(item.getAttribute('data-digits') || itemNum.length, 10);
        let isMatch = false;

        if (cleanQ.length === 4) {
          // 4-digit query: matches exact 4-digit winning numbers or 6-digit tickets ending in these 4 digits
          if (digits === 4 && itemNum === cleanQ) {
            isMatch = true;
          } else if (digits === 6 && itemNum.endsWith(cleanQ)) {
            isMatch = true;
          }
        } else if (cleanQ.length === 6) {
          // 6-digit query: matches exact 6-digit winning numbers or 4-digit prizes matching last 4 digits
          if (digits === 6 && itemNum === cleanQ) {
            isMatch = true;
          } else if (digits === 4 && cleanQ.endsWith(itemNum)) {
            isMatch = true;
          }
        }

        if (isMatch) {
          item.classList.add('matched');
          matches++;
          if (!firstEl) firstEl = item;
        }
      });

      if (counter) {
        if (matches > 0) {
          const typeLabel = cleanQ.length === 6 ? '6-digit ticket' : '4-digit winning number';
          counter.textContent = `🎉 Found ${matches} match${matches > 1 ? 'es' : ''} for ${typeLabel} "${cleanQ}"`;
          counter.style.color = 'var(--green-l)';
        } else {
          counter.textContent = `❌ No winning matches found for "${cleanQ}" in this draw`;
          counter.style.color = '#FC8181';
        }
      }

      if (firstEl) firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  showPage('page-individual-result');
  window.location.hash = 'draw/' + id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Navigation Actions for Individual Result Page
document.getElementById('btn-back-to-public')?.addEventListener('click', () => {
  if (window.history.length > 1 && window.location.hash.startsWith('#draw/')) {
    window.history.back();
    setTimeout(() => {
      if (window.location.hash.startsWith('#draw/')) {
        try {
          history.replaceState(null, '', window.location.pathname + '#public');
        } catch (_) {
          window.location.hash = 'public';
        }
        showPage('page-public');
      }
    }, 150);
  } else {
    try {
      history.replaceState(null, '', window.location.pathname + '#public');
    } catch (_) {
      window.location.hash = 'public';
    }
    showPage('page-public');
  }
});

document.getElementById('btn-indiv-home-brand')?.addEventListener('click', () => {
  document.getElementById('btn-back-to-public')?.click();
});

document.getElementById('btn-print-indiv')?.addEventListener('click', () => window.print());

document.getElementById('btn-pdf-indiv')?.addEventListener('click', () => {
  toast('Opening print dialog — Select "Save as PDF"', 'info');
  setTimeout(() => window.print(), 500);
});

document.getElementById('btn-share-indiv')?.addEventListener('click', () => {
  const url = window.location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      toast('🔗 Shareable result link copied to clipboard!', 'success');
    });
  } else {
    prompt('Copy this link to share:', url);
  }
});

// URL Routing Support
function handleRouting() {
  const hash = window.location.hash;
  if (hash.startsWith('#draw/')) {
    const drawId = hash.replace('#draw/', '').trim();
    if (drawId) {
      showIndividualDraw(drawId);
      return;
    }
  }
  showPage('page-public');
  try {
    if (window.location.hash.startsWith('#draw/')) {
      history.replaceState(null, '', window.location.pathname + '#public');
    }
  } catch (_) {}
}

window.addEventListener('hashchange', handleRouting);

// ─── INITIALIZATION ───────────────────────────────────────
initTheme();
populatePublicFilters();
initPublicLayoutToggle();
renderPublicResults();
renderRibbon();
handleRouting();
if (document.getElementById('checker-date')) {
  document.getElementById('checker-date').value = todayStr();
}

// Check and trigger CloudSync if defined or standalone
if (typeof CloudSync !== 'undefined' && CloudSync.pullFromCloud) {
  CloudSync.pullFromCloud({ silent: true });
} else {
  // Standalone public portal cloud sync
  (function initStandalonePublicCloudSync() {
    const CLOUD_SYNC_KEY = 'kl_cloud_sync_config';
    let cfg = null;
    try {
      const raw = localStorage.getItem(CLOUD_SYNC_KEY);
      if (raw) cfg = JSON.parse(raw);
    } catch (_) {}
    if (!cfg) {
      cfg = {
        mode: 'firebase',
        firebaseUrl: 'https://avtr-899ee-default-rtdb.firebaseio.com'
      };
    }
    if (cfg && cfg.mode === 'firebase' && cfg.firebaseUrl) {
      let url = cfg.firebaseUrl.trim().replace(/\/+$/, '') + '/kerala_lottery_data.json';
      fetch(url, { headers: { 'Cache-Control': 'no-cache' } })
        .then(r => r.json())
        .then(payload => {
          if (payload && payload.db) {
            const cur = localStorage.getItem(DB_KEY);
            const curDB = loadDB();
            const nextDB = payload.db;
            if (curDB && curDB.users && !nextDB.users) {
              nextDB.users = curDB.users;
            }
            const next = JSON.stringify(nextDB);
            if (cur !== next) {
              localStorage.setItem(DB_KEY, next);
              populatePublicFilters();
              renderPublicResults();
              renderRibbon();
            }
          }
        })
        .catch(() => {});
    }
  })();
}

