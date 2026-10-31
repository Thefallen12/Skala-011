import { existsSync } from "node:fs";
import { join } from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

function localChromePath(): string | null {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform !== "win32") return null;

  const candidates = [
    join(
      process.env.PROGRAMFILES ?? "C:\\Program Files",
      "Google",
      "Chrome",
      "Application",
      "chrome.exe",
    ),
    join(
      process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)",
      "Google",
      "Chrome",
      "Application",
      "chrome.exe",
    ),
    join(
      process.env.LOCALAPPDATA ?? "",
      "Google",
      "Chrome",
      "Application",
      "chrome.exe",
    ),
    join(
      process.env.PROGRAMFILES ?? "C:\\Program Files",
      "Microsoft",
      "Edge",
      "Application",
      "msedge.exe",
    ),
  ];
  return candidates.find(existsSync) ?? null;
}

export async function renderPdf(html: string): Promise<ArrayBuffer> {
  const localExecutable = localChromePath();
  if (process.platform === "win32" && !localExecutable) {
    throw new Error(
      "Browser PDF lokal tidak ditemukan. Set CHROME_PATH ke Chrome atau Edge yang terpasang.",
    );
  }

  const browser = localExecutable
    ? await puppeteer.launch({
        executablePath: localExecutable,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true,
      })
    : await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const renderedPdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });
    const pdfBody = new ArrayBuffer(renderedPdf.byteLength);
    new Uint8Array(pdfBody).set(renderedPdf);
    return pdfBody;
  } finally {
    await browser.close().catch((error: unknown) => {
      console.error("PDF browser shutdown failed:", error);
    });
  }
}
