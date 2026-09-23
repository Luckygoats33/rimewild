/* Booking + shared UI behavior.
   Deliveries go to will@supportwellnessglobal.com via the visitor's email app.
   To switch on Formspree, set RIMEWILD_FORMSPREE to a real endpoint:
   window.RIMEWILD_FORMSPREE = "https://formspree.io/f/xxxxxxxx";
*/
(function () {
  var BOOKING_EMAIL = "will@supportwellnessglobal.com";

  function formspreeEndpoint() {
    var url = (window.RIMEWILD_FORMSPREE || "").trim();
    return /^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(url) ? url : "";
  }

  function closeNav() {
    var links = document.getElementById("navLinks");
    var toggle = document.getElementById("navToggle");
    if (links) links.classList.remove("open");
    document.body.classList.remove("nav-open");
    if (toggle) {
      toggle.innerHTML = "&#9776;";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    }
  }

  function enhanceNav() {
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");
    if (!toggle || !links) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "navLinks");
    toggle.setAttribute("aria-label", "Open menu");
    toggle.addEventListener("click", function () {
      var open = links.classList.contains("open");
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (open) {
        var first = links.querySelector("a");
        if (first) first.focus();
      }
    });
    links.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setTimeout(closeNav, 0);
      });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (links.classList.contains("open")) closeNav();
      if (document.getElementById("bookingOverlay") && document.getElementById("bookingOverlay").classList.contains("show")) {
        if (typeof window.closeBooking === "function") window.closeBooking();
      }
    });
  }

  function readFields(form) {
    var rows = [];
    var email = "";
    var name = "";
    var trip = "";
    form.querySelectorAll("input, select, textarea").forEach(function (el) {
      if (el.type === "submit" || el.type === "button") return;
      if (!el.name && el.id) el.name = el.id;
      var labelEl = el.id ? form.querySelector('label[for="' + el.id + '"]') : null;
      var label = labelEl ? labelEl.textContent.replace(/\s+/g, " ").trim() : (el.name || "Field");
      var value = (el.value || "").trim();
      if (el.tagName === "SELECT" && el.selectedIndex >= 0) {
        value = el.options[el.selectedIndex].text.replace(/\s+/g, " ").trim();
      }
      if (el.id === "bEmail") email = (el.value || "").trim();
      if (el.id === "bName") name = (el.value || "").trim();
      if (el.id === "bTrip") trip = value;
      rows.push(label + ": " + (value || "—"));
    });
    rows.push("Page: " + location.href);
    return { rows: rows, email: email, name: name, trip: trip };
  }

  function mailtoUrl(fields) {
    var subject = "Rimewild booking: " + (fields.trip || "Trip request");
    if (fields.name) subject += " — " + fields.name;
    var body = [
      "Please confirm this Rimewild trip request.",
      "",
      fields.rows.join("\n"),
      "",
      "Reply to: " + (fields.email || "(no email given)")
    ].join("\n");
    return "mailto:" + BOOKING_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  function showPanel(form, fields, mode) {
    var wrap = document.getElementById("bookingForm");
    var panel = document.getElementById("bookingSuccess");
    if (!wrap || !panel) return;
    var url = mailtoUrl(fields);
    var heading = mode === "formspree" ? "Request sent" : "Your email app should open";
    var lead = mode === "formspree"
      ? "This request was sent to " + BOOKING_EMAIL + ". We’ll reply to confirm the date."
      : "Nothing is booked until you send the message in your email app. It is addressed to " + BOOKING_EMAIL + ".";
    panel.innerHTML =
      '<div class="form-success">' +
        "<h3>" + heading + "</h3>" +
        '<p style="color:var(--text-dim)">' + lead + "</p>" +
        (mode === "mailto"
          ? '<a class="btn btn-gold" href="' + url.replace(/"/g, "&quot;") + '">Open email again</a>'
          : "") +
        '<pre class="booking-preview">' + fields.rows.map(escapeHtml).join("\n") + "</pre>" +
        '<button class="btn btn-ghost" type="button" onclick="closeBooking()">Close</button>' +
      "</div>";
    wrap.hidden = true;
    panel.hidden = false;
    if (mode === "mailto") {
      var openMail = window.RIMEWILD_OPEN_MAIL || function (href) { window.location.href = href; };
      openMail(url);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function submitBooking(event) {
    if (event && event.preventDefault) event.preventDefault();
    var form = event && event.target ? event.target : document.querySelector("form.booking-request");
    if (!form || typeof form.reportValidity !== "function" || !form.reportValidity()) return false;
    var fields = readFields(form);
    var endpoint = formspreeEndpoint();
    var button = form.querySelector('[type="submit"]');
    if (!endpoint) {
      showPanel(form, fields, "mailto");
      return false;
    }
    if (button) button.disabled = true;
    fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        experience: fields.trip,
        name: fields.name,
        email: fields.email,
        _replyto: fields.email,
        _subject: "Rimewild booking: " + (fields.trip || "Trip request"),
        message: fields.rows.join("\n")
      })
    }).then(function (res) {
      if (!res.ok) throw new Error("Formspree rejected the request");
      showPanel(form, fields, "formspree");
    }).catch(function () {
      showPanel(form, fields, "mailto");
    }).finally(function () {
      if (button) button.disabled = false;
    });
    return false;
  }

  function annotateForms() {
    document.querySelectorAll("form.booking-request, #bookingForm form").forEach(function (form) {
      form.classList.add("booking-request");
      form.setAttribute("action", "mailto:" + BOOKING_EMAIL);
      form.setAttribute("method", "POST");
      form.setAttribute("enctype", "text/plain");
      form.setAttribute("onsubmit", "return submitBooking(event)");
      if (!form.querySelector(".booking-send-note")) {
        var note = document.createElement("p");
        note.className = "booking-send-note";
        note.innerHTML = "Opens your email app with this request addressed to <a href=\"mailto:" + BOOKING_EMAIL + "\">" + BOOKING_EMAIL + "</a>. You still need to send the message. Guide phone is not listed yet.";
        var submit = form.querySelector('[type="submit"]');
        if (submit) submit.insertAdjacentElement("afterend", note);
      }
    });
    var phone = document.getElementById("bPhone");
    if (phone && phone.placeholder.indexOf("555") !== -1) phone.placeholder = "Your number (optional)";
    var name = document.getElementById("bName");
    var email = document.getElementById("bEmail");
    if (name) name.setAttribute("autocomplete", "name");
    if (email) email.setAttribute("autocomplete", "email");
    if (phone) phone.setAttribute("autocomplete", "tel");
  }

  function keyboardCards() {
    document.querySelectorAll(".river-card, .faq-item, .type-chip, .cal-trip").forEach(function (el) {
      if (el.tabIndex < 0) return;
      if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
      if (!el.getAttribute("role")) el.setAttribute("role", "button");
      el.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          el.click();
        }
      });
    });
  }

  var previousOpen = window.openBooking;
  window.openBooking = function () {
    closeNav();
    if (typeof previousOpen === "function") previousOpen.apply(this, arguments);
    var panel = document.getElementById("bookingSuccess");
    var wrap = document.getElementById("bookingForm");
    if (panel) panel.hidden = true;
    if (wrap) wrap.hidden = false;
  };
  window.submitBooking = submitBooking;

  function boot() {
    enhanceNav();
    annotateForms();
    keyboardCards();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
