# 🚀 Mini LLM RAG System - Setup Guide

## Quick Start

### 1. Create Virtual Environment

```bash
# Create virtual environment
python -m venv mini_llm_env

# Activate virtual environment
# On Windows:
mini_llm_env\Scripts\activate
# On macOS/Linux:
source mini_llm_env/bin/activate
```

### 2. Install Dependencies

```bash
# Install all requirements
pip install -r requirements.txt

# Or install minimal core dependencies only
pip install torch transformers numpy pandas matplotlib fastapi uvicorn
```

### 3. Additional Setup for NLP Models

```bash
# Download spaCy English model
python -m spacy download en_core_web_sm

# Download NLTK data
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"
```

## 🔧 Installation Options

### Option A: Full Installation (Recommended)

```bash
pip install -r requirements.txt
```

### Option B: Core Only (Minimal)

```bash
pip install torch>=2.0.0 transformers>=4.30.0 numpy>=1.24.0 pandas>=2.0.0 matplotlib>=3.7.0 fastapi>=0.100.0 uvicorn>=0.22.0
```

### Option C: Development Setup

```bash
pip install -r requirements.txt
pip install -e .  # If you have setup.py
pre-commit install  # For code quality
```

## 🖥️ System Requirements

### Minimum Requirements:

- **Python**: 3.8 or higher
- **RAM**: 4GB (8GB recommended)
- **Storage**: 2GB free space
- **OS**: Windows 10+, macOS 10.14+, or Ubuntu 18.04+

### Recommended for Training:

- **Python**: 3.9 or 3.10
- **RAM**: 16GB or more
- **GPU**: NVIDIA GPU with 8GB+ VRAM (optional but recommended)
- **Storage**: 10GB+ free space

## 🐛 Common Issues & Solutions

### Issue 1: PyTorch Installation

```bash
# For CPU only
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# For CUDA 11.8
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# For CUDA 12.1
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### Issue 2: Transformers Version Conflicts

```bash
pip install --upgrade transformers tokenizers
```

### Issue 3: Memory Issues

```bash
# For systems with limited memory
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
```

## 🚀 Quick Test

```python
# Test installation
python -c "
import torch
import transformers
import numpy as np
print('✅ Core libraries installed successfully!')
print(f'PyTorch version: {torch.__version__}')
print(f'Transformers version: {transformers.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
"
```

## 📁 Project Structure

```
mini_llm_rag/
├── requirements.txt
├── mini_llm.py              # Main system code
├── test_mini_llm.py         # Test suite
├── data/
│   ├── traffic_laws.json   # Indian traffic law data
│   └── embeddings/         # Pre-computed embeddings
├── models/
│   ├── checkpoints/        # Model checkpoints
│   └── tokenizers/         # Custom tokenizers
├── api/
│   ├── main.py            # FastAPI server
│   └── routes/            # API routes
├── notebooks/
│   └── experiments.ipynb  # Jupyter experiments
└── docs/
    └── API.md             # API documentation
```

## 🌐 Running the System

### Command Line Interface

```bash
python mini_llm.py --query "What is helmet penalty?"
```

### Web API

```bash
uvicorn api.main:app --reload --port 8000
# Open http://localhost:8000/docs for Swagger UI
```

### Jupyter Notebook

```bash
jupyter notebook notebooks/experiments.ipynb
```

## 🔧 Configuration

### Environment Variables

```bash
# Create .env file
echo "MODEL_NAME=mini_llm_traffic" > .env
echo "MAX_SEQUENCE_LENGTH=512" >> .env
echo "CACHE_SIZE=1000" >> .env
echo "LOG_LEVEL=INFO" >> .env
```

### Config File (config.yaml)

```yaml
model:
  vocab_size: 50000
  max_seq_len: 1024
  d_model: 512
  n_heads: 8
  n_layers: 6

retrieval:
  top_k: 5
  cache_size: 1000
  methods: ["keyword", "semantic", "hybrid"]

data:
  knowledge_base_path: "data/traffic_laws.json"
  embeddings_path: "data/embeddings/"
```

## 📊 Performance Optimization

### For Training:

```bash
# Use mixed precision
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512

# Enable optimized attention
pip install flash-attn --no-build-isolation
```

### For Inference:

```bash
# Use TorchScript compilation
python -c "
import torch
model = torch.jit.script(your_model)
torch.jit.save(model, 'optimized_model.pt')
"
```

## 🔍 Monitoring & Debugging

### Enable Detailed Logging

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Memory Profiling

```bash
pip install memory-profiler
python -m memory_profiler mini_llm.py
```

### Performance Profiling

```bash
pip install py-spy
py-spy record -o profile.svg -- python mini_llm.py
```

## 📚 Next Steps

1. **Expand Knowledge Base**: Add more Indian traffic law sections
2. **Improve Embeddings**: Use sentence-transformers for better semantic search
3. **Add Training**: Implement fine-tuning on traffic law datasets
4. **Deploy**: Use Docker for containerized deployment
5. **Scale**: Add vector databases like Pinecone or Weaviate

## 💡 Tips

- Use `torch.compile()` for PyTorch 2.0+ performance gains
- Implement gradient checkpointing for memory efficiency
- Use `transformers.AutoModel.from_pretrained()` for easy model loading
- Cache embeddings to disk for faster startup
- Use async/await for concurrent API requests

## 🆘 Getting Help

- **Issues**: Check GitHub issues for common problems
- **Documentation**: Read the inline code documentation
- **Community**: Join AI/ML Discord servers for help
- **Stack Overflow**: Tag questions with `pytorch`, `transformers`, `rag`

Happy coding! 🎉
