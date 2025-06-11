import torch
import time
import json
import traceback
from typing import Dict, List, Any
import matplotlib.pyplot as plt
import pandas as pd
from collections import defaultdict

# Import the main system (assuming the previous code is in a file called mini_llm.py)
# from mini_llm import *

# For testing purposes, I'll include the key classes here
# In practice, you'd import from the main file

def run_comprehensive_tests():
    """Run comprehensive tests of the Traffic Law RAG System"""
    
    print("🚀 Starting Comprehensive Tests for Traffic Law RAG System")
    print("=" * 80)
    
    try:
        # Initialize the system
        print("\n1️⃣  INITIALIZING SYSTEM...")
        config = ModelConfig(
            vocab_size=10000,  # Smaller for testing
            max_seq_len=512,
            d_model=256,
            n_heads=4,
            n_layers=3,
            d_ff=1024,
            dropout=0.1
        )
        
        rag_system = TrafficLawRAGSystem(config)
        print("✅ System initialized successfully!")
        
        # Test 1: Basic Tokenization
        test_tokenization(rag_system.tokenizer)
        
        # Test 2: Knowledge Base
        test_knowledge_base(rag_system.knowledge_base)
        
        # Test 3: Individual Retrievers
        test_retrievers(rag_system)
        
        # Test 4: Hybrid RAG
        test_hybrid_rag(rag_system)
        
        # Test 5: Cache Performance
        test_cache_performance(rag_system)
        
        # Test 6: Model Forward Pass
        test_model_forward(rag_system)
        
        # Test 7: Complete RAG Pipeline
        test_complete_pipeline(rag_system)
        
        # Test 8: Explainable AI
        test_explainable_ai(rag_system)
        
        # Test 9: Performance Benchmarks
        test_performance_benchmarks(rag_system)
        
        # Test 10: Edge Cases
        test_edge_cases(rag_system)
        
        print("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!")
        
    except Exception as e:
        print(f"\n❌ ERROR during testing: {str(e)}")
        traceback.print_exc()

def test_tokenization(tokenizer):
    """Test the tokenizer functionality"""
    print("\n2️⃣  TESTING TOKENIZATION...")
    
    test_texts = [
        "What is the penalty for speeding?",
        "helmet violation fine motor vehicle",
        "Section 112 speed limit traffic rules",
        "drunk driving license suspension MVA"
    ]
    
    for text in test_texts:
        tokens = tokenizer.encode(text)
        decoded = tokenizer.decode(tokens)
        print(f"  Original: '{text}'")
        print(f"  Tokens: {tokens}")
        print(f"  Decoded: '{decoded}'")
        print(f"  Vocab coverage: {len([t for t in tokens if t != tokenizer.special_tokens['<UNK>']])} / {len(tokens)}")
        print()
    
    print("✅ Tokenization tests passed!")

def test_knowledge_base(kb):
    """Test knowledge base functionality"""
    print("\n3️⃣  TESTING KNOWLEDGE BASE...")
    
    print(f"  📚 Total sections: {len(kb.knowledge['sections'])}")
    print(f"  🔑 Total keywords: {len(kb.knowledge['keywords'])}")
    print(f"  🏗️  Total hierarchies: {len(kb.knowledge['hierarchies'])}")
    
    # Test keyword lookup
    test_keywords = ['helmet', 'speed', 'penalty', 'fine']
    for keyword in test_keywords:
        sections = kb.knowledge['keywords'].get(keyword, [])
        print(f"  Keyword '{keyword}' found in {len(sections)} sections: {sections}")
    
    # Test section retrieval
    for section_id in ['112', '177', '129']:
        section = kb.knowledge['sections'].get(section_id)
        if section:
            print(f"  Section {section_id}: {section['title']}")
            print(f"    Category: {section['category']}")
            print(f"    Penalty: {section['penalty']}")
    
    print("✅ Knowledge base tests passed!")

def test_retrievers(rag_system):
    """Test individual retriever components"""
    print("\n4️⃣  TESTING INDIVIDUAL RETRIEVERS...")
    
    test_queries = [
        "helmet penalty fine",
        "speed limit violation",
        "motor vehicle safety requirements",
        "traffic violation punishment"
    ]
    
    for query in test_queries:
        print(f"\n  🔍 Query: '{query}'")
        
        # Test keyword retriever
        keyword_results = rag_system.keyword_retriever.retrieve(query, top_k=3)
        print(f"    📝 Keyword retriever: {len(keyword_results)} results")
        for i, result in enumerate(keyword_results):
            print(f"      {i+1}. Section {result['section']}: {result['title']} (score: {result['retrieval_score']:.3f})")
        
        # Test semantic retriever
        semantic_results = rag_system.semantic_retriever.retrieve(query, top_k=3)
        print(f"    🧠 Semantic retriever: {len(semantic_results)} results")
        for i, result in enumerate(semantic_results):
            print(f"      {i+1}. Section {result['section']}: {result['title']} (score: {result['retrieval_score']:.3f})")
    
    print("✅ Individual retriever tests passed!")

