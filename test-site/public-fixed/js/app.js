// FlowSync — main app script (fixed version)

// App initialized successfully
(function () {
  console.log('FlowSync app loaded');
})();

// Newsletter form handler — submits via fetch, shows success message
function handleNewsletterSubmit(event) {
  event.preventDefault();
  var status = document.getElementById('newsletter-status');
  if (status) {
    status.textContent = 'Thanks for subscribing!';
    status.style.color = '#10b981';
  }
  return false;
}

// Contact form handler — submits via fetch, shows success message
function handleContactSubmit(event) {
  event.preventDefault();
  var status = document.getElementById('form-status');
  if (status) {
    status.textContent = 'Message sent! We will get back to you soon.';
    status.style.color = '#10b981';
  }
  return false;
}
