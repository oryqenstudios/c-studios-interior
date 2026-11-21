import gsap from 'gsap';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { ROOMS } from '../scene/apartment.js';
import { overviewWeight } from '../scene/camera.js';

const INTERACTIVE = 'a, button, input, select, textarea, label, [role="dialog"], .plan-popover';
const MAX_AZIMUTH = 0.6; // radians either side of the scripted angle
const MAX_POLAR = 0.2;

// Pointer-driven interactions on the 3D view:
//  - cursor parallax in every stage (mouse only, off with reduced motion)
//  - drag to orbit during the overview, easing back on release
//  - hover a room in the overview to lift its brightness and show its name; click to step in
// Nothing here blocks scrolling: vertical touch gestures are left to the browser.
export function initPointer({ ui, camera, jumpToRoom, reducedMotion }) {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const parallax = finePointer && !reducedMotion;
  const tip = document.querySelector('.room-tip');
  const root = document.documentElement;

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const floor = new Plane(new Vector3(0, 1, 0), 0);
  const hit = new Vector3();

  let targetX = 0;
  let targetY = 0;
  let drag = null;
  let hovered = null;

  const inOverview = () => overviewWeight(ui.p) > 0.5;

  function roomAt(clientX, clientY) {
    ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(floor, hit)) return null;
    for (const [name, room] of Object.entries(ROOMS)) {
      if (hit.x >= room.x[0] && hit.x <= room.x[1] && hit.z >= room.z[0] && hit.z <= room.z[1]) return name;
    }
    return null;
  }

  function setHovered(name, clientX, clientY) {
    if (name !== hovered) {
      hovered = name;
      for (const room of Object.keys(ROOMS)) {
        gsap.to(ui.boost, { [room]: room === name ? 1 : 0, duration: reducedMotion ? 0 : 0.35, overwrite: 'auto' });
      }
      root.classList.toggle('is-room-hover', Boolean(name));
      if (tip) {
        tip.textContent = name ? ROOMS[name].label : '';
        tip.classList.toggle('is-visible', Boolean(name) && clientX !== undefined);
      }
    }
    if (tip && name && clientX !== undefined) {
      tip.style.transform = `translate(${clientX + 16}px, ${clientY + 18}px)`;
    }
  }

  function endDrag(event) {
    if (!drag) return;
    const wasClick = !drag.moved;
    drag = null;
    root.classList.remove('is-orbiting');
    gsap.to(ui, { orbitAz: 0, orbitPolar: 0, duration: reducedMotion ? 0 : 1, ease: 'power2.out', overwrite: 'auto' });
    if (wasClick && event.type === 'pointerup' && inOverview()) {
      const room = roomAt(event.clientX, event.clientY);
      if (room) {
        setHovered(null);
        jumpToRoom(room);
      }
    }
  }

  window.addEventListener('pointermove', (event) => {
    if (parallax && event.pointerType === 'mouse') {
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
    }

    if (drag && event.pointerId === drag.id) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
      if (drag.moved) {
        root.classList.add('is-orbiting');
        gsap.killTweensOf(ui, 'orbitAz,orbitPolar');
        ui.orbitAz = Math.max(-MAX_AZIMUTH, Math.min(MAX_AZIMUTH, -dx * 0.005));
        // Vertical drags tilt the view with a mouse only; on touch they scroll the page.
        if (event.pointerType === 'mouse') ui.orbitPolar = Math.max(-MAX_POLAR, Math.min(MAX_POLAR, -dy * 0.004));
        setHovered(null);
      }
      return;
    }

    if (event.pointerType === 'mouse') {
      const overUi = event.target.closest?.(INTERACTIVE);
      setHovered(inOverview() && !overUi ? roomAt(event.clientX, event.clientY) : null, event.clientX, event.clientY);
    }
  });

  window.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    if (!inOverview() || event.target.closest?.(INTERACTIVE)) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  });
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  document.addEventListener('pointerleave', () => setHovered(null));

  // The overview's room buttons give keyboard and touch the same highlight and jump.
  for (const button of document.querySelectorAll('.room-links [data-room]')) {
    const room = button.dataset.room;
    button.addEventListener('click', () => jumpToRoom(room));
    button.addEventListener('pointerenter', () => setHovered(room));
    button.addEventListener('pointerleave', () => setHovered(null));
    button.addEventListener('focus', () => setHovered(room));
    button.addEventListener('blur', () => setHovered(null));
  }

  return {
    // Called every frame: eases the parallax toward the pointer and drops stale state.
    update() {
      if (parallax) {
        ui.parX += (targetX - ui.parX) * 0.06;
        ui.parY += (targetY - ui.parY) * 0.06;
      }
      root.classList.toggle('is-overview', inOverview());
      if (hovered && !inOverview()) setHovered(null);
    },
  };
}
