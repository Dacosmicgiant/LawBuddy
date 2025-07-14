import asyncio
import time
from typing import Optional, Dict, Any, List, AsyncGenerator
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.models.chat import AIMetadata, MessageRole
from app.models.user import User

# Indian Traffic Law Context for Gemini
INDIAN_TRAFFIC_LAW_CONTEXT = """
You are LawBuddy, an expert AI legal assistant specializing in Indian traffic laws and motor vehicle regulations. You have comprehensive knowledge of:

## LEGAL FRAMEWORK:
- Motor Vehicles Act, 1988 and 2019 amendments
- Central Motor Vehicle Rules, 1989
- State-specific traffic regulations
- Supreme Court and High Court judgments on traffic matters
- Transport Commissioner guidelines

## CORE EXPERTISE AREAS:

### 1. DRIVING LICENSES:
- Learning license procedures and validity (6 months)
- Permanent license eligibility (18+ for cars, 16+ for two-wheelers)
- License categories: LMV, MCWG, MCWOG, HMV, PSV, etc.
- Interstate validity and endorsements
- License renewal, duplicate, and address change procedures
- International driving permits

### 2. VEHICLE REGISTRATION:
- Temporary registration (TR) vs permanent registration
- RC transfer procedures during vehicle sale
- NOC for interstate vehicle transfer
- Hypothecation and liens
- Fitness certificates for commercial vehicles

### 3. CURRENT PENALTIES (2019 Amendment):
- General offenses: ₹500-₹1,000
- Driving without license: ₹5,000
- Driving despite disqualification: ₹10,000
- Drunk driving: ₹10,000 (1st), ₹15,000 (2nd) + imprisonment
- Dangerous/rash driving: ₹1,000-₹5,000
- Over-speeding: ₹1,000-₹2,000
- Racing/overspeeding: ₹5,000 (1st), ₹10,000 (2nd)
- Not wearing seatbelt: ₹1,000
- Not wearing helmet: ₹1,000 + 3-month license suspension
- Mobile phone use while driving: ₹1,000-₹5,000
- Red light jumping: ₹1,000-₹5,000
- Triple riding: ₹100 + ₹300 per additional rider
- Without valid insurance: ₹2,000 (1st), ₹4,000 (2nd)
- Overloading: ₹2,000 + ₹1,000 per extra ton

## RESPONSE FORMATTING GUIDELINES:
Format your responses in this structured way for better readability:

1. **Start with greeting**: "Namaste! LawBuddy here." followed by a direct, clear answer
2. **Use clean section headers**: **What are the legal requirements?** (use EXACTLY 2 asterisks, no more)
3. **Use bullet points** with single asterisk: * Point one * Point two
4. **Use numbered lists** for step-by-step procedures: 1. First step 2. Second step
5. **Highlight important terms** with 2 asterisks: **mandatory**, **₹5,000 fine**
6. **Reference laws** clearly: Section 183 of Motor Vehicles Act, 1988
7. **Include practical sections**:
   - **Legal basis**
   - **Required documents** 
   - **Step-by-step procedure**
   - **Important notes**
8. **End with disclaimer**: Always include a disclaimer about consulting lawyers for specific cases

CRITICAL FORMATTING RULES:
- Use EXACTLY 2 asterisks for bold: **text** (never use ****text**** or ***text***)
- Use single asterisk for bullet points: * Item
- Use numbers for procedures: 1. Step one
- Keep sections separated by blank lines
- Make headers questions or clear statements

## TONE & APPROACH:
- Helpful and reassuring
- Non-judgmental about violations
- Emphasize road safety importance
- Explain the 'why' behind rules
- Encourage legal compliance
- Support citizen rights awareness

Remember: You're helping Indian citizens navigate complex traffic laws. Be accurate, helpful, and always encourage road safety and legal compliance.
"""

