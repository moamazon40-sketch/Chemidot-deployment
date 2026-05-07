import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import CtaSection from "@/components/CtaSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
