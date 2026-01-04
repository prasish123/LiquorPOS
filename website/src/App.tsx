import React from 'react';
import Hero from './components/Hero';
import Problem from './components/Problem';
import Solution from './components/Solution';
import Features from './components/Features';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import CTA from './components/CTA';
import './App.css';

function App() {
  return (
    <div className="app">
      <Hero />
      <Problem />
      <Solution />
      <Features />
      <Pricing />
      <FAQ />
      <CTA />
    </div>
  );
}

export default App;

