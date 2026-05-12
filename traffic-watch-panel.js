var args = parseArgs($argument || "");
var setup = normalizeSetup(args);
var baseUrl = setup.baseUrl;
var token = setup.token;
var CACHE_KEY = "vpswatch.panel.cache";

if (!baseUrl || !token || token === "PASTE_TOKEN_HERE") {
  $done({
    title: "VPS Watch",
    content: "请在模块参数填写 BASEURL + TOKEN；若 Surge 只显示一个框，可填 https://host?token=xxx&device=iPhone",
    style: "error",
    icon: "exclamationmark.triangle.fill"
  });
} else {
  $httpClient.get({
    url: baseUrl + "/api/public/panel",
    headers: authHeaders()
  }, function (error, response, data) {
    if (error || !data) {
      useCache(error || "No response");
      return;
    }
    try {
      var payload = JSON.parse(data);
      var panel = buildPanel(payload);
      writeStore(CACHE_KEY, JSON.stringify({ time: Date.now(), panel: panel }));
      $done(panel);
    } catch (e) {
      useCache("Bad JSON: " + e.message);
    }
  });
}

function buildPanel(payload) {
  var snap = payload.payload || {};
  var current = snap.current || {};
  var system = current.system || {};
  var alerts = activeAlerts(snap.alerts || []);
  var warnings = (snap.security && snap.security.warnings) || [];
  var providers = snap.providers || [];
  var lines = [];

  if (current.timestamp) {
    var totalMbps = num((current.rxMbps || 0) + (current.txMbps || 0), 1);
    var localGb = num((snap.localUsage || 0) / 1e9, 2);
    var limitGb = num((snap.monthlyLimit || 0) / 1e9, 2);
    var usedPct = snap.monthlyLimit ? num((snap.localUsage / snap.monthlyLimit) * 100, 1) : "0.0";
    lines.push("吞吐 " + totalMbps + " Mbps | 已用 " + localGb + " / " + limitGb + " GB (" + usedPct + "%)");
    lines.push("CPU " + num(system.cpuPercent, 1) + "%  MEM " + num(system.memUsedPercent, 1) + "%  TCP " + num(system.tcpEstablished, 0));
    if (system.load1) lines.push("负载 " + num(system.load1, 2) + " / " + num(system.load5, 2) + " / " + num(system.load15, 2));
    if (system.diskUsedPercent) lines.push("磁盘 " + num(system.diskUsedPercent, 1) + "% free " + num((system.diskFreeBytes || 0) / 1e9, 1) + " GB");
  }

  if (providers.length) {
    var p = providers[0];
    if (p.name && p.usedBytes) {
      var drift = p.comparePercent != null ? num(p.comparePercent, 1) : "--";
      var source = p.source ? " · " + p.source : "";
      lines.push("对账 " + p.name + source + " | 差异 " + drift + "%");
    }
  }

  if (alerts.length) lines.push("待处理风险 " + alerts.length + " 项");
  if (warnings.length) lines.push("安全提醒 " + warnings.length + " 项");

  return {
    title: (snap.current && snap.current.nodeName) || payload.title || "VPS Watch",
    content: lines.length ? lines.join("\n") : (payload.content || "-"),
    style: panelStyle(payload.style, alerts),
    icon: payload.icon || panelIcon(alerts),
    "icon-color": iconColor(panelStyle(payload.style, alerts))
  };
}

function activeAlerts(items) {
  return items.filter(function (item) { return !item.resolved; });
}

function panelStyle(style, alerts) {
  for (var i = 0; i < alerts.length; i += 1) {
    if (alerts[i].severity === "critical" || alerts[i].severity === "error") return "error";
  }
  if (alerts.length) return "alert";
  return style || "good";
}

function panelIcon(alerts) {
  return alerts.length ? "exclamationmark.triangle.fill" : "antenna.radiowaves.left.and.right";
}

function useCache(reason) {
  var cached = readStore(CACHE_KEY);
  if (cached) {
    try {
      var parsed = JSON.parse(cached);
      var panel = parsed.panel || {};
      var ageMin = Math.max(0, Math.round((Date.now() - Number(parsed.time || 0)) / 60000));
      panel.title = (panel.title || "VPS Watch") + " · Cache";
      panel.content = (panel.content || "-") + "\n离线缓存 " + ageMin + " 分钟 · " + shortText(reason);
      panel.style = "alert";
      panel.icon = "wifi.exclamationmark";
      panel["icon-color"] = iconColor("alert");
      $done(panel);
      return;
    } catch (e) {}
  }
  $done({
    title: "VPS Watch",
    content: shortText(reason),
    style: "error",
    icon: "wifi.exclamationmark",
    "icon-color": iconColor("error")
  });
}

function authHeaders() {
  return {
    "Accept": "application/json",
    "X-API-Token": token,
    "Authorization": "Bearer " + token
  };
}

function num(value, digits) {
  var n = Number(value || 0);
  return n.toFixed(digits);
}

function shortText(value) {
  var text = String(value || "");
  return text.length > 80 ? text.slice(0, 77) + "..." : text;
}

function iconColor(style) {
  if (style === "error") return "#E0556A";
  if (style === "alert") return "#E2A33B";
  if (style === "good") return "#3BA99C";
  return "#5B8DEF";
}

function readStore(key) {
  if (typeof $persistentStore === "undefined") return "";
  return $persistentStore.read(key) || "";
}

function writeStore(key, value) {
  if (typeof $persistentStore === "undefined") return false;
  return $persistentStore.write(value, key);
}

function parseArgs(input) {
  var out = {};
  input.split("&").forEach(function (pair) {
    var index = pair.indexOf("=");
    if (index < 0) return;
    var key = decodeURIComponent(pair.slice(0, index));
    var value = decodeURIComponent(pair.slice(index + 1));
    out[key] = value;
  });
  return out;
}

function normalizeSetup(args) {
  var rawBase = args.baseUrl || args.baseurl || "";
  var embedded = parseBaseUrl(rawBase);
  return {
    baseUrl: trimSlash(embedded.baseUrl || rawBase),
    token: args.token || args.TOKEN || embedded.token || ""
  };
}

function parseBaseUrl(value) {
  var raw = String(value || "");
  var out = { baseUrl: raw };
  var pipeParts = raw.split("|");
  if (pipeParts.length >= 2) {
    out.baseUrl = pipeParts[0];
    out.token = pipeParts[1];
    return out;
  }
  var q = raw.indexOf("?");
  if (q < 0) return out;
  out.baseUrl = raw.slice(0, q);
  var query = parseArgs(raw.slice(q + 1));
  out.token = query.token || query.TOKEN || query.apiToken || query.apitoken || "";
  return out;
}

function trimSlash(value) {
  return String(value).replace(/\/+$/, "");
}
