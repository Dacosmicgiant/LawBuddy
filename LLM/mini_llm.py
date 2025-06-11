import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import json
import re
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass
import math
from collections import defaultdict, OrderedDict
import pickle
import hashlib
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ModelConfig:
    vocab_size: int = 50000
    max_seq_len: int = 1024
    d_model: int = 512
    n_heads: int = 8
    n_layers: int = 6
    d_ff: int = 2048
    dropout: float = 0.1
    
class SimpleTokenizer:
    """Simple BPE-style tokenizer for Indian traffic laws"""
    
    def __init__(self, vocab_size: int = 50000):
        self.vocab_size = vocab_size
        self.word_to_id = {}
        self.id_to_word = {}
        self.special_tokens = {
            '<PAD>': 0,
            '<UNK>': 1, 
            '<BOS>': 2,
            '<EOS>': 3,
            '<SEP>': 4
        }
        
        # Traffic law specific tokens
        self.traffic_tokens = [
            'vehicle', 'traffic', 'license', 'challan', 'fine', 'violation',
            'speed', 'helmet', 'seatbelt', 'signal', 'lane', 'parking',
            'drunk', 'driving', 'permit', 'registration', 'insurance',
            'MVA', 'police', 'court', 'penalty', 'section', 'rule'
        ]
        
        self._build_vocab()
    
    def _build_vocab(self):
        vocab_idx = len(self.special_tokens)
        
        # Add special tokens
        for token, idx in self.special_tokens.items():
            self.word_to_id[token] = idx
            self.id_to_word[idx] = token
        
        # Add traffic-specific tokens
        for token in self.traffic_tokens:
            self.word_to_id[token] = vocab_idx
            self.id_to_word[vocab_idx] = token
            vocab_idx += 1
        
        # Fill remaining vocab with common words (simplified)
        common_words = [
            'the', 'and', 'or', 'in', 'of', 'to', 'for', 'with', 'on', 'at',
            'by', 'from', 'as', 'is', 'are', 'be', 'have', 'has', 'will',
            'shall', 'must', 'should', 'can', 'may', 'under', 'above'
        ]
        
        for word in common_words:
            if word not in self.word_to_id and vocab_idx < self.vocab_size:
                self.word_to_id[word] = vocab_idx
                self.id_to_word[vocab_idx] = word
                vocab_idx += 1
    
    def encode(self, text: str) -> List[int]:
        tokens = text.lower().split()
        return [self.word_to_id.get(token, self.special_tokens['<UNK>']) for token in tokens]
    
    def decode(self, ids: List[int]) -> str:
        return ' '.join([self.id_to_word.get(id, '<UNK>') for id in ids])

class MultiHeadAttention(nn.Module):
    def __init__(self, d_model: int, n_heads: int, dropout: float = 0.1):
        super().__init__()
        assert d_model % n_heads == 0
        
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_k = d_model // n_heads
        
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)
        
        self.dropout = nn.Dropout(dropout)
        self.attention_weights = None  # For explainability
        
    def forward(self, query, key, value, mask=None):
        batch_size, seq_len, d_model = query.size()
        
        # Linear transformations and reshape
        Q = self.W_q(query).view(batch_size, seq_len, self.n_heads, self.d_k).transpose(1, 2)
        K = self.W_k(key).view(batch_size, seq_len, self.n_heads, self.d_k).transpose(1, 2)
        V = self.W_v(value).view(batch_size, seq_len, self.n_heads, self.d_k).transpose(1, 2)
        
        # Scaled dot-product attention
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.d_k)
        
        if mask is not None:
            scores = scores.masked_fill(mask == 0, -1e9)
        
        attention_weights = F.softmax(scores, dim=-1)
        self.attention_weights = attention_weights.detach()  # Store for explainability
        attention_weights = self.dropout(attention_weights)
        
        # Apply attention to values
        context = torch.matmul(attention_weights, V)
        
        # Concatenate heads and put through final linear layer
        context = context.transpose(1, 2).contiguous().view(batch_size, seq_len, d_model)
        output = self.W_o(context)
        
        return output

