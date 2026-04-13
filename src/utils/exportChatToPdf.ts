/**
 * Export chat conversation to a PDF file with clickable visualization tabs.
 *
 * For assistant messages that have multiple visualization types (bar/pie/line/table),
 * the exporter:
 *   1. Programmatically switches the UI to each viz type and snapshots the DOM
 *   2. Places each captured variant on its own PDF page
 *   3. Adds a clickable "tab row" at the top of each viz page that uses jsPDF
 *      internal page links (`pdf.link`) — clicking a tab jumps to that variant's page.
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as echarts from 'echarts';
import type { Message } from '../components/ChatInterface.types';

interface ExportProgress {
  /** 0..1 fraction of work completed */
  ratio: number;
  /** Human-readable status for the current step */
  label: string;
}

interface ExportOptions {
  title: string;
  messages: Message[];
  messagesRoot?: HTMLElement | null;
  /** Called as the export advances so the UI can render a progress bar. */
  onProgress?: (p: ExportProgress) => void;
  /** Abort the export mid-run. Throws a DOMException('AbortError') to the caller. */
  signal?: AbortSignal;
}

/** Thrown when `signal` is aborted. Matches the Web platform convention. */
function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }
}

const PAGE = {
  width: 210,
  height: 297,
  marginX: 15,
  marginY: 18,
};
const CONTENT_WIDTH = PAGE.width - 2 * PAGE.marginX;
const BLUE = { r: 13, g: 71, b: 161 };       // #0d47a1
const BLUE_LIGHT = { r: 21, g: 101, b: 192 }; // #1565c0
const GREY_DARK = { r: 33, g: 37, b: 41 };
const GREY_MID = { r: 108, g: 117, b: 125 };
const GREY_LIGHT = { r: 233, g: 236, b: 239 };

const VIZ_LABELS: Record<string, string> = {
  table: 'Table',
  bar: 'Bar Chart',
  line: 'Line Chart',
  pie: 'Pie Chart',
  donut: 'Donut Chart',
  scatter: 'Scatter Plot',
};

