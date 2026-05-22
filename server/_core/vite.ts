import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*path", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath, {
    index: false, // Don't auto-serve index.html — we handle it below with nonce injection
  }));

  // Serve index.html with CSP nonce injection for all non-static routes
  app.use("*path", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    const nonce = (res as any).cspNonce || "";
    try {
      let html = fs.readFileSync(indexPath, "utf-8");
      // Inject nonce into all <script> tags
      html = html.replace(/<script/g, `<script nonce="${nonce}"`);
      // Inject nonce into all <style> and <link rel="stylesheet"> tags
      html = html.replace(/<style/g, `<style nonce="${nonce}"`);
      html = html.replace(/<link([^>]*rel="stylesheet")/g, `<link nonce="${nonce}"$1`);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      res.sendFile(indexPath);
    }
  });
}