class FeedForward(nn.Module):
    def __init__(self, d_model: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)
        
    def forward(self, x):
        return self.linear2(self.dropout(F.relu(self.linear1(x))))

class TransformerBlock(nn.Module):
    def __init__(self, config: ModelConfig):
        super().__init__()
        self.attention = MultiHeadAttention(config.d_model, config.n_heads, config.dropout)
        self.feed_forward = FeedForward(config.d_model, config.d_ff, config.dropout)
        self.norm1 = nn.LayerNorm(config.d_model)
        self.norm2 = nn.LayerNorm(config.d_model)
        self.dropout = nn.Dropout(config.dropout)
        
    def forward(self, x, mask=None):
        # Self-attention with residual connection
        attn_output = self.attention(x, x, x, mask)
        x = self.norm1(x + self.dropout(attn_output))
        
        # Feed-forward with residual connection
        ff_output = self.feed_forward(x)
        x = self.norm2(x + self.dropout(ff_output))
        
        return x

class MiniLLM(nn.Module):
    def __init__(self, config: ModelConfig):
        super().__init__()
        self.config = config
        
        self.token_embedding = nn.Embedding(config.vocab_size, config.d_model)
        self.position_embedding = nn.Embedding(config.max_seq_len, config.d_model)
        
        self.transformer_blocks = nn.ModuleList([
            TransformerBlock(config) for _ in range(config.n_layers)
        ])
        
        self.ln_f = nn.LayerNorm(config.d_model)
        self.head = nn.Linear(config.d_model, config.vocab_size, bias=False)
        
        self.apply(self._init_weights)
        
    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                torch.nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
    
    def forward(self, input_ids, attention_mask=None):
        batch_size, seq_len = input_ids.size()
        
        # Token and position embeddings
        positions = torch.arange(0, seq_len, device=input_ids.device).unsqueeze(0)
        token_embeds = self.token_embedding(input_ids)
        pos_embeds = self.position_embedding(positions)
        
        x = token_embeds + pos_embeds
        
        # Pass through transformer blocks
        for block in self.transformer_blocks:
            x = block(x, attention_mask)
        
        x = self.ln_f(x)
        logits = self.head(x)
        
        return logits
    
    def get_attention_weights(self):
        """Extract attention weights for explainability"""
        weights = {}
        for i, block in enumerate(self.transformer_blocks):
            weights[f'layer_{i}'] = block.attention.attention_weights
        return weights

class TrafficLawKnowledgeBase:
    """Knowledge base for Indian traffic laws with hierarchical organization"""
    
    def __init__(self):
        self.knowledge = {
            'sections': {},
            'keywords': defaultdict(list),
            'hierarchies': {},
            'embeddings': {},
            'citations': {}
        }
        self._load_sample_data()
    
    def _load_sample_data(self):
        """Load sample Indian traffic law data"""
        sample_laws = [
            {
                'section': '112',
                'title': 'Speed Limits',
                'content': 'No person shall drive a motor vehicle at a speed exceeding the maximum speed limit.',
                'keywords': ['speed', 'limit', 'motor', 'vehicle', 'drive'],
                'category': 'speed_violations',
                'penalty': 'Fine up to Rs. 1000',
                'hierarchy': ['Motor Vehicles Act', 'Chapter VIII', 'Control of Traffic']
            },
            {
                'section': '177',
                'title': 'Penalties for General Offences',
                'content': 'Whoever violates any provisions shall be punishable with fine which may extend to five hundred rupees.',
                'keywords': ['penalty', 'fine', 'violation', 'offence'],
                'category': 'penalties',
                'penalty': 'Fine up to Rs. 500',
                'hierarchy': ['Motor Vehicles Act', 'Chapter XIII', 'Penalties and Procedure']
            },
            {
                'section': '129',
                'title': 'Wearing of Protective Headgear',
                'content': 'Every person driving or riding on a motor cycle shall wear protective headgear.',
                'keywords': ['helmet', 'headgear', 'motorcycle', 'protective'],
                'category': 'safety_equipment',
                'penalty': 'Fine Rs. 1000 and disqualification for 3 months',
                'hierarchy': ['Motor Vehicles Act', 'Chapter VIII', 'Control of Traffic']
            }
        ]
        
        for law in sample_laws:
            section = law['section']
            self.knowledge['sections'][section] = law
            
            # Build keyword index
            for keyword in law['keywords']:
                self.knowledge['keywords'][keyword].append(section)
            
            # Build hierarchy
            hierarchy_path = ' > '.join(law['hierarchy'])
            if hierarchy_path not in self.knowledge['hierarchies']:
                self.knowledge['hierarchies'][hierarchy_path] = []
            self.knowledge['hierarchies'][hierarchy_path].append(section)

