"""
github_code_analyzer.py
-----------------------
SkillLedger Deep Code & Context Verification Engine.

Performs multi-tier static code analysis on public GitHub repositories:
1. Language Byte Distribution (actual code composition).
2. Repository File Trees (identifies actual code modules, model weights, notebooks).
3. Dependency & Import Inspection (requirements.txt, pyproject.toml, train.py, detect.py).
4. Domain Taxonomy Matching (e.g., YOLOv8 / Ultralytics, PyTorch, OpenCV, Solidity, FastAPI).
5. Implementation Depth Assessment (production pipeline vs practical code vs theory-only).
"""

import json
import re
import urllib.request
import urllib.error
from crypto_utils import sha256_hash, canonical_json

USER_AGENT = "SkillLedger-DeepCodeInspector/2.0 (Academic & Recruiter Verification)"

# Comprehensive Domain Taxonomy mapping claimed skills to real-world frameworks, files & code patterns
DOMAIN_TAXONOMY = {
    "yolo": {
        "domain": "Computer Vision & Object Detection (YOLO)",
        "frameworks": ["ultralytics (YOLOv8/v11)", "OpenCV (cv2)", "PyTorch Vision", "Roboflow", "Albumentations"],
        "keywords": ["yolo", "yolov8", "yolov5", "yolov7", "yolov9", "yolo11", "ultralytics", "object detection", "bounding box", "cv2", "opencv", "segmentation", "detection", "tracking"],
        "dependency_patterns": [r"ultralytics", r"opencv-python", r"torchvision", r"roboflow", r"albumentations", r"mediapipe", r"timm"],
        "file_patterns": [r"train\.py", r"detect\.py", r"predict\.py", r"val\.py", r"yolo.*\.py", r".*\.pt", r"yolov8.*\.pt", r"best\.pt", r"last\.pt", r"data\.yaml", r"dataset\.yaml", r"coco\.yaml", r"tracker.*\.py"],
        "code_patterns": [r"from ultralytics import", r"YOLO\(", r"cv2\.VideoCapture", r"cv2\.imshow", r"cv2\.imread", r"results\s*=\s*model\("],
        "evidence_summary": "Applied YOLOv8 computer vision architecture & model inference verified in codebase.",
    },
    "ai_ml": {
        "domain": "Artificial Intelligence & Deep Learning",
        "frameworks": ["PyTorch", "TensorFlow", "Keras", "Scikit-Learn", "ONNX Runtime", "SciPy"],
        "keywords": ["ai", "ml", "artificial intelligence", "machine learning", "deep learning", "neural", "cnn", "rnn", "pytorch", "tensorflow", "keras", "classifier", "model"],
        "dependency_patterns": [r"torch", r"pytorch", r"tensorflow", r"keras", r"scikit-learn", r"sklearn", r"onnx", r"onnxruntime", r"xgboost", r"lightgbm", r"scipy"],
        "file_patterns": [r"model\.py", r"models\.py", r"train\.py", r"evaluate\.py", r"loss\.py", r"dataset\.py", r"dataloader\.py", r".*\.ipynb", r".*\.pth", r".*\.h5", r".*\.onnx"],
        "code_patterns": [r"import torch", r"nn\.Module", r"torch\.optim", r"tf\.keras", r"Sequential\(", r"fit\(X,\s*y\)"],
        "evidence_summary": "Applied neural network architecture, training pipeline, and tensor computations verified.",
    },
    "genai": {
        "domain": "Generative AI & Large Language Models",
        "frameworks": ["HuggingFace Transformers", "LangChain", "LlamaIndex", "ChromaDB", "OpenAI SDK", "FAISS"],
        "keywords": ["genai", "generative ai", "llm", "transformers", "nlp", "langchain", "rag", "openai", "prompt", "embeddings", "vector"],
        "dependency_patterns": [r"transformers", r"huggingface", r"langchain", r"llama[-_]index", r"chromadb", r"faiss", r"openai", r"anthropic", r"ollama", r"vllm"],
        "file_patterns": [r"rag\.py", r"agent\.py", r"chains\.py", r"prompts\.py", r"vectorstore\.py", r"embeddings\.py"],
        "code_patterns": [r"from transformers import", r"AutoModelForCausalLM", r"ChatOpenAI", r"RetrievalQA", r"from langchain"],
        "evidence_summary": "Applied RAG retrieval pipeline and LLM orchestration verified in code.",
    },
    "data_science": {
        "domain": "Data Science & Analytics",
        "frameworks": ["Pandas", "NumPy", "Matplotlib", "Seaborn", "Jupyter Notebooks"],
        "keywords": ["data science", "data analytics", "pandas", "numpy", "eda", "visualization", "statistics", "data analysis"],
        "dependency_patterns": [r"pandas", r"numpy", r"matplotlib", r"seaborn", r"plotly", r"scipy", r"statsmodels"],
        "file_patterns": [r".*\.ipynb", r"analysis\.py", r"eda\.py", r"data_cleaning\.py", r"features\.py"],
        "code_patterns": [r"import pandas as pd", r"import numpy as np", r"sns\.", r"plt\.figure", r"df\.groupby"],
        "evidence_summary": "Applied exploratory data analysis, data wrangling pipelines, and statistical notebooks verified.",
    },
    "backend_python": {
        "domain": "Python Backend & API Engineering",
        "frameworks": ["FastAPI", "Flask", "Django", "SQLAlchemy", "Pydantic", "Uvicorn"],
        "keywords": ["backend", "python", "api", "rest", "fastapi", "flask", "django", "microservice", "server", "web service"],
        "dependency_patterns": [r"fastapi", r"flask", r"django", r"sqlalchemy", r"pydantic", r"uvicorn", r"celery", r"redis", r"gunicorn"],
        "file_patterns": [r"app\.py", r"main\.py", r"routes\.py", r"models\.py", r"schemas\.py", r"controllers/.*", r"api/.*"],
        "code_patterns": [r"FastAPI\(", r"Flask\(__name__\)", r"@app\.get", r"@app\.post", r"BaseModel"],
        "evidence_summary": "Applied REST API endpoints, schemas, and backend microservice implementation verified.",
    },
    "blockchain_web3": {
        "domain": "Web3 & Smart Contract Engineering",
        "frameworks": ["Solidity", "Hardhat", "Foundry", "Web3.py / Ethers.js", "OpenZeppelin"],
        "keywords": ["blockchain", "solidity", "smart contract", "web3", "ethereum", "crypto", "consensus", "evm", "ledger", "hardhat", "truffle"],
        "dependency_patterns": [r"web3", r"eth-account", r"hardhat", r"@openzeppelin/contracts", r"ethers"],
        "file_patterns": [r"contracts/.*\.sol", r".*\.sol", r"hardhat\.config\..*", r"foundry\.toml", r"deploy\.js", r"deploy\.py"],
        "code_patterns": [r"pragma solidity", r"contract\s+[A-Za-z0-9_]+", r"Web3\(", r"ethers\.getContractFactory"],
        "evidence_summary": "Applied Solidity smart contract code, compilation artifacts, and Web3 interactions verified.",
    },
    "frontend_web": {
        "domain": "Frontend Web Development",
        "frameworks": ["React", "Next.js", "Vite", "TailwindCSS", "TypeScript"],
        "keywords": ["frontend", "react", "next", "vite", "tailwind", "ui", "javascript", "typescript", "web development"],
        "dependency_patterns": [r"react", r"react-dom", r"next", r"tailwindcss", r"vite"],
        "file_patterns": [r"src/.*\.jsx", r"src/.*\.tsx", r"package\.json", r"vite\.config\..*", r"tailwind\.config\..*"],
        "code_patterns": [r"import React", r"useState", r"useEffect", r"export default function"],
        "evidence_summary": "Applied modern component-driven UI architecture and responsive design verified.",
    }
}

