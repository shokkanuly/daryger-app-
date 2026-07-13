import { NextRequest, NextResponse } from "next/server";

const spec = {
  openapi: "3.0.0",
  info: {
    title: "Daryger API Documentation",
    version: "1.0.0",
    description: "API endpoints for service catalogs, partners, search, and document ingestion",
  },
  paths: {
    "/api/services": {
      get: {
        summary: "List catalog services",
        parameters: [
          { name: "category", in: "query", schema: { type: "string" }, description: "Filter by category (lab|consult|diagnostic|procedure)" }
        ],
        responses: { 200: { description: "Array of services" } }
      }
    },
    "/api/services/{id}/partners": {
      get: {
        summary: "Partners offering a service, with prices",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Service ID" }
        ],
        responses: { 200: { description: "Array of price records with clinic info" } }
      }
    },
    "/api/partners": {
      get: {
        summary: "List partners",
        parameters: [
          { name: "city", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["active", "inactive"] } }
        ],
        responses: { 200: { description: "Array of partner clinics" } }
      }
    },
    "/api/partners/{id}/services": {
      get: {
        summary: "Full price list for one partner",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: { 200: { description: "Array of price records with service info" } }
      }
    },
    "/api/search": {
      get: {
        summary: "Full-text search across services and partners",
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" } }
        ],
        responses: { 200: { description: "Object containing arrays of matching services and partners" } }
      }
    },
    "/api/unmatched": {
      get: {
        summary: "List items awaiting manual matching",
        responses: { 200: { description: "Array of pending MatchQueueItems" } }
      }
    },
    "/api/match": {
      post: {
        summary: "Manually resolve a match",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  matchQueueItemId: { type: "string" },
                  status: { type: "string", enum: ["APPROVED", "REJECTED"] },
                  serviceId: { type: "string" }
                },
                required: ["matchQueueItemId", "status"]
              }
            }
          }
        },
        responses: { 200: { description: "Success status" } }
      }
    },
    "/api/partners/upload": {
      post: {
        summary: "Upload partner price document (PDF, DOCX, XLSX, or ZIP)",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  clinicId: { type: "string" },
                  effectiveDate: { type: "string", format: "date" },
                  file: { type: "string", format: "binary" }
                },
                required: ["clinicId", "file"]
              }
            }
          }
        },
        responses: { 200: { description: "Uploaded document details and enqueued job status" } }
      }
    }
  }
};

export async function GET(req: NextRequest) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Daryger API Swagger Docs</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" charset="UTF-8"></script>
        <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
        <script>
          window.onload = () => {
            window.ui = SwaggerUIBundle({
              spec: ${JSON.stringify(spec)},
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
              ],
              layout: "BaseLayout"
            });
          };
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
