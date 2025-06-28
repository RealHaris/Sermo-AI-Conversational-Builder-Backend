# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js/Express backend for a conversational AI builder with telecom SIM inventory management capabilities. The application manages SIM inventories, bundles, sales orders, and conversational AI assistants through Vapi integration.

**Technology Stack**: Node.js, Express.js, MySQL, Sequelize ORM, JWT authentication, Redis caching, Vapi SDK for AI assistants

## Development Commands

### Core Development
- `npm run dev` - Start development server with nodemon (auto-reload)
- `npm start` - Start production server
- `npm test` - Run Mocha tests with watch mode

### Database Operations
- `npm run db:setup` - Complete database setup (check tables, create migrations, migrate)
- `npm run db:makemigrations` - Generate migrations from model changes (add `-- --name description`)
- `npm run db:makemigrations:preview` - Preview migration changes before applying
- `npm run db:migrate` - Apply pending migrations
- `npm run db:migrate:undo` - Rollback last migration
- `npm run db:seed:all` - Run all seeders
- `npm run db:check-tables` - Verify table existence against models

## Architecture Overview

**Pattern**: Layered architecture with strict separation of concerns:
- **Controllers** (`src/controllers/`) - HTTP request/response handling
- **Services** (`src/service/`) - Business logic implementation  
- **DAOs** (`src/dao/`) - Data access layer extending SuperDao base class
- **Models** (`src/models/`) - Sequelize database models
- **Validators** (`src/validator/`) - Joi request validation schemas
- **Routes** (`src/route/`) - API endpoint definitions

**Key Design Patterns**:
- All DAOs extend SuperDao for consistent CRUD operations
- Services inject DAOs via constructor dependency injection
- All models implement soft delete with `is_deleted` flag
- Regional/city-level data access control enforced at database query level

## Database Schema

**Core Entities**:
- **Users** with role-based permissions and regional data access
- **SIM Inventory** for phone number/SIM management
- **Bundles** for telecom package offerings (pre-paid/post-paid)
- **Sales Orders** with comprehensive audit trail logging
- **Vapi Assistants** for conversational AI integration
- **Cities/Regions** for geographic data access control

**Migration Workflow**:
1. Modify Sequelize models in `src/models/`
2. Run `npm run db:makemigrations -- --name "description"`
3. Preview with `npm run db:makemigrations:preview`
4. Apply with `npm run db:migrate`

## Authentication & Security

- **JWT-based** authentication with Passport.js
- **Role-based access control** (RBAC) with fine-grained permissions
- **Regional/city-level data filtering** enforced at database query level
- **Soft delete pattern** - no records are permanently deleted
- **CNIC encryption** for sensitive data protection
- All database operations use Sequelize ORM to prevent SQL injection

## Performance Optimizations

- **Database-level filtering**: All access control happens in SQL queries, not JavaScript
- **Optimized JOINs**: City/region filtering uses efficient SQL operations
- **Index-friendly queries**: All major filters are designed to use database indexes
- **Pagination with filtering**: Combined for efficient large dataset handling

## Code Style & Standards

- **ESLint**: Airbnb configuration with Prettier formatting
- **Prettier settings**: 4-space tabs, 100 char line width, single quotes, trailing commas
- **Required patterns**: All arrow functions use block syntax, consistent return statements
- **Validation**: All API inputs validated with Joi schemas
- **Error handling**: Centralized error middleware with proper HTTP status codes

## Vapi Integration

The system integrates with Vapi (Voice AI Platform) for conversational AI capabilities:
- VapiAssistant model for AI assistant management
- Socket.io integration for real-time communication
- Cloudinary service for storing call recordings and media

## Environment Requirements

Required environment variables:
- Database credentials (MySQL)
- JWT secrets and token expiration settings  
- Redis configuration
- Vapi API credentials
- Cloudinary credentials for file storage
- CNIC encryption key for sensitive data

## Testing Approach

- **Framework**: Mocha with Chai assertions and Sinon for mocking
- **Test command**: `npm test` (runs with watch mode)
- **Test location**: `specs/**/*.spec.js`

## Common Development Patterns

1. **Adding new endpoints**: Create controller → service → DAO → validator → route
2. **Database changes**: Modify model → generate migration → apply migration
3. **New features**: Always implement data access control if dealing with user data
4. **Performance**: Use database-level filtering instead of JavaScript logic
5. **Security**: Validate all inputs with Joi, use soft deletes, respect user access levels