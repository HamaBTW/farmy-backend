# Farmy Backend Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-v5.0-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![TypeORM](https://img.shields.io/badge/TypeORM-v0.3-FCAD11?style=flat-square&logo=typeorm&logoColor=white)](https://typeorm.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)

> A robust, scalable, and production-grade agri-tech ecosystem designed to bridge the gap between Farmers, Investors, Workers, and Customers through blockchain-verified data and AI-driven insights.

---

## 📖 Overview

The **Farmy Backend Platform** serves as the central nervous system for the Farmy application ecosystem. It is a high-performance RESTful API built on Node.js and TypeScript, designed to manage a complex marketplace of agricultural assets, land investments, workforce coordination, and real-time financial transactions.

### Core Mission
Our mission is to digitize the agricultural value chain, providing transparency through Hedera-powered blockchain verification, efficiency through AI-assisted decision making, and security through Stripe-integrated financial management.

---

## 🏗️ System Architecture

The platform follows a modular **Service-Oriented Architecture (SOA)**, ensuring high maintainability and scalability.

- **API Layer**: Express.js with TypeScript, providing structured RESTful endpoints.
- **Service Layer**: Decoupled business logic handling complex orchestrations (AI, Payments, Blockchain).
- **Data Layer**: TypeORM as the primary ORM, interfacing with a MySQL database for relational data integrity.
- **Real-time Layer**: Socket.io for live notifications and data synchronization.
- **Background Layer**: Node-cron for scheduled tasks, subscription renewals, and automated reporting.

---

## 🛠️ Tech Stack

### Backend Core
- **Runtime**: Node.js (LTS)
- **Language**: TypeScript
- **Framework**: Express.js
- **ORM**: TypeORM
- **Real-time**: Socket.io

### Databases & Cache
- **Primary Database**: MySQL 8.0
- **Storage**: Local filesystem & Cloud-ready paths

### External Services
- **Payments**: Stripe (Checkout, Connect, Webhooks)
- **AI/LLM**: Google Gemini (via `@google/genai`) & Groq Cloud
- **Blockchain**: Hedera Hashgraph (HCS for verification)
- **Auth**: Apple Sign-In, Google OAuth, 2FA (TOTP)
- **Notifications**: Firebase Admin (FCM)
- **Mailing**: Nodemailer (SMTP)

---

## 🚀 Core Features

### 👨‍🌾 Farmer Module
- **Land Management**: Full lifecycle management of agricultural plots, including grid-based layouts and soil/crop tracking.
- **Workforce Management**: Hire, manage, and evaluate workers. Handle contracts and digital invitations.
- **Job System**: Post job requests with specific skill requirements and manage applications.
- **Smart Insights**: AI-driven crop calendar generation and operational strategy sessions.

### 👷 Worker Module
- **Job Discovery**: Advanced matching system for agricultural jobs based on location and skills.
- **Task Execution**: Real-time task management system with digital proof of work.
- **Financial Wallet**: Managed earnings overview, transaction history, and Stripe-powered withdrawals.

### 💰 Investor Module
- **Land Portfolio**: Explore and invest in high-yield agricultural lands.
- **ROI Analytics**: Live ROI dashboard aggregating data from multiple production models.
- **Verification**: Access blockchain-verified records (Hedera) for all investment activities.

### 🛒 Marketplace
- **Product Lifecycle**: Manage products from land-linked production to consumer delivery.
- **Delivery System**: End-to-end tracking for customer orders and vendor logistical coordination.
- **Asset Market**: Buy/Sell agricultural assets (trees, machines, structures).

### 🤖 AI System
- **Farmer Agent**: Real-time operational assistance for land management.
- **Investment Agent**: Strategic recommendations and risk analysis for investors.
- **Data Engine**: Automated analysis of inventory and production trends.

---

## 📊 Database Overview

The system utilizes a complex relational schema with **48+ entities**. Key entities include:

