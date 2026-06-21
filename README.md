<div align="center">

# 🏥 OPD Smart Claims System

### AI-Powered Medical Insurance Claims Validation Platform

[![Django](https://img.shields.io/badge/Django-REST_Framework-092E20?style=for-the-badge&logo=django&logoColor=white)](/)
[![React](https://img.shields.io/badge/React-TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=black)](/)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](/)
[![OpenCV](https://img.shields.io/badge/OpenCV-Image_Processing-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)](/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](/)
[![Status](https://img.shields.io/badge/Status-Prototype-orange?style=for-the-badge)](/)

A full-stack, multi-portal web application for **end-to-end insurance claim submission**, AI-powered document analysis, OCR verification, fraud detection, and intelligent auto-approval — built for Health Insurance Provider.

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)

- [Key Features](#-key-features)
- [AI Validation Pipeline](#-ai-validation-pipeline)
- [Tech Stack](#-tech-stack)
- [Installation & Setup](#-installation--setup)
- [Demo Credentials](#-demo-credentials)
- [Project Structure](#-project-structure)
- [Author](#-author)

---

## 🔍 Overview

OPD Smart Claims is an intelligent claims management system that automates the end-to-end processing of **OPD, Dental, and Spectacle** insurance claims. The system uses **Google Gemini Vision AI** and **OCR technology** to extract data from medical documents, validate against policy limits, detect fraud patterns, and make real-time approval decisions — reducing manual processing time significantly.

---


## 🚀 Key Features

### 👥 Multi-Portal Architecture

| Portal | Users | Purpose |
|:---|:---|:---|
| 🏢 **Branch Portal** | Branch Staff | Assist walk-in customers — policy verification & claim submission via 5-step wizard |
| 💻 **Digital Portal** | Customers | Self-service claim submission, document upload & claim history tracking |
| 🛡️ **Admin Panel** | Back-office Staff | Review claims, AI analysis, fraud monitoring, approve/reject/request-more-info |

### 🔐 Security
- **JWT Authentication** — role-based secure login for all three portals
- **Role-based access control** — Branch, Customer, and Admin roles with separate views
- **Policy limit enforcement** — real-time OPD limit checking before submission

---

## 🤖 AI Validation Pipeline

Each submitted claim goes through a **5-tab automated analysis** in the Admin review panel:

| Tab | What it checks |
|:---|:---|
| **Overview** | Overall validation score, OCR confidence, issues found, fraud level |
| **Documents** | OCR accuracy per document, readability, content extraction |
| **Policy** | Policy status, coverage type, OPD limit, member verification |
| **Fraud** | Anomaly score, fraud risk %, amount pattern, policy limit check |
| **Matching** | Bill vs claim amount cross-validation, policy limit utilization |
| **RAG** | AI-powered coverage reasoning — retrieval-augmented policy clause matching |

### ⚡ Decision Engine

| Score | Decision | Action |
|:---:|:---:|:---|
| **> 90%** | ✅ Auto-Approved | Claim processed instantly |
| **50 – 89%** | ⚠️ Manual Review | Sent to admin for human verification |
| **< 50%** | ❌ Auto-Rejected | Claim rejected with reason |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|:---|:---|
| React (Vite) + TypeScript | Frontend framework |
| Tailwind CSS + Shadcn/UI | Styling & component library |
| Framer Motion | Animations & transitions |
| Axios | HTTP client with interceptors |

### Backend
| Technology | Purpose |
|:---|:---|
| Django + Django REST Framework | REST API |
| SimpleJWT | Token-based authentication |
| Google Gemini Vision AI | OCR & document analysis |
| OpenCV + Pillow | Image preprocessing |
| FuzzyWuzzy | Medicine name fuzzy matching |
| PostgreSQL | Database |

---

## ⚙️ Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js & npm
- Git
- Google Gemini API Key

### 1. Clone the Repository
```bash
git clone https://github.com/sanujiweerasinghe/opd-smart-claims-system.git
cd opd-smart-claims-system
```

### 2. Backend Setup
```bash
cd backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate         # Windows
# source venv/bin/activate    # Mac/Linux

# Install dependencies
pip install -r requirements.txt
```

**Configure environment variables** — copy `.env.example` to `.env` and fill in your values:
```bash
GOOGLE_API_KEY=your_gemini_api_key_here

# PostgreSQL Database
DB_NAME=smart_claims_db
DB_USER=smart_claims_user
DB_PASSWORD=your_db_password_here
DB_HOST=localhost
DB_PORT=5432
```

**Create the PostgreSQL database and user** (run in `psql`):
```sql
CREATE DATABASE smart_claims_db;
CREATE USER smart_claims_user WITH PASSWORD 'your_db_password_here';
GRANT ALL PRIVILEGES ON DATABASE smart_claims_db TO smart_claims_user;
ALTER DATABASE smart_claims_db OWNER TO smart_claims_user;
```

**Initialize the database:**
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
> Backend runs at `http://127.0.0.1:8000/`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
> Frontend runs at `http://localhost:8082/`

---

## 🧪 Demo Credentials

| Role | Username | Password | Access |
|:---|:---|:---|:---|
| **Admin** | `admin` | `admin123` | Django admin + claim review panel |
| **Branch Staff** | `branch` | `password123` | Branch portal — assisted submission |
| **Customer** | `customer` | `password123` | Digital portal — self-service |

> **Before testing the AI pipeline:** Log in as Admin and add at least one **Policy** and some **Medicine Master** entries (e.g., Brand: `Panadol`, Category: `Painkiller`, Payable: `True`).

---

## 📂 Project Structure

```
opd-smart-claims-system/
├── backend/
│   ├── core/                   # Django settings, CORS, JWT config
│   ├── users/
│   │   ├── utils/
│   │   │   ├── ocr_engine.py   # Google Gemini OCR logic
│   │   │   └── validation.py   # AI risk scoring engine
│   │   ├── models.py           # User, Claim, Policy, Medicine schemas
│   │   ├── views.py            # API controllers
│   │   ├── serializers.py      # JSON serializers
│   │   └── urls.py             # API routing
│   └── manage.py
│
├── frontend/
│   ├── src/
│   │   ├── components/         # UI components (Wizard, Navbar, Cards)
│   │   ├── pages/              # BranchPortal, DigitalPortal, Admin views
│   │   ├── services/           # Axios config & interceptors
│   │   └── hooks/              # useAuth, custom hooks
│   └── package.json
│
└── images/                     # Project screenshots
```

---

## 👥 Team

> Developed as a group project — BSc (Hons) in Data Science, University of Peradeniya, Sri Lanka (2025)

**Project Lead:** Sanuji Weerasinghe

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/sanuji-weerasinghe-b91b9a24b)
[![Email](https://img.shields.io/badge/Email-Contact-D14836?style=flat-square&logo=gmail&logoColor=white)](mailto:sanujiweerasinghe@gmail.com)

---

<div align="center">
<sub>Built for Health Insurance Provider · 2025</sub>
</div>
