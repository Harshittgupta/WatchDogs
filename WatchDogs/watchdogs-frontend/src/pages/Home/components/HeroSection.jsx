import React from "react";

const HeroSection = () => {
  return (
    <section className="hero-section">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            Smart Tourist Safety Monitoring & Incident Response
          </h1>
          <p className="hero-description">
            Experience worry-free travel with AI-powered safety monitoring, 
            real-time alerts, and instant emergency response. Your digital 
            companion for secure adventures.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary">Get Started</button>
            <button className="btn-secondary">Learn More</button>
          </div>
        </div>
        <div className="hero-image">
          <div className="image-placeholder">
            <div className="radar-scanner">
              <div className="radar-sweep"></div>
              <div className="radar-grid">
                <div className="grid-circle circle-1"></div>
                <div className="grid-circle circle-2"></div>
                <div className="grid-circle circle-3"></div>
                <div className="grid-line line-h"></div>
                <div className="grid-line line-v"></div>
              </div>
              <div className="radar-center"></div>
              <div className="radar-blips">
                <div className="blip blip-1"></div>
                <div className="blip blip-2"></div>
                <div className="blip blip-3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