function cleanText(s: string): string {
  return s
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * Synchronously disable animations on every ECharts instance inside `el`.
 * Caller is responsible for ensuring the chart is already idle — this does
 * NOT wait. lazyUpdate:false flushes the current frame as the final frame.
 */
function freezeEchartsForCapture(el: HTMLElement): void {
  const nodes = el.querySelectorAll<HTMLElement>('[_echarts_instance_]');
  nodes.forEach((node) => {
    const inst = echarts.getInstanceByDom(node);
    if (!inst || inst.isDisposed()) return;
    try {
      inst.setOption(
        { animation: false, animationDuration: 0, animationDurationUpdate: 0 },
        { lazyUpdate: false },
      );
    } catch {
      /* instance went away between query and use */
    }
  });
}

/**
 * Render an off-screen clone of an ECharts instance with animation disabled
 * from birth, snapshot it, and dispose. This guarantees the captured PNG is
 * the *final* frame — unlike snapshotting the live chart, which can catch
 * an in-flight animation because setting `animation: false` after the fact
 * does NOT cancel tweens that zrender has already queued.
 */
function cloneChartToDataUrl(
  liveInst: echarts.ECharts,
  sourceNode: HTMLElement,
): { dataUrl: string; widthPx: number; heightPx: number } | null {
  const rect = sourceNode.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  if (width === 0 || height === 0) return null;

  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-99999px;top:0;width:${width}px;height:${height}px;pointer-events:none;`;
  document.body.appendChild(host);

  let clone: echarts.ECharts | null = null;
  try {
    clone = echarts.init(host, undefined, { width, height });
    const opt = liveInst.getOption() as Record<string, unknown>;
    // Force animation off from the very first render so nothing is ever
    // tweened — the clone paints the final frame synchronously.
    clone.setOption(
      { ...opt, animation: false, animationDuration: 0, animationDurationUpdate: 0 },
      { notMerge: true, lazyUpdate: false },
    );
    const dataUrl = clone.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });
    return { dataUrl, widthPx: width * 2, heightPx: height * 2 };
  } catch {
    return null;
  } finally {
    try { clone?.dispose(); } catch {}
    try { document.body.removeChild(host); } catch {}
  }
}

async function captureElement(el: HTMLElement): Promise<{ dataUrl: string; widthPx: number; heightPx: number } | null> {
  // Fast path: single ECharts chart → clone it into an off-screen instance
  // with animation disabled and snapshot that. Avoids both html2canvas
  // overhead AND the in-flight-animation race on the live chart.
  const echartsNodes = el.querySelectorAll<HTMLElement>('[_echarts_instance_]');
  if (echartsNodes.length === 1) {
    const liveInst = echarts.getInstanceByDom(echartsNodes[0]);
    if (liveInst && !liveInst.isDisposed()) {
      const cloned = cloneChartToDataUrl(liveInst, echartsNodes[0]);
      if (cloned) return cloned;
      /* fall through to html2canvas */
    }
  }

  // Fallback: table views (no echarts) or unusual mixed DOM.
  try {
    freezeEchartsForCapture(el);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const canvas = await html2canvas(el, {
      scale: 1.5,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });
    return {
      dataUrl: canvas.toDataURL('image/png'),
      widthPx: canvas.width,
      heightPx: canvas.height,
    };
  } catch {
    return null;
  }
}

function fitImage(widthPx: number, heightPx: number, maxWidthMm: number, maxHeightMm: number) {
  const ratio = widthPx / heightPx;
  let w = maxWidthMm;
  let h = w / ratio;
  if (h > maxHeightMm) {
    h = maxHeightMm;
    w = h * ratio;
  }
  return { w, h };
}

/**
 * Wrap an event-driven executor in a Promise that also:
 *   - rejects instantly when `signal` aborts
 *   - resolves after `deadlineMs` as a deadlock guard (never a hardcoded
 *     delay — this only fires if the underlying event genuinely never
 *     arrives, which should be rare).
 */
function abortable<T>(
  executor: (
    resolve: (v: T) => void,
    reject: (e: unknown) => void,
    onCleanup: (cleanup: () => void) => void,
  ) => void,
  signal?: AbortSignal,
  deadlineMs = 4000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Export cancelled', 'AbortError'));
      return;
    }
    let cleanupFn: (() => void) | null = null;
    let settled = false;

    const teardown = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      clearTimeout(deadlineTimer);
      try { cleanupFn?.(); } catch {}
    };
    const onAbort = () => {
      teardown();
      reject(new DOMException('Export cancelled', 'AbortError'));
    };
    const deadlineTimer = setTimeout(() => {
      teardown();
      // Resolve with `undefined` — caller treats the deadline as "good
      // enough, move on" rather than a fatal error, because the export
      // should never hang on a single misbehaving chart.
      resolve(undefined as T);
    }, deadlineMs);

    signal?.addEventListener('abort', onAbort, { once: true });
    executor(
      (v) => { teardown(); resolve(v); },
      (e) => { teardown(); reject(e); },
      (cb) => { cleanupFn = cb; },
    );
  });
}

/** Does this ECharts instance have at least one series with data applied? */
function echartsHasDataSeries(inst: echarts.ECharts): boolean {
  try {
    const opt = inst.getOption() as { series?: Array<{ data?: unknown[] }> };
    const series = opt?.series;
    if (!Array.isArray(series) || series.length === 0) return false;
    return series.some((s) => Array.isArray(s?.data) && s.data.length > 0);
  } catch {
    return false;
  }
}

/** Find a live ECharts instance inside a message node, or null. */
function findLiveInstance(msgNode: HTMLElement): echarts.ECharts | null {
  const node = msgNode.querySelector<HTMLElement>('[_echarts_instance_]');
  if (!node) return null;
  const inst = echarts.getInstanceByDom(node);
  return inst && !inst.isDisposed() ? inst : null;
}

/**
 * Resolve when `msgNode` contains a live ECharts instance with data applied
 * that is NOT `prevInst`. This is essential when switching between viz types:
 * React unmounts the old chart component and mounts a new one, and we must
 * wait until the new instance has replaced the old — otherwise we race
 * against the unmount and capture the stale previous chart.
 *
 * Phases:
 *   1. Via MutationObserver, wait for a new instance (different identity
 *      from `prevInst`) to appear, or for `prevInst` to be disposed.
 *   2. If that new instance already has data, done.
 *   3. Otherwise listen for its first `'finished'` event, which fires right
 *      after its first real render — `setOption(data)` does NOT trigger a
 *      DOM mutation, so the observer alone cannot detect the data binding.
 */
function waitForEchartsMounted(
  msgNode: HTMLElement,
  signal?: AbortSignal,
  prevInst?: echarts.ECharts | null,
): Promise<void> {
  const isFresh = (inst: echarts.ECharts | null): inst is echarts.ECharts =>
    !!inst && !inst.isDisposed() && inst !== prevInst;

  const ready = findLiveInstance(msgNode);
  if (isFresh(ready) && echartsHasDataSeries(ready)) return Promise.resolve();

  return abortable<void>((resolve, _reject, onCleanup) => {
    let obs: MutationObserver | null = null;
    let listeningInst: echarts.ECharts | null = null;
    const detachFinishedListener = () => {
      if (listeningInst) {
        try { (listeningInst as any).off('finished', onFinished); } catch {}
        listeningInst = null;
      }
    };
    const fullCleanup = () => {
      obs?.disconnect();
      obs = null;
      detachFinishedListener();
    };
    onCleanup(fullCleanup);

    const onFinished = () => {
      if (listeningInst && echartsHasDataSeries(listeningInst)) {
        fullCleanup();
        resolve();
      }
    };

    const tryAttach = () => {
      const inst = findLiveInstance(msgNode);
      if (!isFresh(inst)) return false; // still seeing prevInst — keep waiting
      if (echartsHasDataSeries(inst)) {
        fullCleanup();
        resolve();
        return true;
      }
      if (listeningInst !== inst) {
        detachFinishedListener();
        listeningInst = inst;
        inst.on('finished', onFinished);
      }
      return true;
    };

    if (tryAttach()) return;
    obs = new MutationObserver(() => { tryAttach(); });
    obs.observe(msgNode, { childList: true, subtree: true, attributes: true });
  }, signal);
}

/** Force a message's viz type and wait for React to mount the new view. */
async function forceVizType(
  messageId: string,
  vizType: string,
  msgNode: HTMLElement,
  signal?: AbortSignal,
): Promise<void> {
  // Snapshot the currently mounted chart BEFORE dispatching the switch so we
  // can wait for a DIFFERENT instance to take its place. Without this, the
  // wait helper can race against React's unmount and see the stale previous
  // chart as "ready", causing every variant to be captured as the old type.
  const prevInst = findLiveInstance(msgNode);

  window.dispatchEvent(new CustomEvent('viz:force-type', { detail: { messageId, vizType } }));

  if (vizType === 'table') {
    // Tables are plain DOM — just let React commit the new view.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    return;
  }
  await waitForEchartsMounted(msgNode, signal, prevInst);
}

export async function exportChatToPdf({ title, messages, messagesRoot, onProgress, signal }: ExportOptions): Promise<void> {
  if (!messages || messages.length === 0) return;
  throwIfAborted(signal);

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = PAGE.marginY;

  // Progress is weighted by work units. Each message contributes 1 unit for
  // its text block, plus 1 unit per visualization variant we capture (viz
  // captures dominate total time because of html2canvas + echarts rendering).
  let totalUnits = 0;
  let doneUnits = 0;
  for (const m of messages) {
    totalUnits += 1;
    if (m.role !== 'user' && messagesRoot) {
      const node = messagesRoot.querySelector<HTMLElement>(`[data-message-id="${m.id}"]`);
      const attr = node?.getAttribute('data-viz-types') || '';
      const vizCount = attr ? attr.split(',').filter(Boolean).length : (node?.querySelector('[data-viz-capture]') ? 1 : 0);
      totalUnits += vizCount;
    }
  }
  if (totalUnits === 0) totalUnits = 1;

  const report = (label: string) => {
    if (!onProgress) return;
    onProgress({ ratio: Math.min(1, doneUnits / totalUnits), label });
  };
  const tick = (label: string, units = 1) => {
    doneUnits += units;
    report(label);
  };

  report('Preparing export…');

  const needSpace = (height: number) => {
    if (y + height > PAGE.height - PAGE.marginY) {
      pdf.addPage();
      y = PAGE.marginY;
    }
  };

  // ── Header ──
  const drawHeader = () => {
    pdf.setFillColor(BLUE.r, BLUE.g, BLUE.b);
    pdf.rect(0, 0, PAGE.width, 22, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text('SDM AI Assistant — Chat Export', PAGE.marginX, 13);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Exported: ${new Date().toLocaleString()}`, PAGE.marginX, 18);
  };
  drawHeader();
  y = 30;

  // ── Chat title ──
  pdf.setTextColor(GREY_DARK.r, GREY_DARK.g, GREY_DARK.b);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  const titleLines = pdf.splitTextToSize(title || 'Untitled chat', CONTENT_WIDTH);
  pdf.text(titleLines, PAGE.marginX, y);
  y += titleLines.length * 7 + 4;

  pdf.setDrawColor(GREY_LIGHT.r, GREY_LIGHT.g, GREY_LIGHT.b);
  pdf.setLineWidth(0.3);
  pdf.line(PAGE.marginX, y, PAGE.width - PAGE.marginX, y);
  y += 8;

  // ── Helper: draw a clickable viz-tab row on the current page ──
  // Each tab is registered as a jsPDF internal link to the page that hosts
  // that variant. Links are applied after the walk so `fromPage` is resolved
  // against the page we were on when the tab was drawn.
  type PendingLink = { fromPage: number; x: number; y: number; w: number; h: number; toPage: number };
  const pendingLinks: PendingLink[] = [];

  const drawVizTabRow = (vizTypes: string[], activeType: string, pageByType: Record<string, number>) => {
    const tabW = 32;
    const tabH = 8;
    const gap = 2;
    const totalW = vizTypes.length * tabW + (vizTypes.length - 1) * gap;
    let tx = PAGE.marginX + (CONTENT_WIDTH - totalW) / 2;
    const ty = y;

    vizTypes.forEach((t) => {
      const isActive = t === activeType;
      // Background
      if (isActive) {
        pdf.setFillColor(BLUE.r, BLUE.g, BLUE.b);
      } else {
        pdf.setFillColor(245, 247, 250);
      }
      pdf.roundedRect(tx, ty, tabW, tabH, 1.5, 1.5, 'F');
      // Border
      pdf.setDrawColor(isActive ? BLUE.r : 200, isActive ? BLUE.g : 200, isActive ? BLUE.b : 200);
      pdf.setLineWidth(0.2);
      pdf.roundedRect(tx, ty, tabW, tabH, 1.5, 1.5, 'S');
      // Label
      pdf.setFont('helvetica', isActive ? 'bold' : 'normal');
      pdf.setFontSize(8);
      if (isActive) {
        pdf.setTextColor(255, 255, 255);
      } else {
        pdf.setTextColor(GREY_MID.r, GREY_MID.g, GREY_MID.b);
      }
      const label = VIZ_LABELS[t] || t;
      const lw = pdf.getTextWidth(label);
      pdf.text(label, tx + (tabW - lw) / 2, ty + 5.2);
      // Schedule a link if we have a target page for this type
      const targetPage = pageByType[t];
      if (targetPage != null) {
        pendingLinks.push({
          fromPage: pdf.getCurrentPageInfo().pageNumber,
          x: tx,
          y: ty,
          w: tabW,
          h: tabH,
          toPage: targetPage,
        });
      }
      tx += tabW + gap;
    });

    y += tabH + 4;
  };

  // ── Walk messages ──
  for (let i = 0; i < messages.length; i++) {
    throwIfAborted(signal);
    const msg = messages[i];
    const isUser = msg.role === 'user';
    const text = cleanText(msg.content || '');
    if (!text && !msg.response) continue;

    tick(`Processing message ${i + 1} of ${messages.length}…`);

    try {
    needSpace(25);

    // Role label
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    if (isUser) {
      pdf.setTextColor(BLUE.r, BLUE.g, BLUE.b);
      pdf.text('You', PAGE.marginX, y);
    } else {
      pdf.setTextColor(BLUE_LIGHT.r, BLUE_LIGHT.g, BLUE_LIGHT.b);
      pdf.text('SDM AI Assistant', PAGE.marginX, y);
    }
    y += 5;

    // Text content
    if (text) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(GREY_DARK.r, GREY_DARK.g, GREY_DARK.b);
      const lines = pdf.splitTextToSize(text, CONTENT_WIDTH - 4);
      const lineHeight = 4.8;
      const boxH = lines.length * lineHeight + 6;
      needSpace(boxH);
      if (isUser) {
        pdf.setFillColor(BLUE.r, BLUE.g, BLUE.b);
        pdf.roundedRect(PAGE.marginX, y - 1, CONTENT_WIDTH, boxH, 2, 2, 'F');
        pdf.setTextColor(255, 255, 255);
      } else {
        pdf.setFillColor(248, 249, 250);
        pdf.roundedRect(PAGE.marginX, y - 1, CONTENT_WIDTH, boxH, 2, 2, 'F');
        pdf.setTextColor(GREY_DARK.r, GREY_DARK.g, GREY_DARK.b);
      }
      pdf.text(lines, PAGE.marginX + 2, y + 4);
      y += boxH + 3;
    }

    // Attachments
    if (msg.attachments && msg.attachments.length > 0) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(9);
      pdf.setTextColor(GREY_MID.r, GREY_MID.g, GREY_MID.b);
      const attLine = `Attachments: ${msg.attachments.join(', ')}`;
      const attLines = pdf.splitTextToSize(attLine, CONTENT_WIDTH);
      needSpace(attLines.length * 4 + 2);
      pdf.text(attLines, PAGE.marginX, y);
      y += attLines.length * 4 + 2;
    }

    // ── Visualizations ──
    if (!isUser && messagesRoot) {
      const msgNode = messagesRoot.querySelector<HTMLElement>(`[data-message-id="${msg.id}"]`);
      if (msgNode) {
        // Detect available viz types from the data attribute the React component exposes
        const vizTypesAttr = msgNode.getAttribute('data-viz-types') || '';
        const vizTypes = vizTypesAttr
          ? vizTypesAttr.split(',').map((s) => s.trim()).filter(Boolean)
          : [];

        if (vizTypes.length > 1) {
          // ── Multi-viz: capture every variant then render each on its own page ──
          const captures: Record<string, Awaited<ReturnType<typeof captureElement>>> = {};
          for (const t of vizTypes) {
            throwIfAborted(signal);
            // Report BEFORE the work so the toast label reflects what is
            // currently happening rather than what just finished.
            report(`Rendering ${VIZ_LABELS[t] || t} (message ${i + 1} of ${messages.length})…`);
            await forceVizType(msg.id, t, msgNode, signal);
            const vizNode = msgNode.querySelector<HTMLElement>('[data-viz-capture]');
            if (vizNode) {
              captures[t] = await captureElement(vizNode);
            }
            doneUnits += 1;
            report(`Rendering ${VIZ_LABELS[t] || t} (message ${i + 1} of ${messages.length})…`);
          }

          // Pre-assign a page number to every variant BEFORE drawing any tab
          // row, so each row can reference all sibling pages — not just the
          // ones already visited.
          const firstVariantPage = pdf.getNumberOfPages() + 1;
          const pageByType: Record<string, number> = {};
          vizTypes.forEach((t, idx) => {
            pageByType[t] = firstVariantPage + idx;
          });

          for (const t of vizTypes) {
            pdf.addPage();
            y = PAGE.marginY;

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.setTextColor(BLUE.r, BLUE.g, BLUE.b);
            pdf.text(`${VIZ_LABELS[t] || t} — SDM AI Assistant`, PAGE.marginX, y);
            y += 6;

            drawVizTabRow(vizTypes, t, pageByType);

            const cap = captures[t];
            let imageAdded = false;
            if (cap) {
              try {
                const { w, h } = fitImage(
                  cap.widthPx,
                  cap.heightPx,
                  CONTENT_WIDTH,
                  PAGE.height - y - PAGE.marginY - 4,
                );
                pdf.addImage(cap.dataUrl, 'PNG', PAGE.marginX + (CONTENT_WIDTH - w) / 2, y, w, h);
                y += h + 5;
                imageAdded = true;
              } catch (err) {
                // eslint-disable-next-line no-console
                console.warn('[exportChatToPdf] addImage failed for variant', t, err);
              }
            }
            if (!imageAdded) {
              pdf.setFont('helvetica', 'italic');
              pdf.setFontSize(10);
              pdf.setTextColor(GREY_MID.r, GREY_MID.g, GREY_MID.b);
              pdf.text('(unable to render this visualization)', PAGE.marginX, y + 6);
              y += 12;
            }
          }

          // Start subsequent content on a fresh page so the last variant's
          // y cursor doesn't collide with the next message.
          pdf.addPage();
          y = PAGE.marginY;
        } else {
          // ── Single viz: capture as-is ──
          const vizNode = msgNode.querySelector<HTMLElement>('[data-viz-capture]');
          if (vizNode) {
            report(`Rendering visualization (message ${i + 1} of ${messages.length})…`);
            const cap = await captureElement(vizNode);
            doneUnits += 1;
            report(`Rendering visualization (message ${i + 1} of ${messages.length})…`);
            if (cap) {
              try {
                const { w, h } = fitImage(
                  cap.widthPx,
                  cap.heightPx,
                  CONTENT_WIDTH,
                  PAGE.height - 2 * PAGE.marginY - 20,
                );
                needSpace(h + 10);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(10);
                pdf.setTextColor(BLUE.r, BLUE.g, BLUE.b);
                const label = vizNode.getAttribute('data-viz-label') || 'Visualization';
                pdf.text(label, PAGE.marginX, y);
                y += 4;
                pdf.addImage(cap.dataUrl, 'PNG', PAGE.marginX, y, w, h);
                y += h + 5;
              } catch (err) {
                // eslint-disable-next-line no-console
                console.warn('[exportChatToPdf] addImage failed for single viz', err);
              }
            }
          }
        }
      }
    }

    } catch (err) {
      // Abort propagates out; every other error is logged and we continue
      // to the next message so one bad chart can't kill the whole export.
      if ((err as DOMException)?.name === 'AbortError') throw err;
      // eslint-disable-next-line no-console
      console.error(`[exportChatToPdf] message ${i + 1} failed, skipping`, err);
    }

    // Separator between messages
    pdf.setDrawColor(GREY_LIGHT.r, GREY_LIGHT.g, GREY_LIGHT.b);
    pdf.setLineWidth(0.2);
    pdf.line(PAGE.marginX, y, PAGE.width - PAGE.marginX, y);
    y += 6;
  }

  // ── Apply pending internal links ──
  // Uses jsPDF's `link()` which needs to be called on the correct source page.
  for (const lnk of pendingLinks) {
    pdf.setPage(lnk.fromPage);
    pdf.link(lnk.x, lnk.y, lnk.w, lnk.h, { pageNumber: lnk.toPage });
  }

  // ── Footer with page numbers ──
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(GREY_MID.r, GREY_MID.g, GREY_MID.b);
    const footer = `Page ${p} of ${totalPages}`;
    pdf.text(footer, PAGE.width - PAGE.marginX - 20, PAGE.height - 8);
  }

  doneUnits = totalUnits;
  report('Finalizing PDF…');

  const safeName = (title || 'chat').replace(/[^\w\s-]/g, '').trim().slice(0, 50) || 'chat';
  pdf.save(`${safeName}.pdf`);

  report('Export complete');
}