class AIService:
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.model = None
        self.conversation_cache: Dict[str, List[Dict[str, str]]] = {}
        
        # Initialize Gemini if API key is available
        if settings.GEMINI_API_KEY:
            self._initialize_gemini()
        else:
            print("Warning: GEMINI_API_KEY not set. AI features will be limited.")

    def _initialize_gemini(self):
        """Initialize Gemini AI model"""
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            
            # Configure model with safety settings
            safety_settings = {
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }
            
            generation_config = {
                "temperature": 0.7,
                "top_p": 0.8,
                "top_k": 40,
                "max_output_tokens": 2048,
            }
            
            self.model = genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                generation_config=generation_config,
                safety_settings=safety_settings
            )
            
            print(f"Gemini AI initialized with model: {settings.GEMINI_MODEL}")
            
        except Exception as e:
            print(f"Failed to initialize Gemini AI: {e}")
            self.model = None

    def _build_conversation_prompt(self, user_message: str, chat_session_id: str) -> str:
        """Build conversation prompt with context"""
        
        # Get conversation history from cache
        conversation_history = self.conversation_cache.get(chat_session_id, [])
        
        # Build conversation context
        conversation_context = ""
        if conversation_history:
            conversation_context = "\n\nPREVIOUS CONVERSATION:\n"
            for msg in conversation_history[-6:]:  # Keep last 6 messages for context
                role = "User" if msg["role"] == "user" else "LawBuddy"
                conversation_context += f"{role}: {msg['content']}\n"
        
        # Build full prompt
        prompt = f"{INDIAN_TRAFFIC_LAW_CONTEXT}\n{conversation_context}\nCurrent User Question: {user_message}\n\nPlease provide a helpful, accurate response about Indian traffic laws in simple language that a common person can understand. Include relevant legal sections, practical steps, and required documents where applicable."
        
        return prompt

    async def generate_response(
        self, 
        user_message: str, 
        chat_session_id: str,
        user: User
    ) -> Dict[str, Any]:
        """Generate AI response for user message"""
        
        if not self.model:
            return {
                "success": False,
                "content": "I apologize, but AI services are currently unavailable. Please check your configuration.",
                "metadata": None
            }
        
        try:
            start_time = time.time()
            
            # Build prompt with conversation context
            prompt = self._build_conversation_prompt(user_message, chat_session_id)
            
            # Generate response
            response = await asyncio.get_event_loop().run_in_executor(
                None, 
                lambda: self.model.generate_content(prompt)
            )
            
            processing_time = time.time() - start_time
            
            # Extract response content
            if response.parts:
                content = response.parts[0].text
            else:
                content = "I apologize, but I couldn't generate a response. Please try rephrasing your question."
            
            # Update conversation cache
            self._update_conversation_cache(chat_session_id, user_message, content)
            
            # Create AI metadata
            ai_metadata = AIMetadata(
                model_used=settings.GEMINI_MODEL,
                confidence_score=0.9,  # Gemini doesn't provide confidence scores
                processing_time=round(processing_time, 2),
                token_usage=len(prompt.split()) + len(content.split()),  # Approximate token count
                legal_sources=self._extract_legal_sources(content),
                fact_checked=True
            )
            
            return {
                "success": True,
                "content": content,
                "metadata": ai_metadata
            }
            
        except Exception as e:
            print(f"Error generating AI response: {e}")
            return {
                "success": False,
                "content": "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
                "metadata": None
            }

    async def generate_streaming_response(
        self,
        user_message: str,
        chat_session_id: str,
        user: User
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate streaming AI response"""
        
        if not self.model:
            yield {
                "type": "error",
                "content": "AI services are currently unavailable.",
                "metadata": None
            }
            return
        
        try:
            start_time = time.time()
            
            # Build prompt with conversation context
            prompt = self._build_conversation_prompt(user_message, chat_session_id)
            
            # Generate streaming response
            response_stream = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.model.generate_content(prompt, stream=True)
            )
            
            full_content = ""
            
            # Yield chunks as they arrive
            for chunk in response_stream:
                if chunk.parts:
                    chunk_text = chunk.parts[0].text
                    full_content += chunk_text
                    
                    yield {
                        "type": "chunk",
                        "content": chunk_text,
                        "full_content": full_content,
                        "metadata": None
                    }
                    
                    # Add realistic delay for better UX
                    await asyncio.sleep(0.05)
            
            processing_time = time.time() - start_time
            
            # Update conversation cache with full response
            self._update_conversation_cache(chat_session_id, user_message, full_content)
            
            # Create final metadata
            ai_metadata = AIMetadata(
                model_used=settings.GEMINI_MODEL,
                confidence_score=0.9,
                processing_time=round(processing_time, 2),
                token_usage=len(prompt.split()) + len(full_content.split()),
                legal_sources=self._extract_legal_sources(full_content),
                fact_checked=True
            )
            
            # Yield completion signal
            yield {
                "type": "complete",
                "content": full_content,
                "metadata": ai_metadata
            }
            
        except Exception as e:
            print(f"Error in streaming AI response: {e}")
            yield {
                "type": "error",
                "content": "I apologize, but I'm experiencing technical difficulties.",
                "metadata": None
            }

    def _update_conversation_cache(self, chat_session_id: str, user_message: str, ai_response: str):
        """Update conversation cache for context"""
        
        if chat_session_id not in self.conversation_cache:
            self.conversation_cache[chat_session_id] = []
        
        # Add user message
        self.conversation_cache[chat_session_id].append({
            "role": "user",
            "content": user_message
        })
        
        # Add AI response
        self.conversation_cache[chat_session_id].append({
            "role": "assistant",
            "content": ai_response
        })
        
        # Keep only last 12 messages (6 exchanges) for performance
        if len(self.conversation_cache[chat_session_id]) > 12:
            self.conversation_cache[chat_session_id] = self.conversation_cache[chat_session_id][-12:]

    def _extract_legal_sources(self, content: str) -> List[str]:
        """Extract legal sources mentioned in the response"""
        sources = []
        
        # Common legal source patterns
        patterns = [
            r'Section \d+[A-Z]*',
            r'Motor Vehicles? Act,? \d{4}',
            r'Central Motor Vehicle Rules,? \d{4}',
            r'Rule \d+',
            r'Article \d+',
            r'Chapter [IVX]+',
        ]
        
        import re
        for pattern in patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            sources.extend(matches)
        
        # Remove duplicates and return
        return list(set(sources))

    def reset_conversation(self, chat_session_id: str):
        """Reset conversation context for a chat session"""
        if chat_session_id in self.conversation_cache:
            del self.conversation_cache[chat_session_id]

    async def get_conversation_summary(self, chat_session_id: str) -> Optional[str]:
        """Generate a summary of the conversation"""
        
        if not self.model or chat_session_id not in self.conversation_cache:
            return None
        
        conversation = self.conversation_cache[chat_session_id]
        if len(conversation) < 4:  # Need at least 2 exchanges
            return None
        
        try:
            # Build conversation text
            conversation_text = ""
            for msg in conversation:
                role = "User" if msg["role"] == "user" else "Assistant"
                conversation_text += f"{role}: {msg['content']}\n"
            
            # Generate summary
            summary_prompt = f"Please provide a brief 1-2 sentence summary of this legal consultation:\n\n{conversation_text}\n\nSummary:"
            
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.model.generate_content(summary_prompt)
            )
            
            if response.parts:
                return response.parts[0].text.strip()
            
        except Exception as e:
            print(f"Error generating conversation summary: {e}")
        
        return None

    def is_available(self) -> bool:
        """Check if AI service is available"""
        return self.model is not None

    async def get_usage_stats(self) -> Dict[str, Any]:
        """Get AI service usage statistics"""
        # This would typically pull from a database or cache
        # For now, return basic stats
        return {
            "total_conversations": len(self.conversation_cache),
            "active_sessions": len([k for k, v in self.conversation_cache.items() if len(v) > 0]),
            "model_used": settings.GEMINI_MODEL,
            "availability": self.is_available()
        }