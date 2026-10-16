/* Allround E.A. Sauer – ringzange.de
   Kleine Verbesserungen ohne Abhängigkeiten. Ohne JavaScript bleibt jede
   Seite vollständig lesbar und bedienbar. */
(function () {
  "use strict";

  /* Ziel für das Kontaktformular. Leer = Prototyp: Formular wird geprüft,
     aber nicht versendet. Für den Livebetrieb hier die Adresse eines
     Formular-Dienstes oder eines eigenen PHP-Skripts eintragen,
     z. B. "/kontakt-senden.php". */
  var FORM_ENDPOINT = "";

  var MODEL_NAMES = {
    "as-200": "AS 200",
    "as-200m20": "AS 200M20",
    "as-300": "AS 300",
    "as-900": "AS 900",
    "as-900m": "AS 900M",
    "as-2000": "AS 2000",
    "as-6000": "AS 6000",
    "as-8000": "AS 8000",
    "as-8000-akku": "AS 8000 Akku",
    "as-9000": "AS 9000",
    "ringmagazin-1": "Ringmagazin 1",
    "ringmagazin-2": "Ringmagazin 2",
    "ringmagazin-3": "Ringmagazin 3",
    "gabionenringe": "Gabionenringe",
    "gripple": "Gripple",
    "uni-driller": "Uni-Driller",
    "driller": "Driller",
    "testgeraet": "kostenloses Testgerät"
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- Navigation (Telefon) ---------- */
  var nav = $(".nav");
  var toggle = $(".nav__toggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", open ? "false" : "true");
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
    });
    nav.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.getAttribute("data-open") === "true") {
        nav.setAttribute("data-open", "false");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* ---------- Galerie + Bildbetrachter ---------- */
  var lightbox = $("#lightbox");
  var lbImg = lightbox ? $("img", lightbox) : null;
  var lbCaption = lightbox ? $(".lightbox__caption", lightbox) : null;
  var lbState = { items: [], index: 0 };

  function showInLightbox(index) {
    var item = lbState.items[index];
    if (!item) return;
    lbState.index = index;
    lbImg.src = item.full;
    lbImg.alt = item.alt;
    lbCaption.textContent = item.alt + " – Bild " + (index + 1) + " von " + lbState.items.length;
  }

  $all(".gallery").forEach(function (gallery) {
    var main = $(".gallery__main", gallery);
    var mainImg = main ? $("img", main) : null;
    var thumbs = $all(".gallery__thumb", gallery);
    if (!main || !mainImg) return;

    var items = thumbs.map(function (t) {
      return { full: t.getAttribute("data-full"), alt: t.getAttribute("data-alt") };
    });
    if (!items.length) items = [{ full: mainImg.getAttribute("src"), alt: mainImg.getAttribute("alt") }];

    function select(i) {
      thumbs.forEach(function (t, j) { t.setAttribute("aria-current", j === i ? "true" : "false"); });
      mainImg.src = items[i].full;
      mainImg.alt = items[i].alt;
      main.setAttribute("data-index", String(i));
    }

    thumbs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i); });
    });

    main.addEventListener("click", function () {
      if (!lightbox || typeof lightbox.showModal !== "function") {
        window.open(mainImg.src, "_blank");
        return;
      }
      lbState.items = items;
      showInLightbox(parseInt(main.getAttribute("data-index") || "0", 10));
      lightbox.showModal();
    });
  });

  if (lightbox) {
    $(".lightbox__prev", lightbox).addEventListener("click", function () {
      showInLightbox((lbState.index - 1 + lbState.items.length) % lbState.items.length);
    });
    $(".lightbox__next", lightbox).addEventListener("click", function () {
      showInLightbox((lbState.index + 1) % lbState.items.length);
    });
    $(".lightbox__close", lightbox).addEventListener("click", function () { lightbox.close(); });
    lightbox.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); $(".lightbox__prev", lightbox).click(); }
      if (e.key === "ArrowRight") { e.preventDefault(); $(".lightbox__next", lightbox).click(); }
    });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) lightbox.close();
    });
  }

  /* ---------- Modellfilter ---------- */
  var filter = $(".filter");
  if (filter) {
    var chips = $all(".chip", filter);
    var models = $all(".model");
    var count = $(".toolbar__count");
    var empty = $(".empty-note");
    var indexLinks = $all(".model-index a");

    function applyFilter(tag) {
      var shown = 0;
      models.forEach(function (m) {
        var tags = (m.getAttribute("data-tags") || "").split(" ");
        var visible = tag === "alle" || tags.indexOf(tag) !== -1;
        m.hidden = !visible;
        if (visible) shown++;
      });
      indexLinks.forEach(function (a) {
        var target = document.getElementById(a.getAttribute("href").slice(1));
        a.parentNode.hidden = !!(target && target.hidden);
      });
      chips.forEach(function (c) { c.setAttribute("aria-pressed", c.getAttribute("data-filter") === tag ? "true" : "false"); });
      if (count) count.textContent = shown === 1 ? "1 Modell" : shown + " Modelle";
      if (empty) empty.hidden = shown !== 0;
    }

    chips.forEach(function (c) {
      c.addEventListener("click", function () { applyFilter(c.getAttribute("data-filter")); });
    });

    // Sprung auf ein Modell, das gerade ausgefiltert ist: Filter zurücksetzen.
    window.addEventListener("hashchange", function () {
      var el = document.getElementById(location.hash.slice(1));
      if (el && el.classList.contains("model") && el.hidden) {
        applyFilter("alle");
        el.scrollIntoView();
      }
    });
  }

  /* ---------- In die Zwischenablage kopieren ---------- */
  $all(".copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var value = btn.getAttribute("data-copy");
      var label = btn.textContent;
      function done(text) {
        btn.textContent = text;
        setTimeout(function () { btn.textContent = label; }, 1800);
      }
      function fallback() {
        var target = document.getElementById(btn.getAttribute("data-target"));
        if (target && window.getSelection) {
          var range = document.createRange();
          range.selectNodeContents(target);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          done("Markiert");
        }
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).then(function () { done("Kopiert"); }, fallback);
        } else {
          fallback();
        }
      } catch (err) {
        fallback();
      }
    });
  });

  /* ---------- Kontaktformular ---------- */
  var form = $("#kontaktformular");
  if (form) {
    form.setAttribute("novalidate", "");
    var subject = $("#betreff", form);
    var hash = location.hash.slice(1);
    if (hash.indexOf("betreff-") === 0 && subject && !subject.value) {
      var key = hash.slice(8);
      if (MODEL_NAMES[key]) {
        subject.value = key === "testgeraet" ? "Anfrage: kostenloses Testgerät" : "Anfrage zu " + MODEL_NAMES[key];
      }
    }

    var summary = $(".form__summary", form);

    function setError(input, message) {
      var err = document.getElementById(input.id + "-fehler");
      if (message) {
        input.setAttribute("aria-invalid", "true");
        if (err) { err.textContent = message; err.hidden = false; }
      } else {
        input.removeAttribute("aria-invalid");
        if (err) { err.textContent = ""; err.hidden = true; }
      }
    }

    function validate() {
      var problems = [];
      var first = null;
      function check(input, ok, message) {
        setError(input, ok ? "" : message);
        if (!ok) { problems.push(message); if (!first) first = input; }
      }
      var vorname = $("#vorname", form);
      var nachname = $("#nachname", form);
      var telefon = $("#telefon", form);
      var email = $("#email", form);
      var consent = $("#einwilligung", form);
      var emailValue = email.value.trim();
      var phoneValue = telefon.value.trim();

      check(vorname, vorname.value.trim() !== "", "Bitte geben Sie Ihren Vornamen an.");
      check(nachname, nachname.value.trim() !== "", "Bitte geben Sie Ihren Nachnamen an.");

      var reachable = emailValue !== "" || phoneValue !== "";
      check(telefon, reachable, "Bitte geben Sie eine Telefonnummer oder eine E-Mail-Adresse an, damit wir Sie erreichen.");
      var emailOk = emailValue === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailValue);
      if (reachable) setError(telefon, "");
      check(email, emailOk, "Diese E-Mail-Adresse ist unvollständig. Beispiel: name@firma.de");
      if (phoneValue !== "" && !/^[0-9+()\/\s.-]{6,}$/.test(phoneValue)) {
        check(telefon, false, "Bitte nur Ziffern, Leerzeichen und + ( ) / - verwenden.");
      }
      check(consent, consent.checked, "Bitte bestätigen Sie die Einwilligung zur Datenverarbeitung.");

      return { problems: problems, first: first };
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var result = validate();
      if (result.problems.length) {
        summary.hidden = false;
        summary.textContent = result.problems.length === 1
          ? "Bitte prüfen Sie ein Feld: " + result.problems[0]
          : "Bitte prüfen Sie " + result.problems.length + " Felder. Die Hinweise stehen direkt am jeweiligen Feld.";
        result.first.focus();
        return;
      }
      summary.hidden = true;

      var data = new FormData(form);
      var done = $("#formular-gesendet");

      function showDone(sent) {
        $("#gesendet-titel").textContent = sent ? "Vielen Dank, Ihre Nachricht ist bei uns angekommen." : "Ihre Angaben sind vollständig.";
        $("#gesendet-text").textContent = sent
          ? "Wir melden uns so bald wie möglich bei Ihnen."
          : "Dies ist ein Prototyp: Die Nachricht wurde nicht versendet. Auf der fertigen Website geht sie direkt an uns. Bis dahin erreichen Sie uns unter 06109-21061.";
        var list = $("#gesendet-daten");
        list.innerHTML = "";
        [["Name", data.get("vorname") + " " + data.get("nachname")],
         ["Telefon", data.get("telefon")],
         ["E-Mail", data.get("email")],
         ["Betreff", data.get("betreff")],
         ["Nachricht", data.get("nachricht")]].forEach(function (row) {
          if (!row[1] || !String(row[1]).trim()) return;
          var div = document.createElement("div");
          var dt = document.createElement("dt");
          var dd = document.createElement("dd");
          dt.textContent = row[0];
          dd.textContent = String(row[1]).trim();
          div.appendChild(dt); div.appendChild(dd);
          list.appendChild(div);
        });
        form.hidden = true;
        done.hidden = false;
        done.focus();
      }

      if (!FORM_ENDPOINT) { showDone(false); return; }

      var button = $("button[type=submit]", form);
      button.disabled = true;
      button.textContent = "Wird gesendet …";
      fetch(FORM_ENDPOINT, { method: "POST", body: data, headers: { "Accept": "application/json" } })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          showDone(true);
        })
        .catch(function () {
          summary.hidden = false;
          summary.textContent = "Die Nachricht konnte gerade nicht gesendet werden. Bitte versuchen Sie es erneut oder rufen Sie uns an: 06109-21061.";
          button.disabled = false;
          button.textContent = "Nachricht senden";
        });
    });

    $all("input, textarea", form).forEach(function (el) {
      el.addEventListener("input", function () {
        if (el.getAttribute("aria-invalid") === "true") setError(el, "");
      });
    });

    var again = $("#neue-nachricht");
    if (again) {
      again.addEventListener("click", function () {
        form.reset();
        form.hidden = false;
        $("#formular-gesendet").hidden = true;
        $("#vorname", form).focus();
      });
    }
  }

  /* ---------- Jahr im Fuß ---------- */
  $all("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
