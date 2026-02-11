/**
 * 🎠 Professional Slider Component
 * 
 * Features:
 * - 5 animation styles (fade, carousel, parallax, kenburns, stacked)
 * - Touch/Swipe support
 * - Keyboard navigation (← →)
 * - Auto-play with pause on hover
 * - Lazy loading
 * - Responsive
 * - Accessible (ARIA, focus management)
 * - No dependencies
 */

class ProSlider {
  constructor(element, options = {}) {
    this.slider = element;
    this.options = {
      style: options.style || 'fade', // fade, carousel, parallax, kenburns, stacked
      autoplay: options.autoplay !== false,
      duration: options.duration || 5000,
      speed: options.speed || 600,
      pauseOnHover: options.pauseOnHover !== false,
      keyboard: options.keyboard !== false,
      touch: options.touch !== false,
      loop: options.loop !== false,
      lazyLoad: options.lazyLoad !== false,
      onSlideChange: options.onSlideChange || null,
      ...options
    };
    
    this.currentIndex = -1;
    this.slides = [];
    this.isPlaying = false;
    this.autoplayTimer = null;
    this.touchStartX = 0;
    this.touchEndX = 0;
    
    this.init();
  }
  
  init() {
    // Get slides
    this.slides = Array.from(this.slider.querySelectorAll('.pro-slider__slide'));
    
    if (this.slides.length === 0) {
      console.warn('ProSlider: No slides found');
      return;
    }
    
    // Apply style class
    this.slider.classList.add(`pro-slider--${this.options.style}`);
    
    // Create controls
    this.createControls();
    
    // Setup events
    this.bindEvents();
    
    // Initialize first slide
    this.goToSlide(0);
    
    // Start autoplay
    if (this.options.autoplay) {
      this.play();
    }
    
    // Lazy load images
    if (this.options.lazyLoad) {
      this.setupLazyLoad();
    }
    
    // Mark as initialized
    this.slider.classList.remove('is-loading');
  }
  
  createControls() {
    const viewport = this.slider.querySelector('.pro-slider__viewport');
    
    // Navigation arrows
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pro-slider__nav pro-slider__nav--prev';
    prevBtn.innerHTML = '‹';
    prevBtn.setAttribute('aria-label', 'Previous slide');
    prevBtn.addEventListener('click', () => this.prev());
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pro-slider__nav pro-slider__nav--next';
    nextBtn.innerHTML = '›';
    nextBtn.setAttribute('aria-label', 'Next slide');
    nextBtn.addEventListener('click', () => this.next());
    
    viewport.appendChild(prevBtn);
    viewport.appendChild(nextBtn);
    
    // Pagination dots
    const pagination = document.createElement('div');
    pagination.className = 'pro-slider__pagination';
    pagination.setAttribute('role', 'tablist');
    
    this.slides.forEach((slide, index) => {
      const dot = document.createElement('button');
      dot.className = 'pro-slider__dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
      dot.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      dot.addEventListener('click', () => this.goToSlide(index));
      pagination.appendChild(dot);
    });
    
    viewport.appendChild(pagination);
    
    // Progress bar
    if (this.options.autoplay) {
      const progress = document.createElement('div');
      progress.className = 'pro-slider__progress';
      progress.innerHTML = '<div class="pro-slider__progress-bar"></div>';
      this.slider.appendChild(progress);
    }
    
    // Store references
    this.prevBtn = prevBtn;
    this.nextBtn = nextBtn;
    this.pagination = pagination;
    this.dots = Array.from(pagination.querySelectorAll('.pro-slider__dot'));
  }
  
  bindEvents() {
    // Pause on hover
    if (this.options.pauseOnHover) {
      this.slider.addEventListener('mouseenter', () => this.pause());
      this.slider.addEventListener('mouseleave', () => {
        if (this.options.autoplay) this.play();
      });
    }
    
    // Keyboard navigation
    if (this.options.keyboard) {
      document.addEventListener('keydown', (e) => {
        if (!this.isInViewport()) return;
        
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.prev();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.next();
        }
      });
    }
    
