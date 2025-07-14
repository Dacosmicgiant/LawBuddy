# LawBuddy Backend API

**Your AI-Powered Legal Assistant for Indian Traffic Laws**

LawBuddy is a comprehensive FastAPI-based backend service that provides AI-powered legal assistance specializing in Indian traffic laws and motor vehicle regulations. Built with Python, FastAPI, MongoDB, and integrated with Google's Gemini AI.

## 🚀 Features

### Core Functionality

- **User Authentication**: Secure JWT-based authentication with registration, login, and token management
- **Chat Management**: Create, manage, and organize legal consultation sessions
- **AI Integration**: Real-time legal advice powered by Google Gemini AI
- **WebSocket Support**: Real-time streaming responses and chat functionality
- **Search**: Full-text search across chat history and legal consultations
- **Rate Limiting**: Intelligent rate limiting to prevent abuse
- **Analytics**: User and chat analytics for insights

### Legal Expertise

- Motor Vehicles Act, 1988 and 2019 amendments
- Traffic violations and penalties
- Driving license procedures
- Vehicle registration processes
- Insurance and accident claims
- Court procedures for traffic matters
- State-specific regulations

## 🛠 Technology Stack

- **Framework**: FastAPI 0.104.1
- **Database**: MongoDB with Motor (async driver)
- **AI**: Google Generative AI (Gemini)
- **Authentication**: JWT with passlib
- **WebSockets**: Native FastAPI WebSocket support
- **Validation**: Pydantic v2
- **Testing**: pytest with async support
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- Python 3.11+
- MongoDB 7.0+
- Google Gemini API Key
- Docker & Docker Compose (optional)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd lawbuddy-backend
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
# GEMINI_API_KEY=your-gemini-api-key-here
# MONGODB_URL=mongodb://localhost:27017
# SECRET_KEY=your-super-secret-key
```

### 3. Installation Options

#### Option A: Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

#### Option B: Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Start MongoDB (if not using Docker)
# mongod --dbpath /path/to/data

# Run the application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Verify Installation

```bash
# Check API health
curl http://localhost:8000/health

# View API documentation
# Open http://localhost:8000/docs in your browser
```

## 🔧 Configuration

### Environment Variables

| Variable          | Description               | Default                     | Required |
| ----------------- | ------------------------- | --------------------------- | -------- |
| `MONGODB_URL`     | MongoDB connection string | `mongodb://localhost:27017` | Yes      |
| `DATABASE_NAME`   | Database name             | `lawbuddy`                  | Yes      |
| `SECRET_KEY`      | JWT secret key            | -                           | Yes      |
| `GEMINI_API_KEY`  | Google Gemini API key     | -                           | Yes      |
| `DEBUG`           | Debug mode                | `false`                     | No       |
| `ALLOWED_ORIGINS` | CORS allowed origins      | `["*"]`                     | No       |

### Database Configuration

The application automatically creates the necessary MongoDB collections and indexes:

- `users` - User accounts and profiles
- `chat_sessions` - Chat session metadata
- `messages` - Individual chat messages

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint                | Description          |
| ------ | ----------------------- | -------------------- |
| POST   | `/api/v1/auth/register` | Register new user    |
| POST   | `/api/v1/auth/login`    | User login           |
| POST   | `/api/v1/auth/refresh`  | Refresh access token |
| GET    | `/api/v1/auth/me`       | Get current user     |
| POST   | `/api/v1/auth/logout`   | User logout          |

### Chat Management Endpoints

| Method | Endpoint                           | Description         |
| ------ | ---------------------------------- | ------------------- |
| POST   | `/api/v1/chats/`                   | Create chat session |
| GET    | `/api/v1/chats/`                   | Get chat history    |
| GET    | `/api/v1/chats/{chat_id}`          | Get specific chat   |
| PUT    | `/api/v1/chats/{chat_id}`          | Update chat session |
| DELETE | `/api/v1/chats/{chat_id}`          | Delete chat session |
| POST   | `/api/v1/chats/{chat_id}/messages` | Send message        |
| GET    | `/api/v1/chats/{chat_id}/messages` | Get chat messages   |

### WebSocket Endpoints