| Entity | Description |
| :--- | :--- |
| `users` | Global identity management with role-based attributes. |
| `lands` | Core agricultural plots with grid and spatial data. |
| `land_rentals` | Legal and financial mapping of land leases. |
| `tasks` | Individual work units linked to land workers. |
| `job_requests` | Formal labor demand postings by farmers. |
| `job_applications` | Worker responses and contract negotiations. |
| `products` | Commodities produced and sold in the marketplace. |
| `transactions` | Global financial ledger for all platform activities. |
| `worker_balances` | Real-time tracking of worker earnings and payouts. |

---

## 🔐 Authentication & Security

- **JWT Strategy**: Stateless authentication using secure JSON Web Tokens.
- **RBAC (Role-Based Access Control)**: Granular permissions for Admin, Farmer, Investor, Worker, and Customer.
- **Two-Factor Authentication (2FA)**: TOTP-based security (Google Authenticator / Authy).
- **Security Headers**: Optimized security via `helmet` and `express-rate-limit`.
- **KYC Integration**: Identity verification flow for professional roles.

---

## 🛣️ API Structure

The API follows a versioned REST structure: `/api/v1/...`

### Primary Endpoints
- `POST /v1/auth/login` - Identity authentication.
- `GET /v1/lands` - Agricultural land listing.
- `POST /v1/job-requests` - Labor demand posting.
- `GET /v1/investor/roi` - Investment performance data.
- `POST /v1/wallet/withdraw` - Fund withdrawal via Stripe.

*Detailed documentation is available via Swagger at `/api-docs`.*

---

## 📦 Deployment Guide

### Prerequisites
- Node.js v20+
- MySQL 8.0
- NPM or PNPM

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/farmy-backend.git
   cd farmy-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Fill in your database and API credentials
   ```
4. Setup Database:
   ```bash
   # Create a database named "farmy"
   # Running dev will automatically synchronize schemas if DB_SYNCHRONIZE=true
   ```

### Running Locally
```bash
npm run dev   # Starts server with hot-reload (tsx)
```

### Production Build
```bash
npm run build
npm start
```

---

## 🤝 Contribution Guidelines

1. **Code Style**: Follow the ESLint and Prettier configurations.
2. **Branching**: Use `feature/`, `fix/`, or `refactor/` prefixes.
3. **Commit Messages**: Follow Conventional Commits (e.g., `feat: add land grid api`).
4. **PRs**: All PRs must pass linting and build checks before review.

---

## 👥 Development Team

| Avatar | Name | Role | Links |
| :---: | :--- | :--- | :--- |
| <img src="https://github.com/fekikarim.png" width="40" height="40" style="border-radius:50%"> | **Karim Feki** | Lead Full-Stack Developer | [GitHub](https://github.com/fekikarim) • [LinkedIn](https://www.linkedin.com/in/karimfeki) • [Portfolio](https://karimfeki.is-a.dev) |
| <img src="https://github.com/nesrine-derouiche.png" width="40" height="40" style="border-radius:50%"> | **Nesrine Derouiche** | Frontend Developer | [GitHub](https://github.com/nesrine-derouiche) • [LinkedIn](https://linkedin.com/in/nesrine-derouiche) • [Portfolio](https://nesrine-derouiche.is-a.dev) |
| <img src="https://github.com/hamabtw.png" width="40" height="40" style="border-radius:50%"> | **Mohamed Abidi** | Backend Developer | [GitHub](https://github.com/hamabtw) • [LinkedIn](https://www.linkedin.com/in/med-abidi) • [Portfolio](https://hamabtw.github.io/portfolio) |
| <img src="https://github.com/oussemissaoui.png" width="40" height="40" style="border-radius:50%"> | **Oussema Issaoui** | Mobile Developer | [GitHub](https://github.com/oussemissaoui) |
| <img src="https://github.com/fatmahidouss.png" width="40" height="40" style="border-radius:50%"> | **Fatma Hidoussi** | Marketing & QA | [GitHub](https://github.com/fatmahidouss) • [LinkedIn](https://www.linkedin.com/in/fatma-hidoussi-497052236) |

---

© 2024 Farmy Platform. All rights reserved.
