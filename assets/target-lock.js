const jointType = "butt";
const label = "Stumpfnaht";
document.documentElement.dataset.appTarget = "stumpfnaht";
const choices = [...document.querySelectorAll('input[name="joint_type"]')];
for (const input of choices) {
  const selected = input.value === jointType;
  input.checked = selected;
  input.disabled = true;
  input.closest('label')?.classList.toggle('hidden', !selected);
}
const fieldset = choices[0]?.closest('fieldset');
if (fieldset) {
  fieldset.hidden = true;
  fieldset.setAttribute('aria-hidden', 'true');
}
