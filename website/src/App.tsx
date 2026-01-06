import Hero from './components/Hero';
import Problem from './components/Problem';
import ProblemRecognition from './components/ProblemRecognition';
import Solution from './components/Solution';
import DemoVideo from './components/DemoVideo';
import AIShowcase from './components/AIShowcase';
import Features from './components/Features';
import Comparison from './components/Comparison';
import Pricing from './components/Pricing';
import Switching from './components/Switching';
import FAQ from './components/FAQ';
import CTA from './components/CTA';
import './App.css';

function App() {
  return (
    <div className="app">
      <Hero />
      <ProblemRecognition />
      <Problem />
      <Solution />
      <DemoVideo />
      <AIShowcase />
      <Features />
      <Comparison />
      <Pricing />
      <Switching />
      <FAQ />
      <CTA />
    </div>
  );
}

export default App;

