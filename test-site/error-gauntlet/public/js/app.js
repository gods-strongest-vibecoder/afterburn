// NimbusAI main JS — contains intentional errors for Afterburn testing

// Intentional: reference undefined variable (causes console error)
console.log("NimbusAI loaded, version: " + APP_VERSION);

// Intentional: call undefined function on page load (runtime error)
document.addEventListener('DOMContentLoaded', function() {
  try {
    initializeAnalytics();
  } catch(e) {
    // swallowed silently — bad practice
  }

  // Intentional: uncaught TypeError — accessing property of null
  var heroCount = document.getElementById('visitor-counter').innerText;

  // Intentional: unused fetch that 500s
  fetch('/api/subscribe', { method: 'POST', body: '{}' })
    .then(r => r.json())
    .then(d => { /* nothing */ });
});

// Intentional: render-blocking long computation (performance)
function heavyComputation() {
  var result = 0;
  for (var i = 0; i < 1000000; i++) {
    result += Math.sqrt(i) * Math.sin(i);
  }
  return result;
}
// run it synchronously on load
var computeResult = heavyComputation();

// Newsletter handler — form action goes to broken endpoint
function handleSubscribe(e) {
  e.preventDefault();
  var email = document.querySelector('.subscribe-input');
  if (email && email.value) {
    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.error) {
        // Intentional: throws, no user feedback
        throw new Error('Subscribe failed');
      }
    });
  }
}

// Contact form handler
function handleContact(e) {
  e.preventDefault();
  // Intentional: sends to wrong endpoint, no validation
  fetch('/api/contact', {
    method: 'POST',
    body: new FormData(e.target)
  });
  alert('Message sent!');
}

// Intentional: function attached to onclick but never defined in some pages
// function handleGetStarted() { ... } — missing, will throw ReferenceError
