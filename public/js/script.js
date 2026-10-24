// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      form.classList.add('was-validated')

      const submitButton = form.querySelector('button[type="submit"], button:not([type])')
      if (submitButton && !submitButton.disabled) {
        submitButton.disabled = true
        submitButton.classList.add('is-submitting')
        submitButton.dataset.originalLabel = submitButton.innerHTML
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Working...'
        submitButton.setAttribute('aria-busy', 'true')
      }
    }, false)
  })
})()

document.querySelectorAll('.flash-message').forEach(message => {
  window.setTimeout(() => {
    if (window.bootstrap) {
      bootstrap.Alert.getOrCreateInstance(message).close()
    }
  }, 5500)
})

document.querySelectorAll('.listing-card-saved[role="button"]').forEach(bookmark => {
  const toggleSaved = async event => {
    event.preventDefault()
    event.stopPropagation()

    if (bookmark.dataset.authenticated !== 'true') {
      window.location.assign('/login')
      return
    }

    if (bookmark.dataset.saving === 'true') return

    const willBeSaved = bookmark.getAttribute('aria-pressed') !== 'true'
    const status = bookmark.querySelector('[role="status"]')
    bookmark.dataset.saving = 'true'
    if (status) status.textContent = ''

    try {
      const response = await fetch(
        willBeSaved ? bookmark.dataset.saveUrl : bookmark.dataset.unsaveUrl,
        {
          method: 'POST',
          body: new URLSearchParams({ _csrf: bookmark.dataset.csrfToken }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          credentials: 'same-origin'
        }
      )
      const result = await response.json()
      if (!response.ok || result.saved !== willBeSaved) {
        throw new Error('Could not update saved room')
      }

      bookmark.setAttribute('aria-pressed', String(result.saved))
      bookmark.setAttribute(
        'aria-label',
        `${result.saved ? 'Remove' : 'Save'} ${bookmark.dataset.listingTitle}${result.saved ? ' from saved rooms' : ''}`
      )
      const icon = bookmark.querySelector('i')
      icon?.classList.toggle('fa-solid', result.saved)
      icon?.classList.toggle('fa-regular', !result.saved)
      if (status) status.textContent = result.saved ? 'Room saved' : 'Room removed from saved rooms'
    } catch {
      if (status) status.textContent = 'Could not update this room. Please try again.'
    } finally {
      delete bookmark.dataset.saving
    }
  }

  bookmark.addEventListener('click', toggleSaved)
  bookmark.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') toggleSaved(event)
  })
})

const imageInput = document.querySelector('#image')
const imagePreview = document.querySelector('#image-preview')

if (imageInput && imagePreview) {
  imageInput.addEventListener('change', () => {
    const [selectedImage] = imageInput.files

    if (selectedImage) {
      imagePreview.src = URL.createObjectURL(selectedImage)
    }
  })
}