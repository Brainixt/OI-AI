/**
 * OI-AI: Client Runtime Engine (Zero Loading Delay)
 * 2 Signals on 1-Min Gap: OI Score * Market Score >= 90
 * Dynamic ATR Swing Model | Exactly 1 Active Share
 */

const SCAN_INTERVAL_SEC = 60;
const STORAGE_ACTIVE_PICK = "oiai_active_pick";
const STORAGE_HISTORY = "oiai_history";

let appState = {
  activePick: null,
  history: [],
  nifty: { price: "22,980.00", change: "+90.00", change_percent: "+0.39%" },
  countdown: SCAN_INTERVAL_SEC,
  isScanning: false,
  timerInterval: null
};

const fmtRupee = (val) => {
  if (val === null || val === undefined || isNaN(val)) return "₹ --";
  return "₹ " + Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtPct = (val) => {
  if (val === null || val === undefined || isNaN(val)) return "--";
  const num = Number(val);
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
};

document.addEventListener("DOMContentLoaded", () => {
  startClock();
  loadPersistedData();
  startCountdownLoop();
  runOiScanCycle();
});

function startClock() {
  const clockEl = document.getElementById("clockDisplay");
  const updateClock = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
    const hrs = String(istTime.getHours()).padStart(2, "0");
    const mins = String(istTime.getMinutes()).padStart(2, "0");
    const secs = String(istTime.getSeconds()).padStart(2, "0");
    if (clockEl) clockEl.innerText = `${hrs}:${mins}:${secs} IST`;
  };
  updateClock();
  setInterval(updateClock, 1000);
}

function loadPersistedData() {
  // 1. Instant Embedded Initial State
  if (window.OI_INITIAL_STATE && window.OI_INITIAL_STATE.active_pick) {
    appState.activePick = window.OI_INITIAL_STATE.active_pick;
    if (window.OI_INITIAL_STATE.nifty50) {
      appState.nifty = window.OI_INITIAL_STATE.nifty50;
      renderNiftyTicker(appState.nifty);
    }
  }

  // 2. LocalStorage override if fresh
  try {
    const savedActive = localStorage.getItem(STORAGE_ACTIVE_PICK);
    if (savedActive) {
      const parsed = JSON.parse(savedActive);
      if (parsed && parsed.symbol) appState.activePick = parsed;
    }
  } catch (e) {}

  try {
    const savedHist = localStorage.getItem(STORAGE_HISTORY);
    if (savedHist) appState.history = JSON.parse(savedHist);
  } catch (e) {}

  renderSpotlightCard();
  renderHistoryTable();
  updateSummaryMetrics();
}

function persistState() {
  try {
    if (appState.activePick) localStorage.setItem(STORAGE_ACTIVE_PICK, JSON.stringify(appState.activePick));
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(appState.history));
  } catch (e) {}
}

function startCountdownLoop() {
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  appState.countdown = SCAN_INTERVAL_SEC;
  const countdownEl = document.getElementById("cycleCountdown");

  appState.timerInterval = setInterval(() => {
    appState.countdown--;
    if (countdownEl) countdownEl.innerText = `${appState.countdown}s`;
    updateActiveDuration();
    if (appState.countdown <= 0) {
      appState.countdown = SCAN_INTERVAL_SEC;
      runOiScanCycle();
    }
  }, 1000);
}

function updateActiveDuration() {
  if (!appState.activePick || !appState.activePick.entry_time) return;
  const durationEl = document.getElementById("heroDuration");
  if (!durationEl) return;
  const entryDate = new Date(appState.activePick.entry_time);
  const diffMinutes = Math.floor((new Date() - entryDate) / 60000);
  durationEl.innerText = diffMinutes < 60 ? `${Math.max(1, diffMinutes)}m active` : `${Math.floor(diffMinutes/60)}h ${diffMinutes%60}m active`;
}

function triggerManualRefresh() {
  appState.countdown = SCAN_INTERVAL_SEC;
  const countdownEl = document.getElementById("cycleCountdown");
  if (countdownEl) countdownEl.innerText = `${appState.countdown}s`;
  runOiScanCycle();
}

async function runOiScanCycle() {
  if (appState.isScanning) return;
  appState.isScanning = true;

  try {
    const resp = await fetch("data/oi_state.json?_t=" + Date.now());
    if (resp.ok) {
      const data = await resp.json();
      if (data.active_pick) {
        appState.activePick = data.active_pick;
        if (data.nifty50) {
          appState.nifty = data.nifty50;
          renderNiftyTicker(data.nifty50);
        }
        renderSpotlightCard();
        persistState();
      }
    }
  } catch (e) {
  } finally {
    appState.isScanning = false;
  }
}

function renderNiftyTicker(nifty) {
  const priceEl = document.getElementById("niftyPrice");
  const chgEl = document.getElementById("niftyChange");
  if (!priceEl || !chgEl) return;
  const priceNum = parseFloat(nifty.price || 0);
  const chgNum = parseFloat(nifty.change || 0);
  const pctNum = parseFloat(nifty.change_percent || 0);

  priceEl.innerText = priceNum ? priceNum.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "--";
  chgEl.innerText = `${chgNum >= 0 ? "+" : ""}${chgNum.toFixed(2)} (${chgNum >= 0 ? "+" : ""}${pctNum.toFixed(2)}%)`;
  chgEl.className = "ticker-chg " + (chgNum >= 0 ? "up" : "down");
}

function renderSpotlightCard() {
  const active = appState.activePick;
  if (!active) return;

  const symEl = document.getElementById("heroSymbol");
  const compEl = document.getElementById("heroCompany");
  const entryTimeEl = document.getElementById("heroEntryTime");
  const scoreValEl = document.getElementById("heroCombinedScore");
  const oiScoreEl = document.getElementById("heroOiScore");
  const mktScoreEl = document.getElementById("heroMarketScore");
  const sigTwoMinEl = document.getElementById("heroSignalTwoMin");
  const epEl = document.getElementById("heroEntryPrice");
  const cpEl = document.getElementById("heroCurrentPrice");
  const pnlEl = document.getElementById("heroLivePnl");
  const tpEl = document.getElementById("heroTargetPrice");
  const slEl = document.getElementById("heroSlPrice");
  const tpSub = document.getElementById("heroTargetSub");
  const slSub = document.getElementById("heroSlSub");

  if (symEl) symEl.innerText = active.symbol;
  if (compEl) compEl.innerText = active.company;
  if (entryTimeEl) {
    const d = new Date(active.entry_time);
    entryTimeEl.innerText = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  if (scoreValEl) scoreValEl.innerText = active.combined_score || "--";
  if (oiScoreEl) oiScoreEl.innerText = active.oi_score || "--";
  if (mktScoreEl) mktScoreEl.innerText = active.market_score || "--";
  if (sigTwoMinEl) sigTwoMinEl.innerText = active.signal_two_min || "LONG -> LONG";

  const ep = active.entry_price || active.spot;
  const cp = active.current_price || ep;
  const tp = active.target_price;
  const sl = active.sl_price;
  const slPct = active.sl_pct || 1.8;
  const tgtPct = active.target_pct || 3.6;
  const rr = active.rr_ratio || 2.0;

  if (epEl) epEl.innerText = fmtRupee(ep);
  if (cpEl) cpEl.innerText = fmtRupee(cp);
  if (tpEl) tpEl.innerText = fmtRupee(tp);
  if (slEl) slEl.innerText = fmtRupee(sl);

  if (tpSub) tpSub.innerText = `+${tgtPct}% (1:${rr} R:R)`;
  if (slSub) slSub.innerText = `-${slPct}% (Dynamic ATR)`;

  const pnl = active.pnl_pct || (((cp - ep) / ep) * 100);
  if (pnlEl) {
    pnlEl.innerText = `P&L: ${fmtPct(pnl)}`;
    pnlEl.style.color = pnl >= 0 ? "var(--success)" : "var(--danger)";
  }

  // Rationale
  const factorsEl = document.getElementById("heroFactors");
  if (factorsEl) {
    factorsEl.innerHTML = `
      <span class="factor-chip">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" fill="#0EA5E9"/></svg>
        ${escapeHtml(active.oi_rationale || "Double 1-Min Signal: Persistent Long Accumulation")}
      </span>
      <span class="factor-chip">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" fill="#0EA5E9"/></svg>
        Combined Score: ${active.combined_score} (OI: ${active.oi_score} x Market: ${active.market_score} >= 90.0)
      </span>
      <span class="factor-chip">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" fill="#0EA5E9"/></svg>
        Dynamic ATR Swing Calibration: -${slPct}% SL vs +${tgtPct}% Target (1:${rr} R:R)
      </span>
    `;
  }

  // Progress Gauge
  renderProgressGauge(active);
}

function renderProgressGauge(active) {
  const gaugeFill = document.getElementById("gaugeFill");
  const gaugePin = document.getElementById("gaugePin");
  const pinTooltip = document.getElementById("pinTooltip");
  const distToSlEl = document.getElementById("distToSl");
  const distToTargetEl = document.getElementById("distToTarget");
  const gSlEl = document.getElementById("gaugeSlPrice");
  const gEpEl = document.getElementById("gaugeEntryPrice");
  const gTpEl = document.getElementById("gaugeTargetPrice");

  const ep = parseFloat(active.entry_price);
  const cp = parseFloat(active.current_price);
  const tp = parseFloat(active.target_price);
  const sl = parseFloat(active.sl_price);
  const pnl = parseFloat(active.pnl_pct || 0);

  if (gSlEl) gSlEl.innerText = fmtRupee(sl);
  if (gEpEl) gEpEl.innerText = fmtRupee(ep);
  if (gTpEl) gTpEl.innerText = fmtRupee(tp);

  let pctPos = 50;
  if (cp >= ep) {
    const range = tp - ep;
    pctPos = 50 + Math.min(48, range > 0 ? ((cp - ep) / range) * 50 : 0);
  } else {
    const range = ep - sl;
    pctPos = 50 - Math.min(48, range > 0 ? ((ep - cp) / range) * 50 : 0);
  }

  if (gaugePin) gaugePin.style.left = `${pctPos}%`;
  if (pinTooltip) pinTooltip.innerText = `${fmtRupee(cp)} (${fmtPct(pnl)})`;

  if (gaugeFill) {
    if (pctPos >= 50) {
      gaugeFill.className = "gauge-fill positive";
      gaugeFill.style.left = "50%";
      gaugeFill.style.width = `${pctPos - 50}%`;
    } else {
      gaugeFill.className = "gauge-fill negative";
      gaugeFill.style.left = `${pctPos}%`;
      gaugeFill.style.width = `${50 - pctPos}%`;
    }
  }

  if (distToTargetEl) distToTargetEl.innerText = `Target Gap: ₹${Math.abs(tp - cp).toFixed(2)}`;
  if (distToSlEl) distToSlEl.innerText = `SL Buffer: ₹${Math.abs(cp - sl).toFixed(2)}`;
}

function renderHistoryTable() {
  const tbody = document.getElementById("historyTbody");
  const counter = document.getElementById("historyCounter");
  if (!tbody) return;
  if (counter) counter.innerText = `(${appState.history.length} Completed)`;

  if (appState.history.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="9">
          <div class="empty-state">
            <span class="empty-icon">⏳</span>
            <span class="empty-title">Active OI swing pick is currently in progress.</span>
            <span class="empty-sub">Once the active share triggers its Dynamic ATR Stop Loss or Target, it will log here and immediately pick the next share with Score >= 90.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = appState.history.map(item => {
    const isTarget = item.is_win;
    const badgeClass = isTarget ? "outcome-badge target" : "outcome-badge sl";
    const pnlClass = item.pnl_pct >= 0 ? "pnl-cell positive" : "pnl-cell negative";
    const exitDate = new Date(item.exit_time);
    return `
      <tr>
        <td class="mono-cell">#${item.id}</td>
        <td>
          <div class="sym-cell">
            <span class="sym-code">${escapeHtml(item.symbol)}</span>
            <span class="sym-name">${escapeHtml(item.company || "")}</span>
          </div>
        </td>
        <td><span class="direction-badge">${escapeHtml(item.direction)} (OI SWING)</span></td>
        <td class="mono-cell">${fmtRupee(item.entry_price)}</td>
        <td class="mono-cell">${fmtRupee(item.exit_price)}</td>
        <td class="${pnlClass}">${fmtPct(item.pnl_pct)}</td>
        <td><span class="${badgeClass}">${isTarget ? "🏆 TARGET HIT" : "🛑 STOP LOSS"}</span></td>
        <td class="mono-cell">${escapeHtml(item.duration)}</td>
        <td class="mono-cell">${exitDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
      </tr>
    `;
  }).join("");
}

function updateSummaryMetrics() {
  const history = appState.history;
  const total = history.length;
  const wins = history.filter(h => h.is_win).length;
  const losses = total - wins;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";
  let netPnl = 0.0;
  history.forEach(h => { netPnl += (h.pnl_pct || 0); });

  const totalEl = document.getElementById("statTotalPicks");
  const winsEl = document.getElementById("statTargetHits");
  const lossesEl = document.getElementById("statSlHits");
  const wrEl = document.getElementById("statWinRate");
  const pnlEl = document.getElementById("statNetPnl");

  if (totalEl) totalEl.innerText = total;
  if (winsEl) winsEl.innerText = wins;
  if (lossesEl) lossesEl.innerText = losses;
  if (wrEl) wrEl.innerText = `${winRate}%`;
  if (pnlEl) pnlEl.innerText = fmtPct(netPnl);
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
