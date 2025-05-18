import React from 'react';
import './App.css'; // We can create this later if specific App-level styles are needed
import MainLayout from './components/layout/MainLayout/MainLayout';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
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
        theme="colored" // Using 'colored' theme for better visibility with success/error/info
      />
    </div>
  );
}

export default App; 