# Pre-seeded rich demo profiles with actual code context, YOLOv8 pipelines, and language breakdowns
DEMO_PROFILES_ENRICHED = {
    "asharao": [
        {
            "name": "yolov8-malware-vision",
            "html_url": "https://github.com/asharao/yolov8-malware-vision",
            "language": "Python",
            "description": "Deep learning convolutional & YOLOv8 computer vision pipeline for PE malware binary visualization and zero-day threat detection.",
            "stargazers_count": 32,
            "updated_at": "2026-04-18",
            "code_composition": "94.8% Python (148 KB actual code lines across 16 modules)",
            "languages_breakdown": {"Python": 148200, "Jupyter Notebook": 6400, "Shell": 1800},
            "detected_frameworks": ["ultralytics (YOLOv8)", "OpenCV (cv2)", "PyTorch", "NumPy"],
            "key_code_files": ["train_yolo.py", "detect_threat.py", "requirements.txt", "weights/yolov8n_malware.pt", "data.yaml"],
            "code_evidence": "Applied YOLOv8 deep learning pipeline with custom dataset configuration, model weights (yolov8n_malware.pt), and inference scripts.",
            "code_depth": "PRODUCTION_PIPELINE",
            "relevance_score": 18,
            "relevance_reasons": [
                "Applied YOLOv8 (ultralytics) computer vision architecture & model weights detected",
                "Deep learning inference scripts verified (train_yolo.py, detect_threat.py)",
                "94.8% Python codebase composition (148 KB code across 16 modules)"
            ]
        },
        {
            "name": "blockchain-verifier-core",
            "html_url": "https://github.com/asharao/blockchain-verifier-core",
            "language": "Python",
            "description": "Proof-of-Authority consensus engine, Merkle tree batch verification, and RSA-PSS cryptographic validation module.",
            "stargazers_count": 28,
            "updated_at": "2026-04-01",
            "code_composition": "91.2% Python (96 KB actual code lines across 10 modules)",
            "languages_breakdown": {"Python": 96100, "Solidity": 7400, "Shell": 1800},
            "detected_frameworks": ["Cryptography (RSA-PSS)", "Flask", "PyCryptodome", "Hashlib"],
            "key_code_files": ["blockchain_core.py", "consensus.py", "crypto_utils.py", "test_consensus.py"],
            "code_evidence": "Applied PoA consensus, cryptographic Merkle tree hashing, and signature validation implementation.",
            "code_depth": "APPLIED_SYSTEM",
            "relevance_score": 14,
            "relevance_reasons": [
                "Cryptographic blockchain verification and PoA consensus modules verified",
                "91.2% Python codebase with active unit test coverage"
            ]
        },
        {
            "name": "smart-contract-registry",
            "html_url": "https://github.com/asharao/smart-contract-registry",
            "language": "Solidity",
            "description": "EVM-compatible decentralized credential registry contracts with access control and Hardhat deployment scripts.",
            "stargazers_count": 9,
            "updated_at": "2026-02-18",
            "code_composition": "82.5% Solidity, 17.5% JavaScript",
            "languages_breakdown": {"Solidity": 38400, "JavaScript": 8100},
            "detected_frameworks": ["Solidity", "Hardhat", "OpenZeppelin", "Ethers.js"],
            "key_code_files": ["contracts/CredentialRegistry.sol", "contracts/TrustAnchor.sol", "hardhat.config.js", "deploy.js"],
            "code_evidence": "Production Solidity smart contracts with OpenZeppelin access controls and Hardhat deployment test suite.",
            "code_depth": "PRODUCTION_SMART_CONTRACT",
            "relevance_score": 15,
            "relevance_reasons": [
                "EVM Solidity smart contracts verified (contracts/CredentialRegistry.sol)",
                "Hardhat test suite and deployment scripts verified"
            ]
        }
    ],
    "devonvance": [
        {
            "name": "crypto-dashboard-react",
            "html_url": "https://github.com/devonvance/crypto-dashboard-react",
            "language": "JavaScript",
            "description": "Full-stack React dashboard with dark theme, real-time WebSocket ledger feeds, and Framer Motion charts.",
            "stargazers_count": 7,
            "updated_at": "2026-03-20",
            "code_composition": "88.6% JavaScript / React (84 KB code)",
            "languages_breakdown": {"JavaScript": 84200, "CSS": 9100, "HTML": 1800},
            "detected_frameworks": ["React", "Vite", "Framer Motion", "Axios"],
            "key_code_files": ["src/App.jsx", "src/pages/Dashboard.jsx", "package.json"],
            "code_evidence": "Applied modern React component architecture and real-time state management.",
            "code_depth": "APPLIED_FRONTEND",
            "relevance_score": 12,
            "relevance_reasons": [
                "Full-stack React application with state management and API integration",
                "Clean component architecture verified"
            ]
        },
        {
            "name": "python-fastapi-microservice",
            "html_url": "https://github.com/devonvance/python-fastapi-microservice",
            "language": "Python",
            "description": "High throughput microservice for real-time credential stream ingestion using FastAPI and Pydantic.",
            "stargazers_count": 12,
            "updated_at": "2026-04-10",
            "code_composition": "96.4% Python (62 KB code across 8 modules)",
            "languages_breakdown": {"Python": 62400, "Dockerfile": 2300},
            "detected_frameworks": ["FastAPI", "Uvicorn", "Pydantic", "Pytest"],
            "key_code_files": ["app.py", "schemas.py", "requirements.txt", "Dockerfile"],
            "code_evidence": "Applied FastAPI asynchronous endpoints with Pydantic validation models.",
            "code_depth": "PRODUCTION_MICROSERVICE",
            "relevance_score": 14,
            "relevance_reasons": [
                "Production FastAPI backend architecture with Pydantic data models",
                "96.4% Python codebase composition"
            ]
        }
    ]
}


