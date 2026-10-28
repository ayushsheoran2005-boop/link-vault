import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import {
  Activity, ArrowDown, ArrowDownUp, ArrowLeft, ArrowRight, BarChart3, Check,
  CircleHelp, Clock3, Copy, ExternalLink, Eye, EyeOff, Filter, Globe2, LayoutDashboard,
  Link2, LoaderCircle, LogOut, Menu, MoreHorizontal, Plus, Search, Settings2, ShieldCheck,
  Sparkles, Trash2, TrendingUp, X, Zap
} from "lucide-react";
import { api, type Analytics, type LinkRecord, type User } from "./api";

type View = "home" | "signin" | "signup";
type ListResult = { links: LinkRecord[]; pagination: { page: number; pages: number; total: number } };

const buttonBase = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

function Logo({ small = false }: { small?: boolean }) {
  return <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-canvas"><Link2 size={19} strokeWidth={2.6} /></span>{!small && <span className="text-[17px] font-extrabold tracking-tight text-white">linkvault<span className="text-accent">.</span></span>}</div>;
}

function Landing({ navigate }: { navigate: (view: View) => void }) {
  return <main className="min-h-screen overflow-hidden bg-canvas">
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
      <Logo />
      <div className="flex items-center gap-3"><button onClick={() => navigate("signin")} className="hidden rounded-xl px-4 py-2 text-sm font-bold text-slate-300 hover:text-white sm:block">Log in</button><button onClick={() => navigate("signup")} className={`${buttonBase} bg-accent text-canvas hover:bg-lime-300`}>Get started <ArrowRight size={16} /></button></div>
    </header>
    <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pb-36 lg:pt-24">
      <div className="pointer-events-none absolute -left-48 top-0 h-[34rem] w-[34rem] rounded-full bg-lime-400/[0.06] blur-[120px]" />
      <div className="relative">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1.5 text-xs font-semibold text-slate-300"><Sparkles size={14} className="text-accent" /> YOUR LINKS, IN GOOD HANDS</div>
        <h1 className="max-w-2xl text-5xl font-extrabold leading-[1.08] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.5rem]">Short links.<br /><span className="text-accent">Long story.</span></h1>
        <p className="mt-7 max-w-lg text-base leading-7 text-slate-400 sm:text-lg">One calm place to shorten, organize, and understand every link you share. No clutter, just clarity.</p>
        <div className="mt-9 flex flex-wrap items-center gap-3"><button onClick={() => navigate("signup")} className={`${buttonBase} bg-accent px-5 py-3 text-canvas hover:bg-lime-300`}>Create your free account <ArrowRight size={17} /></button><span className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck size={14} /> Private by default</span></div>
        <div className="mt-12 flex items-center gap-8 border-t border-line pt-6 text-xs text-slate-500"><span className="flex items-center gap-2"><Zap size={14} className="text-accent" /> Fast redirects</span><span className="flex items-center gap-2"><Activity size={14} className="text-accent" /> Real-time insights</span><span className="flex items-center gap-2"><ShieldCheck size={14} className="text-accent" /> Your links only</span></div>
      </div>
      <div className="relative mx-auto w-full max-w-[540px]">
        <div className="absolute -inset-8 rounded-[2rem] bg-accent/[0.04] blur-3xl" />
        <div className="relative overflow-hidden rounded-[1.4rem] border border-line bg-[#101319] shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><div className="flex items-center gap-3"><Logo small /><div><p className="text-xs font-bold text-white">Your workspace</p><p className="text-[10px] text-slate-500">A clear view of your links</p></div></div><span className="h-2 w-2 rounded-full bg-accent shadow-glow" /></div>
          <div className="grid grid-cols-3 gap-3 p-5"><PreviewStat label="Total clicks" value="—" trend="From link visits" /><PreviewStat label="Active links" value="—" trend="Your workspace" /><PreviewStat label="Last 7 days" value="—" trend="Actual click events" /></div>
          <div className="px-5 pb-5"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold text-white">Click activity</p><p className="mt-1 text-[10px] text-slate-500">Your recorded visits</p></div><span className="rounded-lg border border-line px-2 py-1 text-[10px] text-slate-400">From PostgreSQL</span></div>
            <div className="grid h-32 place-items-center border-b border-dashed border-line text-[10px] text-slate-600">Your click activity appears here</div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-[#0c0f13] p-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><Link2 size={15} /></div><div className="min-w-0"><p className="mono text-[11px] text-accent">your short link</p><p className="max-w-[200px] truncate text-[10px] text-slate-500">Destination URL</p></div></div><span className="text-xs font-bold text-white">— <span className="font-normal text-slate-500">clicks</span></span></div>
          </div>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10"><div className="grid gap-4 md:grid-cols-3"><Feature icon={<Link2 size={18} />} title="Links that stay yours" text="Private accounts and clear ownership keep your links under your control." /><Feature icon={<BarChart3 size={18} />} title="Numbers that mean something" text="See actual clicks over time, backed by real redirect events." /><Feature icon={<Sparkles size={18} />} title="Less busywork" text="Search, organize, and share from one clean dashboard." /></div></section>
    <footer className="border-t border-line py-6 text-center text-xs text-slate-600">LinkVault · Your links, under control.</footer>
  </main>;
}

function PreviewStat({ label, value, trend }: { label: string; value: string; trend: string }) {
  return <div className="rounded-xl border border-line bg-[#0c0f13] p-3"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-2 text-lg font-extrabold text-white">{value}</p><p className="mt-1 text-[9px] text-accent">{trend}</p></div>;
}
function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="rounded-2xl border border-line bg-panel/60 p-5"><div className="mb-4 grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">{icon}</div><h2 className="text-sm font-extrabold text-white">{title}</h2><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p></article>;
}

