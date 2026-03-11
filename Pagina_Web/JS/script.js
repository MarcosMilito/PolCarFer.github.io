document.addEventListener('DOMContentLoaded', () => {

    // --- BASE DE DATOS DE PRODUCTOS (SIMULADA) ---
    // COMENTARIO: Cuando tengas tu backend, esta información vendrá de la base de datos.
    // Por ahora, la ponemos aquí para que la web funcione.
    const productos = [
        { id: 1, nombre: 'Taladro Percutor 13mm', precio: 15000, imagen: 'https://via.placeholder.com/250x150/555/FFC107?text=Taladro' },
        { id: 2, nombre: 'Amoladora Angular 4 1/2"', precio: 12500, imagen: 'https://via.placeholder.com/250x150/555/FFC107?text=Amoladora' },
        { id: 3, nombre: 'Juego de Destornilladores (6 piezas)', precio: 4800, imagen: 'https://via.placeholder.com/250x150/555/FFC107?text=Destornilladores' },
        { id: 4, nombre: 'Cinta Métrica 5m', precio: 2500, imagen: 'https://via.placeholder.com/250x150/555/FFC107?text=Cinta+Metrica' },
        { id: 5, nombre: 'Pinza Universal 8"', precio: 3200, imagen: 'https://via.placeholder.com/250x150/555/FFC107?text=Pinza' },
        { id: 6, nombre: 'Caja de Herramientas Plástica', precio: 9800, imagen: 'https://via.placeholder.com/250x150/555/FFC107?text=Caja+Herramientas' },
    ];

    let carrito = [];

    // --- LÓGICA PARA PÁGINA "PEDIDOS" ---
    if (document.body.id === 'page-pedidos') {
        const productGrid = document.getElementById('product-grid');
        const cartIcon = document.getElementById('cart-icon');
        const cartModal = document.getElementById('cart-modal');
        const closeModal = document.querySelector('.close-button');
        
        // Renderizar productos en el catálogo
        productos.forEach(producto => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${producto.imagen}" alt="${producto.nombre}">
                <h3>${producto.nombre}</h3>
                <p class="price">$${producto.precio.toLocaleString('es-AR')}</p>
                <button class="btn add-to-cart" data-id="${producto.id}">Agregar al Carrito</button>
            `;
            productGrid.appendChild(card);
        });

        // Abrir y cerrar modal del carrito
        cartIcon.addEventListener('click', () => cartModal.style.display = 'block');
        closeModal.addEventListener('click', () => cartModal.style.display = 'none');
        window.addEventListener('click', (event) => {
            if (event.target == cartModal) {
                cartModal.style.display = 'none';
            }
        });

        // Lógica de agregar al carrito
        productGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart')) {
                const productId = parseInt(e.target.dataset.id);
                addToCart(productId);
            }
        });

        function addToCart(productId) {
            const productoAAgregar = productos.find(p => p.id === productId);
            const productoEnCarrito = carrito.find(p => p.id === productId);

            if (productoEnCarrito) {
                productoEnCarrito.cantidad++;
            } else {
                carrito.push({ ...productoAAgregar, cantidad: 1 });
            }
            updateCart();
        }

        function updateCart() {
            const cartItemsContainer = document.getElementById('cart-items');
            const cartCount = document.getElementById('cart-count');
            const cartTotal = document.getElementById('cart-total');

            cartCount.textContent = carrito.reduce((sum, item) => sum + item.cantidad, 0);

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
                itemElement.innerHTML = `
                    <span>${item.nombre} (x${item.cantidad})</span>
                    <span>$${(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
                `;
                cartItemsContainer.appendChild(itemElement);
                total += item.precio * item.cantidad;
            });
            
            cartTotal.textContent = `$${total.toLocaleString('es-AR')}`;
        }
    }

    // --- LÓGICA PARA PÁGINA "LISTA DE PRECIOS" ---
    if (document.body.id === 'page-lista-precios') {
        const tableBody = document.querySelector('#price-table tbody');
        const uploadButton = document.getElementById('upload-btn');
        const fileInput = document.getElementById('excel-file');

        // Función para renderizar la tabla de precios
        function renderPriceList(data) {
            tableBody.innerHTML = ''; // Limpiar tabla
            data.forEach(item => {
                const row = document.createElement('tr');
                // COMENTARIO: Ajusta 'Código', 'Descripción', 'Precio' a los nombres EXACTOS de tus columnas en el Excel.
                const codigo = item['Código'] || 'N/A';
                const descripcion = item['Descripción'] || 'N/A';
                const precio = typeof item['Precio'] === 'number' ? `$${item['Precio'].toLocaleString('es-AR')}` : (item['Precio'] || 'N/A');
                
                row.innerHTML = `
                    <td>${codigo}</td>
                    <td>${descripcion}</td>
                    <td>${precio}</td>
                `;
                tableBody.appendChild(row);
            });
        }
        
        // Cargar datos iniciales (los mismos que en pedidos, como ejemplo)
        const datosIniciales = productos.map(p => ({'Código': `COD-${p.id}`, 'Descripción': p.nombre, 'Precio': p.precio}));
        renderPriceList(datosIniciales);

        // Lógica para cargar el archivo Excel
        uploadButton.addEventListener('click', () => {
            if (fileInput.files.length === 0) {
                alert('Por favor, selecciona un archivo Excel primero.');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(event) {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                renderPriceList(json);
                alert('¡Lista de precios actualizada en la página! Recuerda que estos cambios no se guardan en el servidor.');
            };
            reader.readAsArrayBuffer(fileInput.files[0]);
        });
    }
});
