document.addEventListener('DOMContentLoaded', () => {

    // --- CONSTANTES GLOBALES ---
    const CODIGO_ACCESO_SOCIO = 'a1b2c3d4e5f6'; 
    const PRODUCTOS_STORAGE_KEY = 'polcarfer_productos'; // Clave para LocalStorage

    const pageId = document.body.id;

    // --- LÓGICA GENERAL (Se ejecuta en todas las páginas) ---
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    if (hamburger && mobileNav) {
        hamburger.addEventListener('click', () => { mobileNav.classList.toggle('active'); });
    }
    
    // Lógica del carrusel (sin cambios)
    if (pageId === 'page-index') {
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
    }

    // --- LÓGICA PARA PÁGINAS DE CLIENTES ---
    // Se ejecuta en las páginas públicas para obtener los productos.
    if (pageId === 'page-index' || pageId === 'page-quienes-somos' || pageId === 'page-pedidos' || pageId === 'page-contacto') {
        
        // ========= ¡CAMBIO CLAVE #1! =========
        // Esta función ahora lee desde LocalStorage en lugar de productos.js
        function getProducts() {
            try {
                const productosGuardados = localStorage.getItem(PRODUCTOS_STORAGE_KEY);
                if (productosGuardados) {
                    return JSON.parse(productosGuardados);
                }
            } catch (error) {
                console.error('Error al leer productos desde LocalStorage:', error);
            }

            // Si no hay nada en LocalStorage o hay un error, devuelve un array vacío.
            // La página de pedidos mostrará que no hay productos.
            console.warn('No se encontró un catálogo de productos. La lista estará vacía.');
            return [];
        }

        // El resto de la lógica de la página de pedidos funciona igual,
        // ya que depende de lo que devuelva getProducts(). ¡No hay que tocar nada más aquí!
        if (pageId === 'page-pedidos') {
            const productGrid = document.getElementById('product-grid');
            const productos = getProducts();
            
            if (productos.length === 0) {
                productGrid.innerHTML = '<p style="text-align: center; font-size: 1.2rem; color: var(--color-texto-secundario);">No hay productos disponibles en este momento.</p>';
            } else {
                productGrid.innerHTML = '';
                productos.forEach(producto => {
                    const card = document.createElement('div');
                    card.className = 'product-card';
                    const imageUrl = producto.imagen || '';
                    card.innerHTML = `<img src="${imageUrl}" alt="${producto.nombre}" onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200/555/FFC107?text=Sin+Imagen';"><div class="product-card-content"><h3>${producto.nombre}</h3><p class="price">$${(producto.precio || 0).toLocaleString('es-AR')}</p><button class="btn add-to-cart" data-codigo="${producto.codigo}">Agregar al Carrito</button></div>`;
                    productGrid.appendChild(card);
                });
            }
            
            // Toda la lógica del carrito (add-to-cart, modal, checkout) se mantiene intacta.
            let carrito = JSON.parse(localStorage.getItem('polcarfer_cart')) || [];
            const cartIcon = document.getElementById('cart-icon');
            const cartModal = document.getElementById('cart-modal');
            const closeModalBtn = cartModal.querySelector('.close-button');
            const emptyCartBtn = document.getElementById('empty-cart-btn');
            const cartItemsContainer = document.getElementById('cart-items');
            const checkoutBtn = document.getElementById('checkout-btn');
            const checkoutFormModal = document.getElementById('checkout-form-modal');
            const closeCheckoutFormModalBtn = document.getElementById('close-checkout-form-modal');
            const customerForm = document.getElementById('customer-data-form');

            cartIcon.addEventListener('click', () => cartModal.style.display = 'block');
            closeModalBtn.addEventListener('click', () => cartModal.style.display = 'none');
            closeCheckoutFormModalBtn.addEventListener('click', () => checkoutFormModal.style.display = 'none');
            window.addEventListener('click', (event) => {
                if (event.target == cartModal) cartModal.style.display = 'none';
                if (event.target == checkoutFormModal) checkoutFormModal.style.display = 'none';
            });

            checkoutBtn.addEventListener('click', () => {
                if (carrito.length === 0) { return alert('Tu carrito está vacío.'); }
                cartModal.style.display = 'none';
                checkoutFormModal.style.display = 'block';
            });

            customerForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const nombre = document.getElementById('nombre').value;
                const apellido = document.getElementById('apellido').value;
                const telefono = document.getElementById('telefono').value;
                const email = document.getElementById('email').value;
                const direccion = document.getElementById('direccion').value;
                const localidad = document.getElementById('localidad').value;
                let pedidoResumen = '';
                let total = 0;
                carrito.forEach(item => {
                    const subtotal = (item.precio || 0) * (item.cantidad || 0);
                    pedidoResumen += `\n- ${item.nombre} (x${item.cantidad}) - $${subtotal.toLocaleString('es-AR')}`;
                    total += subtotal;
                });
                const numeroTuNegocio = '5491158212733';
                const mensaje = `*¡Nuevo Pedido de POLCARFER SRL!*\n\n*Datos del Cliente:*\n- Nombre: ${nombre} ${apellido}\n- Teléfono: ${telefono}\n- Email: ${email}\n- Dirección: ${direccion}, ${localidad}\n\n*Resumen del Pedido:*${pedidoResumen}\n\n*Total: $${total.toLocaleString('es-AR')}*`;
                const urlWhatsApp = `https://wa.me/${numeroTuNegocio}?text=${encodeURIComponent(mensaje)}`;
                window.open(urlWhatsApp, '_blank');
                checkoutFormModal.style.display = 'none';
                customerForm.reset();
                carrito = [];
                updateCart();
            });

            productGrid.addEventListener('click', (e) => { if (e.target.classList.contains('add-to-cart')) { addToCart(e.target.dataset.codigo); } });
            emptyCartBtn.addEventListener('click', () => { if (confirm('¿Estás seguro?')) { carrito = []; updateCart(); } });
            cartItemsContainer.addEventListener('click', (e) => { if (e.target.classList.contains('quantity-btn')) { updateQuantity(e.target.dataset.codigo, e.target.dataset.action); } });

            function addToCart(productCodigo) {
                const productoAAgregar = getProducts().find(p => String(p.codigo) === String(productCodigo));
                if (!productoAAgregar) return;
                const productoEnCarrito = carrito.find(p => String(p.codigo) === String(productCodigo));
                if (productoEnCarrito) { productoEnCarrito.cantidad++; } 
                else { carrito.push({ ...productoAAgregar, cantidad: 1 }); }
                updateCart();
            }

            function updateQuantity(codigo, action) {
                const itemIndex = carrito.findIndex(p => String(p.codigo) === String(codigo));
                if (itemIndex === -1) return;
                if (action === 'plus') { carrito[itemIndex].cantidad++; } 
                else if (action === 'minus') {
                    carrito[itemIndex].cantidad--;
                    if (carrito[itemIndex].cantidad <= 0) { carrito.splice(itemIndex, 1); }
                }
                updateCart();
            }

            function updateCart() {
                localStorage.setItem('polcarfer_cart', JSON.stringify(carrito));
                const cartCount = document.getElementById('cart-count');
                const cartTotal = document.getElementById('cart-total');
                cartCount.textContent = carrito.reduce((sum, item) => sum + (item.cantidad || 0), 0);
                if (carrito.length === 0) { cartItemsContainer.innerHTML = '<p>Tu carrito está vacío.</p>'; cartTotal.textContent = '$0.00'; return; }
                cartItemsContainer.innerHTML = '';
                let total = 0;
                carrito.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'cart-item';
                    const itemPrice = item.precio || 0;
                    const itemQuantity = item.cantidad || 0;
                    itemElement.innerHTML = `<div class="cart-item-info">${item.nombre || 'Inválido'}</div><div class="quantity-controls"><button class="quantity-btn" data-codigo="${item.codigo}" data-action="minus">-</button><span>${itemQuantity}</span><button class="quantity-btn" data-codigo="${item.codigo}" data-action="plus">+</button></div><span>$${(itemPrice * itemQuantity).toLocaleString('es-AR')}</span>`;
                    cartItemsContainer.appendChild(itemElement);
                    total += itemPrice * itemQuantity;
                });
                cartTotal.textContent = `$${total.toLocaleString('es-AR')}`;
            }
            updateCart();
        }
    }

    // --- LÓGICA EXCLUSIVA PARA LA PÁGINA DE LISTA DE PRECIOS (SOCIOS) ---
    // ========= ¡CAMBIO CLAVE #2! =========
    if (pageId === 'page-lista-precios') {
        const loginSection = document.getElementById('login-section');
        const adminPanel = document.getElementById('admin-panel');
        const loginForm = document.getElementById('login-form');
        const codigoInput = document.getElementById('codigo-acceso');
        const uploadButton = document.getElementById('upload-btn');
        const fileInput = document.getElementById('excel-file');
        const clearStorageButton = document.getElementById('clear-storage-btn');
        const adminTableBody = document.querySelector('#admin-product-table tbody');

        // Función para mostrar la tabla de vista previa para el socio
        function showAdminPreview(productos) {
            adminTableBody.innerHTML = '';
            if (!productos || productos.length === 0) {
                adminTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay productos en el catálogo.</td></tr>';
                return;
            }
            productos.forEach(p => {
                const row = `
                    <tr>
                        <td>${p.codigo}</td>
                        <td>${p.nombre}</td>
                        <td>$${(p.precio || 0).toLocaleString('es-AR')}</td>
                        <td>${p.imagen}</td>
                    </tr>
                `;
                adminTableBody.innerHTML += row;
            });
        }
        
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (codigoInput.value === CODIGO_ACCESO_SOCIO) {
                loginSection.style.display = 'none';
                adminPanel.style.display = 'block';
                // Al loguearse, mostrar los productos que ya están guardados
                const currentProducts = JSON.parse(localStorage.getItem(PRODUCTOS_STORAGE_KEY)) || [];
                showAdminPreview(currentProducts);
            } else {
                alert('Código de acceso incorrecto.');
            }
        });

        // Botón para limpiar el catálogo
        clearStorageButton.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres borrar TODO el catálogo de productos? Esta acción no se puede deshacer.')) {
                localStorage.removeItem(PRODUCTOS_STORAGE_KEY);
                alert('Catálogo borrado. La página de pedidos ahora estará vacía.');
                showAdminPreview([]); // Limpiar la tabla de vista previa
            }
        });
        
        // Lógica del botón de subida
        uploadButton.addEventListener('click', () => {
            if (fileInput.files.length === 0) { return alert('Por favor, selecciona un archivo Excel.'); }
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    // Mapeamos los datos del Excel a nuestro formato de objeto.
                    // IMPORTANTE: Asegúrate que tu Excel tiene columnas llamadas "Código", "Descripción", "Precio".
                    const nuevosProductos = jsonData.map(row => ({
                        codigo: row.Código || row.codigo || 'SIN-CODIGO',
                        nombre: row.Descripción || row.descripcion || row.Nombre || row.nombre || 'Sin nombre',
                        precio: parseFloat(String(row.Precio || row.precio || 0).replace(/[^\d.-]/g, '')) || 0,
                        imagen: `imagenes/${row.Código || row.codigo}.jpg`
                    }));
                    
                    // AHORA: Guardamos en LocalStorage en lugar de descargar un archivo
                    localStorage.setItem(PRODUCTOS_STORAGE_KEY, JSON.stringify(nuevosProductos));

                    // Actualizamos la vista previa para el socio
                    showAdminPreview(nuevosProductos);

                    alert('¡Catálogo actualizado con éxito!\n\nLos clientes ya verán la nueva lista de productos.');
                    
                } catch (error) {
                    console.error("Error al procesar el archivo Excel:", error);
                    alert("Hubo un error al procesar el archivo. Revisa que el formato sea correcto y las columnas se llamen 'Código', 'Descripción' y 'Precio'.");
                }
            };
            reader.readAsArrayBuffer(fileInput.files[0]);
        });
    }
});
