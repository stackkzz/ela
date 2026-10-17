import React, { useState, useEffect, useRef } from 'react';
import './App.css';

export default function App() {
  // Controle de abrir/fechar os menus
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLetterOpen, setIsLetterOpen] = useState(false);

  // Referência para ligar a animação ao elemento do React
  const canvasRef = useRef(null);

  const openModal = () => {
    setIsModalOpen(true);
    setIsMenuOpen(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setIsLetterOpen(false), 300); // dobra a carta de volta escondido
  };

  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    let W = 0, H = 0, CX = 0, BASE = 0, DPR = 1;
    let SCALE = 1;
    let starCount = 150;
    let sparkCount = 24;
    let STARS = [];
    let SPARKS = [];

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      CX = W / 2;
      const safeBottom = 20;
      BASE = Math.min(H - safeBottom, H * (W < 600 ? 0.86 : 0.87));
      SCALE = Math.min(1.0, W / 430, H / 760);
      if (W > 700) SCALE = Math.min(1.15, H / 760);
      SCALE = Math.max(0.62, SCALE);
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      const maxPixels = 2_500_000;
      const desiredPixels = W * H * DPR * DPR;
      if (desiredPixels > maxPixels) {
        DPR *= Math.sqrt(maxPixels / desiredPixels);
      }
      canvas.width = Math.max(1, Math.round(W * DPR));
      canvas.height = Math.max(1, Math.round(H * DPR));
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      const smallDevice = W < 600 || H < 700;
      starCount = smallDevice ? 105 : 170;
      sparkCount = smallDevice ? 18 : 26;
      rebuildParticles();
    }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
    function seg(p, s, e) { return easeOut(clamp((p - s) / (e - s), 0, 1)); }

    function makeStars() {
      STARS = Array.from({ length: starCount }, () => ({
        x: Math.random(),
        y: Math.random() * 0.80,
        r: Math.random() * 0.95 + 0.15,
        phase: Math.random() * Math.PI * 2,
        speed: 0.018 + Math.random() * 0.03,
        gold: Math.random() < 0.18
      }));
    }

    function resetSpark(s, initial = false) {
      s.x = CX + (Math.random() - 0.5) * Math.min(250, W * 0.62);
      s.y = BASE - 60 - Math.random() * Math.min(350, H * 0.42);
      s.vy = -0.24 - Math.random() * 0.42;
      s.life = initial ? Math.random() * s.max : 0;
      s.max = 0.7 + Math.random() * 0.5;
      s.sz = 1.2 + Math.random() * 2.0;
      s.hue = Math.random() < 0.5 ? 60 + Math.random() * 20 : 120 + Math.random() * 30;
    }

    function makeSparks() {
      SPARKS = Array.from({ length: sparkCount }, () => {
        const s = {}; resetSpark(s, true); return s;
      });
    }

    function rebuildParticles() { makeStars(); makeSparks(); }

    function drawBg() {
      const bg = ctx.createRadialGradient(CX, H*0.5, 10, CX, H*0.35, H*0.75);
      bg.addColorStop(0,    '#5b247a'); bg.addColorStop(0.38, '#35145c');
      bg.addColorStop(0.72, '#180828'); bg.addColorStop(1,    '#07000f');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const pool = ctx.createRadialGradient(CX, BASE+20, 5, CX, BASE-40, 260);
      pool.addColorStop(0, 'rgba(140, 60, 200, 0.2)');
      pool.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pool; ctx.fillRect(0, 0, W, H);
    }

    function drawStars() {
      for (const s of STARS) {
        s.phase += s.speed;
        const a = 0.15 + 0.48 * Math.abs(Math.sin(s.phase));
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.gold ? `rgba(255,240,200,${a})` : `rgba(220,255,230,${a})`;
        ctx.fill();
      }
    }

    function drawSparkles(show) {
      if (show <= 0) return;
      for (const s of SPARKS) {
        s.life += 0.009;
        if (s.life > s.max) resetSpark(s);
        const a = Math.sin((s.life / s.max) * Math.PI) * show;
        ctx.beginPath();
        ctx.arc(s.x + Math.sin(s.life * 4) * 5, s.y + s.vy * s.life * 55, s.sz, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue},100%,85%,${a})`;
        ctx.shadowColor = `hsla(${s.hue},100%,95%,${a})`;
        ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      }
    }

    function bezPt(x0,y0, cx1,cy1, cx2,cy2, x1,y1, t) {
      const m = 1 - t;
      return [
        m*m*m*x0 + 3*m*m*t*cx1 + 3*m*t*t*cx2 + t*t*t*x1,
        m*m*m*y0 + 3*m*m*t*cy1 + 3*m*t*t*cy2 + t*t*t*y1
      ];
    }

    function bezAngle(x0,y0, cx1,cy1, cx2,cy2, x1,y1, t) {
      const m = 1 - t;
      const dx = 3*m*m*(cx1-x0) + 6*m*t*(cx2-cx1) + 3*t*t*(x1-cx2);
      const dy = 3*m*m*(cy1-y0) + 6*m*t*(cy2-cy1) + 3*t*t*(y1-cy2);
      return Math.atan2(dy, dx);
    }

    function drawStem(x0,y0, cx1,cy1,cx2,cy2,x1,y1,prog,thick,col) {
      if (prog <= 0) return;
      ctx.beginPath();
      const steps = W < 600 ? 32 : 40;
      const end = steps * prog;
      for (let i = 0; i <= end; i++) {
        const [px, py] = bezPt(x0,y0,cx1,cy1,cx2,cy2,x1,y1,i/steps);
        i === 0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
      }
      ctx.strokeStyle = col; ctx.lineWidth = thick; ctx.lineCap = 'round';
      ctx.shadowColor = col; ctx.shadowBlur = 3; ctx.stroke(); ctx.shadowBlur = 0;
    }

    function drawLeaf(x,y,rot,size,prog) {
      if (prog <= 0) return;
      const s = size * prog;
      ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
      ctx.beginPath(); ctx.moveTo(0,0);
      ctx.quadraticCurveTo(s * 0.15, s * 0.15, s, 0);
      ctx.quadraticCurveTo(s * 0.15, -s * 0.15, 0, 0);
      const lg = ctx.createLinearGradient(0,0,s,0);
      lg.addColorStop(0, '#2d5e20'); lg.addColorStop(1, '#509c3c');
      ctx.fillStyle = lg; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0,0);
      ctx.quadraticCurveTo(s * 0.5,0,s * 0.9,0);
      ctx.strokeStyle = 'rgba(0,40,0,0.4)';
      ctx.lineWidth = Math.max(0.5, s * 0.02); ctx.stroke();
      ctx.restore();
    }

    function drawFlower(x,y,size,prog,t,wob,stemAngle) {
      if (prog <= 0) return;
      const s = size * prog * 1.6;
      const rot = (stemAngle + Math.PI/2) * 0.3 + Math.sin(t * 0.001 + wob) * 0.04;
      ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
      const petalGradient = ctx.createRadialGradient(0,0,0,0,0,s * 0.7);
      petalGradient.addColorStop(0,'#b8e69c'); petalGradient.addColorStop(0.25,'#f5fceb');
      petalGradient.addColorStop(0.8,'#ffffff'); petalGradient.addColorStop(1,'#f2f2f2');

      function drawPetal(radius,widthScale) {
        ctx.beginPath(); ctx.moveTo(0,0);
        ctx.bezierCurveTo(-radius*0.3*widthScale,-radius*0.3,-radius*0.2*widthScale,-radius*0.8,0,-radius);
        ctx.bezierCurveTo(radius*0.2*widthScale,-radius*0.8,radius*0.3*widthScale,-radius*0.3,0,0);
        ctx.fillStyle = petalGradient; ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.shadowBlur = 10 * prog; ctx.fill();
        ctx.strokeStyle = 'rgba(100,150,80,0.15)'; ctx.lineWidth = Math.max(0.5, radius * 0.015);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(radius*0.02,-radius*0.5,0,-radius*0.9);
        ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.lineWidth = Math.max(0.4, radius * 0.005); ctx.stroke();
      }

      for (let i=0;i<3;i++) { ctx.save(); ctx.rotate(i * (Math.PI*2/3)); drawPetal(s*0.9,0.85); ctx.restore(); }
      for (let i=0;i<3;i++) { ctx.save(); ctx.rotate(i * (Math.PI*2/3) + Math.PI/3); ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 8; drawPetal(s,1.0); ctx.restore(); }
      ctx.shadowBlur = 0;

      for (let i=0;i<6;i++) {
        ctx.save();
        const stamenAngle = i * (Math.PI*2/6) + Math.PI/6;
        ctx.rotate(stamenAngle);
        const filLength = s * 0.55;
        ctx.beginPath(); ctx.moveTo(0,0);
        ctx.quadraticCurveTo(filLength*0.2,-filLength*0.6,0,-filLength);
        ctx.strokeStyle = '#cce3b6'; ctx.lineWidth = Math.max(0.6, s*0.02); ctx.stroke();
        ctx.translate(0,-filLength); ctx.rotate(Math.PI/2 + 0.2);
        ctx.beginPath(); ctx.ellipse(0,0,s*0.04,s*0.12,0,0,Math.PI*2);
        ctx.fillStyle = '#9c3d03'; ctx.fill();
        ctx.fillStyle = '#c95e1c'; ctx.beginPath(); ctx.ellipse(-s*0.01,-s*0.02,s*0.015,s*0.08,0,0,Math.PI*2);
        ctx.fill(); ctx.restore();
      }

      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-s*0.65);
      ctx.strokeStyle = '#9dc779'; ctx.lineWidth = Math.max(0.7, s*0.035); ctx.stroke();
      ctx.beginPath(); ctx.arc(0,-s*0.65,s*0.04,0,Math.PI*2);
      ctx.fillStyle = '#7aab4d'; ctx.fill(); ctx.restore();
    }

    const START = performance.now();
    const DURATION = 5400;

    function buildStems(sc) {
      const spread = W < 600 ? 0.74 : 1;
      const height = H < 700 ? 0.90 : 1;
      return [
        { bxo:-100*sc*spread, byo:0, cp1x:-120*sc*spread, cp1y:-100*sc*height, cp2x:-150*sc*spread, cp2y:-220*sc*height, tx:-180*sc*spread, ty:-310*sc*height, fs:34*sc, ps:[0.05,0.46], wob:1.3 },
        { bxo:-45*sc*spread, byo:0, cp1x:-55*sc*spread, cp1y:-70*sc*height, cp2x:-75*sc*spread, cp2y:-150*sc*height, tx:-95*sc*spread, ty:-230*sc*height, fs:27*sc, ps:[0.03,0.41], wob:0.5 },
        { bxo:0, byo:0, cp1x:0, cp1y:-130*sc*height, cp2x:0, cp2y:-265*sc*height, tx:0, ty:-400*sc*height, fs:43*sc, ps:[0.00,0.37], wob:0.0 },
        { bxo:45*sc*spread, byo:0, cp1x:55*sc*spread, cp1y:-70*sc*height, cp2x:75*sc*spread, cp2y:-150*sc*height, tx:95*sc*spread, ty:-230*sc*height, fs:27*sc, ps:[0.04,0.42], wob:-0.5 },
        { bxo:100*sc*spread, byo:0, cp1x:120*sc*spread, cp1y:-100*sc*height, cp2x:150*sc*spread, cp2y:-220*sc*height, tx:180*sc*spread, ty:-310*sc*height, fs:34*sc, ps:[0.06,0.47], wob:-1.4 },
      ];
    }

    let animationId;
    function draw(now) {
      const elapsed = now - START;
      const p = Math.min(elapsed / DURATION, 1);
      ctx.clearRect(0,0,W,H);
      drawBg(); drawStars();

      const stems = buildStems(SCALE);
      const bx = CX; const by = BASE;
      const SD = '#234a1c'; const SL = '#468f3b';

      stems.forEach((st, idx) => {
        const sx0 = bx + st.bxo, sy0 = by + st.byo;
        const sx1 = bx + st.tx, sy1 = by + st.ty;
        const cp1x = bx + st.cp1x, cp1y = by + st.cp1y;
        const cp2x = bx + st.cp2x, cp2y = by + st.cp2y;
        const sp = seg(p, st.ps[0], st.ps[1]);

        drawStem(sx0,sy0,cp1x,cp1y,cp2x,cp2y,sx1,sy1,sp,3.2*SCALE,SD);
        drawStem(sx0,sy0,cp1x,cp1y,cp2x,cp2y,sx1,sy1,sp,1.4*SCALE,SL);

        const leafData = [ { t:0.15, dir:-1 }, { t:0.35, dir:1 }, { t:0.55, dir:-1 }, { t:0.75, dir:1 } ];
        leafData.forEach(leaf => {
          if ((idx === 1 || idx === 3) && leaf.t > 0.5) return;
          if (sp > leaf.t) {
            const [lx,ly] = bezPt(sx0,sy0,cp1x,cp1y,cp2x,cp2y,sx1,sy1,leaf.t);
            const lAngle = bezAngle(sx0,sy0,cp1x,cp1y,cp2x,cp2y,sx1,sy1,leaf.t);
            const leafRot = lAngle + (Math.PI/2.8) * leaf.dir;
            const lProg = clamp((sp - leaf.t) * 5,0,1);
            drawLeaf(lx,ly,leafRot,st.fs*1.5,lProg);
          }
        });

        const curT = Math.min(sp,1);
        const [fx,fy] = bezPt(sx0,sy0,cp1x,cp1y,cp2x,cp2y,sx1,sy1,curT);
        const angle = bezAngle(sx0,sy0,cp1x,cp1y,cp2x,cp2y,sx1,sy1,curT);
        const fp = seg(p, st.ps[1]-0.05, st.ps[1]+0.22);
        drawFlower(fx,fy,st.fs,fp,elapsed,st.wob,angle);
      });

      drawSparkles(seg(p,0.32,0.54));
      animationId = requestAnimationFrame(draw);
    }

    // Inicialização da animação
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(resize, 120), { passive: true });
    resize();
    animationId = requestAnimationFrame(draw);

    // Limpeza quando o componente é fechado
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // HTML / INTERFACE
  return (
    <div>
      {/* Tela de fundo com as flores */}
      <canvas ref={canvasRef} aria-label="Animação de lírios" className="background-canvas"></canvas>

      {/* Botão de Menu */}
      <div id="menu-container">
        <div id="menu-icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</div>
        {isMenuOpen && (
          <div id="menu-dropdown" className="show">
            <button id="btn-carta" onClick={openModal}>Carta 💌</button>
          </div>
        )}
      </div>

      {/* A Carta Modal */}
      {isModalOpen && (
        <div id="carta-modal" className="show">
          <div id="modal-close" onClick={closeModal}>✖</div>
          
          <div id="carta-wrapper" className={isLetterOpen ? 'aberta' : ''}>
            
            <div className="carta-cima" onClick={() => setIsLetterOpen(true)}>
              <div className="face-externa">Toque para abrir 💌</div>
              <div className="face-interna">
                <div className="carta-texto">
                  Minha querida,<br /><br />
                  Escrevi essa cartinha para pedir desculpas por hoje...
                </div>
              </div>
            </div>

            {/* Metade de Baixo */}
            <div className="carta-baixo">
              <div className="carta-texto">
                ...sei que não sou uma pessoa fácil de lidar, por isso peço paciência pra senhora.
            <br /><br />
                Espero que goste dessas flores e tomara que te deixem feliz!<br /><br />
                Atenciosamente,<br />
                <strong>[Querido]</strong>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}