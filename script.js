// ✅ URL de tu Google Sheets (formato CSV)
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1U_TpXGf_20-Z4fIP_RCNrZFZi3qjyITw5HkMaylrQHE/edit?usp=sharing";

// ✅ Variables globales
let cart = [];
let total = 0;

// Hacer que el ícono del carrito te lleve a la sección del carrito
document.getElementById("floating-cart").addEventListener("click", () => {
    document.querySelector("#cart").scrollIntoView({ behavior: "smooth" });
});


// -------------------------------------------------------------
// 🧩 FUNCIONES BASE DE PARSEO DE SHEETS
// -------------------------------------------------------------
function normalizeHeader(h) {
  return h
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "")
    .toLowerCase();
}

function splitCsvLine(line) {
  const result = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let value = "";
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { value += '"'; i += 2; continue; }
        if (line[i] === '"') { i++; break; }
        value += line[i++];
      }
      if (line[i] === ',') i++;
      result.push(value);
    } else {
      let j = i;
      while (j < line.length && line[j] !== ',') j++;
      result.push(line.slice(i, j));
      i = j + 1;
    }
  }
  return result;
}

function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length === 0) return [];

  const headers = splitCsvLine(lines.shift()).map(h => normalizeHeader(h));
  return lines.map(line => {
    const cols = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h] = (cols[i] || "").trim());
    return obj;
  });
}

// -------------------------------------------------------------
// 🥗 CARGAR PRODUCTOS DESDE GOOGLE SHEETS
// -------------------------------------------------------------
async function cargarProductosDesdeSheet() {
  try {
    const res = await fetch(SHEET_URL);
    if (!res.ok) throw new Error("Error al cargar la hoja: " + res.status);
    const csvText = await res.text();
    const rawProducts = parseCsv(csvText);

    const productos = rawProducts.map(p => ({
      nombre: p.nombre || p.name || p.producto || p.titulo || "",
      precio: parseInt((p.precio || "0").replace(/\D/g, "")) || 0,
      descripcion: p.descripcion || "",
      imagen: p.imagen || "img/no-image.png",
      categoria: p.categoria || "Sin categoría"
    })).filter(p => p.nombre);

    renderizarProductosPorCategoria(productos);
  } catch (err) {
    console.error("Error cargando productos:", err);
  }
}

// -------------------------------------------------------------
// 🧾 RENDERIZAR PRODUCTOS
// -------------------------------------------------------------
function renderizarProductosPorCategoria(productos) {
  const menuContainer = document.getElementById("menu");
  menuContainer.innerHTML = "";

  const categorias = {};
  productos.forEach(p => {
    if (!categorias[p.categoria]) categorias[p.categoria] = [];
    categorias[p.categoria].push(p);
  });

  Object.keys(categorias).forEach(categoria => {
    const section = document.createElement("section");
    section.className = "categoria";

    const titulo = document.createElement("h2");
    titulo.textContent = categoria;
    section.appendChild(titulo);

    const lista = document.createElement("ul");
    lista.className = "menu-categoria";

    categorias[categoria].forEach(p => {
      const li = document.createElement("li");
      li.className = "producto-item";

      li.innerHTML = `
        <img src="${p.imagen}" alt="${p.nombre}" class="product-image" onerror="this.src='img/no-image.png'">
        <h3>${p.nombre}</h3>
        <p>${p.descripcion}</p>
        <p><strong>${formatearPrecio(p.precio)}</strong></p>
        <div class="quantity-control">
          <button type="button" onclick="cambiarCantidad(this, -1)">-</button>
          <input type="number" value="1" min="1">
          <button type="button" onclick="cambiarCantidad(this, 1)">+</button>
        </div>
        <button onclick="agregarDesdeHTML(this, '${p.nombre.replace(/'/g, "\\'")}', ${p.precio})">Agregar al carrito</button>
      `;
      lista.appendChild(li);
    });

    section.appendChild(lista);
    menuContainer.appendChild(section);
  });
}

