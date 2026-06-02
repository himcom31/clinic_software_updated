import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar'; // Sidebar import kiya
import DashboardHome from './DashboardHome'
import ClinicDetailsForm from './ClinicDetailsForm';
//import LetterheadForm from './LetterheadForm';
// import Builder from './Builder'
import Paitents from './Patients'
import Appointments from './Appointments';
import AppointmentHistory from './AppointmentHistory'; // Import karein
import MedicineMaster from './Medicine/MedicineMaster';
import MedicineImport from './Medicine/MedicineImport';
import InvestigationMaster from './Investigation/InvestigationMaster';
import AdviceMaster from './Advice/AdviceMaster';
import Billing from './Billing/BillingModule'; // Import karein
import { PatientProvider } from '../../context/PatientContext';
import Reports from './Reports/ReportsDashboard'; // Import karein
import StaffManagement from './Staff/StaffManagement';
import AddStaffForm from './Staff/AddStaffForm'; // Import karein
import AccountSettings from './AccountSetting/AccountSettings';
import ClinicProfile from './AccountSetting/ClinicProfile '; // Import karein
import Support from './Support'; // Import karein
import SupportTicket from './SupportTicket';
import GeneratePrescription from './GeneratePrescription'; // Import karein
import AppointmentForm from './AppointmentForm';
import SymptomsManager from './SymptomsManager'; // Import karein
import VaccinationManager from './VaccinationManager'; // Import karein
import AppointmentTable from './AppoinmentsStatus';
import NotificationSettings from './Notification/Notification';
import PrescriptionHistoryAll from './PrescriptionHistoryAll'

const DoctorDashboard = () => {
  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 p-10 overflow-y-auto">

        <Routes>
          <Route path="main" element={<DashboardHome />} />

          {/* Clinic Settings with Props for Tab Selection */}
          <Route path="settings/details" element={<ClinicDetailsForm activeTab="details" />} />
          {/* <Route path="settings/letterhead" element={<LetterheadForm activeTab="letterhead" />} /> */}

          {/*********************/}
          {/* <Route path="consultation/builder" element={<Builder activeTab="builder" />} /> */}

          {/************************* */}
          <Route path="patients" element={<Paitents activeTab="patients" />} />

          {/************************* */}

          <Route path="appointment" element={<Appointments activeTab="Appointment" />} />
          <Route path="appointmentHistory" element={<AppointmentHistory />} />
          <Route path="appointment/new" element={<AppointmentForm />} />



          {/************************* */}

          <Route path="medicine" element={<MedicineMaster activeTab="Medicines" />} />
          <Route path="medicineImport" element={<MedicineImport />} />

          {/************************* */}

          <Route path="investigation" element={<InvestigationMaster activeTab="Investigation" />} />

          {/************************* */}
          <Route path="advice" element={<AdviceMaster activeTab="Advice Library" />} />

          {/************************* */}


          <Route path="billing" element={<Billing activeTab="Billing" />} />

          {/************************* */}

          <Route path="reports" element={<Reports activeTab="Reports" />} />

          {/************************* */}

          <Route path="staff" element={<StaffManagement activeTab="Staff Management" />} />
          <Route path="staff/add" element={<AddStaffForm />} />

          {/************************* */}
          <Route path="account" element={<AccountSettings activeTab="Account Settings" />} />

          {/************************* */}
          <Route path="account/clinic-profile" element={<ClinicProfile />} />

                    {/************************* */}
          <Route path="support" element={<Support activeTab="Support" />} />
          <Route path="support/ticket" element={<SupportTicket />} />


                  <Route path="prescription/:appointmentId?" element={<GeneratePrescription activeTab=" New Prescription" />} />

          <Route path="symptoms" element={<SymptomsManager activeTab="Symptoms" />} />

          
          <Route path="vaccination" element={<VaccinationManager activeTab="Vaccination" />} />
          <Route path="appTable" element={<AppointmentTable />} />
                    <Route path="notification" element={<NotificationSettings activeTab="Notifications" />} />


                    <Route path="prescription-history" element={<PrescriptionHistoryAll />} />



          {/* Default view */}
        </Routes>




        {/* Baaki routes... */}


      </main>
    </div>
  );
};

export default DoctorDashboard;