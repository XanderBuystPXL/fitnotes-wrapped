import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import Confetti from 'react-confetti';
import './App.css';

// --- Colors & Theme ---
// Cold / Winter Palette - Higher Contrast
const COLORS = ['#e0f7fa', '#00b0ff', '#8c9eff', '#b388ff', '#ff80ab', '#ea80fc'];

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    const title = label || payload[0].name;
    return (
      <div className="custom-tooltip" style={{ background: 'rgba(2, 11, 28, 0.9)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>
        <p className="label-sm" style={{ margin: 0, color: '#e0f7fa' }}>{`${title} : ${payload[0].value} ${unit}`}</p>
      </div>
    );
  }
  return null;
};



// --- Animations ---
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } } // Smooth "ice slide" easing
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.8 } }
};

// --- Snow Effect Component ---
const Snow = () => {
    // Generate static snowflakes to avoid heavy re-renders
    const snowflakes = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        animationDuration: Math.random() * 3 + 10 + 's',
        animationDelay: Math.random() * 5 + 's',
        opacity: Math.random() * 0.5 + 0.3,
        size: Math.random() * 10 + 5 + 'px'
    }));

    return (
        <div className="snow-container">
            {snowflakes.map(flake => (
                <div 
                    key={flake.id}
                    className="snowflake"
                    style={{
                        left: `${flake.left}%`,
                        animationDuration: flake.animationDuration,
                        animationDelay: flake.animationDelay,
                        opacity: flake.opacity,
                        fontSize: flake.size
                    }}
                >
                    ❄
                </div>
            ))}
        </div>
    );
};

