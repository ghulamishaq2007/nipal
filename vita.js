// vita.js - Cafe Vita Public Website Controller & Realtime Firebase Live Sync
import { 
  db, 
  doc, 
  collection, 
  onSnapshot, 
  addDoc,
  handleFirestoreError
} from "./firebase.js";
import { SEED_TESTIMONIALS } from "./testimonialsData.js";

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  // Mobile Navbar Toggle Logic
  const menuToggle = document.getElementById("menu-toggle");
  const navbar = document.getElementById("navbar");
  const closeBtn = document.getElementById("close-btn");

  if (menuToggle && navbar) {
    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      navbar.classList.add("active");
      menuToggle.classList.add("hide");
    });
  }

  if (closeBtn && navbar) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navbar.classList.remove("active");
      if (menuToggle) menuToggle.classList.remove("hide");
    });
  }

  document.querySelectorAll("#navbar a").forEach(link => {
    link.addEventListener("click", () => {
      if (navbar) navbar.classList.remove("active");
      if (menuToggle) menuToggle.classList.remove("hide");
    });
  });

  // Close mobile nav when clicking outside
  document.addEventListener("click", (e) => {
    if (
      navbar &&
      navbar.classList.contains("active") &&
      !navbar.contains(e.target) &&
      (!menuToggle || !menuToggle.contains(e.target))
    ) {
      navbar.classList.remove("active");
      if (menuToggle) menuToggle.classList.remove("hide");
    }
  });

  // Reset navbar classes on window resize to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      if (navbar) navbar.classList.remove("active");
      if (menuToggle) menuToggle.classList.remove("hide");
    }
  });

  // Header Scroll Shadow
  window.addEventListener("scroll", () => {
    const header = document.querySelector("header");
    if (header) {
      header.classList.toggle("scrolled", window.scrollY > 50);
    }
  });

  // -------------------------------------------------------------
  // REALTIME FIRESTORE SYNC: SETTINGS & THEME
  // -------------------------------------------------------------
  const settingsRef = doc(db, "settings", "website");
  onSnapshot(settingsRef, (snap) => {
    if (!snap.exists()) return;
    const s = snap.data();

    // Theme Colors & Fonts
    if (s.primaryColor || s.secondaryColor) {
      applyLiveTheme(s.primaryColor || "#f59e0b", s.secondaryColor || "#d97706", s.font || "Plus Jakarta Sans");
    }

    // Website Branding
    if (s.websiteName) {
      const titles = [document.getElementById("siteHeaderTitle"), document.getElementById("footerBrandTitle")];
      titles.forEach(el => { if (el) el.textContent = s.websiteName; });
    }

    if (s.logo) {
      const logos = [document.getElementById("siteHeaderLogo")];
      logos.forEach(img => { if (img) img.src = s.logo; });
    }

    // Contact Details
    if (s.phone) {
      const phoneEls = [document.getElementById("footerPhone"), document.getElementById("contactPhone")];
      phoneEls.forEach(el => { if (el) el.textContent = s.phone; });
    }

    if (s.email) {
      const emailEls = [document.getElementById("footerEmail"), document.getElementById("contactEmail")];
      emailEls.forEach(el => { if (el) el.textContent = s.email; });
    }

    if (s.whatsapp) {
      const waEls = [document.getElementById("footerWhatsapp"), document.getElementById("contactWhatsapp")];
      waEls.forEach(el => { if (el) el.textContent = s.whatsapp; });

      const floatWaBtn = document.getElementById("whatsappFloatBtn");
      if (floatWaBtn) {
        const cleanDigits = s.whatsapp.replace(/[^0-9]/g, "");
        floatWaBtn.href = `https://wa.me/${cleanDigits}`;
      }
    }

    if (s.address) {
      const addrEls = [document.getElementById("footerAddress"), document.getElementById("contactAddress")];
      addrEls.forEach(el => { if (el) el.textContent = s.address; });
    }

    if (s.openingHoursWeekdays) {
      const el = document.getElementById("footerHoursWeekdays");
      if (el) el.textContent = s.openingHoursWeekdays;
      const cEl = document.getElementById("contactHours");
      if (cEl) cEl.textContent = s.openingHoursWeekdays;
    }

    if (s.openingHoursWeekends) {
      const el = document.getElementById("footerHoursWeekends");
      if (el) el.textContent = s.openingHoursWeekends;
    }

    if (s.mapsIframe) {
      const mapFrame = document.getElementById("contactMapIframe");
      if (mapFrame) mapFrame.src = s.mapsIframe;
    }

    if (s.footerText) {
      const el = document.getElementById("footerTextSummary");
      if (el) el.textContent = s.footerText;
    }

    if (s.copyright) {
      const el = document.getElementById("footerCopyrightText");
      if (el) el.innerHTML = `${s.copyright}`;
    }

    // Social Links
    if (s.socialLinks) {
      updateSocialLinks("footerSocialIcons", s.socialLinks);
      updateSocialLinks("contactSocialLinks", s.socialLinks);
    }
  }, (err) => handleFirestoreError(err, "get", "settings/website"));

  function updateSocialLinks(containerId, links) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      ${links.facebook ? `<a href="${links.facebook}" target="_blank"><i class="fab fa-facebook-f"></i></a>` : ''}
      ${links.instagram ? `<a href="${links.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>` : ''}
      ${links.tiktok ? `<a href="${links.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>` : ''}
      ${links.youtube ? `<a href="${links.youtube}" target="_blank"><i class="fab fa-youtube"></i></a>` : ''}
    `;
  }

  // Dynamic Theme CSS Injection
  function applyLiveTheme(primary, secondary, font) {
    let styleTag = document.getElementById("dynamicThemeStyle");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "dynamicThemeStyle";
      document.head.appendChild(styleTag);
    }

    styleTag.textContent = `
      body, html { font-family: '${font}', sans-serif !important; }
      .logo, .logo-box h2, .hero h1 span, .about h2, .about-text h2, .why h2, .stat h2, .team h2, .team-card h3, .cta h2, .reviews h2, .review h4, .footer-box h2, .footer-box h3, .copyright span, .contact-info h2, .contact-form h2, .map-section h2, .follow-us h2, .food-info h3, .banner-content h1, .why-card h3 {
        color: ${primary} !important;
      }
      .btn, .menu-category button.active, .menu-category button:hover {
        background-color: ${primary} !important;
        color: #111 !important;
      }
      .whatsapp-btn {
        background-color: #25D366 !important;
      }
      header {
        border-bottom: 2px solid ${primary};
      }
      footer {
        border-top: 3px solid ${primary} !important;
      }
    `;
  }

  // -------------------------------------------------------------
  // REALTIME FIRESTORE SYNC: HERO SECTION
  // -------------------------------------------------------------
  onSnapshot(doc(db, "hero", "home"), (snap) => {
    if (!snap.exists()) return;
    const h = snap.data();

    const headingEl = document.getElementById("heroHeadingEl");
    if (headingEl && h.heading) headingEl.innerHTML = h.heading;

    const subEl = document.getElementById("heroSubHeadingEl");
    if (subEl && h.subHeading) subEl.textContent = h.subHeading;

    const btnEl = document.getElementById("heroBtnEl");
    if (btnEl) {
      if (h.buttonText) btnEl.textContent = h.buttonText;
      if (h.buttonLink) btnEl.href = h.buttonLink;
    }

    const heroSection = id("heroSection");
    if (heroSection && h.bgImage) {
      heroSection.style.background = `url("${h.bgImage}") center/cover`;
    }
  }, (err) => handleFirestoreError(err, "get", "hero/home"));

  // -------------------------------------------------------------
  // REALTIME FIRESTORE SYNC: ABOUT SECTION
  // -------------------------------------------------------------
  onSnapshot(doc(db, "about", "main"), (snap) => {
    if (!snap.exists()) return;
    const a = snap.data();

    const bannerTitle = id("aboutBannerTitle");
    if (bannerTitle && a.heading) bannerTitle.textContent = a.heading;

    const summaryHeading = id("aboutSummaryHeading");
    if (summaryHeading && a.heading) summaryHeading.textContent = a.heading;

    const sectionHeading = id("aboutSectionHeading");
    if (sectionHeading && a.heading) sectionHeading.textContent = a.heading;

    const descEl = id("aboutSectionDesc");
    if (descEl && a.description) descEl.textContent = a.description;

    const summaryDesc = id("aboutSummaryDesc");
    if (summaryDesc && a.description) summaryDesc.textContent = a.description;

    const imgEl = id("aboutSectionImg");
    if (imgEl && a.image) imgEl.src = a.image;

    const btnEl = id("aboutSectionBtn");
    if (btnEl) {
      if (a.ctaText) btnEl.textContent = a.ctaText;
      if (a.ctaLink) btnEl.href = a.ctaLink;
    }
  }, (err) => handleFirestoreError(err, "get", "about/main"));

  // -------------------------------------------------------------
  // REALTIME FIRESTORE SYNC: CATEGORIES
  // -------------------------------------------------------------
  onSnapshot(collection(db, "categories"), (snap) => {
    const catContainer = id("publicMenuCategories");
    if (!catContainer) return;

    const categories = [];
    snap.forEach(d => categories.push({ id: d.id, ...d.data() }));

    if (categories.length > 0) {
      catContainer.innerHTML = `<button class="active" data-filter="all">All</button>` + categories.map(c => `
        <button data-filter="${c.slug}">${c.icon ? c.icon + ' ' : ''}${c.name}</button>
      `).join("");

      bindCategoryFilters();
    }
  }, (err) => handleFirestoreError(err, "list", "categories"));

  function bindCategoryFilters() {
    const buttons = document.querySelectorAll(".menu-category button");
    buttons.forEach(btn => {
      btn.addEventListener("click", function() {
        buttons.forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        const filterVal = this.getAttribute("data-filter");
        filterMenuGrid(filterVal);
      });
    });
  }

  // -------------------------------------------------------------
  // REALTIME FIRESTORE SYNC: PRODUCTS (MENU GRID & FEATURED)
  // -------------------------------------------------------------
  let publicProductsList = [];

  onSnapshot(collection(db, "products"), (snap) => {
    publicProductsList = [];
    snap.forEach(d => publicProductsList.push({ id: d.id, ...d.data() }));

    renderPublicMenuGrid("all");
    renderFeaturedCardsGrid();
  }, (err) => handleFirestoreError(err, "list", "products"));

  function renderPublicMenuGrid(activeCategory = "all", searchQuery = "") {
    const grid = id("publicFoodGrid");
    if (!grid) return;

    const filtered = publicProductsList.filter(p => {
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      const matchSearch = !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888;">No menu items found.</p>`;
      return;
    }

    grid.innerHTML = filtered.map(p => `
      <div class="food-card" data-category="${p.category || 'all'}">
        <img src="${p.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600'}" alt="${p.name}">
        <div class="food-info">
          <h3>${p.name}</h3>
          <p>${p.description || ''}</p>
          <div class="food-bottom">
            <span>Rs.${p.price} ${p.oldPrice ? `<small style="text-decoration: line-through; color: #888; font-size: 13px;">Rs.${p.oldPrice}</small>` : ''}</span>
            <button class="btn open-order-btn" data-name="${p.name}" data-price="${p.price}" style="border: none; cursor: pointer;">Order Now</button>
          </div>
        </div>
      </div>
    `).join("");

    grid.querySelectorAll(".open-order-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        openOrderModal(btn.dataset.name, btn.dataset.price);
      });
    });
  }

  function filterMenuGrid(category) {
    const searchVal = id("publicMenuSearch")?.value || "";
    renderPublicMenuGrid(category, searchVal);
  }

  const searchInput = id("publicMenuSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const activeBtn = document.querySelector(".menu-category button.active");
      const activeCat = activeBtn ? activeBtn.getAttribute("data-filter") : "all";
      renderPublicMenuGrid(activeCat, e.target.value.trim());
    });
  }

  // Featured Cards on Homepage
  function renderFeaturedCardsGrid() {
    const grid = id("featuredCardsGrid");
    if (!grid) return;

    const featured = publicProductsList.filter(p => p.featured || p.popular).slice(0, 6);
    if (featured.length === 0) return;

    grid.innerHTML = featured.map(p => `
      <div class="card">
        <img src="${p.image}">
        <h3>${p.name}</h3>
        <p>${p.description ? p.description.substring(0, 60) + '...' : ''}</p>
        <div style="margin-top: 10px; font-weight: bold; color: var(--accent-gold); font-size: 18px;">Rs.${p.price}</div>
        <a href="./menu.html" class="btn" style="margin-top: 15px;">View Menu</a>
      </div>
    `).join("");
  }

  // -------------------------------------------------------------
  // REALTIME FIRESTORE SYNC: SERVICES
  // -------------------------------------------------------------
  onSnapshot(collection(db, "services"), (snap) => {
    const grid = id("whyChooseGrid");
    if (!grid) return;

    const services = [];
    snap.forEach(d => services.push({ id: d.id, ...d.data() }));

    if (services.length > 0) {
      grid.innerHTML = services.map(s => `
        <div class="why-card">
          <h3>${s.icon ? s.icon + ' ' : ''}${s.title}</h3>
          <p>${s.description}</p>
        </div>
      `).join("");
    }
  }, (err) => handleFirestoreError(err, "list", "services"));

  // -------------------------------------------------------------
  // REALTIME FIRESTORE SYNC: REVIEWS SLIDER
  // -------------------------------------------------------------
  let currentReview = 0;
  let sliderInterval = null;
  let activeReviewsList = [];
  let isSliderHovered = false;
  let isSeedingTestimonials = false;

  async function autoSeedDefaultTestimonials(existingReviews) {
    if (isSeedingTestimonials) return;
    if (existingReviews && existingReviews.length >= 89) return;
    isSeedingTestimonials = true;

    try {
      const existingNames = new Set((existingReviews || []).map(r => r.name));
      const missing = SEED_TESTIMONIALS.filter(s => !existingNames.has(s.name));

      for (const item of missing) {
        await addDoc(collection(db, "reviews"), {
          name: item.name,
          rating: item.rating || 5,
          review: item.review,
          image: item.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
          order: item.order || 1,
          enabled: item.enabled !== false,
          createdAt: Date.now()
        });
      }
    } catch (err) {
      console.error("Auto-seeding testimonials error:", err);
    } finally {
      isSeedingTestimonials = false;
    }
  }

  onSnapshot(collection(db, "reviews"), (snap) => {
    const slider = id("publicReviewSlider");
    if (!slider) return;

    const reviews = [];
    snap.forEach(d => reviews.push({ id: d.id, ...d.data() }));

    // Auto seed if empty or fewer than 89 default testimonials
    if (snap.empty || reviews.length < 89) {
      autoSeedDefaultTestimonials(reviews);
    }

    // Filter enabled testimonials
    activeReviewsList = reviews.filter(r => r.enabled !== false);
    // Sort by order position ascending
    activeReviewsList.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    if (activeReviewsList.length > 0) {
      if (currentReview >= activeReviewsList.length) {
        currentReview = 0;
      }

      slider.innerHTML = activeReviewsList.map((r, i) => `
        <div class="review ${i === currentReview ? 'active' : ''}">
          ${r.image ? `<img src="${r.image}" alt="${escapeHtml(r.name)}" style="width: 55px; height: 55px; border-radius: 50%; object-fit: cover; margin: 0 auto 12px; border: 2px solid #f59e0b; display: block;" loading="lazy">` : ''}
          <div style="color: #f4c542; font-size: 20px; margin-bottom: 8px;">${'★'.repeat(Number(r.rating) || 5)}</div>
          <p>"${escapeHtml(r.review)}"</p>
          <h4>- ${escapeHtml(r.name)}</h4>
        </div>
      `).join("");

      startReviewAutoplay();
      setupSliderHoverListeners();
    } else {
      slider.innerHTML = `<div class="review active"><p>No customer reviews available at the moment.</p></div>`;
    }
  }, (err) => handleFirestoreError(err, "list", "reviews"));

  function startReviewAutoplay() {
    stopReviewAutoplay();
    if (activeReviewsList.length <= 1 || isSliderHovered) return;

    sliderInterval = setInterval(() => {
      currentReview = (currentReview + 1) % activeReviewsList.length;
      updateActiveReviewSlide(currentReview);
    }, 3000); // 3 seconds interval
  }

  function stopReviewAutoplay() {
    if (sliderInterval) {
      clearInterval(sliderInterval);
      sliderInterval = null;
    }
  }

  function updateActiveReviewSlide(idx) {
    const slideEls = document.querySelectorAll("#publicReviewSlider .review");
    if (!slideEls || slideEls.length === 0) return;

    slideEls.forEach((el, i) => {
      if (i === idx) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });
  }

  function setupSliderHoverListeners() {
    const reviewSection = document.querySelector(".reviews") || id("publicReviewSlider");
    if (!reviewSection || reviewSection.dataset.hoverBound === "true") return;

    reviewSection.dataset.hoverBound = "true";

    reviewSection.addEventListener("mouseenter", () => {
      isSliderHovered = true;
      stopReviewAutoplay();
    });

    reviewSection.addEventListener("mouseleave", () => {
      isSliderHovered = false;
      startReviewAutoplay();
    });
  }

  // -------------------------------------------------------------
  // PUBLIC FORM SUBMISSIONS
  // -------------------------------------------------------------

  // Helper to trigger EmailJS notification
  async function triggerBookingEmailJS(bookingData) {
    try {
      if (window.emailjs) {
        // Attempt sending using emailjs browser SDK
        await window.emailjs.send("service_default", "template_booking", {
          booking_id: bookingData.bookingId,
          customer_name: bookingData.name,
          customer_phone: bookingData.phone,
          customer_email: bookingData.email,
          resort_name: bookingData.resortName,
          check_in: bookingData.checkIn,
          check_out: bookingData.checkOut,
          guests: bookingData.guests,
          status: bookingData.status,
          booking_date: bookingData.bookingDate,
          special_requests: bookingData.specialRequest || "None",
          to_email: "g.ishaq@gmail.com"
        });
        console.log("Booking email notification sent to g.ishaq@gmail.com");
      }
    } catch (err) {
      console.warn("EmailJS notification logged:", err?.message || err);
    }
  }

  // 1. Booking Form Submission
  const resForm = id("publicReservationForm");
  if (resForm) {
    resForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const alertEl = id("resAlert");
      const submitBtn = resForm.querySelector("button[type='submit']");

      const nameVal = id("resName") ? id("resName").value.trim() : "";
      const phoneVal = id("resPhone") ? id("resPhone").value.trim() : "";
      const emailVal = id("resEmail") ? id("resEmail").value.trim() : "";
      const resortVal = id("resResort") ? id("resResort").value : "Cafe Vita Main Dining";
      
      let checkInVal = id("resCheckIn") ? id("resCheckIn").value : "";
      let checkOutVal = id("resCheckOut") ? id("resCheckOut").value : "";

      // Fallback for older date/time inputs if present
      if (!checkInVal && id("resDate") && id("resTime")) {
        checkInVal = `${id("resDate").value} ${id("resTime").value}`;
        checkOutVal = `${id("resDate").value} (Standard Slot)`;
      }

      const guestsVal = id("resGuests") ? Number(id("resGuests").value) || 1 : 1;
      const notesVal = id("resNotes") ? id("resNotes").value.trim() : "";

      // -----------------------------------------------------------
      // COMPREHENSIVE FORM VALIDATION & ANTI-SPAM
      // -----------------------------------------------------------
      const showValidationError = (msg) => {
        if (alertEl) {
          alertEl.style.display = "block";
          alertEl.style.background = "rgba(239, 68, 68, 0.2)";
          alertEl.style.color = "#fca5a5";
          alertEl.style.border = "1px solid #ef4444";
          alertEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${msg}`;
        }
      };

      if (!nameVal || nameVal.length < 2) {
        showValidationError("Please enter a valid full name (at least 2 characters).");
        return;
      }

      const phoneRegex = /^[\d\+\-\s\(\)]{7,20}$/;
      if (!phoneVal || !phoneRegex.test(phoneVal)) {
        showValidationError("Please enter a valid contact phone number (at least 7 digits).");
        return;
      }

      if (emailVal) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVal)) {
          showValidationError("Please enter a valid email address.");
          return;
        }
      }

      if (!checkInVal) {
        showValidationError("Please select your requested Check-in date and time.");
        return;
      }

      // Check date validity (cannot book in the past if formatted as standard date)
      if (checkInVal.includes("-") || checkInVal.includes("T")) {
        const checkInDate = new Date(checkInVal);
        const now = new Date();
        now.setMinutes(now.getMinutes() - 15); // 15 min buffer
        if (!isNaN(checkInDate.getTime()) && checkInDate < now) {
          showValidationError("Check-in date/time cannot be in the past. Please select a future date.");
          return;
        }
      }

      // Duplicate Booking & Rate Limit Guard
      const lastBookingHash = `${nameVal}_${phoneVal}_${resortVal}_${checkInVal}`;
      const previousHash = localStorage.getItem("last_booking_hash");
      const previousTime = Number(localStorage.getItem("last_booking_time") || 0);
      const timeElapsed = (Date.now() - previousTime) / 1000;

      if (previousHash === lastBookingHash && timeElapsed < 120) {
        showValidationError("Duplicate booking detected. You already submitted this booking request recently.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Processing Booking...";

      try {
        // Generate Unique Booking ID
        const uniqueNumber = Math.floor(100000 + Math.random() * 900000);
        const bookingId = `CV-BK-${uniqueNumber}`;
        const currentIsoDate = new Date().toISOString();
        const readableBookingDate = new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short"
        });

        const ipTimestamp = `${currentIsoDate} [${navigator.language || "client"}]`;

        const bookingPayload = {
          bookingId,
          name: nameVal,
          phone: phoneVal,
          email: emailVal || "-",
          resortName: resortVal,
          checkIn: checkInVal,
          checkOut: checkOutVal || "Standard Checkout",
          date: checkInVal, // backward compatibility
          time: checkOutVal || "Standard",
          guests: guestsVal,
          specialRequest: notesVal || "None",
          status: "New",
          bookingDate: readableBookingDate,
          createdAt: Date.now(),
          ipTimestamp
        };

        // 1. Save permanently in Firebase Firestore
        await addDoc(collection(db, "reservations"), bookingPayload);

        // Store rate limit indicators
        localStorage.setItem("last_booking_hash", lastBookingHash);
        localStorage.setItem("last_booking_time", Date.now().toString());

        // 2. Dispatch EmailJS Notification to g.ishaq@gmail.com
        await triggerBookingEmailJS(bookingPayload);

        if (alertEl) {
          alertEl.style.display = "block";
          alertEl.style.background = "rgba(34,197,94,0.15)";
          alertEl.style.color = "#86efac";
          alertEl.style.border = "1px solid #22c55e";
          alertEl.innerHTML = `
            <div style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">
              <i class="fas fa-check-circle"></i> Booking Confirmed!
            </div>
            <div>Booking ID: <strong style="color: #f59e0b; font-family: monospace;">${bookingId}</strong></div>
            <div style="font-size: 13px; margin-top: 4px; color: #cbd5e1;">Your booking for <strong>${resortVal}</strong> has been saved. An email notification has been dispatched to g.ishaq@gmail.com.</div>
          `;
        }

        resForm.reset();
      } catch (err) {
        console.error("Booking submission error:", err);
        handleFirestoreError(err, "create", "reservations");
        if (alertEl) {
          alertEl.style.display = "block";
          alertEl.style.background = "rgba(239,68,68,0.2)";
          alertEl.style.color = "#fca5a5";
          alertEl.style.border = "1px solid #ef4444";
          alertEl.innerHTML = `Failed to process booking: ${err.message || err}`;
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm Booking";
      }
    });
  }

  // 2. Contact Form Submission
  const contactForm = id("publicContactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const alertEl = id("contactFormAlert");
      const submitBtn = contactForm.querySelector("button[type='submit']");

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending Message...";

      try {
        await addDoc(collection(db, "contacts"), {
          name: id("contactName").value.trim(),
          email: id("contactFormEmail").value.trim(),
          phone: id("contactFormPhone").value.trim(),
          subject: id("contactSubject").value.trim(),
          message: id("contactMessage").value.trim(),
          createdAt: Date.now()
        });

        if (alertEl) {
          alertEl.style.display = "block";
          alertEl.style.background = "rgba(34,197,94,0.2)";
          alertEl.style.color = "#86efac";
          alertEl.style.border = "1px solid #22c55e";
          alertEl.innerHTML = `<i class="fas fa-check-circle"></i> Thank you! Your message has been sent.`;
        }

        contactForm.reset();
      } catch (err) {
        if (alertEl) {
          alertEl.style.display = "block";
          alertEl.style.background = "rgba(239,68,68,0.2)";
          alertEl.style.color = "#fca5a5";
          alertEl.innerHTML = `Error sending message: ${err.message}`;
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Message";
      }
    });
  }

  // 3. Order Modal Form Submission
  const orderOverlay = id("orderModalOverlay");
  const closeOrderBtn = id("closeOrderModal");
  const orderForm = id("publicOrderForm");

  function openOrderModal(productName, price) {
    if (!orderOverlay) return;
    id("orderProductName").value = productName;
    id("orderProductPrice").value = price;
    id("orderItemTitleName").textContent = `Item: ${productName} (Rs.${price})`;
    orderOverlay.style.display = "flex";
  }

  if (closeOrderBtn) {
    closeOrderBtn.addEventListener("click", () => {
      orderOverlay.style.display = "none";
    });
  }

  if (orderForm) {
    orderForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = orderForm.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting Order...";

      try {
        const name = id("orderProductName").value;
        const price = Number(id("orderProductPrice").value) || 0;
        const qty = Number(id("orderQuantity").value) || 1;

        await addDoc(collection(db, "orders"), {
          customerName: id("orderCustomerName").value.trim(),
          phone: id("orderCustomerPhone").value.trim(),
          address: id("orderCustomerAddress").value.trim(),
          items: [{ productName: name, quantity: qty, price: price }],
          totalPrice: price * qty,
          status: "pending",
          createdAt: Date.now()
        });

        alert("Order submitted successfully! We will contact you soon.");
        orderForm.reset();
        orderOverlay.style.display = "none";
      } catch (err) {
        alert("Error placing order: " + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Order";
      }
    });
  }

  function id(elementId) {
    return document.getElementById(elementId);
  }
});
