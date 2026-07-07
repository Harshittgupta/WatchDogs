import React from "react";

const FeatureCards = () => {
  const features = [
    {
      icon: "🆔",
      title: "Blockchain Digital ID",
      description: "Secure, tamper-proof digital identity for seamless travel verification"
    },
    {
      icon: "🤖",
      title: "AI-Powered Safety Score",
      description: "Dynamic risk assessment based on real-time data and travel patterns"
    },
    {
      icon: "📍",
      title: "Geo-fencing & Alerts",
      description: "Instant notifications when entering restricted or high-risk areas"
    },
    {
      icon: "🚨",
      title: "Panic Button & Tracking",
      description: "One-touch emergency assistance with live location sharing"
    }
  ];

  return (
    <section className="features-section">
      <div className="container">
        <div className="section-header">
          <h2>Comprehensive Safety Features</h2>
          <p>Advanced technology ensuring your safety at every step of your journey</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureCards;

