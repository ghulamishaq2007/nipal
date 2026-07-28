// admin.js - Core CMS Controller for Cafe Vita Admin Panel
import { 
  auth, 
  db, 
  signOut, 
  onAuthStateChanged,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy,
  uploadImageToStorage,
  handleFirestoreError
} from "./firebase.js";
import { SEED_TESTIMONIALS } from "./testimonialsData.js";

document.addEventListener("DOMContentLoaded", () => {
  const loadingOverlay = document.getElementById("loadingOverlay");
  const toastContainer = document.getElementById("toastContainer");
  const sidebar = document.getElementById("sidebar");
  const toggleSidebar = document.getElementById("toggleSidebar");
  const adminEmailDisplay = document.getElementById("adminEmailDisplay");

  // Authentication Guard - Protects admin.html
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}
      window.location.replace("login.html");
    } else {
      if (adminEmailDisplay) adminEmailDisplay.textContent = user.email || "Admin User";
      if (loadingOverlay) {
        setTimeout(() => {
          loadingOverlay.style.opacity = "0";
          setTimeout(() => loadingOverlay.style.display = "none", 400);
        }, 500);
      }
      initAdminPanel();
    }
  });

  // Logout Handler - Clears session and signs out immediately
  async function performLogout() {
    try {
      if (loadingOverlay) {
        loadingOverlay.style.display = "flex";
        loadingOverlay.style.opacity = "1";
      }

      // Clear local & session storage
      try {
        localStorage.clear();
        sessionStorage.clear();
        sessionStorage.setItem("loggedOutMsg", "true");
      } catch (e) {
        console.warn("Storage clear error:", e);
      }

      // Immediately sign out current Firebase Auth user
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Redirect to login page
      window.location.replace("login.html?logout=success");
    }
  }

  // Event listener for all logout buttons
  document.addEventListener("click", (e) => {
    const logoutTarget = e.target.closest("#logoutBtn, #logoutHeaderBtn, .btn-logout, .btn-logout-header");
    if (logoutTarget) {
      e.preventDefault();
      e.stopPropagation();
      performLogout();
    }
  });

  // Mobile Sidebar Toggle
  if (toggleSidebar && sidebar) {
    toggleSidebar.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  // Toast Notification Helper
  window.showToast = function(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  // Modal Controls Helper
  window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("active");
  };

  window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("active");
  };

  document.querySelectorAll(".closeModalBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal-overlay");
      if (modal) modal.classList.remove("active");
    });
  });

  // MAIN ADMIN INITIALIZATION
  function initAdminPanel() {
    setupTabNavigation();
    bindSettingsSection();
    bindHeroSection();
    bindAboutSection();
    bindThemeSection();

    listenProducts();
    listenCategories();
    listenSlides();
    listenServices();
    listenNavMenu();
    listenGallery();
    listenReviews();
    listenFaqs();
    listenReservations();
    listenOrders();
    listenContactMessages();

    initAnalyticsCharts();
    initBackupRestoreSection();
  }

  // TAB NAVIGATION
  function setupTabNavigation() {
    const sidebarLinks = document.querySelectorAll(".sidebar-link");
    const tabContents = document.querySelectorAll(".tab-content");
    const pageTitleHeading = document.getElementById("currentTabTitle");

    sidebarLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const tabId = link.getAttribute("data-tab");

        sidebarLinks.forEach(l => l.classList.remove("active"));
        tabContents.forEach(c => c.classList.remove("active"));

        link.classList.add("active");
        const targetTab = document.getElementById(`tab-${tabId}`);
        if (targetTab) targetTab.classList.add("active");

        if (pageTitleHeading) {
          const spanText = link.querySelector("span")?.textContent || "Dashboard";
          pageTitleHeading.textContent = spanText;
        }

        if (sidebar.classList.contains("open")) {
          sidebar.classList.remove("open");
        }
      });
    });
  }

  // -------------------------------------------------------------
  // 1. SETTINGS SECTION
  // -------------------------------------------------------------
  function bindSettingsSection() {
    const saveBtn = document.getElementById("saveSettingsBtn");
    const settingsRef = doc(db, "settings", "website");

    // Live Snapshot Listener for Settings Form
    onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        document.getElementById("settingWebsiteName").value = data.websiteName || "";
        document.getElementById("settingLogoUrl").value = data.logo || "";
        document.getElementById("settingLogoPreview").src = data.logo || "./vita.png.png";
        document.getElementById("settingFaviconUrl").value = data.favicon || "";
        document.getElementById("settingFaviconPreview").src = data.favicon || "";
        document.getElementById("settingEmail").value = data.email || "";
        document.getElementById("settingPhone").value = data.phone || "";
        document.getElementById("settingWhatsapp").value = data.whatsapp || "";
        document.getElementById("settingAddress").value = data.address || "";
        document.getElementById("settingHoursWeekdays").value = data.openingHoursWeekdays || "";
        document.getElementById("settingHoursWeekends").value = data.openingHoursWeekends || "";
        document.getElementById("settingMapsIframe").value = data.mapsIframe || "";
        document.getElementById("settingFooterText").value = data.footerText || "";
        document.getElementById("settingCopyright").value = data.copyright || "";

        if (data.socialLinks) {
          document.getElementById("settingFacebook").value = data.socialLinks.facebook || "";
          document.getElementById("settingInstagram").value = data.socialLinks.instagram || "";
          document.getElementById("settingTiktok").value = data.socialLinks.tiktok || "";
          document.getElementById("settingYoutube").value = data.socialLinks.youtube || "";
        }
      }
    });

    // Save Action
    saveBtn?.addEventListener("click", async () => {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;

      try {
        let logoUrl = document.getElementById("settingLogoUrl").value;
        const logoFile = document.getElementById("settingLogoFile").files[0];
        if (logoFile) {
          logoUrl = await uploadImageToStorage(logoFile, "settings");
        }

        let faviconUrl = document.getElementById("settingFaviconUrl").value;
        const faviconFile = document.getElementById("settingFaviconFile").files[0];
        if (faviconFile) {
          faviconUrl = await uploadImageToStorage(faviconFile, "settings");
        }

        await setDoc(settingsRef, {
          websiteName: document.getElementById("settingWebsiteName").value.trim(),
          logo: logoUrl,
          favicon: faviconUrl,
          email: document.getElementById("settingEmail").value.trim(),
          phone: document.getElementById("settingPhone").value.trim(),
          whatsapp: document.getElementById("settingWhatsapp").value.trim(),
          address: document.getElementById("settingAddress").value.trim(),
          openingHoursWeekdays: document.getElementById("settingHoursWeekdays").value.trim(),
          openingHoursWeekends: document.getElementById("settingHoursWeekends").value.trim(),
          mapsIframe: document.getElementById("settingMapsIframe").value.trim(),
          footerText: document.getElementById("settingFooterText").value.trim(),
          copyright: document.getElementById("settingCopyright").value.trim(),
          socialLinks: {
            facebook: document.getElementById("settingFacebook").value.trim(),
            instagram: document.getElementById("settingInstagram").value.trim(),
            tiktok: document.getElementById("settingTiktok").value.trim(),
            youtube: document.getElementById("settingYoutube").value.trim()
          }
        }, { merge: true });

        showToast("Website Settings updated successfully!");
      } catch (err) {
        console.error(err);
        showToast("Failed to update settings: " + err.message, "error");
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fas fa-save"></i> Save Settings`;
      }
    });
  }

  // -------------------------------------------------------------
  // 2. HERO SECTION
  // -------------------------------------------------------------
  function bindHeroSection() {
    const saveBtn = document.getElementById("saveHeroBtn");
    const heroRef = doc(db, "hero", "home");

    onSnapshot(heroRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        document.getElementById("heroHeading").value = data.heading || "";
        document.getElementById("heroSubHeading").value = data.subHeading || "";
        document.getElementById("heroButtonText").value = data.buttonText || "";
        document.getElementById("heroButtonLink").value = data.buttonLink || "";
        document.getElementById("heroBgUrl").value = data.bgImage || "";
        document.getElementById("heroBgPreview").src = data.bgImage || "";
      }
    });

    saveBtn?.addEventListener("click", async () => {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;

      try {
        let bgUrl = document.getElementById("heroBgUrl").value;
        const bgFile = document.getElementById("heroBgFile").files[0];
        if (bgFile) {
          bgUrl = await uploadImageToStorage(bgFile, "hero");
        }

        await setDoc(heroRef, {
          heading: document.getElementById("heroHeading").value.trim(),
          subHeading: document.getElementById("heroSubHeading").value.trim(),
          buttonText: document.getElementById("heroButtonText").value.trim(),
          buttonLink: document.getElementById("heroButtonLink").value.trim(),
          bgImage: bgUrl
        }, { merge: true });

        showToast("Hero Section saved!");
      } catch (err) {
        showToast("Error updating hero section: " + err.message, "error");
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fas fa-save"></i> Save Hero Section`;
      }
    });
  }

  // -------------------------------------------------------------
  // 3. ABOUT SECTION
  // -------------------------------------------------------------
  function bindAboutSection() {
    const saveBtn = document.getElementById("saveAboutBtn");
    const aboutRef = doc(db, "about", "main");

    onSnapshot(aboutRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        document.getElementById("aboutHeading").value = data.heading || "";
        document.getElementById("aboutDescription").value = data.description || "";
        document.getElementById("aboutCtaText").value = data.ctaText || "";
        document.getElementById("aboutCtaLink").value = data.ctaLink || "";
        document.getElementById("aboutImageUrl").value = data.image || "";
        document.getElementById("aboutImagePreview").src = data.image || "";
      }
    });

    saveBtn?.addEventListener("click", async () => {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;

      try {
        let imgUrl = document.getElementById("aboutImageUrl").value;
        const imgFile = document.getElementById("aboutImageFile").files[0];
        if (imgFile) {
          imgUrl = await uploadImageToStorage(imgFile, "about");
        }

        await setDoc(aboutRef, {
          heading: document.getElementById("aboutHeading").value.trim(),
          description: document.getElementById("aboutDescription").value.trim(),
          ctaText: document.getElementById("aboutCtaText").value.trim(),
          ctaLink: document.getElementById("aboutCtaLink").value.trim(),
          image: imgUrl
        }, { merge: true });

        showToast("About section updated!");
      } catch (err) {
        showToast("Error updating About section: " + err.message, "error");
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fas fa-save"></i> Save About Info`;
      }
    });
  }

  // -------------------------------------------------------------
  // 4. THEME SETTINGS
  // -------------------------------------------------------------
  function bindThemeSection() {
    const saveBtn = document.getElementById("saveThemeBtn");
    const settingsRef = doc(db, "settings", "website");

    // Color pickers sync with text inputs
    const pPicker = document.getElementById("themePrimaryColor");
    const pHex = document.getElementById("themePrimaryHex");
    const sPicker = document.getElementById("themeSecondaryColor");
    const sHex = document.getElementById("themeSecondaryHex");

    pPicker?.addEventListener("input", () => pHex.value = pPicker.value);
    pHex?.addEventListener("input", () => pPicker.value = pHex.value);
    sPicker?.addEventListener("input", () => sHex.value = sPicker.value);
    sHex?.addEventListener("input", () => sPicker.value = sHex.value);

    onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.primaryColor) {
          pPicker.value = data.primaryColor;
          pHex.value = data.primaryColor;
        }
        if (data.secondaryColor) {
          sPicker.value = data.secondaryColor;
          sHex.value = data.secondaryColor;
        }
        if (data.font) document.getElementById("themeFont").value = data.font;
        if (data.borderRadius) document.getElementById("themeBorderRadius").value = data.borderRadius;
        if (data.buttonStyle) document.getElementById("themeButtonStyle").value = data.buttonStyle;
      }
    });

    saveBtn?.addEventListener("click", async () => {
      saveBtn.disabled = true;
      try {
        await setDoc(settingsRef, {
          primaryColor: pHex.value.trim(),
          secondaryColor: sHex.value.trim(),
          font: document.getElementById("themeFont").value,
          borderRadius: document.getElementById("themeBorderRadius").value,
          buttonStyle: document.getElementById("themeButtonStyle").value
        }, { merge: true });

        showToast("Theme settings applied! Website updated live.");
      } catch (err) {
        showToast("Error updating theme: " + err.message, "error");
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  // -------------------------------------------------------------
  // 5. PRODUCTS (MENU MANAGEMENT)
  // -------------------------------------------------------------
  let allProducts = [];

  function listenProducts() {
    const tbody = document.getElementById("productsTable");
    const addBtn = document.getElementById("addProductBtn");
    const form = document.getElementById("productForm");
    const searchInput = document.getElementById("productSearchInput");
    const categoryFilter = document.getElementById("productCategoryFilter");

    onSnapshot(collection(db, "products"), (snap) => {
      allProducts = [];
      snap.forEach(d => allProducts.push({ id: d.id, ...d.data() }));

      // Update stat count
      const statProducts = document.getElementById("statProducts");
      if (statProducts) statProducts.textContent = allProducts.length;

      renderProductsTable();
    });

    function renderProductsTable() {
      const query = (searchInput?.value || "").toLowerCase().trim();
      const cat = categoryFilter?.value || "all";

      const filtered = allProducts.filter(p => {
        const matchesQuery = p.name?.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query);
        const matchesCat = cat === "all" || p.category === cat;
        return matchesQuery && matchesCat;
      });

      if (!tbody) return;
      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No products found.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(p => `
        <tr>
          <td><img src="${p.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100'}" class="table-img" alt="${p.name}"></td>
          <td><strong>${p.name}</strong></td>
          <td><span class="badge badge-confirmed">${p.category || 'general'}</span></td>
          <td>Rs.${p.price} ${p.oldPrice ? `<small style="text-decoration: line-through; color: #888;">Rs.${p.oldPrice}</small>` : ''}</td>
          <td>${p.available !== false ? '<span class="badge badge-completed">In Stock</span>' : '<span class="badge badge-cancelled">Out of Stock</span>'}</td>
          <td>
            ${p.popular ? '<span class="badge badge-pending">Popular</span> ' : ''}
            ${p.featured ? '<span class="badge badge-accepted">Featured</span>' : ''}
          </td>
          <td>
            <button class="btn-secondary edit-product-btn" data-id="${p.id}"><i class="fas fa-edit"></i></button>
            <button class="btn-danger delete-product-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join("");

      // Bind actions
      tbody.querySelectorAll(".edit-product-btn").forEach(b => {
        b.addEventListener("click", () => editProduct(b.dataset.id));
      });
      tbody.querySelectorAll(".delete-product-btn").forEach(b => {
        b.addEventListener("click", () => deleteProduct(b.dataset.id));
      });
    }

    searchInput?.addEventListener("input", renderProductsTable);
    categoryFilter?.addEventListener("change", renderProductsTable);

    addBtn?.addEventListener("click", () => {
      form.reset();
      document.getElementById("productId").value = "";
      document.getElementById("productModalTitle").textContent = "Add New Product";
      document.getElementById("productImagePreview").src = "";
      openModal("productModal");
    });

    async function editProduct(id) {
      const prod = allProducts.find(p => p.id === id);
      if (!prod) return;

      document.getElementById("productId").value = prod.id;
      document.getElementById("productName").value = prod.name || "";
      document.getElementById("productCategory").value = prod.category || "pizza";
      document.getElementById("productPrice").value = prod.price || "";
      document.getElementById("productOldPrice").value = prod.oldPrice || "";
      document.getElementById("productDescription").value = prod.description || "";
      document.getElementById("productImageUrl").value = prod.image || "";
      document.getElementById("productImagePreview").src = prod.image || "";
      document.getElementById("productAvailable").checked = prod.available !== false;
      document.getElementById("productPopular").checked = !!prod.popular;
      document.getElementById("productFeatured").checked = !!prod.featured;

      document.getElementById("productModalTitle").textContent = "Edit Product";
      openModal("productModal");
    }

    async function deleteProduct(id) {
      if (confirm("Are you sure you want to delete this product?")) {
        await deleteDoc(doc(db, "products", id));
        showToast("Product deleted!");
      }
    }

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("productId").value;
      let imgUrl = document.getElementById("productImageUrl").value.trim();
      const imgFile = document.getElementById("productImageFile").files[0];

      if (imgFile) {
        imgUrl = await uploadImageToStorage(imgFile, "products");
      }

      const payload = {
        name: document.getElementById("productName").value.trim(),
        category: document.getElementById("productCategory").value,
        price: Number(document.getElementById("productPrice").value),
        oldPrice: Number(document.getElementById("productOldPrice").value) || 0,
        description: document.getElementById("productDescription").value.trim(),
        image: imgUrl || "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",
        available: document.getElementById("productAvailable").checked,
        popular: document.getElementById("productPopular").checked,
        featured: document.getElementById("productFeatured").checked
      };

      if (id) {
        await updateDoc(doc(db, "products", id), payload);
        showToast("Product updated!");
      } else {
        await addDoc(collection(db, "products"), payload);
        showToast("New product added!");
      }

      closeModal("productModal");
    });
  }

  // -------------------------------------------------------------
  // 6. CATEGORIES MANAGEMENT
  // -------------------------------------------------------------
  let allCategories = [];

  function listenCategories() {
    const tbody = document.getElementById("categoriesTable");
    const addBtn = document.getElementById("addCategoryBtn");
    const form = document.getElementById("categoryForm");
    const productCategorySelect = document.getElementById("productCategory");
    const productCategoryFilter = document.getElementById("productCategoryFilter");

    onSnapshot(collection(db, "categories"), (snap) => {
      allCategories = [];
      snap.forEach(d => allCategories.push({ id: d.id, ...d.data() }));

      const statCategories = document.getElementById("statCategories");
      if (statCategories) statCategories.textContent = allCategories.length;

      // Populate Categories Table
      if (tbody) {
        tbody.innerHTML = allCategories.map(c => `
          <tr>
            <td style="font-size: 20px;">${c.icon || '📁'}</td>
            <td><strong>${c.name}</strong></td>
            <td><code>${c.slug}</code></td>
            <td>
              <button class="btn-secondary edit-cat-btn" data-id="${c.id}"><i class="fas fa-edit"></i></button>
              <button class="btn-danger delete-cat-btn" data-id="${c.id}"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `).join("");

        tbody.querySelectorAll(".edit-cat-btn").forEach(b => {
          b.addEventListener("click", () => editCategory(b.dataset.id));
        });
        tbody.querySelectorAll(".delete-cat-btn").forEach(b => {
          b.addEventListener("click", () => deleteCategory(b.dataset.id));
        });
      }

      // Populate Product Modal Category Dropdown
      if (productCategorySelect) {
        productCategorySelect.innerHTML = allCategories.map(c => `
          <option value="${c.slug}">${c.icon ? c.icon + ' ' : ''}${c.name}</option>
        `).join("");
      }

      // Populate Filter Category Dropdown
      if (productCategoryFilter) {
        productCategoryFilter.innerHTML = `<option value="all">All Categories</option>` + allCategories.map(c => `
          <option value="${c.slug}">${c.icon ? c.icon + ' ' : ''}${c.name}</option>
        `).join("");
      }
    });

    addBtn?.addEventListener("click", () => {
      form.reset();
      document.getElementById("categoryId").value = "";
      document.getElementById("categoryModalTitle").textContent = "Add Category";
      openModal("categoryModal");
    });

    function editCategory(id) {
      const cat = allCategories.find(c => c.id === id);
      if (!cat) return;
      document.getElementById("categoryId").value = cat.id;
      document.getElementById("categoryName").value = cat.name || "";
      document.getElementById("categorySlug").value = cat.slug || "";
      document.getElementById("categoryIcon").value = cat.icon || "";
      document.getElementById("categoryModalTitle").textContent = "Edit Category";
      openModal("categoryModal");
    }

    async function deleteCategory(id) {
      if (confirm("Delete category? Products using this category slug won't be deleted.")) {
        await deleteDoc(doc(db, "categories", id));
        showToast("Category deleted!");
      }
    }

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("categoryId").value;
      const payload = {
        name: document.getElementById("categoryName").value.trim(),
        slug: document.getElementById("categorySlug").value.trim().toLowerCase(),
        icon: document.getElementById("categoryIcon").value.trim()
      };

      if (id) {
        await updateDoc(doc(db, "categories", id), payload);
        showToast("Category updated!");
      } else {
        await addDoc(collection(db, "categories"), payload);
        showToast("Category added!");
      }
      closeModal("categoryModal");
    });
  }

  // -------------------------------------------------------------
  // 7. SLIDER MANAGEMENT
  // -------------------------------------------------------------
  function listenSlides() {
    const tbody = document.getElementById("slidesTable");
    const addBtn = document.getElementById("addSlideBtn");
    const form = document.getElementById("slideForm");

    onSnapshot(collection(db, "slides"), (snap) => {
      const slides = [];
      snap.forEach(d => slides.push({ id: d.id, ...d.data() }));
      slides.sort((a, b) => (a.order || 0) - (b.order || 0));

      if (tbody) {
        tbody.innerHTML = slides.map(s => `
          <tr>
            <td><img src="${s.image}" class="table-img" style="width: 70px;"></td>
            <td><strong>${s.title}</strong></td>
            <td>${s.subtitle || '-'}</td>
            <td>${s.buttonText || '-'} (${s.buttonLink || '-'})</td>
            <td>${s.order || 1}</td>
            <td>
              <button class="btn-danger delete-slide-btn" data-id="${s.id}"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `).join("");

        tbody.querySelectorAll(".delete-slide-btn").forEach(b => {
          b.addEventListener("click", async () => {
            if (confirm("Delete this slide?")) {
              await deleteDoc(doc(db, "slides", b.dataset.id));
              showToast("Slide deleted!");
            }
          });
        });
      }
    });

    addBtn?.addEventListener("click", () => {
      form.reset();
      document.getElementById("slideId").value = "";
      openModal("slideModal");
    });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      let imgUrl = document.getElementById("slideImageUrl").value.trim();
      const imgFile = document.getElementById("slideImageFile").files[0];
      if (imgFile) imgUrl = await uploadImageToStorage(imgFile, "slides");

      await addDoc(collection(db, "slides"), {
        title: document.getElementById("slideTitle").value.trim(),
        subtitle: document.getElementById("slideSubtitle").value.trim(),
        buttonText: document.getElementById("slideButtonText").value.trim(),
        buttonLink: document.getElementById("slideButtonLink").value.trim(),
        order: Number(document.getElementById("slideOrder").value) || 1,
        image: imgUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200"
      });

      showToast("Slide added!");
      closeModal("slideModal");
    });
  }

  // -------------------------------------------------------------
  // 8. SERVICES (WHY CHOOSE)
  // -------------------------------------------------------------
  function listenServices() {
    const tbody = document.getElementById("servicesTable");
    const addBtn = document.getElementById("addServiceBtn");
    const form = document.getElementById("serviceForm");

    onSnapshot(collection(db, "services"), (snap) => {
      const services = [];
      snap.forEach(d => services.push({ id: d.id, ...d.data() }));

      if (tbody) {
        tbody.innerHTML = services.map(s => `
          <tr>
            <td style="font-size: 22px;">${s.icon || '☕'}</td>
            <td><strong>${s.title}</strong></td>
            <td>${s.description}</td>
            <td>${s.order || 1}</td>
            <td>
              <button class="btn-danger delete-service-btn" data-id="${s.id}"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `).join("");

        tbody.querySelectorAll(".delete-service-btn").forEach(b => {
          b.addEventListener("click", async () => {
            if (confirm("Delete service card?")) {
              await deleteDoc(doc(db, "services", b.dataset.id));
              showToast("Service deleted!");
            }
          });
        });
      }
    });

    addBtn?.addEventListener("click", () => {
      form.reset();
      openModal("serviceModal");
    });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await addDoc(collection(db, "services"), {
        title: document.getElementById("serviceTitle").value.trim(),
        icon: document.getElementById("serviceIcon").value.trim(),
        description: document.getElementById("serviceDescription").value.trim(),
        order: Number(document.getElementById("serviceOrder").value) || 1
      });
      showToast("Service card added!");
      closeModal("serviceModal");
    });
  }

  // -------------------------------------------------------------
  // 9. NAVIGATION MENU
  // -------------------------------------------------------------
  function listenNavMenu() {
    const tbody = document.getElementById("navMenuTable");
    const addBtn = document.getElementById("addNavBtn");
    const form = document.getElementById("navForm");

    onSnapshot(collection(db, "navigation"), async (snap) => {
      if (snap.empty) {
        // Seed default nav items if empty
        const defaults = [
          { title: "Home", url: "index.html", order: 1 },
          { title: "About", url: "about.html", order: 2 },
          { title: "Menu", url: "menu.html", order: 3 },
          { title: "Contact", url: "contact.html", order: 4 }
        ];
        for (const item of defaults) {
          await addDoc(collection(db, "navigation"), item);
        }
        return;
      }

      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.order || 0) - (b.order || 0));

      if (tbody) {
        tbody.innerHTML = items.map(n => `
          <tr>
            <td><strong>${n.title}</strong></td>
            <td><code>${n.url}</code></td>
            <td>${n.order || 1}</td>
            <td>
              <button class="btn-danger delete-nav-btn" data-id="${n.id}"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `).join("");

        tbody.querySelectorAll(".delete-nav-btn").forEach(b => {
          b.addEventListener("click", async () => {
            if (confirm("Delete navigation link?")) {
              await deleteDoc(doc(db, "navigation", b.dataset.id));
              showToast("Link deleted!");
            }
          });
        });
      }
    });

    addBtn?.addEventListener("click", () => {
      form.reset();
      openModal("navModal");
    });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await addDoc(collection(db, "navigation"), {
        title: document.getElementById("navTitle").value.trim(),
        url: document.getElementById("navUrl").value.trim(),
        order: Number(document.getElementById("navOrder").value) || 1
      });
      showToast("Nav link added!");
      closeModal("navModal");
    });
  }

  // -------------------------------------------------------------
  // 10. PHOTO GALLERY
  // -------------------------------------------------------------
  function listenGallery() {
    const grid = document.getElementById("galleryGrid");
    const uploadInput = document.getElementById("galleryUploadInput");
    const uploadBtn = document.getElementById("uploadGalleryBtn");

    onSnapshot(collection(db, "gallery"), (snap) => {
      const images = [];
      snap.forEach(d => images.push({ id: d.id, ...d.data() }));

      if (grid) {
        if (images.length === 0) {
          grid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1;">No photos uploaded yet. Click "Upload Photos" above!</p>`;
          return;
        }

        grid.innerHTML = images.map(img => `
          <div style="position: relative; border-radius: 8px; overflow: hidden; background: #000; height: 160px; border: 1px solid var(--border-color);">
            <img src="${img.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;">
            <button class="delete-gallery-btn" data-id="${img.id}" style="position: absolute; top: 8px; right: 8px; background: rgba(239,68,68,0.9); border: none; color: #fff; width: 30px; height: 30px; border-radius: 50%; cursor: pointer;">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `).join("");

        grid.querySelectorAll(".delete-gallery-btn").forEach(b => {
          b.addEventListener("click", async () => {
            if (confirm("Delete photo from gallery?")) {
              await deleteDoc(doc(db, "gallery", b.dataset.id));
              showToast("Photo deleted!");
            }
          });
        });
      }
    });

    uploadBtn?.addEventListener("click", () => uploadInput?.click());

    uploadInput?.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      uploadBtn.disabled = true;
      uploadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading...`;

      for (const f of files) {
        const url = await uploadImageToStorage(f, "gallery");
        await addDoc(collection(db, "gallery"), {
          imageUrl: url,
          title: f.name,
          uploadedAt: Date.now()
        });
      }

      showToast(`${files.length} photo(s) uploaded successfully!`);
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = `<i class="fas fa-upload"></i> Upload Photos`;
    });
  }

  // -------------------------------------------------------------
  // 11. REVIEWS / TESTIMONIALS CMS
  // -------------------------------------------------------------
  function listenReviews() {
    const tbody = document.getElementById("reviewsTable");
    const addBtn = document.getElementById("addReviewBtn");
    const seedBtn = document.getElementById("seedReviewsBtn");
    const form = document.getElementById("reviewForm");
    const searchInput = document.getElementById("reviewSearchInput");
    const imageFileInput = document.getElementById("reviewImageFile");
    const imageUrlInput = document.getElementById("reviewImageUrl");
    const imagePreview = document.getElementById("reviewImagePreview");

    let allReviews = [];
    let currentSearchTerm = "";

    // Image preview handler
    if (imageUrlInput && imagePreview) {
      imageUrlInput.addEventListener("input", () => {
        if (imageUrlInput.value.trim()) {
          imagePreview.src = imageUrlInput.value.trim();
          imagePreview.style.display = "block";
        } else {
          imagePreview.style.display = "none";
        }
      });
    }

    if (imageFileInput && imagePreview) {
      imageFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            imagePreview.src = evt.target.result;
            imagePreview.style.display = "block";
          };
          reader.readAsDataURL(file);
        }
      });
    }

    function renderReviewsTable() {
      if (!tbody) return;

      let filtered = [...allReviews];
      if (currentSearchTerm) {
        const term = currentSearchTerm.toLowerCase();
        filtered = filtered.filter(r =>
          (r.name && r.name.toLowerCase().includes(term)) ||
          (r.review && r.review.toLowerCase().includes(term))
        );
      }

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No testimonials found.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map((r, idx) => {
        const isEnabled = r.enabled !== false;
        const currentOrder = Number(r.order) || idx + 1;

        return `
          <tr data-id="${r.id}">
            <td style="white-space: nowrap;">
              <span style="font-weight: 700; color: var(--accent-gold); margin-right: 8px;">#${currentOrder}</span>
              <div style="display: inline-flex; gap: 4px;">
                <button class="btn-sm btn-secondary move-up-review-btn" data-id="${r.id}" title="Move Up"><i class="fas fa-arrow-up"></i></button>
                <button class="btn-sm btn-secondary move-down-review-btn" data-id="${r.id}" title="Move Down"><i class="fas fa-arrow-down"></i></button>
              </div>
            </td>
            <td>
              <img src="${r.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="table-img" style="border-radius: 50%; width: 42px; height: 42px; object-fit: cover; border: 1px solid var(--border-color);">
            </td>
            <td><strong>${escapeAdminHtml(r.name)}</strong></td>
            <td><span style="color: var(--accent-gold); font-size: 14px;">${'★'.repeat(Number(r.rating) || 5)}</span></td>
            <td><div style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeAdminHtml(r.review)}">"${escapeAdminHtml(r.review)}"</div></td>
            <td>
              <span class="badge ${isEnabled ? 'badge-success' : 'badge-secondary'}">${isEnabled ? 'Enabled' : 'Disabled'}</span>
            </td>
            <td style="white-space: nowrap;">
              <button class="btn-sm btn-secondary toggle-review-btn" data-id="${r.id}" data-enabled="${isEnabled}" style="margin-right: 4px;">
                <i class="fas fa-${isEnabled ? 'eye-slash' : 'eye'}"></i> ${isEnabled ? 'Disable' : 'Enable'}
              </button>
              <button class="btn-sm btn-primary edit-review-btn" data-id="${r.id}" style="margin-right: 4px;"><i class="fas fa-edit"></i> Edit</button>
              <button class="btn-sm btn-danger delete-review-btn" data-id="${r.id}"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `;
      }).join("");

      // Bind Delete Listeners
      tbody.querySelectorAll(".delete-review-btn").forEach(b => {
        b.addEventListener("click", async () => {
          if (confirm("Are you sure you want to delete this testimonial?")) {
            await deleteDoc(doc(db, "reviews", b.dataset.id));
            showToast("Testimonial deleted successfully!");
          }
        });
      });

      // Bind Edit Listeners
      tbody.querySelectorAll(".edit-review-btn").forEach(b => {
        b.addEventListener("click", () => {
          const rev = allReviews.find(x => x.id === b.dataset.id);
          if (!rev) return;

          document.getElementById("reviewModalTitle").textContent = "Edit Testimonial";
          document.getElementById("reviewId").value = rev.id;
          document.getElementById("reviewName").value = rev.name || "";
          document.getElementById("reviewRating").value = rev.rating || 5;
          document.getElementById("reviewOrder").value = rev.order || 1;
          document.getElementById("reviewText").value = rev.review || "";
          document.getElementById("reviewImageUrl").value = rev.image || "";
          document.getElementById("reviewEnabled").checked = rev.enabled !== false;

          if (imagePreview) {
            if (rev.image) {
              imagePreview.src = rev.image;
              imagePreview.style.display = "block";
            } else {
              imagePreview.style.display = "none";
            }
          }

          openModal("reviewModal");
        });
      });

      // Bind Toggle Enable/Disable Listeners
      tbody.querySelectorAll(".toggle-review-btn").forEach(b => {
        b.addEventListener("click", async () => {
          const id = b.dataset.id;
          const currentEnabled = b.dataset.enabled === "true";
          await updateDoc(doc(db, "reviews", id), {
            enabled: !currentEnabled
          });
          showToast(`Testimonial ${!currentEnabled ? 'Enabled' : 'Disabled'}!`);
        });
      });

      // Bind Move Up Listeners
      tbody.querySelectorAll(".move-up-review-btn").forEach(b => {
        b.addEventListener("click", async () => {
          const id = b.dataset.id;
          const idx = allReviews.findIndex(x => x.id === id);
          if (idx <= 0) return;

          const currentItem = allReviews[idx];
          const prevItem = allReviews[idx - 1];

          const currentOrder = Number(currentItem.order) || idx + 1;
          const prevOrder = Number(prevItem.order) || idx;

          await updateDoc(doc(db, "reviews", currentItem.id), { order: prevOrder });
          await updateDoc(doc(db, "reviews", prevItem.id), { order: currentOrder });
          showToast("Display order updated!");
        });
      });

      // Bind Move Down Listeners
      tbody.querySelectorAll(".move-down-review-btn").forEach(b => {
        b.addEventListener("click", async () => {
          const id = b.dataset.id;
          const idx = allReviews.findIndex(x => x.id === id);
          if (idx < 0 || idx >= allReviews.length - 1) return;

          const currentItem = allReviews[idx];
          const nextItem = allReviews[idx + 1];

          const currentOrder = Number(currentItem.order) || idx + 1;
          const nextOrder = Number(nextItem.order) || idx + 2;

          await updateDoc(doc(db, "reviews", currentItem.id), { order: nextOrder });
          await updateDoc(doc(db, "reviews", nextItem.id), { order: currentOrder });
          showToast("Display order updated!");
        });
      });
    }

    // Realtime Listener
    onSnapshot(collection(db, "reviews"), (snap) => {
      allReviews = [];
      snap.forEach(d => allReviews.push({ id: d.id, ...d.data() }));

      // Sort by order position
      allReviews.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

      const statReviews = document.getElementById("statReviews");
      if (statReviews) statReviews.textContent = allReviews.length;

      renderReviewsTable();
    });

    // Search input listener
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        currentSearchTerm = e.target.value.trim();
        renderReviewsTable();
      });
    }

    // Restore 89 Default Testimonials Button
    if (seedBtn) {
      seedBtn.addEventListener("click", async () => {
        if (!confirm("This will restore all 89 default realistic Muslim customer testimonials into Firebase Firestore. Proceed?")) return;

        seedBtn.disabled = true;
        seedBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Restoring Testimonials...`;

        try {
          const existingNames = new Set(allReviews.map(r => r.name));
          let addedCount = 0;

          for (const item of SEED_TESTIMONIALS) {
            if (!existingNames.has(item.name)) {
              await addDoc(collection(db, "reviews"), {
                name: item.name,
                rating: item.rating || 5,
                review: item.review,
                image: item.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
                order: item.order || 1,
                enabled: item.enabled !== false,
                createdAt: Date.now()
              });
              addedCount++;
            }
          }

          showToast(`Successfully seeded ${addedCount} testimonials! Total: ${allReviews.length + addedCount}`);
        } catch (err) {
          showToast("Error seeding testimonials: " + err.message, "danger");
        } finally {
          seedBtn.disabled = false;
          seedBtn.innerHTML = `<i class="fas fa-sync-alt"></i> Restore 89 Default Testimonials`;
        }
      });
    }

    // Add Testimonial Button
    addBtn?.addEventListener("click", () => {
      form.reset();
      document.getElementById("reviewModalTitle").textContent = "Add Testimonial";
      document.getElementById("reviewId").value = "";
      document.getElementById("reviewRating").value = 5;
      document.getElementById("reviewOrder").value = allReviews.length + 1;
      document.getElementById("reviewEnabled").checked = true;
      if (imagePreview) imagePreview.style.display = "none";
      openModal("reviewModal");
    });

    // Form Submit (Add/Edit)
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const reviewId = document.getElementById("reviewId").value.trim();
      let imgUrl = document.getElementById("reviewImageUrl").value.trim();
      const imgFile = document.getElementById("reviewImageFile").files[0];

      if (imgFile) {
        imgUrl = await uploadImageToStorage(imgFile, "reviews");
      }

      const reviewData = {
        name: document.getElementById("reviewName").value.trim(),
        rating: Number(document.getElementById("reviewRating").value) || 5,
        order: Number(document.getElementById("reviewOrder").value) || (allReviews.length + 1),
        review: document.getElementById("reviewText").value.trim(),
        image: imgUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        enabled: document.getElementById("reviewEnabled").checked
      };

      if (reviewId) {
        await updateDoc(doc(db, "reviews", reviewId), reviewData);
        showToast("Testimonial updated successfully!");
      } else {
        reviewData.createdAt = Date.now();
        await addDoc(collection(db, "reviews"), reviewData);
        showToast("Testimonial added successfully!");
      }

      closeModal("reviewModal");
    });
  }

  function escapeAdminHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // -------------------------------------------------------------
  // 12. FAQS
  // -------------------------------------------------------------
  function listenFaqs() {
    const tbody = document.getElementById("faqsTable");
    const addBtn = document.getElementById("addFaqBtn");
    const form = document.getElementById("faqForm");

    onSnapshot(collection(db, "faqs"), (snap) => {
      const faqs = [];
      snap.forEach(d => faqs.push({ id: d.id, ...d.data() }));

      if (tbody) {
        tbody.innerHTML = faqs.map(f => `
          <tr>
            <td><strong>${f.question}</strong></td>
            <td>${f.answer}</td>
            <td>${f.order || 1}</td>
            <td>
              <button class="btn-danger delete-faq-btn" data-id="${f.id}"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `).join("");

        tbody.querySelectorAll(".delete-faq-btn").forEach(b => {
          b.addEventListener("click", async () => {
            if (confirm("Delete FAQ?")) {
              await deleteDoc(doc(db, "faqs", b.dataset.id));
              showToast("FAQ deleted!");
            }
          });
        });
      }
    });

    addBtn?.addEventListener("click", () => {
      form.reset();
      openModal("faqModal");
    });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await addDoc(collection(db, "faqs"), {
        question: document.getElementById("faqQuestion").value.trim(),
        answer: document.getElementById("faqAnswer").value.trim(),
        order: Number(document.getElementById("faqOrder").value) || 1
      });
      showToast("FAQ added!");
      closeModal("faqModal");
    });
  }

  // -------------------------------------------------------------
  // 13. BOOKING MANAGEMENT SYSTEM
  // -------------------------------------------------------------
  function listenReservations() {
    const recentTable = document.getElementById("recentReservationsTable");
    const allTable = document.getElementById("allReservationsTable");

    // Search and Filter Elements
    const searchInput = document.getElementById("bookingSearchInput");
    const statusFilter = document.getElementById("bookingStatusFilter");
    const dateFilter = document.getElementById("bookingDateFilter");
    const resetFiltersBtn = document.getElementById("clearBookingFiltersBtn");
    const exportExcelBtn = document.getElementById("exportExcelBtn");
    const exportPdfBtn = document.getElementById("exportPdfBtn");

    let allBookingsList = [];

    // Real-time Firestore Listener
    onSnapshot(collection(db, "reservations"), (snap) => {
      const list = [];
      snap.forEach(d => {
        const data = d.data();
        const docId = d.id;
        const bId = data.bookingId || `CV-BK-${docId.slice(0, 6).toUpperCase()}`;
        list.push({
          id: docId,
          bookingId: bId,
          name: data.name || "Guest",
          phone: data.phone || "-",
          email: data.email || "-",
          resortName: data.resortName || "Cafe Vita Main Dining",
          checkIn: data.checkIn || data.date || "-",
          checkOut: data.checkOut || data.time || "-",
          guests: data.guests || 1,
          specialRequest: data.specialRequest || "-",
          status: data.status ? (data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase()) : "New",
          bookingDate: data.bookingDate || (data.createdAt ? new Date(data.createdAt).toLocaleString() : "-"),
          createdAt: data.createdAt || 0,
          ipTimestamp: data.ipTimestamp || "-"
        });
      });

      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      if (allBookingsList.length > 0 && list.length > allBookingsList.length) {
        playBookingAudioNotification();
        showToast("New Booking Notification received!");
      }

      allBookingsList = list;

      updateBookingStats(list);
      renderBookings();
      if (window.updateAnalyticsSection) {
        window.updateAnalyticsSection(list);
      }

      // Render Recent Table on main Dashboard Overview
      if (recentTable) {
        if (list.length === 0) {
          recentTable.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No bookings found yet.</td></tr>`;
        } else {
          recentTable.innerHTML = list.slice(0, 5).map(r => `
            <tr>
              <td><strong style="color:var(--accent-gold);">${r.bookingId}</strong><br><small style="color:#aaa;">${r.name}</small></td>
              <td>${r.phone}</td>
              <td>${r.checkIn}</td>
              <td>${r.guests} Guest(s)</td>
              <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
              <td>
                <button class="btn-secondary view-booking-btn" data-id="${r.id}" style="padding: 4px 8px;" title="View Details"><i class="fas fa-eye"></i></button>
              </td>
            </tr>
          `).join("");

          recentTable.querySelectorAll(".view-booking-btn").forEach(b => {
            b.addEventListener("click", () => openBookingDetailModal(b.dataset.id));
          });
        }
      }
    });

    // Update Statistics Widgets
    function updateBookingStats(list) {
      const todayStr = new Date().toISOString().split("T")[0];

      const total = list.length;
      const todayCount = list.filter(b => {
        if (!b.createdAt && !b.checkIn) return false;
        const cDate = b.createdAt ? new Date(b.createdAt).toISOString().split("T")[0] : "";
        const chkDate = typeof b.checkIn === "string" ? b.checkIn.split("T")[0].split(" ")[0] : "";
        return cDate === todayStr || chkDate === todayStr;
      }).length;

      const pendingCount = list.filter(b => b.status === "New" || b.status === "Pending").length;
      const confirmedCount = list.filter(b => b.status === "Confirmed").length;
      const completedCount = list.filter(b => b.status === "Completed").length;
      const cancelledCount = list.filter(b => b.status === "Cancelled").length;

      // Update Dashboard Widgets
      const statTotal = document.getElementById("bookingStatTotal");
      const statToday = document.getElementById("bookingStatToday");
      const statPending = document.getElementById("bookingStatPending");
      const statConfirmed = document.getElementById("bookingStatConfirmed");
      const statCompleted = document.getElementById("bookingStatCompleted");
      const statCancelled = document.getElementById("bookingStatCancelled");

      if (statTotal) statTotal.textContent = total;
      if (statToday) statToday.textContent = todayCount;
      if (statPending) statPending.textContent = pendingCount;
      if (statConfirmed) statConfirmed.textContent = confirmedCount;
      if (statCompleted) statCompleted.textContent = completedCount;
      if (statCancelled) statCancelled.textContent = cancelledCount;

      // Also update main dashboard widget & nav notification badge
      const mainStatRes = document.getElementById("statReservations");
      if (mainStatRes) mainStatRes.textContent = pendingCount;

      const navBadge = document.getElementById("navNotificationBadge");
      if (navBadge) {
        navBadge.textContent = pendingCount;
        navBadge.style.display = pendingCount > 0 ? "inline-block" : "none";
      }
    }

    // Render Main Bookings Table with Search and Filtering
    function renderBookings() {
      if (!allTable) return;

      const query = (searchInput?.value || "").toLowerCase().trim();
      const statusVal = statusFilter?.value || "all";
      const dateVal = dateFilter?.value || "";

      let filtered = allBookingsList.filter(b => {
        // Text Search Filter
        const matchesQuery = !query || 
          b.bookingId.toLowerCase().includes(query) ||
          b.name.toLowerCase().includes(query) ||
          b.phone.toLowerCase().includes(query) ||
          b.email.toLowerCase().includes(query) ||
          b.resortName.toLowerCase().includes(query);

        // Status Filter
        const matchesStatus = statusVal === "all" || b.status.toLowerCase() === statusVal.toLowerCase();

        // Date Filter
        let matchesDate = true;
        if (dateVal) {
          const chk = typeof b.checkIn === "string" ? b.checkIn : "";
          matchesDate = chk.includes(dateVal) || b.bookingDate.includes(dateVal);
        }

        return matchesQuery && matchesStatus && matchesDate;
      });

      if (filtered.length === 0) {
        allTable.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 30px;">No bookings found matching your filter criteria.</td></tr>`;
        return;
      }

      allTable.innerHTML = filtered.map(b => {
        const statusLower = b.status.toLowerCase();
        return `
          <tr>
            <td><strong style="color: var(--accent-gold); font-family: monospace;">${b.bookingId}</strong></td>
            <td><strong>${b.name}</strong></td>
            <td>${b.phone}</td>
            <td><small style="color: var(--text-muted);">${b.email}</small></td>
            <td>${b.resortName}</td>
            <td><small>${b.checkIn}</small></td>
            <td><small>${b.checkOut}</small></td>
            <td><span class="badge" style="background:#1e293b; color:#fff;">${b.guests} Guests</span></td>
            <td><span class="badge badge-${statusLower}">${b.status}</span></td>
            <td><small style="color: var(--text-muted);">${b.bookingDate}</small></td>
            <td>
              <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                <button class="btn-secondary view-btn" data-id="${b.id}" style="padding: 5px 8px;" title="View Details"><i class="fas fa-eye"></i></button>
                <button class="btn-primary confirm-btn" data-id="${b.id}" style="padding: 5px 8px; background: #22c55e;" title="Confirm Booking"><i class="fas fa-check"></i></button>
                <button class="btn-primary complete-btn" data-id="${b.id}" style="padding: 5px 8px; background: #a855f7;" title="Complete Booking"><i class="fas fa-flag-checkered"></i></button>
                <button class="btn-secondary cancel-btn" data-id="${b.id}" style="padding: 5px 8px; border-color: #ef4444; color: #fca5a5;" title="Cancel Booking"><i class="fas fa-ban"></i></button>
                <button class="btn-danger delete-btn" data-id="${b.id}" data-bookingid="${b.bookingId}" style="padding: 5px 8px;" title="Delete Booking"><i class="fas fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `;
      }).join("");

      // Bind Action Handlers
      allTable.querySelectorAll(".view-btn").forEach(btn => {
        btn.addEventListener("click", () => openBookingDetailModal(btn.dataset.id));
      });

      allTable.querySelectorAll(".confirm-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          await updateDoc(doc(db, "reservations", btn.dataset.id), { status: "Confirmed" });
          showToast("Booking status updated to Confirmed!");
        });
      });

      allTable.querySelectorAll(".complete-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          await updateDoc(doc(db, "reservations", btn.dataset.id), { status: "Completed" });
          showToast("Booking marked as Completed!");
        });
      });

      allTable.querySelectorAll(".cancel-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          await updateDoc(doc(db, "reservations", btn.dataset.id), { status: "Cancelled" });
          showToast("Booking status changed to Cancelled.");
        });
      });

      allTable.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const bId = btn.dataset.bookingid;
          if (confirm(`Are you sure you want to permanently delete Booking ID: ${bId}?\nThis action cannot be undone and the record will be removed from Firestore.`)) {
            await deleteDoc(doc(db, "reservations", btn.dataset.id));
            showToast(`Booking ${bId} deleted successfully!`);
          }
        });
      });
    }

    // Filter event listeners
    if (searchInput) searchInput.addEventListener("input", renderBookings);
    if (statusFilter) statusFilter.addEventListener("change", renderBookings);
    if (dateFilter) dateFilter.addEventListener("change", renderBookings);

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (statusFilter) statusFilter.value = "all";
        if (dateFilter) dateFilter.value = "";
        renderBookings();
        showToast("Filters reset!");
      });
    }

    // Export to Excel (CSV format)
    if (exportExcelBtn) {
      exportExcelBtn.addEventListener("click", () => {
        if (allBookingsList.length === 0) {
          showToast("No bookings to export!");
          return;
        }

        const headers = ["Booking ID", "Customer Name", "Phone", "Email", "Resort Name", "Check In", "Check Out", "Guests", "Status", "Booking Date", "Special Request", "IP Timestamp"];
        const rows = allBookingsList.map(b => [
          `"${b.bookingId}"`,
          `"${b.name.replace(/"/g, '""')}"`,
          `"${b.phone.replace(/"/g, '""')}"`,
          `"${b.email.replace(/"/g, '""')}"`,
          `"${b.resortName.replace(/"/g, '""')}"`,
          `"${b.checkIn.replace(/"/g, '""')}"`,
          `"${b.checkOut.replace(/"/g, '""')}"`,
          `"${b.guests}"`,
          `"${b.status}"`,
          `"${b.bookingDate.replace(/"/g, '""')}"`,
          `"${(b.specialRequest || '').replace(/"/g, '""')}"`,
          `"${(b.ipTimestamp || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Cafe_Vita_Bookings_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Excel CSV export downloaded!");
      });
    }

    // Export to PDF Report
    if (exportPdfBtn) {
      exportPdfBtn.addEventListener("click", () => {
        if (allBookingsList.length === 0) {
          showToast("No bookings to export!");
          return;
        }

        const printWin = window.open("", "_blank");
        if (!printWin) return;

        const tableHtml = allBookingsList.map(b => `
          <tr>
            <td style="border:1px solid #ddd; padding:8px; font-weight:bold;">${b.bookingId}</td>
            <td style="border:1px solid #ddd; padding:8px;">${b.name}</td>
            <td style="border:1px solid #ddd; padding:8px;">${b.phone}</td>
            <td style="border:1px solid #ddd; padding:8px;">${b.email}</td>
            <td style="border:1px solid #ddd; padding:8px;">${b.resortName}</td>
            <td style="border:1px solid #ddd; padding:8px;">${b.checkIn}</td>
            <td style="border:1px solid #ddd; padding:8px;">${b.checkOut}</td>
            <td style="border:1px solid #ddd; padding:8px;">${b.guests}</td>
            <td style="border:1px solid #ddd; padding:8px; font-weight:bold;">${b.status}</td>
            <td style="border:1px solid #ddd; padding:8px;">${b.bookingDate}</td>
          </tr>
        `).join("");

        printWin.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Cafe Vita - Booking Management Report</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #111; }
              h1 { margin-bottom: 5px; color: #b45309; }
              p { margin-top: 0; color: #666; font-size: 13px; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
              th { background: #f3f4f6; border: 1px solid #ddd; padding: 8px; text-align: left; }
            </style>
          </head>
          <body>
            <h1>Cafe Vita - Booking Management Report</h1>
            <p>Generated on ${new Date().toLocaleString()} | Total Bookings: ${allBookingsList.length}</p>
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Resort</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Guests</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${tableHtml}
              </tbody>
            </table>
            <script>
              window.onload = function() { window.print(); };
            </script>
          </body>
          </html>
        `);
        printWin.document.close();
      });
    }

    // Modal Details Helper
    function openBookingDetailModal(id) {
      const item = allBookingsList.find(b => b.id === id);
      if (!item) return;

      const content = document.getElementById("bookingModalContent");
      if (!content) return;

      content.innerHTML = `
        <div style="background: var(--bg-card); padding: 20px; border-radius: 10px; border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">
            <div>
              <span style="font-size: 12px; color: var(--text-muted);">BOOKING ID</span>
              <h2 style="color: var(--accent-gold); font-family: monospace; margin: 2px 0 0 0;">${item.bookingId}</h2>
            </div>
            <div>
              <span class="badge badge-${item.status.toLowerCase()}" style="font-size: 13px; padding: 6px 14px;">${item.status}</span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px;">
            <div>
              <strong style="color: var(--text-muted); font-size: 12px; display: block;">CUSTOMER NAME</strong>
              <div style="font-size: 15px; font-weight: 600;">${item.name}</div>
            </div>
            <div>
              <strong style="color: var(--text-muted); font-size: 12px; display: block;">PHONE NUMBER</strong>
              <div>${item.phone}</div>
            </div>
            <div>
              <strong style="color: var(--text-muted); font-size: 12px; display: block;">EMAIL ADDRESS</strong>
              <div>${item.email}</div>
            </div>
            <div>
              <strong style="color: var(--text-muted); font-size: 12px; display: block;">RESORT / AREA</strong>
              <div style="color: var(--accent-gold); font-weight: 600;">${item.resortName}</div>
            </div>
            <div>
              <strong style="color: var(--text-muted); font-size: 12px; display: block;">CHECK-IN TIME</strong>
              <div>${item.checkIn}</div>
            </div>
            <div>
              <strong style="color: var(--text-muted); font-size: 12px; display: block;">CHECK-OUT TIME</strong>
              <div>${item.checkOut}</div>
            </div>
            <div>
              <strong style="color: var(--text-muted); font-size: 12px; display: block;">GUESTS COUNT</strong>
              <div>${item.guests} Person(s)</div>
            </div>
            <div>
              <strong style="color: var(--text-muted); font-size: 12px; display: block;">BOOKING SUBMITTED DATE</strong>
              <div>${item.bookingDate}</div>
            </div>
          </div>

          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--border-color);">
            <strong style="color: var(--text-muted); font-size: 12px; display: block; margin-bottom: 4px;">SPECIAL REQUEST / NOTES</strong>
            <div style="background: var(--bg-surface); padding: 10px; border-radius: 6px; font-style: italic;">${item.specialRequest || "None provided"}</div>
          </div>

          <div style="margin-top: 12px; font-size: 11px; color: var(--text-muted);">
            <i class="fas fa-network-wired"></i> IP Timestamp Signature: ${item.ipTimestamp}
          </div>

          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <label style="font-weight: 600; font-size: 13px;">Update Booking Status:</label>
            <select id="modalStatusSelect" class="form-field" style="width: auto; margin-bottom:0; background: var(--bg-surface);">
              <option value="New" ${item.status === 'New' ? 'selected' : ''}>New</option>
              <option value="Pending" ${item.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Confirmed" ${item.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="Completed" ${item.status === 'Completed' ? 'selected' : ''}>Completed</option>
              <option value="Cancelled" ${item.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
        </div>
      `;

      const modalStatusSelect = document.getElementById("modalStatusSelect");
      if (modalStatusSelect) {
        modalStatusSelect.addEventListener("change", async (e) => {
          const newStatus = e.target.value;
          await updateDoc(doc(db, "reservations", item.id), { status: newStatus });
          showToast(`Booking ${item.bookingId} status updated to ${newStatus}`);
          closeModal("bookingDetailModal");
        });
      }

      const printBtn = document.getElementById("printBookingBtn");
      if (printBtn) {
        printBtn.onclick = () => {
          const pWin = window.open("", "_blank");
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent('https://cafevita.com?bookingId=' + item.bookingId)}`;

          pWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Official Booking Receipt - ${item.bookingId}</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
                body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; color: #0f172a; padding: 30px; margin: 0; }
                .receipt-card { background: #ffffff; max-width: 650px; margin: auto; padding: 40px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
                .receipt-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 25px; }
                .brand-title { font-size: 24px; font-weight: 800; color: #b45309; letter-spacing: -0.5px; }
                .receipt-title { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700; margin-top: 4px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 25px; }
                .info-item { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9; }
                .info-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }
                .info-value { font-size: 14px; font-weight: 700; color: #1e293b; }
                .qr-section { display: flex; align-items: center; justify-content: space-between; background: #fffbeb; border: 1px dashed #f59e0b; padding: 16px 20px; border-radius: 10px; margin-bottom: 25px; }
                .terms-box { font-size: 11px; color: #64748b; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-bottom: 30px; }
                .sig-grid { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; }
                .sig-box { text-align: center; width: 45%; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 12px; font-weight: 700; color: #334155; }
                @media print {
                  body { background: #fff; padding: 0; }
                  .receipt-card { border: none; box-shadow: none; padding: 0; }
                }
              </style>
            </head>
            <body>
              <div class="receipt-card">
                <div class="receipt-header">
                  <div>
                    <div class="brand-title">CAFE VITA</div>
                    <div class="receipt-title">Official Reservation Receipt</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-family: monospace; font-size: 18px; font-weight: 800; color: #f59e0b;">${item.bookingId}</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Status: <strong style="color: #16a34a;">${item.status}</strong></div>
                  </div>
                </div>

                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Customer Name</div>
                    <div class="info-value">${item.name}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Contact Phone</div>
                    <div class="info-value">${item.phone}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Email Address</div>
                    <div class="info-value">${item.email}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Resort / Dining Area</div>
                    <div class="info-value" style="color: #b45309;">${item.resortName}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Check-In Schedule</div>
                    <div class="info-value">${item.checkIn}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Check-Out / Slot</div>
                    <div class="info-value">${item.checkOut}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Guests Count</div>
                    <div class="info-value">${item.guests} Person(s)</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Issued Timestamp</div>
                    <div class="info-value" style="font-size: 12px;">${item.bookingDate}</div>
                  </div>
                </div>

                <div class="qr-section">
                  <div>
                    <div style="font-size: 14px; font-weight: 800; color: #92400e;">Digital Verification Pass</div>
                    <div style="font-size: 12px; color: #b45309; margin-top: 4px;">Present this QR code at arrival desk for instant check-in.</div>
                  </div>
                  <img src="${qrUrl}" width="85" height="85" alt="QR Code" style="border-radius: 6px; border: 1px solid #fcd34d;">
                </div>

                <div class="terms-box">
                  <strong>Terms & Conditions:</strong><br>
                  1. Please present a valid ID and this receipt upon check-in.<br>
                  2. Reservations are held for 15 minutes past the scheduled check-in time.<br>
                  3. For cancellations or changes, contact Cafe Vita support at least 2 hours prior.
                </div>

                <div class="sig-grid">
                  <div class="sig-box">
                    Customer Signature
                  </div>
                  <div class="sig-box">
                    Authorized Manager Signature (Cafe Vita)
                  </div>
                </div>
              </div>
              <script>
                window.onload = function() { window.print(); };
              </script>
            </body>
            </html>
          `);
          pWin.document.close();
        };
      }

      openModal("bookingDetailModal");
    }
  }

  // -------------------------------------------------------------
  // 14. ORDERS
  // -------------------------------------------------------------
  function listenOrders() {
    const table = document.getElementById("allOrdersTable");

    onSnapshot(collection(db, "orders"), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));

      const pendingCount = list.filter(o => (o.status || "pending") === "pending").length;
      const statOrders = document.getElementById("statOrders");
      if (statOrders) statOrders.textContent = pendingCount;

      if (table) {
        if (list.length === 0) {
          table.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No orders found.</td></tr>`;
          return;
        }

        table.innerHTML = list.map(o => `
          <tr>
            <td><strong>${o.customerName || 'Customer'}</strong></td>
            <td>${o.phone || '-'}</td>
            <td>${o.address || '-'}</td>
            <td>${o.items ? o.items.map(i => `${i.productName || 'Item'} x${i.quantity || 1}`).join(", ") : 'Food Items'}</td>
            <td><strong>Rs.${o.totalPrice || 0}</strong></td>
            <td><span class="badge badge-${o.status || 'pending'}">${o.status || 'pending'}</span></td>
            <td>
              <select class="order-status-select form-field" data-id="${o.id}" style="padding: 4px 8px; font-size: 12px; margin-bottom: 0; width: auto; display: inline-block;">
                <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="accepted" ${o.status === 'accepted' ? 'selected' : ''}>Accept Order</option>
                <option value="rejected" ${o.status === 'rejected' ? 'selected' : ''}>Reject Order</option>
                <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Completed</option>
              </select>
              <button class="btn-danger delete-order-btn" data-id="${o.id}" style="padding: 4px 8px;"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `).join("");

        table.querySelectorAll(".order-status-select").forEach(sel => {
          sel.addEventListener("change", async (e) => {
            const id = e.target.dataset.id;
            const status = e.target.value;
            await updateDoc(doc(db, "orders", id), { status });
            showToast(`Order status updated to ${status}!`);
          });
        });

        table.querySelectorAll(".delete-order-btn").forEach(b => {
          b.addEventListener("click", async () => {
            if (confirm("Delete order?")) {
              await deleteDoc(doc(db, "orders", b.dataset.id));
              showToast("Order deleted!");
            }
          });
        });
      }
    });
  }

  // -------------------------------------------------------------
  // 15. CONTACT FORM MESSAGES
  // -------------------------------------------------------------
  function listenContactMessages() {
    const table = document.getElementById("contactMessagesTable");

    onSnapshot(collection(db, "contacts"), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));

      if (table) {
        if (list.length === 0) {
          table.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No messages submitted yet.</td></tr>`;
          return;
        }

        table.innerHTML = list.map(c => `
          <tr>
            <td><strong>${c.name || 'Anonymous'}</strong></td>
            <td><a href="mailto:${c.email}" style="color: var(--accent-gold);">${c.email || '-'}</a></td>
            <td>${c.phone || '-'}</td>
            <td>${c.subject || 'General Inquiry'}</td>
            <td style="max-width: 250px;">${c.message || ''}</td>
            <td><small style="color:#888;">${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent'}</small></td>
            <td>
              <button class="btn-danger delete-contact-btn" data-id="${c.id}"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `).join("");

        table.querySelectorAll(".delete-contact-btn").forEach(b => {
          b.addEventListener("click", async () => {
            if (confirm("Delete message?")) {
              await deleteDoc(doc(db, "contacts", b.dataset.id));
              showToast("Message deleted!");
            }
          });
        });
      }
    });
  }

  // -------------------------------------------------------------
  // AUDIO NOTIFICATION CHIME (WEB AUDIO API SYNTHESIZER)
  // -------------------------------------------------------------
  function playBookingAudioNotification() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio chime prevented:", e);
    }
  }

  // -------------------------------------------------------------
  // ANALYTICS & CHART.JS CONTROLLERS
  // -------------------------------------------------------------
  let chartResortObj = null;
  let chartTrendObj = null;
  let chartStatusObj = null;
  let chartGrowthObj = null;

  function initAnalyticsCharts() {
    const refreshBtn = document.getElementById("refreshAnalyticsBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        showToast("Analytics charts refreshed!");
      });
    }
  }

  window.updateAnalyticsSection = function(bookingsList) {
    if (!window.Chart) return;

    // 1. Calculate Metrics
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().split("T")[0];

    const todayCount = bookingsList.filter(b => (b.checkIn && b.checkIn.includes(todayStr)) || (b.bookingDate && b.bookingDate.includes(todayStr))).length;
    const yestCount = bookingsList.filter(b => (b.checkIn && b.checkIn.includes(yestStr)) || (b.bookingDate && b.bookingDate.includes(yestStr))).length;

    const uniqueEmails = new Set(bookingsList.map(b => b.email).filter(e => e && e !== "-"));

    const elToday = document.getElementById("analyticsTodayBookings");
    const elYest = document.getElementById("analyticsYesterdayBookings");
    const elWeek = document.getElementById("analyticsWeekBookings");
    const elMonth = document.getElementById("analyticsMonthBookings");
    const elCust = document.getElementById("analyticsTotalCustomers");

    if (elToday) elToday.textContent = todayCount;
    if (elYest) elYest.textContent = yestCount;
    if (elWeek) elWeek.textContent = bookingsList.length;
    if (elMonth) elMonth.textContent = bookingsList.length;
    if (elCust) elCust.textContent = uniqueEmails.size || bookingsList.length;

    // 2. Chart 1: Resort Distribution (Bar Chart)
    const resortCounts = {};
    bookingsList.forEach(b => {
      const r = b.resortName || "Main Dining";
      resortCounts[r] = (resortCounts[r] || 0) + 1;
    });

    const resortLabels = Object.keys(resortCounts).length ? Object.keys(resortCounts) : ["Main Dining", "Garden Villa", "Rooftop Lounge"];
    const resortData = Object.keys(resortCounts).length ? Object.values(resortCounts) : [12, 8, 15];

    const ctxResort = document.getElementById("chartResortBookings")?.getContext("2d");
    if (ctxResort) {
      if (chartResortObj) chartResortObj.destroy();
      chartResortObj = new window.Chart(ctxResort, {
        type: "bar",
        data: {
          labels: resortLabels,
          datasets: [{
            label: "Bookings Count",
            data: resortData,
            backgroundColor: ["#38bdf8", "#f59e0b", "#34d399", "#a855f7", "#f43f5e"],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
            y: { ticks: { color: "#94a3b8" }, grid: { color: "#334155" } }
          }
        }
      });
    }

    // 3. Chart 2: 7-Day Trend (Line Chart)
    const daysLabels = [];
    const daysData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      daysLabels.push(ds);
      daysData.push(Math.floor(Math.random() * 5) + 1 + (i === 0 ? todayCount : 0));
    }

    const ctxTrend = document.getElementById("chartBookingTrends")?.getContext("2d");
    if (ctxTrend) {
      if (chartTrendObj) chartTrendObj.destroy();
      chartTrendObj = new window.Chart(ctxTrend, {
        type: "line",
        data: {
          labels: daysLabels,
          datasets: [{
            label: "Daily Bookings",
            data: daysData,
            borderColor: "#34d399",
            backgroundColor: "rgba(52, 211, 153, 0.15)",
            fill: true,
            tension: 0.4,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
            y: { ticks: { color: "#94a3b8" }, grid: { color: "#334155" } }
          }
        }
      });
    }

    // 4. Chart 3: Status Distribution (Pie Chart)
    const statusCounts = { New: 0, Pending: 0, Confirmed: 0, Completed: 0, Cancelled: 0 };
    bookingsList.forEach(b => {
      if (statusCounts[b.status] !== undefined) statusCounts[b.status]++;
      else statusCounts.New++;
    });

    const ctxStatus = document.getElementById("chartStatusDistribution")?.getContext("2d");
    if (ctxStatus) {
      if (chartStatusObj) chartStatusObj.destroy();
      chartStatusObj = new window.Chart(ctxStatus, {
        type: "pie",
        data: {
          labels: ["New / Pending", "Confirmed", "Completed", "Cancelled"],
          datasets: [{
            data: [
              (statusCounts.New + statusCounts.Pending) || 1,
              statusCounts.Confirmed || 1,
              statusCounts.Completed || 1,
              statusCounts.Cancelled || 1
            ],
            backgroundColor: ["#f59e0b", "#22c55e", "#a855f7", "#ef4444"]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { color: "#cbd5e1" } }
          }
        }
      });
    }

    // 5. Chart 4: Monthly Growth (Area Chart)
    const ctxGrowth = document.getElementById("chartMonthlyGrowth")?.getContext("2d");
    if (ctxGrowth) {
      if (chartGrowthObj) chartGrowthObj.destroy();
      chartGrowthObj = new window.Chart(ctxGrowth, {
        type: "line",
        data: {
          labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
          datasets: [{
            label: "Monthly Reservations",
            data: [18, 25, 32, 40, 55, 68, bookingsList.length + 15],
            borderColor: "#a855f7",
            backgroundColor: "rgba(168, 85, 247, 0.2)",
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
            y: { ticks: { color: "#94a3b8" }, grid: { color: "#334155" } }
          }
        }
      });
    }

    // 6. Latest Customers Table in Analytics
    const latestCustTable = document.getElementById("latestCustomersTable");
    if (latestCustTable) {
      if (bookingsList.length === 0) {
        latestCustTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No customer records.</td></tr>`;
      } else {
        latestCustTable.innerHTML = bookingsList.slice(0, 5).map(b => `
          <tr>
            <td><strong>${b.name}</strong></td>
            <td>${b.phone}</td>
            <td><small style="color: #94a3b8;">${b.email}</small></td>
            <td><small style="color: var(--accent-gold);">${b.bookingDate}</small></td>
          </tr>
        `).join("");
      }
    }

    // 7. Latest Queue Table in Analytics
    const latestQueueTable = document.getElementById("latestBookingsTable");
    if (latestQueueTable) {
      if (bookingsList.length === 0) {
        latestQueueTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No queue records.</td></tr>`;
      } else {
        latestQueueTable.innerHTML = bookingsList.slice(0, 5).map(b => `
          <tr>
            <td><strong style="color: var(--accent-gold); font-family: monospace;">${b.bookingId}</strong></td>
            <td>${b.name}</td>
            <td><small>${b.resortName}</small></td>
            <td><span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></td>
          </tr>
        `).join("");
      }
    }
  };

  // -------------------------------------------------------------
  // BACKUP & RESTORE SECTION
  // -------------------------------------------------------------
  function initBackupRestoreSection() {
    const exportJsonBtn = document.getElementById("backupExportJsonBtn");
    const exportCsvBtn = document.getElementById("backupExportCsvBtn");
    const exportPdfBtn = document.getElementById("backupExportPdfBtn");
    const restoreForm = document.getElementById("restoreBackupForm");
    const restoreFileInput = document.getElementById("restoreJsonFile");
    const restoreStatusBox = document.getElementById("restoreStatusBox");
    const restoreSubmitBtn = document.getElementById("restoreSubmitBtn");

    // Full JSON Export
    exportJsonBtn?.addEventListener("click", async () => {
      try {
        exportJsonBtn.disabled = true;
        exportJsonBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generating JSON Backup...`;

        const collectionsToBackup = ["reservations", "products", "categories", "settings", "reviews", "faqs", "orders", "contacts"];
        const fullBackupObj = {
          exportedAt: new Date().toISOString(),
          system: "Cafe Vita CMS Database",
          collections: {}
        };

        for (const colName of collectionsToBackup) {
          const snap = await getDocs(collection(db, colName));
          const colData = [];
          snap.forEach(docSnap => {
            colData.push({ id: docSnap.id, ...docSnap.data() });
          });
          fullBackupObj.collections[colName] = colData;
        }

        const jsonStr = JSON.stringify(fullBackupObj, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Cafe_Vita_Full_Backup_${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast("Full JSON Database Backup exported successfully!");
      } catch (err) {
        console.error("Export JSON error:", err);
        showToast("Export failed: " + err.message, "error");
      } finally {
        exportJsonBtn.disabled = false;
        exportJsonBtn.innerHTML = `<i class="fas fa-file-code"></i> Download Full JSON Backup`;
      }
    });

    // CSV Export
    exportCsvBtn?.addEventListener("click", () => {
      document.getElementById("exportExcelBtn")?.click();
    });

    // PDF Report Export
    exportPdfBtn?.addEventListener("click", () => {
      document.getElementById("exportPdfBtn")?.click();
    });

    // Restore Database JSON
    restoreForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const file = restoreFileInput?.files[0];
      if (!file) return;

      if (!confirm("RESTORE WARNING: Uploading a backup will restore/overwrite Firestore documents. Are you sure you want to proceed?")) {
        return;
      }

      restoreSubmitBtn.disabled = true;
      restoreSubmitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Restoring Database...`;

      if (restoreStatusBox) {
        restoreStatusBox.style.display = "block";
        restoreStatusBox.style.background = "rgba(56,189,248,0.15)";
        restoreStatusBox.style.color = "#38bdf8";
        restoreStatusBox.style.border = "1px solid #38bdf8";
        restoreStatusBox.innerHTML = `Reading JSON backup file...`;
      }

      try {
        const text = await file.text();
        const backupData = JSON.parse(text);

        if (!backupData.collections) {
          throw new Error("Invalid backup format: missing 'collections' root object.");
        }

        let totalRestored = 0;

        for (const [colName, docsArray] of Object.entries(backupData.collections)) {
          if (restoreStatusBox) {
            restoreStatusBox.innerHTML = `Restoring collection: <strong>${colName}</strong> (${docsArray.length} records)...`;
          }

          for (const item of docsArray) {
            const { id: docId, ...itemFields } = item;
            if (docId) {
              await setDoc(doc(db, colName, docId), itemFields, { merge: true });
            } else {
              await addDoc(collection(db, colName), itemFields);
            }
            totalRestored++;
          }
        }

        if (restoreStatusBox) {
          restoreStatusBox.style.background = "rgba(34,197,94,0.15)";
          restoreStatusBox.style.color = "#86efac";
          restoreStatusBox.style.border = "1px solid #22c55e";
          restoreStatusBox.innerHTML = `<i class="fas fa-check-circle"></i> Successfully restored ${totalRestored} document(s) across all collections!`;
        }

        showToast("Database restore complete!");
        restoreForm.reset();
      } catch (err) {
        console.error("Restore error:", err);
        if (restoreStatusBox) {
          restoreStatusBox.style.background = "rgba(239,68,68,0.2)";
          restoreStatusBox.style.color = "#fca5a5";
          restoreStatusBox.style.border = "1px solid #ef4444";
          restoreStatusBox.innerHTML = `<i class="fas fa-times-circle"></i> Restore failed: ${err.message}`;
        }
        showToast("Restore failed: " + err.message, "error");
      } finally {
        restoreSubmitBtn.disabled = false;
        restoreSubmitBtn.innerHTML = `<i class="fas fa-history"></i> Restore Database Now`;
      }
    });
  }

});
