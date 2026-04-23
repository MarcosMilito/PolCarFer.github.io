document.addEventListener('DOMContentLoaded', () => {
    const CODIGO_ACCESO_SOCIO = 'a1b2c3d4e5f6';
    const CART_STORAGE_KEY = 'polcarfer_cart';
    const pageId = document.body.id;
    const PRODUCTOS_JSON_URL = 'data/productos.json';

    const ALIAS_POLCARFER = 'POLCARFER.SRL';

    const CLIENTES_PRECIO_CON_IVA = [
        'OLAEN',
        'OLAINEN',
        'ENERGIZER',
        'SUPRABOND'
    ];

    const hamburger = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');

    if (hamburger && mobileNav) {
        hamburger.addEventListener('click', () => {
            mobileNav.classList.toggle('active');
        });
    }

    function formatPrice(value) {
        return `$${Number(value || 0).toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    function parseNumber(value) {
        if (typeof value === 'number') return value;
        if (typeof value !== 'string') return 0;

        const cleaned = value
            .replace(/\$/g, '')
            .replace(/\s/g, '')
            .replace(/\./g, '')
            .replace(',', '.')
            .replace(/[^\d.-]/g, '');

        return parseFloat(cleaned) || 0;
    }

    function normalizeText(text) {
        return String(text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function sanitizePhoneForWhatsApp(phone) {
        return String(phone || '').replace(/\D/g, '');
    }

    async function getProducts() {
        try {
            const response = await fetch(PRODUCTOS_JSON_URL, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`No se pudo cargar ${PRODUCTOS_JSON_URL}`);
            }
            const productos = await response.json();
            return Array.isArray(productos) ? productos : [];
        } catch (error) {
            console.error('Error al leer productos desde JSON:', error);
            return [];
        }
    }

    function getCart() {
        try {
            const carritoGuardado = localStorage.getItem(CART_STORAGE_KEY);
            return carritoGuardado ? JSON.parse(carritoGuardado) : [];
        } catch (error) {
            console.error('Error al leer carrito:', error);
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }

    function downloadJSONFile(data, filename = 'productos.json') {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }

    function detectRubro(nombre, presentacion = '', seccion = '') {
        const fullText = `${nombre} ${presentacion} ${seccion}`.toUpperCase();

        let rubro = 'General';

        if (/DISCO|AMOLADORA|TALADRO|ATORNILLADOR|SIERRA|MECHA|LIJADORA|MARTILLO DEMOLEDOR|FRESADORA|CALADORA|CEPILLO/.test(fullText)) {
            rubro = 'Herramientas eléctricas';
        } else if (/PINZA|ALICATE|LLAVE|DESTORNILLADOR|MARTILLO|CUTTER|TENAZA|SERRUCHO|MORSA|METRO|NIVEL/.test(fullText)) {
            rubro = 'Herramientas manuales';
        } else if (/TORNILLO|TARUGO|BULON|TUERCA|ARANDELA|CLAVO|REMACHE/.test(fullText)) {
            rubro = 'Bulonería y fijaciones';
        } else if (/CANDADO|CERRADURA|CERROJO|PASADOR|LLAVE|PICAPORTE|BISAGRA/.test(fullText)) {
            rubro = 'Herrajes y seguridad';
        } else if (/CABLE|ENCHUFE|LLAVE TERMICA|TOMA|TOMACORRIENTE|INTERRUPTOR|LAMPARA|PORTALAMPARA|PILA|BATERIA/.test(fullText)) {
            rubro = 'Electricidad';
        } else if (/PINTURA|PINCEL|RODILLO|ESPATULA|LIJA|THINNER|SELLADOR/.test(fullText)) {
            rubro = 'Pinturería';
        } else if (/MANGUERA|GRIFERIA|CANILLA|TEFLON|SIFON|VALVULA|UNION|PLOMERIA|FONTANERIA|CAÑO|CANO|PVC/.test(fullText)) {
            rubro = 'Sanitaria';
        } else if (/ADHESIVO|SILICONA|PEGAMENTO|SELLADOR|MEMBRANA/.test(fullText)) {
            rubro = 'Adhesivos y selladores';
        } else if (/GUANTE|BARBIJO|LENTE|CASCO|PROTECTOR/.test(fullText)) {
            rubro = 'Seguridad';
        } else if (/LUBRICANTE|GRASA|CINTA/.test(fullText)) {
            rubro = 'Lubricantes y cintas';
        }

        return rubro;
    }

    function usaPrecioConIva(producto) {
        const texto = `${producto.nombre} ${producto.presentacion} ${producto.seccion}`.toUpperCase();
        return CLIENTES_PRECIO_CON_IVA.some(cliente => texto.includes(cliente));
    }

    function getEffectivePrice(producto) {
        const conIva = usaPrecioConIva(producto);

        if (producto.tieneDescuento) {
            return conIva
                ? Number(producto.precioConIvaDescuento || producto.precioConIva || 0)
                : Number(producto.precioSinIvaDescuento || producto.precioSinIva || 0);
        }

        return conIva
            ? Number(producto.precioConIva || 0)
            : Number(producto.precioSinIva || 0);
    }

    function getOldPrice(producto) {
        const conIva = usaPrecioConIva(producto);
        return conIva
            ? Number(producto.precioConIva || 0)
            : Number(producto.precioSinIva || 0);
    }

    function getEffectivePriceLabel(producto) {
        return usaPrecioConIva(producto) ? 'C/IVA' : 'S/IVA';
    }

    function buildDiscountMap(rawData) {
        const discountMap = new Map();
        let seccionActual = '';

        rawData.forEach((row) => {
            const codigo = row[1];
            const nombre = row[2];
            const oferta = row[3];
            const precioLista = row[4];
            const descuento = row[5];
            const precioSinIvaDesc = row[6];
            const precioConIvaDesc = row[7];

            const esCabeceraSeccion =
                !codigo &&
                nombre &&
                String(nombre).trim() !== '' &&
                String(nombre).trim().toUpperCase() !== 'DETALLE';

            if (esCabeceraSeccion) {
                seccionActual = String(nombre).trim();
            }

            const esFilaValida =
                codigo &&
                nombre &&
                String(codigo).trim().toUpperCase() !== 'CODIGO' &&
                descuento !== '' &&
                precioSinIvaDesc !== '' &&
                precioConIvaDesc !== '';

            if (esFilaValida) {
                discountMap.set(String(codigo).trim(), {
                    codigo: String(codigo).trim(),
                    nombre: String(nombre).trim(),
                    oferta: String(oferta || '').trim(),
                    seccion: seccionActual,
                    precioLista: parseNumber(precioLista),
                    descuento: parseNumber(descuento),
                    precioSinIvaDescuento: parseNumber(precioSinIvaDesc),
                    precioConIvaDescuento: parseNumber(precioConIvaDesc)
                });
            }
        });

        return discountMap;
    }

    function parseListaDePrecios(rawData, discountMap) {
        const productos = [];
        let seccionActual = '';

        rawData.forEach((row) => {
            const codigo = row[1];
            const nombre = row[2];
            const presentacion = row[3];
            const precioSinIva = row[4];
            const precioConIva = row[5];

            const esCabeceraSeccion =
                !codigo &&
                nombre &&
                String(nombre).trim() !== '' &&
                String(nombre).trim().toUpperCase() !== 'DETALLE';

            if (esCabeceraSeccion) {
                seccionActual = String(nombre).trim();
            }

            const esFilaValida =
                codigo &&
                nombre &&
                String(codigo).trim().toUpperCase() !== 'CODIGO' &&
                precioSinIva !== '' &&
                precioConIva !== '';

            if (esFilaValida) {
                const codigoLimpio = String(codigo).trim();
                const nombreLimpio = String(nombre).trim();
                const presentacionLimpia = String(presentacion || '').trim();
                const descuentoInfo = discountMap.get(codigoLimpio);

                productos.push({
                    codigo: codigoLimpio,
                    nombre: nombreLimpio,
                    presentacion: presentacionLimpia,
                    precioSinIva: parseNumber(precioSinIva),
                    precioConIva: parseNumber(precioConIva),
                    precioLista: descuentoInfo ? descuentoInfo.precioLista : parseNumber(precioSinIva),
                    descuento: descuentoInfo ? descuentoInfo.descuento : 0,
                    precioSinIvaDescuento: descuentoInfo ? descuentoInfo.precioSinIvaDescuento : 0,
                    precioConIvaDescuento: descuentoInfo ? descuentoInfo.precioConIvaDescuento : 0,
                    tieneDescuento: Boolean(descuentoInfo && descuentoInfo.descuento > 0),
                    seccion: seccionActual,
                    origen: 'LISTA DE PRECIOS',
                    rubro: detectRubro(nombreLimpio, presentacionLimpia, seccionActual)
                });
            }
        });

        return productos;
    }

    function parseSuprabondBulitSomerset(rawData, discountMap) {
        const productos = [];
        let seccionActual = '';

        rawData.forEach((row) => {
            const codigo = row[1];
            const nombre = row[2];
            const cantidadBulto = row[3];
            const tamano = row[4];
            const precioSinIva = row[5];
            const precioConIva = row[6];

            const esCabeceraSeccion =
                !codigo &&
                nombre &&
                String(nombre).trim() !== '' &&
                String(nombre).trim().toUpperCase() !== 'DETALLE';

            if (esCabeceraSeccion) {
                seccionActual = String(nombre).trim();
            }

            const esFilaValida =
                codigo &&
                nombre &&
                String(codigo).trim().toUpperCase() !== 'CODIGO' &&
                precioSinIva !== '' &&
                precioConIva !== '';

            if (esFilaValida) {
                const codigoLimpio = String(codigo).trim();
                const nombreLimpio = String(nombre).trim();
                const presentacionLimpia = `${String(cantidadBulto || '').trim()} ${String(tamano || '').trim()}`.trim();
                const descuentoInfo = discountMap.get(codigoLimpio);

                productos.push({
                    codigo: codigoLimpio,
                    nombre: nombreLimpio,
                    presentacion: presentacionLimpia,
                    precioSinIva: parseNumber(precioSinIva),
                    precioConIva: parseNumber(precioConIva),
                    precioLista: descuentoInfo ? descuentoInfo.precioLista : parseNumber(precioSinIva),
                    descuento: descuentoInfo ? descuentoInfo.descuento : 0,
                    precioSinIvaDescuento: descuentoInfo ? descuentoInfo.precioSinIvaDescuento : 0,
                    precioConIvaDescuento: descuentoInfo ? descuentoInfo.precioConIvaDescuento : 0,
                    tieneDescuento: Boolean(descuentoInfo && descuentoInfo.descuento > 0),
                    seccion: seccionActual,
                    origen: 'SUPRABOND-BULIT-SOMERSET',
                    rubro: detectRubro(nombreLimpio, presentacionLimpia, seccionActual)
                });
            }
        });

        return productos;
    }

    if (pageId === 'page-index') {
        let slideIndex = 0;
        const slides = document.querySelectorAll('.slide');

        if (slides.length > 0) {
            function showSlides() {
                slides.forEach(slide => slide.classList.remove('active'));
                slideIndex++;
                if (slideIndex > slides.length) slideIndex = 1;
                slides[slideIndex - 1].classList.add('active');
                setTimeout(showSlides, 5000);
            }
            showSlides();
        }
    }

    async function initPedidosPage() {
        if (pageId !== 'page-pedidos') return;

        const productGrid = document.getElementById('product-grid');
        const searchInput = document.getElementById('search-input');
        const productsTotal = document.getElementById('products-total');
        const rubroFilter = document.getElementById('rubro-filter');
        const sortSelect = document.getElementById('sort-select');

        const cartButton = document.getElementById('cart-button');
        const cartModal = document.getElementById('cart-modal');
        const closeCartModal = document.getElementById('close-cart-modal');
        const cartItemsContainer = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        const cartCount = document.getElementById('cart-count');
        const emptyCartBtn = document.getElementById('empty-cart-btn');
        const checkoutBtn = document.getElementById('checkout-btn');

        const checkoutFormModal = document.getElementById('checkout-form-modal');
        const closeCheckoutFormModalBtn = document.getElementById('close-checkout-form-modal');
        const customerForm = document.getElementById('customer-data-form');

        let productos = (await getProducts()).map(producto => ({
            ...producto,
            rubro: producto.rubro || detectRubro(producto.nombre, producto.presentacion, producto.seccion)
        }));

        let carrito = getCart();

        function populateFilters() {
            const rubros = [...new Set(productos.map(p => p.rubro).filter(Boolean))].sort((a, b) => a.localeCompare(b));

            rubroFilter.innerHTML = '<option value="">Todos los rubros</option>';

            rubros.forEach(rubro => {
                const option = document.createElement('option');
                option.value = rubro;
                option.textContent = rubro;
                rubroFilter.appendChild(option);
            });
        }

        function renderProducts(list) {
            productGrid.innerHTML = '';

            if (!list.length) {
                productGrid.innerHTML = `
                    <div class="empty-products">
                        <p>No hay productos para mostrar con esos filtros.</p>
                    </div>
                `;
                productsTotal.textContent = '0 productos';
                return;
            }

            productsTotal.textContent = `${list.length} productos`;

            list.forEach(producto => {
                const precioActual = getEffectivePrice(producto);
                const precioAnterior = getOldPrice(producto);

                const priceHTML = producto.tieneDescuento
                    ? `
                        <div class="price-block">
                            <span class="discount-badge">Descuento ${Math.round(producto.descuento * 100)}%</span>
                            <div class="price-label">${getEffectivePriceLabel(producto)}</div>
                            <div class="price-old">${formatPrice(precioAnterior)}</div>
                            <div class="price-current">${formatPrice(precioActual)}</div>
                        </div>
                    `
                    : `
                        <div class="price-block">
                            <div class="price-label">${getEffectivePriceLabel(producto)}</div>
                            <div class="price-current">${formatPrice(precioActual)}</div>
                        </div>
                    `;

                const productCard = document.createElement('div');
                productCard.className = 'product-row';
                productCard.innerHTML = `
                    <div class="product-main">
                        <div class="product-top">
                            <span class="product-code">${producto.codigo}</span>
                            <span class="product-tag product-tag-secondary">${producto.rubro}</span>
                            ${usaPrecioConIva(producto) ? '<span class="product-tag product-tag-iva">Solo C/IVA</span>' : ''}
                        </div>
                        <h3>${producto.nombre}</h3>
                        <p class="product-offer">${producto.presentacion || 'Sin detalle de presentación'}</p>
                    </div>

                    <div class="product-price-area">
                        ${priceHTML}
                    </div>

                    <div class="product-actions">
                        <label for="qty-${producto.codigo}" class="qty-label">Cantidad</label>
                        <input type="number" id="qty-${producto.codigo}" class="product-qty-input" min="1" value="1">
                        <button class="btn add-to-cart" data-codigo="${producto.codigo}">Agregar</button>
                    </div>
                `;

                productGrid.appendChild(productCard);
            });
        }

        function applyFiltersAndSort() {
            const search = normalizeText(searchInput.value);
            const rubroSeleccionado = rubroFilter.value;
            const sortValue = sortSelect.value;

            let resultado = [...productos];

            if (search) {
                resultado = resultado.filter(producto => {
                    const target = normalizeText(
                        `${producto.codigo} ${producto.nombre} ${producto.presentacion} ${producto.rubro} ${producto.seccion}`
                    );
                    return target.includes(search);
                });
            }

            if (rubroSeleccionado) {
                resultado = resultado.filter(producto => producto.rubro === rubroSeleccionado);
            }

            switch (sortValue) {
                case 'name-asc':
                    resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
                    break;
                case 'name-desc':
                    resultado.sort((a, b) => b.nombre.localeCompare(a.nombre, 'es'));
                    break;
                case 'price-asc':
                    resultado.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
                    break;
                case 'price-desc':
                    resultado.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
                    break;
                default:
                    break;
            }

            renderProducts(resultado);
        }

        function updateCart() {
            saveCart(carrito);

            const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
            const totalPrice = carrito.reduce((sum, item) => sum + (item.precioUnitario * item.cantidad), 0);

            cartCount.textContent = totalItems;
            cartTotal.textContent = formatPrice(totalPrice);

            if (!carrito.length) {
                cartItemsContainer.innerHTML = '<p class="empty-message">Tu carrito está vacío.</p>';
                return;
            }

            cartItemsContainer.innerHTML = '';

            carrito.forEach(item => {
                const row = document.createElement('div');
                row.className = 'cart-item';

                row.innerHTML = `
                    <div class="cart-item-info">
                        <strong>${item.nombre}</strong>
                        <span class="cart-item-code">${item.codigo}</span>
                        <span class="cart-item-price">${formatPrice(item.precioUnitario)} c/u - ${item.tipoPrecio}</span>
                    </div>

                    <div class="cart-item-controls">
                        <button class="quantity-btn" data-action="minus" data-codigo="${item.codigo}">−</button>
                        <span class="cart-item-qty">${item.cantidad}</span>
                        <button class="quantity-btn" data-action="plus" data-codigo="${item.codigo}">+</button>
                    </div>

                    <div class="cart-item-subtotal">
                        ${formatPrice(item.precioUnitario * item.cantidad)}
                    </div>

                    <button class="remove-item-btn" data-codigo="${item.codigo}">✕</button>
                `;

                cartItemsContainer.appendChild(row);
            });
        }

        function addToCart(codigo, cantidad) {
            const producto = productos.find(p => String(p.codigo) === String(codigo));
            if (!producto) return;

            const qty = Number(cantidad);
            if (!qty || qty < 1) {
                alert('Ingresá una cantidad válida.');
                return;
            }

            const precioUnitario = getEffectivePrice(producto);
            const tipoPrecio = getEffectivePriceLabel(producto);

            const itemEnCarrito = carrito.find(item => String(item.codigo) === String(codigo));

            if (itemEnCarrito) {
                itemEnCarrito.cantidad += qty;
            } else {
                carrito.push({
                    codigo: producto.codigo,
                    nombre: producto.nombre,
                    precioUnitario,
                    tipoPrecio,
                    cantidad: qty
                });
            }

            updateCart();
        }

        function changeCartQuantity(codigo, action) {
            const item = carrito.find(p => String(p.codigo) === String(codigo));
            if (!item) return;

            if (action === 'plus') item.cantidad += 1;
            if (action === 'minus') item.cantidad -= 1;

            if (item.cantidad <= 0) {
                carrito = carrito.filter(p => String(p.codigo) !== String(codigo));
            }

            updateCart();
        }

        function removeCartItem(codigo) {
            carrito = carrito.filter(p => String(p.codigo) !== String(codigo));
            updateCart();
        }

        populateFilters();
        applyFiltersAndSort();
        updateCart();

        productGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart')) {
                const codigo = e.target.dataset.codigo;
                const input = document.getElementById(`qty-${codigo}`);
                const cantidad = input ? input.value : 1;
                addToCart(codigo, cantidad);
            }
        });

        cartItemsContainer.addEventListener('click', (e) => {
            const codigo = e.target.dataset.codigo;
            const action = e.target.dataset.action;

            if (e.target.classList.contains('quantity-btn')) {
                changeCartQuantity(codigo, action);
            }

            if (e.target.classList.contains('remove-item-btn')) {
                removeCartItem(codigo);
            }
        });

        searchInput.addEventListener('input', applyFiltersAndSort);
        rubroFilter.addEventListener('change', applyFiltersAndSort);
        sortSelect.addEventListener('change', applyFiltersAndSort);

        cartButton.addEventListener('click', () => {
            cartModal.style.display = 'block';
        });

        closeCartModal.addEventListener('click', () => {
            cartModal.style.display = 'none';
        });

        emptyCartBtn.addEventListener('click', () => {
            if (carrito.length === 0) return;
            if (confirm('¿Querés vaciar el carrito?')) {
                carrito = [];
                updateCart();
            }
        });

        checkoutBtn.addEventListener('click', () => {
            if (!carrito.length) {
                alert('Tu carrito está vacío.');
                return;
            }
            cartModal.style.display = 'none';
            checkoutFormModal.style.display = 'block';
        });

        closeCheckoutFormModalBtn.addEventListener('click', () => {
            checkoutFormModal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === cartModal) cartModal.style.display = 'none';
            if (event.target === checkoutFormModal) checkoutFormModal.style.display = 'none';
        });

        customerForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const nombre = document.getElementById('nombre').value.trim();
            const apellido = document.getElementById('apellido').value.trim();
            const telefono = document.getElementById('telefono').value.trim();
            const email = document.getElementById('email').value.trim();
            const direccion = document.getElementById('direccion').value.trim();
            const localidad = document.getElementById('localidad').value.trim();

            const telefonoWhatsApp = sanitizePhoneForWhatsApp(telefono);

            if (!telefonoWhatsApp) {
                alert('Ingresá un número de teléfono válido.');
                return;
            }

            let pedidoResumen = '';
            let total = 0;

            carrito.forEach(item => {
                const subtotal = item.precioUnitario * item.cantidad;
                pedidoResumen += `\n- ${item.nombre} (${item.codigo}) x${item.cantidad} - ${formatPrice(subtotal)} [${item.tipoPrecio}]`;
                total += subtotal;
            });

            const mensaje = `¡Gracias por confiar en POLCARFER SRL! 🙌

Para finalizar su compra, le pasamos todos los datos ingresados, junto al pedido de compra realizado.

*Datos del cliente*
- Nombre: ${nombre} ${apellido}
- Teléfono: ${telefono}
- Email: ${email}
- Dirección: ${direccion}, ${localidad}

*Detalle del pedido*${pedidoResumen}

*Total del pedido:* ${formatPrice(total)}

*Alias de pago de POLCARFER:* ${ALIAS_POLCARFER}

Una vez realizado el pago, si lo desea puede enviarnos el comprobante. Muchas gracias por su compra.`;

            const urlWhatsApp = `https://wa.me/${telefonoWhatsApp}?text=${encodeURIComponent(mensaje)}`;
            window.open(urlWhatsApp, '_blank');

            carrito = [];
            updateCart();
            customerForm.reset();
            checkoutFormModal.style.display = 'none';
        });
    }

    async function initCatalogoPreciosPage() {
        if (pageId !== 'page-catalogo-precios') return;

        const searchInput = document.getElementById('price-list-search');
        const rubroFilter = document.getElementById('price-list-rubro-filter');
        const sortSelect = document.getElementById('price-list-sort');
        const totalLabel = document.getElementById('price-list-total');
        const tableBody = document.querySelector('#price-list-table tbody');

        let productos = (await getProducts()).map(producto => ({
            ...producto,
            rubro: producto.rubro || detectRubro(producto.nombre, producto.presentacion, producto.seccion)
        }));

        function populateFilters() {
            const rubros = [...new Set(productos.map(p => p.rubro).filter(Boolean))].sort((a, b) => a.localeCompare(b));

            rubroFilter.innerHTML = '<option value="">Todos los rubros</option>';

            rubros.forEach(rubro => {
                const option = document.createElement('option');
                option.value = rubro;
                option.textContent = rubro;
                rubroFilter.appendChild(option);
            });
        }

        function renderTable(list) {
            tableBody.innerHTML = '';

            totalLabel.textContent = `${list.length} productos`;

            if (!list.length) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center;">No hay productos para mostrar.</td>
                    </tr>
                `;
                return;
            }

            list.forEach(producto => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${producto.codigo}</td>
                    <td>${producto.nombre}</td>
                    <td>${producto.presentacion || '-'}</td>
                    <td>${formatPrice(producto.precioLista || 0)}</td>
                    <td>${producto.tieneDescuento ? `${Math.round(producto.descuento * 100)}%` : 'Sin descuento'}</td>
                    <td>${formatPrice(producto.tieneDescuento ? (producto.precioSinIvaDescuento || producto.precioSinIva || 0) : (producto.precioSinIva || 0))}</td>
                    <td>${formatPrice(producto.tieneDescuento ? (producto.precioConIvaDescuento || producto.precioConIva || 0) : (producto.precioConIva || 0))}</td>
                `;
                tableBody.appendChild(row);
            });
        }

        function applyFiltersAndSort() {
            const search = normalizeText(searchInput.value);
            const rubroSeleccionado = rubroFilter.value;
            const sortValue = sortSelect.value;

            let resultado = [...productos];

            if (search) {
                resultado = resultado.filter(producto => {
                    const target = normalizeText(
                        `${producto.codigo} ${producto.nombre} ${producto.presentacion} ${producto.rubro} ${producto.seccion}`
                    );
                    return target.includes(search);
                });
            }

            if (rubroSeleccionado) {
                resultado = resultado.filter(producto => producto.rubro === rubroSeleccionado);
            }

            switch (sortValue) {
                case 'name-asc':
                    resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
                    break;
                case 'name-desc':
                    resultado.sort((a, b) => b.nombre.localeCompare(a.nombre, 'es'));
                    break;
                case 'price-asc':
                    resultado.sort((a, b) => Number(a.precioSinIva || 0) - Number(b.precioSinIva || 0));
                    break;
                case 'price-desc':
                    resultado.sort((a, b) => Number(b.precioSinIva || 0) - Number(a.precioSinIva || 0));
                    break;
                default:
                    break;
            }

            renderTable(resultado);
        }

        populateFilters();
        applyFiltersAndSort();

        searchInput.addEventListener('input', applyFiltersAndSort);
        rubroFilter.addEventListener('change', applyFiltersAndSort);
        sortSelect.addEventListener('change', applyFiltersAndSort);
    }

    function initListaPreciosSociosPage() {
        if (pageId !== 'page-lista-precios') return;

        const loginSection = document.getElementById('login-section');
        const adminPanel = document.getElementById('admin-panel');
        const loginForm = document.getElementById('login-form');
        const codigoInput = document.getElementById('codigo-acceso');
        const uploadButton = document.getElementById('upload-btn');
        const fileInput = document.getElementById('excel-file');
        const clearStorageButton = document.getElementById('clear-storage-btn');
        const adminTableBody = document.querySelector('#admin-product-table tbody');

        function showAdminPreview(productos) {
            adminTableBody.innerHTML = '';

            if (!productos || !productos.length) {
                adminTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center;">No hay productos cargados.</td>
                    </tr>
                `;
                return;
            }

            productos.forEach(producto => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${producto.codigo}</td>
                    <td>${producto.nombre}</td>
                    <td>${producto.presentacion || '-'}</td>
                    <td>${formatPrice(producto.precioLista || 0)}</td>
                    <td>${producto.tieneDescuento ? `${Math.round(producto.descuento * 100)}%` : 'Sin descuento'}</td>
                    <td>${formatPrice(producto.precioSinIva || 0)}</td>
                    <td>${formatPrice(producto.precioConIva || 0)}</td>
                `;
                adminTableBody.appendChild(row);
            });
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (codigoInput.value === CODIGO_ACCESO_SOCIO) {
                loginSection.style.display = 'none';
                adminPanel.style.display = 'block';
                const currentProducts = await getProducts();
                showAdminPreview(currentProducts);
            } else {
                alert('Código de acceso incorrecto.');
            }
        });

        clearStorageButton.addEventListener('click', () => {
            alert('Para borrar el catálogo compartido, vaciá manualmente el archivo data/productos.json y volvé a subirlo a GitHub.');
        });

        uploadButton.addEventListener('click', () => {
            if (fileInput.files.length === 0) {
                alert('Seleccioná un archivo Excel.');
                return;
            }

            const reader = new FileReader();

            reader.onload = function(event) {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    const requiredSheets = [
                        'LISTA DE PRECIOS',
                        'SUPRABOND-BULIT-SOMERSET',
                        'LISTA CON DESCUENTOS'
                    ];

                    const faltantes = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet));

                    if (faltantes.length > 0) {
                        alert(`Faltan estas hojas en el Excel: ${faltantes.join(', ')}`);
                        return;
                    }

                    const wsListaPrecios = workbook.Sheets['LISTA DE PRECIOS'];
                    const wsSuprabond = workbook.Sheets['SUPRABOND-BULIT-SOMERSET'];
                    const wsDescuentos = workbook.Sheets['LISTA CON DESCUENTOS'];

                    const rawListaPrecios = XLSX.utils.sheet_to_json(wsListaPrecios, { header: 1, defval: '' });
                    const rawSuprabond = XLSX.utils.sheet_to_json(wsSuprabond, { header: 1, defval: '' });
                    const rawDescuentos = XLSX.utils.sheet_to_json(wsDescuentos, { header: 1, defval: '' });

                    const discountMap = buildDiscountMap(rawDescuentos);

                    const productosLista = parseListaDePrecios(rawListaPrecios, discountMap);
                    const productosSuprabond = parseSuprabondBulitSomerset(rawSuprabond, discountMap);

                    const productosFinales = [...productosLista, ...productosSuprabond];

                    if (!productosFinales.length) {
                        alert('No se encontraron productos válidos para cargar.');
                        return;
                    }

                    showAdminPreview(productosFinales);
                    downloadJSONFile(productosFinales, 'productos.json');

                    alert(
                        '¡JSON generado con éxito!\n\n' +
                        'Ahora hacé esto:\n' +
                        '1. Reemplazá el archivo data/productos.json de tu proyecto por el que se descargó.\n' +
                        '2. Hacé commit.\n' +
                        '3. Hacé push a GitHub.\n\n' +
                        'Después de eso, todos los usuarios verán el catálogo actualizado.'
                    );
                } catch (error) {
                    console.error('Error al procesar el archivo Excel:', error);
                    alert('Hubo un error al procesar el archivo. Revisá que estén las hojas requeridas y el formato de columnas.');
                }
            };

            reader.readAsArrayBuffer(fileInput.files[0]);
        });
    }

    initPedidosPage();
    initCatalogoPreciosPage();
    initListaPreciosSociosPage();
});