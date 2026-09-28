const toolbar = document.querySelector('.toolbar');
const buttons = [...document.querySelectorAll('[data-filter]')];
const search = document.querySelector('input[type="search"]');
const cards = [...document.querySelectorAll('.project')];
let category = '全部';
function filterProjects() {
  const query = search.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const card of cards) {
    const match = (category === '全部' || card.dataset.category === category) && (card.dataset.search + ' ' + card.dataset.category).toLocaleLowerCase().includes(query);
    card.hidden = !match;
    if (match) visible++;
  }
  document.querySelector('.empty').hidden = visible !== 0;
  document.querySelector('#result-status').textContent = `显示 ${visible} 个项目`;
  for (const button of buttons) {
    const active = button.dataset.filter === category;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  }
}
for (const button of buttons) button.addEventListener('click', () => {category = button.dataset.filter; filterProjects();});
search.addEventListener('input', filterProjects);
document.querySelector('#reset').addEventListener('click', () => {category = '全部'; search.value = ''; filterProjects(); search.focus();});
toolbar.hidden = false;
