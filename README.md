# MedicalRag-Evra-POC

A modular, full-stack project for medical RAG (Retrieval-Augmented Generation) and agentic workflows, featuring a production-ready backend, a modern frontend, and a POC area for rapid experimentation.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Backend (api/)](#backend-api)
- [Frontend (app/)](#frontend-app)
- [POC & Experiments (poc/)](#poc--experiments-poc)
- [Development & Testing](#development--testing)
- [Docker Support](#docker-support)
- [Contributing](#contributing)
- [License](#license)

---

## Project Structure

```plaintext
MedicalRag-Evra-POC/
│
├── api/         # Production backend (FastAPI, DB, Auth, etc.)
├── app/         # Frontend (React/Expo/TypeScript)
├── poc/         # POC, experiments, agentic workflows, analysis
└── ...          # Root configs, lockfiles, etc.
```

---

## Setup & Installation

### Prerequisites

- Python 3.9+ (for backend and POC)
- Node.js 18+ and npm (for frontend)
- Docker (optional, for containerized deployment)

### Quickstart

```bash
# Clone the repo
git clone <repo-url>
cd MedicalRag-Evra-POC

# Backend setup
cd api
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Frontend setup
cd ../app
npm install

# POC setup (optional)
cd ../poc
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Backend (api/)

Production-ready FastAPI backend with:

- User authentication (JWT, OTP, etc.)
- User management
- Email utilities
- Configurable via `config.py`
- Docker support

**Run locally:**

```bash
cd api
uvicorn app.main:app --reload
```

**Testing:**

```bash
pytest
```

**Key files/folders:**

- `app/` - Main FastAPI app, routers, schemas, services
- `scripts/` - Dev/prod server scripts
- `tests/` - Pytest-based tests
- `Dockerfile` - Containerization

---

## Frontend (app/)

Modern React/Expo/TypeScript frontend for user interaction.

- Dashboard, chat, onboarding, profile, etc.
- Mobile-first, supports Expo Go

**Run locally:**

```bash
cd app
npm start
```

**Key files/folders:**

- `app/` - All main screens and components
- `assets/` - Fonts, images
- `package.json` - Scripts and dependencies

---

## POC & Experiments (poc/)

A sandbox for rapid prototyping, agentic workflows, and data analysis.

- Agentic context and LangGraph experiments
- Vector store and text processing
- Graph DB utilities
- Analysis scripts and sample data

**Run POC scripts:**

```bash
cd poc
python main.py
```

**Key files/folders:**

- `agentic_context.py`, `agentic_context_langgraph.py` - Agentic workflow logic
- `vector_store.py`, `text_processor.py` - Data processing
- `analysis-comparison/` - Data analysis scripts and reports

---

## Development & Testing

- Use virtual environments for Python parts.
- Use `pytest` for backend and POC testing.
- Use `npm test` for frontend testing (if configured).
- Linting and formatting are recommended (see `eslint.config.js`, etc.).

---

## Docker Support

- Backend can be built and run via Docker:
  ```bash
  cd api
  docker build -t medicalrag-backend .
  docker run -p 8000:8000 medicalrag-backend
  ```
- Add Docker Compose for full-stack orchestration (optional).

---

## Contributing

Pull requests and issues are welcome! Please see CONTRIBUTING.md (if available) for guidelines.

---

## License

[MIT](LICENSE) (or your license here)
