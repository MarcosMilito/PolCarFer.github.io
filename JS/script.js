document.addEventListener('DOMContentLoaded', () => {

    function generatePlaceholder(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 300; canvas.height = 200;
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, 300, 200);
        ctx.fillStyle = '#FFC107';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const maxTextWidth = 280;
        if (ctx.measureText(text).width > maxTextWidth) { ctx.font = 'bold 16px Arial'; }
        ctx.fillText(text, 150, 100);
        return canvas.toDataURL();
    }

    function getProducts() {
        const storedProducts = localStorage.getItem('polcarfer_products');
        if (storedProducts) { return JSON.parse(storedProducts); } 
        else {
            return [
                { codigo: 'TAL-001', nombre: 'Taladro Percutor 13mm', precio: 15000, imagen: 'imagenes/TAL-001.jpg' },
                { codigo: 'AMO-002', nombre: 'Amoladora Angular 4 1/2"', precio: 12500, imagen: 'imagenes/AMO-002.jpg' },
            ];
        }
    }

    function saveProducts(products) {
        localStorage.setItem('polcarfer_products', JSON.stringify(products));
    }

    const pageId = document.body.id;

    // --- LÓGICA PARA PÁGINA "INICIO" ---
    let slideIndex = 0;
    const slides = document.querySelectorAll('.slide');
    if (slides.length > 0) {
        showSlides();
        function showSlides() {
            slides.forEach(slide => slide.classList.remove('active'));
            slideIndex++;
            if (slideIndex > slides.length) { slideIndex = 1; }
            slides[slideIndex - 1].classList.add('active');
            setTimeout(showSlides, 5000);
        }
    }

    // --- LÓGICA PARA PÁGINA "PEDIDOS" ---
    if (pageId === 'page-pedidos') {
        const productGrid = document.getElementById('product-grid');
        const productos = getProducts();
        
        productGrid.innerHTML = '';
        productos.forEach(producto => {
            const card = document.createElement('div');
            card.className = 'product-card';
            const imageUrl = producto.imagen || generatePlaceholder('Sin Imagen');
            card.innerHTML = `<img src="${imageUrl}" alt="${producto.nombre}" onerror="this.onerror=null; this.src='${generatePlaceholder(producto.nombre)}';"><h3>${producto.nombre}</h3><p class="price">$${(producto.precio || 0).toLocaleString('es-AR')}</p><button class="btn add-to-cart" data-codigo="${producto.codigo}">Agregar al Carrito</button>`;
            productGrid.appendChild(card);
        });
        
        // LÓGICA DEL CARRITO COMPLETA
        let carrito = JSON.parse(localStorage.getItem('polcarfer_cart')) || [];
        const cartIcon = document.getElementById('cart-icon');
        const cartModal = document.getElementById('cart-modal');
        const closeModalBtn = document.querySelector('.close-button');
        const emptyCartBtn = document.getElementById('empty-cart-btn');
        const cartItemsContainer = document.getElementById('cart-items');

        cartIcon.addEventListener('click', () => cartModal.style.display = 'block');
        closeModalBtn.addEventListener('click', () => cartModal.style.display = 'none');
        window.addEventListener('click', (event) => { if (event.target == cartModal) cartModal.style.display = 'none'; });

        productGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart')) {
                addToCart(e.target.dataset.codigo);
            }
        });

        emptyCartBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
                carrito = [];
                updateCart();
            }
        });

        cartItemsContainer.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('quantity-btn')) {
                const codigo = target.dataset.codigo;
                const action = target.dataset.action;
                updateQuantity(codigo, action);
            }
        });

        function addToCart(productCodigo) {
            const productoAAgregar = getProducts().find(p => p.codigo === productCodigo);
            const productoEnCarrito = carrito.find(p => p.codigo === productCodigo);
            if (productoEnCarrito) {
                productoEnCarrito.cantidad++;
            } else {
                carrito.push({ ...productoAAgregar, cantidad: 1 });
            }
            updateCart();
        }

        function updateQuantity(codigo, action) {
            const itemIndex = carrito.findIndex(p => p.codigo === codigo);
            if (itemIndex === -1) return;

            if (action === 'plus') {
                carrito[itemIndex].cantidad++;
            } else if (action === 'minus') {
                carrito[itemIndex].cantidad--;
                if (carrito[itemIndex].cantidad <= 0) {
                    carrito.splice(itemIndex, 1);
                }
            }
            updateCart();
        }

        function updateCart() {
            localStorage.setItem('polcarfer_cart', JSON.stringify(carrito));
            const cartCount = document.getElementById('cart-count');
            const cartTotal = document.getElementById('cart-total');
            cartCount.textContent = carrito.reduce((sum, item) => sum + (item.cantidad || 0), 0);

            if (carrito.length === 0) {
                cartItemsContainer.innerHTML = '<p>Tu carrito está vacío.</p>';
                cartTotal.textContent = '$0.00';
                return;
            }
            cartItemsContainer.innerHTML = '';
            let total = 0;
            carrito.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'cart-item';
                const itemPrice = item.precio || 0;
                const itemQuantity = item.cantidad || 0;
                
                itemElement.innerHTML = `
                    <div class="cart-item-info">${item.nombre || 'Inválido'}</div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" data-codigo="${item.codigo}" data-action="minus">-</button>
                        <span>${itemQuantity}</span>
                        <button class="quantity-btn" data-codigo="${item.codigo}" data-action="plus">+</button>
                    </div>
                    <span>$${(itemPrice * itemQuantity).toLocaleString('es-AR')}</span>
                `;
                cartItemsContainer.appendChild(itemElement);
                total += itemPrice * itemQuantity;
            });
            cartTotal.textContent = `$${total.toLocaleString('es-AR')}`;
        }
        updateCart();
    }

    // --- LÓGICA PARA PÁGINA "LISTA DE PRECIOS" ---
    if (pageId === 'page-lista-precios') {
        const tableBody = document.querySelector('#price-table tbody');
        const uploadButton = document.getElementById('upload-btn');
        const fileInput = document.getElementById('excel-file');

        function renderPriceList(data) {
            tableBody.innerHTML = '';
            data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${item.codigo || 'N/A'}</td><td>${item.nombre || 'N/A'}</td><td>$${item.precio ? item.precio.toLocaleString('es-AR') : 'N/A'}</td>`;
                tableBody.appendChild(row);
            });
        }
        renderPriceList(getProducts());

        uploadButton.addEventListener('click', () => {
            if (fileInput.files.length === 0) { return alert('Por favor, selecciona un archivo Excel primero.'); }
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    const nuevosProductos = jsonData.map(row => {
                        const codigoProducto = row.Código;
                        const descripcion = row.Descripción || 'Producto sin nombre';
                        const precioLimpio = parseFloat(String(row.Precio).replace(/\D/g, '')) || 0;
                        const rutaImagen = `imagenes/${codigoProducto}.jpg`;
                        return { codigo: codigoProducto, nombre: descripcion, precio: precioLimpio, imagen: rutaImagen };
                    });
                    
                    saveProducts(nuevosProductos);
                    localStorage.removeItem('polcarfer_cart');
                    alert('¡Lista de precios actualizada con éxito! La página se recargará.');
                    window.location.reload();

                } catch (error) {
                    console.error("Error al leer el archivo Excel:", error);
                    alert("Hubo un error al procesar el archivo.");
                }
            };
            reader.readAsArrayBuffer(fileInput.files[0]);
        });
    }
});
