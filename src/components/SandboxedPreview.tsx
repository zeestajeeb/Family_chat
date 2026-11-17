import { useMemo } from 'react';
import { Maximize2, Minimize2, ShieldCheck } from 'lucide-react';

interface SandboxedPreviewProps {
  html: string;
  css: string;
  js?: string;
  title?: string;
  heightClass?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

/**
 * Security: Executes user HTML/CSS/JS inside an isolated iframe with ONLY
 * `sandbox="allow-scripts"` (NO `allow-same-origin`). Student code cannot
 * access parent cookies, localStorage, authentication sessions, or backend APIs.
 */
export function SandboxedPreview({
  html,
  css,
  js = '',
  title = 'Live Preview',
  heightClass = 'h-80',
  isFullscreen = false,
  onToggleFullscreen,
}: SandboxedPreviewProps) {
  const srcDoc = useMemo(() => {
    const safeJs = js.replace(/<\/script>/gi, '<\\/script>');
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:;" />
    <style>${css}</style>
  </head>
  <body>
    ${html}
    <script>
      try {
        ${safeJs}
      } catch (err) {
        const pre = document.createElement('pre');
        pre.style.cssText = 'color:#b91c1c;background:#fef2f2;padding:10px;border-radius:6px;margin:12px;font-family:monospace;font-size:12px;';
        pre.textContent = 'Script Error: ' + (err && err.message ? err.message : String(err));
        document.body.appendChild(pre);
      }
    </script>
  </body>
</html>`;
  }, [html, css, js]);

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col bg-white'
          : 'flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white'
      }
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>{title}</span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-500">Sandboxed Output</span>
        </div>
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
          </button>
        )}
      </div>
      <iframe
        title={title}
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        className={`w-full bg-white ${isFullscreen ? 'flex-1' : heightClass}`}
      />
    </div>
  );
}
