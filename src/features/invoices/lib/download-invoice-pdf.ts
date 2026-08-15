import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    ),
  );
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }
}

/**
 * Renders an HTML element (typically the preview-mode invoice document)
 * to a multi-page A4 PDF and triggers a browser download.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
) {
  await waitForImages(element);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: "#ffffff",
    onclone: (doc, cloned) => {
      cloned.querySelectorAll(".no-print").forEach((node) => {
        (node as HTMLElement).style.display = "none";
      });
      // Ensure links look like plain text in the PDF
      cloned.querySelectorAll("a").forEach((anchor) => {
        const el = anchor as HTMLElement;
        el.style.color = "inherit";
        el.style.textDecoration = "none";
      });
      void doc;
    },
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 1) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const safeName = filename.replace(/[\\/:*?"<>|]+/g, "-").trim() || "factuur";
  pdf.save(safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`);
}

export function invoicePdfFilename(invoiceNumber: string) {
  const safe = invoiceNumber.replace(/[\\/:*?"<>|\s]+/g, "-").trim();
  return `Factuur-${safe || "concept"}.pdf`;
}
