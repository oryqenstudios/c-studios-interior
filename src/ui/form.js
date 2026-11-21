// Enquiry form: validation, submit, success and failure states.

// Both values come from .env (or the host's environment settings) at build time.
// Until a real endpoint is set, a valid submission shows the success state with a
// visible demo note and sends nothing.
const ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT ?? '';
const FALLBACK_EMAIL = import.meta.env.VITE_ENQUIRY_EMAIL || '[EMAIL]';

const hasEndpoint = /^https?:\/\//.test(ENDPOINT);

const RULES = {
  name: (v) => (v.trim() ? '' : 'Please enter your name.'),
  email: (v) => {
    if (!v.trim()) return 'Please enter your email address.';
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address, such as name@example.com.';
  },
  project_type: (v) => (v ? '' : 'Please choose a project type.'),
  message: (v) => (v.trim() ? '' : 'Please tell us a little about the project.'),
};

export function initForm() {
  const form = document.getElementById('enquiry');
  const success = document.getElementById('enquiry-success');
  if (!form || !success) return;

  const status = form.querySelector('.form__status');
  const submit = form.querySelector('[type="submit"]');
  const submitLabel = submit.textContent;
  let attempted = false;

  function showError(input, message) {
    const field = input.closest('.field');
    let error = field.querySelector('.field__error');
    if (message) {
      if (!error) {
        error = document.createElement('p');
        error.className = 'field__error';
        error.id = `${input.id}-error`;
        field.append(error);
      }
      error.textContent = message;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', error.id);
    } else {
      error?.remove();
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  }

  function validate(name) {
    const input = form.elements[name];
    const message = RULES[name](input.value);
    showError(input, message);
    return !message;
  }

  function setStatus(message) {
    status.hidden = !message;
    status.textContent = message;
  }

  // After the first attempt, errors clear as soon as each field is corrected.
  for (const name of Object.keys(RULES)) {
    const input = form.elements[name];
    input.addEventListener('blur', () => attempted && validate(name));
    input.addEventListener('input', () => input.hasAttribute('aria-invalid') && validate(name));
  }

  function showSuccess(demo) {
    form.hidden = true;
    success.hidden = false;
    success.querySelector('[data-demo-note]').hidden = !demo;
    success.focus();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    attempted = true;
    setStatus('');

    const invalid = Object.keys(RULES).filter((name) => !validate(name));
    if (invalid.length) {
      form.elements[invalid[0]].focus();
      return;
    }

    const data = new FormData(form);
    // Spam trap: a filled hidden field means a bot. Pretend it worked and send nothing.
    if (data.get('website')) {
      showSuccess(false);
      return;
    }
    data.delete('website');

    submit.disabled = true;
    submit.textContent = 'Sending…';

    try {
      const forceFailure = import.meta.env.DEV && new URLSearchParams(location.search).get('form') === 'fail';
      if (forceFailure) throw new Error('Forced failure for testing');

      if (hasEndpoint) {
        const response = await fetch(ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Form service answered ${response.status}`);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      showSuccess(!hasEndpoint);
    } catch {
      setStatus(`Sorry, your message was not sent. Please try again, or email us at ${FALLBACK_EMAIL}.`);
    } finally {
      submit.disabled = false;
      submit.textContent = submitLabel;
    }
  });
}