function AuthPage({ mode, navigate, onSuccess }: { mode: "signin" | "signup"; navigate: (view: View) => void; onSuccess: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isSignup = mode === "signup";
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: User }>(`/api/auth/${isSignup ? "register" : "login"}`, { method: "POST", body: { email, password } });
      onSuccess(result.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
    } finally { setBusy(false); }
  }
  return <main className="grid min-h-screen bg-canvas lg:grid-cols-[1fr_.95fr]">
    <section className="relative hidden overflow-hidden border-r border-line bg-[#0d1015] p-12 lg:flex lg:flex-col lg:justify-between"><button onClick={() => navigate("home")} className="w-fit"><Logo /></button><div className="relative z-10 max-w-lg"><div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl border border-accent/20 bg-accent/10 text-accent"><Link2 size={23} /></div><p className="text-4xl font-extrabold leading-tight tracking-tight text-white">A little more order<br />in your <span className="text-accent">internet.</span></p><p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">Everything you share. Neatly shortened, organized, and ready to make sense.</p></div><p className="text-xs text-slate-600">LinkVault · Your links, under control.</p><div className="pointer-events-none absolute -bottom-40 -right-36 h-[34rem] w-[34rem] rounded-full bg-accent/[0.06] blur-[120px]" /></section>
    <section className="flex min-h-screen flex-col px-6 py-6 sm:px-10 lg:px-16"><div className="flex items-center justify-between lg:hidden"><button onClick={() => navigate("home")}><Logo /></button><button onClick={() => navigate(isSignup ? "signin" : "signup")} className="text-xs font-bold text-slate-400 hover:text-white">{isSignup ? "Log in" : "Create account"}</button></div><div className="m-auto w-full max-w-[390px] py-12"><button onClick={() => navigate("home")} className="mb-12 hidden items-center gap-2 text-xs font-semibold text-slate-500 hover:text-white lg:flex"><ArrowLeft size={14} /> Back to home</button><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">{isSignup ? "YOUR SPACE STARTS HERE" : "WELCOME BACK"}</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">{isSignup ? "Create your account" : "Sign in to LinkVault"}</h1><p className="mt-2 text-sm text-slate-500">{isSignup ? "Your links deserve a home." : "Your links are right where you left them."}</p>
      <form onSubmit={submit} className="mt-9 space-y-5"><label className="block"><span className="mb-2 block text-xs font-bold text-slate-300">Email address</span><input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border-line bg-panel px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-accent focus:ring-accent" /></label><label className="block"><span className="mb-2 block text-xs font-bold text-slate-300">Password</span><div className="relative"><input type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} required minLength={isSignup ? 10 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? "At least 10 characters" : "Your password"} className="w-full rounded-xl border-line bg-panel px-4 py-3 pr-12 text-sm text-white placeholder:text-slate-600 focus:border-accent focus:ring-accent" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
        {error && <p role="alert" className="rounded-xl border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-xs text-rose-300">{error}</p>}
        <button disabled={busy} className={`${buttonBase} w-full bg-accent py-3 text-canvas hover:bg-lime-300`}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : null}{isSignup ? "Create account" : "Sign in"} {!busy && <ArrowRight size={16} />}</button>
      </form><p className="mt-6 text-center text-xs text-slate-500">{isSignup ? "Already have an account?" : "New to LinkVault?"} <button onClick={() => navigate(isSignup ? "signin" : "signup")} className="font-bold text-accent hover:text-lime-300">{isSignup ? "Sign in" : "Create an account"}</button></p><p className="mt-8 flex items-center justify-center gap-1.5 text-[10px] text-slate-600"><ShieldCheck size={13} /> Passwords are securely hashed. Sessions stay in HTTP-only cookies.</p></div></section>
  </main>;
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("createdAt");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [modal, setModal] = useState<"create" | "edit" | "qr" | null>(null);
  const [selected, setSelected] = useState<LinkRecord | null>(null);
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, stats] = await Promise.all([
        api<ListResult>(`/api/links?search=${encodeURIComponent(search)}&status=${filter}&sort=${sort}&order=desc&page=${page}&limit=8`),
        api<Analytics>("/api/links/analytics")
      ]);
      setLinks(list.links);
      setPages(Math.max(1, list.pagination.pages));
      setAnalytics(stats);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load your workspace.");
    } finally { setLoading(false); }
  }, [search, filter, sort, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 250);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast("Short link copied to clipboard");
    } catch { setToast("Clipboard access is unavailable in this browser"); }
  }
  function openEdit(link: LinkRecord) { setSelected(link); setModal("edit"); }
  function openQr(link: LinkRecord) { setSelected(link); setModal("qr"); }
  async function deactivate(link: LinkRecord) {
    try {
      await api(`/api/links/${link.id}`, { method: "DELETE" });
      setToast("Link deactivated");
      void refresh();
    } catch (reason) { setToast(reason instanceof Error ? reason.message : "Could not deactivate the link"); }
  }
  async function logout() {
    try { await api("/api/auth/logout", { method: "POST" }); onLogout(); }
    catch (reason) { setToast(reason instanceof Error ? reason.message : "Could not sign out"); }
  }
  const chartMax = useMemo(() => Math.max(1, ...(analytics?.dailyClicks.map((entry) => entry.clicks) ?? [])), [analytics]);

  return <div className="min-h-screen bg-canvas">
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col border-r border-line bg-[#0d1015] px-4 py-5 transition-transform lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between px-2"><Logo /><button className="text-slate-500 lg:hidden" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
      <div className="mt-11 px-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-600">Workspace</div>
      <nav className="mt-3 space-y-1"><a href="#overview" className="flex items-center gap-3 rounded-xl bg-accent/10 px-3 py-2.5 text-xs font-bold text-accent"><LayoutDashboard size={16} /> Overview</a><a href="#links" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.04] hover:text-white"><Link2 size={16} /> My links</a><a href="#analytics" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.04] hover:text-white"><BarChart3 size={16} /> Analytics</a></nav>
      <div className="mt-auto rounded-2xl border border-line bg-panel/70 p-4"><div className="mb-3 grid h-8 w-8 place-items-center rounded-xl bg-accent/10 text-accent"><CircleHelp size={15} /></div><p className="text-xs font-bold text-white">Need a hand?</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Your links are private to your account. Share only what you mean to.</p><div className="mt-4 border-t border-line pt-3"><button onClick={() => void logout()} className="flex w-full items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"><LogOut size={14} /> Sign out</button></div></div>
      <div className="mt-4 flex items-center gap-3 rounded-xl px-2 py-2"><div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-xs font-extrabold uppercase text-canvas">{user.email.slice(0, 1)}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{user.email}</p><p className="text-[10px] text-slate-500">Personal workspace</p></div><button title="Sign out" onClick={() => void logout()} className="text-slate-500 hover:text-white"><LogOut size={15} /></button></div>
    </aside>
    {mobileNav && <button aria-label="Close navigation" onClick={() => setMobileNav(false)} className="fixed inset-0 z-20 bg-black/60 lg:hidden" />}
    <main className="min-h-screen lg:pl-[248px]">
      <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-line bg-canvas/90 px-5 backdrop-blur-xl sm:px-8"><div className="flex items-center gap-3"><button aria-label="Open navigation" onClick={() => setMobileNav(true)} className="text-slate-400 lg:hidden"><Menu size={19} /></button><span className="text-xs font-bold text-slate-500">Workspace <span className="px-2 text-slate-700">/</span> <span className="text-white">Overview</span></span></div><div className="flex items-center gap-3"><span className="hidden text-[11px] text-slate-500 sm:block">Personal workspace</span><div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[11px] font-extrabold uppercase text-canvas">{user.email.slice(0, 1)}</div></div></header>
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10">
        <div id="overview" className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">A clearer view of your links<span className="text-accent">.</span></h1><p className="mt-1.5 text-xs text-slate-500">Here’s what’s happening across your workspace.</p></div><button onClick={() => { setSelected(null); setModal("create"); }} className={`${buttonBase} bg-accent text-canvas hover:bg-lime-300`}><Plus size={16} /> Create link</button></div>
        {error && <div role="alert" className="mb-5 flex items-center justify-between rounded-xl border border-rose-900/70 bg-rose-950/30 px-4 py-3 text-xs text-rose-300"><span>{error}</span><button onClick={() => void refresh()} className="font-bold underline">Retry</button></div>}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total clicks" value={analytics?.clickCount ?? 0} icon={<Activity size={16} />} tone="green" foot="All recorded redirects" />
          <StatCard label="Active links" value={analytics?.activeCount ?? 0} icon={<Link2 size={16} />} foot={`${analytics?.linksCount ?? 0} links in your workspace`} />
          <StatCard label="Total links" value={analytics?.linksCount ?? 0} icon={<Globe2 size={16} />} foot="Created in your workspace" />
          <StatCard label="Last 7 days" value={analytics?.dailyClicks.reduce((total, entry) => total + entry.clicks, 0) ?? 0} icon={<TrendingUp size={16} />} tone="green" foot="Clicks from actual link visits" />
        </section>
        <section id="analytics" className="mt-5 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <div className="rounded-2xl border border-line bg-panel/60 p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-extrabold text-white">Click activity</p><p className="mt-1 text-[11px] text-slate-500">Daily clicks recorded over the last 7 days</p></div><span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[10px] font-bold text-slate-400"><Clock3 size={12} /> 7 days</span></div>
            <div className="mt-7 flex h-[150px] items-end gap-2 sm:gap-4">{(analytics?.dailyClicks ?? []).map((entry) => <div key={entry.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div title={`${entry.clicks} clicks`} className="w-full max-w-12 rounded-t-md bg-accent/25 transition-all hover:bg-accent/50" style={{ height: `${Math.max(3, entry.clicks / chartMax * 100)}%` }} /><span className="text-[9px] text-slate-600">{new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</span></div>)}</div>
            {!analytics?.dailyClicks.length && !loading && <p className="mt-3 text-center text-[11px] text-slate-600">Click activity appears here after your links are visited.</p>}
          </div>
          <div className="flex flex-col justify-between rounded-2xl border border-line bg-panel/60 p-5 sm:p-6"><div><div className="flex items-center justify-between"><p className="text-sm font-extrabold text-white">Workspace health</p><span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent"><ShieldCheck size={15} /></span></div><p className="mt-2 text-[11px] text-slate-500">Your links are ready to share.</p></div><div className="mt-6 space-y-3"><HealthRow label="Link ownership" value="Private" /><HealthRow label="Redirect tracking" value="Recording" /><HealthRow label="Account" value="Protected" /></div><div className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-[10px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Workspace data is synced to your account.</div></div>
        </section>
        <section id="links" className="mt-7 overflow-hidden rounded-2xl border border-line bg-panel/40">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6"><div><h2 className="text-sm font-extrabold text-white">Your links</h2><p className="mt-1 text-[10px] text-slate-500">Manage and share the links you’ve created</p></div><div className="flex flex-wrap items-center gap-2"><label className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search links..." className="h-9 w-40 rounded-lg border-line bg-[#0c0f13] pl-9 pr-3 text-[11px] text-white placeholder:text-slate-600 focus:border-accent focus:ring-accent sm:w-48" /></label><label className="relative"><Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" /><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }} className="h-9 appearance-none rounded-lg border-line bg-[#0c0f13] pl-8 pr-7 text-[11px] font-semibold text-slate-300 focus:border-accent focus:ring-accent"><option value="all">All links</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="expired">Expired</option></select></label><button title="Toggle sort order" onClick={() => setSort(sort === "createdAt" ? "clicks" : "createdAt")} className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-[#0c0f13] text-slate-400 hover:text-white">{sort === "createdAt" ? <ArrowDown size={14} /> : <ArrowDownUp size={14} />}</button></div></div>
          {loading ? <div className="flex h-52 items-center justify-center gap-2 text-xs text-slate-500"><LoaderCircle size={16} className="animate-spin text-accent" /> Loading your links...</div> : links.length === 0 ? <div className="flex flex-col items-center px-6 py-14 text-center"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-panel text-slate-500"><Link2 size={20} /></div><p className="mt-4 text-sm font-bold text-white">{search || filter !== "all" ? "No links match that search" : "Your first link is one click away"}</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{search || filter !== "all" ? "Try changing the search or status filter." : "Create a short, shareable link and watch its real click activity appear here."}</p>{!search && filter === "all" && <button onClick={() => setModal("create")} className={`${buttonBase} mt-5 bg-accent text-canvas`}><Plus size={15} /> Create your first link</button>}</div> :
            <div className="divide-y divide-line">{links.map((link) => <LinkRow key={link.id} link={link} onCopy={() => void copy(link.shortUrl)} onEdit={() => openEdit(link)} onQr={() => openQr(link)} onDeactivate={() => void deactivate(link)} />)}</div>}
          {!loading && links.length > 0 && <div className="flex items-center justify-between border-t border-line px-5 py-3.5 text-[10px] text-slate-500"><span>Page {page} of {pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-slate-400 hover:text-white disabled:opacity-40"><ArrowLeft size={14} /></button><button disabled={page >= pages} onClick={() => setPage(page + 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-slate-400 hover:text-white disabled:opacity-40"><ArrowRight size={14} /></button></div></div>}
        </section>
        <footer className="py-7 text-center text-[10px] text-slate-700">LinkVault · Your links, under control.</footer>
      </div>
    </main>
    {modal && <Modal onClose={() => setModal(null)}>{modal === "qr" && selected ? <QrPanel link={selected} onClose={() => setModal(null)} /> : <LinkForm link={modal === "edit" ? selected : null} onCancel={() => setModal(null)} onSaved={(message) => { setModal(null); setToast(message); void refresh(); }} />}</Modal>}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-line bg-[#171b22] px-4 py-3 text-xs font-semibold text-white shadow-xl"><Check size={15} className="text-accent" />{toast}</div>}
  </div>;
}

function StatCard({ label, value, icon, tone, foot }: { label: string; value: number; icon: React.ReactNode; tone?: "green"; foot: string }) {
  return <article className="rounded-2xl border border-line bg-panel/60 p-4 sm:p-5"><div className="flex items-start justify-between"><p className="text-[11px] font-semibold text-slate-500">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-lg ${tone ? "bg-accent/10 text-accent" : "bg-white/[0.04] text-slate-400"}`}>{icon}</span></div><p className="mt-2 text-2xl font-extrabold tracking-tight text-white">{value.toLocaleString()}</p><p className="mt-1.5 truncate text-[10px] text-slate-600">{foot}</p></article>;
}
function HealthRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between text-[11px]"><span className="text-slate-500">{label}</span><span className="flex items-center gap-1.5 font-semibold text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{value}</span></div>;
}
function LinkRow({ link, onCopy, onEdit, onQr, onDeactivate }: { link: LinkRecord; onCopy: () => void; onEdit: () => void; onQr: () => void; onDeactivate: () => void }) {
  const expired = !!link.expiresAt && new Date(link.expiresAt) <= new Date();
  return <div className="flex flex-col gap-3 px-5 py-4 transition hover:bg-white/[0.015] sm:flex-row sm:items-center sm:px-6"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-[#0c0f13] text-accent"><Link2 size={16} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><a href={link.shortUrl} target="_blank" rel="noreferrer" className="mono text-xs font-medium text-accent hover:text-lime-300">{link.shortUrl.replace(/^https?:\/\//, "")}</a><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${expired ? "bg-amber-500/10 text-amber-300" : link.isActive ? "bg-accent/10 text-accent" : "bg-slate-800 text-slate-500"}`}>{expired ? "Expired" : link.isActive ? "Active" : "Inactive"}</span></div><p title={link.destination} className="mt-1 max-w-[500px] truncate text-[10px] text-slate-500">{link.title || link.destination}</p></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><div className="min-w-16 text-right"><p className="text-xs font-bold text-white">{link.clicks.toLocaleString()}</p><p className="text-[9px] text-slate-600">clicks</p></div><div className="flex items-center gap-1"><button title="Copy short link" onClick={onCopy} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white/[0.05] hover:text-white"><Copy size={14} /></button><button title="Show QR code" onClick={onQr} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white/[0.05] hover:text-white"><Settings2 size={14} /></button><a title="Open short link" href={link.shortUrl} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white/[0.05] hover:text-white"><ExternalLink size={14} /></a><button title="Edit link" onClick={onEdit} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white/[0.05] hover:text-white"><MoreHorizontal size={16} /></button>{link.isActive && <button title="Deactivate link" onClick={onDeactivate} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 size={14} /></button>}</div></div></div>;
}
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="w-full max-w-lg rounded-2xl border border-line bg-[#11141a] shadow-2xl">{children}</div></div>;
}
function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function LinkForm({ link, onCancel, onSaved }: { link: LinkRecord | null; onCancel: () => void; onSaved: (message: string) => void }) {
  const [destination, setDestination] = useState(link?.destination ?? "");
  const [title, setTitle] = useState(link?.title ?? "");
  const [alias, setAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState(link?.expiresAt ? toLocalDateTimeInput(link.expiresAt) : "");
  const [active, setActive] = useState(link?.isActive ?? true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (link) {
        await api(`/api/links/${link.id}`, { method: "PATCH", body: { destination, title, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null, isActive: active } });
        onSaved("Link updated");
      } else {
        await api("/api/links", { method: "POST", body: { destination, title, ...(alias ? { alias } : {}) } });
        onSaved("Your new short link is ready");
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save your link"); }
    finally { setBusy(false); }
  }
  return <form onSubmit={(event) => void submit(event)}><div className="flex items-start justify-between border-b border-line px-5 py-4"><div><h2 className="text-sm font-extrabold text-white">{link ? "Edit link" : "Create a short link"}</h2><p className="mt-1 text-[10px] text-slate-500">{link ? `Manage ${link.code}` : "Shorten a destination to share it anywhere."}</p></div><button type="button" onClick={onCancel} className="text-slate-500 hover:text-white"><X size={18} /></button></div><div className="space-y-4 p-5"><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-300">Destination URL <span className="text-rose-400">*</span></span><input autoFocus type="url" required maxLength={2048} value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="https://example.com/your-page" className="w-full rounded-xl border-line bg-[#0c0f13] px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-accent focus:ring-accent" /><p className="mt-1.5 text-[10px] text-slate-600">Only HTTP and HTTPS addresses are accepted.</p></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-300">Label <span className="font-normal text-slate-600">· optional</span></span><input maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Campaign, project, or a note to yourself" className="w-full rounded-xl border-line bg-[#0c0f13] px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-accent focus:ring-accent" /></label>{!link && <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-300">Custom alias <span className="font-normal text-slate-600">· optional</span></span><input minLength={3} maxLength={32} pattern="[A-Za-z0-9_-]+" value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="my-custom-link" className="w-full rounded-xl border-line bg-[#0c0f13] px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-accent focus:ring-accent" /></label>}{link && <><label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-300">Expiration <span className="font-normal text-slate-600">· optional</span></span><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="w-full rounded-xl border-line bg-[#0c0f13] px-3.5 py-2.5 text-xs text-white focus:border-accent focus:ring-accent" /></label><label className="flex items-center gap-2 text-xs font-semibold text-slate-300"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="rounded border-line bg-[#0c0f13] text-accent focus:ring-accent" /> Link is active</label></>}
      {error && <p role="alert" className="rounded-lg border border-rose-900/70 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">{error}</p>}</div><div className="flex justify-end gap-2 border-t border-line px-5 py-4"><button type="button" onClick={onCancel} className={`${buttonBase} border border-line text-slate-300 hover:bg-white/[0.04]`}>Cancel</button><button disabled={busy} className={`${buttonBase} bg-accent text-canvas hover:bg-lime-300`}>{busy && <LoaderCircle size={14} className="animate-spin" />}{link ? "Save changes" : "Create link"} {!busy && <ArrowRight size={14} />}</button></div></form>;
}
function QrPanel({ link, onClose }: { link: LinkRecord; onClose: () => void }) {
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { void QRCode.toDataURL(link.shortUrl, { width: 320, margin: 2, color: { dark: "#11141a", light: "#ffffff" } }).then(setQr).catch(() => setError("Could not generate the QR code.")); }, [link.shortUrl]);
  return <div><div className="flex items-start justify-between border-b border-line px-5 py-4"><div><h2 className="text-sm font-extrabold text-white">QR code</h2><p className="mt-1 text-[10px] text-slate-500">Scan to open {link.code}</p></div><button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button></div><div className="flex flex-col items-center p-6">{error ? <p role="alert" className="text-xs text-rose-300">{error}</p> : qr ? <img src={qr} alt={`QR code for ${link.shortUrl}`} className="h-56 w-56 rounded-xl bg-white p-2" /> : <LoaderCircle size={24} className="animate-spin text-accent" />}<p className="mono mt-4 max-w-full truncate text-xs text-accent">{link.shortUrl}</p><a download={`linkvault-${link.code}.png`} href={qr || undefined} className={`${buttonBase} mt-5 bg-accent text-canvas hover:bg-lime-300`}><ArrowDown size={15} /> Download PNG</a></div></div>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("home");
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    void api<{ user: User }>("/api/auth/me").then((result) => {
      setUser(result.user);
    }).catch(() => {
      setUser(null);
    }).finally(() => setChecking(false));
  }, []);
  if (checking) return <div className="grid min-h-screen place-items-center bg-canvas"><LoaderCircle className="animate-spin text-accent" size={24} /></div>;
  if (user) return <Dashboard user={user} onLogout={() => { setUser(null); setView("home"); }} />;
  if (view === "signin" || view === "signup") return <AuthPage mode={view} navigate={setView} onSuccess={setUser} />;
  return <Landing navigate={setView} />;
}
