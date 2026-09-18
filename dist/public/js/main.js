let selectedPackage = null;

// Load products on page load
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const result = await response.json();
        
        if (result.success) {
            renderProducts(result.data);
        } else {
            showError('Gagal memuat produk');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Terjadi kesalahan saat memuat produk');
    }
}

function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = products.map(product => `
        <div class="product-card ${selectedPackage?.id === product.id ? 'selected' : ''}" 
             onclick="selectPackage('${product.id}')">
            <h3 class="product-name">${product.name}</h3>
            <div class="product-price">Rp ${formatPrice(product.price)}</div>
            <ul class="product-specs">
                <li><strong>RAM:</strong> ${formatRAM(product.ram)}</li>
                <li><strong>Disk:</strong> ${formatDisk(product.disk)}</li>
                <li><strong>CPU:</strong> ${product.cpu}%</li>
                <li><strong>Status:</strong> ${getStatusBadge(product.description)}</li>
            </ul>
            <button class="btn btn-primary" style="width:100%">Pilih Paket</button>
        </div>
    `).join('');
}

function selectPackage(id) {
    selectedPackage = products.find(p => p.id === id);
    document.getElementById('packageId').value = id;
    
    document.getElementById('selectedPackageInfo').innerHTML = `
        <strong>Paket Terpilih:</strong> ${selectedPackage.name}<br>
        <strong>Harga:</strong> Rp ${formatPrice(selectedPackage.price)}<br>
        <small>Sekarang dapat invoice unik & tracking code!</small>
    `;
    
    document.getElementById('orderFormContainer').style.display = 'block';
    renderProducts(products); // Re-render to update selection
    document.getElementById('orderFormContainer').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedPackage) {
        showError('Silakan pilih paket terlebih dahulu');
        return;
    }

    showLoading(true, 'Membuat pesanan dengan invoice unik...');
    
    const orderData = {
        customerName: document.getElementById('customerName').value,
        customerEmail: document.getElementById('customerEmail').value,
        customerPhone: document.getElementById('customerPhone').value,
        packageId: document.getElementById('packageId').value,
        paymentMethod: document.getElementById('paymentMethod').value
    };

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        
        if (result.success) {
            const { invoiceId, trackingUrl } = result.data;
            
            showSuccess(`✅ Pesanan berhasil dibuat!\n\n📋 Invoice ID: ${invoiceId}\n🔗 Tracking: ${trackingUrl}\n\nKami akan menghubungi Anda untuk pembayaran.`);
            
            // Reset form
            document.getElementById('orderForm').reset();
            selectedPackage = null;
            document.getElementById('orderFormContainer').style.display = 'none';
            
        } else {
            showError('❌ Gagal membuat pesanan: ' + result.error);
        }
    } catch (error) {
        console.error('Order creation error:', error);
        showError('❌ Terjadi kesalahan saat membuat pesanan');
    } finally {
        showLoading(false);
    }
});

async function trackOrder() {
    const invoiceId = document.getElementById('trackingInput').value.trim();
    
    if (!invoiceId) {
        showError('Silakan masukkan Invoice ID');
        return;
    }

    showLoading(true, 'Mengecek status pesanan...');
    
    try {
        const response = await fetch(`/api/track/${invoiceId}`);
        const result = await response.json();
        
        const resultBox = document.getElementById('trackResult');
        
        if (result.success) {
            const order = result.data;
            
            let html = `<h4>Detail Pesanan #${order.invoice_id}</h4>`;
            html += `<p><strong>Paket:</strong> ${order.package_name}</p>`;
            html += `<p><strong>Harga:</strong> Rp ${formatPrice(order.price)}</p>`;
            html += `<p><strong>Status:</strong> ${getStatusBadge(order.status)}</p>`;
            html += `<p><strong>Dibuat:</strong> ${new Date(order.created_at).toLocaleString('id-ID')}</p>`;
            
            if (order.status === 'completed') {
                html += `
                    <div style="background:#d4edda;padding:15px;border-radius:8px;margin-top:15px;">
                        <h4>✅ Server Sudah Siap!</h4>
                        <p><strong>Panel URL:</strong> <a href="${order.pterodactyl_panel_url}" target="_blank">Buka Panel</a></p>
                        <p><strong>Username:</strong> user_${invoiceId.replace(/\D/g, '')}</p>
                        <p><strong>Password:</strong> ••••••••••••</p>
                        <small>⚠️ Password dikirim via email/WA setelah pembayaran konfirmasi</small>
                    </div>
                `;
            } else {
                html += `<p><em>Pesanan dalam proses. Silakan tunggu notifikasi.</em></p>`;
            }
            
            resultBox.innerHTML = html;
            resultBox.classList.add('show');
            
        } else {
            resultBox.innerHTML = `<p style="color:#721c24;">❌ Order tidak ditemukan</p>`;
            resultBox.classList.add('show');
        }
    } catch (error) {
        console.error('Track error:', error);
        showError('❌ Error saat mengecek status');
    } finally {
        showLoading(false);
    }
}

// Helper functions
function formatPrice(price) {
    return new Intl.NumberFormat('id-ID').format(price);
}

function formatRAM(bytes) {
    return bytes > 0 ? (bytes / 1024).toFixed(0) + ' GB' : 'Unlimited';
}

function formatDisk(bytes) {
    return bytes > 0 ? (bytes / 1024).toFixed(0) + ' GB' : 'Unlimited';
}

function getStatusBadge(status) {
    const badges = {
        'pending': '⏳ Pending',
        'paid': '💰 Paid',
        'processing': '🔄 Processing...',
        'active': '✅ Active',
        'completed': '✅ Ready!',
        'expired': '❌ Expired'
    };
    return badges[status] || status;
}

function showLoading(show, text = 'Memproses...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (show) {
        loadingText.textContent = text;
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

function showSuccess(message) {
    const alert = document.getElementById('successAlert');
    alert.textContent = message;
    alert.classList.add('show');
    setTimeout(() => alert.classList.remove('show'), 10000);
}

function showError(message) {
    const alert = document.getElementById('errorAlert');
    alert.textContent = '❌ ' + message;
    alert.classList.add('show');
    setTimeout(() => alert.classList.remove('show'), 5000);
}
