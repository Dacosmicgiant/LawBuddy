import asyncio
import time
import json
import hashlib
from typing import Optional, Dict, Any, List, AsyncGenerator, Tuple
from datetime import datetime, timedelta
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold, GenerationConfig
from motor.motor_asyncio import AsyncIOMotorDatabase
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import logging

from app.core.config import settings
from app.models.chat import (
    AIMetadata, MessageRole, MessageStatus, ResponseFormat, TokenUsage,
    ConversationContext, ConversationMemory, MessageFormatting
)
from app.models.user import User

logger = logging.getLogger(__name__)

# Enhanced Indian Traffic Law Context
ENHANCED_INDIAN_TRAFFIC_LAW_CONTEXT = """
You are LawBuddy, an expert AI legal assistant specializing in Indian traffic laws and motor vehicle regulations. You have comprehensive knowledge of:

## LEGAL FRAMEWORK:
- Motor Vehicles Act, 1988 and 2019 amendments
- Central Motor Vehicle Rules, 1989
- State-specific traffic regulations
- Supreme Court and High Court judgments on traffic matters
- Transport Commissioner guidelines

## RESPONSE FORMATTING GUIDELINES:
Format your responses using proper markdown with these elements:

### Headers
Use ### for main sections, #### for subsections

### Lists
- Use bullet points for unordered lists
- Use numbered lists for step-by-step procedures

### Emphasis
- Use **bold** for important terms, penalties, and legal requirements
- Use *italics* for case names and legal citations
- Use `inline code` for specific legal section numbers

### Code Blocks
```legal
Section 183: Driving without license
Penalty: ₹5,000 fine
```

### Tables
| Offense | First Penalty | Second Penalty |
|---------|---------------|----------------|
| Drunk Driving | ₹10,000 | ₹15,000 + imprisonment |

### Important Notes
> Always include disclaimers in blockquotes

Remember: You're helping Indian citizens navigate complex traffic laws. Be accurate, helpful, and always encourage road safety and legal compliance.
"""

class AIServiceError(Exception):
    """Custom exception for AI service errors"""
    def __init__(self, message: str, error_type: str = "general", retry_after: Optional[int] = None):
        self.message = message
        self.error_type = error_type
        self.retry_after = retry_after
        super().__init__(message)

