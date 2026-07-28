// firebase.js - Firebase initialization and helper exports
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";

import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore Database (handling custom databaseId if set)
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Standard Operation Types for error handler
export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

// Global Firestore Error Handler Helper
export function handleFirestoreError(error, operationType, path = null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error Context: ', JSON.stringify(errInfo));
  return errInfo;
}

// Test Connection Helper
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && (error.message.includes('client is offline') || error.message.includes('Could not reach Cloud Firestore'))) {
      console.warn("Firestore client operating in offline/cached mode.");
    }
  }
}

// Export Auth & Firestore Helpers
export {
  signInWithEmailAndPassword,
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
  serverTimestamp,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};

/**
 * Upload an image file to Firebase Storage with optional fallback to Base64
 * @param {File} file - The file object selected by user
 * @param {string} folder - Target folder in storage e.g. "products"
 * @returns {Promise<string>} Download URL of uploaded file
 */
export async function uploadImageToStorage(file, folder = "uploads") {
  if (!file) return "";
  try {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const storageRef = ref(storage, `${folder}/${timestamp}_${safeName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (err) {
    console.warn("Firebase Storage upload failed or non-CORS fallback. Using Base64 data URL for offline/preview robustness:", err);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Seed initial website default values into Firestore safely if empty
 */
export async function initializeDefaultData() {
  // 1. Settings
  try {
    const settingsRef = doc(db, "settings", "website");
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        websiteName: "Cafe Vita",
        logo: "./vita.png.png",
        favicon: "./ChatGPT Image Jul 23, 2026, 08_12_32 PM.png",
        primaryColor: "#f59e0b",
        secondaryColor: "#d97706",
        font: "Plus Jakarta Sans",
        borderRadius: "12px",
        buttonStyle: "rounded-pill",
        footerText: "Enjoy delicious food, premium coffee and unforgettable moments with your family and friends. We serve quality, freshness and happiness every day.",
        copyright: "© 2026 Cafe Vita. All Rights Reserved.",
        email: "info@cafevita.com",
        phone: "+92 300 1234567",
        whatsapp: "+92 300 1234567",
        address: "Karachi, Pakistan",
        mapsIframe: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d57930.951667519395!2d67.06151342167968!3d24.840461600000012!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3eb33b005cc409cf%3A0x27c90b0405096a50!2sCafe%20Vita!5e0!3m2!1sen!2s!4v1784810632062!5m2!1sen!2s",
        openingHoursWeekdays: "09:00 AM - 11:00 PM",
        openingHoursWeekends: "10:00 AM - 12:00 AM",
        socialLinks: {
          facebook: "https://facebook.com/",
          instagram: "https://instagram.com/",
          tiktok: "https://tiktok.com/",
          youtube: "https://youtube.com/",
          twitter: "https://x.com/"
        }
      });
    }
  } catch (err) {
    console.warn("Settings seed check bypassed or offline:", err.message || err);
  }

  // 2. Hero Section
  try {
    const heroRef = doc(db, "hero", "home");
    const heroSnap = await getDoc(heroRef);
    if (!heroSnap.exists()) {
      await setDoc(heroRef, {
        bgImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
        heading: "Welcome To Cafe Vita",
        subHeading: "Experience delicious food, premium coffee and unforgettable moments with your family & friends.",
        buttonText: "Explore Menu",
        buttonLink: "./menu.html"
      });
    }
  } catch (err) {
    console.warn("Hero seed check bypassed or offline:", err.message || err);
  }

  // 3. About Section
  try {
    const aboutRef = doc(db, "about", "main");
    const aboutSnap = await getDoc(aboutRef);
    if (!aboutSnap.exists()) {
      await setDoc(aboutRef, {
        heading: "Our Story",
        description: "Cafe Vita was established with a passion for serving delicious food, premium coffee and unforgettable dining experiences. Every meal is prepared using fresh ingredients by our experienced chefs. Our goal is to provide quality food, excellent customer service, and a relaxing atmosphere for families and friends.",
        image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80",
        ctaText: "Explore Menu",
        ctaLink: "./menu.html"
      });
    }
  } catch (err) {
    console.warn("About seed check bypassed or offline:", err.message || err);
  }

  // 4. Categories
  try {
    const categoriesSnap = await getDocs(collection(db, "categories"));
    if (categoriesSnap.empty) {
      const defaultCategories = [
        { name: "All", slug: "all", icon: "🍽️" },
        { name: "Pizza", slug: "pizza", icon: "🍕" },
        { name: "Burger", slug: "burger", icon: "🍔" },
        { name: "Sandwich", slug: "sandwich", icon: "🥪" },
        { name: "Coffee", slug: "coffee", icon: "☕" },
        { name: "Dessert", slug: "dessert", icon: "🍰" },
        { name: "BBQ", slug: "bbq", icon: "🔥" }
      ];
      for (const cat of defaultCategories) {
        await addDoc(collection(db, "categories"), cat);
      }
    }
  } catch (err) {
    console.warn("Categories seed check bypassed or offline:", err.message || err);
  }

  // 5. Default Products
  try {
    const productsSnap = await getDocs(collection(db, "products"));
    if (productsSnap.empty) {
      const defaultProducts = [
        { name: "Cheese Pizza", category: "pizza", description: "Fresh mozzarella cheese with special sauce.", price: 1250, oldPrice: 1400, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591", available: true, popular: true, featured: true },
        { name: "Chicken Tikka Pizza", category: "pizza", description: "Chicken tikka with spicy toppings.", price: 1450, oldPrice: 1600, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38", available: true, popular: true, featured: false },
        { name: "Fajita Pizza", category: "pizza", description: "Chicken fajita with fresh vegetables.", price: 1500, oldPrice: 0, image: "https://images.unsplash.com/photo-1593560708920-61dd98c9f2f4", available: true, popular: false, featured: true },
        { name: "Zinger Burger", category: "burger", description: "Crispy chicken burger with cheese.", price: 850, oldPrice: 950, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd", available: true, popular: true, featured: true },
        { name: "Double Cheese Burger", category: "burger", description: "Double patty burger with extra cheese.", price: 1100, oldPrice: 1250, image: "https://images.unsplash.com/photo-1550547660-d9450f859349", available: true, popular: false, featured: false },
        { name: "Club Sandwich", category: "sandwich", description: "Chicken sandwich with fresh salad.", price: 750, oldPrice: 850, image: "https://images.unsplash.com/photo-1553909489-cd47e0907980", available: true, popular: true, featured: false },
        { name: "Cappuccino", category: "coffee", description: "Hot coffee with creamy foam.", price: 450, oldPrice: 0, image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085", available: true, popular: true, featured: true },
        { name: "Cold Coffee", category: "coffee", description: "Chilled coffee with chocolate.", price: 550, oldPrice: 600, image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735", available: true, popular: false, featured: false },
        { name: "Chocolate Cake", category: "dessert", description: "Rich chocolate cake with cream.", price: 650, oldPrice: 750, image: "https://images.unsplash.com/photo-1551024601-bec78aea704b", available: true, popular: true, featured: true },
        { name: "BBQ Platter", category: "bbq", description: "Chicken tikka, kabab and boti.", price: 2500, oldPrice: 2800, image: "https://images.unsplash.com/photo-1544025162-d76694265947", available: true, popular: true, featured: true }
      ];
      for (const prod of defaultProducts) {
        await addDoc(collection(db, "products"), prod);
      }
    }
  } catch (err) {
    console.warn("Products seed check bypassed or offline:", err.message || err);
  }

  // 6. Default Reviews
  try {
    const reviewsSnap = await getDocs(collection(db, "reviews"));
    if (reviewsSnap.empty) {
      const defaultReviews = [
        { name: "Ali Khan", review: "Amazing coffee and delicious food. Highly recommended!", rating: 5, image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" },
        { name: "Sara Ahmed", review: "The best restaurant experience I've had in Karachi.", rating: 5, image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80" },
        { name: "Ahmed Raza", review: "Excellent service and very friendly staff.", rating: 5, image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80" },
        { name: "Hina Malik", review: "Fresh food and beautiful environment.", rating: 5, image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80" }
      ];
      for (const rev of defaultReviews) {
        await addDoc(collection(db, "reviews"), rev);
      }
    }
  } catch (err) {
    console.warn("Reviews seed check bypassed or offline:", err.message || err);
  }

  // 7. Default Slides
  try {
    const slidesSnap = await getDocs(collection(db, "slides"));
    if (slidesSnap.empty) {
      const defaultSlides = [
        {
          title: "Welcome To Cafe Vita",
          subtitle: "Experience delicious food, premium coffee and unforgettable moments",
          image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
          buttonText: "Explore Menu",
          buttonLink: "./menu.html",
          order: 1
        },
        {
          title: "Freshly Brewed Coffee",
          subtitle: "Handcrafted by expert baristas using roasted beans",
          image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1600&q=80",
          buttonText: "Order Coffee",
          buttonLink: "./menu.html",
          order: 2
        }
      ];
      for (const slide of defaultSlides) {
        await addDoc(collection(db, "slides"), slide);
      }
    }
  } catch (err) {
    console.warn("Slides seed check bypassed or offline:", err.message || err);
  }

  // 8. Default Services
  try {
    const servicesSnap = await getDocs(collection(db, "services"));
    if (servicesSnap.empty) {
      const defaultServices = [
        { title: "Fresh Food", description: "Prepared daily using fresh and healthy ingredients.", icon: "🍔", image: "", order: 1 },
        { title: "Premium Coffee", description: "Freshly brewed coffee made by professional baristas.", icon: "☕", image: "", order: 2 },
        { title: "Expert Chefs", description: "Experienced chefs delivering exceptional taste.", icon: "👨‍🍳", image: "", order: 3 },
        { title: "Fast Service", description: "Quick service with quality you can trust.", icon: "🚚", image: "", order: 4 }
      ];
      for (const srv of defaultServices) {
        await addDoc(collection(db, "services"), srv);
      }
    }
  } catch (err) {
    console.warn("Services seed check bypassed or offline:", err.message || err);
  }

  // 9. Default FAQs
  try {
    const faqsSnap = await getDocs(collection(db, "faqs"));
    if (faqsSnap.empty) {
      const defaultFaqs = [
        { question: "What are your opening hours?", answer: "We are open Monday to Friday from 09:00 AM to 11:00 PM and Weekends from 10:00 AM to 12:00 AM.", order: 1 },
        { question: "Do you offer home delivery?", answer: "Yes! You can order directly via our menu page or WhatsApp.", order: 2 },
        { question: "How can I reserve a table?", answer: "You can reserve a table online through our Reservation section or call us directly.", order: 3 }
      ];
      for (const faq of defaultFaqs) {
        await addDoc(collection(db, "faqs"), faq);
      }
    }
  } catch (err) {
    console.warn("FAQs seed check bypassed or offline:", err.message || err);
  }
}

