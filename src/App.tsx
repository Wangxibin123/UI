import React, { useEffect } from 'react'; // <--- 重新导入 useEffect
import './App.css';
import MainLayout from './components/layout/MainLayout/MainLayout';
import { ToastContainer, toast } from 'react-toastify'; // <--- 重新导入 toast
import 'react-toastify/dist/ReactToastify.css';

function App() {
  useEffect(() => { // <--- 重新添加 useEffect Hook
    // Test toast on app load
    toast.info("App loaded! Toast is working if you see this.", {
      toastId: 'app-load-toast-test' // Added toastId to prevent duplicates on HMR
    });
  }, []);

  return (
    <div className="App">
      <MainLayout />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}

export default App;