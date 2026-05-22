# Binary Upload And Download

Forge supports common file transfer shapes without turning runtime policy into generated code.

## Multipart Upload

OpenAPI shape:

```yaml
requestBody:
  required: true
  content:
    multipart/form-data:
      schema:
        type: object
        required: [file]
        properties:
          file:
            type: string
            format: binary
```

Consumer call:

```ts
const body = new FormData()
body.set('file', file)

await documentsClient.uploadDocument(body)
```

## Binary Download

OpenAPI shape:

```yaml
responses:
  '200':
    description: File
    content:
      application/octet-stream:
        schema:
          type: string
          format: binary
```

Consumer call:

```ts
const blob = await documentsClient.downloadDocument('document-1')
```

Use application code for filenames, browser download behavior, virus scan policy and storage lifecycle.

## Text Export

Text responses are supported as explicit response shapes:

```yaml
responses:
  '200':
    description: CSV export
    content:
      text/csv:
        schema:
          type: string
```

```ts
const csv = await reportsClient.exportUsers()
```

## Review Checklist

- Binary endpoints should include a schema.
- Upload operations should document accepted content type.
- Download operations should document status codes and error response bodies.
- Retry policy for uploads should be application-owned.
- Large download cancellation should use `AbortController`.
