import { useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import CreateInMinutes from "./components/CreateInMinutes";
import DescriptiveReports from "./components/DescriptiveReports";
import DetailedReports from "./components/DetailedReports";
import Footer from "./components/Footer";
import ScheduleDemoModal from "./components/ScheduleDemoModal";

export default function App() {
  const [showDemoModal, setShowDemoModal] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <Navbar onScheduleDemo={() => setShowDemoModal(true)} />
      <Hero onScheduleDemo={() => setShowDemoModal(true)} />
      <CreateInMinutes />
      <DescriptiveReports />
      <DetailedReports />
      <Footer onScheduleDemo={() => setShowDemoModal(true)} />
      {showDemoModal && <ScheduleDemoModal onClose={() => setShowDemoModal(false)} />}
    </div>
  );
}
