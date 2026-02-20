import {
  drag,
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  select,
  zoom,
  zoomIdentity,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
  type Simulation,
  type ZoomTransform,
} from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { EntityGraph, EntityReference, EntityType } from '../types/modern-context.js'
import { ENTITY_TYPE_CONFIG } from './entityTypeConfig.js'
import './entity-topology.css'

interface EntityTopologyProps {
  graph: EntityGraph
  onNodeClick?: (entity: EntityReference) => void
  width?: number
  height?: number
}

interface GraphNode extends SimulationNodeDatum {
  entity: EntityReference
  clusterX: number
  clusterY: number
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  relationshipType: string
}

interface ClusterRegion {
  type: EntityType
  x: number
  y: number
  nodeCount: number
}

interface TooltipState {
  entity: EntityReference
  x: number
  y: number
}

interface TopologyLayout {
  nodes: GraphNode[]
  links: GraphLink[]
  clusterRegions: ClusterRegion[]
}

function toCssColor(type: EntityType): string {
  return `var(${ENTITY_TYPE_CONFIG[type].color})`
}

function getNodeFromLinkEndpoint(
  endpoint: string | number | GraphNode,
  nodesById: Map<string, GraphNode>,
): GraphNode | undefined {
  if (typeof endpoint === 'object' && endpoint !== null && 'entity' in endpoint) {
    return endpoint
  }

  return nodesById.get(String(endpoint))
}

function formatAttributeValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return JSON.stringify(value)
}

function buildLayout(graph: EntityGraph, width: number, height: number): TopologyLayout {
  const uniqueTypes = [...new Set(graph.nodes.map((node) => node.type))]
  const ringRadius = Math.min(width, height) * 0.28
  const centerX = width / 2
  const centerY = height / 2

  const clusters = new Map<EntityType, { x: number; y: number }>()

  uniqueTypes.forEach((type, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(uniqueTypes.length, 1)

    clusters.set(type, {
      x: centerX + Math.cos(angle) * ringRadius,
      y: centerY + Math.sin(angle) * ringRadius,
    })
  })

  const nodes = graph.nodes.map((entity, index): GraphNode => {
    const cluster = clusters.get(entity.type) || { x: centerX, y: centerY }

    return {
      entity,
      clusterX: cluster.x,
      clusterY: cluster.y,
      x: cluster.x + (index % 5) * 8,
      y: cluster.y + (index % 7) * 6,
    }
  })

  const nodeIds = new Set(nodes.map((node) => node.entity.id))
  const links = graph.edges
    .filter((edge) => nodeIds.has(edge.source.id) && nodeIds.has(edge.target.id))
    .map(
      (edge): GraphLink => ({
        source: edge.source.id,
        target: edge.target.id,
        relationshipType: edge.relationshipType,
      }),
    )

  const nodeCountByType = graph.nodes.reduce<Record<EntityType, number>>(
    (accumulator, node) => {
      const next = { ...accumulator }
      next[node.type] = (next[node.type] || 0) + 1
      return next
    },
    {} as Record<EntityType, number>,
  )

  const clusterRegions: ClusterRegion[] = uniqueTypes.map((type) => {
    const cluster = clusters.get(type) || { x: centerX, y: centerY }

    return {
      type,
      x: cluster.x,
      y: cluster.y,
      nodeCount: nodeCountByType[type] || 0,
    }
  })

  return { nodes, links, clusterRegions }
}

/**
 * Interactive force-directed entity topology graph.
 */
