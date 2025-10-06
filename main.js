// Helper function to reset the submit button state
function resetFormState(button) {
    button.disabled = false;
    button.textContent = 'Book Now';
}

/**
 * Submits data to PayFast via a hidden POST form, which securely includes the Merchant Key.
 * This function is placed OUTSIDE the main DOMContentLoaded to ensure scope visibility.
 */
function submitPayFastPayment(serviceDetails, config) {
    const payFastForm = document.createElement('form');
    payFastForm.method = 'POST';
    payFastForm.action = config.PAYFAST_URL; // https://www.payfast.co.za/eng/process
    payFastForm.style.display = 'none'; // Keep it invisible
    
    // ⭐️ FIX: Add target="_blank" to open the PayFast page in a new tab
    payFastForm.target = '_blank'; 

    // Define ALL PayFast fields, including the Merchant Key (Required for POST)
    const payFastFields = {
        merchant_id: config.PAYFAST_MERCHANT_ID,
        merchant_key: config.PAYFAST_MERCHANT_KEY, // The key must be sent via POST
        amount: serviceDetails.amount_zar,
        item_name: serviceDetails.item_name,
        currency: 'ZAR',
        // Add return and cancel URLs here if desired
    };

    for (const key in payFastFields) {
        if (payFastFields.hasOwnProperty(key)) {
            const hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.name = key;
            hiddenField.value = payFastFields[key];
            payFastForm.appendChild(hiddenField);
        }
    }

    document.body.appendChild(payFastForm);
    payFastForm.submit();
}


// The main script listener 
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('bookingForm');
    if (!form) return;

    // --- CONFIGURATION ---
    
    // 1. Consultation Prices and Details (ZAR, USD, and GBP)
    const CONSULTATION_DETAILS = {
        '15min': {
            amount_zar: '120.00',
            amount_usd: '7.00',
            amount_gbp: '5.20',
            item_name: 'Fibro Mentoring - 15 Min Consult'
        },
        '30min': {
            amount_zar: '250.00',
            amount_usd: '14.50',
            amount_gbp: '10.80',
            item_name: 'Fibro Mentoring - 30 Min Consult'
        },
        '45min': {
            amount_zar: '350.00',
            amount_usd: '20.30',
            amount_gbp: '15.00',
            item_name: 'Fibro Mentoring - 45 Min Consult'
        }
    };
    
    // 2. Gateway Credentials and Endpoints (CHECK THESE VALUES)
    const GATEWAY_CONFIG = {
        FORMSPREE_ENDPOINT: 'https://formspree.io/f/mldpnvlg', 
        
        // CRITICAL: Must be the full PayPal email for the fixed-amount URL if you use it.
        PAYPAL_EMAIL: 'aliciaafrica.2017@gmail.com', 
        
        PAYFAST_MERCHANT_ID: '26215481', 
        PAYFAST_MERCHANT_KEY: 'g7s2qksaeqadl', // YOUR LIVE KEY
        
        PAYFAST_URL: 'https://www.payfast.co.za/eng/process'
    };

    // --- SETUP ELEMENTS ---
    const submitBtn = form.querySelector('button[type="submit"]');
    const thankYouMsg = document.createElement('div');
    thankYouMsg.classList.add('thankyou');
    thankYouMsg.style.display = 'none';
    thankYouMsg.innerHTML = `
        <h3>Thank you! Booking received. Please check the new tab to complete payment.</h3>
        <p>We’ve received your request. Check your email - we will contact you shortly.</p>
    `;
    form.parentNode.insertBefore(thankYouMsg, form.nextSibling);

    // --- MAIN SUBMISSION LOGIC ---
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        const formData = new FormData(form);
        const country = (formData.get('country') || '').toUpperCase().trim();
        const service = formData.get('service') || '';

        const isPaidService = service.includes('pay');
        const serviceKey = isPaidService ? service.split('-')[0] : null; 
        const serviceDetails = serviceKey ? CONSULTATION_DETAILS[serviceKey] : null;

        // 1. Submit form data to Formspree
        formData.append('_subject', 'New booking request from website');
        
        try {
            const resp = await fetch(GATEWAY_CONFIG.FORMSPREE_ENDPOINT, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            });

            if (!resp.ok) throw new Error('Form submission failed');

            // 2. Handle Payment Redirection
            if (isPaidService && serviceDetails) {
                
                let redirectUrl = '';
                
                if (country === 'US') {
                    // PayPal fixed-amount URL
                    redirectUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${GATEWAY_CONFIG.PAYPAL_EMAIL}&amount=${serviceDetails.amount_usd}&currency=USD&item_name=${encodeURIComponent(serviceDetails.item_name)}`;

                } else if (country === 'UK') {
                    // PayPal fixed-amount URL
                    redirectUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${GATEWAY_CONFIG.PAYPAL_EMAIL}&amount=${serviceDetails.amount_gbp}&currency=GBP&item_name=${encodeURIComponent(serviceDetails.item_name)}`;
                
                } else if (country === 'ZA') {
                    
                    // Call the dedicated function for secure POST submission in a new tab
                    submitPayFastPayment(serviceDetails, GATEWAY_CONFIG);
                    
                    // ⭐️ FIX: Show thank you message immediately after new tab opens
                    form.style.display = 'none';
                    thankYouMsg.style.display = 'block';
                    return; 

                } else {
                    alert('We only accept payments from South Africa (ZA), the United States (US), and the United Kingdom (UK) at this time.');
                    resetFormState(submitBtn);
                    return;
                }

                // Redirect for PayPal (US or UK)
                if (redirectUrl) {
                    // ⭐️ FIX: Use window.open() to open the link in a new tab ('_blank')
                    window.open(redirectUrl, '_blank'); 
                    
                    // Show confirmation message in the original tab
                    form.style.display = 'none';
                    thankYouMsg.style.display = 'block';
                    return;
                }
            }

            // 3. Handle Free Consultation (No Payment Required)
            form.style.display = 'none';
            thankYouMsg.style.display = 'block';

        } catch (err) {
            console.error(err);
            alert('Oops! Something went wrong with your booking. Please try again.');
            resetFormState(submitBtn);
        }
    });
});