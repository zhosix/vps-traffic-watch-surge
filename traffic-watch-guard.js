var args = parseArgs($argument || "");
var setup = normalizeSetup(args);
var baseUrl = setup.baseUrl;
var token = setup.token;
var device = setup.device || "Surge";
var route = parseRoute((typeof $request !== "undefined" && $request.url) || "http://vpswatch.local/status");

if (!baseUrl || !token || token === "PASTE_TOKEN_HERE") {
  respond(500, "VPS Watch", "请在模块参数填写 BASEURL + TOKEN。若 Surge 只显示一个参数框，可把 BASEURL 写成 https://host?token=xxx&device=iPhone", "", false);
} else {
  var report = buildReport(route);
  postReport(report, function () {
    fetchPanel(function (status, title, content, style) {
      var suffix = "";
      if (report.trigger === "warning" || report.trigger === "critical") {
        suffix = "\n\n已上报：" + report.trigger + " · " + report.message;
      }
      respond(status, title, content + suffix, style, true);
    });
  });
}

function buildReport(route) {
  var trigger = "status";
  if (route.path === "/warning") trigger = "warning";
  else if (route.path === "/critical") trigger = "critical";
  else if (route.path === "/report") trigger = route.query.trigger || "manual";

  var message = route.query.message || route.query.msg || "";
  if (!message) {
    if (trigger === "warning") message = "Surge manual warning";
    else if (trigger === "critical") message = "Surge manual critical";
    else message = "Surge guard opened";
  }

  return {
    time: new Date().toISOString(),
    device: device,
    network: networkName(),
    policy: "",
    clientIp: "",
    userAgent: typeof $request !== "undefined" && $request.headers ? ($request.headers["User-Agent"] || "") : "",
    trigger: trigger,
    message: message,
    extra: {
      url: route.url,
      path: route.path,
      lastHeartbeat: readStore("vpswatch.lastHeartbeat")
    }
  };
}

function postReport(body, done) {
  $httpClient.post({
    url: baseUrl + "/api/surge/report",
    headers: authHeaders(true),
    body: JSON.stringify(body)
  }, function () {
    done();
  });
}

function fetchPanel(done) {
  $httpClient.get({
    url: baseUrl + "/api/public/panel",
    headers: authHeaders(false)
  }, function (error, response, data) {
    if (error || !data) {
      done(502, "VPS Watch", String(error || "No response"), "error");
      return;
    }
    try {
      var payload = JSON.parse(data);
      var content = payload.content || "-";
      if (payload.payload && payload.payload.security && payload.payload.security.warnings) {
        content += "\n安全提醒 " + payload.payload.security.warnings.length;
      }
      done(200, payload.title || "VPS Watch", content, payload.style || "info");
    } catch (e) {
      done(502, "VPS Watch", e.message, "error");
    }
  });
}

function respond(status, title, content, style, withActions) {
  var tone = style === "error" ? "#b72e43" : (style === "alert" ? "#aa7516" : "#0b7d77");
  var html = "<!doctype html><meta name='viewport' content='width=device-width,initial-scale=1,viewport-fit=cover'>" +
    "<style>body{font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;margin:0;padding:18px;background:#f4f5f2;color:#151820}" +
    "main{background:#fff;border:1px solid #d9ded6;border-radius:10px;padding:18px;box-shadow:0 12px 34px rgba(33,38,50,.08)}" +
    "h1{font-size:22px;line-height:1.1;margin:0 0 12px;color:" + tone + "}pre{white-space:pre-wrap;line-height:1.5;color:#273042;margin:0}" +
    ".actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:16px}.actions a{display:block;text-decoration:none;text-align:center;border-radius:8px;padding:12px 10px;background:#eef1ed;color:#151820;font-weight:700}" +
    ".actions a.primary{background:#151820;color:#fff}.actions a.critical{background:#b72e43;color:#fff}@media(max-width:420px){.actions{grid-template-columns:1fr}}</style>" +
    "<main><h1>" + escapeHtml(title) + "</h1><pre>" + escapeHtml(content) + "</pre>";
  if (withActions) {
    html += "<div class='actions'>" +
      "<a class='primary' href='http://vpswatch.local/status'>刷新状态</a>" +
      "<a href='http://vpswatch.local/warning?message=Surge%20warning'>上报提醒</a>" +
      "<a class='critical' href='http://vpswatch.local/critical?message=Surge%20critical'>上报严重</a>" +
      "<a href='http://vpswatch.local/report?trigger=manual&message=Surge%20manual%20report'>普通上报</a>" +
      "</div>";
  }
  html += "</main>";
  $done({
    response: {
      status: status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: html
    }
  });
}

function authHeaders(withJSON) {
  var headers = {
    "X-API-Token": token,
    "Authorization": "Bearer " + token
  };
  if (withJSON) headers["Content-Type"] = "application/json";
  else headers["Accept"] = "application/json";
  return headers;
}

function parseRoute(url) {
  var path = "/status";
  var query = {};
  var raw = String(url || "");
  var match = raw.match(/^https?:\/\/[^/]+([^?]*)\??(.*)$/);
  if (match) {
    path = match[1] || "/status";
    query = parseArgs(match[2] || "");
  }
  return { url: raw, path: path, query: query };
}

function networkName() {
  if (typeof $network !== "undefined" && $network.wifi && $network.wifi.ssid) {
    return $network.wifi.ssid;
  }
  return "cellular-or-unknown";
}

function readStore(key) {
  if (typeof $persistentStore === "undefined") return "";
  return $persistentStore.read(key) || "";
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
