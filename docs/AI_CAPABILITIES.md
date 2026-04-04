# 🤖 Farmy AI Ecosystem: The Neural Backbone of Digital Farming

Welcome to the **Farmy AI Ecosystem**. Our platform integrates state-of-the-art Large Language Models (LLMs) to provide real-time, context-aware guidance for every stakeholder in the agricultural value chain. 

From game-ified farming to high-stakes investment, our AI agents ensure every decision is backed by data.

---

## 🌾 1. The Production Guru (Farmer AI)
**"Transforming raw data into harvest gold."**

The **Production Guru** is the dedicated advisor for farmers. It lives within the `FarmerAgentScreen` and provides deep-dive analysis of farm production.

### **Core Capabilities:**
*   **Real-time P&L Analysis**: Automatically calculates your Profit & Loss based on your active assets (crops and livestock) vs. your initial capital.
*   **Harvest Timing Advice**: Analyzes market trends (e.g., "Wheat High Demand") to suggest the optimal time to sell or hold.
*   **Resource Optimization**: Identified labor shortages or cost spikes and suggests equipment upgrades to mitigate risks.
*   **Session History (Harvest Chronicles)**: Every consultation is saved. Farmers can revisit previous advice to track how their strategy has evolved.

---

## 📈 2. The Investment Strategist (Investor AI)
**"Turning acreage into an asset class."**

The **Investment Strategist** is designed for high-level portfolio management. It focuses on land acquisition, risk assessment, and long-term ROI.

### **Core Capabilities:**
*   **Portfolio Health Checks**: Analyzes an investor's total land holdings and liquidity.
*   **Dynamic Land Recommender**: Scans available market listings to suggest land that fits the investor's specific risk profile (Low, Medium, High).
*   **Risk vs. Reward Simulation**: Provides a "Strategy Session" where investors can simulate how a specific land purchase will affect their overall wealth.
*   **Contextual Memory**: Remembers your investment preferences across multiple chat sessions.

---

## 🎮 3. The Game Agent (In-Farm Assistant)
**"Your digital ranch hand."**

The **Game Agent** is an interactive, non-intrusive assistant that helps users while they are actively managing their farm in the game view.

### **Core Capabilities:**
*   **Quick Placement Advice**: Helps users decide where to place new vegetation or animals for maximum yield.
*   **Interactive Onboarding**: Guides new players through the mechanics of the digital farm.
*   **Asset Variants Guru**: Provides detailed stats on different machine and plant variants (resolving the "BBBB...003" codes into human-readable details).

---

## 🛠️ Technical Infrastructure

### **The Backend (Node.js + Groq SDK)**
*   **LLM Engine**: Powered by **Groq** using the `llama-3.1-8b-instant` model for near-instantaneous response times (<500ms).
*   **Context Injection**: Our services dynamically query the database (TypeORM) to inject real-time user data (assets, credits, land) into the AI prompt before it reaches the model.
*   **Session Management**: Uses specialized database entities (`FarmerStrategySession`, `InvestmentStrategySession`) to maintain long-term conversation states.

### **The Frontend (Flutter)**
*   **Markdown Rendering**: Uses `flutter_markdown` to provide rich, professional formatting for AI responses (bolding, lists, headers).
*   **Theme Adaptation**: Full **Dark Mode** support across all AI interfaces, ensuring low-strain usage during late-night farm planning.
*   **State-Aware UI**: Real-time summary cards and stat-counters integrated directly into the chat view.

---

## 🚀 Future Roadmap
*   **Predictive Weather Integration**: Injecting real-world meteorological data into the AI context.
*   **Autonomous Worker Suggestions**: AI that can "hire" workers for you based on forecasted task loads.
*   **Multi-Modal Guru**: Support for uploading photos of "pests" or "soil issues" for visual AI diagnosis (Future Phase).

---
*Farmy AI: Helping you grow smarter, one prompt at a time.* 🚜✨
