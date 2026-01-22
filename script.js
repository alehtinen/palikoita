// Burger menu and sidebar functionality
const burgerMenu = document.getElementById('burgerMenu');
const sidebar = document.getElementById('sidebar');
const body = document.body;

// Theme toggle functionality
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const root = document.documentElement;

// Check for saved theme preference or default to dark
const savedTheme = localStorage.getItem('theme') || 'dark';
if (savedTheme === 'light') {
    root.classList.add('light-mode');
    themeIcon.textContent = '🌙';
}

if (themeToggle) {
    themeToggle.addEventListener('click', function() {
        root.classList.toggle('light-mode');
        const isLight = root.classList.contains('light-mode');
        themeIcon.textContent = isLight ? '🌙' : '☀️';
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
}

if (burgerMenu) {
    // Use touchstart for better mobile responsiveness
    const toggleSidebar = function(e) {
        e.preventDefault();
        e.stopPropagation();
        burgerMenu.classList.toggle('active');
        sidebar.classList.toggle('active');
        body.classList.toggle('sidebar-open');
    };
    
    burgerMenu.addEventListener('click', toggleSidebar);
    burgerMenu.addEventListener('touchstart', function(e) {
        e.preventDefault();
        toggleSidebar(e);
    }, { passive: false });

    // Close sidebar when clicking on a link
    const sidebarLinks = sidebar.querySelectorAll('a');
    sidebarLinks.forEach(link => {
        const closeSidebar = function() {
            if (window.innerWidth <= 768) {
                burgerMenu.classList.remove('active');
                sidebar.classList.remove('active');
                body.classList.remove('sidebar-open');
            }
        };
        
        link.addEventListener('click', closeSidebar);
        link.addEventListener('touchend', closeSidebar);
    });

    // Close sidebar when clicking outside on mobile
    let isClosing = false;
    const outsideClickHandler = function(event) {
        if (window.innerWidth <= 768 && !isClosing) {
            if (!sidebar.contains(event.target) && !burgerMenu.contains(event.target) && sidebar.classList.contains('active')) {
                isClosing = true;
                burgerMenu.classList.remove('active');
                sidebar.classList.remove('active');
                body.classList.remove('sidebar-open');
                setTimeout(() => { isClosing = false; }, 300);
            }
        }
    };
    
    document.addEventListener('click', outsideClickHandler);
    document.addEventListener('touchend', outsideClickHandler);
}

// Submenu toggle functionality (only for static version)
// Dynamic version handles this in content-loader.js
window.addEventListener('DOMContentLoaded', function() {
    const submenuToggles = document.querySelectorAll('.has-submenu');
    if (submenuToggles.length > 0) {
        submenuToggles.forEach(toggle => {
            if (!toggle.hasAttribute('data-toggle-initialized')) {
                toggle.setAttribute('data-toggle-initialized', 'true');
                toggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.classList.toggle('active');
                    const submenu = this.nextElementSibling;
                    if (submenu && submenu.classList.contains('submenu')) {
                        submenu.classList.toggle('active');
                    }
                });
            }
        });
    }
});

// PDF Download functionality with pdfmake
document.getElementById('downloadPdf').addEventListener('click', function() {
    const downloadBtn = document.getElementById('downloadPdf');
    
    // Show loading state
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = 'Luodaan PDF...';
    downloadBtn.disabled = true;
    
    // Check if pdfMake is loaded
    if (typeof pdfMake === 'undefined' || typeof generatePDF === 'undefined') {
        console.error('pdfMake or generatePDF not loaded');
        downloadBtn.textContent = 'Virhe! Yritä uudelleen';
        downloadBtn.disabled = false;
        setTimeout(() => {
            downloadBtn.textContent = originalText;
            downloadBtn.disabled = false;
        }, 3000);
        return;
    }
    
    try {
        // Generate and download PDF
        const pdf = generatePDF();
        pdf.download('jatkosuunnitelmat.pdf');
        
        // Reset button state
        downloadBtn.textContent = originalText;
        downloadBtn.disabled = false;
    } catch (error) {
        console.error('PDF generation error:', error);
        downloadBtn.textContent = 'Virhe! Yritä uudelleen';
        downloadBtn.disabled = false;
        
        // Reset after 3 seconds
        setTimeout(() => {
            downloadBtn.textContent = originalText;
            downloadBtn.disabled = false;
        }, 3000);
    }
});

// Update the last updated date automatically
function updateLastModifiedDate() {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    const today = new Date();
    const formattedDate = today.toLocaleDateString('fi-FI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    // Comment this line if you want to keep the manual date
    // lastUpdatedElement.textContent = formattedDate;
}

// Call on page load
updateLastModifiedDate();

// Smooth scroll for better UX
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add subtle animations on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Initially hide sections for animation
document.querySelectorAll('.info-section').forEach((section, index) => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
    observer.observe(section);
});
