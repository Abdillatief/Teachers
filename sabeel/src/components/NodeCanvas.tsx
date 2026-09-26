import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasNode, CanvasConnection, NodeType } from '../types';
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Link2,
  Move,
  Check,
  X,
  Download
} from 'lucide-react';

interface NodeCanvasProps {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  onUpdateNodes: (nodes: CanvasNode[]) => void;
  onUpdateConnections: (connections: CanvasConnection[]) => void;
}

const NODE_TYPES: { id: NodeType; label: string; defaultColor: string }[] = [
  { id: 'goal', label: 'Goal', defaultColor: '#0284c7' }, // Sky
  { id: 'idea', label: 'Idea', defaultColor: '#059669' }, // Emerald
  { id: 'action', label: 'Action', defaultColor: '#d97706' }, // Amber
  { id: 'decision', label: 'Decision', defaultColor: '#4f46e5' }, // Indigo
  { id: 'risk', label: 'Risk', defaultColor: '#e11d48' }, // Rose
];

export const NodeCanvas: React.FC<NodeCanvasProps> = ({
  nodes,
  connections,
  onUpdateNodes,
  onUpdateConnections,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Node Dragging
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Connection Linking mode
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

  // Selected node for inline editing
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Add new node modal/popover
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [newNodeDesc, setNewNodeDesc] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('idea');

  // Handle canvas background pan
  const handleMouseDownBackground = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNodeId(null);
      if (connectingSourceId) setConnectingSourceId(null);
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - startPan.x,
          y: e.clientY - startPan.y,
        });
      } else if (draggingNodeId) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Calculate world coordinates adjusted for zoom and pan
        const rawX = (e.clientX - rect.left - pan.x) / zoom;
        const rawY = (e.clientY - rect.top - pan.y) / zoom;

        const updatedNodes = nodes.map((node) => {
          if (node.id === draggingNodeId) {
            return {
              ...node,
              x: Math.round(rawX - dragOffset.x),
              y: Math.round(rawY - dragOffset.y),
            };
          }
          return node;
        });

        onUpdateNodes(updatedNodes);
      }
    },
    [isPanning, draggingNodeId, startPan, pan, zoom, dragOffset, nodes, onUpdateNodes]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNodeId(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Start dragging a node
  const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    e.stopPropagation();
    if (connectingSourceId) {
      // Connect nodes!
      if (connectingSourceId !== node.id) {
        const exists = connections.some(
          (c) =>
            (c.fromId === connectingSourceId && c.toId === node.id) ||
            (c.fromId === node.id && c.toId === connectingSourceId)
        );
        if (!exists) {
          const newConn: CanvasConnection = {
            id: 'conn-' + Date.now(),
            fromId: connectingSourceId,
            toId: node.id,
          };
          onUpdateConnections([...connections, newConn]);
        }
      }
      setConnectingSourceId(null);
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = (e.clientX - rect.left - pan.x) / zoom;
    const clickY = (e.clientY - rect.top - pan.y) / zoom;

    setDraggingNodeId(node.id);
    setDragOffset({
      x: clickX - node.x,
      y: clickY - node.y,
    });
    setSelectedNodeId(node.id);
  };

  const handleAddNodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeTitle.trim()) return;

    const matched = NODE_TYPES.find((t) => t.id === newNodeType);
    const color = matched ? matched.defaultColor : '#0284c7';

    // Place in center of view
    const rect = containerRef.current?.getBoundingClientRect();
    const centerX = rect ? (rect.width / 2 - pan.x) / zoom - 100 : 300;
    const centerY = rect ? (rect.height / 2 - pan.y) / zoom - 50 : 200;

    const newNode: CanvasNode = {
      id: 'node-' + Date.now(),
      title: newNodeTitle.trim(),
      description: newNodeDesc.trim(),
      type: newNodeType,
      x: Math.round(centerX),
      y: Math.round(centerY),
      color,
    };

    onUpdateNodes([...nodes, newNode]);
    setNewNodeTitle('');
    setNewNodeDesc('');
    setIsAddingNode(false);
    setSelectedNodeId(newNode.id);
  };

  const handleDeleteNode = (nodeId: string) => {
    onUpdateNodes(nodes.filter((n) => n.id !== nodeId));
    onUpdateConnections(
      connections.filter((c) => c.fromId !== nodeId && c.toId !== nodeId)
    );
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleDeleteConnection = (connId: string) => {
    onUpdateConnections(connections.filter((c) => c.id !== connId));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 40, y: 40 });
  };

  // Node width and height approximate
  const NODE_W = 200;
  const NODE_H = 100;

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[500px] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-neutral-50/70 dark:bg-neutral-950/70 select-none">
      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 p-1 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm">
        <button
          onClick={() => setIsAddingNode(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Node</span>
        </button>

        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2.0))}
          className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
          className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono text-neutral-400 tabular-nums px-2">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Floating Instructions Indicator */}
      <div className="absolute top-4 right-4 z-20 text-[11px] text-neutral-500 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 border border-neutral-200 dark:border-neutral-800 rounded-md flex items-center gap-2">
        {connectingSourceId ? (
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            Click another node to complete connection (or click background to cancel)
          </span>
        ) : (
          <span>Drag nodes to arrange · Click node to select · Drag canvas to pan</span>
        )}
      </div>

      {/* Main Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDownBackground}
        className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(150, 150, 150, 0.15) 1px, transparent 1px)',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        <div
          className="w-full h-full origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG Vector Connection Layer */}
          <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible">
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#737373" />
              </marker>
            </defs>

            {connections.map((conn) => {
              const source = nodes.find((n) => n.id === conn.fromId);
              const target = nodes.find((n) => n.id === conn.toId);
              if (!source || !target) return null;

              // Center coordinates of nodes
              const x1 = source.x + NODE_W / 2;
              const y1 = source.y + NODE_H / 2;
              const x2 = target.x + NODE_W / 2;
              const y2 = target.y + NODE_H / 2;

              // Bezier control offset
              const dx = (x2 - x1) * 0.5;
              const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <g key={conn.id} className="group pointer-events-auto">
                  {/* Invisible wide stroke for easier hovering/clicking */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="16"
                    className="cursor-pointer"
                    onClick={() => handleDeleteConnection(conn.id)}
                  />
                  {/* Visible path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#737373"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    markerEnd="url(#arrow)"
                    className="transition-colors group-hover:stroke-rose-500"
                  />
                  {/* Connection label or delete chip on hover */}
                  <circle
                    cx={midX}
                    cy={midY}
                    r="8"
                    className="fill-neutral-200 dark:fill-neutral-700 hover:fill-rose-500 cursor-pointer transition-colors"
                    onClick={() => handleDeleteConnection(conn.id)}
                  >
                    <title>Click to delete connection</title>
                  </circle>
                  {conn.label && (
                    <text
                      x={midX}
                      y={midY - 12}
                      textAnchor="middle"
                      className="text-[10px] font-mono fill-neutral-500 select-none"
                    >
                      {conn.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Draggable Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isSource = connectingSourceId === node.id;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                style={{
                  transform: `translate(${node.x}px, ${node.y}px)`,
                  width: `${NODE_W}px`,
                  minHeight: `${NODE_H}px`,
                }}
                className={`absolute p-3 rounded-xl bg-white dark:bg-neutral-900 border transition-shadow cursor-move select-none ${
                  isSelected
                    ? 'border-neutral-900 dark:border-neutral-100 shadow-md ring-1 ring-neutral-900/10 dark:ring-neutral-100/20'
                    : 'border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700'
                } ${isSource ? 'ring-2 ring-amber-500 border-amber-500' : ''}`}
              >
                {/* Node Accent Bar */}
                <div
                  className="w-full h-1 rounded-full mb-2"
                  style={{ backgroundColor: node.color }}
                />

                {/* Node Header */}
                <div className="flex items-start justify-between gap-1 mb-1">
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-1">
                    {node.title}
                  </h4>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">
                    {node.type}
                  </span>
                </div>

                {/* Node Description */}
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-3 leading-relaxed">
                  {node.description || 'No additional notes'}
                </p>

                {/* Connect & Action Toolbar */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConnectingSourceId(node.id);
                    }}
                    title="Connect to another node"
                    className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
                      isSource
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Link2 className="w-3 h-3" />
                    <span>{isSource ? 'Selecting...' : 'Connect'}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNode(node.id);
                    }}
                    title="Delete node"
                    className="p-1 text-neutral-400 hover:text-rose-500 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Node Popover Modal */}
      {isAddingNode && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleAddNodeSubmit}
            className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xl space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                New Canvas Node
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingNode(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Node Title
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Real-time audio synthesis"
                value={newNodeTitle}
                onChange={(e) => setNewNodeTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Concept Type
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {NODE_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNewNodeType(t.id)}
                    className={`px-2 py-1 text-xs font-medium rounded-md border text-center transition-colors ${
                      newNodeType === t.id
                        ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Notes & Rationale
              </label>
              <textarea
                rows={2}
                placeholder="Context or brief description..."
                value={newNodeDesc}
                onChange={(e) => setNewNodeDesc(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingNode(false)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg"
              >
                Create Node
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
