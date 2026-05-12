var args = parseArgs($argument || "");
var setup = normalizeSetup(args);
var baseUrl = setup.baseUrl;
var token = setup.token;

if (!baseUrl || !token || token === "PASTE_TOKEN_HERE") {
  $done({
    title: "VPS Watch",
    content: "Open module arguments and fill BASEURL + TOKEN",
    style: "error",
    icon: "exclamationmark.triangle.fill"
  });
} else {
  $httpClient.get({
    url: baseUrl + "/api/public/panel",
    headers: {
      "Accept": "application/json",
      "X-API-Token": token,
      "Authorization": "Bearer " + token
    }
  }, function (error, response, data) {
    if (error || !data) {
      $done({
        title: "VPS Watch",
        content: String(error || "No response"),
        style: "error",
        icon: "wifi.exclamationmark"
      });
      return;
    }
    try {
      var payload = JSON.parse(data);
      $done({
        title: payload.title || "VPS Watch",
        content: payload.content || "-",
        style: payload.style || "info",
        icon: payload.icon || "antenna.radiowaves.left.and.right",
        "icon-color": iconColor(payload.style)
      });
    } catch (e) {
      $done({
        title: "VPS Watch",
        content: "Bad JSON: " + e.message,
        style: "error",
        icon: "xmark.octagon.fill"
      });
    }
  });
}

function iconColor(style) {
  if (style === "error") return "#BD2F42";
  if (style === "alert") return "#B67812";
  if (style === "good") return "#087F7A";
  return "#4856C7";
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
