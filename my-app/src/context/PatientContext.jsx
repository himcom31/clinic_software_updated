import React, { createContext, useState, useContext } from 'react';

const PatientContext = createContext();

export const PatientProvider = ({ children }) => {
  const [currentPatient, setCurrentPatient] = useState(null);

  // Patient set karne ka helper
  const selectPatient = (patient) => {
    setCurrentPatient(patient);
  };

  // Data clear karne ke liye (e.g. Logout ya Next Patient)
  const clearPatient = () => setCurrentPatient(null);

  return (
    <PatientContext.Provider value={{ currentPatient, selectPatient, clearPatient }}>
      {children}
    </PatientContext.Provider>
  );
};

// Custom Hook taaki har jagah useContext na likhna pade
export const usePatient = () => useContext(PatientContext);