# API Specification

## Overview

This document outlines the API endpoints and their interactions for the CUT application. The API is designed to be RESTful but focused on specific interactions rather than full CRUD operations.

## Base URL

```
http://localhost:4000/api
```

## Authentication

All authenticated endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Tournaments

GET

- /tournament/active
- /tournament/<id>

### Contests

GET

- /contest/active
- /contest/<id>

POST

- /contest

PUT

- /contest

DELETE

- /contest

### User Groups

[User group endpoints will be documented here]

### Lineups

GET

- /lineup

PUT

- /lineup

### Authentication

[Authentication endpoints will be documented here]

## Response Format

All responses follow this format:

```json
{
  "data": {
    // Response data here
  },
  "error": {
    "message": "Error message if applicable",
    "status": 400 // HTTP status code if applicable
  }
}
```

## Error Codes

- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Rate Limiting

[Rate limiting details will be added here]

## Versioning

[API versioning strategy will be documented here]