export function EntityTopology({
  graph,
  onNodeClick,
  width = 400,
  height = 300,
}: EntityTopologyProps): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simulationRef = useRef<Simulation<GraphNode, GraphLink> | null>(null)
  const frameRef = useRef<number | null>(null)

  // renderTick is used to trigger re-renders during simulation (state change causes render)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [renderTick, setRenderTick] = useState<number>(0)
  const [zoomTransform, setZoomTransform] = useState<ZoomTransform>(zoomIdentity)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const layout = useMemo(
    (): TopologyLayout => buildLayout(graph, width, height),
    [graph, height, width],
  )

  useEffect((): (() => void) => {
    const simulation = forceSimulation<GraphNode>(layout.nodes)
      .force('charge', forceManyBody().strength(-300))
      .force(
        'link',
        forceLink<GraphNode, GraphLink>(layout.links)
          .id((node) => node.entity.id)
          .distance(100),
      )
      .force('center', forceCenter(width / 2, height / 2))
      .force('cluster-x', forceX<GraphNode>((node) => node.clusterX).strength(0.15))
      .force('cluster-y', forceY<GraphNode>((node) => node.clusterY).strength(0.15))

    simulation.on('tick', (): void => {
      if (frameRef.current !== null) {
        return
      }

      frameRef.current = requestAnimationFrame((): void => {
        setRenderTick((current) => current + 1)
        frameRef.current = null
      })
    })

    simulationRef.current = simulation

    return (): void => {
      simulation.stop()
      simulationRef.current = null

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [height, layout.links, layout.nodes, width])

  useEffect((): (() => void) => {
    const svgElement = svgRef.current

    if (!svgElement) {
      return (): void => {}
    }

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3.2])
      .extent([
        [0, 0],
        [width, height],
      ])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .on('zoom', (event): void => {
        setZoomTransform(event.transform)
      })

    const svgSelection = select(svgElement)
    svgSelection.call(zoomBehavior)

    return (): void => {
      svgSelection.on('.zoom', null)
    }
  }, [height, width])

  useEffect((): (() => void) => {
    const svgElement = svgRef.current
    const simulation = simulationRef.current

    if (!svgElement || !simulation) {
      return (): void => {}
    }

    const nodeSelection = select(svgElement).selectAll<SVGCircleElement, GraphNode>(
      'circle[data-node-circle="true"]',
    )

    const dragBehavior = drag<SVGCircleElement, GraphNode>()
      .on('start', (event, node): void => {
        if (!event.active) {
          simulation.alphaTarget(0.35).restart()
        }

        node.fx = node.x
        node.fy = node.y
      })
      .on('drag', (event, node): void => {
        node.fx = event.x
        node.fy = event.y
      })
      .on('end', (event, node): void => {
        if (!event.active) {
          simulation.alphaTarget(0)
        }

        node.fx = null
        node.fy = null
      })

    nodeSelection.call(dragBehavior)

    return (): void => {
      nodeSelection.on('.drag', null)
    }
  }, [graph, height, width])

  if (graph.nodes.length === 0) {
    return (
      <div className="cei-entity-topology" data-testid="entity-topology-empty">
        <p className="cei-entity-topology-empty">No entities available for topology.</p>
      </div>
    )
  }

  const nodesById = new Map<string, GraphNode>()
  layout.nodes.forEach((node) => {
    nodesById.set(node.entity.id, node)
  })

  const onNodeHover = (event: MouseEvent, entity: EntityReference): void => {
    const bounds = containerRef.current?.getBoundingClientRect()

    if (!bounds) {
      return
    }

    setTooltip({
      entity,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
  }

  return (
    <div className="cei-entity-topology" data-testid="entity-topology" ref={containerRef}>
      <svg
        className="cei-entity-topology-canvas"
        height={height}
        ref={svgRef}
        role="img"
        viewBox={`0 0 ${width.toString()} ${height.toString()}`}
        width={width}
      >
        <g
          transform={`translate(${zoomTransform.x.toString()}, ${zoomTransform.y.toString()}) scale(${zoomTransform.k.toString()})`}
        >
          {layout.clusterRegions.map((region) => (
            <g key={`region-${region.type}`}>
              <circle
                className="cei-entity-region"
                cx={region.x}
                cy={region.y}
                fill={toCssColor(region.type)}
                r={64 + region.nodeCount * 8}
                stroke={toCssColor(region.type)}
                strokeDasharray="4 6"
              />
              <text
                className="cei-entity-region-label"
                textAnchor="middle"
                x={region.x}
                y={region.y - 70}
              >
                {region.type.replace(/_/g, ' ')}
              </text>
            </g>
          ))}

          {layout.links.map((link, index) => {
            const sourceNode = getNodeFromLinkEndpoint(link.source, nodesById)
            const targetNode = getNodeFromLinkEndpoint(link.target, nodesById)

            if (!sourceNode || !targetNode) {
              return null
            }

            const labelX = ((sourceNode.x || 0) + (targetNode.x || 0)) / 2
            const labelY = ((sourceNode.y || 0) + (targetNode.y || 0)) / 2 - 4

            return (
              <g key={`edge-${index.toString()}`}>
                <line
                  className="cei-entity-link"
                  data-testid="entity-topology-edge"
                  x1={sourceNode.x || 0}
                  x2={targetNode.x || 0}
                  y1={sourceNode.y || 0}
                  y2={targetNode.y || 0}
                />
                <text className="cei-entity-link-label" x={labelX} y={labelY}>
                  {link.relationshipType}
                </text>
              </g>
            )
          })}

          {layout.nodes.map((node) => (
            <g
              className="cei-entity-node"
              data-testid="entity-topology-node"
              key={node.entity.id}
              onClick={(): void => onNodeClick?.(node.entity)}
              transform={`translate(${(node.x || 0).toString()}, ${(node.y || 0).toString()})`}
            >
              <circle
                cx={0}
                cy={0}
                data-node-circle="true"
                fill={toCssColor(node.entity.type)}
                onMouseEnter={(event): void => onNodeHover(event.nativeEvent, node.entity)}
                onMouseLeave={(): void => setTooltip(null)}
                onMouseMove={(event): void => onNodeHover(event.nativeEvent, node.entity)}
                r={11}
                stroke="var(--bg-primary)"
                strokeWidth={1.5}
              />
              <text className="cei-entity-node-label" x={15} y={4}>
                {node.entity.name}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {tooltip ? (
        <div
          className="cei-entity-tooltip"
          role="status"
          style={{
            left: `${Math.max(8, tooltip.x + 14).toString()}px`,
            top: `${Math.max(8, tooltip.y - 14).toString()}px`,
          }}
        >
          <strong>{tooltip.entity.name}</strong>
          <span>{tooltip.entity.type.replace(/_/g, ' ')}</span>
          {(tooltip.entity.attributes ? Object.entries(tooltip.entity.attributes) : [])
            .slice(0, 3)
            .map(([key, value]) => (
              <span
                key={`${tooltip.entity.id}-${key}`}
              >{`${key}: ${formatAttributeValue(value)}`}</span>
            ))}
        </div>
      ) : null}
    </div>
  )
}
