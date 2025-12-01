// Simple front-end cart handler shared by menu and maker
(() => {
  const toppingsList = [
    "Sprinkles",
    "Hot Fudge",
    "Whipped Cream",
    "Cherries",
    "Oreo Crumbles",
    "Caramel",
    "M&Ms",
    "Chocolate Chips",
    "Marshmallows"
  ];

  let cart = [];
  const historyKey = "ns_flavor_history";
  const baseHistoryKey = "ns_base_history";
  const toppingHistoryKey = "ns_topping_history";
  let flavorHistory = {};
  let baseHistory = {};
  let toppingHistory = {};

  function loadHistory() {
    try {
      const raw = localStorage.getItem(historyKey);
      if (raw) flavorHistory = JSON.parse(raw);
    } catch (e) {
      flavorHistory = {};
    }
    try {
      const raw = localStorage.getItem(baseHistoryKey);
      if (raw) baseHistory = JSON.parse(raw);
    } catch (e) {
      baseHistory = {};
    }
    try {
      const raw = localStorage.getItem(toppingHistoryKey);
      if (raw) toppingHistory = JSON.parse(raw);
    } catch (e) {
      toppingHistory = {};
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(historyKey, JSON.stringify(flavorHistory));
      localStorage.setItem(baseHistoryKey, JSON.stringify(baseHistory));
      localStorage.setItem(toppingHistoryKey, JSON.stringify(toppingHistory));
    } catch (e) {
      // ignore
    }
  }

  loadHistory();
  let modalEl, cartPanel, cartListEl, cartTotalEl;

  function formatMoney(n) {
    return `$${n.toFixed(2)}`;
  }

  function buildCartPanel() {
    cartPanel = document.createElement("aside");
    cartPanel.id = "cart-panel";
    cartPanel.innerHTML = `
      <div class="cart-panel-header">
        <h3>Your Cart</h3>
        <div class="cart-panel-controls">
          <button id="cart-toggle" aria-label="Collapse cart">—</button>
          <button id="cart-clear" aria-label="Clear cart">Clear</button>
        </div>
      </div>
      <div id="cart-items"></div>
      <div class="cart-panel-footer">
        <span>Total</span>
        <strong id="cart-total">$0.00</strong>
      </div>
      <button class="cart-checkout">Checkout (demo)</button>
    `;
    document.body.appendChild(cartPanel);

    cartListEl = cartPanel.querySelector("#cart-items");
    cartTotalEl = cartPanel.querySelector("#cart-total");
    cartPanel.querySelector("#cart-clear").addEventListener("click", () => {
      cart = [];
      renderCart();
    });
    const toggleBtn = cartPanel.querySelector("#cart-toggle");
    toggleBtn.addEventListener("click", () => {
      cartPanel.classList.toggle("collapsed");
      toggleBtn.textContent = cartPanel.classList.contains("collapsed") ? "+" : "—";
    });
  }

  function renderCart() {
    if (!cartListEl) return;
    cartListEl.innerHTML = "";
    let total = 0;
    cart.forEach((item, idx) => {
      total += item.price;
      const div = document.createElement("div");
      div.className = "cart-line";
      div.innerHTML = `
        <div>
          <strong>${item.name}</strong>
          <div class="cart-line-meta">${item.base} · ${item.scoops} scoop(s)${
        item.toppings.length ? " · " + item.toppings.join(", ") : ""
      }</div>
          ${item.notes ? `<div class="cart-line-notes">${item.notes}</div>` : ""}
        </div>
        <div class="cart-line-actions">
          <span>${formatMoney(item.price)}</span>
          <button data-remove="${idx}" aria-label="Remove">✕</button>
        </div>
      `;
      cartListEl.appendChild(div);
    });
    cartListEl.querySelectorAll("button[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.remove);
        cart.splice(idx, 1);
        renderCart();
      });
    });
    cartTotalEl.textContent = formatMoney(total);
  }

  function addToCart(item) {
    cart.push(item);
    const key = item.name.toLowerCase();
    flavorHistory[key] = (flavorHistory[key] || 0) + 1;
    const baseKey = (item.base || "Cup").toLowerCase();
    baseHistory[baseKey] = (baseHistory[baseKey] || 0) + 1;
    (item.toppings || []).forEach(t => {
      const tk = t.toLowerCase();
      toppingHistory[tk] = (toppingHistory[tk] || 0) + 1;
    });
    saveHistory();
    renderCart();
    cartPanel.classList.add("pulse");
    setTimeout(() => cartPanel.classList.remove("pulse"), 400);
  }

  function ensureModal() {
    if (modalEl) return;
    modalEl = document.createElement("div");
    modalEl.id = "shop-modal";
    modalEl.innerHTML = `
      <div class="shop-modal-backdrop"></div>
      <div class="shop-modal-card">
        <div class="shop-modal-header">
          <div>
            <p class="shop-modal-overline">Customize</p>
            <h3 id="shop-modal-title"></h3>
          </div>
          <button id="shop-modal-close" aria-label="Close">✕</button>
        </div>
        <form id="shop-form">
          <label>Base
            <select name="base">
              <option>Waffle Cone</option>
              <option>Sugar Cone</option>
              <option>Waffle Bowl</option>
              <option>Cup</option>
            </select>
          </label>
          <label>Scoops
            <select name="scoops">
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </label>
          <fieldset class="shop-toppings">
            <legend>Toppings</legend>
            ${toppingsList
              .map(
                t =>
                  `<label><input type="checkbox" name="topping" value="${t}"> ${t}</label>`
              )
              .join("")}
          </fieldset>
          <label>Notes
            <textarea name="notes" rows="2" placeholder="Allergies or tweaks"></textarea>
          </label>
          <button type="submit" class="shop-primary">Add to Cart</button>
        </form>
      </div>
    `;
    document.body.appendChild(modalEl);
    modalEl.querySelector("#shop-modal-close").addEventListener("click", closeModal);
    modalEl.querySelector(".shop-modal-backdrop").addEventListener("click", closeModal);
    modalEl.querySelector("#shop-form").addEventListener("submit", handleSubmit);
  }

  let currentItem = null;

  function openModal(item) {
    ensureModal();
    currentItem = item;
    modalEl.querySelector("#shop-modal-title").textContent = item.name;
    modalEl.classList.add("open");
  }

  function closeModal() {
    if (modalEl) modalEl.classList.remove("open");
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!currentItem) return;
    const form = e.target;
    const data = new FormData(form);
    const base = data.get("base");
    const scoops = Number(data.get("scoops") || 1);
    const toppings = data.getAll("topping");
    const notes = (data.get("notes") || "").toString().trim();

    const price =
      currentItem.basePrice +
      (scoops > 1 ? 1.25 : 0) +
      toppings.length * 0.5;

    addToCart({
      name: currentItem.name,
      base,
      scoops,
      toppings,
      notes,
      price
    });
    closeModal();
  }

  function wireMenuButtons() {
    document.querySelectorAll("[data-menu-flavor]").forEach(btn => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.menuFlavor;
        const basePrice = Number(btn.dataset.price || "3.5");
        openModal({ name, basePrice });
      });
    });
  }

  function wireMakerButton() {
    const makerBtn = document.getElementById("maker-add-cart");
    if (!makerBtn) return;
    makerBtn.addEventListener("click", () => {
      const base = document.getElementById("base-select")?.value || "Cup";
      const scoop1 = document.getElementById("flavor1-select")?.value || "Vanilla";
      const scoop2 = document.getElementById("flavor2-select")?.value || "";
      const toppings = Array.from(
        document.querySelectorAll(".topping:checked")
      ).map(cb => cb.value);
      const notes = document.getElementById("notes-input")?.value || "";
      const scoops = 1 + (scoop2 ? 1 : 0);
      const name = scoop2 ? `${scoop1} + ${scoop2}` : scoop1;
      const basePrice = 3.5;
      const price = basePrice + (scoops > 1 ? 1.25 : 0) + toppings.length * 0.5;
      addToCart({
        name: `${name} (Custom)`,
        base,
        scoops,
        toppings,
        notes,
        price
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildCartPanel();
    wireMenuButtons();
    wireMakerButton();
  });

  // expose helpers for other pages (AI recommender)
  window.addToCart = addToCart;
  window.getFlavorHistory = () => ({ ...flavorHistory });
  window.getPreferenceStats = () => ({
    flavors: { ...flavorHistory },
    bases: { ...baseHistory },
    toppings: { ...toppingHistory }
  });
})();