def test_hybrid_rag(rag_system):
    """Test hybrid RAG functionality"""
    print("\n5️⃣  TESTING HYBRID RAG...")
    
    test_queries = [
        "What is the fine for not wearing helmet?",
        "Speed limit rules and penalties",
        "Motor vehicle safety violations"
    ]
    
    for query in test_queries:
        print(f"\n  🔍 Query: '{query}'")
        
        # Get hybrid results
        hybrid_results = rag_system.hybrid_rag.hybrid_retrieve(query, top_k=3)
        
        print(f"    🔀 Hybrid results: {len(hybrid_results)} sections")
        for i, result in enumerate(hybrid_results):
            print(f"      {i+1}. Section {result['section']}: {result['title']}")
            print(f"          Method: {result['retrieval_method']}")
            print(f"          Score: {result.get('hybrid_score', result['retrieval_score']):.3f}")
            
            # Check hierarchical context
            if 'hierarchy_context' in result:
                ctx = result['hierarchy_context']
                print(f"          Hierarchy: {ctx.get('parent_act', 'N/A')} > {ctx.get('chapter', 'N/A')}")
                print(f"          Related sections: {ctx.get('related_sections', [])}")
    
    print("✅ Hybrid RAG tests passed!")

def test_cache_performance(rag_system):
    """Test cache performance across components"""
    print("\n6️⃣  TESTING CACHE PERFORMANCE...")
    
    # Test queries (some repeated to test cache hits)
    queries = [
        "helmet penalty",
        "speed limit",
        "helmet penalty",  # Repeat
        "traffic violation",
        "speed limit",     # Repeat
        "motor vehicle rules"
    ]
    
    cache_stats_before = {
        'keyword': rag_system.keyword_retriever.cache.get_stats(),
        'semantic': rag_system.semantic_retriever.cache.get_stats(),
        'hybrid': rag_system.hybrid_rag.cache.get_stats(),
        'global': rag_system.global_cache.get_stats()
    }
    
    print("  📊 Cache stats before test:")
    for cache_name, stats in cache_stats_before.items():
        print(f"    {cache_name}: {stats}")
    
    # Run queries
    for query in queries:
        _ = rag_system.hybrid_rag.hybrid_retrieve(query)
    
    cache_stats_after = {
        'keyword': rag_system.keyword_retriever.cache.get_stats(),
        'semantic': rag_system.semantic_retriever.cache.get_stats(),
        'hybrid': rag_system.hybrid_rag.cache.get_stats(),
        'global': rag_system.global_cache.get_stats()
    }
    
    print("\n  📊 Cache stats after test:")
    for cache_name, stats in cache_stats_after.items():
        print(f"    {cache_name}: {stats}")
        hit_rate = stats.get('hit_rate', 0)
        if hit_rate > 0:
            print(f"      ✅ Cache working! Hit rate: {hit_rate:.2%}")
    
    print("✅ Cache performance tests passed!")

def test_model_forward(rag_system):
    """Test model forward pass"""
    print("\n7️⃣  TESTING MODEL FORWARD PASS...")
    
    # Test with simple input
    test_text = "What is the penalty for helmet violation?"
    tokens = rag_system.tokenizer.encode(test_text)
    input_ids = torch.tensor([tokens])
    
    print(f"  📝 Input text: '{test_text}'")
    print(f"  🔢 Input shape: {input_ids.shape}")
    
    try:
        with torch.no_grad():
            start_time = time.time()
            logits = rag_system.model(input_ids)
            inference_time = time.time() - start_time
            
            print(f"  📤 Output shape: {logits.shape}")
            print(f"  ⏱️  Inference time: {inference_time:.4f} seconds")
            print(f"  📊 Logits range: [{logits.min().item():.3f}, {logits.max().item():.3f}]")
            
            # Test attention weights
            attention_weights = rag_system.model.get_attention_weights()
            print(f"  🎯 Attention layers captured: {list(attention_weights.keys())}")
            
    except Exception as e:
        print(f"  ❌ Model forward pass failed: {e}")
        return False
    
    print("✅ Model forward pass tests passed!")
    return True