    // Touch/Swipe
    if (this.options.touch) {
      this.slider.addEventListener('touchstart', (e) => {
        this.touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      
      this.slider.addEventListener('touchend', (e) => {
        this.touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe();
      }, { passive: true });
    }
    
    // Visibility change (pause when tab is hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else if (this.options.autoplay) {
        this.play();
      }
    });
  }
  
  handleSwipe() {
    const diff = this.touchStartX - this.touchEndX;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        this.next();
      } else {
        this.prev();
      }
    }
  }
  
  isInViewport() {
    const rect = this.slider.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
  
  goToSlide(index, direction = 'next') {
    // Normalize index
    if (index < 0) {
      index = this.options.loop ? this.slides.length - 1 : 0;
    } else if (index >= this.slides.length) {
      index = this.options.loop ? 0 : this.slides.length - 1;
    }
    
    // Same slide
    if (index === this.currentIndex) return;
    
    const previousIndex = this.currentIndex;
    this.currentIndex = index;
    
    // Update slides
    this.slides.forEach((slide, i) => {
      slide.classList.remove('is-active', 'is-prev', 'is-next');
      slide.setAttribute('aria-hidden', 'true');
      
      if (i === index) {
        slide.classList.add('is-active');
        slide.setAttribute('aria-hidden', 'false');
      } else if (i === index - 1 || (index === 0 && i === this.slides.length - 1)) {
        slide.classList.add('is-prev');
      } else if (i === index + 1 || (index === this.slides.length - 1 && i === 0)) {
        slide.classList.add('is-next');
      }
    });
    
    // Update dots
    this.dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
      dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });
    
    // Lazy load next images
    if (this.options.lazyLoad) {
      this.lazyLoadSlide(index);
      this.lazyLoadSlide(index + 1);
    }
    
    // Callback
    if (this.options.onSlideChange) {
      this.options.onSlideChange(index, previousIndex, direction);
    }
    
    // Reset autoplay timer
    if (this.isPlaying) {
      this.resetAutoplay();
    }
  }
  
  next() {
    this.goToSlide(this.currentIndex + 1, 'next');
  }
  
  prev() {
    this.goToSlide(this.currentIndex - 1, 'prev');
  }
  
  play() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.slider.classList.add('is-playing');
    
    this.autoplayTimer = setInterval(() => {
      this.next();
    }, this.options.duration);
  }
  
  pause() {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    this.slider.classList.remove('is-playing');
    
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }
  
  resetAutoplay() {
    this.pause();
    this.play();
  }
  
  setupLazyLoad() {
    this.slides.forEach((slide) => {
      const img = slide.querySelector('.pro-slider__image');
      if (img && img.dataset.src) {
        img.setAttribute('loading', 'lazy');
      }
    });
  }
  
  lazyLoadSlide(index) {
    if (index < 0 || index >= this.slides.length) return;
    
    const slide = this.slides[index];
    const img = slide.querySelector('.pro-slider__image');
    
    if (img && img.dataset.src && !img.src) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      
      if (img.dataset.srcset) {
        img.srcset = img.dataset.srcset;
        img.removeAttribute('data-srcset');
      }
    }
  }
  
  destroy() {
    this.pause();
    
    // Remove event listeners
    this.prevBtn?.remove();
    this.nextBtn?.remove();
    this.pagination?.remove();
    
    // Reset classes
    this.slider.className = this.slider.className
      .replace(/pro-slider--\w+/g, '')
      .replace(/is-\w+/g, '')
      .trim();
    
    this.slides.forEach((slide) => {
      slide.className = slide.className
        .replace(/is-\w+/g, '')
        .trim();
    });
  }
  
  // Public API
  getCurrentIndex() {
    return this.currentIndex;
  }
  
  getTotalSlides() {
    return this.slides.length;
  }
  
  setStyle(style) {
    this.slider.classList.remove(`pro-slider--${this.options.style}`);
    this.options.style = style;
    this.slider.classList.add(`pro-slider--${this.options.style}`);
  }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-slider]').forEach((el) => {
    // Allow pages to opt-out and init manually (e.g. when slides are injected async)
    if (el.dataset.sliderAutoinit === 'false') return;

    const style = el.dataset.sliderStyle || 'fade';
    const autoplay = el.dataset.sliderAutoplay !== 'false';
    const duration = parseInt(el.dataset.sliderDuration) || 5000;

    // Store instance for safe re-init/destroy
    try {
      if (el._proSlider && typeof el._proSlider.destroy === 'function') {
        el._proSlider.destroy();
      }
      el._proSlider = new ProSlider(el, { style, autoplay, duration });
    } catch (e) {
      console.warn('ProSlider auto-init failed', e);
    }
  });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProSlider;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.ProSlider = ProSlider;
}
