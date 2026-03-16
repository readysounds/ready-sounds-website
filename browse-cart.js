// browse-cart.js — Cart state and all cart UI/checkout functions for browse.html
// Depends on: browse-tracks.js (cart array, escHtml, trackData), supabase.js

function openCart() {
    document.getElementById('cartModal').classList.add('open');
    document.getElementById('cartOverlay').classList.add('visible');
    renderCart();
}

function closeCart() {
    document.getElementById('cartModal').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('visible');
}

function updateCartCount() {
    const cartBtn = document.getElementById('cartBtn');
    if (cart.length > 0) {
        cartBtn.innerHTML = `Cart <span class="cart-count">${cart.length}</span>`;
    } else {
        cartBtn.innerHTML = 'Cart (0)';
    }
}

function addToCart(event, trackId) {
    event.stopPropagation();

    // Get track info from the DOM
    const trackElement = event.target.closest('.track-item');
    if (!trackElement) {
        console.error('Could not find track element');
        return;
    }

    const titleElement = trackElement.querySelector('.track-title');
    if (!titleElement) {
        console.error('Could not find track title');
        return;
    }

    // Get title and clean up the versions badge
    let title = titleElement.textContent.trim();
    title = title.replace(/\d+\s+versions?/i, '').trim();

    // Extract artist from title (format is "Artist - Track")
    const parts = title.split(' - ');
    const artist = parts.length > 1 ? parts[0].trim() : 'Buck Moon';

    // Check if already in cart
    const existingItem = cart.find(item => item.id === trackId);
    if (existingItem) {
        alert('This track is already in your cart!');
        return;
    }

    // Add to cart with default Individual license
    cart.push({
        id: trackId,
        title: title,
        artist: artist,
        license: 'individual',
        price: 10
    });

    updateCartCount();

    // Show feedback on the button
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Added';
    btn.style.background = '#4caf50';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 1500);
}

function removeFromCart(trackId) {
    cart = cart.filter(item => item.id !== trackId);
    updateCartCount();
    renderCart();
}

function changeLicense(trackId, licenseType) {
    const item = cart.find(item => item.id === trackId);
    if (item) {
        item.license = licenseType;
        item.price = licenseType === 'individual' ? 10 : 125;
        renderCart();
    }
}

// Render cart contents
function renderCart() {
    const cartBody = document.getElementById('cartBody');
    const cartFooter = document.getElementById('cartFooter');

    if (cart.length === 0) {
        cartBody.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">🛒</div>
                <p>Your cart is empty</p>
            </div>
        `;
        cartFooter.style.display = 'none';
        return;
    }

    let cartHTML = '';
    let total = 0;

    cart.forEach(item => {
        total += item.price;

        cartHTML += `
            <div class="cart-item">
                <div class="cart-item-header">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${escHtml(item.title)}</div>
                        <div class="cart-item-artist">${escHtml(item.artist || 'Buck Moon')}</div>
                    </div>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})" title="Remove from cart">×</button>
                </div>

                <div class="cart-item-license">
                    <div class="license-label">License Type</div>
                    <div class="license-options">
                        <button class="license-btn ${item.license === 'individual' ? 'active' : ''}"
                                onclick="changeLicense(${item.id}, 'individual')">
                            Individual
                            <span class="license-price">$10</span>
                        </button>
                        <button class="license-btn ${item.license === 'business' ? 'active' : ''}"
                                onclick="changeLicense(${item.id}, 'business')">
                            Business
                            <span class="license-price">$125</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    cartBody.innerHTML = cartHTML;
    document.getElementById('cartTotal').textContent = `$${total}`;
    cartFooter.style.display = 'block';
}

async function proceedToCheckout() {
    if (cart.length === 0) return;

    const lineItems = cart.map(item => ({
        trackId: item.id,
        trackTitle: trackData[item.id] ? trackData[item.id].title : item.title,
        license: item.license,
        price: item.price
    }));

    try {
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: lineItems,
                mode: 'payment'
            })
        });

        const session = await response.json();

        if (session.error) {
            alert('Checkout error: ' + session.error);
            return;
        }

        const stripe = Stripe('pk_live_51Ss8KQRzfMLCjnGKS8LlJqJNO3mlbehpSo19N1E6c8WhBqKCP5KvdbC8APag5Fp8jQ0pW6Bk9oSWaoXFdodwgS5X00HmOqYDwn');
        const result = await stripe.redirectToCheckout({ sessionId: session.id });

        if (result.error) {
            alert('Payment error: ' + result.error.message);
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Unable to process checkout. Please try again.');
    }
}

document.getElementById('cartBtn').addEventListener('click', openCart);
