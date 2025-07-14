from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING, DESCENDING, TEXT
from app.core.config import settings
import logging
import asyncio

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    database: AsyncIOMotorDatabase = None

# Global database instance
db = Database()

async def connect_to_mongo():
    """Create database connection"""
    try:
        # MongoDB Atlas specific configuration
        connection_params = {
            "maxPoolSize": 10,
            "minPoolSize": 2,
            "serverSelectionTimeoutMS": 10000,  # Increased for Atlas
            "connectTimeoutMS": 10000,
            "socketTimeoutMS": 20000,
        }
        
        # Add retryWrites for Atlas if not already in URL
        if "mongodb+srv" in settings.MONGODB_URL:
            logger.info("Connecting to MongoDB Atlas...")
            # Atlas connections are typically more reliable but may take longer
            connection_params["serverSelectionTimeoutMS"] = 15000
        else:
            logger.info("Connecting to MongoDB...")
        
        db.client = AsyncIOMotorClient(settings.MONGODB_URL, **connection_params)
        db.database = db.client[settings.DATABASE_NAME]
        
        # Test connection with retry
        max_retries = 3
        for attempt in range(max_retries):
            try:
                await db.client.admin.command('ping')
                logger.info(f"✅ Connected to MongoDB: {settings.DATABASE_NAME}")
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                logger.warning(f"Connection attempt {attempt + 1} failed, retrying...")
                await asyncio.sleep(2)
        
        # Create indexes
        await create_indexes()
        
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        
        # For Atlas, provide more specific error guidance
        if "mongodb+srv" in settings.MONGODB_URL:
            logger.error("MongoDB Atlas connection failed. Check:")
            logger.error("1. Network connectivity")
            logger.error("2. Atlas cluster is running")
            logger.error("3. IP address is whitelisted")
            logger.error("4. Username/password are correct")
            logger.error("5. Database access permissions")
        
        raise

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        logger.info("Disconnected from MongoDB")

async def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    return db.database

async def create_indexes():
    """Create database indexes for optimal performance"""
    try:
        database = db.database
        
        # Users collection indexes
        users_indexes = [
            IndexModel([("email", ASCENDING)], unique=True),
            IndexModel([("created_at", DESCENDING)]),
            IndexModel([("usage_stats.last_active", DESCENDING)]),
            IndexModel([("is_active", ASCENDING)])
        ]
        await database.users.create_indexes(users_indexes)
        
        # Chat sessions collection indexes
        chat_sessions_indexes = [
            IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("user_id", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("metadata.legal_categories", ASCENDING)]),
            IndexModel([("tags", ASCENDING)]),
            IndexModel([("updated_at", DESCENDING)])
        ]
        await database.chat_sessions.create_indexes(chat_sessions_indexes)
        
        # Messages collection indexes
        messages_indexes = [
            IndexModel([("chat_session_id", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("user_id", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("role", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("content", TEXT), ("ai_metadata.legal_sources", TEXT)])
        ]
        await database.messages.create_indexes(messages_indexes)
        
        logger.info("Database indexes created successfully")
        
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")
        raise

# Database dependency for FastAPI
async def get_db():
    """FastAPI dependency to get database"""
    return await get_database()