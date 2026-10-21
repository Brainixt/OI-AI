# OI-AI — Autonomous 2-Signal Open Interest Swing Picker

**Live Web Application:** [https://brainixt.github.io/OI-AI/](https://brainixt.github.io/OI-AI/)  
**GitHub Repository:** [Brainixt/OI-AI](https://github.com/Brainixt/OI-AI)  
**Location:** `D:\SM_Server\Rishabh-F-O\OIPrediction`

---

## ⚡ Core Algorithm Contract & Execution Rules

1. **2 Signals on 1-Minute Gap**: Evaluates point-in-time Open Interest ($\Delta OI$) and Price delta ($\Delta P$) over two consecutive 1-minute snapshots to compute institutional **OI Score (0 to 10.0)**.
2. **Market Score Integration**: Reads live NIFTY derivative regime score (**0 to 10.0**) from `Rishabh-F-O`.
3. **Score Multiplication & 90+ Threshold**:
   $$\text{Combined Score} = \text{OI Score} \times \text{Market Score}$$
   - **Only picks shares where $\text{Combined Score} \ge 90.0$** (e.g. $9.5 \times 9.6 = 91.2$).
   - Automatically selects the candidate with the highest combined score!
4. **Dynamic ATR Algorithm (Swing Calibrated)**:
   - Dynamic Stop Loss: $\text{clamp}(1.25 \times ATR_{\%}, 1.20\%, 2.20\%)$
   - Dynamic Profit Target: $\text{clamp}(SL_{\%} \times 2.0, 2.50\%, 4.50\%)$ with strict $1 : 2.0$ Risk-to-Reward ratio!
5. **Strict Single-Share Invariant**: Exactly **one (1)** active share monitored at any time. **No exit until SL or Target is hit.**
6. **Immediate Rollover**: Once the active share exits, the engine immediately selects the next share with $\text{Score} \ge 90.0$.
7. **Zero Loading Screen**: State pre-rendered into `index.html` by the backend.
8. **Display Only**: Zero broker trading, zero messages/emails.
9. **Zero Impact on Rishabh-F-O**: Completely isolated and read-only.
