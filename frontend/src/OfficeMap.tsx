import { Armchair, DoorOpen, MapPin, Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import type { Resource } from './types';

interface OfficeMapProps {
  resources: Resource[];
  matchingIds: ReadonlySet<number>;
  available: ReadonlySet<number> | null;
  sessionLoading: boolean;
  onSelect: (resource: Resource) => void;
}

export default function OfficeMap({ resources, matchingIds, available, sessionLoading, onSelect }: OfficeMapProps) {
  const [zoom, setZoom] = useState(100);
  const currentZoom = useRef(100);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);

  const zoomAt = useCallback((requestedZoom: number, x?: number, y?: number) => {
    const surface = viewport.current;
    const nextZoom = Math.max(50, Math.min(200, requestedZoom));
    if (!surface || nextZoom === currentZoom.current) return;

    const anchorX = x ?? surface.clientWidth / 2;
    const anchorY = y ?? surface.clientHeight / 2;
    const ratio = nextZoom / currentZoom.current;
    const left = (surface.scrollLeft + anchorX) * ratio - anchorX;
    const top = (surface.scrollTop + anchorY) * ratio - anchorY;
    currentZoom.current = nextZoom;
    // Resize the scrollable area before applying the new scroll position.
    flushSync(() => setZoom(nextZoom));
    surface.scrollTo(left, top);
  }, []);

  useEffect(() => {
    const surface = viewport.current;
    if (!surface) return;

    function onWheel(event: WheelEvent) {
      if (event.deltaY === 0 || !surface) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.clientHeight : 1);
      const step = Math.max(-100, Math.min(100, delta));
      const rect = surface.getBoundingClientRect();
      zoomAt(currentZoom.current * Math.exp(-step * 0.002), event.clientX - rect.left, event.clientY - rect.top);
    }

    surface.addEventListener('wheel', onWheel, { passive: false });
    return () => surface.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  function startPan(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const surface = event.currentTarget;
    if (surface.scrollWidth <= surface.clientWidth && surface.scrollHeight <= surface.clientHeight) return;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: surface.scrollLeft,
      top: surface.scrollTop,
    };
  }

  function pan(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const surface = event.currentTarget;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!surface.hasPointerCapture(event.pointerId)) {
      if (Math.hypot(dx, dy) < 5) return;
      // Capture only after movement so a click still selects the desk under the pointer.
      surface.setPointerCapture(event.pointerId);
      surface.classList.add('is-panning');
    }
    surface.scrollTo(start.left - dx, start.top - dy);
  }

  function endPan(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.classList.remove('is-panning');
  }

  const zones = new Map<string, Resource[]>();
  for (const resource of resources) {
    const places = zones.get(resource.location) ?? [];
    places.push(resource);
    zones.set(resource.location, places);
  }

  return (
    <section className="office-map" aria-labelledby="office-map-title">
      <div className="office-map-header">
        <div>
          <h2 id="office-map-title">Schemat biura</h2>
          <p className="muted small">Liczba biurek w biurze: <strong>{resources.filter(resource => resource.type === 'desk').length}</strong></p>
        </div>
        <div className="office-map-tools">
          <div className="office-map-legend" aria-label="Legenda dostępności">
            <span className="availability-badge"><span />Wolne</span>
            <span className="availability-badge occupied"><span />Zajęte</span>
          </div>
          <div className="office-map-zoom" role="group" aria-label="Powiększenie mapy">
            <button type="button" className="icon-button" aria-label="Oddal mapę" disabled={zoom === 50} onClick={() => zoomAt(zoom - 25)}><Minus size={16} /></button>
            <button type="button" className="icon-button zoom-value" aria-label={`Przywróć widok mapy, obecnie ${Math.round(zoom)}%`} onClick={() => { zoomAt(100); viewport.current?.scrollTo(0, 0); }}>{Math.round(zoom)}%</button>
            <button type="button" className="icon-button" aria-label="Przybliż mapę" disabled={zoom === 200} onClick={() => zoomAt(zoom + 25)}><Plus size={16} /></button>
          </div>
        </div>
      </div>
      <div
        className="office-map-viewport"
        style={{ '--map-scale': zoom / 100 } as CSSProperties}
        ref={viewport}
        tabIndex={0}
        role="region"
        aria-label="Przewijany rzut biura"
        onPointerDown={startPan}
        onPointerMove={pan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onLostPointerCapture={endPan}
        onPointerLeave={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) endPan(event); }}
      >
        <div className="office-map-plan">
          {[...zones].sort(([a], [b]) => a.localeCompare(b, 'pl')).map(([zone, places]) => (
            <section className="office-zone" aria-label={zone} key={zone}>
              <h3><MapPin size={15} aria-hidden="true" />{zone}</h3>
              <div className="office-zone-places">
                {places.sort((a, b) => a.id - b.id).map(resource => {
                  const free = available?.has(resource.id);
                  const matches = matchingIds.has(resource.id);
                  const status = free === undefined ? 'Nieznany' : free ? 'Wolne' : 'Zajęte';
                  const Icon = resource.type === 'desk' ? Armchair : DoorOpen;
                  return (
                    <button
                      key={resource.id}
                      type="button"
                      className={`office-place ${resource.type} ${free === undefined ? 'unknown' : free ? 'free' : 'occupied'}${matches ? '' : ' filtered-out'}`}
                      disabled={!free || !matches || sessionLoading}
                      onClick={() => onSelect(resource)}
                    >
                      <Icon size={21} aria-hidden="true" />
                      <span><strong>{resource.name}</strong><small>{status}</small></span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
      <p className="office-map-note muted small" role="status">{matchingIds.size === 0 && available
        ? 'Brak miejsc pasujących do filtrów.'
        : 'Rzut poglądowy. Rolka przybliża i oddala. Przeciągnij, aby przesunąć widok.'}</p>
    </section>
  );
}