// --- Background ---
const WinterBackground = () => (
    <div className="fixed-bg">
        <div className="aurora"></div>
        <div className="grid-overlay"></div>
    </div>
);

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading">Defrosting Data...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="snap-container">
      <WinterBackground />
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} colors={['#e0f7fa', '#81d4fa', '#ffffff']} />}

      {/* Slide 1: Welcome (With Snow) */}
      <section className="section">
        <Snow /> {/* Snow only on this slide mostly visible */}
        <div className="glass-card">
            <motion.div variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: false }}>
                <p className="subtitle">WINTER WRAPPED</p>
                <h1 className="super-title">{data.year}</h1>
                <p className="label-sm" style={{marginTop: '20px'}}>FitNotes Review</p>
                <motion.div 
                    className="scroll-indicator"
                    animate={{ y: [0, 5, 0], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    ▼
                </motion.div>
            </motion.div>
        </div>
      </section>





      {/* Slide 3: Year Grid (Moved Up) */}
      <section className="section">
          <div className="glass-card full-width">
              <h2 className="section-title">No Days Off?</h2>
              <p className="label-sm">365 Days of Grind</p>
              <div className="year-grid">
                  {data.year_grid && data.year_grid.map((day) => (
                      <div 
                          key={day.date} 
                          title={`${day.date}: ${day.count} sessions`}
                          className={`day-cell day-level-${day.level}`}
                      />
                  ))}
              </div>
              <div style={{marginTop: '10px', textAlign: 'center'}}>
                  <div style={{display: 'flex', gap: '5px', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', opacity: 0.7}}>
                      <span>Light</span>
                      <div className="day-cell day-level-1" style={{border: '1px solid rgba(255,255,255,0.1)'}} /> 
                      <div className="day-cell day-level-2" style={{border: '1px solid rgba(255,255,255,0.1)'}} />
                      <div className="day-cell day-level-3" style={{border: '1px solid rgba(255,255,255,0.1)'}} />
                      <div className="day-cell day-level-4" style={{border: '1px solid rgba(255,255,255,0.1)'}} />
                      <span>Heavy</span>
                  </div>
                  <p style={{fontSize: '0.7rem', opacity: 0.5, marginTop: '5px'}}>Color intensity = Total Volume (kg)</p>
              </div>
          </div>
      </section>

      {/* Slide 4: Consistency */}
      <section className="section">
           <div className="glass-card full-width">
                <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" className="content-row">
                     <div className="stat-block">
                         <p className="label-sm">Consistency</p>
                         <h2 className="stat-value text-accent-2">{data.total_workouts}</h2>
                         <p className="stat-label">SESSIONS</p>
                     </div>
                     <div className="stat-divider"></div>
                     <div className="stat-block">
                         <p className="label-sm">Best Streak</p>
                         <h2 className="stat-value text-accent-3">{data.longest_streak}</h2>
                         <p className="stat-label">DAYS</p>
                     </div>
                </motion.div>
                <motion.div 
                    className="chart-container"
                    style={{height: '200px'}}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <p className="label-sm" style={{textAlign:'left', marginLeft: '10px'}}>Weekly Rhythm</p>
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={data.weekly_activity}>
                           <XAxis dataKey="day" tick={{fill: '#b0bec5', fontSize: 10}} interval={0} tickFormatter={(day) => day.substring(0,3)} />
                           <Tooltip content={<CustomTooltip unit="Sessions" />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                           <Bar dataKey="count" fill="#81d4fa" radius={[2, 2, 0, 0]} />
                       </BarChart>
                    </ResponsiveContainer>
                </motion.div>
           </div>
      </section>

      {/* Slide 3: Volume */}
      <section className="section">
          <div className="glass-card">
              <motion.div variants={fadeInUp} initial="hidden" whileInView="visible">
                  <p className="label-sm">Total Tonnage</p>
                  <h2 className="stat-value-lg text-accent-1">{(data.total_volume_kg).toLocaleString()}<span className="unit">kg</span></h2>
                  <p className="comparison-text">Equivalent to lifting <strong>{(data.total_volume_kg / 72).toFixed(0)}</strong> Xander Bust's.</p>
                  
                  <div className="spacer"></div>
                  
                  <p className="label-sm">Total Reps</p>
                  <h2 className="stat-value-md" style={{color: '#fff'}}>{data.total_reps.toLocaleString()}</h2>
              </motion.div>
          </div>
      </section>

      {/* Slide 4: Muscle Split */}
      <section className="section">
           <div className="glass-card full-width">
               <motion.h2 variants={fadeInUp} initial="hidden" whileInView="visible" className="section-title">Muscle Split</motion.h2>
               <div className="chart-container-large">
                   <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                           <Pie
                               data={data.muscle_split}
                               cx="50%"
                               cy="50%"
                               innerRadius={70}
                               outerRadius={90}
                               paddingAngle={2}
                               dataKey="value"
                               stroke="none"
                           >
                               {data.muscle_split.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                           </Pie>
                           <Tooltip content={<CustomTooltip unit="Sets" />} />
                       </PieChart>
                   </ResponsiveContainer>
                   <div className="legend-grid">
                       {data.muscle_split.slice(0, 5).map((item, i) => (
                           <div key={item.name} className="legend-item">
                               <div className="dot" style={{background: COLORS[i % COLORS.length]}}></div>
                               <span>{item.name}</span>
                           </div>
                       ))}
                   </div>
               </div>
               <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" style={{marginTop: '25px'}}>
                   <p className="label-sm">Favorite</p>
                   <h3 className="text-accent-3">{data.favorite_category}</h3>
               </motion.div>
           </div>
       </section>

      {/* Slide 4.7: The Grinder */}
      <section className="section">
           <div className="glass-card">
               <motion.div variants={scaleIn} initial="hidden" whileInView="visible">
                    <p className="label-sm">The Grinder</p>
                    <p className="stat-text">Your hardest day was</p>
                    <h2 className="grinder-date">{data.the_grinder.date}</h2>
                    <h1 className="stat-value-lg text-accent-1">{(data.the_grinder.volume).toLocaleString()}<span className="unit">kg</span></h1>
                    <p style={{fontSize: '0.7rem', opacity: 0.6, marginBottom: '10px'}}>(Volume = Weight × Reps × Sets)</p>
                    <p className="stat-label">{data.the_grinder.count} Sets across all exercises</p>
               </motion.div>
           </div>
      </section>



      {/* Slide 5: Top Exercises */}
      <section className="section">
          <div className="glass-card">
               <h2 className="section-title">Top 5 Exercises of the Year</h2>
               <div className="list-container">
                   {data.top_exercises.map((ex, i) => (
                       <motion.div 
                          key={ex}
                          className="rank-row"
                          initial={{ x: -20, opacity: 0 }}
                          whileInView={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.1 }}
                          viewport={{ once: true }}
                       >
                           <div className="rank-num">0{i + 1}</div>
                           <div className="rank-name">{ex}</div>
                       </motion.div>
                   ))}
               </div>
               <p className="label-sm" style={{marginTop:'20px', opacity: 0.5, fontSize: '0.7rem'}}>*Based on number of sessions logged</p>
          </div>
      </section>

      {/* Slide 6: Heaviest Lift */}
      <section className="section">
           <div className="glass-card">
               <motion.div variants={scaleIn} initial="hidden" whileInView="visible">
                    <p className="label-sm">Heaviest Lift</p>
                    <h1 className="stat-value-xl text-accent-1">{data.heaviest_lift.weight}<span className="unit-lg">{data.heaviest_lift.unit}</span></h1>
                    <h3 className="text-accent-2" style={{fontWeight: 300, fontSize: '1.5rem', marginTop: '10px'}}>{data.heaviest_lift.exercise}</h3>
               </motion.div>
           </div>
      </section>

      {/* Slide 7: Active Month */}
      <section className="section">
           <div className="glass-card">
               <motion.div variants={fadeInUp} initial="hidden" whileInView="visible">
                   <p className="label-sm">Peak Season</p>
                   <p className="stat-text" style={{margin: '20px 0'}}>You were unstoppable in</p>
                   <h1 className="stat-value-lg text-accent-3">{data.most_active_month}</h1>
               </motion.div>
           </div>
      </section>



      {/* Slide: Badges */}
      <section className="section">
           <div className="glass-card">
               <motion.div variants={fadeInUp} initial="hidden" whileInView="visible">
                   <h2 className="section-title">Your Identity</h2>
                   <p className="label-sm" style={{marginBottom: '20px'}}>Tap a badge to see details</p>
                   <div className="badge-container">
                       {data.badges && data.badges.map((badge) => (
                           <motion.div 
                                key={badge.name} 
                                className="badge" 
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedBadge(badge)}
                                style={{
                                    cursor: 'pointer',
                                    background: selectedBadge?.name === badge.name ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                                    border: selectedBadge?.name === badge.name ? '1px solid #fff' : '1px solid rgba(255,255,255,0.2)'
                                }}
                           >
                               {badge.name}
                           </motion.div>
                       ))}
                   </div>
                   {selectedBadge && (
                       <motion.div 
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           className="badge-description"
                           style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}
                       >
                           <h3 style={{margin: '0 0 5px 0', color: '#81d4fa'}}>{selectedBadge.name}</h3>
                           <p style={{margin: 0}}>{selectedBadge.desc}</p>
                       </motion.div>
                   )}
               </motion.div>
           </div>
       </section>

      {/* Slide 8: Outro */}
      <section className="section">
          <div className="glass-card">
               <motion.div 
                   initial={{ scale: 0.8, opacity: 0 }}
                   whileInView={() => {
                       setShowConfetti(true);
                       return { scale: 1, opacity: 1 };
                   }}
                   viewport={{ once: true, amount: 0.5 }}
               >
                   <h1 className="super-title">2025</h1>
                   <p className="subtitle">COMPLETE</p>
                   <p className="footer-text" style={{marginTop: '40px', opacity: 0.6}}>Remember, last set best set.</p>
               </motion.div>
          </div>
      </section>

    </div>
  );
}

export default App;