class TokenManager:
    """Manages token counting and cost estimation"""
    
    # Gemini pricing (approximate, update based on current rates)
    TOKEN_COSTS = {
        "gemini-1.5-flash": {"input": 0.00001, "output": 0.00003},
        "gemini-1.5-pro": {"input": 0.00003, "output": 0.00006},
    }
    
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.costs = self.TOKEN_COSTS.get(model_name, {"input": 0.00002, "output": 0.00004})
    
    def estimate_tokens(self, text: str) -> int:
        """Estimate token count (rough approximation)"""
        # Simple approximation: ~4 characters per token
        return len(text) // 4
    
    def calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate estimated cost"""
        input_cost = input_tokens * self.costs["input"]
        output_cost = output_tokens * self.costs["output"]
        return input_cost + output_cost
    
    def create_token_usage(self, input_text: str, output_text: str) -> TokenUsage:
        """Create TokenUsage object"""
        input_tokens = self.estimate_tokens(input_text)
        output_tokens = self.estimate_tokens(output_text)
        total_tokens = input_tokens + output_tokens
        cost = self.calculate_cost(input_tokens, output_tokens)
        
        return TokenUsage(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            estimated_cost=cost
        )

class ConversationContextManager:
    """Manages conversation context with sliding window"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.contexts: Dict[str, ConversationContext] = {}
        self.memories: Dict[str, ConversationMemory] = {}
    
    async def get_context(self, session_id: str, window_size: int = 10) -> ConversationContext:
        """Get conversation context for session"""
        if session_id not in self.contexts:
            # Load from database
            await self._load_context_from_db(session_id, window_size)
        
        return self.contexts.get(session_id, ConversationContext(
            session_id=session_id,
            context_window_size=window_size
        ))
    
    async def _load_context_from_db(self, session_id: str, window_size: int):
        """Load recent messages from database"""
        try:
            # Get recent messages
            pipeline = [
                {"$match": {
                    "chat_session_id": session_id,
                    "status": {"$in": [MessageStatus.COMPLETE, MessageStatus.FAILED]}
                }},
                {"$sort": {"timestamp": -1}},
                {"$limit": window_size * 2},  # Get more to filter properly
                {"$sort": {"timestamp": 1}}  # Re-sort chronologically
            ]
            
            cursor = self.db.messages.aggregate(pipeline)
            messages = await cursor.to_list(length=window_size * 2)
            
            # Convert to context format
            context_messages = []
            total_tokens = 0
            
            for msg in messages[-window_size:]:  # Keep only recent messages
                context_msg = {
                    "role": msg["role"],
                    "content": msg["content"],
                    "timestamp": msg["timestamp"]
                }
                context_messages.append(context_msg)
                total_tokens += len(msg["content"]) // 4  # Rough token estimate
            
            self.contexts[session_id] = ConversationContext(
                session_id=session_id,
                messages=context_messages,
                context_window_size=window_size,
                token_count=total_tokens
            )
            
        except Exception as e:
            logger.error(f"Failed to load context from DB: {e}")
            self.contexts[session_id] = ConversationContext(session_id=session_id)
    
    async def add_message_to_context(self, session_id: str, role: str, content: str):
        """Add message to conversation context"""
        context = await self.get_context(session_id)
        
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow()
        }
        
        context.messages.append(message)
        context.token_count += len(content) // 4
        
        # Maintain sliding window
        while len(context.messages) > context.context_window_size:
            removed_msg = context.messages.pop(0)
            context.token_count -= len(removed_msg["content"]) // 4
        
        # If context is getting too large, summarize older messages
        if context.token_count > context.max_context_tokens:
            await self._compress_context(context)
    
    async def _compress_context(self, context: ConversationContext):
        """Compress context by summarizing older messages"""
        if len(context.messages) <= 4:  # Keep minimum messages
            return
        
        # Take first half of messages for summarization
        messages_to_summarize = context.messages[:len(context.messages)//2]
        remaining_messages = context.messages[len(context.messages)//2:]
        
        # Create summary (simplified - in production, use AI to summarize)
        summary_points = []
        for msg in messages_to_summarize:
            if msg["role"] == "user":
                summary_points.append(f"User asked about: {msg['content'][:100]}...")
            else:
                summary_points.append(f"Assistant explained: {msg['content'][:100]}...")
        
        summary = "Previous conversation summary:\n" + "\n".join(summary_points)
        
        # Replace old messages with summary
        context.messages = [{"role": "system", "content": summary, "timestamp": datetime.utcnow()}] + remaining_messages
        context.summary = summary
        context.last_summarized_at = datetime.utcnow()
        
        # Recalculate token count
        context.token_count = sum(len(msg["content"]) // 4 for msg in context.messages)
    
    def build_conversation_prompt(self, session_id: str, current_message: str) -> str:
        """Build complete conversation prompt"""
        context = self.contexts.get(session_id)
        if not context or not context.messages:
            return f"{ENHANCED_INDIAN_TRAFFIC_LAW_CONTEXT}\n\nUser Question: {current_message}"
        
        # Build conversation history
        conversation_history = "\n\nPREVIOUS CONVERSATION:\n"
        for msg in context.messages[-6:]:  # Use last 6 messages
            role = "User" if msg["role"] == "user" else "LawBuddy"
            conversation_history += f"{role}: {msg['content']}\n"
        
        return f"{ENHANCED_INDIAN_TRAFFIC_LAW_CONTEXT}{conversation_history}\nCurrent User Question: {current_message}\n\nPlease provide a helpful response in proper markdown format with appropriate sections, lists, and emphasis."

class AIService:
    """Enhanced AI service with robust error handling and context management"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.model = None
        self.context_manager = ConversationContextManager(database)
        self.token_manager = None
        
        # Response cache for similar queries
        self.response_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = timedelta(hours=1)
        
        # Rate limiting
        self.request_counts: Dict[str, List[datetime]] = {}
        self.max_requests_per_minute = 60
        
        if settings.GEMINI_API_KEY:
            self._initialize_gemini()
        else:
            logger.warning("GEMINI_API_KEY not set. AI features will be limited.")

    def _initialize_gemini(self):
        """Initialize Gemini AI model with enhanced configuration"""
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            
            # Enhanced safety settings
            safety_settings = {
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }
            
            # Enhanced generation config
            generation_config = GenerationConfig(
                temperature=0.7,
                top_p=0.8,
                top_k=40,
                max_output_tokens=2048,
                candidate_count=1,
            )
            
            self.model = genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                generation_config=generation_config,
                safety_settings=safety_settings
            )
            
            self.token_manager = TokenManager(settings.GEMINI_MODEL)
            logger.info(f"✅ Gemini AI initialized with model: {settings.GEMINI_MODEL}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Gemini AI: {e}")
            self.model = None

    def _check_rate_limit(self, user_id: str) -> bool:
        """Check if user has exceeded rate limits"""
        now = datetime.utcnow()
        user_requests = self.request_counts.get(user_id, [])
        
        # Remove old requests (older than 1 minute)
        user_requests = [req_time for req_time in user_requests if now - req_time < timedelta(minutes=1)]
        
        # Check if under limit
        if len(user_requests) >= self.max_requests_per_minute:
            return False
        
        # Add current request
        user_requests.append(now)
        self.request_counts[user_id] = user_requests
        return True

    def _get_cache_key(self, message: str, session_id: str) -> str:
        """Generate cache key for response caching"""
        context = self.context_manager.contexts.get(session_id)
        context_str = ""
        if context and context.messages:
            # Use last 2 messages for context in cache key
            recent_messages = context.messages[-2:]
            context_str = json.dumps([msg["content"] for msg in recent_messages])
        
        cache_input = f"{message}:{context_str}"
        return hashlib.md5(cache_input.encode()).hexdigest()

    def _get_cached_response(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached response if still valid"""
        if cache_key not in self.response_cache:
            return None
        
        cached = self.response_cache[cache_key]
        if datetime.utcnow() - cached["timestamp"] > self.cache_ttl:
            del self.response_cache[cache_key]
            return None
        
        return cached["response"]

    def _cache_response(self, cache_key: str, response: Dict[str, Any]):
        """Cache response for future use"""
        self.response_cache[cache_key] = {
            "response": response,
            "timestamp": datetime.utcnow()
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((Exception,))
    )
    async def _make_gemini_request(self, prompt: str, stream: bool = False):
        """Make request to Gemini API with retry logic"""
        if not self.model:
            raise AIServiceError("AI model not initialized", "initialization_error")
        
        try:
            if stream:
                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.model.generate_content(prompt, stream=True)
                )
            else:
                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.model.generate_content(prompt)
                )
            return response
            
        except Exception as e:
            error_message = str(e)
            
            # Handle specific error types
            if "429" in error_message or "quota" in error_message.lower():
                raise AIServiceError("Rate limit exceeded", "rate_limit", retry_after=60)
            elif "400" in error_message:
                raise AIServiceError("Invalid request format", "bad_request")
            elif "401" in error_message or "403" in error_message:
                raise AIServiceError("Authentication failed", "auth_error")
            elif "500" in error_message:
                raise AIServiceError("Gemini service error", "service_error", retry_after=30)
            else:
                raise AIServiceError(f"Unexpected error: {error_message}", "unknown_error")

    async def generate_response(
        self, 
        user_message: str, 
        chat_session_id: str,
        user: User,
        response_format: ResponseFormat = ResponseFormat.MARKDOWN,
        regenerate: bool = False
    ) -> Dict[str, Any]:
        """Generate AI response with enhanced error handling and context management"""
        
        if not self.model:
            return {
                "success": False,
                "content": "I apologize, but AI services are currently unavailable. Please check your configuration.",
                "metadata": None,
                "error_type": "service_unavailable"
            }
        
        # Check rate limits
        if not self._check_rate_limit(str(user.id)):
            return {
                "success": False,
                "content": "You've exceeded the rate limit. Please wait a moment before sending another message.",
                "metadata": None,
                "error_type": "rate_limit"
            }
        
        try:
            start_time = time.time()
            
            # Check cache (skip for regeneration)
            cache_key = None
            if not regenerate:
                cache_key = self._get_cache_key(user_message, chat_session_id)
                cached_response = self._get_cached_response(cache_key)
                if cached_response:
                    logger.info(f"Returning cached response for session {chat_session_id}")
                    return cached_response
            
            # Build prompt with conversation context
            prompt = self.context_manager.build_conversation_prompt(chat_session_id, user_message)
            
            # Make API request
            response = await self._make_gemini_request(prompt, stream=False)
            
            processing_time = time.time() - start_time
            
            # Extract response content
            if response.parts:
                content = response.parts[0].text
            else:
                content = "I apologize, but I couldn't generate a response. Please try rephrasing your question."
            
            # Update conversation context
            await self.context_manager.add_message_to_context(chat_session_id, "user", user_message)
            await self.context_manager.add_message_to_context(chat_session_id, "assistant", content)
            
            # Create AI metadata
            token_usage = self.token_manager.create_token_usage(prompt, content)
            
            ai_metadata = AIMetadata(
                model_used=settings.GEMINI_MODEL,
                confidence_score=0.9,
                processing_time=round(processing_time, 2),
                token_usage=token_usage,
                legal_sources=self._extract_legal_sources(content),
                fact_checked=True,
                response_format=response_format,
                safety_ratings=getattr(response, 'safety_ratings', None),
                finish_reason=getattr(response, 'finish_reason', None)
            )
            
            # Extract formatting information
            formatting = self._extract_formatting(content)
            
            result = {
                "success": True,
                "content": content,
                "metadata": ai_metadata,
                "formatting": formatting,
                "cached": False
            }
            
            # Cache response
            if cache_key:
                self._cache_response(cache_key, result)
            
            return result
            
        except AIServiceError as e:
            logger.error(f"AI Service Error: {e.message}")
            return {
                "success": False,
                "content": f"I'm experiencing technical difficulties: {e.message}",
                "metadata": None,
                "error_type": e.error_type,
                "retry_after": e.retry_after
            }
        except Exception as e:
            logger.error(f"Unexpected error in AI service: {e}")
            return {
                "success": False,
                "content": "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
                "metadata": None,
                "error_type": "unexpected_error"
            }

    def _extract_formatting(self, content: str) -> MessageFormatting:
        """Extract formatting information from content"""
        import re
        
        # Detect code blocks
        code_blocks = []
        code_pattern = r'```(\w*)\n(.*?)\n```'
        matches = re.findall(code_pattern, content, re.DOTALL)
        for language, code in matches:
            code_blocks.append({"language": language or "text", "code": code})
        
        # Detect markdown elements
        markdown_elements = []
        if re.search(r'#{1,6}\s', content):
            markdown_elements.append("headers")
        if re.search(r'\*\*.*?\*\*', content):
            markdown_elements.append("bold")
        if re.search(r'\*.*?\*', content):
            markdown_elements.append("italics")
        if re.search(r'^\s*[-*+]\s', content, re.MULTILINE):
            markdown_elements.append("bullet_lists")
        if re.search(r'^\s*\d+\.\s', content, re.MULTILINE):
            markdown_elements.append("numbered_lists")
        if re.search(r'^\s*>\s', content, re.MULTILINE):
            markdown_elements.append("blockquotes")
        
        # Detect tables
        has_tables = bool(re.search(r'\|.*\|', content))
        
        # Detect sections (headers)
        sections = re.findall(r'#{1,6}\s+(.*)', content)
        
        # Extract citations (legal references)
        citations = self._extract_legal_sources(content)
        
        return MessageFormatting(
            has_formatting=bool(markdown_elements or code_blocks),
            sections=sections,
            citations=citations,
            code_blocks=code_blocks,
            markdown_elements=markdown_elements,
            has_tables=has_tables,
            has_lists="bullet_lists" in markdown_elements or "numbered_lists" in markdown_elements
        )

    def _extract_legal_sources(self, content: str) -> List[str]:
        """Extract legal sources mentioned in the response"""
        sources = []
        
        # Enhanced legal source patterns
        patterns = [
            r'Section \d+[A-Z]*(?:\([^)]+\))?',
            r'Article \d+[A-Z]*',
            r'Rule \d+[A-Z]*',
            r'Chapter [IVX]+',
            r'Motor Vehicles? Act,?\s*\d{4}',
            r'Central Motor Vehicle Rules,?\s*\d{4}',
            r'Supreme Court.*?v\..*?\d{4}',
            r'High Court.*?v\..*?\d{4}',
            r'[A-Z][a-z]+\s+v\.?\s+[A-Z][a-z]+.*?\(\d{4}\)',
        ]
        
        import re
        for pattern in patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            sources.extend(matches)
        
        # Remove duplicates and return
        return list(set(sources))

    def is_available(self) -> bool:
        """Check if AI service is available"""
        return self.model is not None

    async def get_conversation_health(self, session_id: str) -> Dict[str, Any]:
        """Get conversation health metrics"""
        context = await self.context_manager.get_context(session_id)
        
        return {
            "context_size": len(context.messages),
            "token_count": context.token_count,
            "last_summarized": context.last_summarized_at.isoformat() if context.last_summarized_at else None,
            "cache_entries": len(self.response_cache),
            "service_available": self.is_available()
        }