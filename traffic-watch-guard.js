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
    if (route.path === "/summary") {
      postSummary(function (ok, message) {
        fetchPanel(function (status, title, content, style) {
          respond(status, title, content + "\n\n" + (ok ? "已请求 Telegram 摘要" : ("Telegram 摘要失败：" + message)), ok ? style : "alert", true);
        });
      });
    } else {
      fetchPanel(function (status, title, content, style) {
        var suffix = "";
        if (report.trigger === "warning" || report.trigger === "critical") {
          suffix = "\n\n已上报：" + report.trigger + " · " + report.message;
        }
        respond(status, title, content + suffix, style, true);
      });
    }
  });
}

function buildReport(route) {
  var trigger = "status";
  if (route.path === "/warning") trigger = "warning";
  else if (route.path === "/critical") trigger = "critical";
  else if (route.path === "/summary") trigger = "telegram-summary";
  else if (route.path === "/report") trigger = route.query.trigger || "manual";

  var message = route.query.message || route.query.msg || "";
  if (!message) {
    if (trigger === "warning") message = "Surge manual warning";
    else if (trigger === "critical") message = "Surge manual critical";
    else if (trigger === "telegram-summary") message = "Surge requested Telegram summary";
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

function postSummary(done) {
  $httpClient.post({
    url: baseUrl + "/api/telegram/summary",
    headers: authHeaders(true),
    body: "{}"
  }, function (error, response, data) {
    if (error) {
      done(false, String(error));
      return;
    }
    if (!response || response.status < 200 || response.status >= 300) {
      done(false, data || ("HTTP " + (response ? response.status : 0)));
      return;
    }
    done(true, "");
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
  var tone = style === "error" ? "#E0556A" : (style === "alert" ? "#E2A33B" : "#3BA99C");
  var bg = "#0B0E13", card = "#161C26", text = "#E1E6EF", muted = "#8896A8", border = "#1E2736";
  var html = "<!doctype html><meta name='viewport' content='width=device-width,initial-scale=1,viewport-fit=cover'>" +
    "<style>body{font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;margin:0;padding:16px;background:" + bg + ";color:" + text + "}" +
    "main{background:" + card + ";border:1px solid " + border + ";border-radius:10px;padding:18px;box-shadow:0 8px 32px rgba(0,0,0,.25)}" +
    "h1{font-size:20px;line-height:1.1;margin:0 0 14px;color:" + tone + "}pre{white-space:pre-wrap;line-height:1.5;color:" + muted + ";margin:0;font-size:13px}" +
    ".actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}.actions a{display:block;text-decoration:none;text-align:center;border-radius:6px;padding:11px 8px;background:" + border + ";color:" + muted + ";font-weight:600;font-size:13px}" +
    ".actions a.primary{background:" + tone + ";color:#fff}.actions a.critical{background:#E0556A;color:#fff}@media(max-width:420px){.actions{grid-template-columns:1fr}}</style>" +
    "<main><h1>" + escapeHtml(title) + "</h1><pre>" + escapeHtml(content) + "</pre>";
  if (withActions) {
    html += "<div class='actions'>" +
      "<a class='primary' href='http://vpswatch.local/status'>刷新状态</a>" +
      "<a href='http://vpswatch.local/summary'>推送摘要</a>" +
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