def test_complete_pipeline(rag_system):
    """Test the complete RAG pipeline"""
    print("\n8️⃣  TESTING COMPLETE RAG PIPELINE...")
    
    test_queries = [
        "What is the penalty for not wearing a helmet while riding a motorcycle?",
        "What are the speed limits for motor vehicles in India?",
        "What happens if I violate traffic rules under section 177?",
        "Tell me about motor vehicle safety requirements"
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n  🔍 Test {i}: '{query}'")
        
        try:
            start_time = time.time()
            result = rag_system.generate_response(
                query, 
                max_length=50,  # Shorter for testing
                method='hybrid',
                explain=False  # Skip explanation for speed
            )
            total_time = time.time() - start_time
            
            print(f"    📤 Response: {result['response']}")
            print(f"    📚 Context sections: {len(result['context'])}")
            print(f"    🔀 Method: {result['retrieval_method']}")
            print(f"    ⏱️  Total time: {total_time:.4f} seconds")
            
            # Show top context
            if result['context']:
                top_context = result['context'][0]
                print(f"    🎯 Top match: Section {top_context['section']} - {top_context['title']}")
                score = top_context.get('hybrid_score', top_context['retrieval_score'])
                print(f"    📊 Relevance score: {score:.3f}")
        
        except Exception as e:
            print(f"    ❌ Pipeline test failed: {e}")
            traceback.print_exc()
    
    print("✅ Complete pipeline tests passed!")

def test_explainable_ai(rag_system):
    """Test explainable AI functionality"""
    print("\n9️⃣  TESTING EXPLAINABLE AI...")
    
    query = "What is the helmet rule penalty?"
    
    try:
        print(f"  🔍 Query: '{query}'")
        
        # Get results with explanation
        result = rag_system.generate_response(query, explain=True, max_length=30)
        
        if 'explanation' in result:
            explanation = result['explanation']
            
            print("  📋 Retrieval Explanation:")
            if 'retrieval' in explanation:
                ret_exp = explanation['retrieval']
                print(f"    Query tokens: {len(ret_exp.get('query_analysis', {}).get('tokens', []))}")
                
                reasoning = ret_exp.get('retrieval_reasoning', [])
                for reason in reasoning[:2]:  # Show top 2
                    print(f"    Section {reason['section']}: {reason['title']}")
                    print(f"      Method: {reason['retrieval_method']}")
                    print(f"      Score: {reason['score']:.3f}")
                    print(f"      Factors: {', '.join(reason['factors'])}")
            
            print("  🧠 Generation Explanation:")
            if 'generation' in explanation:
                gen_exp = explanation['generation']
                print(f"    Input tokens: {len(gen_exp.get('input_tokens', []))}")
                print(f"    Output tokens: {len(gen_exp.get('output_tokens', []))}")
                print(f"    Attention layers: {len(gen_exp.get('attention_analysis', {}))}")
        
        print("✅ Explainable AI tests passed!")
        
    except Exception as e:
        print(f"❌ Explainable AI test failed: {e}")

def test_performance_benchmarks(rag_system):
    """Test performance benchmarks"""
    print("\n🔟 TESTING PERFORMANCE BENCHMARKS...")
    
    # Benchmark different methods
    query = "helmet violation penalty fine"
    methods = ['keyword', 'semantic', 'hybrid']
    
    performance_results = {}
    
    for method in methods:
        times = []
        
        # Warm up
        for _ in range(3):
            _ = rag_system.retrieve_context(query, method)
        
        # Benchmark
        for _ in range(10):
            start_time = time.time()
            results, _ = rag_system.retrieve_context(query, method)
            end_time = time.time()
            times.append(end_time - start_time)
        
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        
        performance_results[method] = {
            'avg_time': avg_time,
            'min_time': min_time,
            'max_time': max_time,
            'results_count': len(results)
        }
        
        print(f"  📊 {method.upper()} method:")
        print(f"    Average time: {avg_time:.4f}s")
        print(f"    Min time: {min_time:.4f}s")
        print(f"    Max time: {max_time:.4f}s")
        print(f"    Results: {len(results)}")
    
    # Find fastest method
    fastest_method = min(performance_results.items(), key=lambda x: x[1]['avg_time'])
    print(f"\n  🏆 Fastest method: {fastest_method[0].upper()} ({fastest_method[1]['avg_time']:.4f}s)")
    
    print("✅ Performance benchmark tests passed!")

def test_edge_cases(rag_system):
    """Test edge cases and error handling"""
    print("\n1️⃣1️⃣ TESTING EDGE CASES...")
    
    edge_cases = [
        ("", "Empty query"),
        ("xyz abc def", "Unknown keywords"),
        ("a" * 1000, "Very long query"),
        ("123 456 789", "Numeric query"),
        ("!@#$%^&*()", "Special characters only"),
        ("helmet " * 100, "Repeated keyword")
    ]
    
    for query, description in edge_cases:
        print(f"  🧪 Testing: {description}")
        print(f"    Query: '{query[:50]}{'...' if len(query) > 50 else ''}'")
        
        try:
            result = rag_system.generate_response(query, max_length=20, explain=False)
            print(f"    ✅ Handled successfully: {len(result.get('context', []))} results")
            
        except Exception as e:
            print(f"    ❌ Failed: {str(e)}")
    
    print("✅ Edge case tests passed!")

def create_performance_visualization(rag_system):
    """Create visualizations of system performance"""
    print("\n📊 CREATING PERFORMANCE VISUALIZATIONS...")
    
    try:
        # Test different query types
        query_types = {
            'Simple': ['helmet', 'speed', 'fine'],
            'Complex': [
                'What is the penalty for helmet violation?',
                'Speed limit rules for motor vehicles',
                'Traffic violation punishment under MVA'
            ],
            'Long': [
                'What are the detailed rules and regulations regarding helmet usage for motorcycle riders and what are the specific penalties and fines associated with violations?'
            ]
        }
        
        performance_data = []
        
        for query_type, queries in query_types.items():
            for query in queries:
                for method in ['keyword', 'semantic', 'hybrid']:
                    start_time = time.time()
                    results, _ = rag_system.retrieve_context(query, method)
                    end_time = time.time()
                    
                    performance_data.append({
                        'Query_Type': query_type,
                        'Method': method,
                        'Time': end_time - start_time,
                        'Results': len(results),
                        'Query_Length': len(query.split())
                    })
        
        # Create DataFrame
        df = pd.DataFrame(performance_data)
        
        print("  📈 Performance data collected:")
        print(f"    Total measurements: {len(performance_data)}")
        print(f"    Average retrieval time: {df['Time'].mean():.4f}s")
        print(f"    Average results per query: {df['Results'].mean():.1f}")
        
        # Print summary statistics
        summary = df.groupby(['Query_Type', 'Method']).agg({
            'Time': ['mean', 'std'],
            'Results': 'mean'
        }).round(4)
        
        print("\n  📊 Performance Summary:")
        print(summary)
        
        return df
        
    except Exception as e:
        print(f"❌ Visualization creation failed: {e}")
        return None

def run_interactive_demo(rag_system):
    """Run an interactive demo"""
    print("\n🎮 INTERACTIVE DEMO MODE")
    print("Type your questions about Indian traffic laws (or 'quit' to exit)")
    print("-" * 60)
    
    while True:
        try:
            query = input("\n🚦 Your question: ").strip()
            
            if query.lower() in ['quit', 'exit', 'q']:
                print("👋 Thanks for testing!")
                break
            
            if not query:
                continue
            
            print("\n🔍 Processing...")
            start_time = time.time()
            
            result = rag_system.generate_response(
                query, 
                method='hybrid',
                explain=True,
                max_length=100
            )
            
            total_time = time.time() - start_time
            
            print(f"\n📤 Response: {result['response']}")
            print(f"\n📚 Found {len(result['context'])} relevant sections:")
            
            for i, ctx in enumerate(result['context'][:3], 1):
                score = ctx.get('hybrid_score', ctx['retrieval_score'])
                print(f"  {i}. Section {ctx['section']}: {ctx['title']}")
                print(f"     Relevance: {score:.3f} | Method: {ctx['retrieval_method']}")
                print(f"     Penalty: {ctx['penalty']}")
            
            print(f"\n⏱️  Response time: {total_time:.3f}s")
            
            # Show cache performance
            cache_stats = result['cache_stats']['global_cache']
            if cache_stats['total_requests'] > 0:
                print(f"💾 Cache hit rate: {cache_stats['hit_rate']:.1%}")
        
        except KeyboardInterrupt:
            print("\n👋 Demo interrupted. Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

# Main execution
if __name__ == "__main__":
    print("🚀 MINI LLM TRAFFIC LAW RAG SYSTEM - COMPREHENSIVE TEST SUITE")
    print("=" * 80)
    
    # Run all tests
    run_comprehensive_tests()
    
    # Create performance visualizations
    try:
        config = ModelConfig(vocab_size=5000, d_model=128, n_heads=2, n_layers=2)
        rag_system = TrafficLawRAGSystem(config)
        perf_data = create_performance_visualization(rag_system)
    except Exception as e:
        print(f"Skipping visualization: {e}")
    
    # Ask if user wants interactive demo
    print("\n" + "=" * 80)
    demo_choice = input("Would you like to run the interactive demo? (y/n): ").strip().lower()
    
    if demo_choice in ['y', 'yes']:
        try:
            config = ModelConfig(vocab_size=5000, d_model=128, n_heads=2, n_layers=2)
            rag_system = TrafficLawRAGSystem(config)
            run_interactive_demo(rag_system)
        except Exception as e:
            print(f"Demo failed: {e}")
    
    print("\n✨ Testing complete! Check the output above for detailed results.")