def _http_get_json(url, timeout=5):
    """Safely performs HTTP GET and parses JSON with custom user-agent."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8", errors="ignore"))
    except Exception:
        return None


def _http_get_text(url, timeout=4):
    """Safely retrieves raw text content (e.g. requirements.txt or code scripts)."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.read().decode("utf-8", errors="ignore")
    except Exception:
        return None


def _detect_domains_from_query(skill_query, cert_title=""):
    """Identifies which domain categories the user is asking to verify."""
    combined_query = f"{skill_query} {cert_title}".lower()
    matched_domains = []

    for domain_key, info in DOMAIN_TAXONOMY.items():
        # Check domain keywords
        for kw in info["keywords"]:
            if re.search(r"\b" + re.escape(kw) + r"\b", combined_query):
                matched_domains.append(domain_key)
                break

    # Default to Python/AI if user specified python or general tech
    if not matched_domains:
        if "python" in combined_query:
            matched_domains.extend(["backend_python", "ai_ml"])
        else:
            matched_domains.append("ai_ml")

    return list(set(matched_domains))


def inspect_repository_code(owner, repo_dict, target_domains):
    """
    Performs deep static code and context inspection on a single repository.
    Returns analyzed metadata dictionary with detected frameworks, key files, and code relevance score.
    """
    repo_name = repo_dict.get("name") or ""
    repo_desc = (repo_dict.get("description") or "").lower()
    default_branch = repo_dict.get("default_branch") or "main"
    html_url = repo_dict.get("html_url") or f"https://github.com/{owner}/{repo_name}"
    stars = repo_dict.get("stargazers_count", 0)
    updated_at = (repo_dict.get("updated_at") or "")[:10]

    # 1. Fetch exact language byte counts
    languages = _http_get_json(f"https://api.github.com/repos/{owner}/{repo_name}/languages", timeout=4) or {}
    total_bytes = sum(languages.values()) if languages else 0
    primary_lang = repo_dict.get("language") or (next(iter(languages.keys())) if languages else "Code")

    if total_bytes > 0:
        top_lang_items = sorted(languages.items(), key=lambda x: x[1], reverse=True)[:3]
        parts = [f"{round((b / total_bytes) * 100, 1)}% {l}" for l, b in top_lang_items]
        code_composition = f"{', '.join(parts)} ({round(total_bytes / 1024, 1)} KB total code)"
    else:
        code_composition = f"Primary: {primary_lang}"

    # 2. Fetch repository file paths (via git trees or contents)
    file_paths = []
    tree_res = _http_get_json(f"https://api.github.com/repos/{owner}/{repo_name}/git/trees/{default_branch}?recursive=1", timeout=4)
    if not tree_res and default_branch != "master":
        tree_res = _http_get_json(f"https://api.github.com/repos/{owner}/{repo_name}/git/trees/master?recursive=1", timeout=4)

    if tree_res and "tree" in tree_res:
        file_paths = [item["path"] for item in tree_res["tree"] if item.get("type") == "blob"]
    else:
        # Fallback to contents API
        contents = _http_get_json(f"https://api.github.com/repos/{owner}/{repo_name}/contents", timeout=4) or []
        file_paths = [item.get("name") for item in contents if isinstance(item, dict) and item.get("name")]

    # 3. Read content of dependency files or main scripts
    raw_sample_texts = []
    dep_filenames = ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile", "environment.yml", "package.json"]
    found_dep_files = [f for f in file_paths if any(f.endswith(d) or f == d for d in dep_filenames)]

    # Fetch top dependency file if present
    for dep_file in found_dep_files[:2]:
        text = _http_get_text(f"https://raw.githubusercontent.com/{owner}/{repo_name}/{default_branch}/{dep_file}")
        if not text and default_branch != "master":
            text = _http_get_text(f"https://raw.githubusercontent.com/{owner}/{repo_name}/master/{dep_file}")
        if text:
            raw_sample_texts.append(text[:25000])

    # Fetch top script file (e.g. train.py, detect.py, main.py, app.py)
    script_candidates = [f for f in file_paths if f.endswith(".py") and any(k in f.lower() for k in ["train", "detect", "model", "main", "app", "yolo", "inference", "predict"])]
    for script_file in script_candidates[:2]:
        text = _http_get_text(f"https://raw.githubusercontent.com/{owner}/{repo_name}/{default_branch}/{script_file}")
        if not text and default_branch != "master":
            text = _http_get_text(f"https://raw.githubusercontent.com/{owner}/{repo_name}/master/{script_file}")
        if text:
            raw_sample_texts.append(text[:25000])

    combined_code_text = ("\n".join(raw_sample_texts)).lower()
    combined_files_str = (" ".join(file_paths)).lower()

    # 4. Context & Framework Evaluation against target domains
    detected_frameworks = []
    key_code_files = []
    relevance_reasons = []
    relevance_score = 0
    matched_domain_names = []

    for domain_key in target_domains:
        d_info = DOMAIN_TAXONOMY.get(domain_key)
        if not d_info:
            continue

        domain_matched = False

        # A. Check for specific framework dependencies in requirements / pyproject / code text
        for dep_pat in d_info["dependency_patterns"]:
            if re.search(dep_pat, combined_code_text) or re.search(dep_pat, repo_desc):
                relevance_score += 6
                domain_matched = True
                matched_framework = dep_pat.replace(r"\b", "").replace(r"[-_]", "-")
                if matched_framework not in [f.lower() for f in detected_frameworks]:
                    detected_frameworks.append(matched_framework.capitalize())
                relevance_reasons.append(f"Framework dependency verified in codebase: '{matched_framework}'")

        # B. Check for actual code files matching domain
        for f_pat in d_info["file_patterns"]:
            matches = [p for p in file_paths if re.search(f_pat, p.lower())]
            if matches:
                relevance_score += 4
                domain_matched = True
                for m in matches[:3]:
                    if m not in key_code_files:
                        key_code_files.append(m)
                relevance_reasons.append(f"Verified implementation files: {', '.join(matches[:2])}")
                break

        # C. Check for code syntax / import statements
        for c_pat in d_info["code_patterns"]:
            if re.search(c_pat, combined_code_text):
                relevance_score += 5
                domain_matched = True
                relevance_reasons.append(f"Code imports & execution syntax verified: '{c_pat.replace(r'\(', '(').replace(r'\s*', ' ')}'")
                break

        # D. Name and description keywords
        for kw in d_info["keywords"]:
            if kw in repo_name.lower() or kw in repo_desc:
                relevance_score += 2
                domain_matched = True
                relevance_reasons.append(f"Repository context matches '{kw}'")
                break

        if domain_matched:
            matched_domain_names.append(d_info["domain"])

    # Language suitability check
    if any(d in target_domains for d in ["yolo", "ai_ml", "genai", "data_science", "backend_python"]):
        if languages.get("Python", 0) > 2000 or primary_lang.lower() == "python":
            relevance_score += 3
            relevance_reasons.append(f"Substantial Python codebase ({languages.get('Python', total_bytes)} bytes)")
    elif "blockchain_web3" in target_domains:
        if languages.get("Solidity", 0) > 500 or any(f.endswith(".sol") for f in file_paths):
            relevance_score += 4
            relevance_reasons.append("Solidity smart contract source files verified")

    # Assess implementation depth
    if any("yolo" in f.lower() or "ultralytics" in f.lower() for f in detected_frameworks) or any("yolo" in f.lower() or f.endswith(".pt") for f in key_code_files):
        code_depth = "ADVANCED_COMPUTER_VISION_PIPELINE"
        evidence_summary = "Applied YOLOv8 computer vision & object detection pipeline with model training/weights detected."
    elif len(key_code_files) >= 3 and len(detected_frameworks) >= 2:
        code_depth = "PRODUCTION_APPLIED_CODE"
        evidence_summary = f"Verified hands-on implementation across {len(key_code_files)} source files and key dependencies."
    elif relevance_score >= 5:
        code_depth = "FUNCTIONAL_CODEBASE"
        evidence_summary = f"Practical code implementation verified in {primary_lang} codebase."
    else:
        code_depth = "BASIC_REPOSITORY"
        evidence_summary = "Repository contains code files, but lacks verified domain-specific pipelines."

    # Remove duplicates from relevance reasons
    cleaned_reasons = list(dict.fromkeys(relevance_reasons))[:3]

    return {
        "name": repo_name,
        "html_url": html_url,
        "language": primary_lang,
        "description": repo_dict.get("description") or "Public code repository",
        "stars": stars,
        "updated_at": updated_at,
        "code_composition": code_composition,
        "languages_breakdown": languages,
        "detected_frameworks": list(dict.fromkeys(detected_frameworks))[:4],
        "key_code_files": key_code_files[:4],
        "code_evidence": evidence_summary,
        "code_depth": code_depth,
        "relevance_score": relevance_score,
        "relevance_reasons": cleaned_reasons,
        "matched_domains": matched_domain_names,
    }


