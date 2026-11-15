/* Scavenger-pikselen: forteller Scavenger når noen som kom fra scavengers.shop kjøper noe.
   1) Legg <script src="https://scavengers.shop/pixel.js" async></script> på alle sider.
   2) Kall scavengerPurchase({ orderId, amount, currency }) på «takk for kjøpet»-siden. */
(function () {
  var KEY = "scavenger_ref";
  var DAYS = 30;
  try {
    var q = new URLSearchParams(location.search);
    if (q.get("utm_source") === "shopsearch" || q.get("ref") === "shopsearch") localStorage.setItem(KEY, String(Date.now()));
  } catch (e) {}
  window.scavengerPurchase = function (order) {
    try {
      var t = Number(localStorage.getItem(KEY) || 0);
      if (!t || Date.now() - t > DAYS * 864e5 || !order) return;
      var body = JSON.stringify({
        store: location.hostname,
        orderId: String(order.orderId || ""),
        amount: Number(String(order.amount).replace(",", ".")) || 0,
        currency: String(order.currency || "NOK"),
      });
      navigator.sendBeacon("https://scavengers.shop/api/pixel", new Blob([body], { type: "text/plain" }));
      localStorage.removeItem(KEY);
    } catch (e) {}
  };
})();