// -------------------------------------------------------------
// 🛒 FUNCIONES DE CARRITO
// -------------------------------------------------------------
function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(precio);
}

function cambiarCantidad(boton, cambio) {
  const input = boton.parentElement.querySelector('input[type="number"]');
  let valor = parseInt(input.value) + cambio;
  if (valor < 1) valor = 1;
  input.value = valor;
}

function agregarDesdeHTML(btn, nombre, precio) {
  const cantidad = parseInt(btn.parentElement.querySelector('input[type="number"]').value) || 1;
  addToCart(nombre, precio, cantidad);
}

function addToCart(item, precio, cantidad = 1) {
  const index = cart.findIndex(p => p.item === item);
  if (index !== -1) cart[index].cantidad += cantidad;
  else cart.push({ item, precio, cantidad });

  total = cart.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  guardarCarrito();
  renderCarrito();
  actualizarBotonPedido();
  actualizarCarritoFlotante();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  total = cart.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  guardarCarrito();
  renderCarrito();
  actualizarBotonPedido();
  actualizarCarritoFlotante();
}

function renderCarrito() {
  const carritoElemento = document.getElementById('cart');
  carritoElemento.innerHTML = '';
  cart.forEach((producto, index) => {
    const li = document.createElement('li');
    li.classList.add('cart-item');
    li.innerHTML = `
      ${producto.item} x${producto.cantidad} - ${formatearPrecio(producto.precio * producto.cantidad)}
      <button class="button-remove" onclick="removeFromCart(${index})">Eliminar</button>
    `;
    carritoElemento.appendChild(li);
  });
  document.getElementById('total').textContent = formatearPrecio(total);
}

function guardarCarrito() {
  localStorage.setItem('carrito', JSON.stringify(cart));
  localStorage.setItem('total', total);
}

function cargarCarrito() {
  cart = JSON.parse(localStorage.getItem('carrito') || "[]");
  total = cart.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  renderCarrito();
  actualizarBotonPedido();
  actualizarCarritoFlotante();
}

function actualizarBotonPedido() {
  document.getElementById('sendOrder').disabled = cart.length === 0;
}

function actualizarCarritoFlotante() {
  const count = cart.reduce((acc, p) => acc + p.cantidad, 0);
  document.getElementById('floating-count').textContent = count;
  document.getElementById('floating-cart').style.display = count > 0 ? 'block' : 'none';
}

// -------------------------------------------------------------
// 💬 ENVIAR PEDIDO POR WHATSAPP
// -------------------------------------------------------------
document.getElementById("sendOrder").addEventListener("click", () => {
  if (cart.length === 0) {
    alert("Tu carrito está vacío 😅");
    return;
  }

  // Construir mensaje de WhatsApp
  let message = "🍔 *Pedido kRandy Resto Bar* 🍟%0A%0A";

  cart.forEach(producto => {
    const nombre = producto.item || producto.nombre || "Producto";
    const cantidad = producto.cantidad || 1;
    const subtotal = producto.precio * cantidad;
    message += `• ${nombre} x${cantidad} - $${subtotal.toLocaleString("es-CL")}%0A`;
  });

  message += `%0A💰 *Total:* $${total.toLocaleString("es-CL")}%0A%0A🧾 Atenta a mi pedido 😋`;

  // Número de WhatsApp (formato internacional sin +)
  const phone = "56954381023"; // <-- reemplaza por el número real
  const url = `https://wa.me/${phone}?text=${message}`;

  // ✅ Abrir correctamente según entorno
  if (window.location.hostname === "localhost") {
    window.location.href = url; // modo local
  } else {
    window.open(url); // producción
  }
});

// -------------------------------------------------------------
// 🚀 INICIALIZAR
// -------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  cargarProductosDesdeSheet();
  cargarCarrito();
});



