/* The contact form: your message goes to Max at Clients.ai (hi@clients.ai), who answers by email.
   If that can't be reached, the form says so and offers the plain email instead. */
(function () {
  var API = "https://clientsai-bjio8.ondigitalocean.app";
  var TS = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  var loading = null;
  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (!loading) loading = new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = TS; s.async = true;
      s.onload = function () { window.turnstile ? res(window.turnstile) : rej(new Error("x")); };
      s.onerror = function () { loading = null; rej(new Error("x")); };
      document.head.appendChild(s);
    });
    return loading;
  }
  function token(siteKey, box) {
    return loadTurnstile().then(function (ts) {
      return new Promise(function (res, rej) {
        var el = document.createElement("div"); box.appendChild(el);
        var id;
        function done(fn, v) { try { ts.remove(id); } catch (e) {} el.remove(); fn(v); }
        id = ts.render(el, { sitekey: siteKey, appearance: "interaction-only",
          callback: function (t) { done(res, t); },
          "error-callback": function () { done(rej, new Error("check")); },
          "timeout-callback": function () { done(rej, new Error("check")); } });
      });
    });
  }
  function mount(root) {
    var form = root.querySelector("form"), msg = root.querySelector("[data-msg]"), btn = form.querySelector("button[type=submit]"), box = root.querySelector("[data-check]");
    function say(text, ok) { msg.textContent = text; msg.style.color = ok ? "#111827" : "#B91C1C"; msg.hidden = false; }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.name.value.trim(), email = form.email.value.trim(), message = form.message.value.trim();
      if (!name) return say("Please enter your name", false);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say("Please enter a valid email address", false);
      if (!message) return say("Please enter a message", false);
      btn.disabled = true; btn.textContent = "Sending…"; msg.hidden = true;
      var fail = function () {
        btn.disabled = false; btn.textContent = "Send message";
        msg.innerHTML = 'We couldn’t send that just now — please email <a href="mailto:hi@clients.ai" style="color:#7B5BA6;font-weight:600;">hi@clients.ai</a> and we’ll get it there.';
        msg.style.color = "#111827"; msg.hidden = false;
      };
      fetch(API + "/api/public-chat/status").then(function (r) { return r.json(); }).then(function (st) {
        if (!st || !st.enabled || !st.siteKey) return fail();
        return token(st.siteKey, box).then(function (t) {
          return fetch(API + "/api/public-chat/contact", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ turnstile: t, name: name, email: email, message: message, page: location.pathname }) });
        }).then(function (r) {
          if (r.status === 429) { btn.disabled = false; btn.textContent = "Send message"; return say("That's a lot of messages at once — try again in a little while.", false); }
          return r.json().then(function (d) {
            if (!r.ok || d.code !== "sent") return fail();
            form.hidden = true; form.style.display = "none";
            say(d.to === "max" ? "Thanks — you’ll get a reply by email shortly." : "Thanks — we'll get back to you by email shortly.", true);
          });
        });
      }).catch(fail);
    });
  }
  function start() { var els = document.querySelectorAll("[data-max-contact]"); for (var i = 0; i < els.length; i++) mount(els[i]); }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
})();
