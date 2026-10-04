import { useEffect, useRef, useState } from 'react';
import { Dialog } from './Dialog';
import { Icon } from './Icon';

export default function MapViewer({ image, onClose }: { image: { url: string; alt: string }; onClose: () => void }) {
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [space, setSpace] = useState({ width: 1, height: 1 });
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSpace({ width, height });
    });
    if (canvas.current) observer.observe(canvas.current);
    return () => observer.disconnect();
  }, []);
  const fit = natural.width ? Math.min((space.width - 48) / natural.width, (space.height - 48) / natural.height, 1) : 1;
  function zoom(factor: number, point = { x: 0, y: 0 }) {
    setView(current => {
      const scale = Math.min(Math.max(current.scale * factor, 0.5), Math.max(8, 1 / fit));
      const ratio = scale / current.scale;
      return { scale, x: point.x + (current.x - point.x) * ratio, y: point.y + (current.y - point.y) * ratio };
    });
  }
  return <Dialog title={image.alt || '地图查看器'} className="map-dialog" onClose={onClose}>
    <div className="map-toolbar"><span>{image.alt || '地图'}</span><div className="map-tools"><button className="icon-button" aria-label="缩小地图" onClick={() => zoom(1 / 1.25)}><Icon name="minus" /></button><output aria-label="地图缩放比例">{Math.round(view.scale * fit * 100)}%</output><button className="icon-button" aria-label="放大地图" onClick={() => zoom(1.25)}><Icon name="plus" /></button><button onClick={() => setView({ scale: 1, x: 0, y: 0 })}>适配</button><button onClick={() => setView({ scale: 1 / fit, x: 0, y: 0 })}>原尺寸</button><button className="icon-button" aria-label="关闭地图" onClick={onClose}><Icon name="close" /></button></div></div>
    <div ref={canvas} className="map-canvas" onWheel={event => {
      const bounds = event.currentTarget.getBoundingClientRect();
      zoom(event.deltaY < 0 ? 1.12 : 1 / 1.12, { x: event.clientX - bounds.left - bounds.width / 2, y: event.clientY - bounds.top - bounds.height / 2 });
    }} onPointerDown={event => {
      if (event.button !== 0) return;
      drag.current = { x: event.clientX, y: event.clientY, originX: view.x, originY: view.y };
      event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerMove={event => {
      const start = drag.current;
      if (start) setView(current => ({ ...current, x: start.originX + event.clientX - start.x, y: start.originY + event.clientY - start.y }));
    }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onDoubleClick={() => view.scale > 1 ? setView({ scale: 1, x: 0, y: 0 }) : zoom(2)}>
      {failed ? <p>地图暂时无法加载，请关闭后重试。</p> : <img src={image.url} alt={image.alt} draggable={false} onError={() => setFailed(true)} onLoad={event => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} style={{ width: natural.width ? natural.width * fit : 'auto', height: natural.height ? natural.height * fit : 'auto', transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} />}
    </div>
  </Dialog>;
}
