import React from 'react';
import { Link } from 'react-router-dom';
import HeroSection from './components/HeroSection';
import FeatureCards from './components/FeatureCards';
import Stats from './components/Stats';
import CallToAction from './components/CallToAction';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="homepage">
      {/* Navigation Header */}
      <nav className="home-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <h1>🛡️ WatchDogs</h1>
          </div>
          <div className="nav-links">
            <Link to="/signin" className="nav-link signin-link">
              Sign In
            </Link>
            <Link to="/signup" className="nav-link signup-link">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <HeroSection />
      <Stats />
      <FeatureCards />
      <CallToAction />
    </div>
  );
};

export default HomePage;