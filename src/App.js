<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Jennys Recycling</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- React Libraries -->
    <script src="https://unpkg.com/react@17/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
    <!-- Babel for JSX transpilation -->
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <!-- QR Code Library -->
    <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
</head>
<body class="bg-gray-900">
    <div id="root"></div>

    <script type="text/babel">
        // --- Firebase SDK ---
        import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
        import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
        import { getFirestore, doc, collection, addDoc, onSnapshot, serverTimestamp, query, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
        import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

        // --- Helper function to resize and compress image before upload ---
        const resizeImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = error => reject(error);
            };
            reader.onerror = error => reject(error);
        });

        // --- SVG Icons ---
        const HeaderIcon = () => (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-cyan-200 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        );
        const TrashIcon = () => (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
            </svg>
        );
        const ClearIcon = () => (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        );
        const BackArrowIcon = () => (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
        );
        const OrdersIcon = () => (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
        );

        // --- Reusable Components ---
        const AppHeader = ({ title, showBackButton, onBack, children }) => (
            <header className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 sm:p-6 shadow-2xl sticky top-0 z-40">
                <div className="container mx-auto flex items-center justify-between relative h-10">
                    {showBackButton && (
                        <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 p-2 rounded-full">
                            <BackArrowIcon />
                        </button>
                    )}
                    <h1 className="text-2xl sm:text-3xl font-bold text-white text-center w-full">{title}</h1>
                </div>
                {children && <div className="container mx-auto mt-4">{children}</div>}
            </header>
        );

        const Modal = ({ isOpen, onClose, title, children }) => {
            if (!isOpen) return null;
            return (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-start p-4 z-50 overflow-y-auto">
                    <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 relative my-8 border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-bold text-white">{title}</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-white text-4xl font-light">&times;</button>
                        </div>
                        {children}
                    </div>
                </div>
            );
        };

        // --- Main App Component ---
        const App = () => {
            const { useState, useEffect, useRef } = React;
            
            // --- App Configuration ---
            const OWNER_PASSWORD = 'London23';
            
            const [isFirebaseReady, setIsFirebaseReady] = useState(false);
            const [products, setProducts] = useState([]);
            const [orders, setOrders] = useState([]);
            const [currentView, setCurrentView] = useState('main');
            const [isModalOpen, setIsModalOpen] = useState(false);
            const [isQrModalOpen, setIsQrModalOpen] = useState(false);
            const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
            const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
            const [isCategorySelectModalOpen, setIsCategorySelectModalOpen] = useState(false);
            const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState(false);
            const [loginError, setLoginError] = useState('');
            const [selectedCategory, setSelectedCategory] = useState('');
            const [selectedProductForPurchase, setSelectedProductForPurchase] = useState(null);
            const [db, setDb] = useState(null);
            const [storage, setStorage] = useState(null);
            const [userId, setUserId] = useState(null);
            const [appId, setAppId] = useState('default-app-id');
            const [uploadMessage, setUploadMessage] = useState('');
            const [isUploading, setIsUploading] = useState(false);
            const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
            
            const [productName, setProductName] = useState('');
            const [productDescription, setProductDescription] = useState('');
            const [productImagesBase64, setProductImagesBase64] = useState([]);
            const [imagePreviews, setImagePreviews] = useState([]);
            
            const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
            const [productToDeleteId, setProductToDeleteId] = useState(null);
            
            const fileInputRef = useRef(null);
            const cameraInputRef = useRef(null);

            useEffect(() => {
                const handlePopState = (event) => {
                    setCurrentView(event.state?.view || 'main');
                    setSelectedCategory(event.state?.category || '');
                };
                window.addEventListener('popstate', handlePopState);
                window.history.replaceState({ view: 'main', category: '' }, '');
                return () => window.removeEventListener('popstate', handlePopState);
            }, []);

            const handleViewChange = (newView, category = '') => {
                if (currentView !== newView || selectedCategory !== category) {
                    window.history.pushState({ view: newView, category: category }, '');
                }
                setCurrentView(newView);
                setSelectedCategory(category);
            };

            const handleBackNavigation = () => {
                window.history.back();
            };

            useEffect(() => {
                try {
                    const sessionDataString = localStorage.getItem('jennysRecyclingAuth');
                    if (sessionDataString) {
                        const sessionData = JSON.parse(sessionDataString);
                        const now = new Date().getTime();
                        const sessionAge = now - sessionData.timestamp;
                        const expirationTime = 24 * 60 * 60 * 1000;
                        if (sessionAge < expirationTime) setIsOwnerAuthenticated(true);
                        else localStorage.removeItem('jennysRecyclingAuth');
                    }
                } catch (error) {
                    console.error("Failed to parse session data", error);
                    localStorage.removeItem('jennysRecyclingAuth');
                }
            }, []);

            // --- Firebase Initialization and Authentication ---
            useEffect(() => {
                // Dina unika Firebase-nycklar är nu inklistrade här
                const firebaseConfig = {
                  apiKey: "AIzaSyDcHvNBqT1S7ZCfM8eHRZGRcayo-Qa9Mw",
                  authDomain: "jennys-app.firebaseapp.com",
                  projectId: "jennys-app",
                  storageBucket: "jennys-app.appspot.com",
                  messagingSenderId: "1011060910431",
                  appId: "1:1011060910431:web:80cf0b00b9639fd147aeea"
                };
                
                setAppId(firebaseConfig.appId);

                // Ingen mer kod behöver ändras under denna rad i detta block
                const app = initializeApp(firebaseConfig);
                const authInstance = getAuth(app);
                const firestore = getFirestore(app);
                const storageInstance = getStorage(app);
                setDb(firestore);
                setStorage(storageInstance);
                
                const unsubscribe = onAuthStateChanged(authInstance, (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        signInAnonymously(authInstance).catch(error => {
                            console.error("Anonymous sign-in failed:", error);
                        });
                    }
                    setIsFirebaseReady(true);
                });

                return () => unsubscribe();
            }, []);


            useEffect(() => {
                if (!isFirebaseReady || !userId || !db) return;
                const productCollectionRef = collection(db, `/artifacts/${appId}/public/data/products`);
                const q = query(productCollectionRef);
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const productList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    productList.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                    setProducts(productList);
                }, (error) => console.error("Error fetching products:", error));
                return () => unsubscribe();
            }, [db, userId, appId, isFirebaseReady]);

            useEffect(() => {
                if (!isFirebaseReady || !userId || !db || !isOwnerAuthenticated) {
                    setOrders([]);
                    return;
                };
                const ordersCollectionRef = collection(db, `/artifacts/${appId}/public/data/orders`);
                const q = query(ordersCollectionRef);
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    ordersList.sort((a, b) => (b.orderTimestamp?.seconds || 0) - (a.orderTimestamp?.seconds || 0));
                    setOrders(ordersList);
                }, (error) => console.error("Error fetching orders:", error));
                return () => unsubscribe();
            }, [db, userId, isOwnerAuthenticated, appId, isFirebaseReady]);
            
            useEffect(() => {
                if (isQrModalOpen && selectedProductForPurchase) {
                    const qrcodeDiv = document.getElementById("qrcode");
                    if (qrcodeDiv) {
                        const { price, name: productName } = selectedProductForPurchase;
                        const swishNumber = '0737585880';
                        const qrPrice = document.getElementById('qr-price');
                        if (qrPrice) qrPrice.textContent = price;
                        qrcodeDiv.innerHTML = "";
                        new window.QRCode(qrcodeDiv, {
                            text: `C${swishNumber};${price};Köp: ${encodeURIComponent(productName)};0`,
                            width: 200, height: 200, colorDark: "#ffffff", colorLight: "#111827",
                            correctLevel: window.QRCode.CorrectLevel.H
                        });
                    }
                }
            }, [isQrModalOpen, selectedProductForPurchase]);

            const closeUploadModal = () => {
                setIsModalOpen(false);
                setProductName('');
                setProductDescription('');
                setUploadMessage('');
                setProductImagesBase64([]);
                setImagePreviews([]);
            };

            const handleCategorySelectForUpload = (category) => {
                setSelectedCategory(category);
                setIsCategorySelectModalOpen(false);
                closeUploadModal();
                setIsModalOpen(true);
            };

            const handleLoginSubmit = (event) => {
                event.preventDefault();
                const password = event.target.password.value;
                if (password === OWNER_PASSWORD) {
                    setIsOwnerAuthenticated(true);
                    localStorage.setItem('jennysRecyclingAuth', JSON.stringify({ timestamp: new Date().getTime() }));
                    setIsLoginModalOpen(false);
                    handleViewChange('orders');
                    setLoginError('');
                } else {
                    setLoginError('Fel lösenord. Försök igen.');
                }
            };

            const handleLogout = () => {
                setIsOwnerAuthenticated(false);
                localStorage.removeItem('jennysRecyclingAuth');
                handleViewChange('main');
            };

            const handleInitiateUpload = () => {
                if (!userId) {
                    setUploadMessage("Autentisering pågår, vänta ett ögonblick och försök igen.");
                    return;
                }
                setIsCategorySelectModalOpen(true);
            };

            const handleImageSelection = async (event) => {
                const newFiles = event.target.files;
                if (!newFiles || newFiles.length === 0) return;

                let allowedFiles = Array.from(newFiles).slice(0, 3 - imagePreviews.length);
                setUploadMessage('Komprimerar bilder...');
                
                const newPreviewUrls = allowedFiles.map(file => URL.createObjectURL(file));
                setImagePreviews(prev => [...prev, ...newPreviewUrls]);

                try {
                    const resizePromises = allowedFiles.map(file => resizeImage(file));
                    const newResizedImages = await Promise.all(resizePromises);
                    setProductImagesBase64(prev => [...prev, ...newResizedImages]);
                    setUploadMessage('');
                } catch (error) {
                    console.error("Error processing images:", error);
                    setUploadMessage('Kunde inte bearbeta bilderna.');
                } finally {
                    event.target.value = null;
                }
            };

            const handleProductUpload = async (event) => {
                event.preventDefault();
                if (!db || !userId || !storage) {
                    setUploadMessage('Databasen är inte redo. Försök igen.');
                    return;
                }
                setIsUploading(true);
                
                const form = event.target;
                const productSize = form.productSize.value;
                const productPrice = form.productPrice.value;
                
                if (productImagesBase64.length === 0) {
                    setUploadMessage('Du måste ladda upp minst en bild.');
                    setIsUploading(false);
                    return;
                }

                try {
                    setUploadMessage('Laddar upp bilder...');
                    const imageUrls = await Promise.all(
                        productImagesBase64.map((base64) => {
                            const storageRef = ref(storage, `products/${userId}_${Date.now()}_${Math.random()}.jpg`);
                            return uploadString(storageRef, base64, 'data_url').then(snapshot => getDownloadURL(snapshot.ref));
                        })
                    );
                    
                    setUploadMessage('Skapar produkt...');
                    const newProduct = { 
                        name: productName, size: productSize, description: productDescription, 
                        price: parseFloat(productPrice), mainImage: imageUrls[0], images: imageUrls,
                        category: selectedCategory, timestamp: serverTimestamp(), ownerId: userId 
                    };

                    await addDoc(collection(db, `/artifacts/${appId}/public/data/products`), newProduct);
                    setUploadMessage('Produkten har lagts till!');
                    form.reset();
                    closeUploadModal();
                } catch (e) {
                    console.error("Upload error: ", e);
                    setUploadMessage(e.code === 'storage/unauthorized' ? 'Behörighetsfel. Kontrollera Storage-regler.' : 'Ett fel uppstod vid uppladdning.');
                } finally {
                    setIsUploading(false);
                }
            };
            
            const handleBuyClick = (product) => {
                setSelectedProductForPurchase(product);
                setIsAddressModalOpen(true);
            };

            const handleAddressSubmit = async (event) => {
                event.preventDefault();
                if (!db || !userId || !selectedProductForPurchase) {
                    setUploadMessage('Kunde inte skicka beställning.');
                    return;
                }
                setIsSubmittingOrder(true);
                
                const form = event.target;
                const addressDetails = { 
                    name: form.name.value, street: form.street.value, 
                    zip: form.zip.value, city: form.city.value, phone: form.phone.value 
                };
                
                const newOrder = {
                    product: {
                        id: selectedProductForPurchase.id, name: selectedProductForPurchase.name,
                        price: selectedProductForPurchase.price, size: selectedProductForPurchase.size,
                    },
                    buyer: addressDetails, status: 'pending_payment',
                    orderTimestamp: serverTimestamp(), buyerId: userId,
                };

                try {
                    await addDoc(collection(db, `/artifacts/${appId}/public/data/orders`), newOrder);
                    await deleteDoc(doc(db, `/artifacts/${appId}/public/data/products`, selectedProductForPurchase.id));
                    setIsAddressModalOpen(false);
                    form.reset();
                    
                    const { price, name: productName } = selectedProductForPurchase;
                    if (window.innerWidth <= 768) {
                        const paymentData = { version: 1, payee: { value: '0737585880' }, amount: { value: price }, message: { value: `Köp: ${productName}`, editable: false } };
                        window.open(`swish://payment?data=${encodeURIComponent(JSON.stringify(paymentData))}`, '_blank');
                    } else {
                        setIsQrModalOpen(true);
                    }
                } catch (error) {
                    console.error("Order error: ", error);
                    setUploadMessage('Beställningen kunde inte slutföras.');
                } finally { setIsSubmittingOrder(false); }
            };

            const handleOpenDeleteConfirm = (productId) => {
                setProductToDeleteId(productId);
                setIsDeleteConfirmOpen(true);
            };

            const handleCloseDeleteConfirm = () => {
                setProductToDeleteId(null);
                setIsDeleteConfirmOpen(false);
            };

            const handleDeleteProduct = async () => {
                if (!productToDeleteId || !db) return;
                try {
                    await deleteDoc(doc(db, `/artifacts/${appId}/public/data/products`, productToDeleteId));
                    setUploadMessage('Produkten har tagits bort.');
                    handleCloseDeleteConfirm();
                } catch (error) {
                    console.error("Delete error:", error);
                    setUploadMessage('Kunde inte ta bort produkten.');
                }
            };

            const categoryButtons = [
                { name: "Byxor", dataCategory: "Byxor" }, { name: "Skor", dataCategory: "Skor" },
                { name: "Klänningar", dataCategory: "Klänningar" }, { name: "T-shirts & Tröjor", dataCategory: "Tshirts & Tröjor" },
                { name: "Shorts", dataCategory: "Shorts" }, { name: "Sportkläder", dataCategory: "Sportkläder" },
                { name: "Övrigt", dataCategory: "Övrigt" },
            ];

            const filteredProducts = selectedCategory ? products.filter(p => p.category === selectedCategory) : [];
            
            if (!isFirebaseReady) {
                return (
                    <div className="bg-gray-900 text-gray-200 flex items-center justify-center min-h-screen font-sans">
                        <div className="text-center">
                            <p className="text-xl animate-pulse">Ansluter till Jennys Recycling...</p>
                        </div>
                    </div>
                );
            }

            const renderCurrentView = () => {
                switch (currentView) {
                    case 'category':
                        return (
                          <div className="bg-gray-900 text-gray-200 flex flex-col min-h-screen font-sans">
                            <AppHeader title={selectedCategory} showBackButton={true} onBack={handleBackNavigation} />
                            <main className="container mx-auto p-4 sm:p-6 flex-grow">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {filteredProducts.length > 0 ? (
                                      filteredProducts.map(product => (
                                        <div key={product.id} className="bg-gray-800 rounded-lg overflow-hidden flex flex-col relative border border-gray-700 hover:border-cyan-500 transition-all duration-300">
                                          {isOwnerAuthenticated && (
                                              <button 
                                                  onClick={() => handleOpenDeleteConfirm(product.id)} 
                                                  className="absolute top-2 right-2 z-10 bg-red-600 text-white rounded-full p-2 shadow-lg hover:bg-red-500 transition-transform transform hover:scale-110"
                                                  aria-label="Ta bort produkt"
                                              >
                                                  <TrashIcon />
                                              </button>
                                          )}
                                          <img src={product.mainImage} alt={product.description} className="w-full h-56 object-cover" />
                                          <div className="p-4 flex flex-col flex-grow">
                                            <h3 className="font-bold text-xl text-white">{product.name}</h3>
                                            <p className="text-md font-semibold text-gray-400 mb-2">Storlek: {product.size}</p>
                                            <p className="text-sm text-gray-400 mb-4 flex-grow">{product.description}</p>
                                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-700">
                                              <p className="text-xl font-bold text-white">{product.price} kr</p>
                                              <button onClick={() => handleBuyClick(product)} className="buy-button bg-cyan-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-cyan-500 transition-colors">Köp</button>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : ( <p className="text-center text-gray-500 col-span-full mt-10">Inga produkter i denna kategori än.</p> )}
                                  </div>
                            </main>
                          </div>
                        );
                    case 'orders':
                        return (
                          <div className="bg-gray-900 text-gray-200 flex flex-col min-h-screen font-sans">
                            <AppHeader title="Inkomna beställningar" showBackButton={true} onBack={handleBackNavigation} />
                            <main className="container mx-auto p-4 sm:p-6 flex-grow">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                                    <button onClick={handleInitiateUpload} className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 hover:bg-green-500">Ladda upp ny produkt</button>
                                    <button onClick={handleLogout} className="w-full sm:w-auto bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-500">Logga ut</button>
                                  </div>
                                  <div className="space-y-4">
                                    {orders.length > 0 ? (
                                      orders.map(order => (
                                        <div key={order.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                          <h3 className="font-bold text-lg text-white">{order.product.name} (Storlek: {order.product.size}) - {order.product.price} kr</h3>
                                          <p className="text-sm text-gray-500 mb-2">Beställd: {new Date(order.orderTimestamp?.seconds * 1000).toLocaleString('sv-SE')}</p>
                                          <div className="bg-gray-700 p-3 rounded mt-2">
                                            <h4 className="font-semibold text-gray-300">Leveransadress:</h4>
                                            <p className="text-gray-400">{order.buyer.name}</p>
                                            <p className="text-gray-400">{order.buyer.street}</p>
                                            <p className="text-gray-400">{order.buyer.zip} {order.buyer.city}</p>
                                            <p className="text-gray-400">Tel: {order.buyer.phone}</p>
                                          </div>
                                        </div>
                                      ))
                                    ) : ( <p className="text-center text-gray-500 col-span-full mt-10">Inga beställningar än.</p> )}
                                  </div>
                            </main>
                          </div>
                        );
                    default:
                        return (
                          <div className="bg-gray-900 text-gray-200 flex flex-col min-h-screen font-sans">
                             <AppHeader title="Jennys Recycling">
                                <div className="flex justify-center items-center flex-col">
                                    <HeaderIcon />
                                    <p className="text-gray-400 text-sm mt-2">Välkommen till Jennys återbruks-app!</p>
                                </div>
                             </AppHeader>
                            <main className="container mx-auto p-4 sm:p-6 flex-grow flex flex-col items-center">
                              <div className="text-center w-full max-w-4xl">
                                <h2 className="text-xl font-semibold text-white mb-6">Välj en kategori</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                  {categoryButtons.map((button) => (
                                    <button key={button.dataCategory} onClick={() => handleViewChange('category', button.dataCategory)} className="category-btn bg-gray-800 text-white font-bold flex items-center justify-center text-center p-4 sm:p-6 rounded-lg border-2 border-gray-700 hover:border-cyan-500 hover:bg-gray-700 transition-all duration-300 text-base sm:text-lg">{button.name}</button>
                                  ))}
                                </div>
                                <p className="text-gray-600 text-xs mt-12">Din användar-ID: <span className="font-mono break-all">{userId || "Laddar..."}</span></p>
                              </div>
                            </main>
                          </div>
                        );
                }
            };
            
            return (
                <React.Fragment>
                    {renderCurrentView()}

                    <Modal isOpen={isModalOpen} onClose={closeUploadModal} title={`Ladda upp i ${selectedCategory}`}>
                        <form onSubmit={handleProductUpload}>
                            <div className="mb-4">
                                <label className="block text-gray-300 font-semibold mb-2">Bilder ({imagePreviews.length} / 3):</label>
                                <input type="file" ref={fileInputRef} multiple hidden accept="image/*" onChange={handleImageSelection} />
                                <input type="file" ref={cameraInputRef} hidden accept="image/*" capture="environment" onChange={handleImageSelection} />
                                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4">
                                    {imagePreviews.map((previewSrc, index) => (
                                        <div key={index} className="relative aspect-square">
                                            <img src={previewSrc} alt={`Förhandsvisning ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                                            {index === 0 && (
                                                <div className="absolute top-0 left-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-br-lg rounded-tl-lg">Huvudbild</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {imagePreviews.length < 3 && (
                                    <div className="mt-4 flex flex-col sm:flex-row gap-4">
                                        <button type="button" onClick={() => fileInputRef.current.click()} className="w-full bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500 flex-1">Välj från bibliotek</button>
                                        <button type="button" onClick={() => cameraInputRef.current.click()} className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-500 flex-1">Ta bild med kameran</button>
                                    </div>
                                )}
                            </div>
                            <div className="mb-4">
                                <label htmlFor="productName" className="block text-gray-300 font-semibold mb-2">Produktnamn:</label>
                                <div className="relative">
                                    <input type="text" id="productName" name="productName" placeholder="T.ex. Blå sommarklänning" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 pr-10" value={productName} onChange={(e) => setProductName(e.target.value)} required />
                                    {productName && <button type="button" onClick={() => setProductName('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"><ClearIcon /></button>}
                                </div>
                            </div>
                            <div className="mb-4">
                                <label htmlFor="productSize" className="block text-gray-300 font-semibold mb-2">Storlek:</label>
                                <input type="text" id="productSize" name="productSize" placeholder="T.ex. M, 38, One Size" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500" required />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="productDescription" className="block text-gray-300 font-semibold mb-2">Beskrivning:</label>
                                <div className="relative">
                                    <textarea id="productDescription" name="productDescription" placeholder="Beskriv plagget, ev. skick, material etc." rows="4" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 pr-10" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} required></textarea>
                                    {productDescription && <button type="button" onClick={() => setProductDescription('')} className="absolute top-0 right-0 mt-3 mr-3 text-gray-400 hover:text-white"><ClearIcon /></button>}
                                </div>
                            </div>
                            <div className="mb-4">
                                <label htmlFor="productPrice" className="block text-gray-300 font-semibold mb-2">Pris (kr):</label>
                                <input type="number" id="productPrice" name="productPrice" placeholder="T.ex. 350" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500" required />
                            </div>
                            <button type="submit" disabled={isUploading} className="w-full bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed">{isUploading ? "Laddar upp..." : "Ladda upp produkt"}</button>
                        </form>
                    </Modal>
                    <Modal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} title="Ange leveransadress">
                        <form onSubmit={handleAddressSubmit}>
                            <div className="space-y-4">
                                <div><label htmlFor="name" className="block text-gray-300 font-semibold mb-2">Namn:</label><input type="text" id="name" name="name" placeholder="För- och efternamn" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white" required /></div>
                                <div><label htmlFor="street" className="block text-gray-300 font-semibold mb-2">Gatuadress:</label><input type="text" id="street" name="street" placeholder="Gatunamn och nummer" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white" required /></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label htmlFor="zip" className="block text-gray-300 font-semibold mb-2">Postnummer:</label><input type="text" id="zip" name="zip" placeholder="T.ex. 123 45" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white" required /></div>
                                    <div><label htmlFor="city" className="block text-gray-300 font-semibold mb-2">Ort:</label><input type="text" id="city" name="city" placeholder="T.ex. Stockholm" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white" required /></div>
                                </div>
                                <div><label htmlFor="phone" className="block text-gray-300 font-semibold mb-2">Telefonnummer:</label><input type="tel" id="phone" name="phone" placeholder="T.ex. 070-123 45 67" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white" required /></div>
                                <button type="submit" disabled={isSubmittingOrder} className="w-full bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500 disabled:bg-gray-500">{isSubmittingOrder ? "Sparar beställning..." : "Fortsätt till betalning"}</button>
                            </div>
                        </form>
                    </Modal>
                    <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Betala med Swish">
                        <div className="text-center">
                            <p className="text-gray-300 mb-4">Skanna QR-koden i din Swish-app.</p>
                            <div id="qrcode" className="flex justify-center p-4 bg-white rounded-lg"></div>
                            <p className="text-gray-300 mt-4">Pris: <span id="qr-price" className="font-bold text-white"></span> kr</p>
                        </div>
                    </Modal>
                    <Modal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} title="Logga in">
                        <form onSubmit={handleLoginSubmit}>
                            <div className="mb-4">
                                <label htmlFor="password" className="block text-gray-300 font-semibold mb-2">Lösenord:</label>
                                <input type="password" id="password" name="password" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white" required />
                            </div>
                            {loginError && <p className="text-red-400 text-sm mb-4">{loginError}</p>}
                            <button type="submit" className="w-full bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-500">Logga in</button>
                        </form>
                    </Modal>
                    <Modal isOpen={isCategorySelectModalOpen} onClose={() => setIsCategorySelectModalOpen(false)} title="Välj kategori">
                        <div className="grid grid-cols-2 gap-4">
                            {categoryButtons.map(cat => <button key={cat.dataCategory} onClick={() => handleCategorySelectForUpload(cat.dataCategory)} className="bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-600">{cat.name}</button>)}
                        </div>
                    </Modal>
                    <Modal isOpen={isDeleteConfirmOpen} onClose={handleCloseDeleteConfirm} title="Bekräfta borttagning">
                        <p className="text-gray-300 mb-6">Är du säker på att du vill ta bort den här produkten permanent?</p>
                        <div className="flex justify-end space-x-4">
                            <button onClick={handleCloseDeleteConfirm} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-500">Avbryt</button>
                            <button onClick={handleDeleteProduct} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-500">Ta bort</button>
                        </div>
                    </Modal>
                    <div className="fixed bottom-5 right-5 z-50">
                        <button onClick={() => { isOwnerAuthenticated ? handleViewChange('orders') : setIsLoginModalOpen(true); }} className="flex items-center gap-2 bg-gray-800 text-white font-bold py-3 px-4 rounded-full shadow-lg hover:bg-gray-700 border border-gray-600">
                            <OrdersIcon />
                            <span className="hidden sm:inline">Beställningar</span>
                        </button>
                    </div>
                    <div className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 ${uploadMessage ? 'block' : 'hidden'}`}>
                        <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 relative text-center border border-gray-700">
                            <p className="text-lg text-white">{uploadMessage}</p>
                            <button onClick={() => setUploadMessage('')} className="mt-6 bg-cyan-600 text-white font-semibold py-2 px-6 rounded-full hover:bg-cyan-500">Ok</button>
                        </div>
                    </div>
                </React.Fragment>
            );
        };

        ReactDOM.render(<App />, document.getElementById('root'));
    </script>
</body>
</html>
