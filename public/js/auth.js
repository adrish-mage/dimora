// Show/hide toggle for password fields.
document.querySelectorAll('[data-reveal]').forEach(button => {
  const input = document.getElementById(button.dataset.reveal)
  if (!input) return

  button.addEventListener('click', () => {
    const showing = input.type === 'text'
    input.type = showing ? 'password' : 'text'
    button.textContent = showing ? 'Show' : 'Hide'
    button.setAttribute('aria-pressed', String(!showing))
  })
})
