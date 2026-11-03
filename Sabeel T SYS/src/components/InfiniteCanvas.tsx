import React, { useState, useRef, useEffect } from 'react';
import { CanvasNode, CanvasConnection, DrawingPath, CanvasNodeType } from '../types';
import { 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  MousePointer, 
  Hand, 
  Pen, 
  Eraser, 
  Trash2, 
  Download, 
  Link as LinkIcon, 
  Sparkles,
  Move
} from 'lucide-react';

interface InfiniteCanvasProps {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  drawings: DrawingPath[];
  onUpdateNodes: (nodes: CanvasNode[]) => void;
  onUpdateConnections: (connections: CanvasConnection[]) => void;
  onUpdateDrawings: (drawings: DrawingPath[]) => void;
  theme: 'dark' | 'light';
}

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({
  nodes,
  connections,
  drawings,
  onUpdateNodes,
  onUpdateConnections,
  onUpdateDrawings,
  theme,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport transform state
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 100, y: 80 });
  const [zoom, setZoom] = useState<number>(1);
  const [tool, setTool] = useState<'select' | 'pan' | 'draw'>('select');

  // Node dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Panning state
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Freehand drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [drawColor, setDrawColor] = useState<string>('#3b82f6');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);

  // Connection creation state
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  // Editing node state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Coordinate helper
  const screenToWorld = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  // Zoom helpers
  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.max(0.4, Math.min(2.5, prev + delta)));
  };

  const handleResetView = () => {
    setPan({ x: 100, y: 80 });
    setZoom(1);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.08 : -0.08;
      handleZoom(zoomFactor);
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX * 0.8,
        y: prev.y - e.deltaY * 0.8,
      }));
    }
  };

  // Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || tool === 'pan' || (tool === 'select' && e.target === containerRef.current)) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (tool === 'draw') {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setIsDrawing(true);
      setCurrentStroke([worldPos]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    if (draggingNodeId) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const updatedNodes = nodes.map((n) => {
        if (n.id === draggingNodeId) {
          return {
            ...n,
            x: Math.round(worldPos.x - dragOffsetRef.current.x),
            y: Math.round(worldPos.y - dragOffsetRef.current.y),
          };
        }
        return n;
      });
      onUpdateNodes(updatedNodes);
      return;
    }

    if (isDrawing && tool === 'draw') {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setCurrentStroke((prev) => [...prev, worldPos]);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (draggingNodeId) {
      setDraggingNodeId(null);
    }
    if (isDrawing && tool === 'draw') {
      setIsDrawing(false);
      if (currentStroke.length > 1) {
        const newPath: DrawingPath = {
          id: `draw-${Date.now()}`,
          points: currentStroke,
          color: drawColor,
          strokeWidth,
        };
        onUpdateDrawings([...drawings, newPath]);
      }
      setCurrentStroke([]);
    }
  };

  // Node drag start
  const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    if (tool === 'pan' || tool === 'draw') return;
    e.stopPropagation();

    if (connectingFromId) {
      if (connectingFromId !== node.id) {
        // Create connection
        const newConn: CanvasConnection = {
          id: `conn-${Date.now()}`,
          fromNodeId: connectingFromId,
          toNodeId: node.id,
          label: 'Linked',
        };
        onUpdateConnections([...connections, newConn]);
      }
      setConnectingFromId(null);
      return;
    }

    const worldPos = screenToWorld(e.clientX, e.clientY);
    dragOffsetRef.current = {
      x: worldPos.x - node.x,
      y: worldPos.y - node.y,
    };
    setDraggingNodeId(node.id);
  };

  // Add new canvas elements
  const addNode = (type: CanvasNodeType) => {
    const centerWorld = screenToWorld(
      (containerRef.current?.clientWidth || 800) / 2,
      (containerRef.current?.clientHeight || 600) / 2
    );

    const colors: Record<CanvasNodeType, string> = {
      sticky: '#f59e0b',
      card: '#3b82f6',
      process: '#10b981',
      decision: '#06b6d4',
    };

    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      type,
      x: centerWorld.x - 100,
      y: centerWorld.y - 70,
      width: type === 'sticky' ? 200 : 240,
      height: type === 'sticky' ? 150 : 130,
      title: type === 'sticky' ? 'Idea Note' : type === 'decision' ? 'Branch Decision' : 'Architecture Component',
      content: type === 'sticky' ? 'Double click or edit to record high-level insight.' : 'Specify subsystem contracts & responsibilities.',
      color: colors[type],
      tag: type === 'card' ? 'Subsystem' : undefined,
    };

    onUpdateNodes([...nodes, newNode]);
    setEditingNodeId(newNode.id);
  };

  const deleteNode = (nodeId: string) => {
    onUpdateNodes(nodes.filter((n) => n.id !== nodeId));
    onUpdateConnections(connections.filter((c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId));
    if (editingNodeId === nodeId) setEditingNodeId(null);
  };

  const deleteConnection = (connId: string) => {
    onUpdateConnections(connections.filter((c) => c.id !== connId));
  };

  // SVG Bezier calculation
  const getCurvePath = (fromNode: CanvasNode, toNode: CanvasNode) => {
    const startX = fromNode.x + fromNode.width;
    const startY = fromNode.y + fromNode.height / 2;
    const endX = toNode.x;
    const endY = toNode.y + toNode.height / 2;

    const dx = Math.abs(endX - startX) * 0.5;
    const c1X = startX + dx;
    const c1Y = startY;
    const c2X = endX - dx;
    const c2Y = endY;

    return `M ${startX} ${startY} C ${c1X} ${c1Y}, ${c2X} ${c2Y}, ${endX} ${endY}`;
  };

  // Export canvas to SVG download
  const handleExportSVG = () => {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200" style="background:#0a0d14;font-family:sans-serif">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#60a5fa" />
          </marker>
        </defs>
        ${connections.map(c => {
          const from = nodes.find(n => n.id === c.fromNodeId);
          const to = nodes.find(n => n.id === c.toNodeId);
          if (!from || !to) return '';
          return `<path d="${getCurvePath(from, to)}" fill="none" stroke="#60a5fa" stroke-width="2" marker-end="url(#arrow)" />`;
        }).join('')}
        ${nodes.map(n => `
          <rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" rx="8" fill="#18181b" stroke="${n.color}" stroke-width="1.5" />
          <text x="${n.x + 12}" y="${n.y + 24}" fill="#ffffff" font-size="12" font-weight="bold">${n.title}</text>
          <text x="${n.x + 12}" y="${n.y + 48}" fill="#a1a1aa" font-size="10">${n.content.slice(0, 45)}</text>
        `).join('')}
      </svg>
    `;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stratos-canvas-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative select-none overflow-hidden">
      {/* Canvas Top floating tool strip */}
      <div className="absolute top-4 left-6 z-20 flex items-center gap-1.5 p-1 rounded-lg border backdrop-blur-md shadow-lg transition-colors bg-neutral-900/90 border-neutral-800 text-neutral-200">
        {/* Pointer / Select tool */}
        <button
          onClick={() => setTool('select')}
          className={`p-2 rounded-md text-xs transition-colors ${
            tool === 'select' ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
          title="Select & Move Nodes (V)"
        >
          <MousePointer className="w-3.5 h-3.5" />
        </button>

        {/* Pan Hand tool */}
        <button
          onClick={() => setTool('pan')}
          className={`p-2 rounded-md text-xs transition-colors ${
            tool === 'pan' ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
          title="Pan Canvas Viewport (H / Space+Drag)"
        >
          <Hand className="w-3.5 h-3.5" />
        </button>

        {/* Freehand Draw tool */}
        <button
          onClick={() => setTool('draw')}
          className={`p-2 rounded-md text-xs transition-colors ${
            tool === 'draw' ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
          title="Freehand Sketch Pen (P)"
        >
          <Pen className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-neutral-700 mx-1"></div>

        {/* Add Nodes */}
        <button
          onClick={() => addNode('card')}
          className="px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-1.5"
          title="Add Architecture Subsystem Card"
        >
          <Plus className="w-3.5 h-3.5 text-blue-400" />
          <span>Card</span>
        </button>

        <button
          onClick={() => addNode('sticky')}
          className="px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-1.5"
          title="Add Sticky Note"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>Sticky</span>
        </button>

        <button
          onClick={() => addNode('decision')}
          className="px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-1.5"
          title="Add Flow Decision"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span>Decision</span>
        </button>

        {/* Draw tool settings if active */}
        {tool === 'draw' && (
          <>
            <div className="w-px h-5 bg-neutral-700 mx-1"></div>
            <div className="flex items-center gap-1 px-1">
              {['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#ffffff'].map((color) => (
                <button
                  key={color}
                  onClick={() => setDrawColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-4 h-4 rounded-full border ${
                    drawColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-neutral-900' : 'border-transparent'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => onUpdateDrawings([])}
              className="p-1.5 text-neutral-400 hover:text-rose-400 rounded hover:bg-neutral-800"
              title="Clear all drawings"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Floating Bottom Right Navigation & Zoom Controls */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2 p-1 rounded-lg border backdrop-blur-md shadow-lg transition-colors bg-neutral-900/90 border-neutral-800 text-neutral-200">
        <button
          onClick={() => handleZoom(-0.15)}
          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="text-[11px] font-mono tabular-nums px-1 text-neutral-400">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => handleZoom(0.15)}
          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleResetView}
          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white"
          title="Reset View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-neutral-700 mx-0.5"></div>

        <button
          onClick={handleExportSVG}
          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white"
          title="Export as Vector SVG"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Linking instruction indicator */}
      {connectingFromId && (
        <div className="absolute top-4 right-6 z-20 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs shadow-lg animate-pulse flex items-center gap-2">
          <span>Click target node to link wire</span>
          <button 
            onClick={() => setConnectingFromId(null)}
            className="text-[11px] bg-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-800"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`w-full h-full relative cursor-${
          tool === 'pan' || isPanning ? 'grab active:cursor-grabbing' : tool === 'draw' ? 'crosshair' : 'default'
        } ${theme === 'dark' ? 'bg-[#090c12] bg-canvas-dots' : 'bg-neutral-100 bg-canvas-dots-light'}`}
        style={{ touchAction: 'none' }}
      >
        {/* World transformation group */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          {/* SVG Connector lines layer */}
          <svg
            className="absolute inset-0 overflow-visible pointer-events-none"
            style={{ width: '100%', height: '100%' }}
          >
            <defs>
              <marker
                id="canvas-arrow"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#3b82f6" />
              </marker>
            </defs>

            {/* Bezier connector wires */}
            {connections.map((conn) => {
              const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
              const toNode = nodes.find((n) => n.id === conn.toNodeId);
              if (!fromNode || !toNode) return null;

              const pathD = getCurvePath(fromNode, toNode);
              const midX = (fromNode.x + fromNode.width + toNode.x) / 2;
              const midY = (fromNode.y + fromNode.height / 2 + toNode.y + toNode.height / 2) / 2;

              return (
                <g key={conn.id} className="pointer-events-auto group">
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    markerEnd="url(#canvas-arrow)"
                    className="hover:stroke-blue-400 transition-colors"
                  />
                  {conn.label && (
                    <text
                      x={midX}
                      y={midY - 6}
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                      className="cursor-pointer select-none"
                      onClick={() => deleteConnection(conn.id)}
                    >
                      {conn.label} ×
                    </text>
                  )}
                </g>
              );
            })}

            {/* Freehand drawings paths */}
            {drawings.map((draw) => {
              if (draw.points.length < 2) return null;
              const d = draw.points.reduce(
                (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
                ''
              );
              return (
                <path
                  key={draw.id}
                  d={d}
                  fill="none"
                  stroke={draw.color}
                  strokeWidth={draw.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.85"
                />
              );
            })}

            {/* In-progress drawing path */}
            {isDrawing && currentStroke.length > 1 && (
              <path
                d={currentStroke.reduce(
                  (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
                  ''
                )}
                fill="none"
                stroke={drawColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
            )}
          </svg>

          {/* Canvas Nodes Layer */}
          {nodes.map((node) => {
            const isEditing = editingNodeId === node.id;
            const isConnecting = connectingFromId === node.id;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                style={{
                  transform: `translate(${node.x}px, ${node.y}px)`,
                  width: `${node.width}px`,
                  minHeight: `${node.height}px`,
                }}
                className={`absolute pointer-events-auto rounded-xl shadow-lg border transition-shadow select-none group ${
                  node.type === 'sticky'
                    ? 'bg-amber-400 text-neutral-900 border-amber-500/80 shadow-amber-900/20'
                    : node.type === 'decision'
                      ? theme === 'dark' 
                        ? 'bg-cyan-950/80 text-neutral-100 border-cyan-500/60' 
                        : 'bg-cyan-50 text-neutral-900 border-cyan-400'
                      : theme === 'dark'
                        ? 'bg-neutral-900 text-neutral-100 border-neutral-800'
                        : 'bg-white text-neutral-900 border-neutral-200'
                } ${isConnecting ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
              >
                {/* Node Top Header */}
                <div className="p-3 pb-1.5 flex items-center justify-between border-b border-inherit/40">
                  <div className="flex items-center gap-2 truncate">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: node.color }}
                    />
                    {isEditing ? (
                      <input
                        type="text"
                        value={node.title}
                        onChange={(e) => {
                          const updated = nodes.map((n) =>
                            n.id === node.id ? { ...n, title: e.target.value } : n
                          );
                          onUpdateNodes(updated);
                        }}
                        className="text-xs font-semibold bg-transparent focus:outline-none w-full border-b border-inherit"
                      />
                    ) : (
                      <span className="text-xs font-semibold truncate tracking-tight">
                        {node.title}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Link connector trigger */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConnectingFromId(node.id);
                      }}
                      className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                      title="Link to another node"
                    >
                      <LinkIcon className="w-3 h-3" />
                    </button>

                    {/* Delete node */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNode(node.id);
                      }}
                      className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-rose-500"
                      title="Delete Node"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Node Content Body */}
                <div 
                  className="p-3 text-xs leading-relaxed"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingNodeId(node.id);
                  }}
                >
                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={node.content}
                      onChange={(e) => {
                        const updated = nodes.map((n) =>
                          n.id === node.id ? { ...n, content: e.target.value } : n
                        );
                        onUpdateNodes(updated);
                      }}
                      onBlur={() => setEditingNodeId(null)}
                      autoFocus
                      className="w-full text-xs bg-transparent focus:outline-none resize-none"
                    />
                  ) : (
                    <p className={`line-clamp-4 ${node.type === 'sticky' ? 'text-neutral-900 font-medium' : 'text-neutral-400 dark:text-neutral-300'}`}>
                      {node.content}
                    </p>
                  )}

                  {node.tag && (
                    <div className="mt-2 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                      {node.tag}
                    </div>
                  )}
                </div>

                {/* Connect Anchor Dot on right edge */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setConnectingFromId(node.id);
                  }}
                  className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-neutral-900 cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity shadow-sm flex items-center justify-center text-[8px] text-white"
                  title="Connect wire"
                >
                  +
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
