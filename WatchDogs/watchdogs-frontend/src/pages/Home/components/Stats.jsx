import React from "react";

const Stats = () => {
  const stats = [
    { number: "10+", label: "Languages Supported" },
    { number: "24/7", label: "Emergency Coverage" },
    { number: "100+", label: "Cities Covered" },
    { number: "99.9%", label: "Uptime Guarantee" }
  ];

  return (
    <section className="stats-section-fixed">
      <div className="container">
        <div className="stats-grid-fixed">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card-fixed">
              <div className="stat-number-fixed">{stat.number}</div>
              <div className="stat-label-fixed">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
