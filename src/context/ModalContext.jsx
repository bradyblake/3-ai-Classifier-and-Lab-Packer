// File: ModalContext.jsx

import React, { createContext, useState } from "react";

export const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modals, setModals] = useState({});

  const openModal = (name) => {
    setModals((prev) => ({ ...prev, [name]: true }));
  };

  const closeModal = (name) => {
    setModals((prev) => ({ ...prev, [name]: false }));
  };

  const isModalOpen = (name) => !!modals[name];

  return (
    <ModalContext.Provider value={{ openModal, closeModal, isModalOpen }}>
      {children}
    </ModalContext.Provider>
  );
};