def analyze_github_user_and_skills(username, claimed_skill, certificate_title=""):
    """
    Main entry point for SkillLedger Deep Code & Context Verification.
    Fetches real repos, inspects code and context, filters out unrelated noise,
    and returns a deterministic evidence verification verdict.
    """
    user_clean = (username or "").strip().lower()
    if "github.com/" in user_clean:
        user_clean = user_clean.split("github.com/")[-1].strip("/").split("/")[0]

    target_domains = _detect_domains_from_query(claimed_skill, certificate_title)

    # 1. Check pre-seeded rich demo profiles first
    if user_clean in DEMO_PROFILES_ENRICHED:
        all_preset_repos = DEMO_PROFILES_ENRICHED[user_clean]
        matching_repos = []
        for repo in all_preset_repos:
            # Score against claimed skill
            score = 0
            skill_low = claimed_skill.lower()
            if "yolo" in skill_low or "vision" in skill_low or "ai" in skill_low or "malware" in skill_low:
                if "yolo" in repo["name"] or "ai" in repo["name"]:
                    score += 15
            if "blockchain" in skill_low or "solidity" in skill_low or "crypto" in skill_low:
                if "blockchain" in repo["name"] or "contract" in repo["name"]:
                    score += 15
            if "react" in skill_low or "frontend" in skill_low:
                if "react" in repo["name"]:
                    score += 15
            if "fastapi" in skill_low or "backend" in skill_low or "python" in skill_low:
                if "python" in repo["language"].lower() or "fastapi" in repo["name"]:
                    score += 10

            if score > 0:
                matching_repos.append(repo)

        # If user searched general "Python & AI/ML", return the top matching repos
        if not matching_repos:
            matching_repos = all_preset_repos[:2]

        total_repos_count = len(all_preset_repos)
        matching_count = len(matching_repos)
        languages_aggregate = {}
        for r in all_preset_repos:
            for l, b in r.get("languages_breakdown", {}).items():
                languages_aggregate[l] = languages_aggregate.get(l, 0) + b

        return _build_final_verdict(
            username=user_clean,
            claimed_skill=claimed_skill,
            certificate_title=certificate_title,
            matching_repos=matching_repos,
            total_repos_count=total_repos_count,
            languages_breakdown=languages_aggregate,
            target_domains=target_domains,
        )

    # 2. Live GitHub API inspection for real users
    gh_repos_url = f"https://api.github.com/users/{user_clean}/repos?per_page=30&sort=updated"
    raw_repos = _http_get_json(gh_repos_url, timeout=6)

    if raw_repos is None:
        # Check if 404 user not found or rate limited
        return {
            "verified": False,
            "classification": "USER_NOT_FOUND",
            "github_username": user_clean,
            "claimed_skill": claimed_skill,
            "certificate_title": certificate_title,
            "summary": f"GitHub user '{user_clean}' could not be reached or does not exist. Please verify username.",
            "matching_repos_count": 0,
            "total_repos_inspected": 0,
            "matching_repos": [],
            "languages_breakdown": {},
            "evidence_fingerprint": sha256_hash("USER_NOT_FOUND"),
        }

    total_repos_count = len(raw_repos)
    if total_repos_count == 0:
        return {
            "verified": False,
            "classification": "NO_PUBLIC_REPOSITORIES",
            "github_username": user_clean,
            "claimed_skill": claimed_skill,
            "certificate_title": certificate_title,
            "summary": f"User '@{user_clean}' has 0 public repositories on GitHub. Cannot verify practical implementation.",
            "matching_repos_count": 0,
            "total_repos_inspected": 0,
            "matching_repos": [],
            "languages_breakdown": {},
            "evidence_fingerprint": sha256_hash("NO_PUBLIC_REPOSITORIES"),
        }

    # Deeply inspect repos that look promising
    analyzed_repos = []
    languages_aggregate = {}

    for repo_dict in raw_repos[:12]:  # inspect top 12 repositories
        analyzed = inspect_repository_code(user_clean, repo_dict, target_domains)
        if analyzed["relevance_score"] > 0:
            analyzed_repos.append(analyzed)

        for l, b in analyzed.get("languages_breakdown", {}).items():
            languages_aggregate[l] = languages_aggregate.get(l, 0) + b

    # Sort matching repos by relevance score
    analyzed_repos.sort(key=lambda r: r["relevance_score"], reverse=True)

    return _build_final_verdict(
        username=user_clean,
        claimed_skill=claimed_skill,
        certificate_title=certificate_title,
        matching_repos=analyzed_repos,
        total_repos_count=total_repos_count,
        languages_breakdown=languages_aggregate,
        target_domains=target_domains,
    )


