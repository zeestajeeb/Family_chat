import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import {
  CheckCircle2,
  Download,
  FolderOpen,
  Play,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import type { CodingChallenge, CodingProject, GuidedTemplate } from '../types';
import { SandboxedPreview } from '../components/SandboxedPreview';

const DEFAULT_HTML = `<main class="card">\n  <h1>Hello from Family Coding Studio!</h1>\n  <p>Edit the HTML, CSS, and JavaScript tabs, then click Run.</p>\n  <button id="demoBtn">Click Me</button>\n  <p id="counter"></p>\n</main>`;
const DEFAULT_CSS = `body { font-family: system-ui, sans-serif; padding: 24px; background: #f8fafc; color: #0f172a; }\n.card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; max-width: 480px; }\nbutton { background: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; }`;
const DEFAULT_JS = `let clicks = 0;\ndocument.getElementById('demoBtn').addEventListener('click', () => {\n  clicks++;\n  document.getElementById('counter').textContent = 'Button clicked ' + clicks + ' times!';\n});`;

export function PlaygroundPage({ onPointsUpdated }: { onPointsUpdated?: () => void }) {
  const [workspaceMode, setWorkspaceMode] = useState<'playground' | 'guided' | 'challenges'>('playground');
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');

  const [projects, setProjects] = useState<CodingProject[]>([]);
  const [templates, setTemplates] = useState<GuidedTemplate[]>([]);
  const [challenges, setChallenges] = useState<CodingChallenge[]>([]);

  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<GuidedTemplate | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<CodingChallenge | null>(null);
  const [projectTitle, setProjectTitle] = useState('My Sandbox Project');

  const [htmlCode, setHtmlCode] = useState(DEFAULT_HTML);
  const [cssCode, setCssCode] = useState(DEFAULT_CSS);
  const [jsCode, setJsCode] = useState(DEFAULT_JS);

  const [runState, setRunState] = useState({ html: DEFAULT_HTML, css: DEFAULT_CSS, js: DEFAULT_JS });
  const [fullscreen, setFullscreen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);

  const loadData = async () => {
    const res = await fetch('/api/projects');
    if (res.ok) {
      const data = await res.json();
      setProjects(data.projects || []);
      setTemplates(data.guidedTemplates || []);
      setChallenges(data.challenges || []);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const flashStatus = (msg: string) => {
    setStatusMessage(msg);
    window.setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleRun = () => {
    setRunState({ html: htmlCode, css: cssCode, js: jsCode });
  };

  const handleReset = () => {
    if (currentTemplate) {
      setHtmlCode(currentTemplate.starterHtml);
      setCssCode(currentTemplate.starterCss);
      setJsCode(currentTemplate.starterJs);
      setRunState({ html: currentTemplate.starterHtml, css: currentTemplate.starterCss, js: currentTemplate.starterJs });
    } else if (currentChallenge) {
      setHtmlCode(currentChallenge.starter_html);
      setCssCode(currentChallenge.starter_css);
      setJsCode(currentChallenge.starter_js);
      setRunState({
        html: currentChallenge.starter_html,
        css: currentChallenge.starter_css,
        js: currentChallenge.starter_js,
      });
    } else {
      setHtmlCode(DEFAULT_HTML);
      setCssCode(DEFAULT_CSS);
      setJsCode(DEFAULT_JS);
      setRunState({ html: DEFAULT_HTML, css: DEFAULT_CSS, js: DEFAULT_JS });
    }
    flashStatus('Reset to starter code.');
  };

  const handleSaveProject = async (submitForReview = false) => {
    if (currentChallenge && submitForReview) {
      const res = await fetch(`/api/challenges/${currentChallenge.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlCode, cssCode, jsCode }),
      });
      if (res.ok) {
        flashStatus('Challenge submitted! +20 points awarded.');
        await loadData();
        onPointsUpdated?.();
      }
      return;
    }

    const payload = {
      title: projectTitle || 'Untitled Creation',
      projectType: currentTemplate ? 'guided' : 'playground',
      templateSlug: currentTemplate?.slug ?? null,
      difficulty: currentTemplate?.difficulty ?? 'Beginner',
      htmlCode,
      cssCode,
      jsCode,
      submit: submitForReview,
    };

    const res = currentProjectId
      ? await fetch(`/api/projects/${currentProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    if (res.ok) {
      const data = await res.json();
      setCurrentProjectId(data.project.id);
      await loadData();
      onPointsUpdated?.();
      flashStatus(submitForReview ? 'Submitted for Dad’s review!' : 'Project saved to your family workspace.');
    }
  };

  const handleLoadProject = (proj: CodingProject) => {
    setCurrentProjectId(proj.id);
    setProjectTitle(proj.title);
    setHtmlCode(proj.html_code);
    setCssCode(proj.css_code);
    setJsCode(proj.js_code);
    setRunState({ html: proj.html_code, css: proj.css_code, js: proj.js_code });
    setCurrentChallenge(null);
    setCurrentTemplate(templates.find((t) => t.slug === proj.template_slug) || null);
    setShowSavedDrawer(false);
    flashStatus(`Loaded "${proj.title}"`);
  };

  const handleDeleteProject = async (id: number) => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (currentProjectId === id) {
      setCurrentProjectId(null);
    }
    await loadData();
  };

  const startGuidedTemplate = (tpl: GuidedTemplate) => {
    setCurrentProjectId(null);
    setCurrentChallenge(null);
    setCurrentTemplate(tpl);
    setProjectTitle(`${tpl.title} Project`);
    setHtmlCode(tpl.starterHtml);
    setCssCode(tpl.starterCss);
    setJsCode(tpl.starterJs);
    setRunState({ html: tpl.starterHtml, css: tpl.starterCss, js: tpl.starterJs });
  };

  const startChallenge = (ch: CodingChallenge) => {
    setCurrentProjectId(null);
    setCurrentTemplate(null);
    setCurrentChallenge(ch);
    setProjectTitle(ch.title);
    setHtmlCode(ch.starter_html);
    setCssCode(ch.starter_css);
    setJsCode(ch.starter_js);
    setRunState({ html: ch.starter_html, css: ch.starter_css, js: ch.starter_js });
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const fullHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectTitle}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
${htmlCode}
<script src="script.js"></script>
</body>
</html>`;
    zip.file('index.html', fullHtml);
    zip.file('styles.css', cssCode);
    zip.file('script.js', jsCode);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(projectTitle || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentLanguage = activeTab === 'html' ? 'html' : activeTab === 'css' ? 'css' : 'javascript';
  const currentCodeValue = activeTab === 'html' ? htmlCode : activeTab === 'css' ? cssCode : jsCode;
  const setCurrentCodeValue = (val: string) => {
    if (activeTab === 'html') setHtmlCode(val);
    else if (activeTab === 'css') setCssCode(val);
    else setJsCode(val);
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Coding Studio &amp; Project Builder</h1>
          <p className="text-sm text-slate-600">
            Write HTML, CSS, and JavaScript in Monaco Editor and test inside an isolated security sandbox.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setWorkspaceMode('playground')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
              workspaceMode === 'playground' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Playground
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceMode('guided')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
              workspaceMode === 'guided' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Website Projects (7)
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceMode('challenges')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
              workspaceMode === 'challenges' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Challenges ({challenges.length})
          </button>
        </div>
      </div>

      {/* Guided Website Projects Shelf */}
      {workspaceMode === 'guided' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {templates.map((tpl) => {
            const selected = currentTemplate?.slug === tpl.slug;
            return (
              <div
                key={tpl.slug}
                className={`rounded-xl border p-4 flex flex-col justify-between bg-white ${
                  selected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">{tpl.difficulty}</p>
                  <h3 className="mt-1 text-sm font-bold text-slate-900">{tpl.title}</h3>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{tpl.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => startGuidedTemplate(tpl)}
                  className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                >
                  Load Starter Workspace
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Coding Challenges Shelf */}
      {workspaceMode === 'challenges' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {challenges.map((ch) => (
            <div key={ch.id} className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{ch.difficulty}</span>
                  <span className="tabular-nums font-semibold text-blue-600">+{ch.points} pts</span>
                </div>
                <h3 className="mt-1 text-base font-bold text-slate-900">{ch.title}</h3>
                <p className="mt-1 text-xs text-slate-600">{ch.description}</p>
                {ch.my_status && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Status: {ch.my_status}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => startChallenge(ch)}
                className="mt-4 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 self-start"
              >
                Open Challenge
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active Guided Instructions Banner */}
      {currentTemplate && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-blue-700">Guided Project · {currentTemplate.difficulty}</p>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">{currentTemplate.title}</h2>
            <p className="mt-1 text-xs whitespace-pre-line text-slate-700">{currentTemplate.instructions}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">Learning Objectives</p>
            <ul className="mt-1.5 list-disc pl-4 space-y-1 text-xs text-slate-700">
              {currentTemplate.objectives.map((obj, idx) => (
                <li key={idx}>{obj}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            placeholder="Project Title"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowSavedDrawer(!showSavedDrawer)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Saved Projects ({projects.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleRun}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Run Code</span>
          </button>
          <button
            type="button"
            onClick={() => handleSaveProject(false)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save</span>
          </button>
          {(currentTemplate || currentChallenge || workspaceMode === 'guided') && (
            <button
              type="button"
              onClick={() => handleSaveProject(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit for Review</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadZip}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download ZIP</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800">
          {statusMessage}
        </div>
      )}

      {/* Saved Projects Drawer */}
      {showSavedDrawer && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Your Saved Projects</h3>
          {projects.length === 0 ? (
            <p className="text-xs text-slate-500">No saved projects yet. Click Save to store your work.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {projects.map((p) => (
                <div key={p.id} className="rounded-lg border border-slate-200 p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{p.project_type === 'guided' ? 'Guided' : 'Sandbox'}</span>
                      <span className="font-semibold text-slate-700">{p.status}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{p.title}</p>
                    {p.parent_feedback && (
                      <p className="mt-1 text-xs text-blue-700">Dad’s note: {p.parent_feedback}</p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadProject(p)}
                      className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(p.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                      title="Delete Project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monaco Editor + Live Sandboxed Preview */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2">
            <div className="flex items-center gap-1">
              {(['html', 'css', 'js'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                    activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {tab === 'html' ? 'index.html' : tab === 'css' ? 'styles.css' : 'script.js'}
                </button>
              ))}
            </div>
            <span className="text-[11px] font-mono text-slate-400">Monaco Editor</span>
          </div>
          <Editor
            height="430px"
            language={currentLanguage}
            theme="vs-dark"
            value={currentCodeValue}
            onChange={(v) => setCurrentCodeValue(v ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              padding: { top: 12 },
            }}
          />
        </div>

        <SandboxedPreview
          html={runState.html}
          css={runState.css}
          js={runState.js}
          title={projectTitle || 'Live Preview'}
          heightClass="h-[430px]"
          isFullscreen={fullscreen}
          onToggleFullscreen={() => setFullscreen(!fullscreen)}
        />
      </div>
    </div>
  );
}
