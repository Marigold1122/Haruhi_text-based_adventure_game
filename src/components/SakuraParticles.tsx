import { useEffect, useRef } from "react";

interface Petal {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
}

export function SakuraParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const petals: Petal[] = [];
    const petalCount = 30;

    function createPetal(width: number): Petal {
      return {
        x: Math.random() * width,
        y: -20,
        size: Math.random() * 8 + 4,
        speedY: Math.random() * 1 + 0.5,
        speedX: Math.random() * 0.5 - 0.25,
        opacity: Math.random() * 0.5 + 0.3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      };
    }

    function updatePetal(petal: Petal, height: number, width: number): void {
      petal.y += petal.speedY;
      petal.x += petal.speedX;
      petal.rotation += petal.rotationSpeed;
      if (petal.y > height) {
        petal.y = -20;
        petal.x = Math.random() * width;
      }
    }

    function drawPetal(context: CanvasRenderingContext2D, petal: Petal): void {
      context.save();
      context.translate(petal.x, petal.y);
      context.rotate(petal.rotation);
      context.fillStyle = `rgba(255, 192, 211, ${petal.opacity})`;
      context.beginPath();
      context.ellipse(0, 0, petal.size, petal.size * 0.6, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    for (let i = 0; i < petalCount; i++) {
      petals.push(createPetal(canvasWidth));
    }

    let animationId: number;
    let currentWidth = canvasWidth;
    let currentHeight = canvasHeight;

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, currentWidth, currentHeight);
      petals.forEach((petal) => {
        updatePetal(petal, currentHeight, currentWidth);
        drawPetal(ctx, petal);
      });
      animationId = requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      currentWidth = window.innerWidth;
      currentHeight = window.innerHeight;
      canvas.width = currentWidth;
      canvas.height = currentHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}