class CacheManager:
    """Cache manager for fast retrieval"""
    
    def __init__(self, max_size: int = 1000):
        self.cache = OrderedDict()
        self.max_size = max_size
        self.hit_count = 0
        self.miss_count = 0
    
    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            # Move to end (most recently used)
            self.cache.move_to_end(key)
            self.hit_count += 1
            return self.cache[key]
        
        self.miss_count += 1
        return None
    
    def set(self, key: str, value: Any):
        if key in self.cache:
            self.cache.move_to_end(key)
        else:
            if len(self.cache) >= self.max_size:
                # Remove least recently used
                self.cache.popitem(last=False)
        
        self.cache[key] = value
    
    def get_stats(self) -> Dict[str, float]:
        total_requests = self.hit_count + self.miss_count
        if total_requests == 0:
            return {'hit_rate': 0.0, 'cache_size': len(self.cache)}
        
        return {
            'hit_rate': self.hit_count / total_requests,
            'cache_size': len(self.cache),
            'total_requests': total_requests
        }

class KeywordRetriever:
    """Keyword-based retrieval system"""
    
    def __init__(self, knowledge_base: TrafficLawKnowledgeBase):
        self.kb = knowledge_base
        self.cache = CacheManager()
    
    def extract_keywords(self, query: str) -> List[str]:
        """Extract keywords from query"""
        # Simple keyword extraction
        words = re.findall(r'\b\w+\b', query.lower())
        traffic_keywords = []
        
        for word in words:
            if word in self.kb.knowledge['keywords']:
                traffic_keywords.append(word)
        
        return traffic_keywords
    
    def retrieve(self, query: str, top_k: int = 5) -> List[Dict]:
        """Retrieve relevant sections based on keywords"""
        cache_key = f"keyword_{hashlib.md5(query.encode()).hexdigest()}"
        cached_result = self.cache.get(cache_key)
        
        if cached_result:
            return cached_result
        
        keywords = self.extract_keywords(query)
        if not keywords:
            return []
        
        # Score sections based on keyword matches
        section_scores = defaultdict(float)
        
        for keyword in keywords:
            for section in self.kb.knowledge['keywords'][keyword]:
                section_scores[section] += 1.0 / len(keywords)
        
        # Retrieve top sections
        top_sections = sorted(section_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        
        results = []
        for section_id, score in top_sections:
            section_data = self.kb.knowledge['sections'][section_id].copy()
            section_data['retrieval_score'] = score
            section_data['retrieval_method'] = 'keyword'
            results.append(section_data)
        
        self.cache.set(cache_key, results)
        return results

class SemanticSearchEngine:
    """Semantic search using simple embeddings"""
    
    def __init__(self, knowledge_base: TrafficLawKnowledgeBase, embedding_dim: int = 256):
        self.kb = knowledge_base
        self.embedding_dim = embedding_dim
        self.cache = CacheManager()
        self._build_embeddings()
    
    def _build_embeddings(self):
        """Build simple word-based embeddings for sections"""
        # This is a simplified embedding - in practice you'd use pre-trained embeddings
        vocab = set()
        
        for section_data in self.kb.knowledge['sections'].values():
            words = re.findall(r'\b\w+\b', section_data['content'].lower())
            vocab.update(words)
        
        # Create simple random embeddings (in practice, use Word2Vec/BERT)
        self.word_embeddings = {}
        for word in vocab:
            self.word_embeddings[word] = np.random.normal(0, 1, self.embedding_dim)
        
        # Create section embeddings
        for section_id, section_data in self.kb.knowledge['sections'].items():
            words = re.findall(r'\b\w+\b', section_data['content'].lower())
            if words:
                section_embedding = np.mean([
                    self.word_embeddings.get(word, np.zeros(self.embedding_dim)) 
                    for word in words
                ], axis=0)
                self.kb.knowledge['embeddings'][section_id] = section_embedding
    
    def get_query_embedding(self, query: str) -> np.ndarray:
        """Get embedding for query"""
        words = re.findall(r'\b\w+\b', query.lower())
        if not words:
            return np.zeros(self.embedding_dim)
        
        embeddings = [
            self.word_embeddings.get(word, np.zeros(self.embedding_dim)) 
            for word in words
        ]
        return np.mean(embeddings, axis=0)
    
    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity"""
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        return np.dot(a, b) / (norm_a * norm_b)
    
    def retrieve(self, query: str, top_k: int = 5) -> List[Dict]:
        """Retrieve semantically similar sections"""
        cache_key = f"semantic_{hashlib.md5(query.encode()).hexdigest()}"
        cached_result = self.cache.get(cache_key)
        
        if cached_result:
            return cached_result
        
        query_embedding = self.get_query_embedding(query)
        scores = []
        
        for section_id, section_embedding in self.kb.knowledge['embeddings'].items():
            similarity = self.cosine_similarity(query_embedding, section_embedding)
            scores.append((section_id, similarity))
        
        # Sort by similarity and get top results
        scores.sort(key=lambda x: x[1], reverse=True)
        top_sections = scores[:top_k]
        
        results = []
        for section_id, score in top_sections:
            section_data = self.kb.knowledge['sections'][section_id].copy()
            section_data['retrieval_score'] = score
            section_data['retrieval_method'] = 'semantic'
            results.append(section_data)
        
        self.cache.set(cache_key, results)
        return results

class HierarchicalRAG:
    """Hierarchical RAG system"""
    
    def __init__(self, knowledge_base: TrafficLawKnowledgeBase):
        self.kb = knowledge_base
        self.cache = CacheManager()
    
    def get_hierarchy_context(self, section_id: str) -> Dict:
        """Get hierarchical context for a section"""
        section_data = self.kb.knowledge['sections'].get(section_id)
        if not section_data:
            return {}
        
        hierarchy = section_data['hierarchy']
        context = {
            'parent_act': hierarchy[0] if len(hierarchy) > 0 else None,
            'chapter': hierarchy[1] if len(hierarchy) > 1 else None,
            'subsection': hierarchy[2] if len(hierarchy) > 2 else None,
            'related_sections': []
        }
        
        # Find related sections in same hierarchy
        hierarchy_path = ' > '.join(hierarchy)
        if hierarchy_path in self.kb.knowledge['hierarchies']:
            context['related_sections'] = [
                s for s in self.kb.knowledge['hierarchies'][hierarchy_path] 
                if s != section_id
            ]
        
        return context
    
    def retrieve_with_hierarchy(self, query: str, base_results: List[Dict]) -> List[Dict]:
        """Enhance retrieval results with hierarchical context"""
        enhanced_results = []
        
        for result in base_results:
            section_id = result['section']
            hierarchy_context = self.get_hierarchy_context(section_id)
            
            result['hierarchy_context'] = hierarchy_context
            enhanced_results.append(result)
        
        return enhanced_results

class HybridRAG:
    """Hybrid RAG combining multiple retrieval methods"""
    
    def __init__(self, 
                 keyword_retriever: KeywordRetriever,
                 semantic_retriever: SemanticSearchEngine,
                 hierarchical_rag: HierarchicalRAG):
        self.keyword_retriever = keyword_retriever
        self.semantic_retriever = semantic_retriever
        self.hierarchical_rag = hierarchical_rag
        self.cache = CacheManager()
    
    def hybrid_retrieve(self, query: str, top_k: int = 5) -> List[Dict]:
        """Combine keyword and semantic retrieval"""
        cache_key = f"hybrid_{hashlib.md5(query.encode()).hexdigest()}"
        cached_result = self.cache.get(cache_key)
        
        if cached_result:
            return cached_result
        
        # Get results from both methods
        keyword_results = self.keyword_retriever.retrieve(query, top_k)
        semantic_results = self.semantic_retriever.retrieve(query, top_k)
        
        # Combine and rerank
        combined_results = {}
        
        # Weight keyword results
        for result in keyword_results:
            section_id = result['section']
            combined_results[section_id] = result.copy()
            combined_results[section_id]['hybrid_score'] = result['retrieval_score'] * 0.6
        
        # Weight semantic results and combine
        for result in semantic_results:
            section_id = result['section']
            if section_id in combined_results:
                # Combine scores
                combined_results[section_id]['hybrid_score'] += result['retrieval_score'] * 0.4
                combined_results[section_id]['retrieval_method'] = 'hybrid'
            else:
                combined_results[section_id] = result.copy()
                combined_results[section_id]['hybrid_score'] = result['retrieval_score'] * 0.4
                combined_results[section_id]['retrieval_method'] = 'semantic_only'
        
        # Sort by hybrid score
        sorted_results = sorted(
            combined_results.values(),
            key=lambda x: x['hybrid_score'],
            reverse=True
        )[:top_k]
        
        # Add hierarchical context
        final_results = self.hierarchical_rag.retrieve_with_hierarchy(query, sorted_results)
        
        self.cache.set(cache_key, final_results)
        return final_results

class ExplainableAI:
    """Explainable AI component for transparency"""
    
    def __init__(self, model: MiniLLM, tokenizer: SimpleTokenizer):
        self.model = model
        self.tokenizer = tokenizer
    
    def explain_retrieval(self, query: str, results: List[Dict]) -> Dict:
        """Explain why specific results were retrieved"""
        explanation = {
            'query_analysis': {
                'tokens': self.tokenizer.encode(query),
                'keywords_found': [],
                'semantic_concepts': []
            },
            'retrieval_reasoning': [],
            'ranking_factors': {}
        }
        
        for result in results:
            reasoning = {
                'section': result['section'],
                'title': result['title'],
                'retrieval_method': result['retrieval_method'],
                'score': result.get('hybrid_score', result['retrieval_score']),
                'factors': []
            }
            
            if 'keyword' in result['retrieval_method']:
                reasoning['factors'].append('Keyword matches found')
            
            if 'semantic' in result['retrieval_method']:
                reasoning['factors'].append('Semantic similarity detected')
            
            if 'hierarchy_context' in result:
                reasoning['factors'].append('Hierarchical relevance considered')
            
            explanation['retrieval_reasoning'].append(reasoning)
        
        return explanation
    
    def explain_generation(self, input_ids: torch.Tensor, output_ids: torch.Tensor) -> Dict:
        """Explain model generation process"""
        with torch.no_grad():
            _ = self.model(input_ids)
            attention_weights = self.model.get_attention_weights()
        
        explanation = {
            'input_tokens': [self.tokenizer.id_to_word.get(id.item(), '<UNK>') for id in input_ids[0]],
            'output_tokens': [self.tokenizer.id_to_word.get(id.item(), '<UNK>') for id in output_ids[0]],
            'attention_analysis': {},
            'token_importance': {}
        }
        
        # Analyze attention patterns
        for layer_name, weights in attention_weights.items():
            if weights is not None:
                # Average attention across heads and batch
                avg_attention = weights[0].mean(dim=0)  # [seq_len, seq_len]
                explanation['attention_analysis'][layer_name] = {
                    'shape': list(weights.shape),
                    'max_attention': float(avg_attention.max()),
                    'attention_entropy': float(-torch.sum(avg_attention * torch.log(avg_attention + 1e-9)))
                }
        
        return explanation

class TrafficLawRAGSystem:
    """Complete RAG system for Indian traffic laws"""
    
    def __init__(self, config: ModelConfig):
        # Initialize components
        self.config = config
        self.tokenizer = SimpleTokenizer(config.vocab_size)
        self.model = MiniLLM(config)
        self.knowledge_base = TrafficLawKnowledgeBase()
        
        # Initialize retrievers
        self.keyword_retriever = KeywordRetriever(self.knowledge_base)
        self.semantic_retriever = SemanticSearchEngine(self.knowledge_base)
        self.hierarchical_rag = HierarchicalRAG(self.knowledge_base)
        self.hybrid_rag = HybridRAG(
            self.keyword_retriever,
            self.semantic_retriever,
            self.hierarchical_rag
        )
        
        # Initialize explainable AI
        self.explainer = ExplainableAI(self.model, self.tokenizer)
        
        # Global cache
        self.global_cache = CacheManager(max_size=5000)
        
        logger.info("TrafficLawRAGSystem initialized successfully")
    
    def retrieve_context(self, query: str, method: str = 'hybrid') -> Tuple[List[Dict], Dict]:
        """Retrieve relevant context for query"""
        if method == 'keyword':
            results = self.keyword_retriever.retrieve(query)
        elif method == 'semantic':
            results = self.semantic_retriever.retrieve(query)
        elif method == 'hybrid':
            results = self.hybrid_rag.hybrid_retrieve(query)
        else:
            raise ValueError(f"Unknown retrieval method: {method}")
        
        # Generate explanation
        explanation = self.explainer.explain_retrieval(query, results)
        
        return results, explanation
    
    def format_context(self, query: str, results: List[Dict]) -> str:
        """Format retrieved context for model input"""
        context_parts = [f"Query: {query}", "", "Relevant Traffic Laws:"]
        
        for i, result in enumerate(results, 1):
            context_parts.extend([
                f"{i}. Section {result['section']}: {result['title']}",
                f"   Content: {result['content']}",
                f"   Penalty: {result['penalty']}",
                f"   Relevance Score: {result.get('hybrid_score', result['retrieval_score']):.3f}",
                ""
            ])
        
        context_parts.append("Based on the above laws, provide a comprehensive answer:")
        return "\n".join(context_parts)
    
    def generate_response(self, 
                         query: str, 
                         max_length: int = 200,
                         method: str = 'hybrid',
                         explain: bool = True) -> Dict:
        """Generate response using RAG"""
        # Check cache first
        cache_key = f"generate_{hashlib.md5(f'{query}_{method}'.encode()).hexdigest()}"
        cached_result = self.global_cache.get(cache_key)
        
        if cached_result and not explain:
            return cached_result
        
        # Retrieve context
        results, retrieval_explanation = self.retrieve_context(query, method)
        
        if not results:
            return {
                'query': query,
                'response': "I couldn't find relevant information about this traffic law query.",
                'context': [],
                'explanation': {'error': 'No relevant context found'}
            }
        
        # Format context for model
        formatted_context = self.format_context(query, results)
        
        # Tokenize input
        input_tokens = self.tokenizer.encode(formatted_context)
        input_ids = torch.tensor([input_tokens])
        
        # Generate response (simplified generation)
        with torch.no_grad():
            logits = self.model(input_ids)
            
            # Simple greedy decoding
            generated_ids = []
            current_ids = input_ids
            
            for _ in range(max_length):
                logits = self.model(current_ids)
                next_token_logits = logits[0, -1, :]
                next_token_id = torch.argmax(next_token_logits).item()
                
                if next_token_id == self.tokenizer.special_tokens['<EOS>']:
                    break
                
                generated_ids.append(next_token_id)
                current_ids = torch.cat([current_ids, torch.tensor([[next_token_id]])], dim=1)
        
        # Decode response
        response_text = self.tokenizer.decode(generated_ids)
        
        result = {
            'query': query,
            'response': response_text,
            'context': results,
            'retrieval_method': method,
            'cache_stats': {
                'keyword_cache': self.keyword_retriever.cache.get_stats(),
                'semantic_cache': self.semantic_retriever.cache.get_stats(),
                'hybrid_cache': self.hybrid_rag.cache.get_stats(),
                'global_cache': self.global_cache.get_stats()
            }
        }
        
        if explain:
            generation_explanation = self.explainer.explain_generation(
                input_ids, 
                torch.tensor([generated_ids]) if generated_ids else torch.tensor([[]])
            )
            result['explanation'] = {
                'retrieval': retrieval_explanation,
                'generation': generation_explanation
            }
        
        # Cache result
        self.global_cache.set(cache_key, result)
        
        return result
    
    def train_step(self, batch_data: Dict) -> Dict:
        """Single training step"""
        input_ids = batch_data['input_ids']
        target_ids = batch_data['target_ids']
        
        # Forward pass
        logits = self.model(input_ids)
        
        # Calculate loss
        loss = F.cross_entropy(
            logits.view(-1, logits.size(-1)),
            target_ids.view(-1),
            ignore_index=self.tokenizer.special_tokens['<PAD>']
        )
        
        return {'loss': loss, 'logits': logits}
    
    def save_model(self, path: str):
        """Save model and components"""
        checkpoint = {
            'model_state_dict': self.model.state_dict(),
            'config': self.config,
            'tokenizer': self.tokenizer,
            'knowledge_base': self.knowledge_base
        }
        torch.save(checkpoint, path)
        logger.info(f"Model saved to {path}")
    
    def load_model(self, path: str):
        """Load model and components"""
        checkpoint = torch.load(path)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.config = checkpoint['config']
        self.tokenizer = checkpoint['tokenizer']
        self.knowledge_base = checkpoint['knowledge_base']
        logger.info(f"Model loaded from {path}")

# Example usage and testing
def main():
    """Example usage of the TrafficLawRAGSystem"""
    
    # Initialize system
    config = ModelConfig()
    rag_system = TrafficLawRAGSystem(config)
    
    # Test queries
    test_queries = [
        "What is the penalty for not wearing a helmet?",
        "What are the speed limits for motor vehicles?",
        "What happens if I violate traffic rules?",
        "Tell me about section 112 of Motor Vehicles Act"
    ]
    
    print("=== Traffic Law RAG System Demo ===\n")
    
    for query in test_queries:
        print(f"Query: {query}")
        print("-" * 50)
        
        # Generate response with explanation
        result = rag_system.generate_response(query, explain=True)
        
        print(f"Response: {result['response']}")
        print(f"Retrieved {len(result['context'])} relevant sections")
        print(f"Method: {result['retrieval_method']}")
        
        # Show relevant sections
        print("\nRelevant Sections:")
        for ctx in result['context'][:2]:  # Show top 2
            print(f"  - Section {ctx['section']}: {ctx['title']}")
            print(f"    Score: {ctx.get('hybrid_score', ctx['retrieval_score']):.3f}")
        
        print(f"\nCache Stats: {result['cache_stats']['global_cache']}")
        print("=" * 80 + "\n")
    
    # Demonstrate different retrieval methods
    print("=== Comparing Retrieval Methods ===\n")
    query = "What is the penalty for not wearing a helmet?"
    
    for method in ['keyword', 'semantic', 'hybrid']:
        print(f"Method: {method}")
        results, explanation = rag_system.retrieve_context(query, method)
        print(f"Found {len(results)} results")
        if results:
            print(f"Top result: Section {results[0]['section']} (score: {results[0]['retrieval_score']:.3f})")
        print()

if __name__ == "__main__":
    main()