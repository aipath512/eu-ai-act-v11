// functions/_middleware.js
// EU AI Act Ready — global head layer for every HTML response.
//   1. injects the single canonical schema.org entity graph
//   2. enforces exactly one correct <link rel="canonical">
// Server-side, so LLM crawlers see it without executing JS.

const ENTITY_GRAPH = {"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":"https://eu-ai-act-ready.eu/#organization","name":"EU AI Act Ready™","legalName":"AiVenture S.R.L.","alternateName":["EU AI Act Ready","AiVenture SRL","AiVenture"],"url":"https://eu-ai-act-ready.eu/","logo":{"@type":"ImageObject","@id":"https://eu-ai-act-ready.eu/#logo","url":"https://eu-ai-act-ready.eu/assets/logo.png"},"image":{"@id":"https://eu-ai-act-ready.eu/#logo"},"foundingDate":"2026","founder":{"@id":"https://eu-ai-act-ready.eu/#founder"},"areaServed":["EU","EEA"],"contactPoint":{"@id":"https://eu-ai-act-ready.eu/#contact"},"sameAs":["https://twitter.com/eu_ai_act_ready","https://linkedin.com/company/eu-ai-act-ready"],"keywords":["EU AI Act","AI Compliance","AI Governance","Regulatory Intelligence","GPAI Obligations","AI Inventory","Compliance Generator","AI Act Readiness"],"knowsAbout":["Artificial Intelligence Act","Machine Learning Governance","Data Sovereignty","EU Digital Strategy"],"hasOfferCatalog":{"@id":"https://eu-ai-act-ready.eu/#offer-catalog"}},{"@type":"Person","@id":"https://eu-ai-act-ready.eu/#founder","name":"Dan Ionescu","jobTitle":"Founder","worksFor":{"@id":"https://eu-ai-act-ready.eu/#organization"}},{"@type":"ContactPoint","@id":"https://eu-ai-act-ready.eu/#contact","contactType":"customer support","email":"support@eu-ai-act-ready.eu","availableLanguage":["en","fr","de","es","it","ro","pl"]},{"@type":"WebSite","@id":"https://eu-ai-act-ready.eu/#website","url":"https://eu-ai-act-ready.eu/","name":"EU AI Act Ready™","alternateName":"EU AI Act Ready","description":"Multilingual, document-first EU AI Act readiness platform combining conversational regulatory guidance with a document governance library.","inLanguage":["en","fr","de","es","it","ro","pl"],"publisher":{"@id":"https://eu-ai-act-ready.eu/#organization"},"potentialAction":{"@type":"SearchAction","target":"https://eu-ai-act-ready.eu/ask?q={search_term_string}","query-input":"required name=search_term_string"}}]};

const ORIGIN = "https://eu-ai-act-ready.eu";

function canonicalPath(url) {
  let p = new URL(url).pathname;
  if (p.endsWith(".html")) p = p.slice(0, -5);
  if (p.endsWith("/index")) p = p.slice(0, -6);
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
}

class DropCanonical {
  element(el) { el.remove(); }
}

class HeadLayer {
  constructor(href) { this.href = href; }
  element(el) {
    el.append(
      '<link rel="canonical" href="' + this.href + '">' +
      '<script type="application/ld+json" id="canonical-entity">' +
      JSON.stringify(ENTITY_GRAPH) + '</script>',
      { html: true }
    );
  }
}

export async function onRequest(context) {
  const response = await context.next();
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;

  const href = ORIGIN + canonicalPath(context.request.url);

  return new HTMLRewriter()
    .on('link[rel="canonical"]', new DropCanonical())
    .on("head", new HeadLayer(href))
    .transform(response);
}