| Endpoint                     | Description              |
| ---------------------------- | ------------------------ |
| `/ws/chat?token=<jwt_token>` | Real-time chat WebSocket |
| `/ws/test`                   | WebSocket test endpoint  |

### Example API Usage

#### Register User

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "full_name": "John Doe"
  }'
```

#### Login User

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

#### Create Chat Session

```bash
curl -X POST "http://localhost:8000/api/v1/chats/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "title": "Traffic Fine Question",
    "initial_message": "What is the penalty for speeding?"
  }'
```

## 🧪 Testing

### Run Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_auth.py -v
```

### Test Structure

```
tests/
├── conftest.py          # Test configuration and fixtures
├── test_auth.py         # Authentication tests
├── test_chat.py         # Chat management tests
├── test_websocket.py    # WebSocket tests
└── test_integration.py  # Integration tests
```

## 🔒 Security Features

- **JWT Authentication** with access and refresh tokens
- **Password Hashing** using bcrypt
- **Input Validation** with Pydantic
- **Rate Limiting** per user and endpoint
- **CORS Configuration** for frontend integration
- **SQL Injection Prevention** (MongoDB)
- **Request/Response Logging**

## 🌐 WebSocket Integration

The WebSocket API supports real-time features:

### Connection

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/chat?token=<jwt_token>");
```

### Message Types

- `join_chat` - Join a chat room
- `message` - Send a message (triggers AI response)
- `typing` - Send typing indicator
- `ping` - Keep connection alive

### Response Types

- `ai_response_chunk` - Streaming AI response
- `ai_response_complete` - AI response finished
- `typing_indicator` - User typing status
- `error` - Error occurred

## 📊 Monitoring & Analytics

### Health Checks

```bash
# API health
curl http://localhost:8000/health

# WebSocket stats
curl http://localhost:8000/ws/stats
```

### Logs

```bash
# Docker logs
docker-compose logs -f api

# Application logs include:
# - Request/response logging
# - Error tracking
# - Performance metrics
# - Security events
```

## 🚀 Deployment

### Production Deployment

1. **Environment Configuration**

```bash
# Use production environment file
cp .env.example .env.prod

# Update production settings
DEBUG=false
SECRET_KEY=your-production-secret-key
MONGODB_URL=mongodb://your-production-mongodb
```

2. **Docker Production**

```bash
# Build and start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

3. **Scaling**

```bash
# Scale API instances
docker-compose up -d --scale api=3
```

### Performance Considerations

- **Database Indexing**: Automatic index creation for optimal queries
- **Connection Pooling**: Configured MongoDB connection pool
- **Rate Limiting**: Prevents API abuse
- **Caching**: Redis integration ready for future caching needs
- **Load Balancing**: Nginx configuration included

## 🤝 Contributing

### Development Setup

```bash
# Fork the repository
# Clone your fork
git clone <your-fork-url>

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install development dependencies
pip install -r requirements.txt
pip install pytest pytest-asyncio pytest-cov black flake8

# Run development server
uvicorn app.main:app --reload
```

### Code Style

```bash
# Format code with Black
black app/ tests/

# Lint with flake8
flake8 app/ tests/

# Run tests before committing
pytest --cov=app tests/
```

### Commit Guidelines

- Use conventional commit messages
- Include tests for new features
- Update documentation as needed
- Ensure all tests pass

## 🔍 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Issues

```bash
# Check MongoDB status
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb

# Reset MongoDB data
docker-compose down -v
docker-compose up -d
```

#### 2. Gemini AI Not Working

```bash
# Verify API key is set
echo $GEMINI_API_KEY

# Check API key in container
docker-compose exec api env | grep GEMINI

# Test AI service health
curl http://localhost:8000/health
```

#### 3. WebSocket Connection Issues

```bash
# Check WebSocket stats
curl http://localhost:8000/ws/stats

# Test WebSocket endpoint
# Use a WebSocket client to connect to ws://localhost:8000/ws/test
```

#### 4. Performance Issues

```bash
# Check API response times
curl -w "@curl-format.txt" http://localhost:8000/health

# Monitor container resources
docker stats lawbuddy-api

# Check database performance
docker-compose exec mongodb mongosh --eval "db.runCommand({serverStatus: 1})"
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=true

# Run with verbose logging
uvicorn app.main:app --reload --log-level debug
```

