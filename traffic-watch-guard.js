var args = parseArgs($argument || "");
var setup = normalizeSetup(args);
var baseUrl = setup.baseUrl;
var token = setup.token;
var device = setup.device || "Surge";

if (!baseUrl || !token || token === "PASTE_TOKEN_HERE") {
  respond(500, "VPS Watch", "Open module arguments and fill BASEURL + TOKEN");
} else {
  postReport();
  $httpClient.get({
    url: baseUrl + "/api/public/panel",
    headers: {
      "Accept": "application/json",
      "X-API-Token": token,
      "Authorization": "Bearer " + token
    }
  }, function (error, response, data) {
    if (error || !data) {
      respond(502, "VPS Watch", String(error || "No response"));
      return;
    }
    try {
      var payload = JSON.parse(data);
      respond(200, payload.title || "VPS Watch", payload.content || "-");
    } catch (e) {
      respond(502, "VPS Watch", e.message);
    }
  });
}

function postReport() {
  var body = {
    time: new Date().toISOString(),
    device: device,
    network: networkName(),
    policy: "",
    clientIp: "",
    userAgent: $request && $request.headers ? ($request.headers["User-Agent"] || "") : "",
    trigger: "manual",
    message: "Surge guard opened",
    extra: {
      url: $request ? $request.url : ""
    }
  };
  $httpClient.post({
    url: baseUrl + "/api/surge/report",
    headers: {
      "Content-Type": "application/json",
      "X-API-Token": token,
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify(body)
  }, function () {});
}

function respond(status, title, content) {
  var html = "<!doctype html><meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;margin:0;padding:22px;background:#f6f7f9;color:#10141d}" +
    "main{background:#fff;border:1px solid #dfe3ea;border-radius:8px;padding:18px;box-shadow:0 12px 34px rgba(33,38,50,.08)}" +
    "h1{font-size:22px;margin:0 0 12px}pre{white-space:pre-wrap;line-height:1.45;color:#273042}</style>" +
    "<main><h1>" + escapeHtml(title) + "</h1><pre>" + escapeHtml(content) + "</pre></main>";
  $done({
    response: {
      status: status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: html
    }
  });
}

function networkName() {
  if (typeof $network !== "undefined" && $network.wifi && $network.wifi.ssid) {
    return $network.wifi.ssid;
  }
  return "cellular-or-unknown";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, function (c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
  });
}

function parseArgs(input) {
  var out = {};
  input.split("&").forEach(function (pair) {
    var index = pair.indexOf("=");
    if (index < 0) return;
    out[decodeURIComponent(pair.slice(0, index))] = decodeURIComponent(pair.slice(index + 1));
  });
  return out;
}

function normalizeSetup(args) {
  var rawBase = args.baseUrl || args.baseurl || "";
  var embedded = parseBaseUrl(rawBase);
  return {
    baseUrl: trimSlash(embedded.baseUrl || rawBase),
    token: args.token || args.TOKEN || embedded.token || "",
    device: args.device || args.DEVICE || embedded.device || ""
  };
}

function parseBaseUrl(value) {
  var raw = String(value || "");
  var out = { baseUrl: raw };
  var pipeParts = raw.split("|");
  if (pipeParts.length >= 2) {
    out.baseUrl = pipeParts[0];
    out.token = pipeParts[1];
    out.device = pipeParts[2] || "";
    return out;
  }
  var q = raw.indexOf("?");
  if (q < 0) return out;
  out.baseUrl = raw.slice(0, q);
  var query = parseArgs(raw.slice(q + 1));
  out.token = query.token || query.TOKEN || query.apiToken || query.apitoken || "";
  out.device = query.device || query.DEVICE || "";
  return out;
}

function trimSlash(value) {
  return String(value).replace(/\/+$/, "");
}
