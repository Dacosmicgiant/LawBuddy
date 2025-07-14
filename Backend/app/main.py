from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import http_exception_handler
import time
import logging
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.v1 import auth, chats, websocket

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Lifespan events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting LawBuddy API...")
    await connect_to_mongo()
    logger.info("LawBuddy API started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down LawBuddy API...")
    await close_mongo_connection()
    logger.info("LawBuddy API shutdown complete")

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    LawBuddy API - Your AI-powered legal assistant for Indian traffic laws
    
    ## Features
    
    * **Authentication**: User registration, login, and JWT token management
    * **Chat Management**: Create and manage legal consultation sessions
    * **AI Integration**: Real-time legal advice powered by Gemini AI
    * **WebSocket Support**: Real-time streaming responses and chat functionality
    * **Search**: Search across chat history and legal consultations
    
    ## Legal Expertise
    
    LawBuddy specializes in:
    - Motor Vehicles Act, 1988 and amendments
    - Traffic violations and penalties
    - Driving license procedures
    - Vehicle registration processes
    - Insurance and accident claims
    - Court procedures for traffic matters
    
    **Disclaimer**: LawBuddy provides general legal information. For specific legal advice, consult a qualified lawyer.
    """,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None
)

# Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url}")
    
    response = await call_next(request)
    
    # Log response
    process_time = time.time() - start_time
    logger.info(
        f"Response: {response.status_code} - "
        f"{request.method} {request.url} - "
        f"Time: {process_time:.4f}s"
    )
    
    return response

# Custom exception handlers
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    """Custom HTTP exception handler with detailed error responses"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url),
            "method": request.method,
            "timestamp": time.time()
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal server error occurred",
            "status_code": 500,
            "path": str(request.url),
            "method": request.method,
            "timestamp": time.time()
        }
    )

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint - API health check
    """
    return {
        "message": "Welcome to LawBuddy API",
        "version": settings.APP_VERSION,
        "status": "operational",
        "documentation": "/docs",
        "websocket": "/ws",
        "timestamp": time.time()
    }

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for monitoring and load balancers
    """
    from app.api.deps import check_database_health, check_ai_service_health, get_db, get_ai_service
    
    try:
        # Check database connection
        db = await get_db()
        db_healthy = await check_database_health(db)
        
        # Check AI service
        ai_service = await get_ai_service(db)
        ai_healthy = await check_ai_service_health(ai_service)
        
        # Overall health status
        is_healthy = db_healthy and ai_healthy
        
        health_data = {
            "status": "healthy" if is_healthy else "unhealthy",
            "timestamp": time.time(),
            "version": settings.APP_VERSION,
            "services": {
                "database": "healthy" if db_healthy else "unhealthy",
                "ai_service": "healthy" if ai_healthy else "unhealthy"
            },
            "environment": "development" if settings.DEBUG else "production"
        }
        
        status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        
        return JSONResponse(
            status_code=status_code,
            content=health_data
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "error": "Health check failed",
                "timestamp": time.time()
            }
        )

# API version info
@app.get("/version", tags=["Root"])
async def get_version():
    """
    Get API version information
    """
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "api_version": "v1",
        "features": {
            "authentication": True,
            "chat_management": True,
            "ai_integration": settings.GEMINI_API_KEY is not None,
            "websocket_support": True,
            "search": True,
            "rate_limiting": True
        },
        "legal_domains": [
            "Motor Vehicles Act, 1988",
            "Traffic Violations",
            "Driving Licenses",
            "Vehicle Registration",
            "Insurance Claims",
            "Court Procedures"
        ]
    }

# Include API routers
app.include_router(
    auth.router,
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

app.include_router(
    chats.router,
    prefix="/api/v1/chats",
    tags=["Chat Management"]
)

app.include_router(
    websocket.router,
    prefix="/ws",
    tags=["WebSocket"]
)

# Additional endpoints

@app.get("/api/v1/legal-info", tags=["Legal Information"])
async def get_legal_info():
    """
    Get general legal information and disclaimers
    """
    return {
        "legal_framework": {
            "primary_act": "Motor Vehicles Act, 1988",
            "amendments": "Motor Vehicles (Amendment) Act, 2019",
            "rules": "Central Motor Vehicle Rules, 1989",
            "jurisdiction": "India - All States and Union Territories"
        },
        "covered_areas": [
            "Traffic violations and penalties",
            "Driving license procedures",
            "Vehicle registration processes",
            "Insurance requirements",
            "Accident procedures",
            "Court proceedings for traffic matters",
            "Rights and obligations of drivers",
            "Commercial vehicle regulations"
        ],
        "penalty_ranges": {
            "general_offenses": "₹500 - ₹1,000",
            "driving_without_license": "₹5,000",
            "drunk_driving": "₹10,000 - ₹15,000",
            "overspeeding": "₹1,000 - ₹2,000",
            "helmet_violation": "₹1,000 + license suspension",
            "insurance_violation": "₹2,000 - ₹4,000"
        },
        "disclaimer": {
            "general": "LawBuddy provides general legal information and educational content only.",
            "not_legal_advice": "Information provided should not be considered as professional legal advice.",
            "consultation_required": "For specific legal matters requiring representation, please consult with a qualified attorney licensed in your jurisdiction.",
            "accuracy": "While we strive for accuracy, laws and regulations may change. Always verify current legal requirements.",
            "limitation": "LawBuddy is not liable for any decisions made based on the information provided."
        }
    }

@app.get("/api/v1/stats", tags=["Statistics"])
async def get_api_stats():
    """
    Get API usage statistics (public, non-sensitive data)
    """
    try:
        from app.websocket.manager import connection_manager
        
        ws_stats = connection_manager.get_stats()
        
        return {
            "api_status": "operational",
            "websocket": {
                "active_connections": ws_stats["total_connections"],
                "active_users": ws_stats["active_users"],
                "active_chat_rooms": ws_stats["active_chat_rooms"]
            },
            "features": {
                "ai_service": settings.GEMINI_API_KEY is not None,
                "real_time_chat": True,
                "search": True,
                "analytics": True
            },
            "legal_coverage": {
                "total_legal_topics": 8,
                "states_covered": 28,
                "union_territories_covered": 8,
                "primary_language": "English",
                "regional_support": ["Hindi", "Regional variations"]
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Unable to fetch statistics",
                "timestamp": time.time()
            }
        )

# Development-only endpoints
if settings.DEBUG:
    @app.get("/api/v1/debug/reset-db", tags=["Debug"])
    async def reset_database():
        """
        Reset database (DEBUG ONLY - removes all data)
        """
        try:
            from app.core.database import get_database
            
            db = await get_database()
            
            # Drop all collections
            collections = await db.list_collection_names()
            for collection_name in collections:
                await db[collection_name].drop()
            
            # Recreate indexes
            from app.core.database import create_indexes
            await create_indexes()
            
            return {
                "message": "Database reset successfully",
                "collections_dropped": collections,
                "timestamp": time.time()
            }
            
        except Exception as e:
            logger.error(f"Error resetting database: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reset database"
            )

# Run the application
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )