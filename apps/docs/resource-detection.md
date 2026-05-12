# Resource Detection

Resource detection groups REST-like endpoints into CRUD candidates.

```txt
GET /api/v1/users
POST /api/v1/users
GET /api/v1/users/{id}
PATCH /api/v1/users/{id}
DELETE /api/v1/users/{id}
```

This becomes:

```txt
Resource: users
Entity: User
CRUD candidate: true
```

Partial resources are still detected and list missing operations.