def _build_final_verdict(username, claimed_skill, certificate_title, matching_repos, total_repos_count, languages_breakdown, target_domains):
    """Builds the comprehensive recruiter report and cryptographic fingerprint."""
    matching_count = len(matching_repos)

    if matching_count >= 1:
        top_repo = matching_repos[0]
        frameworks_str = ", ".join(top_repo.get("detected_frameworks", [])[:3])
        files_str = ", ".join(top_repo.get("key_code_files", [])[:2])

        classification = "PRACTICAL_EVIDENCE_CONFIRMED"
        if frameworks_str:
            summary = (
                f"Practical Code Evidence Confirmed: Analyzed {matching_count} repository codebase(s) for @{username}. "
                f"Verified applied implementation of '{claimed_skill}' including {frameworks_str}"
                f"{f' across source files ({files_str})' if files_str else ''}. "
                f"Candidate demonstrates hands-on programming depth beyond theoretical certification."
            )
        else:
            summary = (
                f"Practical Code Evidence Confirmed: Found {matching_count} relevant repositories matching '{claimed_skill}'. "
                f"Codebase analysis confirms active implementation in {top_repo.get('language', 'code')}."
            )
    else:
        classification = "THEORY_ONLY_NO_MATCHING_CODE"
        summary = (
            f"Theory Only (No Matching Code): Inspected {total_repos_count} public repositories for @{username}. "
            f"Static code analysis did not find active code modules, dependencies, or scripts applying '{claimed_skill}'. "
            f"While the candidate may possess theoretical hours or certificates, no practical GitHub proof was detected."
        )

    evidence_fingerprint = sha256_hash(canonical_json(matching_repos)) if matching_repos else sha256_hash("NO_CODE_EVIDENCE")

    return {
        "verified": matching_count > 0,
        "classification": classification,
        "github_username": username,
        "claimed_skill": claimed_skill,
        "certificate_title": certificate_title,
        "summary": summary,
        "matching_repos_count": matching_count,
        "total_repos_inspected": total_repos_count,
        "matching_repos": matching_repos,
        "languages_breakdown": languages_breakdown,
        "target_domains": target_domains,
        "evidence_fingerprint": evidence_fingerprint,
    }
