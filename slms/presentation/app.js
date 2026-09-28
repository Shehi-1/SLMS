const slides = [...document.querySelectorAll('.slide')];
const count = document.getElementById('slideCount');
const progress = document.getElementById('progressBar');
let current = 0;

function showSlide(index) {
  current = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => slide.classList.toggle('active', slideIndex === current));
  count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  progress.style.width = `${((current + 1) / slides.length) * 100}%`;
}

document.getElementById('next').addEventListener('click', () => showSlide(current + 1));
document.getElementById('prev').addEventListener('click', () => showSlide(current - 1));
document.addEventListener('keydown', (event) => {
  if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); showSlide(current + 1); }
  if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); showSlide(current - 1); }
  if (event.key === 'Home') showSlide(0);
  if (event.key === 'End') showSlide(slides.length - 1);
});

let touchStart = 0;
document.addEventListener('touchstart', (event) => { touchStart = event.changedTouches[0].screenX; }, { passive: true });
document.addEventListener('touchend', (event) => {
  const distance = event.changedTouches[0].screenX - touchStart;
  if (Math.abs(distance) > 50) showSlide(current + (distance < 0 ? 1 : -1));
}, { passive: true });

showSlide(0);
