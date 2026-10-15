(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const form = $('#quote-form');
  const fields = [...document.querySelectorAll('[data-step]')];
  let step = 0;
  let summary = '';
  const config = window.BRAND_CONFIG || {};
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = $('.hero');
  let scrollFrame = 0;
  function paintHeroScroll() {
    scrollFrame = 0;
    const bounds = hero.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -bounds.top / bounds.height));
    hero.style.setProperty('--scroll-shift', motionPreference.matches ? '0px' : `${progress * 28}px`);
    hero.style.setProperty('--scroll-scale', motionPreference.matches ? '1' : `${1.04 + progress * .04}`);
  }
  function scheduleHeroScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(paintHeroScroll);
  }
  window.addEventListener('scroll', scheduleHeroScroll, {passive:true});
  window.addEventListener('resize', scheduleHeroScroll, {passive:true});
  motionPreference.addEventListener('change', scheduleHeroScroll);
  paintHeroScroll();
  $('#year').textContent = new Date().getFullYear();
  const today = new Date();
  $('#appointment').min = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  $('.menu-toggle').addEventListener('click', () => {
    const open = $('.menu-toggle').getAttribute('aria-expanded') !== 'true';
    $('.menu-toggle').setAttribute('aria-expanded', String(open));
    $('#navigation').classList.toggle('open', open);
  });
  $('#navigation').addEventListener('click', (e) => {
    if (e.target.closest('a')) { $('#navigation').classList.remove('open'); $('.menu-toggle').setAttribute('aria-expanded','false'); }
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape'){ $('#navigation').classList.remove('open'); $('.menu-toggle').setAttribute('aria-expanded','false'); } });
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('js-motion');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }
  function showStep(n, focus = true) {
    step = n;
    fields.forEach((field, i) => { field.hidden = i !== step; field.disabled = i !== step; });
    $('#step-label').textContent = `STEP ${step + 1} OF 3`;
    document.querySelectorAll('.step-progress i').forEach((el,i) => el.classList.toggle('active', i <= step));
    $('#back').hidden = step === 0;
    $('#next').hidden = step === 2;
    $('#submit').hidden = step !== 2;
    if (focus) fields[step].querySelector('input,select,textarea').focus({preventScroll:true});
  }
  function validStep() {
    for (const input of fields[step].querySelectorAll('input,select,textarea')) {
      if (input.required && input.type !== 'checkbox' && !input.value.trim()) { input.setCustomValidity('Please fill in this field.'); }
      else input.setCustomValidity('');
      if (!input.reportValidity()) return false;
    }
    return true;
  }
  form.addEventListener('input', e => e.target.setCustomValidity?.(''));
  $('#next').addEventListener('click', () => { if(validStep()) showStep(step + 1); });
  $('#back').addEventListener('click', () => showStep(step - 1));
  document.querySelectorAll('[data-fabric]').forEach(link => link.addEventListener('click', () => {
    $('#fabric').value = link.dataset.fabric;
    $('#garment').value = link.dataset.garment || 'Suit';
    $('#quote-result').hidden = true; form.hidden = false; showStep(0, false);
  }));
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validStep()) return;
    if(step < 2) { showStep(step + 1); return; }
    fields.forEach(field => field.disabled = false);
    const values = Object.fromEntries(new FormData(form).entries());
    fields.forEach((field, i) => field.disabled = i !== step);
    summary = [
      'LENIN SILK CORP — BESPOKE ENQUIRY', '',
      `Name: ${values.name.trim()}`, `Email: ${values.email.trim()}`, `Phone / WhatsApp: ${values.phone.trim()}`, '',
      `Garment: ${values.garment}`, `Fabric: ${values.fabric}`, `Occasion: ${values.occasion}`,
      `Preferences: ${values.preferences.trim() || 'To discuss'}`, `Budget: ${values.budget.trim() || 'To discuss'}`, '',
      'Tailor appointment: Requested (subject to confirmation)',
      `Location: ${values.city.trim()}, ${values.country.trim()}`,
      `Preferred date: ${values.appointment || 'To arrange'}`,
      `Measurements / notes: ${values.measurements.trim() || 'To be taken by tailor'}`, '',
      'Customer agrees to contact about this enquiry and tailor appointment.'
    ].join('\n');
    $('#quote-summary').textContent = summary;
    const email = typeof config.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email.trim()) ? config.email.trim() : '';
    const phone = typeof config.whatsapp === 'string' ? config.whatsapp.replace(/\D/g,'') : '';
    const hasPhone = /^\d{7,15}$/.test(phone);
    $('#email-link').hidden = !email;
    $('#whatsapp-link').hidden = !hasPhone;
    if(email) $('#email-link').href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Bespoke enquiry — ' + values.name.trim())}&body=${encodeURIComponent(summary)}`;
    if(hasPhone) $('#whatsapp-link').href = `https://wa.me/${phone}?text=${encodeURIComponent(summary)}`;
    $('#delivery-status').textContent = email || hasPhone
      ? 'Your enquiry is prepared, but has not been sent. Use the available contact options below to send it. To reach us on both channels, send each draft separately.'
      : 'Your enquiry is prepared, but has not been sent. Online contact is not available yet. Download a copy to keep your preferences ready.';
    form.hidden = true; $('#quote-result').hidden = false;
    $('#result-title').focus({preventScroll:true});
  });
  $('#download-quote').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([summary], {type:'text/plain;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = 'lenin-silk-corp-enquiry.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('#edit-quote').addEventListener('click', () => { $('#quote-result').hidden = true; form.hidden = false; showStep(0); });
  showStep(0, false);
  if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController();
    const fabrics = [...$('#fabric').options].map(option => option.value);
    try {
      Promise.resolve(document.modelContext.registerTool({
        name: 'start_bespoke_enquiry',
        description: 'Open the bespoke enquiry form with a selected fabric. Does not submit an enquiry or book an appointment.',
        inputSchema: {type:'object',properties:{fabric:{type:'string',enum:fabrics}},required:['fabric'],additionalProperties:false},
        annotations: {readOnlyHint:false,untrustedContentHint:false},
        execute(input) {
          if (!input || !fabrics.includes(input.fabric)) throw new Error('Choose a listed fabric.');
          $('#fabric').value = input.fabric;
          $('#garment').value = input.fabric === 'Linen' ? 'Linen shirt' : 'Suit';
          form.hidden = false; $('#quote-result').hidden = true; showStep(0, false);
          $('#quote').scrollIntoView();
          return {status:'draft_started',fabric:input.fabric,submitted:false};
        }
      }, {signal:lifecycle.signal})).catch(() => {});
      window.addEventListener('pagehide', () => lifecycle.abort(), {once:true});
    } catch { /* Form remains available when WebMCP is unsupported. */ }
  }
})();
