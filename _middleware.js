// functions/_middleware.js
// EU AI Act Ready — global head layer + language routing.
//   1. canonical entity graph on every page
//   2. exactly one correct <link rel="canonical">
//   3. real language URLs (/ro/, /fr/, /de/ ...) with hreflang
// Server-side. One file. No per-page edits.

const ENTITY_GRAPH = {"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":"https://eu-ai-act-ready.eu/#organization","name":"EU AI Act Ready™","legalName":"AiVenture S.R.L.","alternateName":["EU AI Act Ready","AiVenture SRL","AiVenture"],"url":"https://eu-ai-act-ready.eu/","logo":{"@type":"ImageObject","@id":"https://eu-ai-act-ready.eu/#logo","url":"https://eu-ai-act-ready.eu/assets/logo.png"},"image":{"@id":"https://eu-ai-act-ready.eu/#logo"},"foundingDate":"2026","founder":{"@id":"https://eu-ai-act-ready.eu/#founder"},"areaServed":["EU","EEA"],"contactPoint":{"@id":"https://eu-ai-act-ready.eu/#contact"},"sameAs":["https://twitter.com/eu_ai_act_ready","https://linkedin.com/company/eu-ai-act-ready"],"keywords":["EU AI Act","AI Compliance","AI Governance","Regulatory Intelligence","GPAI Obligations","AI Inventory","Compliance Generator","AI Act Readiness"],"knowsAbout":["Artificial Intelligence Act","Machine Learning Governance","Data Sovereignty","EU Digital Strategy"],"hasOfferCatalog":{"@id":"https://eu-ai-act-ready.eu/#offer-catalog"}},{"@type":"Person","@id":"https://eu-ai-act-ready.eu/#founder","name":"Dan Ionescu","jobTitle":"Founder","worksFor":{"@id":"https://eu-ai-act-ready.eu/#organization"}},{"@type":"ContactPoint","@id":"https://eu-ai-act-ready.eu/#contact","contactType":"customer support","email":"support@eu-ai-act-ready.eu","availableLanguage":["en","fr","de","es","it","ro","pl"]},{"@type":"WebSite","@id":"https://eu-ai-act-ready.eu/#website","url":"https://eu-ai-act-ready.eu/","name":"EU AI Act Ready™","alternateName":"EU AI Act Ready","description":"Multilingual, document-first EU AI Act readiness platform combining conversational regulatory guidance with a document governance library.","inLanguage":["en","fr","de","es","it","ro","pl"],"publisher":{"@id":"https://eu-ai-act-ready.eu/#organization"},"potentialAction":{"@type":"SearchAction","target":"https://eu-ai-act-ready.eu/ask?q={search_term_string}","query-input":"required name=search_term_string"}}]};

const ORIGIN = "https://eu-ai-act-ready.eu";

// Languages each page ACTUALLY has translations for — read from the
// i18n objects in the files. Do not inflate this.
const COVERAGE = {
  "/": [
    "bg",
    "cs",
    "da",
    "de",
    "el",
    "en",
    "es",
    "fi",
    "fr",
    "hu",
    "it",
    "nl",
    "pl",
    "pt",
    "ro",
    "sk",
    "sv"
  ],
  "/demo": [
    "de",
    "en",
    "es",
    "fr",
    "it",
    "pl",
    "ro"
  ],
  "/why": [
    "en",
    "fr",
    "ro"
  ]
};

const ALL_LANGS = ["bg","cs","da","de","el","en","es","fi","fr","hu",
                   "it","nl","pl","pt","ro","sk","sv"];

function normalise(p) {
  if (p.endsWith(".html")) p = p.slice(0, -5);
  if (p.endsWith("/index")) p = p.slice(0, -6);
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

function split(pathname) {
  const p = normalise(pathname);
  const m = p.match(/^\/([a-z]{2})(\/.*)?$/);
  if (m && ALL_LANGS.includes(m[1]) && m[1] !== "en") {
    return { lang: m[1], base: normalise(m[2] || "/") };
  }
  return { lang: "en", base: p };
}

function langHref(lang, base) {
  if (lang === "en") return ORIGIN + base;
  return ORIGIN + "/" + lang + (base === "/" ? "" : base);
}

const BOOT = "(function(){\n  var L=\"__LANG__\";\n  function apply(){\n    try{\n      var b=document.querySelector('.lang-btn[data-lang=\"'+L+'\"]');\n      if(b){b.click();return true;}\n      var s=document.getElementById(\"langSelectNew\");\n      if(s){s.value=L;s.dispatchEvent(new Event(\"change\",{bubbles:true}));return true;}\n      if(typeof applyLanguage===\"function\"){applyLanguage(L);return true;}\n    }catch(e){console.warn(\"[lang] \",e);}\n    return false;\n  }\n  function run(){ if(!apply()){ setTimeout(apply,400); setTimeout(apply,1500); } }\n  if(document.readyState===\"loading\")document.addEventListener(\"DOMContentLoaded\",run);\n  else run();\n})();";

class DropCanonical { element(el) { el.remove(); } }

class HeadLayer {
  constructor(lang, base) { this.lang = lang; this.base = base; }
  element(el) {
    const langs = COVERAGE[this.base] || ["en"];
    let tags = '<link rel="canonical" href="' + langHref(this.lang, this.base) + '">';
    if (langs.length > 1) {
      for (const l of langs) {
        tags += '<link rel="alternate" hreflang="' + l +
                '" href="' + langHref(l, this.base) + '">';
      }
      tags += '<link rel="alternate" hreflang="x-default" href="' +
              langHref("en", this.base) + '">';
    }
    tags += '<script type="application/ld+json" id="canonical-entity">' +
            JSON.stringify(ENTITY_GRAPH) + '</script>';
    el.append(tags, { html: true });
  }
}

class HtmlLang {
  constructor(lang) { this.lang = lang; }
  element(el) { el.setAttribute("lang", this.lang); }
}

// Clicks the page's own language button, the same path a visitor uses.
class BodyLangBoot {
  constructor(lang) { this.lang = lang; }
  element(el) {
    if (this.lang === "en") return;
    el.append("<script>" + BOOT.replace("__LANG__", this.lang) + "</script>",
              { html: true });
  }
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const { lang, base } = split(url.pathname);

  let response;
  if (lang !== "en" && COVERAGE[base]) {
    const target = new URL(url);
    target.pathname = base;
    response = await context.env.ASSETS.fetch(new Request(target, context.request));
  } else {
    response = await context.next();
  }

  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;

  return new HTMLRewriter()
    .on("html", new HtmlLang(lang))
    .on('link[rel="canonical"]', new DropCanonical())
    .on("head", new HeadLayer(lang, base))
    .on("body", new BodyLangBoot(lang))
    .transform(response);
}