## 📈 Performance Metrics

### Expected Performance

- **API Response Time**: < 100ms for basic endpoints
- **AI Response Time**: 1-3 seconds for typical queries
- **WebSocket Latency**: < 50ms for real-time features
- **Concurrent Users**: 100+ with default configuration
- **Database Queries**: < 50ms for indexed queries

### Optimization Tips

1. **Database**: Ensure proper indexing for your query patterns
2. **AI Service**: Implement response caching for common queries
3. **WebSocket**: Use connection pooling for high concurrency
4. **Caching**: Add Redis for session and response caching
5. **CDN**: Use CDN for static assets in production

## 🔐 Security Best Practices

### Authentication Security

- Use strong, unique SECRET_KEY in production
- Implement token rotation for long-lived sessions
- Add account lockout after failed login attempts
- Consider 2FA for admin accounts

### API Security

- Keep rate limiting enabled
- Validate all input data
- Use HTTPS in production
- Implement API versioning
- Monitor for suspicious activity

### Database Security

- Use MongoDB authentication
- Encrypt data at rest
- Regular security updates
- Backup strategies
- Network isolation

## 📚 Additional Resources

### Documentation

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Motor Documentation](https://motor.readthedocs.io/)
- [Google Gemini AI Documentation](https://ai.google.dev/docs)
- [Motor Vehicles Act, 1988](https://www.indiacode.nic.in/)

### Legal Resources

- [Central Motor Vehicle Rules](https://parivahan.gov.in/)
- [State Transport Department Websites](https://parivahan.gov.in/)
- [Traffic Police Official Websites](https://www.delhitrafficpolice.nic.in/)
- [Legal Aid Services](https://nalsa.gov.in/)

### Development Tools

- [MongoDB Compass](https://www.mongodb.com/products/compass) - Database GUI
- [Postman](https://www.postman.com/) - API testing
- [WebSocket King](https://websocketking.com/) - WebSocket testing
- [Docker Desktop](https://www.docker.com/products/docker-desktop) - Container management

## 📞 Support

### Getting Help

1. **Documentation**: Check this README and API docs at `/docs`
2. **Issues**: Create GitHub issues for bugs or feature requests
3. **Discussions**: Use GitHub Discussions for questions
4. **Email**: Contact support@lawbuddy.com for urgent issues

### Community

- Join our Discord server for real-time discussions
- Follow updates on Twitter @LawBuddyAI
- Subscribe to our newsletter for release announcements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for providing the AI capabilities
- **FastAPI** for the excellent async web framework
- **MongoDB** for the flexible document database
- **Indian Legal System** for the comprehensive traffic law framework
- **Open Source Community** for the amazing tools and libraries

## 🗺 Roadmap

### Phase 2 - Enhanced Features (Next Release)

- [ ] Advanced user analytics dashboard
- [ ] Chat export functionality (PDF, DOCX)
- [ ] Multi-language support (Hindi, regional languages)
- [ ] Voice message support
- [ ] Legal document analysis
- [ ] Integration with court case databases

### Phase 3 - Enterprise Features

- [ ] Multi-tenant architecture
- [ ] Advanced AI features (document OCR)
- [ ] Integration with legal databases
- [ ] Lawyer collaboration features
- [ ] Advanced reporting and analytics
- [ ] Custom legal domain training

### Phase 4 - Scale & Optimize

- [ ] Microservices architecture migration
- [ ] Machine learning for legal insights
- [ ] Real-time legal updates integration
- [ ] Mobile app backend support
- [ ] International legal framework support

## 📊 Project Statistics

- **Lines of Code**: ~3,000+ Python
- **API Endpoints**: 25+ REST endpoints
- **WebSocket Events**: 10+ event types
- **Test Coverage**: 85%+ target
- **Legal Topics**: 50+ covered areas
- **Response Time**: <100ms average
- **Supported Languages**: English (Hindi planned)

---

**Built with ❤️ for the Indian legal community**

For the latest updates and detailed API documentation, visit: `http://localhost:8000/docs`
