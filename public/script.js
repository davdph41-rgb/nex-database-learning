const API = "/api/products";

const form = document.getElementById("productForm");
const table = document.getElementById("productTable");
const message = document.getElementById("message");
const searchInput = document.getElementById("searchInput");

let products = [];

function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function showMessage(text) {
  message.textContent = text;
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Terjadi kesalahan.");
  }

  return data;
}

// Mengambil produk dari database
async function loadProducts() {
  try {
    table.innerHTML = `
      <tr>
        <td colspan="5" class="empty">Memuat data...</td>
      </tr>
    `;

    const q = searchInput.value.trim();

    products = await request(
      API + "?q=" + encodeURIComponent(q)
    );

    renderProducts();
    updateStats();

    showMessage("Data berhasil dimuat.");

  } catch (error) {
    table.innerHTML = `
      <tr>
        <td colspan="5" class="empty">Gagal memuat data.</td>
      </tr>
    `;

    showMessage(error.message);
  }
}

// Menampilkan produk
function renderProducts() {
  if (!products.length) {
    table.innerHTML = `
      <tr>
        <td colspan="5" class="empty">
          Produk tidak ditemukan.
        </td>
      </tr>
    `;
    return;
  }

  table.innerHTML = products.map(product => `
    <tr>
      <td>#${product.id}</td>
      <td>${escapeHTML(product.name)}</td>
      <td>${rupiah(product.price)}</td>
      <td>${product.stock} pcs</td>
      <td>
        <div class="action">

          <button
            class="edit"
            data-action="edit"
            data-id="${product.id}">
            Edit
          </button>

          <button
            class="delete"
            data-action="delete"
            data-id="${product.id}">
            Hapus
          </button>

        </div>
      </td>
    </tr>
  `).join("");
}

// Mengamankan teks produk dari HTML
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// Menghitung statistik
function updateStats() {
  const totalStock = products.reduce(
    (sum, item) => sum + Number(item.stock),
    0
  );

  const totalValue = products.reduce(
    (sum, item) =>
      sum + Number(item.price) * Number(item.stock),
    0
  );

  document.getElementById("totalProducts").textContent =
    products.length;

  document.getElementById("totalStock").textContent =
    totalStock;

  document.getElementById("totalValue").textContent =
    rupiah(totalValue);
}

// Menambahkan produk
form.addEventListener("submit", async event => {
  event.preventDefault();

  const name = document.getElementById("productName").value.trim();
  const price = Number(document.getElementById("productPrice").value);
  const stock = Number(document.getElementById("productStock").value);

  const submitButton = form.querySelector("button");

  submitButton.disabled = true;

  try {
    await request(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        price,
        stock
      })
    });

    form.reset();

    showMessage("Produk berhasil ditambahkan.");

    await loadProducts();

  } catch (error) {
    showMessage(error.message);

  } finally {
    submitButton.disabled = false;
  }
});

// Tombol edit dan hapus
table.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  const product = products.find(
    item => Number(item.id) === id
  );

  if (!product) return;

  if (action === "edit") {
    const name = prompt("Nama produk:", product.name);
    if (name === null) return;

    const priceText = prompt("Harga produk:", product.price);
    if (priceText === null) return;

    const stockText = prompt("Jumlah stok:", product.stock);
    if (stockText === null) return;

    const price = Number(priceText);
    const stock = Number(stockText);

    if (
      !name.trim() ||
      !Number.isSafeInteger(price) ||
      !Number.isSafeInteger(stock) ||
      price < 0 ||
      stock < 0
    ) {
      showMessage("Data yang dimasukkan tidak valid.");
      return;
    }

    try {
      await request(`${API}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          price,
          stock
        })
      });

      showMessage("Produk berhasil diperbarui.");

      await loadProducts();

    } catch (error) {
      showMessage(error.message);
    }
  }

  if (action === "delete") {
    const confirmed = confirm(
      `Hapus produk ${product.name}?`
    );

    if (!confirmed) return;

    try {
      await request(`${API}/${id}`, {
        method: "DELETE"
      });

      showMessage("Produk berhasil dihapus.");

      await loadProducts();

    } catch (error) {
      showMessage(error.message);
    }
  }
});

// Pencarian produk
searchInput.addEventListener("input", loadProducts);

// Refresh data
document.getElementById("refreshBtn")
  .addEventListener("click", loadProducts);

// Jalankan ketika website dibuka
loadProducts();
