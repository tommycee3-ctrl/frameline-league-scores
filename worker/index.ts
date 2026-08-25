/** Cloudflare Worker entry point for the vinext-starter template. */
import {
  handleImageOptimization,
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
} from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  defaultSiteContent,
  initialAdminEmail,
  type SiteContent,
} from "../app/site-content";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: {
          format: string;
          quality: number;
        }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/site-content") {
      return handleSiteContent(request, env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(
        request,
        {
          fetchAsset: (path) =>
            env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body)
              .transform(width > 0 ? { width } : {})
              .output({ format, quality });
            return result.response();
          },
        },
        allowedWidths,
      );
    }

    return handler.fetch(request, env, ctx);
  },
};

const CONTENT_KEY = "public-site";
const allowedOrigin = (origin: string | null) =>
  origin === "https://tommycee3-ctrl.github.io" ||
  Boolean(origin?.endsWith(".tommycee3.chatgpt.site"));

function jsonResponse(
  body: unknown,
  status = 200,
  origin: string | null = null,
) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  if (allowedOrigin(origin)) {
    headers.set("access-control-allow-origin", origin!);
    headers.set("access-control-allow-credentials", "true");
    headers.set("vary", "Origin");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function ensureContentTable(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS site_content (
    content_key TEXT PRIMARY KEY,
    content_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL
  )`,
    )
    .run();
}

async function readContent(db: D1Database): Promise<SiteContent> {
  await ensureContentTable(db);
  const row = await db
    .prepare("SELECT content_json FROM site_content WHERE content_key = ?")
    .bind(CONTENT_KEY)
    .first<{ content_json: string }>();
  if (!row?.content_json) return defaultSiteContent;
  try {
    return JSON.parse(row.content_json) as SiteContent;
  } catch {
    return defaultSiteContent;
  }
}

function normalizeContent(value: SiteContent): SiteContent {
  const staffEmails = Array.from(
    new Set(
      [initialAdminEmail, ...(value.staffEmails ?? [])]
        .map((email) => String(email).trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  return {
    banner: {
      active: Boolean(value.banner?.active),
      message: String(value.banner?.message ?? "").slice(0, 120),
      detail: String(value.banner?.detail ?? "").slice(0, 240),
      linkLabel: String(value.banner?.linkLabel ?? "").slice(0, 40),
      linkHref: String(value.banner?.linkHref ?? "").startsWith("/")
        ? String(value.banner.linkHref)
        : "/",
      tone: ["coral", "yellow", "navy"].includes(value.banner?.tone)
        ? value.banner.tone
        : "coral",
    },
    events: (value.events ?? [])
      .slice(0, 50)
      .map((item) => ({
        id: String(item.id),
        date: String(item.date),
        time: String(item.time).slice(0, 80),
        title: String(item.title).slice(0, 120),
        description: String(item.description).slice(0, 600),
        featured: Boolean(item.featured),
      })),
    rates: (value.rates ?? [])
      .slice(0, 30)
      .map((item) => ({
        id: String(item.id),
        name: String(item.name).slice(0, 100),
        price: String(item.price).slice(0, 30),
        detail: String(item.detail).slice(0, 180),
      })),
    hours: (value.hours ?? [])
      .slice(0, 20)
      .map((item) => ({
        id: String(item.id),
        days: String(item.days).slice(0, 80),
        hours: String(item.hours).slice(0, 80),
      })),
    staffEmails,
  };
}

async function handleSiteContent(
  request: Request,
  env: Env,
): Promise<Response> {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    const response = jsonResponse({}, 204, origin);
    response.headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
    response.headers.set("access-control-allow-headers", "content-type");
    return response;
  }
  const content = await readContent(env.DB);
  const viewer = (request.headers.get("oai-authenticated-user-email") ?? "")
    .trim()
    .toLowerCase();
  const authorized = Boolean(
    viewer &&
    (viewer === initialAdminEmail ||
      content.staffEmails.map((email) => email.toLowerCase()).includes(viewer)),
  );
  if (request.method === "GET") {
    const adminRequest = new URL(request.url).searchParams.get("admin") === "1";
    return jsonResponse(
      adminRequest ? { content, viewer, authorized } : { content },
      adminRequest && !authorized ? 401 : 200,
      origin,
    );
  }
  if (request.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  if (!authorized)
    return jsonResponse(
      { error: "This email is not authorized to edit the site." },
      403,
      origin,
    );
  if (origin && !origin.endsWith(".tommycee3.chatgpt.site"))
    return jsonResponse(
      { error: "Editing is only available from the secure staff site." },
      403,
      origin,
    );
  let submitted: SiteContent;
  try {
    submitted = (await request.json()) as SiteContent;
  } catch {
    return jsonResponse(
      { error: "The submitted changes were not valid." },
      400,
      origin,
    );
  }
  const normalized = normalizeContent(submitted);
  await env.DB.prepare(
    `INSERT INTO site_content (content_key, content_json, updated_at, updated_by)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(content_key) DO UPDATE SET content_json = excluded.content_json, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
  )
    .bind(
      CONTENT_KEY,
      JSON.stringify(normalized),
      new Date().toISOString(),
      viewer,
    )
    .run();
  return jsonResponse({ content: normalized, updatedBy: viewer }, 200, origin);
}

export default worker;
