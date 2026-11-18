(function () {
  "use strict";

  var REPO = "PS2HomeDeveloper/Rebax";
  var API = "https://api.github.com/repos/" + REPO + "/releases?per_page=50";
  var CACHE_KEY = "rebax-releases-v1";
  var CACHE_MS = 5 * 60 * 1000;

  var ICONS = {
    windows: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 5.5 11 4.4v7H3zM12.5 4.2 21 3v8.4h-8.5zM3 12.6h8v7L3 18.5zM12.5 12.6H21V21l-8.5-1.2z"/></svg>',
    linux: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7.5 9.5 3 2.5-3 2.5M13 15h4"/></svg>',
    macos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4.5" width="16" height="11" rx="2"/><path d="M2.5 19.5h19M9 15.5v4M15 15.5v4"/></svg>',
    android: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
    ios: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M10.5 18h3"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 20h14"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
  };

  var PLATFORMS = [
    { id: "windows", name: "Windows", hint: "Portable folder in a .zip archive. Unzip and run." },
    { id: "linux", name: "Linux", hint: "Portable folder in a .tar.xz archive. Extract and run." },
    { id: "macos", name: "macOS", hint: "Universal app bundle in a .zip archive." },
    { id: "android", name: "Android", hint: "One APK for all phones and tablets." },
    { id: "ios", name: "iOS", hint: "Unsigned .ipa for sideloading." }
  ];

  var ARCH = {
    x86_64: { label: "x86_64", text: "64-bit Intel / AMD. Most computers.", order: 0 },
    arm64: { label: "ARM64", text: "64-bit ARM. Snapdragon PCs, Raspberry Pi 4 and 5, ARM servers.", order: 1 },
    x86: { label: "x86", text: "32-bit Intel / AMD. Older computers.", order: 2 },
    arm: { label: "ARM", text: "32-bit ARM. Older ARM boards.", order: 3 },
    universal: { label: "Universal", text: "Works on every supported device.", order: 0 }
  };

  var NAME_RE = /^Rebax-Engine-v[0-9A-Za-z.+-]+?-(windows|linux|macos|android|ios)-(x86_64|arm64|x86|arm|universal)\.(zip|tar\.xz|apk|ipa|dmg)$/;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function fmtSize(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    return Math.max(1, Math.round(bytes / 1024)) + " KB";
  }

  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function inline(s) {
    s = escapeHtml(s);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
    return s;
  }

  function markdown(src) {
    var lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
    var out = [];
    var list = null;
    var para = [];
    var inCode = false;
    var code = [];

    function flushPara() {
      if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; }
    }
    function flushList() {
      if (list) { out.push("</" + list + ">"); list = null; }
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^```/.test(line)) {
        if (inCode) { out.push("<pre><code>" + escapeHtml(code.join("\n")) + "</code></pre>"); code = []; inCode = false; }
        else { flushPara(); flushList(); inCode = true; }
        continue;
      }
      if (inCode) { code.push(line); continue; }
      if (!line.trim()) { flushPara(); flushList(); continue; }
      var h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) { flushPara(); flushList(); var lvl = Math.min(h[1].length + 1, 4); out.push("<h" + lvl + ">" + inline(h[2]) + "</h" + lvl + ">"); continue; }
      var ul = /^\s*[-*+]\s+(.*)$/.exec(line);
      var ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
      if (ul || ol) {
        flushPara();
        var kind = ul ? "ul" : "ol";
        if (list !== kind) { flushList(); out.push("<" + kind + ">"); list = kind; }
        out.push("<li>" + inline((ul || ol)[1]) + "</li>");
        continue;
      }
      flushList();
      para.push(line.trim());
    }
    if (inCode) out.push("<pre><code>" + escapeHtml(code.join("\n")) + "</code></pre>");
    flushPara();
    flushList();
    return out.join("\n");
  }

  function loadReleases() {
    try {
      var cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.t < CACHE_MS) return Promise.resolve(cached.d);
    } catch (e) {}
    return fetch(API, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) {
        if (!r.ok) throw new Error("status " + r.status);
        return r.json();
      })
      .then(function (data) {
        var list = data.filter(function (r) { return !r.draft; });
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: list })); } catch (e) {}
        return list;
      });
  }

  function classify(release) {
    var byPlatform = {};
    var other = [];
    (release.assets || []).forEach(function (a) {
      var m = NAME_RE.exec(a.name);
      if (!m) { other.push(a); return; }
      (byPlatform[m[1]] = byPlatform[m[1]] || []).push({ asset: a, arch: m[2] });
    });
    Object.keys(byPlatform).forEach(function (k) {
      byPlatform[k].sort(function (a, b) { return ARCH[a.arch].order - ARCH[b.arch].order; });
    });
    return { byPlatform: byPlatform, other: other };
  }

  function fileLink(a, title, sub) {
    var link = el("a", "file");
    link.href = a.browser_download_url;
    link.rel = "noopener";
    var n = el("div", "n");
    n.appendChild(el("b", "", title));
    n.appendChild(el("span", "", sub));
    link.appendChild(n);
    link.appendChild(el("span", "sz", fmtSize(a.size)));
    var ic = el("span");
    ic.innerHTML = ICONS.file;
    link.appendChild(ic);
    return link;
  }

  function platformCards(release) {
    var info = classify(release);
    var grid = el("div", "dl-grid");
    PLATFORMS.forEach(function (p) {
      var card = el("div", "dl-card");
      var h = el("h3");
      var ic = el("span");
      ic.innerHTML = ICONS[p.id];
      h.appendChild(ic);
      h.appendChild(document.createTextNode(p.name));
      card.appendChild(h);
      card.appendChild(el("p", "hint", p.hint));
      var files = el("div", "files");
      var items = info.byPlatform[p.id] || [];
      if (!items.length) {
        files.appendChild(el("p", "meta", "Not available in this release."));
      }
      items.forEach(function (it) {
        var meta = ARCH[it.arch];
        var title = it.arch === "universal" ? "Download " + p.name : p.name + " " + meta.label;
        files.appendChild(fileLink(it.asset, title, meta.text));
      });
      card.appendChild(files);
      grid.appendChild(card);
    });
    return { grid: grid, other: info.other };
  }

  function releaseHead(release, isLatest) {
    var head = el("div", "release-head");
    head.appendChild(el("h2", "", release.name || release.tag_name));
    if (isLatest) head.appendChild(el("span", "tag latest", "Latest"));
    if (release.prerelease) head.appendChild(el("span", "tag pre", "Pre-release"));
    return head;
  }

  function notesBlock(release) {
    var box = el("div", "notes");
    box.appendChild(el("h4", "", "What's new"));
    var md = el("div", "md");
    md.innerHTML = release.body && release.body.trim() ? markdown(release.body) : "<p>No release notes were written for this version.</p>";
    box.appendChild(md);
    return box;
  }

  function pickLatest(list) {
    for (var i = 0; i < list.length; i++) if (!list[i].prerelease) return list[i];
    return list[0] || null;
  }

  function showError(root, message) {
    root.textContent = "";
    var s = el("div", "state");
    s.appendChild(el("b", "", message));
    var p = el("p", "");
    p.appendChild(document.createTextNode("You can always get every version from the "));
    var a = el("a", "", "GitHub releases page");
    a.href = "https://github.com/" + REPO + "/releases";
    a.rel = "noopener";
    p.appendChild(a);
    p.appendChild(document.createTextNode("."));
    s.appendChild(p);
    root.appendChild(s);
  }

  function initDownload(root) {
    loadReleases().then(function (list) {
      root.textContent = "";
      var latest = pickLatest(list);
      if (!latest) { showError(root, "The first release has not been published yet."); return; }
      var head = releaseHead(latest, true);
      root.appendChild(head);
      var meta = el("p", "meta");
      meta.textContent = "Version " + latest.tag_name.replace(/^v/, "") + " · " + fmtDate(latest.published_at || latest.created_at) + " · ";
      var all = el("a", "", "All releases");
      all.href = "/releases/";
      meta.appendChild(all);
      root.appendChild(meta);
      var built = platformCards(latest);
      root.appendChild(built.grid);
      if (built.other.length) {
        var more = el("div", "files");
        more.style.marginTop = "16px";
        built.other.forEach(function (a) { more.appendChild(fileLink(a, a.name, "Additional file")); });
        root.appendChild(more);
      }
      root.appendChild(notesBlock(latest));
    }).catch(function () {
      showError(root, "The release list could not be loaded right now.");
    });
  }

  function initReleases(root) {
    loadReleases().then(function (list) {
      root.textContent = "";
      if (!list.length) { showError(root, "The first release has not been published yet."); return; }
      var latest = pickLatest(list);
      list.forEach(function (r) {
        var d = el("details", "rel");
        if (r === latest) d.open = true;
        var s = el("summary");
        s.appendChild(el("b", "", r.name || r.tag_name));
        if (r === latest) s.appendChild(el("span", "tag latest", "Latest"));
        if (r.prerelease) s.appendChild(el("span", "tag pre", "Pre-release"));
        s.appendChild(el("span", "meta", fmtDate(r.published_at || r.created_at)));
        var ch = el("span", "chev");
        ch.innerHTML = ICONS.chev;
        s.appendChild(ch);
        d.appendChild(s);
        var body = el("div", "body");
        body.appendChild(notesBlock(r));
        var built = platformCards(r);
        body.appendChild(built.grid);
        var gh = el("a", "btn small", "Open on GitHub");
        gh.href = r.html_url;
        gh.rel = "noopener";
        body.appendChild(gh);
        d.appendChild(body);
        root.appendChild(d);
      });
    }).catch(function () {
      showError(root, "The release list could not be loaded right now.");
    });
  }

  var dl = document.getElementById("download-root");
  if (dl) initDownload(dl);
  var rl = document.getElementById("releases-root");
  if (rl) initReleases(rl);

  window.RebaxReleases = { markdown: markdown, classify: classify };
})();
